// Market-aware auction budget strategies for this league.
//
// The old planner used static relative weights (42 points to QB1, 22 to RB1,
// etc.). That meant the preset could drift away from the actual 2026 player
// market. These strategies instead target QB RANK BANDS, read the current
// Expected Prices, then build the rest of the roster around the dollars left.

import { buildPlannerSlots, type PlannerSlot, type SlotGroup } from "./planner-slots";
import type { LeagueSettings, Position, PriceEstimate } from "./draft-types";

export type StrategyId =
  | "double-elite-qb"
  | "hero-qb"
  | "elite-balanced-qb"
  | "balanced-qbs"
  | "value-qb"
  | "bargain-qb"
  | "punt-qb"
  | "manual";

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  "double-elite-qb": "Double Elite",
  "hero-qb": "Hero QB",
  "elite-balanced-qb": "Elite + Balanced",
  "balanced-qbs": "Balanced",
  "value-qb": "Value QB",
  "bargain-qb": "Bargain QB",
  "punt-qb": "QB Punt",
  "manual": "Manual",
};

interface RankRange { min: number; max: number }
interface StrategyProfile {
  qb1: RankRange;
  qb2: RankRange;
  description: string;
}

const PROFILES: Record<Exclude<StrategyId, "manual">, StrategyProfile> = {
  "double-elite-qb": {
    qb1: { min: 1, max: 5 },
    qb2: { min: 4, max: 8 },
    description: "Two premium QBs; intentionally stars-and-scrubs elsewhere.",
  },
  "hero-qb": {
    qb1: { min: 1, max: 4 },
    qb2: { min: 15, max: 20 },
    description: "One elite QB plus a cheaper but viable QB2.",
  },
  "elite-balanced-qb": {
    qb1: { min: 3, max: 7 },
    qb2: { min: 9, max: 14 },
    description: "Premium QB1 without paying QB1 overall, then a strong QB2.",
  },
  "balanced-qbs": {
    qb1: { min: 7, max: 12 },
    qb2: { min: 12, max: 18 },
    description: "Two dependable starters while avoiding the very top QB tax.",
  },
  "value-qb": {
    qb1: { min: 11, max: 16 },
    qb2: { min: 17, max: 22 },
    description: "Accept lower QB ceiling to push more money toward RB/WR.",
  },
  "bargain-qb": {
    qb1: { min: 15, max: 20 },
    qb2: { min: 20, max: 26 },
    description: "Cheap QB room with aggressive skill-position spending.",
  },
  "punt-qb": {
    qb1: { min: 20, max: 25 },
    qb2: { min: 24, max: 32 },
    description: "High-risk Superflex build; only use when the room badly overprices QBs.",
  },
};

// Fallback league curve if prices have not loaded yet. This mirrors the shape
// of the Expected Price engine, not public-site auction dollars.
const QB_FALLBACK = [69, 60, 57, 51, 48, 45, 41, 38, 35, 33, 30, 28, 25, 23, 21, 19, 17, 15, 13, 12, 10, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2];

const SKILL_TARGET_RANK: Partial<Record<SlotGroup, number[]>> = {
  RB: [6, 18, 32, 45],
  WR: [7, 18, 31, 45],
  TE: [6, 15],
  FLEX: [28, 42],
};

function isFixedDollarSlot(group: SlotGroup): boolean {
  return group === "K" || group === "DST" || group === "BENCH";
}

function sortedAtPosition(prices: PriceEstimate[] | undefined, position: Position): PriceEstimate[] {
  return (prices ?? [])
    .filter((p) => p.position === position && Number(p.price) > 0)
    .sort((a, b) => Number(b.price) - Number(a.price));
}

function priceAtRank(prices: PriceEstimate[] | undefined, position: Position, rank: number): number {
  const list = sortedAtPosition(prices, position);
  const hit = list[Math.max(1, rank) - 1];
  if (hit) return Math.max(1, Math.round(Number(hit.price)));
  if (position === "QB") return QB_FALLBACK[Math.min(QB_FALLBACK.length, Math.max(1, rank)) - 1] ?? 1;
  return 1;
}

function rangeMedianPrice(prices: PriceEstimate[] | undefined, position: Position, range: RankRange): number {
  const values: number[] = [];
  for (let rank = range.min; rank <= range.max; rank += 1) values.push(priceAtRank(prices, position, rank));
  values.sort((a, b) => a - b);
  if (!values.length) return 1;
  return values[Math.floor(values.length / 2)];
}

function rangeLowHigh(prices: PriceEstimate[] | undefined, position: Position, range: RankRange): [number, number] {
  const high = priceAtRank(prices, position, range.min);
  const low = priceAtRank(prices, position, range.max);
  return [Math.min(low, high), Math.max(low, high)];
}

export interface StrategySummary {
  id: StrategyId;
  label: string;
  qbTargets: string;
  qbSpendLow: number | null;
  qbSpendHigh: number | null;
  description: string;
}

