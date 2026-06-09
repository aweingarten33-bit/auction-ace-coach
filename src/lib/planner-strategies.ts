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

export type StrategyId = "elite-qb" | "balanced-sf" | "hero-rb-sf";

export const STRATEGY_LABELS: Record<StrategyId, string> = {
  "elite-qb": "Elite QB",
  "balanced-sf": "Balanced SF",
  "hero-rb-sf": "Hero RB",
};

type WeightTable = Partial<Record<SlotGroup, number[]>>;

// All weights tuned for Superflex / 2QB leagues. Sources:
//   - r/fantasyfootball Superflex auction threads (2024-2025 AAV pulls)
//   - FantasyPros 2025 Superflex auction values
//   - Establish The Run Superflex auction guide
//   - Footballguys Pasquino SF column
const STRATEGIES: Record<StrategyId, WeightTable> = {
  // Pay up for both QBs — QB1 $42, QB2/SF $28, rest scaled down.
  "elite-qb": {
    QB:        [42, 28],
    RB:        [28, 15, 4, 1, 1, 1],
    WR:        [24, 14, 4, 1, 1, 1],
    TE:        [6, 1],
    FLEX:      [3],
    SUPERFLEX: [28],
  },
  // Spread spend across QBs + skill positions. QB1 $32, QB2 $20, RB1 $30.
  "balanced-sf": {
    QB:        [32, 20],
    RB:        [30, 18, 6, 2, 1, 1],
    WR:        [25, 15, 5, 2, 1, 1],
    TE:        [7, 2],
    FLEX:      [6],
    SUPERFLEX: [20],
  },
  // Anchor one elite RB, pay for QBs, fade WR/RB depth.
  "hero-rb-sf": {
    QB:        [34, 22],
    RB:        [48, 8, 2, 1, 1, 1],
    WR:        [22, 12, 4, 2, 1, 1],
    TE:        [5, 1],
    FLEX:      [4],
    SUPERFLEX: [22],
  },
};

// Slots that always cost exactly $1 (research-tool memory rule).
function isFixedDollarSlot(group: SlotGroup): boolean {
  return group === "K" || group === "DST" || group === "BENCH";
}

function weightFor(strategy: StrategyId, slot: PlannerSlot): number {
  const row = STRATEGIES[strategy][slot.group];
  if (!row || row.length === 0) return 1;
  // slot.id is e.g. "RB-1"; pull the index off the end
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
 * Industry-standard max bid: most you can pay for one player and still
 * afford $1 for every other open slot. (Yahoo, ESPN, Sleeper all use this.)
 */
export function maxBid(remaining: number, openSlots: number): number {
  if (openSlots <= 0) return Math.max(0, remaining);
  return Math.max(0, remaining - (openSlots - 1));
}
