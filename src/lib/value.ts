// Amelia (market multiplier) + Buffett (value calls) + Reed (what-if math)
import { BudgetState, computeBudget, RosterCount } from "./draft-math";
import { DraftEvent, Keeper, LeagueSettings, Position, PriceEstimate } from "./draft-types";

export interface MarketPulse {
  multiplier: number;       // 1.0 = at price, >1 hot, <1 cold
  sampleSize: number;       // how many priced picks contributed
  confident: boolean;       // sampleSize >= 8
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildPriceMap(prices: PriceEstimate[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of prices) m.set(norm(p.name), p.price);
  return m;
}

/** How much is the room paying vs the user's price sheet? */
export function computeMarketPulse(events: DraftEvent[], prices: PriceEstimate[]): MarketPulse {
  const map = buildPriceMap(prices);
  let paid = 0;
  let sheet = 0;
  let n = 0;
  for (const e of events) {
    const ref = map.get(norm(e.player));
    if (!ref || ref <= 0) continue;
    paid += e.price;
    sheet += ref;
    n++;
  }
  if (n < 3 || sheet === 0) return { multiplier: 1, sampleSize: n, confident: false };
  return { multiplier: paid / sheet, sampleSize: n, confident: n >= 8 };
}

export interface ValueCall {
  hasRef: boolean;
  refPrice: number | null;       // raw user-sheet price
  goingRate: number | null;      // refPrice * multiplier (Amelia-adjusted)
  delta: number | null;          // goingRate - bid (positive = bargain)
  verdict: "steal" | "value" | "fair" | "reach" | "overpay" | "unknown";
}

export function valueFor(
  name: string,
  bid: number,
  prices: PriceEstimate[],
  pulse: MarketPulse,
): ValueCall {
  const map = buildPriceMap(prices);
  const ref = map.get(norm(name)) ?? null;
  if (!ref || ref <= 0) {
    return { hasRef: false, refPrice: null, goingRate: null, delta: null, verdict: "unknown" };
  }
  const goingRate = Math.max(1, Math.round(ref * pulse.multiplier));
  const delta = goingRate - bid;
  // ratio of bid vs going rate
  const ratio = bid / goingRate;
  let verdict: ValueCall["verdict"];
  if (ratio <= 0.7) verdict = "steal";
  else if (ratio <= 0.9) verdict = "value";
  else if (ratio <= 1.1) verdict = "fair";
  else if (ratio <= 1.25) verdict = "reach";
  else verdict = "overpay";
  return { hasRef: true, refPrice: ref, goingRate, delta, verdict };
}

/** Tyson — smallest "knockout" bid likely to end a war: going rate + small premium, capped by maxBid. */
export interface Knockout {
  bid: number | null;          // null if we can't justify (no ref or maxBid too tight)
  premium: number;             // $ over going rate
  confident: boolean;          // ref exists AND room is calibrated
  reason: string;              // short copy
}

export function knockoutBid(
  name: string,
  prices: PriceEstimate[],
  pulse: MarketPulse,
  maxBid: number,
): Knockout {
  const map = buildPriceMap(prices);
  const ref = map.get(norm(name));
  if (!ref || ref <= 0 || maxBid < 2) {
    return { bid: null, premium: 0, confident: false, reason: "no ref" };
  }
  const goingRate = Math.max(1, Math.round(ref * pulse.multiplier));
  // Premium scales with going rate but stays cheap: ~12% with floor of $2.
  const premium = Math.max(2, Math.ceil(goingRate * 0.12));
  const target = goingRate + premium;
  if (target > maxBid) {
    // Best we can do without breaking budget — only worth it if we're already at/over going rate
    if (maxBid >= goingRate + 1) {
      return { bid: maxBid, premium: maxBid - goingRate, confident: pulse.confident, reason: "max bid KO" };
    }
    return { bid: null, premium: 0, confident: false, reason: "max bid too tight" };
  }
  return { bid: target, premium, confident: pulse.confident, reason: "ends the war" };
}


/** Reed Richards — preview the post-pick state if user logs this pick at this price. */
export interface WhatIf {
  before: BudgetState;
  after: BudgetState;
  budgetDelta: number;        // negative if you spent
  maxBidDelta: number;        // change in max bid for next pick
  fillsSlot: "starter" | "flex" | "bench" | "overflow";
  newGapSeverityForPos: "critical" | "need" | "depth" | "done";
}

export function whatIfPick(
  settings: LeagueSettings,
  keepers: Keeper[],
  events: DraftEvent[],
  myCount: RosterCount,
  requiredCount: { QB: number; RB: number; WR: number; TE: number; K: number; DST: number; FLEX: number; BENCH: number },
  pos: Position,
  price: number,
): WhatIf {
  const before = computeBudget(settings, keepers, events);
  const fakeEvent: DraftEvent = {
    id: "preview",
    player: "__preview__",
    position: pos,
    price,
    drafter: "me",
    ts: Date.now(),
  };
  const after = computeBudget(settings, keepers, [...events, fakeEvent]);

  const flexNeed = requiredCount.FLEX;
  const flexHave = Math.max(
    0,
    (myCount.RB - requiredCount.RB) +
      (myCount.WR - requiredCount.WR) +
      (myCount.TE - requiredCount.TE)
  );
  const flexShort = Math.max(0, flexNeed - flexHave);

  let fillsSlot: WhatIf["fillsSlot"] = "bench";
  if (myCount[pos] < requiredCount[pos]) fillsSlot = "starter";
  else if (["RB", "WR", "TE"].includes(pos) && flexShort > 0) fillsSlot = "flex";
  else if (myCount[pos] >= requiredCount[pos]) fillsSlot = "overflow";

  // Gap severity AFTER the pick
  const newCount = { ...myCount, [pos]: myCount[pos] + 1 };
  const starterShort = Math.max(0, requiredCount[pos] - newCount[pos]);
  let newGapSeverityForPos: WhatIf["newGapSeverityForPos"];
  if (starterShort >= 2) newGapSeverityForPos = "critical";
  else if (starterShort === 1) newGapSeverityForPos = "need";
  else if (newCount[pos] < requiredCount[pos] + 1 && (pos === "RB" || pos === "WR")) newGapSeverityForPos = "depth";
  else newGapSeverityForPos = "done";

  return {
    before,
    after,
    budgetDelta: after.remaining - before.remaining,
    maxBidDelta: after.maxBid - before.maxBid,
    fillsSlot,
    newGapSeverityForPos,
  };
}
