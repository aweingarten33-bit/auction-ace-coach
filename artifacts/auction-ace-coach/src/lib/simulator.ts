// Remaining-Build Simulator — pure, deterministic, runs after every keystroke.
// "If I bid $X here, can I still build a real team?"
import { computeBudget } from "./draft-math";
import {
  DraftEvent,
  Keeper,
  LeagueSettings,
  Position,
  PriceEstimate,
} from "./draft-types";

export interface PlannedSlot {
  pos: Position | "FLEX" | "BENCH";
  plannedSpend: number;
  candidateName: string | null;
  required: boolean;
}

export interface BuildProjection {
  feasible: boolean;
  remainingAfter: number;       // budget left after the hypothetical pick
  slotsLeftAfter: number;
  slots: PlannedSlot[];          // greedy-fill plan for remaining slots
  dollarsLeftover: number;       // money not spent by the greedy plan
  riskFlags: string[];
  fillsSlot: "starter" | "flex" | "bench" | "overflow";
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface SimInput {
  settings: LeagueSettings;
  keepers: Keeper[];
  events: DraftEvent[];
  prices: PriceEstimate[];
  hypothetical: { name?: string; pos?: Position; price: number } | null;
}

/**
 * Greedy-fill remaining required slots from the undrafted price sheet.
 * Returns a plan + risk flags. Pure function — no AI, no async.
 */
export function projectRemainingBuild(input: SimInput): BuildProjection {
  const { settings, keepers, events, prices } = input;
  const hypo = input.hypothetical;

  // Drafted set (mine + others + keepers)
  const drafted = new Set<string>();
  for (const e of events) drafted.add(norm(e.player));
  for (const k of keepers) drafted.add(norm(k.player));

  // My current count by position (keepers + my picks)
  const myCount: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const k of keepers) if (k.position) myCount[k.position]++;
  for (const e of events) if (e.drafter === "me" && e.position) myCount[e.position]++;

  // Required by position (Superflex inflates QB)
  const reqQB =
    settings.roster.QB +
    (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0);
  const required = {
    QB: reqQB,
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
    FLEX: settings.roster.FLEX,
    BENCH: settings.roster.BENCH,
  };

  // Apply the hypothetical pick (as if "me" won at that price)
  const hypoEvent: DraftEvent | null =
    hypo && hypo.price > 0 && hypo.name
      ? {
          id: "__hypo__",
          player: hypo.name,
          position: hypo.pos,
          price: hypo.price,
          drafter: "me",
          ts: Date.now(),
        }
      : null;

  const eventsAfter = hypoEvent ? [...events, hypoEvent] : events;
  const myCountAfter = { ...myCount };
  if (hypoEvent && hypoEvent.position) myCountAfter[hypoEvent.position]++;
  if (hypoEvent) drafted.add(norm(hypoEvent.player));

  const budgetAfter = computeBudget(settings, keepers, eventsAfter);

  // What slot does this pick fill?
  let fillsSlot: BuildProjection["fillsSlot"] = "bench";
  if (hypo?.pos) {
    if (myCount[hypo.pos] < required[hypo.pos]) fillsSlot = "starter";
    else {
      const flexHave =
        Math.max(0, myCount.RB - required.RB) +
        Math.max(0, myCount.WR - required.WR) +
        Math.max(0, myCount.TE - required.TE);
      if (
        ["RB", "WR", "TE"].includes(hypo.pos) &&
        flexHave < required.FLEX
      )
        fillsSlot = "flex";
      else fillsSlot = "overflow";
    }
  }

  // Build the open-slot list (after the hypothetical pick)
  const openSlots: (Position | "FLEX" | "BENCH")[] = [];
  (["QB", "RB", "WR", "TE", "K", "DST"] as Position[]).forEach((p) => {
    const short = Math.max(0, required[p] - myCountAfter[p]);
    for (let i = 0; i < short; i++) openSlots.push(p);
  });
  // FLEX (RB/WR/TE overflow)
  const flexHaveAfter =
    Math.max(0, myCountAfter.RB - required.RB) +
    Math.max(0, myCountAfter.WR - required.WR) +
    Math.max(0, myCountAfter.TE - required.TE);
  const flexShort = Math.max(0, required.FLEX - flexHaveAfter);
  for (let i = 0; i < flexShort; i++) openSlots.push("FLEX");
  // BENCH
  const totalFilledAfter =
    keepers.length + eventsAfter.filter((e) => e.drafter === "me").length;
  const totalSlots =
    required.QB + required.RB + required.WR + required.TE +
    required.K + required.DST + required.FLEX + required.BENCH;
  const benchOpen = Math.max(0, totalSlots - totalFilledAfter - openSlots.length);
  for (let i = 0; i < benchOpen; i++) openSlots.push("BENCH");

