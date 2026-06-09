# Persistent, planner-aware Coach chat — with "Apply to planner"

Turn the existing "Ask the Coach" sheet into the ChatGPT-style assistant from your screenshots, with two new powers:

1. The chat **saves to your account** — reload, switch devices, it's still there.
2. The AI can **propose a build** (or a single swap) as a structured card with an **"Apply to planner"** button. One tap fills the slot values and target names. Nothing changes on the board unless you tap.

## User flow

You type: *"Swap Bijan ($50) for Josh Jacobs at $40, what fits?"*

Coach replies with normal prose like ChatGPT, **plus** a yellow proposal card at the bottom:

```
┌─ Proposed build ─────────────────────────┐
│ QB1   Josh Allen          $67            │
│ RB1   Josh Jacobs         $40            │
│ RB2   Omarion Hampton     $20            │
│ WR1   Malik Nabers        $33            │
│ ...                                       │
│ Total $225 / $225  ✓                      │
│                                           │
│ [Apply to planner]   [Dismiss]            │
└───────────────────────────────────────────┘
```

Tap **Apply** → every slot's $ and target name updates in the planner. Locked slots (already drafted) are skipped, never overwritten. A toast says "Applied — undo" for 5 seconds.

The AI can also propose a **single-slot change** ("set RB2 = $17, target Hampton") which renders as a smaller one-row card with the same Apply button.

## What changes (user-visible)

1. Coach chat persists per user (load on open, save on send).
2. "New chat" button in the Coach sheet header.
3. Coach sees the live budget board (slot $, target notes, locks, totals).
4. Proposal cards inline in chat with **Apply to planner** / **Dismiss**.
5. Apply respects locked slots and shows an undo toast.
6. New starter prompts: "Does my current build fit $225?", "Swap X for Y", "Find me a cheap backup QB", "Where am I weakest?"

The planner UI itself doesn't change — same manual board. The only new thing is that "Apply" can write into it.

## What changes (technical)

### 1. Database — one new table
`coach_messages` on Lovable Cloud:
- `id`, `user_id`, `role` ('user' | 'assistant'), `content` (text), `proposal` (jsonb, nullable), `created_at`
- RLS: users read/write only their own rows
- GRANTs: `authenticated`, `service_role`

`proposal` shape:
```json
{
  "kind": "full" | "patch",
  "slots": [{ "id": "RB1-1", "label": "RB1", "dollars": 40, "target": "Josh Jacobs" }],
  "total": 225,
  "note": "Fits exactly"
}
```

### 2. Edge function — extend existing `coach`
- Accept new fields: `budgetBoard` (slot id, label, $, target, locked, totals) and `userId`.
- System prompt: include the board as a formatted block + instruction "When proposing $ changes, end your reply with a `<<<PLANNER_PROPOSAL>>> {json} <<<END>>>` block matching the schema." Parser extracts and strips it before display.
- Persist the user message before streaming, persist the assistant message + parsed proposal on stream end.

### 3. Frontend — `AiQuickPanel` rewrite
- On mount: load saved messages from `coach_messages` for the signed-in user.
- Render messages from DB; render `proposal` blocks as a `<ProposalCard />` component.
- `ProposalCard` calls `applyProposal(proposal)` which loops slots and calls `setSlotAllocation` + `setSlotNote` from the draft store, skipping any `lockedSlots[id]`. Stores previous values for undo. Toast with undo button.
- New chat button: deletes the user's `coach_messages` rows after confirm.

### 4. `coachContext()` in `DraftRoom.tsx`
Add to the payload:
```ts
budgetBoard: {
  totalBudget: settings.totalBudget,
  slots: buildSlots(settings).map(s => ({
    id: s.id,
    label: s.label,
    group: s.group,
    dollars: slotAllocations[s.id] ?? defaultFor(s.group),
    target: slotNotes[s.id] ?? "",
    locked: !!lockedSlots[s.id],
  })),
}
```

### 5. Anonymous users
Not signed in → chat is in-memory only (today's behavior) with a "Sign in to save chats" note. Apply still works since it just writes to the local store.

## Out of scope (intentionally)
- Multiple chat threads / scenario tabs.
- AI auto-applying without your tap.
- Sharing chats with league members — each member has their own.
- Touching the planner UI itself — same simple manual board.

## Verification after build
1. Send a message → reload → it's still there.
2. Type "$30 in RB1, target James Cook" → ask "does this fit?" → confirm AI quotes the actual $30.
3. Ask for a full $225 build → confirm proposal card appears → tap Apply → confirm planner fills in.
4. Lock a slot, ask for a build → confirm Apply skips the locked slot.
5. Tap Apply → tap Undo in toast → confirm planner reverts.
6. Hit "New chat" → confirm rows clear.
