# Auction Draft AI Coach — Build Plan

A fast, mobile-friendly web tool that coaches users through a live fantasy football auction draft. Users complete a short setup wizard, then enter each "Player - Price" as the draft unfolds. The app tracks budget/roster state and an AI coach responds with strategy, max bids, and sleeper suggestions.

## 1. Pre-Draft Setup Wizard

A 6-step wizard (progress indicator + Back/Next). All state persisted to `localStorage` so a refresh mid-draft doesn't wipe progress.

1. **League Basics** — total budget (number), scoring (PPR / Half / Standard), league type (Standard / Superflex / 2QB), # of teams.
2. **Roster Settings** — counts for QB, RB, WR, TE, FLEX, Superflex, K, DST, Bench. Computed total roster size shown live.
3. **Keeper Rules** — annual cost increase (e.g. +4/+8/+12) and any notes.
4. **Enter Keepers** — repeatable rows: player name + cost. Auto-deducts from budget and shows remaining.
5. **Player Price Estimates (optional)** — large textarea, one per line in `Name - Price` format. Parsed into an internal price sheet used by the AI for value calls.
6. **League Context** — free-form textarea for tendencies, spending behavior, rivalries, etc.

Wizard ends with a "Start Draft" button → routes to the Live Dashboard.

## 2. Live Draft Dashboard (core)

Mobile-first, single-screen layout. Two columns on desktop, stacked on mobile.

**Left / top — Input & Activity**
- Single input: `Player Name - Price`, plus a toggle "Drafted by: Me / Other".
- Submit button + Enter-to-submit.
- "Undo last entry" button (pops the last event, restores budget/roster).
- Scrollable feed of all entered players with price, who got them, and timestamp.

**Right / bottom — State & Coach**
- **Budget panel**: remaining $, total spent, $/slot remaining, max bid math (`remaining - (slotsLeft - 1)`).
- **Roster panel**: each position with filled / required slots; highlights gaps.
- **Market panel**: spend-by-position bars and a small "recent runs" indicator (e.g. "3 WRs in last 5 picks").
- **AI Coach panel**: streaming response after each entry with:
  - Updated budget summary + math
  - Position to target next + max bid guidance
  - Strategy pivot if needed
  - 1–3 sleeper/value suggestions with reasoning
- "Ask the coach" follow-up box for ad-hoc questions ("Should I nominate Kupp now?").

## 3. AI Coach Behavior

A single edge function (`/coach`) is called after each draft event and for follow-up questions. It is **not** asked to do math blindly — the client computes deterministic state and passes it in:

Payload includes:
- League settings, roster requirements, keeper cost rules
- User's current roster, remaining budget, slots left, max bid
- Full draft log (all picks: who, player, price)
- User's price sheet (from wizard step 5)
- Position-spend totals + recent-pick window for run detection
- Free-form league context
- The latest event + user question (if any)

System prompt instructs the model to:
- Be conversational, sharp, direct
- Always show the math (remaining $, slots, max bid)
- Detect positional runs and inflation vs. the user's price sheet
- Recommend next target position + bid range
- Pivot strategy when the original plan is no longer feasible
- Enforce budget discipline ($1 minimum per remaining slot)
- Suggest 1–3 sleepers with reasoning, not just names

Streaming SSE response renders token-by-token in the Coach panel (markdown rendered).

Model: `google/gemini-3-flash-preview` (fast default). Errors 429/402 surfaced as toasts.

## 4. UI / Design

- Clean, dark-friendly sports-coach aesthetic; high contrast for live use.
- Tailwind + shadcn (Button, Input, Textarea, Card, Progress, Badge, Tabs, Toast).
- Mobile: input pinned to top, coach output below, collapsible state panels.
- All numeric updates animated subtly so changes are obvious mid-draft.

## 5. Data & Persistence

- All state in React + `localStorage` (no auth, no DB).
- A single `draftStore` (Zustand or React context + reducer) holds: settings, roster, events, priceSheet, context.
- Pure helper functions for: parsing input, applying/undoing events, computing budget/roster/market metrics.
- "Reset draft" button (with confirm) clears state.

## Technical Notes

- Stack: existing Vite + React + TS + Tailwind + shadcn.
- Lovable Cloud enabled for the edge function + `LOVABLE_API_KEY`.
- Edge function: `supabase/functions/coach/index.ts` — streams from Lovable AI Gateway, system prompt lives server-side.
- Markdown rendering via `react-markdown` for AI output.
- Input parser: regex `^(.+?)\s*[-–—]\s*\$?(\d+)$`, trims, validates price > 0.
- Max bid formula: `maxBid = budgetRemaining - (slotsRemaining - 1)`; never allow entries that would violate the $1/slot rule for the user's own picks (warn + confirm).
- Undo implemented as event-sourced log — recompute state from events array, so undo = pop + recompute.

## Out of Scope (per spec)

- No external player APIs, no auth, no payments, no advanced analytics dashboards.

## Deliverables

- Wizard pages + Live dashboard
- `coach` edge function with streaming
- Local persistence + undo + reset
- Mobile-responsive layout
