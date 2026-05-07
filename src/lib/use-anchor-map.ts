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

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Sane bounds — even with thin samples we never let the scaler go wild.
const SCALE_MIN = 0.4;
const SCALE_MAX = 5.0;
const MIN_SAMPLE = 5; // need ≥5 overlap players for a position to trust the scaler

export type PosScale = Record<string, number>; // position -> multiplier

export function useAnchorMap(): { map: Record<string, AnchorEntry>; posScale: PosScale } {
  const [map, setMap] = useState<Record<string, AnchorEntry>>({});
  const [posScale, setPosScale] = useState<PosScale>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hist, espn] = await Promise.all([
          supabase
            .from("league_auction_history")
            .select("player_name, position, bid_amount, season")
            .then((r) => r.data ?? []),
          supabase
            .from("espn_player_ranks")
            .select("player_name_norm, position, auction_value")
            .then((r) => r.data ?? []),
        ]);
        if (cancelled) return;

        // 1) League history per player — keep season-by-season for recency weighting.
        const leagueAgg = new Map<string, { bySeason: Map<number, number>; pos: string | null }>();
        for (const row of hist as Array<{ player_name: string | null; position: string | null; bid_amount: number | null; season: number | null }>) {
          if (!row.player_name || row.bid_amount == null || row.season == null) continue;
          const k = norm(row.player_name);
          const cur = leagueAgg.get(k) ?? { bySeason: new Map<number, number>(), pos: row.position };
          // Same player rows can repeat per season (snapshots) — last write wins on amount.
          cur.bySeason.set(Number(row.season), Number(row.bid_amount));
          if (!cur.pos && row.position) cur.pos = row.position;
          leagueAgg.set(k, cur);
        }

        // Weighted recency average (last=0.5, prev=0.3, older avg=0.2)
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

        // 3) Per-position scaling for league-history-free players (rookies / depth)
        const scaleAgg = new Map<string, { sumLeague: number; sumEspn: number; n: number }>();
        for (const [k, lv] of leagueAgg) {
          const ev = espnMap.get(k);
          if (!ev) continue;
          const pos = ev.pos || lv.pos;
          if (!pos) continue;
          const cur = scaleAgg.get(pos) ?? { sumLeague: 0, sumEspn: 0, n: 0 };
          cur.sumLeague += weightedLeague(lv.bySeason);
          cur.sumEspn += ev.val;
          cur.n += 1;
          scaleAgg.set(pos, cur);
        }
        const scales: PosScale = {};
        for (const [pos, agg] of scaleAgg) {
          if (agg.n < MIN_SAMPLE || agg.sumEspn <= 0) continue;
          const raw = agg.sumLeague / agg.sumEspn;
          scales[pos] = Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
        }
        console.info("[useAnchorMap] league→ESPN position scaling", scales);

        // 4) Build the anchor map
        const out: Record<string, AnchorEntry> = {};
        // a) League history → weighted recency, then BLEND with ESPN when they disagree.
        //    Catches breakouts (league has historically underpaid → ESPN spike) and
        //    fades (league overpays loyalty → ESPN tanks).
        for (const [k, v] of leagueAgg) {
          if (v.bySeason.size === 0) continue;
          const leaguePrice = weightedLeague(v.bySeason);
          const ev = espnMap.get(k);
          let final = leaguePrice;
          if (ev && ev.val > 0) {
            const ratio = ev.val / Math.max(1, leaguePrice);
            if (ratio >= 1.4) {
              // ESPN much higher → market sees breakout. Meet in the middle.
              final = (leaguePrice + ev.val) / 2;
            } else if (ratio <= 0.6) {
              // ESPN much lower → market faded. Pull league down 70/30.
              final = leaguePrice * 0.7 + ev.val * 0.3;
            }
          }
          out[k] = { price: Math.max(1, Math.round(final)), source: "league" };
        }
        // b) ESPN fallback — SCALED for league-history-free players,
        //    but ONLY for players ESPN already values as starters.
        //    Rationale: the per-position scaler is computed from starters
        //    (the only players who appear in BOTH league history and ESPN),
        //    so applying it to $1-$8 depth/rookies borrows starter inflation
        //    they don't deserve. A rookie QB ESPN values at $8 in superflex
        //    is depth — not a Josh Allen discount.
        for (const [k, ev] of espnMap) {
          if (out[k]) continue;
          const rawScale = (ev.pos && scales[ev.pos]) || 1;
          // Fade scaling smoothly for low-ESPN players. ≤$8 = no scaling,
          // ≥$20 = full scaling, linear in between.
          const fade = Math.max(0, Math.min(1, (ev.val - 8) / 12));
          const effScale = 1 + (rawScale - 1) * fade;
          const adj = Math.max(1, Math.round(ev.val * effScale));
          out[k] = { price: adj, source: "espn" };
        }


        setMap(out);
        setPosScale(scales);
      } catch (e) {
        console.warn("[useAnchorMap] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { map, posScale };
}
