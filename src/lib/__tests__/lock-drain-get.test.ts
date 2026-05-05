import { describe, it, expect } from "vitest";
import { decide } from "@/lib/decision-engine";
import { computeDrain, computeGet } from "@/lib/nomination";
import { computeBudget } from "@/lib/draft-math";
import {
  DEFAULT_SETTINGS,
  type DraftEvent,
  type Keeper,
  type LeagueSettings,
  type PriceEstimate,
} from "@/lib/draft-types";

// Minimal 12-team, $200 league with a tight roster (1QB/2RB/2WR/1TE/1FLEX/6BENCH = 13 slots)
const settings: LeagueSettings = {
  ...DEFAULT_SETTINGS,
  totalBudget: 200,
  numTeams: 12,
  roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 0, DST: 0, BENCH: 6 },
};

const keepers: Keeper[] = [];
const events: DraftEvent[] = [];

// Priced sheet (with positions for nomination logic)
const prices: PriceEstimate[] = ([
  { name: "Christian McCaffrey", price: 70, position: "RB" },
  { name: "Bijan Robinson", price: 60, position: "RB" },
  { name: "Saquon Barkley", price: 55, position: "RB" },
  { name: "Tyreek Hill", price: 50, position: "WR" },
  { name: "Justin Jefferson", price: 58, position: "WR" },
  { name: "CeeDee Lamb", price: 52, position: "WR" },
  { name: "Travis Kelce", price: 30, position: "TE" },
  { name: "Sam LaPorta", price: 18, position: "TE" },
  { name: "Josh Allen", price: 20, position: "QB" },
  { name: "Jalen Hurts", price: 18, position: "QB" },
  { name: "Patrick Mahomes", price: 16, position: "QB" },
] as unknown) as PriceEstimate[];

describe("LOCK — decide() deterministic budget math", () => {
  it("budget baseline matches manual math", () => {
    const b = computeBudget(settings, keepers, events);
    // 13 slots, $200, no spend → max bid leaves $1/other slot = 200 - 12 = 188
    expect(b.totalBudget).toBe(200);
    expect(b.slotsTotal).toBe(13);
    expect(b.slotsLeft).toBe(13);
    expect(b.maxBid).toBe(188);
    expect(b.remaining).toBe(200);
  });

  it("is deterministic (same input → same output)", () => {
    const a = decide({
      settings, keepers, events, prices,
      player: "Christian McCaffrey", position: "RB", currentPrice: 50,
    });
    const b = decide({
      settings, keepers, events, prices,
      player: "Christian McCaffrey", position: "RB", currentPrice: 50,
    });
    expect(a).toEqual(b);
  });

  it("stopAt = goUpTo + 1 (LOCK invariant)", () => {
    const d = decide({
      settings, keepers, events, prices,
      player: "Bijan Robinson", position: "RB", currentPrice: 30,
    });
    expect(d.stopAt).toBe(d.goUpTo + 1);
  });

  it("goUpTo never exceeds league max bid", () => {
    const b = computeBudget(settings, keepers, events);
    const d = decide({
      settings, keepers, events, prices,
      player: "Christian McCaffrey", position: "RB", currentPrice: 1,
    });
    expect(d.goUpTo).toBeLessThanOrEqual(b.maxBid);
  });

  it("verdict is STOP when current bid is above max bid", () => {
    // Spend down so maxBid is small
    const tightEvents: DraftEvent[] = [
      { id: "1", player: "Spent A", price: 100, drafter: "me", position: "RB", ts: 0 },
      { id: "2", player: "Spent B", price: 80, drafter: "me", position: "WR", ts: 1 },
    ];
    const b = computeBudget(settings, keepers, tightEvents);
    const overBid = b.maxBid + 5;
    const d = decide({
      settings, keepers, events: tightEvents, prices,
      player: "Tyreek Hill", position: "WR", currentPrice: overBid,
    });
    expect(d.verdict).toBe("STOP");
  });

  it("price ladder ordering: GOOD ≤ FAIR < STOP", () => {
    const d = decide({
      settings, keepers, events, prices,
      player: "Tyreek Hill", position: "WR", currentPrice: 30,
    });
    const good = d.ladder.find((p) => p.label === "GOOD")!.price;
    const fair = d.ladder.find((p) => p.label === "FAIR")!.price;
    const stop = d.ladder.find((p) => p.label === "STOP")!.price;
    expect(good).toBeLessThanOrEqual(fair);
    expect(fair).toBeLessThan(stop);
  });

  it("hasPlayer is false when no name supplied", () => {
    const d = decide({
      settings, keepers, events, prices,
      player: "", currentPrice: 0,
    });
    expect(d.hasPlayer).toBe(false);
  });
});

