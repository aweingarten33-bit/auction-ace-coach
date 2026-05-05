// Auction draft strategy presets. Each preset returns weight multipliers
// applied on top of the baseline position weights in suggestedAllocations.
// "none" = no preset; baseline weights are used as-is.

export type StrategyId =
  | "none"
  | "balanced"
  | "stars-and-scrubs"
  | "hero-rb"
  | "zero-rb"
  | "robust-rb"
  | "modified-zero-rb";

export interface Strategy {
  id: StrategyId;
  label: string;
  short: string;          // 1-line tagline
  description: string;    // what it means
  // Per-position multipliers applied to the slot weights. Index 0 = top slot
  // at that position (RB1, WR1, etc.), index 1 = next slot, and so on.
  // Missing entries default to 1.
  weights: Partial<Record<"QB" | "RB" | "WR" | "TE" | "FLEX" | "SUPERFLEX" | "K" | "DST" | "BENCH", number[]>>;
  // Plain-English coach guidance attached to every AI request when chosen.
  coachGuidance: string;
}

export const STRATEGIES: Strategy[] = [
  {
    id: "none",
    label: "No strategy (default)",
    short: "Spread the budget evenly by position weight.",
    description:
      "No specific build. The tool just splits your budget by standard position value — works fine if you want to stay flexible and react to value as it comes.",
    weights: {},
    coachGuidance: "User has no fixed strategy. Judge bids on raw value and roster gaps. Don't lecture about plans.",
  },
  {
    id: "balanced",
    label: "Balanced",
    short: "Two solid RBs, two solid WRs, no holes.",
    description:
      "Spend evenly across RB and WR with a mid-tier QB and TE. No one stud, no one bargain — just no weaknesses.",
    weights: { RB: [1.05, 1.0, 0.9], WR: [1.05, 1.0, 0.9], QB: [1.0], TE: [1.0] },
    coachGuidance:
      "User is going Balanced: 2 strong RBs, 2 strong WRs, mid-tier QB/TE. Don't approve overpays on a single stud at the cost of a weak roster spot. Push for steady value across positions.",
  },
  {
    id: "stars-and-scrubs",
    label: "Stars & Scrubs",
    short: "3 elite players, then $1–3 dart throws.",
    description:
      "Spend ~75% of your budget on 3 elite players. Fill the rest of the roster with $1–$3 upside lottery tickets and waiver fodder.",
    weights: {
      RB: [1.6, 1.4, 0.4, 0.25, 0.15],
      WR: [1.5, 1.3, 0.4, 0.25, 0.15],
      QB: [0.5, 0.2],
      TE: [0.4, 0.15],
      BENCH: [0.05],
    },
    coachGuidance:
      "User is going Stars & Scrubs: ~75% of budget on 3 elite RB/WR, then $1–3 dart throws. APPROVE big bids on top-tier studs. PUSH BACK on mid-tier $15–25 plays — they kill this build. Late-round bench should be $1.",
  },
  {
    id: "hero-rb",
    label: "Hero RB",
    short: "One elite RB, then load up on WRs.",
    description:
      "Buy one elite RB at the top of the draft, then attack WR depth. RB2/RB3 come from value plays and bench upside.",
    weights: {
      RB: [1.7, 0.4, 0.3, 0.25, 0.2],
      WR: [1.3, 1.2, 1.05, 0.6, 0.4],
      QB: [0.9],
      TE: [0.9],
    },
    coachGuidance:
      "User is going Hero RB: ONE elite RB, then load WR. Approve a top-shelf bid for ONE RB stud, then fade RBs hard until cheap upside. Approve aggressive WR spending for a deep WR corps.",
  },
  {
    id: "zero-rb",
    label: "Zero RB",
    short: "Skip early RBs. Stack WRs and TE.",
    description:
      "Spend almost nothing on RB at the top. Build an elite WR corps + an elite TE/QB. Hunt RB upside cheap and on waivers.",
    weights: {
      RB: [0.3, 0.25, 0.2, 0.2, 0.15],
      WR: [1.5, 1.4, 1.2, 0.9, 0.5],
      QB: [1.1],
      TE: [1.2],
    },
    coachGuidance:
      "User is going Zero RB: almost nothing on RB early. PASS on every RB priced above ~10% of budget. APPROVE elite WR and TE spending. Tell them late RBs are dart throws.",
  },
  {
    id: "robust-rb",
    label: "Robust RB",
    short: "Lock down 3 RBs early. WRs come later.",
    description:
      "Spend big on 3 RBs early. Build a fortress at RB and let WR value come to you in the middle of the draft.",
    weights: {
      RB: [1.5, 1.3, 1.2, 0.6, 0.3],
      WR: [1.0, 0.9, 0.7, 0.5, 0.4],
      QB: [0.9],
      TE: [0.9],
    },
    coachGuidance:
      "User is going Robust RB: 3 strong RBs locked in early. APPROVE aggressive RB spending for the first 3 RBs. After that, fade RBs and hunt WR value mid-draft.",
  },
  {
    id: "modified-zero-rb",
    label: "Modified Zero RB",
    short: "One mid-tier RB, then heavy WR.",
    description:
      "Skip the top RB tier but grab one solid RB2-type for stability. Spend the rest on a deep WR group plus a strong TE/QB.",
    weights: {
      RB: [0.7, 0.5, 0.3, 0.25, 0.2],
      WR: [1.4, 1.3, 1.1, 0.8, 0.5],
      QB: [1.0],
      TE: [1.1],
    },
    coachGuidance:
      "User is going Modified Zero RB: one mid-tier RB anchor (~10–15% of budget), then heavy WR + TE. Approve ONE moderate RB buy, then fade RBs. Push WR depth hard.",
  },
];

export const getStrategy = (id: string | undefined | null): Strategy =>
  STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];