export function getStrategySummary(strategy: StrategyId, prices?: PriceEstimate[]): StrategySummary {
  if (strategy === "manual") {
    return {
      id: strategy,
      label: STRATEGY_LABELS[strategy],
      qbTargets: "Your targets",
      qbSpendLow: null,
      qbSpendHigh: null,
      description: "Build the plan yourself; actual drafted prices still trigger automatic recalibration.",
    };
  }
  const profile = PROFILES[strategy];
  const [qb1Low, qb1High] = rangeLowHigh(prices, "QB", profile.qb1);
  const [qb2Low, qb2High] = rangeLowHigh(prices, "QB", profile.qb2);
  return {
    id: strategy,
    label: STRATEGY_LABELS[strategy],
    qbTargets: `QB${profile.qb1.min}–${profile.qb1.max} + QB${profile.qb2.min}–${profile.qb2.max}`,
    qbSpendLow: qb1Low + qb2Low,
    qbSpendHigh: qb1High + qb2High,
    description: profile.description,
  };
}

export interface ComputeOptions {
  touchedSlots?: Record<string, boolean>;
  lockedSlots?: Record<string, boolean>;
  currentAllocations?: Record<string, number>;
  prices?: PriceEstimate[];
}

function skillMarketWeight(slot: PlannerSlot, prices?: PriceEstimate[]): number {
  if (slot.group === "FLEX") {
    const idx = Math.max(0, (parseInt(slot.id.split("-").pop() ?? "1", 10) || 1) - 1);
    const rank = SKILL_TARGET_RANK.FLEX?.[idx] ?? 40;
    const rb = priceAtRank(prices, "RB", rank);
    const wr = priceAtRank(prices, "WR", rank);
    const te = priceAtRank(prices, "TE", Math.max(1, Math.round(rank / 3)));
    return Math.max(1, Math.max(rb, wr, te));
  }
  if (slot.group === "RB" || slot.group === "WR" || slot.group === "TE") {
    const idx = Math.max(0, (parseInt(slot.id.split("-").pop() ?? "1", 10) || 1) - 1);
    const targets = SKILL_TARGET_RANK[slot.group] ?? [];
    const rank = targets[Math.min(idx, Math.max(0, targets.length - 1))] ?? (idx + 1) * 12;
    return Math.max(1, priceAtRank(prices, slot.group, rank));
  }
  return 1;
}

function reconcile(
  out: Record<string, number>,
  totalBudget: number,
  slots: PlannerSlot[],
  lockedSlots: Record<string, boolean>,
  touchedSlots: Record<string, boolean>,
): Record<string, number> {
  let diff = totalBudget - Object.values(out).reduce((a, b) => a + b, 0);
  if (diff === 0) return out;
  const adjustable = slots.filter(
    (s) => !lockedSlots[s.id] && !touchedSlots[s.id] && !isFixedDollarSlot(s.group),
  );
  if (!adjustable.length) return out;

  let guard = 0;
  let i = 0;
  while (diff !== 0 && guard++ < 5000) {
    const slot = adjustable[i % adjustable.length];
    if (diff > 0) {
      out[slot.id] = (out[slot.id] ?? 1) + 1;
      diff -= 1;
    } else if ((out[slot.id] ?? 1) > 1) {
      out[slot.id] -= 1;
      diff += 1;
    }
    i += 1;
    if (i > adjustable.length * 50 && diff < 0 && adjustable.every((s) => (out[s.id] ?? 1) <= 1)) break;
  }
  return out;
}

