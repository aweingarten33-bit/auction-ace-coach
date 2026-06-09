---
name: Planner uses research-backed strategy presets
description: Budget planner auto-fills $ values from 3 industry strategy tables (Stars/Scrubs, Balanced, WR-Heavy). Manual edits + locks always win.
type: constraint
---
The budget planner ships with 3 strategy presets computed from industry sources (Footballguys Pasquino tables, FantasyPros 2025 WR-heavy):

- **Stars & Scrubs** — RB1/WR1 heavy, top-2 spend ~55%
- **Balanced** — even spread across starters
- **WR-Heavy** — PPR optimized, WR1=$60 in $200/12tm

Auto-fill behavior:
- On mount and on (strategy/budget/roster/lock) change, every untouched + unlocked slot is recomputed.
- User edits mark a slot "touched" → never overwritten until reset.
- Locks freeze a slot's value and subtract from the distribution pool.
- K, DST always $1 (locked, not editable). BENCH defaults $1.
- Math reconciles so sum exactly equals totalBudget.

Also exposes industry-standard **Max Bid** chip: `(totalBudget − locked) − (openSlots − 1)`.

Do NOT:
- Re-add bid/nominate UI
- Add live AI gateway calls in the planner
- Add per-pick suggestions or live auction tracking
