import { describe, it, expect } from "vitest";
import { buildRankCurves, getRankPrice, starterSlotsFor } from "./tier-curves";
import type { LeagueSettings } from "./draft-types";

// ---------------------------------------------------------------------------
// Mock data: 12-team Superflex, 3 seasons of QB bids (sorted descending)
// Superflex adds 1 SUPERFLEX slot, so QB slots = (QB:1 + FLEX:1 + SUPERFLEX:1) * 12 = 36?
// Wait — we want totalSlots = 24 per the task: QB:1 + SUPERFLEX:1 per team → 2*12 = 24.
// We'll construct settings to give exactly 24 QB starter slots.
// ---------------------------------------------------------------------------
const settings: LeagueSettings = {
  numTeams: 12,
  leagueType: "Superflex",
  scoring: "Half PPR",
  format: "Redraft",
  keeperIncrease: "",
  context: "",
  totalBudget: 200,
  roster: {
    QB: 1,
    RB: 2,
    WR: 3,
    TE: 1,
    FLEX: 0,    // no FLEX — QB + SUPERFLEX = 2 per team * 12 = 24
    SUPERFLEX: 1,
    K: 1,
    DST: 1,
    BENCH: 6,
  },
};

// Verify the settings give us 24 QB slots
const QB_SLOTS = starterSlotsFor("QB", settings); // should be 24

// Season bids (sorted descending = rank order)
const season2024 = [68, 62, 58, 50, 44, 36, 28, 22, 16, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 2, 2, 1, 1, 1];
const season2023 = [65, 60, 55, 46, 40, 34, 26, 20, 15, 12, 10, 8, 7, 6, 5, 5, 4, 3, 2, 2, 1, 1, 1, 1];
const season2022 = [62, 58, 52, 44, 38, 30, 24, 18, 14, 11, 9, 7, 6, 5, 4, 4, 3, 2, 2, 1, 1, 1, 1, 1];

/** Build a leagueAgg Map from the mock bid arrays. */
function buildMockLeagueAgg(): Map<string, { bySeason: Map<number, number>; pos: string | null }> {
  const agg = new Map<string, { bySeason: Map<number, number>; pos: string | null }>();
  const seasons: Array<[number, number[]]> = [
    [2024, season2024],
    [2023, season2023],
    [2022, season2022],
  ];
  for (const [year, bids] of seasons) {
    bids.forEach((bid, i) => {
      const key = `qb${i + 1}`;
      const cur = agg.get(key) ?? { bySeason: new Map<number, number>(), pos: "QB" };
      cur.bySeason.set(year, bid);
      agg.set(key, cur);
    });
  }
  return agg;
}

// ---------------------------------------------------------------------------
// Manually computed expected values (50/30/20 weighting, most-recent first)
// rank N: price = season2024[N-1]*0.5 + season2023[N-1]*0.3 + season2022[N-1]*0.2
// ---------------------------------------------------------------------------
function expectedRank(rank: number): number {
  const i = rank - 1;
  return season2024[i] * 0.5 + season2023[i] * 0.3 + season2022[i] * 0.2;
}

describe("starterSlotsFor", () => {
  it("returns 24 QB slots for 12-team Superflex with QB:1 SUPERFLEX:1 FLEX:0", () => {
    expect(QB_SLOTS).toBe(24);
  });
});

describe("buildRankCurves", () => {
  it("produces a QB curve of length 24", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    expect(curves["QB"]).toHaveLength(24);
  });

  it("rank 1 ≈ $65.90 (real QB1 money, not the tier average)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const rank1 = curves["QB"][0];
    // Expected: 68*0.5 + 65*0.3 + 62*0.2 = 34 + 19.5 + 12.4 = 65.9
    expect(rank1).toBeCloseTo(65.9, 1);
  });

  it("rank 6 ≈ $34.20 (mid Tier-1 QB6, not the tier average ~$44)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const rank6 = curves["QB"][5];
    // Expected: 36*0.5 + 34*0.3 + 30*0.2 = 18 + 10.2 + 6.0 = 34.2
    expect(rank6).toBeCloseTo(34.2, 1);
  });

  it("rank 8 ≈ $20.60 (bottom Tier-1)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const rank8 = curves["QB"][7];
    // Expected: 22*0.5 + 20*0.3 + 18*0.2 = 11 + 6 + 3.6 = 20.6
    expect(rank8).toBeCloseTo(20.6, 1);
  });

  it("rank 9 ≈ $15.30 (top Tier-2, sharp drop from Tier-1)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const rank9 = curves["QB"][8];
    // Expected: 16*0.5 + 15*0.3 + 14*0.2 = 8 + 4.5 + 2.8 = 15.3
    expect(rank9).toBeCloseTo(15.3, 1);
  });

  it("all 24 ranks match manual recency-weighted computation", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    for (let rank = 1; rank <= 24; rank++) {
      const expected = expectedRank(rank);
      expect(curves["QB"][rank - 1]).toBeCloseTo(expected, 4);
    }
  });

  it("prices decrease monotonically (higher rank = cheaper)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const qb = curves["QB"]!;
    for (let i = 1; i < qb.length; i++) {
      expect(qb[i]).toBeLessThanOrEqual(qb[i - 1]);
    }
  });
});

describe("getRankPrice", () => {
  it("rank 1 returns ≈ $65.90", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 1, QB_SLOTS);
    expect(p).toBeCloseTo(65.9, 1);
  });

  it("rank 6 returns ≈ $34.20 (not the tier-average ~$44)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 6, QB_SLOTS);
    expect(p).toBeCloseTo(34.2, 1);
  });

  it("rank 9 returns ≈ $15.30", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 9, QB_SLOTS);
    expect(p).toBeCloseTo(15.3, 1);
  });

  it("rank 14 returns ≈ $6.30", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 14, QB_SLOTS);
    // Expected: 7*0.5 + 6*0.3 + 5*0.2 = 3.5 + 1.8 + 1.0 = 6.3
    expect(p).toBeCloseTo(6.3, 1);
  });

  it("rank > totalSlots returns $1 (bench floor)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    expect(getRankPrice(curves, "QB", 25, QB_SLOTS)).toBe(1);
    expect(getRankPrice(curves, "QB", 99, QB_SLOTS)).toBe(1);
  });

  it("unknown position returns 0", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    expect(getRankPrice(curves, "UNKNOWN", 1, 10)).toBe(0);
  });

  it("empty curves map returns 0 for any position", () => {
    expect(getRankPrice({}, "QB", 1, 24)).toBe(0);
  });

  it("rank 4 returns ≈ $47.60 (verifying top Tier-1 spread)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 4, QB_SLOTS);
    // Expected: 50*0.5 + 46*0.3 + 44*0.2 = 25 + 13.8 + 8.8 = 47.6
    expect(p).toBeCloseTo(47.6, 1);
  });
});

describe("regression: old tier-average bug is gone", () => {
  it("rank 1 is NOT the tier 1 average (~$44)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 1, QB_SLOTS);
    // Old behavior would return ~$44 (tier average). New behavior → ~$66.
    expect(p).toBeGreaterThan(55);
  });

  it("rank 6 is NOT artificially low (~$22 from tier interpolation)", () => {
    const agg = buildMockLeagueAgg();
    const curves = buildRankCurves(agg, settings);
    const p = getRankPrice(curves, "QB", 6, QB_SLOTS);
    // Old behavior interpolated down to ~$22. New behavior → ~$34.
    expect(p).toBeGreaterThan(30);
  });
});
