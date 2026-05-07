## Why names don't appear when you type

The search box on `/draft-room` only filters your **price sheet** (`prices` array in the draft store). If your price sheet is empty or sparse, nothing shows up — even though Sleeper's full NFL player database is loaded and used everywhere else (Setup, Planner, Price Sheet Editor).

## Fix

Update `src/pages/DraftRoom.tsx` so the search dropdown:

1. Loads the full Sleeper player list (`loadSleeperPlayers()`), same source `PlayerAutocomplete` uses elsewhere.
2. Searches the Sleeper list — every NFL player will autocomplete.
3. For each result, looks up the price from `prices` if one exists; otherwise just shows the player + position + team (no price).
4. Excludes players already drafted (current behavior preserved).
5. Clicking a result still fires `lockToPlayer(name)` → DecisionCard renders.

No changes to engines, ESPN sync, store, prices, or any other tool. Just swaps the data source for the lookup dropdown.

## Optional quality-of-life

While I'm in there, also add the same `PlayerAutocomplete`-style keyboard nav (↑/↓/Enter) so you can pick the top result with Enter without taking your hand off the keyboard during a live nomination.

## What I won't touch

- DraftRoom layout, drawer, hamburger menu
- Setup wizard, Planner, Price Sheet Editor (already work)
- ESPN sync, auth, decision engine, value math
- The other "removed tools" — once search works you can tell me which specific tool to bring back next and I'll port it in one at a time.
