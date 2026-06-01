// Rank-curve price model derived from 3-year league auction history.
//
// Philosophy: prices come from the RANK SLOT, not from tier buckets.
// "What does your league pay for the QB1 slot?" is answered by looking at
// what was actually paid for the highest-priced QB each season — not the
// average of the entire first tier.
//
// Bug fixed: the old tier-average approach conflated QB1 money with QB8
// money. buildTierCurves() stored the mean of 8 players in tier 1 (~$46),
// so getTierPrice(rank=1) returned $46 instead of the actual QB1 price
// (~$66). Rank 6 interpolated toward ~$22 instead of the correct ~$34.
//
// Fix: build a per-rank curve — rank_curve[i] = recency-weighted average
// of what was paid for the rank-(i+1) player across seasons. This gives
// rank 1 → real QB1 money ($66), rank 6 → real QB6 money ($34).
//
// We only have bid amounts (no stored rank at draft time), so we derive
// positional rank from bid amount: the highest-paid QB in a given year
// was the perceived QB1. This is a sound approximation across 3 seasons.

import type { LeagueSettings } from "./draft-types";

const WEIGHTS_3 = [0.5, 0.3, 0.2] as const;
const WEIGHTS_2 = [0.65, 0.35] as const;
const WEIGHTS_1 = [1.0] as const;

/** Total starter slots per position — must stay in sync with VORP formula. */
export function starterSlotsFor(pos: string, s: LeagueSettings): number {
  switch (pos) {
    case "QB":
      return (
        s.roster.QB +
        s.roster.FLEX +
        (s.leagueType !== "Standard" ? s.roster.SUPERFLEX : 0)
      ) * s.numTeams;
    case "RB":  return s.roster.RB  * s.numTeams;
    case "WR":  return s.roster.WR  * s.numTeams;
    case "TE":  return s.roster.TE  * s.numTeams;
    case "K":   return s.roster.K   * s.numTeams;
    case "DST": return s.roster.DST * s.numTeams;
    default:    return 0;
  }
}

/**
 * Build per-rank price curves from 3-year league auction history.
 *
 * Returns curves[pos] = number[] where index i = recency-weighted average
 * price paid for the (i+1)-ranked player at that position.
 * Length = totalSlots for that position (all starter slots across all teams).
 *
 * Weights: 50/30/20 for 3 seasons, 65/35 for 2, 100 for 1 (most-recent first).
 */
export function buildRankCurves(
  leagueAgg: Map<string, { bySeason: Map<number, number>; pos: string | null }>,
  settings: LeagueSettings,
): Record<string, number[]> {
  // All seasons present in history, most recent first
  const seasons = new Set<number>();
  for (const { bySeason } of leagueAgg.values()) {
    for (const s of bySeason.keys()) seasons.add(s);
  }
  const sortedSeasons = Array.from(seasons).sort((a, b) => b - a);

  // Per season per position: players ranked by bid descending
  type Ranked = { bid: number };
  const bySeasonPos = new Map<number, Map<string, Ranked[]>>();
  for (const season of sortedSeasons) {
    const byPos = new Map<string, Ranked[]>();
    for (const [, { bySeason, pos }] of leagueAgg) {
      if (!pos || !bySeason.has(season)) continue;
      const arr = byPos.get(pos) ?? [];
      arr.push({ bid: bySeason.get(season)! });
      byPos.set(pos, arr);
    }
    for (const [pos, arr] of byPos) {
      byPos.set(pos, [...arr].sort((a, b) => b.bid - a.bid));
    }
    bySeasonPos.set(season, byPos);
  }

  const curves: Record<string, number[]> = {};
  const positions = ["QB", "RB", "WR", "TE", "K", "DST"];

  for (const pos of positions) {
    const totalSlots = starterSlotsFor(pos, settings);
    if (totalSlots <= 0) continue;

    // Collect per-season rank arrays (index = rank - 1, value = bid)
    const seasonRanks: Array<number[]> = [];
    for (const season of sortedSeasons) {
      const players = bySeasonPos.get(season)?.get(pos) ?? [];
      if (players.length === 0) continue;
      seasonRanks.push(players.map((p) => p.bid));
    }

    if (seasonRanks.length === 0) continue;

    const weights =
      seasonRanks.length >= 3 ? WEIGHTS_3 :
      seasonRanks.length === 2 ? WEIGHTS_2 :
                                 WEIGHTS_1;

    // Build rank curve: for each rank slot 0..totalSlots-1, compute
    // the recency-weighted average bid across seasons that had that rank.
    const curve: number[] = [];
    for (let r = 0; r < totalSlots; r++) {
      let weightedSum = 0;
      let weightTotal = 0;
      for (let i = 0; i < Math.min(seasonRanks.length, weights.length); i++) {
        const bid = seasonRanks[i][r];
        if (bid == null) continue; // season didn't have this many players
        weightedSum += bid * weights[i];
        weightTotal += weights[i];
      }
      // If no season had data at this rank, carry forward the last known price
      // (degrades gracefully for thin-roster leagues).
      curve.push(weightTotal > 0 ? weightedSum / weightTotal : (curve[r - 1] ?? 1));
    }

    curves[pos] = curve;
  }

  return curves;
}

/**
 * Interpolated price for a player at 1-based `rank` within their position.
 *
 * Uses the rank curve directly (no tier bucketing). For ranks between two
 * data points, linearly interpolates. This is mostly a no-op since we have
 * a data point per rank, but provides smooth falloff for ranks beyond the
 * curve length.
 *
 * Returns 0 if no curve data exists for this position (caller should fall back).
 * Returns $1 minimum for bench players (rank > totalSlots).
 */
export function getRankPrice(
  rankCurves: Record<string, number[]>,
  pos: string,
  rank: number,
  totalSlots: number,
): number {
  const curve = rankCurves[pos];
  if (!curve || curve.length === 0) return 0;
  if (rank > totalSlots) return 1;

  // rank is 1-based; curve index is 0-based
  const idx = rank - 1;

  // Exact hit
  if (idx < curve.length) return Math.max(1, curve[idx]);

  // Beyond curve data: extrapolate linearly downward from last two points
  const last = curve[curve.length - 1] ?? 1;
  const secondLast = curve[curve.length - 2] ?? last;
  const step = last - secondLast; // typically negative (prices fall)
  const beyond = idx - (curve.length - 1);
  return Math.max(1, last + step * beyond);
}

// ---------------------------------------------------------------------------
// Legacy shims — kept so any remaining imports don't break at compile time.
// Use buildRankCurves / getRankPrice for new code.
// ---------------------------------------------------------------------------
/** @deprecated Use buildRankCurves instead. */
export const buildTierCurves = buildRankCurves;
/** @deprecated Use getRankPrice instead. */
export const getTierPrice = getRankPrice;