  // Pool of undrafted priced players, with position when known
  const pool = prices
    .filter((p) => !drafted.has(norm(p.name)) && p.price > 0)
    .map((p) => ({
      name: p.name,
      price: p.price,
      pos: ((p as unknown) as { position?: Position }).position,
    }))
    .sort((a, b) => b.price - a.price);

  const usedPool = new Set<string>();
  const candidateFor = (slot: Position | "FLEX" | "BENCH", maxPrice: number) => {
    const eligible = (p: { name: string; pos?: Position; price: number }) => {
      if (usedPool.has(norm(p.name))) return false;
      if (p.price > maxPrice) return false;
      if (slot === "BENCH") return true;
      if (slot === "FLEX") return p.pos === "RB" || p.pos === "WR" || p.pos === "TE";
      // strict position match — if pool entry has no position, allow it
      return !p.pos || p.pos === slot;
    };
    return pool.find(eligible) ?? null;
  };

  // Greedy-allocate dollars across open slots.
  // Reserve $1 per slot; distribute the rest weighted by required-position shares.
  let bank = budgetAfter.remaining;
  const minReserve = openSlots.length;
  let spendable = Math.max(0, bank - minReserve);
  // weights — starter slots > flex > bench
  const weight = (s: Position | "FLEX" | "BENCH") =>
    s === "BENCH" ? 0.4 : s === "FLEX" ? 1.1 : s === "QB" || s === "TE" ? 1.0 : s === "K" || s === "DST" ? 0.3 : 1.6;
  const totalW = openSlots.reduce((sum, s) => sum + weight(s), 0) || 1;

  const slots: PlannedSlot[] = openSlots.map((slot) => {
    const target = Math.max(1, Math.round((spendable * weight(slot)) / totalW) + 1);
    const cap = Math.min(target, bank - (openSlots.length - 1));
    const candidate = candidateFor(slot, cap);
    const plannedSpend = candidate ? candidate.price : Math.max(1, Math.min(cap, target));
    if (candidate) usedPool.add(norm(candidate.name));
    bank -= plannedSpend;
    return {
      pos: slot,
      plannedSpend,
      candidateName: candidate?.name ?? null,
      required: slot !== "BENCH",
    };
  });

  const dollarsLeftover = Math.max(0, bank);

  // Risk flags
  const riskFlags: string[] = [];
  if (budgetAfter.remaining < openSlots.length) {
    riskFlags.push("Not enough cash to fill remaining slots");
  }
  for (const s of slots) {
    if (s.required && !s.candidateName && s.pos !== "FLEX" && s.pos !== "BENCH") {
      riskFlags.push(`No ${s.pos} left at $${s.plannedSpend}`);
    }
  }
  // critical-position punt warnings
  (["RB", "WR", "QB", "TE"] as Position[]).forEach((p) => {
    const stillShort = Math.max(0, required[p] - myCountAfter[p]);
    if (stillShort > 0) {
      const cheapest = pool.find((x) => x.pos === p);
      if (cheapest && cheapest.price > budgetAfter.remaining - (openSlots.length - 1)) {
        riskFlags.push(`${p} too expensive — cheapest priced is $${cheapest.price}`);
      }
    }
  });

  const feasible =
    budgetAfter.remaining >= openSlots.length && riskFlags.length === 0;

  return {
    feasible,
    remainingAfter: budgetAfter.remaining,
    slotsLeftAfter: budgetAfter.slotsLeft,
    slots,
    dollarsLeftover,
    riskFlags: Array.from(new Set(riskFlags)).slice(0, 3),
    fillsSlot,
  };
}
