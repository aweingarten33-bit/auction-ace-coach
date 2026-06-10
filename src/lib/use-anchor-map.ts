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
import { buildRankCurves, getRankPrice, starterSlotsFor } from "./tier-curves";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// Sane bounds — even with thin samples we never let the scaler go wild.
const SCALE_MIN = 0.4;
const SCALE_MAX = 5.0;
const MIN_SAMPLE = 5; // need ≥5 overlap players for a position to trust the scaler
const AVAILABILITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export type PosScale = Record<string, number>; // position -> multiplier

type AvailabilityCacheValue = { factor: number; reason: string } | null;
type AvailabilityCacheEntry = { value: AvailabilityCacheValue; ts: number };
type AvailabilityCache = Record<string, AvailabilityCacheEntry>;

export function readAvailabilityCache(now = Date.now()): AvailabilityCache {
  let raw: unknown = {};
  try {
    raw = JSON.parse(localStorage.getItem("availability-llm-cache") || "{}");
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object") return {};

  const out: AvailabilityCache = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const ts = Number((entry as { ts?: unknown }).ts);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    if (now - ts > AVAILABILITY_CACHE_TTL_MS) continue;
    const value = (entry as { value?: unknown }).value;
    if (value === null) {
      out[key] = { value: null, ts };
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      Number.isFinite((value as { factor?: unknown }).factor) &&
      typeof (value as { reason?: unknown }).reason === "string"
    ) {
      out[key] = {
        value: { factor: Number((value as { factor: number }).factor), reason: (value as { reason: string }).reason },
        ts,
      };
    }
  }
  return out;
}

export function anchorInjuryFactorFromStatus(status: string | null | undefined, note: string | null | undefined): { factor: number; reason: string | null } {
  const s = (status || "").toUpperCase().trim();
  const n = (note || "").toLowerCase();
  // Keep aligned with injuryMultiplier() in league-tier-prices to avoid
  // contradictory injury pricing between editor/sheet and anchor decisions.
  if (s === "OUT") return { factor: 0.55, reason: "OUT" };
  if (s === "IR" || s === "INJURED_RESERVE" || s === "INJURED RESERVE") return { factor: 0.5, reason: "IR" };
  if (s === "DOUBTFUL") return { factor: 0.7, reason: "Doubtful" };
  if (s === "QUESTIONABLE") {
    if (n.includes("surgery")) return { factor: 0.8, reason: "Questionable (surgery)" };
    return { factor: 0.9, reason: "Questionable" };
  }
  return { factor: 1, reason: null };
}

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
          return anchorInjuryFactorFromStatus(inj.status, inj.note);
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

        // ─── Tier curves ──────────────────────────────────────────────────────
        // Derived from 3-year league history: sort players within each position
        // by bid amount per season → the highest-paid player = perceived #1 that year.
        // Tier size = total starter slots / 3 (three equal tiers).
        const curves = buildRankCurves(leagueAgg, settings);
        console.info("[useAnchorMap] rank curves",
          Object.fromEntries(Object.entries(curves).map(([p, a]) => [p, a.slice(0, 8).map(Math.round)])));

        // Current-season rank within position: sort all players by their blended/
        // ESPN/Sleeper value descending → rank 1 = best player available this year.
        // Used to look up which tier a player belongs to for tier-based pricing.
        const currentRankMap = new Map<string, number>();
        {
          const byPos = new Map<string, Array<{ key: string; val: number }>>();
          const addToRank = (key: string, val: number, pos: string | null) => {
            if (!pos || val <= 0) return;
            const arr = byPos.get(pos) ?? [];
            if (!arr.some((p) => p.key === key)) arr.push({ key, val });
            byPos.set(pos, arr);
          };
          for (const [k, v] of blendedMap) addToRank(k, v.val, v.pos);
          for (const [k, v] of espnMap)    addToRank(k, v.val, v.pos);
          for (const [k, v] of sleeperMap) addToRank(k, v.val, v.pos);
          for (const arr of byPos.values()) {
            arr.sort((a, b) => b.val - a.val);
            arr.forEach(({ key }, i) => currentRankMap.set(key, i + 1));
          }
        }

        // Helper: tier-anchored price for any player by their current-season rank.
        // Returns 0 if tier data is unavailable (caller falls back to old logic).
        const tierAnchor = (k: string, pos: string | null): number => {
          if (!pos) return 0;
          const rank = currentRankMap.get(k);
          if (!rank) return 0;
          const slots = starterSlotsFor(pos, settings);
          return slots > 0 ? getRankPrice(curves, pos, rank, slots) : 0;
        };

        // 3.5) LLM tiebreaker — for any player whose note has an ambiguous trigger
        //      word but no clean phrase match, ask Lovable AI to classify. Cached
        //      in localStorage by note hash so we only pay once per unique note.
        const llmMap = new Map<string, { factor: number; reason: string }>();
        const ambigItems: Array<{ id: string; name: string; status: string | null; note: string | null; cacheKey: string }> = [];
        const cache = readAvailabilityCache();
        for (const k of injuryMap.keys()) {
          const r = regexAvailability(k);
          if (!r.ambiguous) continue;
          const inj = injuryMap.get(k)!;
          const cacheKey = `${(inj.status || "").trim()}|${(inj.note || "").trim()}`;
          if (cacheKey in cache) {
            const v = cache[cacheKey]?.value ?? null;
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
                  cache[item.cacheKey] = { value: v, ts: Date.now() };
                } else {
                  cache[item.cacheKey] = { value: null, ts: Date.now() };
                }
              }
              try { localStorage.setItem("availability-llm-cache", JSON.stringify(cache)); } catch { /* quota */ }
            }
          } catch (e) {
            console.warn("[useAnchorMap] availability LLM failed (non-fatal)", e);
          }
        }
        if (cancelled) return;

        // 4) Build the anchor map — SINGLE SOURCE OF TRUTH: blended-values
        //    (Berry + Sleeper + DraftSharks, SF-adjusted, scaled to league budget).
        //    Same source the Auction Calculator uses. League history is ignored
        //    for pricing — produced inflated/inconsistent numbers vs the calculator.
        const out: Record<string, AnchorEntry> = {};
        const allMarketKeys = new Set<string>([
          ...blendedMap.keys(),
          ...espnMap.keys(),
          ...sleeperMap.keys(),
          ...Object.keys(vorpMap),
        ]);
        for (const k of allMarketKeys) {
          const mv = marketConsensus(k); // blendedMap first, then ESPN/Sleeper fallback
          const vv = vorpMap[k];
          let basePrice = 0;
          if (mv && mv.val > 0) basePrice = mv.val;
          else if (vv && vv.price > 0) basePrice = vv.price;
          if (basePrice <= 0) continue;
          const preInjury = Math.max(1, Math.round(basePrice));
          const inj = combinedFactor(k, llmMap.get(k));
          const finalPrice = Math.max(1, Math.round(preInjury * inj.factor));
          const lv = leagueAgg.get(k);
          out[k] = {
            price: finalPrice,
            source: "espn",
            leaguePrice: lv ? Math.max(1, Math.round(weightedLeague(lv.bySeason))) : undefined,
            marketPrice: Math.max(1, Math.round(basePrice)),
            marketSources: {
              espn: espnMap.get(k)?.val,
              sleeper: sleeperMap.get(k)?.val,
              berry: berryMap.get(k)?.val,
            },
            injuryDiscount: inj.reason
              ? { factor: inj.factor, reason: inj.reason, preInjuryPrice: preInjury }
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
