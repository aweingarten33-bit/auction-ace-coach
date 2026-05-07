// Derives the dynamic narrative bits used by AuctionPlayerCard:
// big decision label, price ladder, "if you buy" outcome table, team identity, take.
import type { DecisionResult } from "./decision-engine";
import type { DraftEvent, Keeper, LeagueSettings, Position } from "./draft-types";

export type BigDecision =
  | "AGGRESSIVE BUY"
  | "VALUE ONLY"
  | "PASS AT COST"
  | "BAIT NOMINATION"
  | "HOLD THE LINE";

export interface LadderRow {
  label: "AUTO BUY" | "STRONG BUY" | "FAIR VALUE" | "RISK ZONE" | "DO NOT CHASE";
  price: string;
  tone: "good" | "ok" | "warn" | "bad" | "stop";
}

export interface OutcomeRow {
  label: string;
  value: string;
  tone: "good" | "ok" | "warn" | "bad";
}

export type TeamIdentity =
  | "TOP-HEAVY NUCLEAR UPSIDE BUILD"
  | "HERO RB BUILD"
  | "ZERO RB CHAOS BUILD"
  | "ELITE WR BUILD"
  | "BALANCED VALUE BUILD"
  | "STARS-AND-SCRUBS BUILD";

export interface CardInsights {
  bigDecision: BigDecision;
  bigDecisionReason: string;
  ladder: LadderRow[];
  walkAway: number;
  expectedFinal: number;
  outcomes: OutcomeRow[];
  identity: TeamIdentity;
  take: string;
}

const myPicks = (events: DraftEvent[]) => events.filter((e) => e.drafter === "me");

function countByPos(picks: { position?: Position }[]): Record<Position, number> {
  const c: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const p of picks) if (p.position) c[p.position]++;
  return c;
}