/** Build the current strategy plan from Expected Prices and actual locked spend. */
export function computeSlotDollars(
  strategy: StrategyId,
  settings: LeagueSettings,
  opts: ComputeOptions = {},
): Record<string, number> {
  const { touchedSlots = {}, lockedSlots = {}, currentAllocations = {}, prices } = opts;
  const slots = buildPlannerSlots(settings);
  const out: Record<string, number> = {};
  const valueOf = (id: string, fallback: number) => Number.isFinite(currentAllocations[id]) ? currentAllocations[id] : fallback;

  let reserved = 0;
  const open: PlannerSlot[] = [];
  for (const slot of slots) {
    if (isFixedDollarSlot(slot.group)) {
      const v = slot.group === "BENCH" && touchedSlots[slot.id]
        ? Math.max(1, valueOf(slot.id, 1))
        : 1;
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    if (lockedSlots[slot.id] || touchedSlots[slot.id]) {
      const v = Math.max(0, valueOf(slot.id, 0));
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    open.push(slot);
  }

  let pool = Math.max(0, settings.totalBudget - reserved);
  if (!open.length) return out;

  // Manual is never auto-filled; this fallback is only for callers that need a
  // complete safe map (manual UI itself does not call this to auto-plan).
  const effective = strategy === "manual" ? "balanced-qbs" : strategy;
  const profile = PROFILES[effective];

  // Set the first QB and first Superflex to the median Expected Price of the
  // strategy's target tiers. If a league uses 2 QB slots instead, QB-2 acts as QB2.
  const qb1Slot = open.find((s) => s.group === "QB");
  const qb2Slot = open.find((s) => s.group === "SUPERFLEX") ?? open.filter((s) => s.group === "QB")[1];
  const qbTargets: Array<{ slot: PlannerSlot | undefined; dollars: number }> = [
    { slot: qb1Slot, dollars: rangeMedianPrice(prices, "QB", profile.qb1) },
    { slot: qb2Slot, dollars: rangeMedianPrice(prices, "QB", profile.qb2) },
  ];

  for (const target of qbTargets) {
    if (!target.slot || !open.some((s) => s.id === target.slot!.id)) continue;
    const remainingOpenAfterThis = Math.max(0, open.length - 1);
    const safe = Math.max(1, Math.min(target.dollars, pool - remainingOpenAfterThis));
    out[target.slot.id] = safe;
    pool -= safe;
  }

  const remainingOpen = open.filter((s) => !(s.id in out));
  if (!remainingOpen.length) return reconcile(out, settings.totalBudget, slots, lockedSlots, touchedSlots);

  // Build skill-position weights from actual Expected Prices at representative
  // roster ranks. Thus when the 2026 market moves, the preset moves with it.
  const weights = remainingOpen.map((s) => {
    if (s.group === "QB" || s.group === "SUPERFLEX") return Math.max(1, priceAtRank(prices, "QB", 28));
    return skillMarketWeight(s, prices);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0) || remainingOpen.length;

  const raws = remainingOpen.map((_, i) => Math.max(1, (weights[i] / totalWeight) * pool));
  const values = raws.map((r) => Math.max(1, Math.floor(r)));
  let assigned = values.reduce((a, b) => a + b, 0);
  let remainder = pool - assigned;

  const order = raws
    .map((r, i) => ({ i, frac: r - Math.floor(r), weight: weights[i] }))
    .sort((a, b) => b.frac - a.frac || b.weight - a.weight);
  let cursor = 0;
  while (remainder > 0 && order.length) {
    values[order[cursor % order.length].i] += 1;
    remainder -= 1;
    cursor += 1;
  }
  cursor = 0;
  while (remainder < 0 && order.length && cursor < 5000) {
    const idx = order[order.length - 1 - (cursor % order.length)].i;
    if (values[idx] > 1) {
      values[idx] -= 1;
      remainder += 1;
    }
    cursor += 1;
  }

  remainingOpen.forEach((slot, i) => { out[slot.id] = values[i]; });
  return reconcile(out, settings.totalBudget, slots, lockedSlots, touchedSlots);
}

/**
 * Rebalance around actual drafted/locked spend while preserving the shape of
 * the current plan. This is used after every real purchase and is also what
 * makes Manual mode safe during the draft.
 */
export function rebalanceProportional(
  strategy: StrategyId,
  settings: LeagueSettings,
  opts: ComputeOptions = {},
): Record<string, number> {
  const { touchedSlots = {}, lockedSlots = {}, currentAllocations = {}, prices } = opts;
  const slots = buildPlannerSlots(settings);
  const out: Record<string, number> = {};
  let reserved = 0;
  const open: PlannerSlot[] = [];

  for (const slot of slots) {
    if (isFixedDollarSlot(slot.group)) {
      const v = slot.group === "BENCH" && touchedSlots[slot.id]
        ? Math.max(1, Number.isFinite(currentAllocations[slot.id]) ? currentAllocations[slot.id] : 1)
        : 1;
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    if (lockedSlots[slot.id]) {
      const v = Math.max(0, Number.isFinite(currentAllocations[slot.id]) ? currentAllocations[slot.id] : 0);
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    open.push(slot);
  }

  const pool = Math.max(0, settings.totalBudget - reserved);
  if (!open.length) return out;
  if (pool === 0) {
    for (const slot of open) out[slot.id] = 0;
    return out;
  }

  let base = open.map((s) => Math.max(0, Number.isFinite(currentAllocations[s.id]) ? currentAllocations[s.id] : 0));
  let total = base.reduce((a, b) => a + b, 0);

  // If there is no useful current shape yet, seed from the market-aware preset.
  if (total === 0) {
    const seeded = computeSlotDollars(strategy, settings, { lockedSlots, currentAllocations, prices });
    base = open.map((s) => Math.max(1, seeded[s.id] ?? 1));
    total = base.reduce((a, b) => a + b, 0) || 1;
  }

  const raws = base.map((b) => Math.max(1, (b / total) * pool));
  const values = raws.map((r) => Math.max(1, Math.floor(r)));
  let remainder = pool - values.reduce((a, b) => a + b, 0);

  const order = raws.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  let k = 0;
  while (remainder > 0 && order.length) {
    values[order[k % order.length].i] += 1;
    remainder -= 1;
    k += 1;
  }
  k = 0;
  while (remainder < 0 && order.length && k < 5000) {
    let maxI = 0;
    for (let i = 1; i < values.length; i += 1) if (values[i] > values[maxI]) maxI = i;
    if (values[maxI] <= 1) break;
    values[maxI] -= 1;
    remainder += 1;
    k += 1;
  }

  open.forEach((s, i) => { out[s.id] = values[i]; });
  return out;
}

export function maxBid(remaining: number, openSlots: number): number {
  if (openSlots <= 0) return Math.max(0, remaining);
  return Math.max(0, remaining - (openSlots - 1));
}
