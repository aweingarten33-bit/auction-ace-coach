// Multi-path Decision Engine — pure, deterministic, instant.
// Compares BUY vs PASS and tells the user which path leaves them stronger.
// No AI. No hedging. Plain English.
import { computeBudget } from "./draft-math";
import { projectRemainingBuild } from "./simulator";
import { computeMarketPulse } from "./value";
import {
  DraftEvent,
  Keeper,
  LeagueSettings,
  Position,
  PriceEstimate,
} from "./draft-types";

export type Verdict = "BID" | "PASS" | "STOP" | "ONLY IF CHEAP";
export type PlanStatus = "ok" | "tight" | "broken";

export interface PricePoint {
  price: number;
  label: "GOOD" | "FAIR" | "STOP";
}

export interface BuyPath {
  price: number;
  remainingAfter: number;
  slotsLeftAfter: number;
  feasible: boolean;
  consequence: string;          // "You'll need cheaper RBs later"
  weakerPositions: Position[];
}

export interface PassPath {
  nextPos: Position | null;
  nextPriceMin: number;
  nextPriceMax: number;
  nextOption: string | null;    // top remaining player at that pos
  consequence: string;          // "You can still get a WR in the $20-28 range"
  dropoff: "small" | "moderate" | "severe";
}

export type PriceSource = "sheet" | "league" | "espn" | "none";

export interface DecisionResult {
  hasPlayer: boolean;
  player: string;
  position?: Position;
  currentPrice: number;
  goUpTo: number;               // YOU CAN GO UP TO
  stopAt: number;               // STOP AT (anything above = bad)
  anchorPrice: number;          // the per-player anchor we used (0 if none)
  anchorSource: PriceSource;    // where the anchor came from
  anchorBreakdown?: {           // transparency: how the anchor was built
    league?: number;            // your league's weighted history
    market?: number;            // Sleeper/ESPN consensus
    espn?: number;              // raw ESPN
    sleeper?: number;           // raw Sleeper
  };
  verdict: Verdict;
  oneLiner: string;             // "Too expensive" / "This works" / "Not worth it"
  ladder: PricePoint[];         // 3 price points GOOD/FAIR/STOP
  buy: BuyPath;
  pass: PassPath;
  better: "buy" | "pass" | "tie";
  betterReason: string;         // "Buying leaves you weaker later"
  plan: { status: PlanStatus; reason: string };
  recovery: { triggered: boolean; overspendBy: number; adjustments: string[] };
  confidence: "high" | "medium" | "low";
}

export interface AnchorEntry {
  price: number;                  // final blended anchor we use
  source: "league" | "espn";
  leaguePrice?: number;           // raw weighted league history (if any)
  marketPrice?: number;           // raw market consensus (Sleeper/ESPN blend)
  marketSources?: { espn?: number; sleeper?: number };
}