export function computeCardInsights(
  d: DecisionResult,
  settings: LeagueSettings,
  events: DraftEvent[],
  keepers: Keeper[],
): CardInsights {
  const anchor = d.anchorPrice || d.goUpTo || 1;
  const stop = d.stopAt;

  // Big decision label
  let bigDecision: BigDecision = "HOLD THE LINE";
  let reason = d.oneLiner;
  if (d.verdict === "STOP") {
    bigDecision = "PASS AT COST";
    reason = `Anything over $${stop - 1} breaks the build`;
  } else if (d.verdict === "BID" && d.confidence !== "low" && anchor >= 30) {
    bigDecision = "AGGRESSIVE BUY";
    reason = `Push to $${d.goUpTo} — tier value`;
  } else if (d.verdict === "BID") {
    bigDecision = "VALUE ONLY";
    reason = `Only at or under $${d.goUpTo}`;
  } else if (d.verdict === "ONLY IF CHEAP") {
    bigDecision = "VALUE ONLY";
    reason = `Cheap or move on`;
  } else if (d.verdict === "PASS") {
    bigDecision = anchor >= 25 ? "BAIT NOMINATION" : "PASS AT COST";
    reason = anchor >= 25 ? `Throw it out, drain wallets` : `Better targets remain`;
  }

  // Price ladder
  const auto = Math.max(1, Math.round(anchor * 0.6));
  const strong = Math.max(auto + 1, Math.round(anchor * 0.85));
  const fair = anchor;
  const riskPrice = Math.round(anchor * 1.12);
  const ladder: LadderRow[] = [
    { label: "AUTO BUY",     price: `$${auto}`,            tone: "good" },
    { label: "STRONG BUY",   price: `$${strong}`,          tone: "good" },
    { label: "FAIR VALUE",   price: `$${fair}`,            tone: "ok"   },
    { label: "RISK ZONE",    price: `$${riskPrice}`,       tone: "warn" },
    { label: "DO NOT CHASE", price: `$${stop}+`,           tone: "stop" },
  ];

  // Outcomes — derived from current roster + this hypothetical buy
  const mine = [...keepers, ...myPicks(events)];
  const counts = countByPos(mine);
  const after = { ...counts };
  if (d.position) after[d.position] = (after[d.position] || 0) + 1;

  const need = settings.roster;
  const rbStrat: OutcomeRow = { label: "RB STRATEGY", value: "—", tone: "ok" };
  if (after.RB >= need.RB + 1) { rbStrat.value = "Stacked"; rbStrat.tone = "good"; }
  else if (after.RB >= need.RB) { rbStrat.value = "Set"; rbStrat.tone = "good"; }
  else if (d.position === "RB") { rbStrat.value = "Anchor RB"; rbStrat.tone = "good"; }
  else { rbStrat.value = `Still need ${Math.max(0, need.RB - after.RB)}`; rbStrat.tone = "warn"; }

  const qbStrat: OutcomeRow = { label: "QB STRATEGY", value: "—", tone: "ok" };
  const qbNeed = need.QB + (settings.leagueType !== "Standard" ? need.SUPERFLEX : 0);
  if (after.QB >= qbNeed) { qbStrat.value = "Locked"; qbStrat.tone = "good"; }
  else if (d.position === "QB") { qbStrat.value = "QB1 secured"; qbStrat.tone = "good"; }
  else { qbStrat.value = `Need ${qbNeed - after.QB} more`; qbStrat.tone = "warn"; }

  const flexCeil: OutcomeRow = {
    label: "FLEX CEILING",
    value: d.position === "WR" || d.position === "RB" ? "Raised" : "Unchanged",
    tone: d.position === "WR" || d.position === "RB" ? "good" : "ok",
  };

  const benchAfter = d.buy.slotsLeftAfter;
  const benchDepth: OutcomeRow = {
    label: "BENCH DEPTH",
    value: benchAfter >= 5 ? "Deep" : benchAfter >= 3 ? "OK" : "Thin",
    tone: benchAfter >= 5 ? "good" : benchAfter >= 3 ? "ok" : "bad",
  };

  const riskRow: OutcomeRow = {
    label: "RISK PROFILE",
    value: d.plan.status === "broken" ? "Reckless" : d.plan.status === "tight" ? "Stretched" : "Controlled",
    tone: d.plan.status === "broken" ? "bad" : d.plan.status === "tight" ? "warn" : "good",
  };

  const ceiling: OutcomeRow = {
    label: "WEEKLY CEILING",
    value: anchor >= 45 ? "Elite" : anchor >= 25 ? "High" : anchor >= 12 ? "Solid" : "Streamer",
    tone: anchor >= 45 ? "good" : anchor >= 25 ? "good" : anchor >= 12 ? "ok" : "warn",
  };

  const outcomes: OutcomeRow[] = [rbStrat, qbStrat, flexCeil, benchDepth, riskRow, ceiling];

  // Team identity — heuristic
  let identity: TeamIdentity = "BALANCED VALUE BUILD";
  const totalSpent = mine.reduce((s, p) => s + ("price" in p ? p.price : (p as Keeper).cost || 0), 0);
  const bigSpends = mine.filter((p) => ("price" in p ? p.price : (p as Keeper).cost) >= 35).length;
  if (bigSpends >= 2 && after.WR >= 2 && after.RB <= 1) identity = "ZERO RB CHAOS BUILD";
  else if (bigSpends >= 2 && after.RB >= 2) identity = "STARS-AND-SCRUBS BUILD";
  else if (after.RB >= 1 && counts.RB >= 1 && totalSpent >= settings.totalBudget * 0.4 && d.position !== "RB") identity = "HERO RB BUILD";
  else if (after.WR >= 3) identity = "ELITE WR BUILD";
  else if (bigSpends >= 3) identity = "TOP-HEAVY NUCLEAR UPSIDE BUILD";

  // Take — one sentence
  const take = (() => {
    if (d.verdict === "STOP") return `Hard line at $${stop - 1} — past that and the math collapses.`;
    if (bigDecision === "AGGRESSIVE BUY") return `Tier-defining ${d.position ?? "asset"} — pay up, don't blink.`;
    if (bigDecision === "BAIT NOMINATION") return `Float the name, let someone else burn the cap.`;
    if (bigDecision === "VALUE ONLY") return `Worth it at $${d.goUpTo}, dead money one dollar higher.`;
    return `Stay disciplined — better leverage waits one nomination away.`;
  })();

  return {
    bigDecision,
    bigDecisionReason: reason,
    ladder,
    walkAway: stop - 1,
    expectedFinal: Math.round((anchor + d.goUpTo) / 2),
    outcomes,
    identity,
    take,
  };
}
