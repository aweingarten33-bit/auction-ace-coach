# Strip Bidding → Pure Research Tool

## What gets deleted

**Components (gone entirely):**
- `NominationCard` — "who to nominate next"
- `LiveBidStrip` — live bid quick-entry bar
- `MoneyHero` — your $200 budget tracker
- `DecisionCard` / `PlayerDecisionOverlay` — "bid or pass at $X" engine
- `CounterAnchorDetector` — anti-price-fixing logic
- `FlowPlanner` — auction flow timing
- `AffordabilityChecker` (if present)
- "Mark as drafted" / quick-bid buttons throughout

**Edge functions (gone):**
- `nominate-suggest`
- Any `bid-decision` / `should-i-bid` style functions
- Live bid webhook listeners (the polling that *reads* draft picks stays — only the "you place a bid" path goes)

**Pages affected:**
- `Draft.tsx` / `DraftRoom.tsx` — strip nomination + bidding sections, keep player board / search / rankings / strategy / vetri / live picks ticker
- `Planner.tsx` — strip "what to bid" widgets, keep tier/budget *planning* visuals (these are pre-draft research, not live bidding)
- `Studio.tsx` — strip bid simulator if present
- Landing/marketing — remove "live bidding" copy, reframe as "draft research dossier"

## What stays

- Player rankings, tiers, VORP, projections, ADP
- Auction *values* (research data: "ESPN says $42")
- Last 3 yrs historical auction results (research)
- Player search, filters, watchlist (save players to study)
- Vetri takes, Reddit buzz, news, injury reports
- Draft strategy presets (Zero RB, Hero RB, $/slot allocation)
- **Live ESPN polling** during the actual draft → board auto-updates with who's been taken (read-only — no bid buttons)
- ESPN connection (admin), invites, league context

## Behavior changes

- App opens directly to research view — no "set up your draft" flow
- Default state across the board: **read-only**. No edit/bid/nominate buttons anywhere
- Setup wizard: only shown to admin, only for ESPN connection (one-time)
- Routes `/draft`, `/planner` redirect/rename → `/research`, `/board`

## Database

Keep all tables (the data is research). Mark `live_draft_events` as read-only via RLS — no more inserts from the app. (Auction history table stays as historical research.)

## Order of operations

1. Delete the dead component files + edge functions
2. Strip imports/usages from `Draft.tsx`, `Planner.tsx`, `Studio.tsx`, `DraftRoom.tsx`
3. Strip "live bidding" from landing copy
4. Tighten RLS so app can't insert bids
5. Smoke test: open app → see board + rankings + watchlist + vetri, zero bid buttons anywhere

Roughly 20-30 files touched, mostly deletions. ~15 min of work. Want me to ship it?