interface EngineInput {
  settings: LeagueSettings;
  keepers: Keeper[];
  events: DraftEvent[];
  prices: PriceEstimate[];
  player: string;
  position?: Position;
  currentPrice: number;
  /**
   * Optional fallback price anchors keyed by normalized player name.
   * Used when the player isn't on the user's price sheet.
   * Cascade: sheet (prices) → anchorMap (league avg → ESPN) → cap.
   */
  anchorMap?: Record<string, AnchorEntry>;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function decide(input: EngineInput): DecisionResult {
  const { settings, keepers, events, prices, player, position, currentPrice, anchorMap } = input;
  const budget = computeBudget(settings, keepers, events);
  const pulse = computeMarketPulse(events, prices);
  const mult = pulse.multiplier || 1;

  // Anchor cascade: LEAGUE 3yr avg (true league-specific, blended w/ VORP)
  //   → VORP (projection-based replacement value)
  //   → market consensus (ESPN+Sleeper, scaled)
  //   → none
  // Vetri sheet is no longer part of the cascade — it was overriding real data.
  const key = norm(player);
  const mapEntry = anchorMap?.[key];
  let anchorPrice = 0;
  let anchorSource: PriceSource = "none";
  if (mapEntry && mapEntry.price > 0) {
    anchorPrice = mapEntry.price;
    anchorSource = mapEntry.source;
  }
  const goingPrice = anchorPrice > 0 ? Math.max(1, Math.round(anchorPrice * mult)) : 0;

  // YOU CAN GO UP TO: anchor is the ceiling — never let market pulse push you
  // above what the player is actually worth. Then cap by your wallet.
  const cap = Math.max(0, budget.maxBid);
  const goUpTo = anchorPrice > 0
    ? Math.min(cap, anchorPrice)
    : Math.min(cap, Math.max(1, goingPrice || 1));
  // STOP AT: 1 dollar above goUpTo (anything ≥ stopAt is bad)
  const stopAt = goUpTo + 1;

  // Verdict
  let verdict: Verdict;
  let oneLiner: string;
  if (cap <= 0 || budget.slotsLeft <= 0) {
    verdict = "STOP"; oneLiner = "No room";
  } else if (currentPrice <= 0) {
    verdict = "BID"; oneLiner = "Open the bid";
  } else if (currentPrice > cap) {
    verdict = "STOP"; oneLiner = "Over your max";
  } else if (goingPrice > 0 && currentPrice > goingPrice + Math.max(2, Math.round(goingPrice * 0.15))) {
    verdict = "STOP"; oneLiner = "Too expensive";
  } else if (goingPrice > 0 && currentPrice <= Math.round(goingPrice * 0.75)) {
    verdict = "BID"; oneLiner = "Good price — push it";
  } else if (currentPrice <= goUpTo) {
    verdict = "BID"; oneLiner = "This works";
  } else {
    verdict = "PASS"; oneLiner = "Not worth it";
  }

  // Price ladder (3 anchors)
  const good = goingPrice > 0 ? Math.max(1, Math.round(goingPrice * 0.85)) : Math.max(1, Math.round(cap * 0.5));
  const fair = goingPrice > 0 ? goingPrice : Math.max(good + 1, Math.round(cap * 0.75));
  const stopP = stopAt;
  const ladder: PricePoint[] = [
    { price: good, label: "GOOD" },
    { price: fair, label: "FAIR" },
    { price: stopP, label: "STOP" },
  ];

  // BUY path — use simulator
  const proj = projectRemainingBuild({
    settings, keepers, events, prices,
    hypothetical: { name: player || "this player", pos: position, price: currentPrice || 1 },
  });

  const requiredCount: Record<Position, number> = {
    QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
  };
  const myCountAfter: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const k of keepers) if (k.position) myCountAfter[k.position]++;
  for (const e of events) if (e.drafter === "me" && e.position) myCountAfter[e.position]++;
  if (position) myCountAfter[position]++;

  // Which positions become weaker? = open required slots where avg cheapest priced player > planned bank/slot
  const remainingPlanPerSlot = proj.slotsLeftAfter > 0
    ? Math.max(1, Math.floor(proj.remainingAfter / proj.slotsLeftAfter))
    : 0;
  const draftedSet = new Set([
    ...events.map((e) => norm(e.player)),
    ...keepers.map((k) => norm(k.player)),
    norm(player),
  ]);
  const weakerPositions: Position[] = [];
  (["RB", "WR", "QB", "TE"] as Position[]).forEach((p) => {
    const short = Math.max(0, requiredCount[p] - myCountAfter[p]);
    if (short <= 0) return;
    const cheapest = prices
      .filter((x) => !draftedSet.has(norm(x.name)) && (x as { position?: Position }).position === p && x.price > 0)
      .sort((a, b) => a.price - b.price)[0];
    if (cheapest && cheapest.price > remainingPlanPerSlot * 1.3) weakerPositions.push(p);
  });
  const buyConsequence = weakerPositions.length
    ? `You'll need cheaper ${weakerPositions.join("/")} later`
    : proj.feasible
      ? "Your build still works"
      : "You won't be able to fill your roster";

  const buy: BuyPath = {
    price: currentPrice,
    remainingAfter: proj.remainingAfter,
    slotsLeftAfter: proj.slotsLeftAfter,
    feasible: proj.feasible,
    consequence: buyConsequence,
    weakerPositions,
  };

