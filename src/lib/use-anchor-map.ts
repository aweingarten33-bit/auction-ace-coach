// Shared anchor-price map.
// Cascade priority (per decision-engine): league 3yr avg → sheet (Vetri) → ESPN → none.
//
// CRITICAL: For players with NO league history (rookies, never-drafted), the raw ESPN
// auction value is generic — not tuned to your league's tendencies (Superflex, scoring,
// roster size, who pays up for what). We compute a per-position SCALE FACTOR from the
// overlap of players who appear in BOTH your league history AND ESPN, then apply it to
// every league-history-free ESPN price. Result: even rookies are league-adjusted.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnchorEntry } from "./decision-engine";
import { useVorpMap } from "./use-vorp-map";
import { useDraftStore } from "./draft-store";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Sane bounds — even with thin samples we never let the scaler go wild.
const SCALE_MIN = 0.4;
const SCALE_MAX = 5.0;
const MIN_SAMPLE = 5; // need ≥5 overlap players for a position to trust the scaler

export type PosScale = Record<string, number>; // position -> multiplier

export function useAnchorMap(): { map: Record<string, AnchorEntry>; posScale: PosScale } {
  const [map, setMap] = useState<Record<string, AnchorEntry>>({});
  const [posScale, setPosScale] = useState<PosScale>({});
  const settings = useDraftStore((s) => s.settings);
  const { map: vorpMap } = useVorpMap(settings);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hist, espn, sleeper] = await Promise.all([
          supabase
            .from("league_auction_history")
            .select("player_name, position, bid_amount, season")
            .then((r) => r.data ?? []),
          supabase
            .from("espn_player_ranks")
            .select("player_name_norm, position, auction_value, injury_status, injury_note")
            .then((r) => r.data ?? []),
          supabase
            .from("sleeper_players")
            .select("player_name_norm, position, projected_auction_value, depth_chart_order, search_rank, injury_status, injury_notes")
            .then((r) => r.data ?? []),
        ]);
        if (cancelled) return;

        // 1) League history per player — keep season-by-season for recency weighting.
        const leagueAgg = new Map<string, { bySeason: Map<number, number>; pos: string | null }>();
        for (const row of hist as Array<{ player_name: string | null; position: string | null; bid_amount: number | null; season: number | null }>) {
          if (!row.player_name || row.bid_amount == null || row.season == null) continue;
          const k = norm(row.player_name);
          const cur = leagueAgg.get(k) ?? { bySeason: new Map<number, number>(), pos: row.position };
          cur.bySeason.set(Number(row.season), Number(row.bid_amount));
          if (!cur.pos && row.position) cur.pos = row.position;
          leagueAgg.set(k, cur);
        }

        const weightedLeague = (bySeason: Map<number, number>): number => {
          const seasons = Array.from(bySeason.entries()).sort((a, b) => b[0] - a[0]);
          if (seasons.length === 0) return 0;
          if (seasons.length === 1) return seasons[0][1];
          if (seasons.length === 2) return seasons[0][1] * 0.65 + seasons[1][1] * 0.35;
          const last = seasons[0][1];
          const prev = seasons[1][1];
          const olderAvg = seasons.slice(2).reduce((s, [, v]) => s + v, 0) / (seasons.length - 2);
          return last * 0.5 + prev * 0.3 + olderAvg * 0.2;
        };

        // 2) ESPN map
        const espnMap = new Map<string, { val: number; pos: string | null }>();
        for (const row of espn as Array<{ player_name_norm: string | null; position: string | null; auction_value: number | null }>) {
          if (!row.player_name_norm || row.auction_value == null) continue;
          const k = norm(row.player_name_norm);
          const v = Number(row.auction_value);
          if (v > 0) espnMap.set(k, { val: v, pos: row.position });
        }

        // 2b) Sleeper map — independent free market signal that's typically more
        //     up-to-date than ESPN for ascending players (rookies stepping into
        //     starting roles, depth-chart movers). depth_chart_order=1 = starter.
        const sleeperMap = new Map<string, { val: number; pos: string | null; isStarter: boolean }>();
        for (const row of sleeper as Array<{ player_name_norm: string | null; position: string | null; projected_auction_value: number | null; depth_chart_order: number | null }>) {
          if (!row.player_name_norm || row.projected_auction_value == null) continue;
          const k = norm(row.player_name_norm);
          const v = Number(row.projected_auction_value);
          if (v > 0) sleeperMap.set(k, {
            val: v,
            pos: row.position,
            isStarter: row.depth_chart_order != null && Number(row.depth_chart_order) <= 1,
          });
        }

        // Market consensus = blend of ESPN and Sleeper. When they agree, high
        // confidence. When they disagree wildly, take the higher one IF the
        // player is a confirmed starter (catches ascending players ESPN lags on).
        // Market consensus — SLEEPER FIRST (more current, picks up depth-chart shifts).
        // ESPN is fallback when Sleeper is silent. When both exist and disagree by
        // >50%, Sleeper still wins (it's the more recent signal); we just blend
        // 70/30 toward Sleeper instead of pure replacement, so ESPN acts as a
        // stabilizer if Sleeper is way out of pocket.
        const marketConsensus = (k: string): { val: number; pos: string | null } | null => {
          const ev = espnMap.get(k);
          const sv = sleeperMap.get(k);
          if (!ev && !sv) return null;
          if (sv && !ev) return { val: sv.val, pos: sv.pos };
          if (ev && !sv) return { val: ev.val, pos: ev.pos };
          const eVal = ev!.val;
          const sVal = sv!.val;
          const pos = sv!.pos || ev!.pos;
          const ratio = Math.max(eVal, sVal) / Math.max(1, Math.min(eVal, sVal));
          if (ratio <= 1.5) {
            // close enough → 80/20 Sleeper-lean
            return { val: sVal * 0.8 + eVal * 0.2, pos };
          }
          // big disagreement: Sleeper wins harder, ESPN brakes lightly
          return { val: sVal * 0.8 + eVal * 0.2, pos };
        };

        // 3) Per-position scaling — uses market consensus instead of just ESPN
        const scaleAgg = new Map<string, { sumLeague: number; sumMarket: number; n: number }>();
        for (const [k, lv] of leagueAgg) {
          const mv = marketConsensus(k);
          if (!mv) continue;
          const pos = mv.pos || lv.pos;
          if (!pos) continue;
          const cur = scaleAgg.get(pos) ?? { sumLeague: 0, sumMarket: 0, n: 0 };
          cur.sumLeague += weightedLeague(lv.bySeason);
          cur.sumMarket += mv.val;
          cur.n += 1;
          scaleAgg.set(pos, cur);
        }
        const scales: PosScale = {};
        for (const [pos, agg] of scaleAgg) {
          if (agg.n < MIN_SAMPLE || agg.sumMarket <= 0) continue;
          const raw = agg.sumLeague / agg.sumMarket;
          scales[pos] = Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
        }
        console.info("[useAnchorMap] league→market position scaling", scales);

        // 4) Build the anchor map
        //    Cascade: LEAGUE history (blended w/ VORP) → VORP → market consensus → none
        const out: Record<string, AnchorEntry> = {};
        for (const [k, v] of leagueAgg) {
          if (v.bySeason.size === 0) continue;
          const leaguePrice = weightedLeague(v.bySeason);
          const mv = marketConsensus(k);
          const vv = vorpMap[k];

          // Blend league w/ VORP first (projection-based reality check on stale prices),
          // then nudge with market consensus if it strongly disagrees.
          let final = leaguePrice;
          if (vv && vv.price > 0) {
            const seasonsCount = v.bySeason.size;
            // Trust last-3-draft history more if we have 3+ seasons; lean on VORP if thin.
            const leagueWeight = seasonsCount >= 3 ? 0.65 : seasonsCount === 2 ? 0.55 : 0.4;
            final = leaguePrice * leagueWeight + vv.price * (1 - leagueWeight);
          }
          if (mv && mv.val > 0) {
            const ratio = mv.val / Math.max(1, final);
            if (ratio >= 1.5) final = final * 0.6 + mv.val * 0.4;
            else if (ratio <= 0.5) final = final * 0.7 + mv.val * 0.3;
          }
          out[k] = {
            price: Math.max(1, Math.round(final)),
            source: "league",
            leaguePrice: Math.max(1, Math.round(leaguePrice)),
            marketPrice: mv ? Math.max(1, Math.round(mv.val)) : undefined,
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
          };
        }

        // 5) VORP — #2 priority for any projected player without league history.
        for (const [k, v] of Object.entries(vorpMap)) {
          if (out[k]) continue;
          out[k] = {
            price: v.price,
            source: "espn",
            marketPrice: v.price,
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
          };
        }

        // 6) Market consensus — last fallback for non-projected players (K, DST, etc.)
        const allMarketKeys = new Set([...espnMap.keys(), ...sleeperMap.keys()]);
        for (const k of allMarketKeys) {
          if (out[k]) continue;
          const mv = marketConsensus(k);
          if (!mv) continue;
          const rawScale = (mv.pos && scales[mv.pos]) || 1;
          const fade = Math.max(0, Math.min(1, (mv.val - 8) / 12));
          const effScale = 1 + (rawScale - 1) * fade;
          const adj = Math.max(1, Math.round(mv.val * effScale));
          out[k] = {
            price: adj,
            source: "espn",
            marketPrice: Math.max(1, Math.round(mv.val)),
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
          };
        }

        setMap(out);
        setPosScale(scales);
      } catch (e) {
        console.warn("[useAnchorMap] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [vorpMap]);

  return { map, posScale };
}