describe("DRAIN — computeDrain() picks safe, high-cost targets", () => {
  it("is deterministic", () => {
    const a = computeDrain({ settings, keepers, events, prices });
    const b = computeDrain({ settings, keepers, events, prices });
    expect(a).toEqual(b);
  });

  it("never recommends a drafted/keeper player", () => {
    const drafted: DraftEvent[] = [
      { id: "1", player: "Christian McCaffrey", price: 70, drafter: "other", position: "RB", ts: 0 },
    ];
    const drain = computeDrain({ settings, keepers, events: drafted, prices });
    expect(drain.primary?.name).not.toBe("Christian McCaffrey");
    for (const b of drain.backups) expect(b.name).not.toBe("Christian McCaffrey");
  });

  it("returns a primary when priced players exist", () => {
    const drain = computeDrain({ settings, keepers, events, prices });
    expect(drain.primary).not.toBeNull();
    expect(drain.primary!.price).toBeGreaterThan(0);
  });

  it("backups are distinct from primary", () => {
    const drain = computeDrain({ settings, keepers, events, prices });
    if (drain.primary) {
      for (const b of drain.backups) {
        expect(b.name).not.toBe(drain.primary.name);
      }
    }
  });

  it("returns null primary when pool is empty", () => {
    const drain = computeDrain({ settings, keepers, events, prices: [] });
    expect(drain.primary).toBeNull();
    expect(drain.backups).toEqual([]);
  });
});

describe("GET — computeGet() target & bid plan", () => {
  it("is deterministic", () => {
    const a = computeGet({ settings, keepers, events, prices });
    const b = computeGet({ settings, keepers, events, prices });
    expect(a).toEqual(b);
  });

  it("startPrice is $1 and pushTo ≤ stopAt", () => {
    const g = computeGet({ settings, keepers, events, prices });
    expect(g.startPrice).toBe(1);
    if (g.target) {
      expect(g.pushTo).toBeLessThanOrEqual(g.stopAt);
      expect(g.pushTo).toBeGreaterThanOrEqual(1);
    }
  });

  it("stopAt never exceeds league max bid", () => {
    const b = computeBudget(settings, keepers, events);
    const g = computeGet({ settings, keepers, events, prices });
    if (g.target) expect(g.stopAt).toBeLessThanOrEqual(b.maxBid);
  });

  it("timing is one of the allowed strings", () => {
    const g = computeGet({ settings, keepers, events, prices });
    expect(["Nominate now", "Wait"]).toContain(g.timing);
  });

  it("returns no target when all needed positions are filled", () => {
    // Fill the entire roster for "me"
    const filled: DraftEvent[] = [
      { id: "q", player: "QB1", price: 1, drafter: "me", position: "QB", ts: 0 },
      { id: "r1", player: "RB1", price: 1, drafter: "me", position: "RB", ts: 0 },
      { id: "r2", player: "RB2", price: 1, drafter: "me", position: "RB", ts: 0 },
      { id: "w1", player: "WR1", price: 1, drafter: "me", position: "WR", ts: 0 },
      { id: "w2", player: "WR2", price: 1, drafter: "me", position: "WR", ts: 0 },
      { id: "t1", player: "TE1", price: 1, drafter: "me", position: "TE", ts: 0 },
      { id: "f1", player: "FLEX1", price: 1, drafter: "me", position: "RB", ts: 0 },
      { id: "b1", player: "B1", price: 1, drafter: "me", position: "RB", ts: 0 },
      { id: "b2", player: "B2", price: 1, drafter: "me", position: "WR", ts: 0 },
      { id: "b3", player: "B3", price: 1, drafter: "me", position: "WR", ts: 0 },
      { id: "b4", player: "B4", price: 1, drafter: "me", position: "TE", ts: 0 },
      { id: "b5", player: "B5", price: 1, drafter: "me", position: "QB", ts: 0 },
      { id: "b6", player: "B6", price: 1, drafter: "me", position: "RB", ts: 0 },
    ];
    const g = computeGet({ settings, keepers, events: filled, prices });
    expect(g.target).toBeNull();
  });
});