  // PASS path — what's the next option at this position?
  const pos = position;
  const passDraftedSet = new Set([
    ...events.map((e) => norm(e.player)),
    ...keepers.map((k) => norm(k.player)),
  ]); // does NOT include this player — they're still on the board if you pass
  let nextOption: string | null = null;
  let nextMin = 0;
  let nextMax = 0;
  let dropoff: PassPath["dropoff"] = "small";
  if (pos) {
    const nextSamePos = prices
      .filter((x) => !passDraftedSet.has(norm(x.name)) && (x as { position?: Position }).position === pos && x.price > 0 && norm(x.name) !== norm(player))
      .sort((a, b) => b.price - a.price);
    const top = nextSamePos[0];
    if (top) {
      nextOption = top.name;
      const goingNext = Math.max(1, Math.round(top.price * mult));
      nextMin = Math.max(1, Math.round(goingNext * 0.85));
      nextMax = Math.round(goingNext * 1.15);
      const drop = anchorPrice > 0 ? (anchorPrice - top.price) / anchorPrice : 0;
      dropoff = drop >= 0.35 ? "severe" : drop >= 0.18 ? "moderate" : "small";
    }
  }
  const passConsequence = nextOption
    ? `Next ${pos}: ${nextOption} ($${nextMin}-${nextMax}). Dropoff: ${dropoff}.`
    : pos
      ? `No priced ${pos} left — passing is risky`
      : "Other targets remain";

  const pass: PassPath = {
    nextPos: pos ?? null,
    nextPriceMin: nextMin,
    nextPriceMax: nextMax,
    nextOption,
    consequence: passConsequence,
    dropoff,
  };

  // Which path is better?
  let better: DecisionResult["better"] = "tie";
  let betterReason = "Either works";
  if (verdict === "STOP") {
    better = "pass"; betterReason = "Buying leaves you weaker later";
  } else if (verdict === "BID" && proj.feasible) {
    better = "buy"; betterReason = "Buying is the better move here";
  } else if (verdict === "PASS") {
    better = "pass";
    betterReason = nextOption
      ? `Pass — get ${nextOption} cheaper`
      : "Pass — save for stronger targets";
  } else if (!proj.feasible) {
    better = "pass"; betterReason = "Buying breaks your build";
  }

  // Plan status (FDR layer)
  const planStatus: PlanStatus = !proj.feasible
    ? "broken"
    : proj.riskFlags.length > 0 || proj.remainingAfter < proj.slotsLeftAfter * 1.5
      ? "tight"
      : "ok";
  const planReason = !proj.feasible
    ? (proj.riskFlags[0] ?? "Not enough money for required slots")
    : planStatus === "tight"
      ? (proj.riskFlags[0] ?? "Less than $1.50/slot of room")
      : "On track";

  // Winston Wolf recovery — triggered if last MY pick blew past sheet by a lot
  const myEvents = events.filter((e) => e.drafter === "me");
  const lastMine = myEvents[myEvents.length - 1];
  let overspendBy = 0;
  const adjustments: string[] = [];
  if (lastMine) {
    const ref = prices.find((p) => norm(p.name) === norm(lastMine.player));
    if (ref && ref.price > 0) {
      const expected = Math.max(1, Math.round(ref.price * mult));
      overspendBy = Math.max(0, lastMine.price - expected - 3);
    }
  }
  const recoveryTriggered = overspendBy >= 5 && budget.slotsLeft > 1;
  if (recoveryTriggered) {
    const perSlot = budget.slotsLeft > 0 ? Math.floor(budget.remaining / budget.slotsLeft) : 0;
    adjustments.push(`Cap next starter at $${Math.max(1, perSlot * 2)}`);
    adjustments.push(`Keep K/DST/late bench at $1`);
    if (proj.feasible) adjustments.push("You can still finish your roster");
    else adjustments.push("Pivot to value tier — no more premium bids");
  }

  // Confidence — high if we have a real anchor + confident market, medium if anchor only, low otherwise
  const confidence: DecisionResult["confidence"] =
    anchorSource === "league" && pulse.confident ? "high" :
    anchorPrice > 0 ? "medium" : "low";

  return {
    hasPlayer: !!player,
    player,
    position,
    currentPrice,
    goUpTo,
    stopAt,
    anchorPrice,
    anchorSource,
    anchorBreakdown: mapEntry ? {
      league: mapEntry.leaguePrice,
      market: mapEntry.marketPrice,
      espn: mapEntry.marketSources?.espn,
      sleeper: mapEntry.marketSources?.sleeper,
    } : undefined,
    verdict,
    oneLiner,
    ladder,
    buy,
    pass,
    better,
    betterReason,
    plan: { status: planStatus, reason: planReason },
    recovery: { triggered: recoveryTriggered, overspendBy, adjustments },
    confidence,
  };
}
