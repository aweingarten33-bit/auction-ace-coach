import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./draft-types";
import { buildExpectedPrices, expectedPriceEconomy, type ExpectedPriceInput } from "./expected-price-model";
import { computeSlotDollars, getStrategySummary, rebalanceProportional } from "./planner-strategies";

function playerPool(): ExpectedPriceInput[] {
  const rows: ExpectedPriceInput[] = [];
  const qbNames = ["Josh Allen", "Jayden Daniels", "Lamar Jackson", "Drake Maye"];
  for (let i = 0; i < 40; i += 1) rows.push({ name: qbNames[i] ?? `QB Player ${i + 1}`, position: "QB", price: 400 - i });
  for (let i = 0; i < 80; i += 1) rows.push({ name: `RB Player ${i + 1}`, position: "RB", price: 400 - i });
  for (let i = 0; i < 150; i += 1) rows.push({ name: `WR Player ${i + 1}`, position: "WR", price: 400 - i });
  for (let i = 0; i < 32; i += 1) rows.push({ name: `TE Player ${i + 1}`, position: "TE", price: 400 - i });
  for (let i = 0; i < 24; i += 1) rows.push({ name: `K Player ${i + 1}`, position: "K", price: 1 });
  for (let i = 0; i < 24; i += 1) rows.push({ name: `DST Player ${i + 1}`, position: "DST", price: 1 });
  return rows;
}

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

describe("Auction Ace v2 Expected Prices", () => {
  it("keeps one league-calibrated price, the Allen anchor, current QB order, and exact room economy", () => {
    const prices = buildExpectedPrices(playerPool(), DEFAULT_SETTINGS);
    const allen = prices.find((p) => p.name === "Josh Allen");
    const daniels = prices.find((p) => p.name === "Jayden Daniels");
    const lamar = prices.find((p) => p.name === "Lamar Jackson");
    const maye = prices.find((p) => p.name === "Drake Maye");

    expect(allen?.price).toBe(69);
    expect(allen?.positionRank).toBe(1);
    expect(daniels?.positionRank).toBe(2);
    expect(lamar?.positionRank).toBe(3);
    expect(maye?.positionRank).toBe(4);
    expect(prices.filter((p) => p.position === "K").every((p) => p.price === 1)).toBe(true);
    expect(prices.filter((p) => p.position === "DST").every((p) => p.price === 1)).toBe(true);

    const economy = expectedPriceEconomy(prices, DEFAULT_SETTINGS);
    expect(economy.roomDollars).toBe(2700);
    expect(economy.draftedSlots).toBe(228);
    expect(economy.discretionaryTarget).toBe(2472);
    expect(economy.reconciled).toBe(true);
  });

  it("prices strategy rank bands from the Expected Price board", () => {
    const prices = buildExpectedPrices(playerPool(), DEFAULT_SETTINGS);
    const hero = getStrategySummary("hero-qb", prices);
    const balanced = getStrategySummary("balanced-qbs", prices);

    expect(hero.qbTargets).toBe("QB1–4 + QB15–20");
    expect(hero.qbSpendLow).not.toBeNull();
    expect(hero.qbSpendHigh).not.toBeNull();
    expect((hero.qbSpendHigh ?? 0) > (hero.qbSpendLow ?? 0)).toBe(true);
    expect(balanced.qbTargets).toBe("QB7–12 + QB12–18");
  });

  it("locks an actual purchase and recalibrates every remaining dollar back to $225", () => {
    const prices = buildExpectedPrices(playerPool(), DEFAULT_SETTINGS);
    const initial = computeSlotDollars("hero-qb", DEFAULT_SETTINGS, { prices });
    expect(sum(initial)).toBe(225);

    const actual = { ...initial, "QB-1": 74 };
    const rebalanced = rebalanceProportional("manual", DEFAULT_SETTINGS, {
      lockedSlots: { "QB-1": true },
      currentAllocations: actual,
      prices,
    });

    expect(rebalanced["QB-1"]).toBe(74);
    expect(sum(rebalanced)).toBe(225);
  });
});
