// Auction draft strategy presets for a SUPERFLEX league
// (the FLEX spot is almost always a QB, so 2 starting QBs is the norm).
// Each preset returns weight multipliers applied on top of the baseline
// position weights in suggestedAllocations.
// "none" = no preset; baseline weights are used as-is.

export type StrategyId =
  | "none"
  | "balanced"
  | "stars-and-scrubs"
  | "elite-qbs"
  | "one-qb-anchor"
  | "late-round-qb"
  | "hero-rb"
  | "zero-rb"
  | "robust-rb"
  | "modified-zero-rb"
  | "custom";

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

// NOTE: This is a SUPERFLEX league. QBs are the most valuable position
// because nearly every team starts 2 of them. Baseline QB weights are
// boosted across the board vs. a normal redraft league.

export const STRATEGIES: Strategy[] = [
  {
    id: "none",
    label: "No strategy (default)",
    short: "Spread the budget evenly by position weight.",
    description:
      "No specific build. The tool just splits your budget by standard superflex position value (2 QBs matter a LOT) — works fine if you want to stay flexible and react to value as it comes.",
    weights: {},
    coachGuidance:
      "User has no fixed strategy. This is a SUPERFLEX league — QBs are gold because most teams start 2. Judge bids on raw value and roster gaps. Don't lecture about plans, but never let them get stuck with only 1 QB at a fair price.",
  },
  {
    id: "balanced",
    label: "Balanced (Superflex)",
    short: "2 solid QBs, 2 RBs, 2 WRs, no holes.",
    description:
      "Spend across 2 startable QBs, 2 RBs, and 2 WRs. No one stud, no one bargain — just no weaknesses at any starting spot.",
    weights: {
      QB: [1.4, 1.2, 0.5],
      RB: [1.0, 0.95, 0.85],
      WR: [1.0, 0.95, 0.85],
      TE: [1.0],
    },
    coachGuidance:
      "User is going Balanced in a SUPERFLEX league: 2 startable QBs, 2 strong RBs, 2 strong WRs, mid-tier TE. Don't approve overpays on a single stud at the cost of a weak roster spot. Make sure they lock in TWO real QBs — one-QB rosters lose superflex.",
  },
  {
    id: "stars-and-scrubs",
    label: "Stars & Scrubs",
    short: "3 elite players (incl. a QB), then $1–3 darts.",
    description:
      "Spend ~75% of your budget on 3 elite players — usually one elite QB and two elite RB/WR. Fill the rest of the roster with $1–$3 upside lottery tickets, including a cheap QB2.",
    weights: {
      QB:    [1.6, 0.4, 0.15],
      RB:    [1.7, 0.25, 0.2, 0.15, 0.1],
      WR:    [1.6, 0.25, 0.2, 0.15, 0.1],
      TE:    [0.3, 0.15],
      FLEX:  [0.3],
      BENCH: [0.4, 0.3, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1],
    },
    coachGuidance:
      "User is going Stars & Scrubs in a SUPERFLEX: ~75% on 3 elite pieces (one is usually an elite QB), then $1–3 darts. APPROVE big bids on top-tier QB/RB/WR. Their QB2 should be a cheap upside play, not a mid-tier overpay. PUSH BACK on $15–25 mid-tier plays — they kill this build.",
  },
  {
    id: "elite-qbs",
    label: "Elite QBs (Superflex special)",
    short: "Lock in 2 of the top QBs. Skim value elsewhere.",
    description:
      "The strongest superflex build: pay up for TWO of the top-tier QBs (Allen / Hurts / Mahomes / Jackson tier). Everyone else has to rotate weaker QBs — you don't. Then hunt RB/WR value.",
    weights: {
      QB: [1.8, 1.6, 0.2],
      RB: [1.0, 0.9, 0.7, 0.4, 0.3],
      WR: [1.0, 0.9, 0.8, 0.5, 0.3],
      TE: [0.8],
    },
    coachGuidance:
      "User is going Elite QBs in a SUPERFLEX: pay UP for TWO top-tier QBs. APPROVE aggressive bids on top QBs even if they feel expensive — that's the whole edge. After both QBs are locked, fade QBs entirely and hunt RB/WR value. Warn loudly if they're about to lose a 2nd elite QB while sitting on cash.",
  },
  {
    id: "one-qb-anchor",
    label: "One QB Anchor + value QB2",
    short: "1 elite QB, 1 cheap-ish QB2, spend the rest on skill.",
    description:
      "Buy ONE top-tier QB to anchor your superflex, then grab a startable QB2 in the $5–$15 range. Use the savings on a stronger RB/WR core than the elite-QB drafters.",
    weights: {
      QB: [1.7, 0.7, 0.15],
      RB: [1.2, 1.05, 0.85, 0.4],
      WR: [1.2, 1.1, 0.9, 0.5],
      TE: [0.9],
    },
    coachGuidance:
      "User is going One QB Anchor in a SUPERFLEX: ONE elite QB, then a value QB2 ($5–15 range). APPROVE one big QB bid, then HARD PASS on top-tier QB2 prices. Push the savings into a stronger RB/WR core than typical.",
  },
  {
    id: "late-round-qb",
    label: "Late-Round QBs (risky in superflex)",
    short: "Skip top QBs entirely. Two cheap QBs, load skill.",
    description:
      "Punt the QB position. Grab 2 cheap QBs ($1–$10 each) and pour everything into elite RB/WR. Risky in superflex — but if your QBs hit, your skill core is unmatched.",
    weights: {
      QB: [0.4, 0.3, 0.1],
      RB: [1.4, 1.25, 1.05, 0.5],
      WR: [1.4, 1.25, 1.05, 0.5],
      TE: [1.0],
    },
    coachGuidance:
      "User is going Late-Round QB in a SUPERFLEX (RISKY — most managers won't recommend this). PASS on every QB priced above ~5% of budget. APPROVE elite RB and WR spending. Remind them they NEED two cheap QBs by end of draft — don't end up with one.",
  },
  {
    id: "hero-rb",
    label: "Hero RB (Superflex)",
    short: "1 elite RB + 2 startable QBs, then load WRs.",
    description:
      "Buy one elite RB and make sure you still get TWO startable QBs (it's superflex). Then attack WR depth. RB2/RB3 come from value plays and bench upside.",
    weights: {
      QB:   [1.5, 1.0, 0.2],
      RB:   [1.7, 0.4, 0.3, 0.25, 0.2],
      WR:   [1.2, 1.1, 1.0, 0.55, 0.4],
      TE:   [0.8],
      FLEX: [1.1],  // flex skews WR-heavy in Hero RB
    },
    coachGuidance:
      "User is going Hero RB in a SUPERFLEX: ONE elite RB, TWO startable QBs (non-negotiable), then load WR. Approve ONE top-shelf RB bid, then fade RBs hard until cheap upside. Don't let them end up short a QB just to chase a 2nd RB.",
  },
  {
    id: "zero-rb",
    label: "Zero RB (Superflex)",
    short: "Skip early RBs. Stack QBs, WRs, and TE.",
    description:
      "Spend almost nothing on RB at the top. Build an elite QB room (this is superflex — you need 2), an elite WR corps, and a strong TE. Hunt RB upside cheap and on waivers.",
    weights: {
      QB:    [1.5, 1.3, 0.2],
      RB:    [0.3, 0.25, 0.2, 0.2, 0.15],
      WR:    [1.4, 1.3, 1.15, 0.8, 0.5],
      TE:    [1.1],
      FLEX:  [1.3],  // flex is a 3rd WR
      BENCH: [1.2, 1.0, 0.8, 0.6, 0.4, 0.3, 0.3, 0.3],  // RB lottery tickets on bench
    },
    coachGuidance:
      "User is going Zero RB in a SUPERFLEX: almost nothing on RB early. PASS on every RB priced above ~10% of budget. APPROVE elite QB (need 2!), WR, and TE spending. Tell them late RBs are dart throws — but they MUST come out with 2 real QBs.",
  },
  {
    id: "robust-rb",
    label: "Robust RB (Superflex)",
    short: "3 RBs early, then make sure you still get 2 QBs.",
    description:
      "Spend big on 3 RBs early. Build a fortress at RB — but in superflex you still need to grab 2 startable QBs, even if QB2 is a value play.",
    weights: {
      QB:   [1.3, 0.8, 0.2],
      RB:   [1.5, 1.3, 1.2, 0.6, 0.3],
      WR:   [0.95, 0.85, 0.65, 0.45, 0.4],
      TE:   [0.85],
      FLEX: [1.4],  // flex is the 3rd RB
    },
    coachGuidance:
      "User is going Robust RB in a SUPERFLEX: 3 strong RBs locked in early. APPROVE aggressive RB spending for the first 3 RBs. After that, fade RBs, secure TWO QBs (QB1 strong, QB2 value), and hunt WR value mid-draft.",
  },
  {
    id: "modified-zero-rb",
    label: "Anchor RB (Superflex)",
    short: "One mid-tier RB anchor, 2 QBs, heavy WR.",
    description:
      "Not true Zero RB — you grab ONE mid-tier RB ($10–$20ish) as a safety-net anchor so you're not naked at the position. Skip the top RB tier, lock 2 startable QBs (it's superflex), then spend the rest on a deep WR group plus a strong TE.",
    weights: {
      QB:   [1.5, 1.1, 0.2],
      RB:   [0.7, 0.5, 0.3, 0.25, 0.2],
      WR:   [1.3, 1.2, 1.05, 0.75, 0.5],
      TE:   [1.0],
      FLEX: [1.2],  // flex skews WR
    },
    coachGuidance:
      "User is going Anchor RB in a SUPERFLEX (a softer Zero RB — one mid-tier RB anchor, not pure zero): one RB anchor (~10–15% of budget), TWO startable QBs, then heavy WR + TE. Approve ONE moderate RB buy, then fade RBs. Push WR depth hard but never at the cost of QB2.",
  },
  {
    id: "custom",
    label: "Custom (your own rules)",
    short: "Write your own plan. The app follows it.",
    description:
      "Type your own draft rules in plain English (e.g. 'Spend $80 on 2 elite WRs, never pay over $5 for a QB, target a TE in the $8-12 range'). The AI coach uses your text as its guidance.",
    weights: {},
    coachGuidance:
      "User has written their own custom strategy. Follow their rules exactly as written — do not override them with conventional wisdom. If their rules conflict with sound roster construction (e.g. ending up with no QB in superflex), gently flag it but defer to their stated plan.",
  },
];

export const getStrategy = (id: string | undefined | null): Strategy =>
  STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0];

// Build the actual coach guidance for a given strategy id, optionally merging
// user-supplied custom rules text (used when id === "custom").
export const buildCoachGuidance = (
  id: string | undefined | null,
  customRules?: string | null,
): string => {
  const s = getStrategy(id);
  if (s.id === "custom") {
    const rules = (customRules ?? "").trim();
    if (!rules) return s.coachGuidance + " (User has not written any rules yet — ask them to fill in their custom plan.)";
    return `${s.coachGuidance}\n\nUSER'S CUSTOM RULES (follow these):\n${rules}`;
  }
  return s.coachGuidance;
};
