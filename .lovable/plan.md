Researched ESPN, Yahoo, Sleeper, FantasyPros, Footballguys, Draft Sharks, FantasyLife. The industry has converged on hard numbers — here's what we steal.

## What you'll see in the planner

Three things change. Everything else stays.

### 1. Auto-filled $ values on load (the "sorcery")

Every slot opens with a real dollar value, not zero. Computed from a Footballguys/FantasyPros-grade allocation table for your exact roster shape and budget.

```text
Strategy:  ⦿ Stars & Scrubs   ○ Balanced   ○ WR-Heavy

QB1   [ targets… ]   $ 15   🔓
RB1   [ targets… ]   $ 58   🔓
RB2   [ targets… ]   $ 20   🔓
RB3   [ targets… ]   $  4   🔓
WR1   [ targets… ]   $ 48   🔓
WR2   [ targets… ]   $ 18   🔓
WR3   [ targets… ]   $  7   🔓
TE1   [ targets… ]   $  9   🔓
FLEX  [ targets… ]   $  3   🔓
K     —              $  1   🔒
DST   —              $  1   🔒
BE1   —              $  1   🔓
…
─────────────────────────────────
Planned $200 / $200      Max bid $185
```

Tap any $ to edit. Lock a slot — auto-fill leaves it alone and rebalances the rest. **Total always equals budget, math reconciled to the dollar.**

### 2. Strategy pills at the top

Three presets straight from Footballguys' Pasquino tables (real numbers, not guesses):

- **Stars & Scrubs** — RB1 $58, WR1 $48, top-2 spend ≈ 55%
- **Balanced** — RB1 $45, WR1 $30, spread evenly
- **WR-Heavy (PPR)** — WR1 $60, WR2 $30, RB1 $26 (FantasyPros 2025)

Tap a pill → all unlocked slots refill. Locks survive.

### 3. A live "Max Bid" chip in the totals row

The industry-standard formula every platform enforces:

```text
Max Bid = (Total Budget − Spent) − (Open Slots − 1)
```

So you instantly know the most you could throw at any one player without going broke. Updates as you lock/edit.

## How the math works

Pure functions. No API calls. No AI gateway. Instant.

1. **Reserve fixed costs**: $1 × K + $1 × DST + $1 × BENCH count.
2. **Starter pool** = `totalBudget − fixed − sum(locked slots)`.
3. **Distribute by strategy table** — each strategy is a lookup table mapping `(position, slotIndex) → weight`. Footballguys' 18-slot table is the canonical source; we normalize it to your roster size and budget.
4. **Round + reconcile** — fractional dollars rounded, ±$1 remainder lands on the highest-weight unlocked slot so sum is exact.
5. **Re-run** whenever budget, roster, locks, or strategy changes.

## Files

- `src/lib/planner-strategies.ts` *(new)* — three weight tables (Stars/Scrubs, Balanced, WR-Heavy) lifted from the Footballguys + FantasyPros data, plus `computeSlotDollars(strategy, settings, locks)`.
- `src/lib/planner-suggest.test.ts` *(new)* — verifies sum equals budget for all 3 strategies × common league shapes, locks honored, K/DST/BE always $1.
- `src/components/PositionBudgetBar.tsx` — render strategy pills above the list, auto-fill on mount, add Max Bid chip to the footer row, "Reset" button. Slot rendering unchanged.
- `src/lib/draft-store.ts` — add `plannerStrategy: "stars" | "balanced" | "wr-heavy"` (default `"stars"`) and `touchedSlots` flag so manual edits aren't overwritten by re-runs.

## What does NOT change

- No bidding, no nominating, no live auction logic.
- No new API call or AI gateway.
- K/DST/BENCH rules from memory still enforced.
- Layout, colors, lock button, target-name input — all unchanged.

## Memory update

Rewrite the constraint: planner now ships with **3 research-backed presets** (Stars/Scrubs, Balanced, WR-Heavy) computed from Footballguys + FantasyPros tables. Manual edits and locks always win. No live AI, no per-pick suggestions, no bid/nominate UI.
