// Auction-draft budget allocation strategies.
//
// Weight tables are lifted from industry sources:
//   - Footballguys / Jeff Pasquino "Auction Strategy Part 5" (Stars/Scrubs + Balanced)
//   - FantasyPros 2025 "Ultimate Guide to Auction Drafts" (WR-Heavy / PPR)
//
// Each strategy maps (group, slotIndex) → relative weight. Weights are
// normalized to fill the available pool after fixed costs (K/DST/BENCH = $1)
// and locked slots are subtracted. Math always reconciles so sum === budget.
import { buildPlannerSlots, type PlannerSlot, type SlotGroup } from "./planner-slots";
import type { LeagueSettings } from "./draft-types";

export type StrategyId = "hero-qb" | "balanced-qbs" | "bargain-qb";

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  "hero-qb": "Hero QBs",
  "balanced-qbs": "Balanced QBs",
  "bargain-qb": "Bargain QB",
};

type WeightTable = Partial<Record<SlotGroup, number[]>>;

// Industry-canonical SF auction archetypes. Sources cross-referenced:
//   - The Fantasy Footballers (Wenrich, Aug 2024) — names the 3 SF auction
//     strategies: Hero QB ($45-55 on QB1 + cheap QB2), Balanced Spending
//     (two QB8-15 in $25-30 range), Bargain Basement (punt QBs, stars at
//     RB/WR, roster 3-4 cheap QBs).
//     https://www.thefantasyfootballers.com/analysis/superflex-auction-draft-roster-construction-strategies-fantasy-football/
//   - Football Absurdity (Hoovler, Aug 2024) — "top QBs should go $50+" in
//     SF; winning mock spent $80 on two elite WRs + $7 backup QB and sniped
//     the rest.
//   - Razzball B_Don 2024 SF Auction Values, Draft Sharks SF auction values
//     (price tiers cross-checked).
const STRATEGIES: Record<StrategyId, WeightTable> = {
  // Two elite QBs — QB1 + SF both get star money, QB3 is a dart throw.
  "hero-qb": {
    QB:        [42, 3],
    RB:        [22, 12, 3, 1, 1, 1],
    WR:        [20, 12, 3, 1, 1, 1],
    TE:        [5, 1],
    FLEX:      [4],
    SUPERFLEX: [35],
  },
  // FFers "Balanced Spending": two QB8-15 starters in the $22-28 band,
  // leaves real money for an RB1/WR1 anchor.
  "balanced-qbs": {
    QB:        [28, 22],
    RB:        [28, 16, 4, 1, 1, 1],
    WR:        [24, 14, 4, 1, 1, 1],
    TE:        [6, 2],
    FLEX:      [4],
    SUPERFLEX: [22],
  },
  // FFers "Bargain Basement": punt the QB position ($5-10 + $1-3 dart),
  // load up RB1/WR1 like Football Absurdity's winning $80 stars mock.
  "bargain-qb": {
    QB:        [8, 3],
    RB:        [48, 22, 6, 2, 1, 1],
    WR:        [38, 18, 6, 2, 1, 1],
    TE:        [6, 1],
    FLEX:      [4],
    SUPERFLEX: [3],
  },
};

// Slots that always cost exactly $1 (research-tool memory rule).
function isFixedDollarSlot(group: SlotGroup): boolean {
  return group === "K" || group === "DST" || group === "BENCH";
}

function weightFor(strategy: StrategyId, slot: PlannerSlot): number {
  const table = STRATEGIES[strategy] ?? STRATEGIES["balanced-qbs"];
  const row = table[slot.group];
  if (!row || row.length === 0) return 1;
  const idxStr = slot.id.split("-").pop() ?? "1";
  const idx = Math.max(1, parseInt(idxStr, 10) || 1);
  return row[Math.min(idx, row.length) - 1] ?? row[row.length - 1];
}

export interface ComputeOptions {
  /** Slots the user has manually edited — never overwrite these. */
  touchedSlots?: Record<string, boolean>;
  /** Slots locked at a specific value — subtract from pool, keep value. */
  lockedSlots?: Record<string, boolean>;
  /** Current allocations (used for locked/touched values). */
  currentAllocations?: Record<string, number>;
}

/**
 * Compute the suggested $ value for every roster slot.
 *
 * Algorithm:
 *   1. Reserve $1 for every K, DST, and BENCH slot.
 *   2. Subtract locked + touched slot values from the remaining pool.
 *   3. Distribute the rest across unlocked starter slots by strategy weight.
 *   4. Round + reconcile so the total exactly equals totalBudget.
 */
