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
        const isSF = settings.leagueType === "Superflex" || settings.leagueType === "2QB";
        const [hist, espn, sleeper, blendedRes] = await Promise.all([
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
          supabase.functions.invoke("blended-values", {
            body: { superflex: isSF, teams: settings.numTeams, budget: settings.totalBudget },
          }).then((r) => (r.data ?? null) as { values?: Record<string, { berry: number | null; sleeper: number | null; blended: number; position: string }> } | null).catch(() => null),
        ]);
        if (cancelled) return;
        const berryMap = new Map<string, { val: number; pos: string | null }>();
        const blendedMap = new Map<string, { val: number; pos: string | null }>();
        if (blendedRes?.values) {
          const entries = Object.entries(blendedRes.values) as Array<[string, { berry: number | null; sleeper: number | null; blended: number; position: string }]>;
          for (const [k, v] of entries) {
            if (v.berry != null && v.berry > 0) berryMap.set(k, { val: v.berry, pos: v.position });
            if (v.blended > 0) blendedMap.set(k, { val: v.blended, pos: v.position });
          }
        }

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

        // Decline detection: if a player's most recent bid dropped >15% YoY,
        // the league is signaling a fade. Weight the most recent year heavily
        // (80%) so we capture the trajectory instead of smoothing it away
        // (e.g. CMC: $58 → $65 → $48 should land near $50, not $55).
        const weightedLeague = (bySeason: Map<number, number>): number => {
          const seasons = Array.from(bySeason.entries()).sort((a, b) => b[0] - a[0]);
          if (seasons.length === 0) return 0;
          if (seasons.length === 1) return seasons[0][1];
          const last = seasons[0][1];
          const prev = seasons[1][1];
          const declined = prev > 0 && last < prev * 0.85;
          if (seasons.length === 2) {
            return declined
              ? last * 0.8 + prev * 0.2
              : last * 0.65 + prev * 0.35;
          }
          const olderAvg = seasons.slice(2).reduce((s, [, v]) => s + v, 0) / (seasons.length - 2);
          return declined
            ? last * 0.8 + prev * 0.15 + olderAvg * 0.05
            : last * 0.5 + prev * 0.3 + olderAvg * 0.2;
        };

        // 2) ESPN map
        const espnMap = new Map<string, { val: number; pos: string | null }>();
        const injuryMap = new Map<string, { status: string | null; note: string | null }>();
        for (const row of espn as Array<{ player_name_norm: string | null; position: string | null; auction_value: number | null; injury_status: string | null; injury_note: string | null }>) {
          if (!row.player_name_norm) continue;
          const k = norm(row.player_name_norm);
          if (row.auction_value != null) {
            const v = Number(row.auction_value);
            if (v > 0) espnMap.set(k, { val: v, pos: row.position });
          }
          if (row.injury_status || row.injury_note) {
            injuryMap.set(k, { status: row.injury_status, note: row.injury_note });
          }
        }

        // 2b) Sleeper map
        const sleeperMap = new Map<string, { val: number; pos: string | null; isStarter: boolean }>();
        for (const row of sleeper as Array<{ player_name_norm: string | null; position: string | null; projected_auction_value: number | null; depth_chart_order: number | null; injury_status: string | null; injury_notes: string | null }>) {
          if (!row.player_name_norm) continue;
          const k = norm(row.player_name_norm);
          if (row.projected_auction_value != null) {
            const v = Number(row.projected_auction_value);
            if (v > 0) sleeperMap.set(k, {
              val: v,
              pos: row.position,
              isStarter: row.depth_chart_order != null && Number(row.depth_chart_order) <= 1,
            });
          }
          // Sleeper injury fills in if ESPN didn't have one
          const existing = injuryMap.get(k);
          if (!existing && (row.injury_status || row.injury_notes)) {
            injuryMap.set(k, { status: row.injury_status, note: row.injury_notes });
          } else if (existing && !existing.note && row.injury_notes) {
            injuryMap.set(k, { status: existing.status, note: row.injury_notes });
          }
        }

        // Injury discount factor (multiplier on final anchor).
        // OUT 70% off, IR 50% off, Doubtful 30%, Questionable+Surgery 20%, Questionable 10%.
        const injuryFactor = (k: string): { factor: number; reason: string | null } => {
          const inj = injuryMap.get(k);
          if (!inj) return { factor: 1, reason: null };
          const status = (inj.status || "").toUpperCase().trim();
          const note = (inj.note || "").toLowerCase();
          if (status === "OUT") return { factor: 0.3, reason: "OUT" };
          if (status === "IR" || status === "INJURED_RESERVE" || status === "INJURED RESERVE") return { factor: 0.5, reason: "IR" };
          if (status === "DOUBTFUL") return { factor: 0.7, reason: "Doubtful" };
          if (status === "QUESTIONABLE") {
            if (note.includes("surgery")) return { factor: 0.8, reason: "Questionable (surgery)" };
            return { factor: 0.9, reason: "Questionable" };
          }
          return { factor: 1, reason: null };
        };

        // Availability discount — non-injury risks (suspensions, holdouts, PUP/NFI,
        // legal, personal). Tight phrases only + negation guard to avoid false hits
        // like "signed extension" or "no legal issues".
        const NEG = /\b(no|not|never|cleared|returned|avoided|signed|extension|restructure|resolved|dropped)\b/i;
        const PHRASES: Array<{ re: RegExp; reason: string; factor: number }> = [
          { re: /\b(suspended for|game suspension|suspension|will miss \d+ game|banned)\b/i, reason: "Suspended", factor: 0.6 },
          { re: /\b(holding out|holdout|hold-?in|did not report|contract dispute)\b/i, reason: "Holdout", factor: 0.8 },
          { re: /\b(active\/pup|on pup|pup list|placed on pup)\b/i, reason: "PUP", factor: 0.75 },
          { re: /\b(nfi list|non[- ]football injury)\b/i, reason: "NFI", factor: 0.7 },
          { re: /\b(arrested|facing charges|charged with|legal trouble|domestic violence|dui)\b/i, reason: "Legal", factor: 0.8 },
          { re: /\b(personal reasons|away from team|left the team|stepped away)\b/i, reason: "Personal", factor: 0.85 },
          { re: /\b(missed (training )?camp|did not practice|hasn['’]t practiced)\b/i, reason: "Missed camp", factor: 0.9 },
        ];
        // Words that are dangerous alone (need LLM tiebreaker even if regex didn't fire)
        const AMBIG = /\b(contract|legal|investigation|sign|status update|away)\b/i;

        const regexAvailability = (k: string): { factor: number; reason: string | null; ambiguous: boolean } => {
          const inj = injuryMap.get(k);
          if (!inj) return { factor: 1, reason: null, ambiguous: false };
          const blob = `${inj.status || ""} ${inj.note || ""}`;
          if (!blob.trim()) return { factor: 1, reason: null, ambiguous: false };
          let best: { factor: number; reason: string } | null = null;
          for (const p of PHRASES) {
            const m = blob.match(p.re);
            if (!m) continue;
            // negation guard: check 30 chars before the match
            const idx = m.index ?? 0;
            const window = blob.slice(Math.max(0, idx - 30), idx);
            if (NEG.test(window)) continue;
            if (!best || p.factor < best.factor) best = { factor: p.factor, reason: p.reason };
          }
          const ambiguous = !best && AMBIG.test(blob);
          return best ? { ...best, ambiguous: false } : { factor: 1, reason: null, ambiguous };
        };

        // Stack injury + availability — take the SINGLE LARGEST discount (don't multiply).
        const combinedFactor = (k: string, llm?: { factor: number; reason: string } | null) => {
          const inj = injuryFactor(k);
          const avail = regexAvailability(k);
          const candidates: Array<{ factor: number; reason: string | null }> = [inj, avail];
          if (llm) candidates.push(llm);
          let winner = candidates[0];
          for (const c of candidates) if (c.factor < winner.factor) winner = c;
          return winner;
        };



        // Market consensus — Berry+Sleeper blended (from blended-values edge fn)
        // is now the primary signal. ESPN is a stabilizer fallback only.
        const marketConsensus = (k: string): { val: number; pos: string | null } | null => {
          const bl = blendedMap.get(k);
          if (bl) return bl;
          const ev = espnMap.get(k);
          const sv = sleeperMap.get(k);
          if (!ev && !sv) return null;
          if (sv && !ev) return { val: sv.val, pos: sv.pos };
          if (ev && !sv) return { val: ev.val, pos: ev.pos };
          const eVal = ev!.val;
          const sVal = sv!.val;
          const pos = sv!.pos || ev!.pos;
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

        // 3.5) LLM tiebreaker — for any player whose note has an ambiguous trigger
        //      word but no clean phrase match, ask Lovable AI to classify. Cached
        //      in localStorage by note hash so we only pay once per unique note.
        const llmMap = new Map<string, { factor: number; reason: string }>();
        const ambigItems: Array<{ id: string; name: string; status: string | null; note: string | null; cacheKey: string }> = [];
        const cache: Record<string, { factor: number; reason: string } | null> = (() => {
          try { return JSON.parse(localStorage.getItem("availability-llm-cache") || "{}"); } catch { return {}; }
        })();
        for (const k of injuryMap.keys()) {
          const r = regexAvailability(k);
          if (!r.ambiguous) continue;
          const inj = injuryMap.get(k)!;
          const cacheKey = `${(inj.status || "").trim()}|${(inj.note || "").trim()}`;
          if (cacheKey in cache) {
            const v = cache[cacheKey];
            if (v) llmMap.set(k, v);
            continue;
          }
          ambigItems.push({ id: k, name: k, status: inj.status, note: inj.note, cacheKey });
        }
        if (ambigItems.length > 0 && !cancelled) {
          try {
            const { data, error } = await supabase.functions.invoke("classify-availability", {
              body: { items: ambigItems.map(({ cacheKey: _c, ...rest }) => rest) },
            });
            if (!error && data?.classifications) {
              for (const c of data.classifications as Array<{ id: string; missing: boolean; reason: string; factor: number }>) {
                const item = ambigItems.find((x) => x.id === c.id);
                if (!item) continue;
                if (c.missing && c.factor < 1) {
                  const v = { factor: c.factor, reason: c.reason };
                  llmMap.set(c.id, v);
                  cache[item.cacheKey] = v;
                } else {
                  cache[item.cacheKey] = null;
                }
              }
              try { localStorage.setItem("availability-llm-cache", JSON.stringify(cache)); } catch { /* quota */ }
            }
          } catch (e) {
            console.warn("[useAnchorMap] availability LLM failed (non-fatal)", e);
          }
        }
        if (cancelled) return;

        // 4) Build the anchor map
        //    Cascade: LEAGUE history (blended w/ VORP) → VORP → market consensus → none
        const out: Record<string, AnchorEntry> = {};
        for (const [k, v] of leagueAgg) {
          if (v.bySeason.size === 0) continue;
          const leaguePrice = weightedLeague(v.bySeason);
          const mv = marketConsensus(k);
          const vv = vorpMap[k];

          // ─── Variance-aware blending ────────────────────────────────────
          // The OLD behavior used fixed league weights (0.85/0.6/0.4) regardless
          // of how much league history and current market sources disagreed.
          // That's why a player like Mahomes whose league bid history was
          // $60-$63 stayed pinned to ~$62 even when ESPN/Sleeper had moved to
          // $38 — the static weight ignored the disagreement.
          //
          // NEW: keep the same base league weight (3+ seasons of YOUR money is
          // still gospel) but DECAY it proportionally to the gap between your
          // historical price and the current market consensus. The bigger the
          // gap, the more we treat the league number as stale.
          //
          // Examples (3-season player, base league weight 0.85):
          //   league $62, market $60 → disagreement 0.03 → weight 0.85 (no change)
          //   league $62, market $50 → disagreement 0.19 → weight 0.76
          //   league $62, market $38 → disagreement 0.39 → weight 0.65
          //   league $62, market $20 → disagreement 0.68 → weight 0.50 (floor)
          // We cap the decay so league can never drop below 0.50 — your
          // multi-year league data is still the strongest signal we have.
          let final = leaguePrice;
          const seasonsCount = v.bySeason.size;
          const baseLeagueWeight = seasonsCount >= 3 ? 0.85 : seasonsCount === 2 ? 0.6 : 0.4;

          // Disagreement scalar in [0, 1]: how far apart are league and market?
          // 0 = perfect agreement, 1 = one is double the other.
          let disagreement = 0;
          if (mv && mv.val > 0 && leaguePrice > 0) {
            const hi = Math.max(mv.val, leaguePrice);
            const lo = Math.min(mv.val, leaguePrice);
            disagreement = Math.min(1, (hi - lo) / hi);
          }
          // Decay coefficient — how much the disagreement is allowed to chip
          // away at the league weight. 0.6 means a 50% disagreement reduces
          // league weight by 30 percentage points. Clamped so league weight
          // never falls below 0.5 (your league data still wins ties).
          const DECAY = 0.6;
          const FLOOR = seasonsCount >= 3 ? 0.5 : seasonsCount === 2 ? 0.4 : 0.3;
          const adjustedLeagueWeight = Math.max(
            FLOOR,
            baseLeagueWeight * (1 - disagreement * DECAY),
          );

          if (vv && vv.price > 0) {
            // Blend league w/ VORP using the variance-adjusted weight
            final = leaguePrice * adjustedLeagueWeight + vv.price * (1 - adjustedLeagueWeight);
          }
          if (mv && mv.val > 0) {
            const ratio = mv.val / Math.max(1, final);
            // Existing market-disagreement nudge — kept as a SECOND pass on top
            // of the variance-aware blend above. With 3+ seasons, market can
            // only push UP (catches breakouts). With <3 seasons, market can
            // also push down (younger players, less data).
            if (seasonsCount >= 3) {
              if (ratio >= 1.5) final = final * 0.7 + mv.val * 0.3;
              // ratio <= 0.5 path intentionally removed for veteran data
            } else {
              if (ratio >= 1.5) final = final * 0.6 + mv.val * 0.4;
              else if (ratio <= 0.5) final = final * 0.7 + mv.val * 0.3;
            }
          }
          // Market-crash override: if BOTH ESPN and Sleeper have dropped this player
          // to < $5 but our league history says > $20, the market knows something
          // (season-ender, suspension, retirement). Trust the market — 75% off league.
          const eRaw = espnMap.get(k)?.val ?? null;
          const sRaw = sleeperMap.get(k)?.val ?? null;
          const bothCrashed = eRaw !== null && sRaw !== null && eRaw < 5 && sRaw < 5;
          let crashReason: string | null = null;
          if (bothCrashed && leaguePrice >= 20) {
            final = Math.max(1, leaguePrice * 0.25);
            crashReason = "Market collapse";
          }
          const preInjury = Math.max(1, Math.round(final));
          const inj = combinedFactor(k, llmMap.get(k));
          // If market crash already gutted the price, take whichever is harsher
          const effectiveFactor = crashReason && !inj.reason
            ? { factor: 1, reason: crashReason }
            : inj;
          const finalPrice = Math.max(1, Math.round(preInjury * effectiveFactor.factor));
          out[k] = {
            price: finalPrice,
            source: "league",
            leaguePrice: Math.max(1, Math.round(leaguePrice)),
            marketPrice: mv ? Math.max(1, Math.round(mv.val)) : undefined,
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
            injuryDiscount: inj.reason
              ? { factor: inj.factor, reason: inj.reason, preInjuryPrice: preInjury }
              : crashReason
                ? { factor: 1, reason: crashReason, preInjuryPrice: Math.round(leaguePrice) }
                : undefined,
          };
        }

        // 5) VORP — #2 priority for any projected player without league history.
        for (const [k, v] of Object.entries(vorpMap)) {
          if (out[k]) continue;
          const inj = combinedFactor(k, llmMap.get(k));
          const finalPrice = Math.max(1, Math.round(v.price * inj.factor));
          out[k] = {
            price: finalPrice,
            source: "espn",
            marketPrice: v.price,
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
            injuryDiscount: inj.reason
              ? { factor: inj.factor, reason: inj.reason, preInjuryPrice: v.price }
              : undefined,
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
          const inj = combinedFactor(k, llmMap.get(k));
          const finalPrice = Math.max(1, Math.round(adj * inj.factor));
          out[k] = {
            price: finalPrice,
            source: "espn",
            marketPrice: Math.max(1, Math.round(mv.val)),
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
            },
            injuryDiscount: inj.reason
              ? { factor: inj.factor, reason: inj.reason, preInjuryPrice: adj }
              : undefined,
          };
        }

        setMap(out);
        setPosScale(scales);

        // === 5% AI safety net ===
        // Trigger conditions (only flag players where math has a known blind spot):
        //   T1: ESPN/Sleeper disagree by >2x
        //   T2: League history >= $25 but market < $10 (or vice versa) AND no injury flag
        //   T3: High-value (>= $25 anchor) with NO injury flag — suspect stale feed
        // Cached 24hr per player in localStorage. AI can only SUBTRACT value.
        const NEWS_CACHE_KEY = "ai-news-cache-v1";
        const TTL = 24 * 60 * 60 * 1000;
        type CacheRow = { factor: number; reason: string; source_url: string; ts: number };
        const newsCache: Record<string, CacheRow> = (() => {
          try { return JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || "{}"); } catch { return {}; }
        })();
        const now = Date.now();

        // Helper: position lookup from any of the maps
        const lookupPos = (k: string): string | null =>
          espnMap.get(k)?.pos || sleeperMap.get(k)?.pos || leagueAgg.get(k)?.pos || null;

        const flagged: Array<{ id: string; name: string; position: string | null; team: string | null; trigger: string }> = [];
        for (const [k, entry] of Object.entries(out)) {
          if (entry.injuryDiscount) continue; // already discounted by injury/availability layer
          const espn = entry.marketSources?.espn ?? null;
          const sleeper = entry.marketSources?.sleeper ?? null;
          const league = entry.leaguePrice ?? null;
          const market = entry.marketPrice ?? null;
          let trigger: string | null = null;

          if (espn && sleeper && espn > 0 && sleeper > 0) {
            const r = Math.max(espn, sleeper) / Math.min(espn, sleeper);
            if (r >= 2) trigger = `ESPN $${espn} vs Sleeper $${sleeper} disagree`;
          }
          if (!trigger && league && market) {
            if (league >= 25 && market < 10) trigger = `League $${league} but market $${market}`;
            else if (market >= 25 && league < 10) trigger = `Market $${market} but league $${league}`;
          }
          if (!trigger && entry.price >= 25) trigger = `High-value, no injury flag (verify)`;

          if (!trigger) continue;

          // Use cached result if fresh
          const cached = newsCache[k];
          if (cached && now - cached.ts < TTL) {
            if (cached.factor < 1) {
              const newPrice = Math.max(1, Math.round(entry.price * cached.factor));
              out[k] = {
                ...entry,
                price: newPrice,
                injuryDiscount: {
                  factor: cached.factor,
                  reason: `${cached.reason} (AI)`,
                  preInjuryPrice: entry.price,
                },
              };
            }
            continue;
          }

          flagged.push({
            id: k,
            name: leagueAgg.get(k)?.pos ? k : k, // norm key — fine for prompt
            position: lookupPos(k),
            team: null,
            trigger,
          });
        }

        // Cap to 30 to keep cost predictable. Higher-anchor players first.
        flagged.sort((a, b) => (out[b.id]?.price ?? 0) - (out[a.id]?.price ?? 0));
        const toCheck = flagged.slice(0, 30);

        if (toCheck.length === 0 || cancelled) return;

        try {
          // Build a name lookup so the AI sees real names, not normalized keys.
          const nameByKey = new Map<string, string>();
          for (const r of (hist as Array<{ player_name: string | null }>)) {
            if (r.player_name) nameByKey.set(norm(r.player_name), r.player_name);
          }
          for (const r of (espn as Array<{ player_name_norm: string | null }>)) {
            if (r.player_name_norm && !nameByKey.has(norm(r.player_name_norm))) {
              nameByKey.set(norm(r.player_name_norm), r.player_name_norm);
            }
          }
          for (const r of (sleeper as Array<{ player_name_norm: string | null }>)) {
            if (r.player_name_norm && !nameByKey.has(norm(r.player_name_norm))) {
              nameByKey.set(norm(r.player_name_norm), r.player_name_norm);
            }
          }
          const payload = toCheck.map((p) => ({ ...p, name: nameByKey.get(p.id) || p.id }));

          const { data, error } = await supabase.functions.invoke("check-player-news", {
            body: { players: payload },
          });
          if (error || !data?.results) {
            console.warn("[useAnchorMap] news-check unavailable", error);
            return;
          }

          const updated = { ...out };
          for (const r of data.results as Array<{ id: string; factor: number; reason: string; source_url: string }>) {
            // Always newsCache (even no-op results) so we don't re-call for 24hr
            newsCache[r.id] = { factor: r.factor, reason: r.reason, source_url: r.source_url, ts: now };
            const cur = updated[r.id];
            if (!cur || r.factor >= 1) continue;
            const newPrice = Math.max(1, Math.round(cur.price * r.factor));
            updated[r.id] = {
              ...cur,
              price: newPrice,
              injuryDiscount: {
                factor: r.factor,
                reason: `${r.reason} (AI)`,
                preInjuryPrice: cur.price,
              },
            };
          }
          try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newsCache)); } catch { /* quota */ }
          if (!cancelled) setMap(updated);
        } catch (e) {
          console.warn("[useAnchorMap] news-check failed (non-fatal)", e);
        }
      } catch (e) {
        console.warn("[useAnchorMap] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, [vorpMap]);

  return { map, posScale };
}
