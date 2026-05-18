// Tier-based price curves derived from 3-year league auction history.
//
// Philosophy: prices come from tiers, not individual players.
// "What does your league pay for the QB1 slot?" is more durable than
// "What did your league pay for Patrick Mahomes?" — because next year
// that slot might be occupied by someone with no history.
//
// We only have bid amounts (no stored rank at draft time), so we derive
// positional rank from bid amount: the highest-paid QB in a given year
// was the perceived QB1. This is a sound approximation across 3 seasons.
//
// Output: smooth interpolated $ values across the tier curve so there are
// no price cliffs at tier boundaries.

import type { LeagueSettings } from "./draft-types";

const NUM_TIERS = 3;
const MIN_PLAYERS_PER_TIER = 2; // skip a tier if too few data points

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
 * Build tier price curves from 3-year league auction history.
 *
 * Returns curves[pos] = [tier1_avg, tier2_avg, tier3_avg] in dollars,
 * recency-weighted (50/30/20 for 3 seasons, 65/35 for 2, 100 for 1).
 */
export function buildTierCurves(
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
  type Ranked = { key: string; bid: number };
  const bySeasonPos = new Map<number, Map<string, Ranked[]>>();
  for (const season of sortedSeasons) {
    const byPos = new Map<string, Ranked[]>();
    for (const [key, { bySeason, pos }] of leagueAgg) {
      if (!pos || !bySeason.has(season)) continue;
      const arr = byPos.get(pos) ?? [];
      arr.push({ key, bid: bySeason.get(season)! });
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
    const tierSize = Math.max(1, Math.ceil(totalSlots / NUM_TIERS));

    // Tier averages per season
    const seasonAvgs: Array<{ avgs: number[] }> = [];
    for (const season of sortedSeasons) {
      const players = bySeasonPos.get(season)?.get(pos) ?? [];
      const avgs: number[] = [];
      let hasData = false;
      for (let t = 0; t < NUM_TIERS; t++) {
        const slice = players.slice(t * tierSize, (t + 1) * tierSize);
        if (slice.length < MIN_PLAYERS_PER_TIER) {
          avgs.push(0);
          continue;
        }
        avgs.push(slice.reduce((s, p) => s + p.bid, 0) / slice.length);
        hasData = true;
      }
      if (hasData) seasonAvgs.push({ avgs });
    }

    if (seasonAvgs.length === 0) continue;

    const weights =
      seasonAvgs.length >= 3 ? [0.5, 0.3, 0.2] :
      seasonAvgs.length === 2 ? [0.65, 0.35] :
                                [1.0];

    const final: number[] = Array(NUM_TIERS).fill(0);
    for (let t = 0; t < NUM_TIERS; t++) {
      let wSum = 0;
      for (let i = 0; i < Math.min(seasonAvgs.length, weights.length); i++) {
        const w = weights[i];
        final[t] += (seasonAvgs[i].avgs[t] ?? 0) * w;
        wSum += w;
      }
      if (wSum > 0) final[t] /= wSum;
    }

    curves[pos] = final;
  }

  return curves;
}

/**
 * Interpolated price for a player at 1-based `rank` within their position.
 *
 * Smoothly interpolates between tier averages so there are no price cliffs at
 * tier boundaries. A QB at the bottom of Tier 1 trends toward the top of Tier 2.
 *
 * Returns 0 if no curve data exists for this position (caller should fall back).
 * Returns $1 minimum for bench players (rank > totalSlots).
 */
export function getTierPrice(
  curves: Record<string, number[]>,
  pos: string,
  rank: number,
  totalSlots: number,
): number {
  const avgs = curves[pos];
  if (!avgs || avgs.every((v) => v === 0)) return 0;
  if (rank > totalSlots) return 1;

  const tierSize = Math.max(1, Math.ceil(totalSlots / NUM_TIERS));
  const tIdx = Math.min(NUM_TIERS - 1, Math.floor((rank - 1) / tierSize));

  // How far into this tier is the player? 0 = top, approaching 1 = bottom
  const tierStart = tIdx * tierSize;
  const posInTier = Math.min(0.99, (rank - 1 - tierStart) / tierSize);

  const thisAvg = avgs[tIdx] ?? 1;
  const nextAvg = avgs[Math.min(NUM_TIERS - 1, tIdx + 1)] ?? thisAvg;

  return Math.max(1, thisAvg + (nextAvg - thisAvg) * posInTier);
}