export function computeSlotDollars(
  strategy: StrategyId,
  settings: LeagueSettings,
  opts: ComputeOptions = {},
): Record<string, number> {
  const { touchedSlots = {}, lockedSlots = {}, currentAllocations = {} } = opts;
  const slots = buildPlannerSlots(settings);
  const out: Record<string, number> = {};

  const valueOf = (id: string, fallback: number) =>
    Number.isFinite(currentAllocations[id]) ? currentAllocations[id] : fallback;

  // Pass 1 — fix K/DST/BENCH at $1, honor locks + touched values.
  let reserved = 0;
  const open: PlannerSlot[] = [];
  for (const slot of slots) {
    if (isFixedDollarSlot(slot.group)) {
      // BENCH may be manually edited (e.g. to $2) — respect touched value.
      const v =
        slot.group === "BENCH" && touchedSlots[slot.id]
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

  // Pass 2 — distribute pool across open slots by strategy weight.
  const weights = open.map((s) => weightFor(strategy, s));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  if (open.length === 0 || totalWeight === 0 || pool === 0) {
    for (const s of open) out[s.id] = pool > 0 && open.length > 0 ? Math.floor(pool / open.length) : 0;
    return reconcile(out, settings.totalBudget, slots, lockedSlots, touchedSlots);
  }

  let assigned = 0;
  open.forEach((s, i) => {
    const raw = (weights[i] / totalWeight) * pool;
    const v = Math.max(1, Math.floor(raw));
    out[s.id] = v;
    assigned += v;
  });

  // Pass 3 — reconcile remainder onto highest-weight unlocked slots.
  let remainder = pool - assigned;
  const order = open
    .map((s, i) => ({ id: s.id, w: weights[i] }))
    .sort((a, b) => b.w - a.w);
  let i = 0;
  while (remainder > 0 && order.length > 0) {
    out[order[i % order.length].id] += 1;
    remainder -= 1;
    i += 1;
  }
  while (remainder < 0 && order.length > 0) {
    // Pull $1 off the lowest-weight slot (but never below $1).
    const tail = order[order.length - 1 - (i % order.length)];
    if (out[tail.id] > 1) {
      out[tail.id] -= 1;
      remainder += 1;
    }
    i += 1;
    if (i > 1000) break; // safety
  }

  return out;
}

// Final sanity: enforce sum === totalBudget exactly, push leftover onto RB1/WR1.
function reconcile(
  out: Record<string, number>,
  totalBudget: number,
  slots: PlannerSlot[],
  lockedSlots: Record<string, boolean>,
  touchedSlots: Record<string, boolean>,
): Record<string, number> {
  const sum = Object.values(out).reduce((a, b) => a + b, 0);
  let diff = totalBudget - sum;
  if (diff === 0) return out;
  const adjustable = slots.filter(
    (s) =>
      !lockedSlots[s.id] &&
      !touchedSlots[s.id] &&
      !isFixedDollarSlot(s.group),
  );
  if (adjustable.length === 0) return out;
  // Land remainder on RB1 → WR1 → first available.
  const pref =
    adjustable.find((s) => s.id === "RB-1") ??
    adjustable.find((s) => s.id === "WR-1") ??
    adjustable[0];
  out[pref.id] = Math.max(1, out[pref.id] + diff);
  return out;
}

/**
 * Proportional rebalance: when the user has manually edited (touched) any
 * slot, redistribute the remaining pool across untouched/unlocked starter
 * slots in proportion to their **current** dollar values (not strategy
 * weights). This keeps the shape the user has been steering toward — bumping
 * WR1 pulls a little from every other slot, including WR3 / TE / RB, instead
 * of dumping all the change onto a couple of high-weight starters.
 *
 * Falls back to strategy weights only when every open slot is at $0.
 */
export function rebalanceProportional(
  strategy: StrategyId,
  settings: LeagueSettings,
  opts: ComputeOptions = {},
): Record<string, number> {
  const { touchedSlots = {}, lockedSlots = {}, currentAllocations = {} } = opts;
  const slots = buildPlannerSlots(settings);
  const out: Record<string, number> = {};

  let reserved = 0;
  const open: PlannerSlot[] = [];
  for (const slot of slots) {
    if (isFixedDollarSlot(slot.group)) {
      const v =
        slot.group === "BENCH" && touchedSlots[slot.id]
          ? Math.max(1, Number.isFinite(currentAllocations[slot.id]) ? currentAllocations[slot.id] : 1)
          : 1;
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    if (lockedSlots[slot.id] || touchedSlots[slot.id]) {
      const v = Math.max(0, Number.isFinite(currentAllocations[slot.id]) ? currentAllocations[slot.id] : 0);
      out[slot.id] = v;
      reserved += v;
      continue;
    }
    open.push(slot);
  }

  const pool = Math.max(0, settings.totalBudget - reserved);

  if (open.length === 0) return out;
  if (pool === 0) {
    for (const s of open) out[s.id] = 0;
    return out;
  }

  // Base distribution = current $ on each open slot. If all zero, fall back
  // to the strategy weight table.
  let base = open.map((s) =>
    Math.max(0, Number.isFinite(currentAllocations[s.id]) ? currentAllocations[s.id] : 0),
  );
  let total = base.reduce((a, b) => a + b, 0);
  if (total === 0) {
    base = open.map((s) => weightFor(strategy, s));
    total = base.reduce((a, b) => a + b, 0) || 1;
  }

  // Scale each open slot, never below $1.
  const raws = base.map((b) => Math.max(1, (b / total) * pool));
  const floors = raws.map((r) => Math.max(1, Math.floor(r)));
  let assigned = floors.reduce((a, b) => a + b, 0);
  let remainder = pool - assigned;

  // Hamilton's largest-remainder for positive leftover.
  if (remainder > 0) {
    const order = raws
      .map((r, i) => ({ i, f: r - Math.floor(r) }))
      .sort((a, b) => b.f - a.f);
    let k = 0;
    while (remainder > 0 && order.length > 0) {
      floors[order[k % order.length].i] += 1;
      remainder -= 1;
      k += 1;
    }
  }
  // If raws were < $1 and got bumped up to $1, peel back from the largest.
  let safety = 0;
  while (remainder < 0 && safety++ < 1000) {
    let maxI = 0;
    for (let i = 1; i < floors.length; i++) if (floors[i] > floors[maxI]) maxI = i;
    if (floors[maxI] <= 1) break;
    floors[maxI] -= 1;
    remainder += 1;
  }

  open.forEach((s, i) => (out[s.id] = floors[i]));
  return out;
}

/**
 * Industry-standard max bid: most you can pay for one player and still
 * afford $1 for every other open slot. (Yahoo, ESPN, Sleeper all use this.)
 */
export function maxBid(remaining: number, openSlots: number): number {
  if (openSlots <= 0) return Math.max(0, remaining);
  return Math.max(0, remaining - (openSlots - 1));
}
