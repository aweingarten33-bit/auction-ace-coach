// Bioshock — detect draft archetype from actual spend and warn on drift.
import { BudgetState } from "./draft-math";
import { DraftEvent, Keeper } from "./draft-types";

export type Archetype =
  | "studs_duds"   // 2-3 mega buys, rest cheap
  | "zero_rb"      // very low RB spend early
  | "hero_rb"      // 1 expensive RB, rest WR
  | "robust_rb"    // RB-heavy spend
  | "balanced"     // even distribution
  | "forming";     // not enough data

export interface IdentityRead {
  archetype: Archetype;
  label: string;
  blurb: string;
  drift: string | null;          // warning text if drifting off-archetype
  spendShare: Record<string, number>; // pct of spent budget by pos
  topBuys: { player: string; price: number; position?: string }[];
}

const LABELS: Record<Archetype, { label: string; blurb: string }> = {
  studs_duds:  { label: "Studs & Duds", blurb: "Top-heavy. Stars + $1 fliers." },
  zero_rb:     { label: "Zero-RB",      blurb: "Pass-game first. RB late & cheap." },
  hero_rb:     { label: "Hero-RB",      blurb: "One anchor RB, then load WR." },
  robust_rb:   { label: "Robust-RB",    blurb: "Build the backfield first." },
  balanced:    { label: "Balanced",     blurb: "Spread risk across positions." },
  forming:     { label: "Forming",      blurb: "Identity emerges after 3+ picks." },
};

export function readIdentity(
  keepers: Keeper[],
  events: DraftEvent[],
  budget: BudgetState,
): IdentityRead {
  const myEvents = events.filter((e) => e.drafter === "me");
  const myItems = [
    ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost })),
    ...myEvents.map((e) => ({ player: e.player, position: e.position, price: e.price })),
  ];

  const spent = myItems.reduce((s, x) => s + x.price, 0);
  const byPos: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0, UNK: 0 };
  for (const it of myItems) byPos[it.position ?? "UNK"] += it.price;
  const share: Record<string, number> = {};
  for (const k of Object.keys(byPos)) share[k] = spent > 0 ? byPos[k] / spent : 0;

  const topBuys = [...myItems].sort((a, b) => b.price - a.price).slice(0, 3);

  if (myItems.length < 3 || spent < budget.totalBudget * 0.2) {
    return { archetype: "forming", ...LABELS.forming, drift: null, spendShare: share, topBuys };
  }

  // Detect archetype
  const big = myItems.filter((x) => x.price >= budget.totalBudget * 0.2).length;
  const rbShare = share.RB ?? 0;
  const wrShare = share.WR ?? 0;
  const rbBigCount = myItems.filter((x) => x.position === "RB" && x.price >= budget.totalBudget * 0.18).length;

  let archetype: Archetype;
  if (rbShare < 0.15 && wrShare > 0.4) archetype = "zero_rb";
  else if (rbBigCount === 1 && rbShare < 0.4 && wrShare > 0.35) archetype = "hero_rb";
  else if (rbShare > 0.55) archetype = "robust_rb";
  else if (big >= 2 && (share.RB + share.WR) > 0.7) archetype = "studs_duds";
  else archetype = "balanced";

  // Drift detection — pick is consistent with archetype?
  let drift: string | null = null;
  const last = myEvents[myEvents.length - 1];
  if (last && spent > 0) {
    const lastShare = last.price / budget.totalBudget;
    if (archetype === "zero_rb" && last.position === "RB" && lastShare > 0.1) {
      drift = `That ${last.player} buy ($${last.price}) breaks Zero-RB. Pivot or commit.`;
    } else if (archetype === "studs_duds" && lastShare > 0.05 && lastShare < 0.15 && big < 3) {
      drift = `Mid-tier buys dilute Studs & Duds. Save for one more anchor or punt to $1s.`;
    } else if (archetype === "robust_rb" && last.position === "WR" && rbShare < 0.5 && myItems.filter(x => x.position === "RB").length < 3) {
      drift = `WR spend rising before RB depth is locked. Re-anchor RB next.`;
    } else if (archetype === "hero_rb" && last.position === "RB" && lastShare > 0.1 && rbBigCount >= 1) {
      drift = `Second expensive RB pulls you out of Hero-RB into Robust-RB.`;
    }
  }

  return { archetype, ...LABELS[archetype], drift, spendShare: share, topBuys };
}
