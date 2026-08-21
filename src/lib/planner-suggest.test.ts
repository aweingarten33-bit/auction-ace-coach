import { describe, it, expect } from "vitest";
import { computeSlotDollars, maxBid, type StrategyId } from "./planner-strategies";
import type { LeagueSettings } from "./draft-types";

const SETTINGS_SF: LeagueSettings = {
  totalBudget: 225,
  numTeams: 12,
  scoring: "Half PPR",
  leagueType: "Superflex",
  format: "Redraft",
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 1, K: 1, DST: 1, BENCH: 6 },
  keeperIncrease: "",
  context: "",
};

const SETTINGS_2QB: LeagueSettings = {
  ...SETTINGS_SF,
  totalBudget: 200,
  leagueType: "2QB",
  roster: { QB: 2, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1, BENCH: 6 },
};

const STRATEGIES: StrategyId[] = ["hero-qb", "balanced-qbs", "bargain-qb"];

function sum(o: Record<string, number>) {
  return Object.values(o).reduce((a, b) => a + b, 0);
}

describe("computeSlotDollars (superflex-only)", () => {
  for (const strat of STRATEGIES) {
    it(`${strat}: sum equals budget (SF $225)`, () => {
      const out = computeSlotDollars(strat, SETTINGS_SF);
      expect(sum(out)).toBe(225);
    });
    it(`${strat}: sum equals budget (2QB $200)`, () => {
      const out = computeSlotDollars(strat, SETTINGS_2QB);
      expect(sum(out)).toBe(200);
    });
    it(`${strat}: K, DST, BENCH always $1`, () => {
      const out = computeSlotDollars(strat, SETTINGS_SF);
      expect(out["K-1"]).toBe(1);
      expect(out["DST-1"]).toBe(1);
      for (let i = 1; i <= 6; i += 1) expect(out[`BENCH-${i}`]).toBe(1);
    });
  }

  it("QB presets get progressively cheaper from Hero to Balanced to Bargain", () => {
    const hero = computeSlotDollars("hero-qb", SETTINGS_SF);
    const balanced = computeSlotDollars("balanced-qbs", SETTINGS_SF);
    const bargain = computeSlotDollars("bargain-qb", SETTINGS_SF);

    expect(hero["QB-1"]).toBeGreaterThan(balanced["QB-1"]);
    expect(balanced["QB-1"]).toBeGreaterThan(bargain["QB-1"]);
    expect(hero["QB-1"] + hero["SUPERFLEX-1"]).toBeGreaterThan(
      bargain["QB-1"] + bargain["SUPERFLEX-1"],
    );
  });

  it("bargain-qb: RB1 is the biggest slot", () => {
    const out = computeSlotDollars("bargain-qb", SETTINGS_SF);
    const top = Object.entries(out).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe("RB-1");
  });

  it("hero-qb: QB1 is the biggest slot", () => {
    const out = computeSlotDollars("hero-qb", SETTINGS_SF);
    const top = Object.entries(out).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe("QB-1");
  });

  it("respects locked slot values", () => {
    const out = computeSlotDollars("hero-qb", SETTINGS_SF, {
      lockedSlots: { "QB-1": true },
      currentAllocations: { "QB-1": 70 },
    });
    expect(out["QB-1"]).toBe(70);
    expect(sum(out)).toBe(225);
  });

  it("respects touched slot values", () => {
    const out = computeSlotDollars("balanced-qbs", SETTINGS_SF, {
      touchedSlots: { "WR-1": true },
      currentAllocations: { "WR-1": 42 },
    });
    expect(out["WR-1"]).toBe(42);
    expect(sum(out)).toBe(225);
  });
});

describe("maxBid", () => {
  it("matches industry formula", () => {
    expect(maxBid(200, 16)).toBe(185);
    expect(maxBid(50, 5)).toBe(46);
    expect(maxBid(10, 1)).toBe(10);
    expect(maxBid(5, 0)).toBe(5);
    expect(maxBid(0, 5)).toBe(0);
  });
});
