import { describe, it, expect } from "vitest";
import { computeSlotDollars, maxBid, type StrategyId } from "./planner-strategies";
import type { LeagueSettings } from "./draft-types";

const SETTINGS_200: LeagueSettings = {
  totalBudget: 200,
  numTeams: 12,
  scoring: "Half PPR",
  leagueType: "Standard",
  format: "Redraft",
  roster: { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1, BENCH: 6 },
  keeperIncrease: "",
  context: "",
};

const SETTINGS_SF: LeagueSettings = {
  ...SETTINGS_200,
  totalBudget: 225,
  leagueType: "Superflex",
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 0, SUPERFLEX: 1, K: 0, DST: 0, BENCH: 6 },
};

const STRATEGIES: StrategyId[] = ["stars", "balanced", "wr-heavy"];

function sum(o: Record<string, number>) {
  return Object.values(o).reduce((a, b) => a + b, 0);
}

describe("computeSlotDollars", () => {
  for (const strat of STRATEGIES) {
    it(`${strat}: sum equals budget (standard $200)`, () => {
      const out = computeSlotDollars(strat, SETTINGS_200);
      expect(sum(out)).toBe(200);
    });
    it(`${strat}: sum equals budget (superflex $225)`, () => {
      const out = computeSlotDollars(strat, SETTINGS_SF);
      expect(sum(out)).toBe(225);
    });
    it(`${strat}: K, DST, BENCH always $1`, () => {
      const out = computeSlotDollars(strat, SETTINGS_200);
      expect(out["K-1"]).toBe(1);
      expect(out["DST-1"]).toBe(1);
      for (let i = 1; i <= 6; i += 1) expect(out[`BENCH-${i}`]).toBe(1);
    });
    it(`${strat}: RB1 >= RB2 >= RB3`, () => {
      const out = computeSlotDollars(strat, SETTINGS_200);
      expect(out["RB-1"]).toBeGreaterThanOrEqual(out["RB-2"]);
    });
  }

  it("stars: RB1 is the biggest slot", () => {
    const out = computeSlotDollars("stars", SETTINGS_200);
    const top = Object.entries(out).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe("RB-1");
  });

  it("wr-heavy: WR1 is the biggest slot", () => {
    const out = computeSlotDollars("wr-heavy", SETTINGS_200);
    const top = Object.entries(out).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe("WR-1");
  });

  it("respects locked slot values", () => {
    const out = computeSlotDollars("stars", SETTINGS_200, {
      lockedSlots: { "RB-1": true },
      currentAllocations: { "RB-1": 70 },
    });
    expect(out["RB-1"]).toBe(70);
    expect(sum(out)).toBe(200);
  });

  it("respects touched slot values", () => {
    const out = computeSlotDollars("balanced", SETTINGS_200, {
      touchedSlots: { "WR-1": true },
      currentAllocations: { "WR-1": 42 },
    });
    expect(out["WR-1"]).toBe(42);
    expect(sum(out)).toBe(200);
  });
});

describe("maxBid", () => {
  it("matches industry formula", () => {
    expect(maxBid(200, 16)).toBe(185); // 200 - 15
    expect(maxBid(50, 5)).toBe(46);
    expect(maxBid(10, 1)).toBe(10);
    expect(maxBid(5, 0)).toBe(5);
    expect(maxBid(0, 5)).toBe(0);
  });
});
