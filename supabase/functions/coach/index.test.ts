// Tests for the math anchor format on bid recommendations.
//
// 1. Pure-regex unit tests for the exact required format:
//      *(Bank $X · max bid $Y · N slots left)*
//    where X, Y, N are non-negative integers and the separator is U+00B7 (·).
//
// 2. Live integration tests against the deployed `coach` edge function,
//    skipped automatically when VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
//    are not set in .env. They send a few classic bid-recommendation prompts
//    and verify the streamed reply ends with the math anchor and that the
//    X / Y / N values match the Budget block.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ---------- The single source of truth for the format ----------
// *(Bank $X · max bid $Y · N slots left)*
//   - leading & trailing asterisk (markdown italics)
//   - literal " · " (space, U+00B7, space) as separators
//   - integer values only, no decimals
export const MATH_ANCHOR_RE =
  /\*\(Bank \$(\d+) \u00B7 max bid \$(\d+) \u00B7 (\d+) slots left\)\*/;

/** Pulls the last math anchor in a string, or null if none. */
export function extractAnchor(text: string): {
  bank: number;
  maxBid: number;
  slotsLeft: number;
  raw: string;
} | null {
  const re = new RegExp(MATH_ANCHOR_RE.source, "g");
  let last: RegExpExecArray | null = null;
  for (const m of text.matchAll(re)) last = m as unknown as RegExpExecArray;
  if (!last) return null;
  return {
    bank: Number(last[1]),
    maxBid: Number(last[2]),
    slotsLeft: Number(last[3]),
    raw: last[0],
  };
}

/** True when the string's final non-whitespace token is the math anchor. */
export function endsWithAnchor(text: string): boolean {
  const trimmed = text.trimEnd();
  const m = trimmed.match(MATH_ANCHOR_RE);
  if (!m) return false;
  return trimmed.endsWith(m[0]);
}

// =====================================================================
// 1. Pure regex / shape tests — no network
// =====================================================================

Deno.test("MATH_ANCHOR_RE matches the canonical format", () => {
  const ok = "*(Bank $123 · max bid $42 · 9 slots left)*";
  const m = ok.match(MATH_ANCHOR_RE);
  assert(m, "should match canonical format");
  assertEquals(m![1], "123");
  assertEquals(m![2], "42");
  assertEquals(m![3], "9");
});

Deno.test("MATH_ANCHOR_RE rejects wrong separator (regular dot)", () => {
  const bad = "*(Bank $50 . max bid $10 . 3 slots left)*";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("MATH_ANCHOR_RE rejects wrong separator (bullet •)", () => {
  const bad = "*(Bank $50 • max bid $10 • 3 slots left)*";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("MATH_ANCHOR_RE rejects missing italics asterisks", () => {
  const bad = "(Bank $50 \u00B7 max bid $10 \u00B7 3 slots left)";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("MATH_ANCHOR_RE rejects decimal values", () => {
  const bad = "*(Bank $50.5 \u00B7 max bid $10 \u00B7 3 slots left)*";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("MATH_ANCHOR_RE rejects reordered fields", () => {
  const bad = "*(max bid $10 \u00B7 Bank $50 \u00B7 3 slots left)*";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("MATH_ANCHOR_RE rejects pluralization changes", () => {
  const bad = "*(Bank $50 \u00B7 max bid $10 \u00B7 1 slot left)*";
  assertEquals(bad.match(MATH_ANCHOR_RE), null);
});

Deno.test("endsWithAnchor() requires anchor at the very end", () => {
  const ok =
    "Love him at $18. *(Bank $120 \u00B7 max bid $24 \u00B7 8 slots left)*";
  assert(endsWithAnchor(ok));

  const trailingPunct =
    "Love him. *(Bank $120 \u00B7 max bid $24 \u00B7 8 slots left)* — go.";
  assert(!endsWithAnchor(trailingPunct), "anchor must be last token");
});

Deno.test("extractAnchor() pulls X/Y/N out of the trailing anchor", () => {
  const text =
    "I'd push to $22. *(Bank $77 \u00B7 max bid $15 \u00B7 6 slots left)*";
  const got = extractAnchor(text);
  assertEquals(got, {
    bank: 77,
    maxBid: 15,
    slotsLeft: 6,
    raw: "*(Bank $77 \u00B7 max bid $15 \u00B7 6 slots left)*",
  });
});

// =====================================================================
// 2. Live integration tests against the deployed `coach` edge function
// =====================================================================

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY");
const LIVE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

interface CoachBudget {
  remaining: number; // → Bank $X
  maxBid: number;    // → max bid $Y
  slotsLeft: number; // → N slots left
  slotsTotal: number;
}

function makePayload(budget: CoachBudget, userQuestion: string) {
  return {
    settings: {
      totalBudget: 200,
      leagueType: "Standard",
      teams: 12,
      roster: { QB: 1, RB: 2, WR: 2, TE: 1, FLEX: 1, SUPERFLEX: 0, K: 1, DST: 1, BENCH: 7 },
    },
    budget,
    rosterFilled: { QB: 0, RB: 1, WR: 1, TE: 0, K: 0, DST: 0 },
    rosterRequired: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DST: 1 },
    events: [
      { player: "Christian McCaffrey", position: "RB", price: 55, drafter: "other" },
      { player: "Justin Jefferson",    position: "WR", price: 58, drafter: "other" },
      { player: "Tyreek Hill",         position: "WR", price: 42, drafter: "other" },
    ],
    prices: [
      { name: "Bijan Robinson",  price: 52, position: "RB" },
      { name: "CeeDee Lamb",     price: 48, position: "WR" },
      { name: "Saquon Barkley",  price: 44, position: "RB" },
      { name: "Garrett Wilson",  price: 32, position: "WR" },
      { name: "Travis Kelce",    price: 22, position: "TE" },
    ],
    spendByPosition: { RB: 0, WR: 0, QB: 0, TE: 0, K: 0, DST: 0 },
    recentRuns: { window: 5, counts: { RB: 1, WR: 1 } },
    // no latestEvent — these prompts are about hypothetical/upcoming bids
    userQuestion,
    showMath: false,
  };
}

async function callCoach(body: unknown): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`coach ${res.status}: ${raw.slice(0, 400)}`);
  }
  // Parse SSE stream into a single string.
  let out = "";
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("data:")) continue;
    const payload = t.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const j = JSON.parse(payload);
      const delta = j?.choices?.[0]?.delta?.content
        ?? j?.choices?.[0]?.message?.content
        ?? "";
      if (typeof delta === "string") out += delta;
    } catch { /* ignore non-JSON keepalives */ }
  }
  return out;
}

const BID_PROMPTS = [
  'Should I bid on Bijan Robinson? He just got nominated at $40.',
  "What's your max bid on CeeDee Lamb right now?",
  "Saquon is up — recommend a max bid.",
];

for (const q of BID_PROMPTS) {
  Deno.test({
    name: `live: bid recommendation ends with math anchor — ${q}`,
    ignore: !LIVE,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      const budget: CoachBudget = {
        remaining: 117,
        maxBid: 41,
        slotsLeft: 14,
        slotsTotal: 16,
      };
      const text = await callCoach(makePayload(budget, q));
      assert(text.length > 0, "expected non-empty coach reply");
      assertMatch(text, MATH_ANCHOR_RE);
      assert(
        endsWithAnchor(text),
        `math anchor must be the last token. got tail: ${JSON.stringify(text.slice(-160))}`,
      );
      const a = extractAnchor(text)!;
      assertEquals(
        a.bank,
        budget.remaining,
        `Bank $${a.bank} must equal Budget.remaining=${budget.remaining}`,
      );
      assertEquals(
        a.maxBid,
        budget.maxBid,
        `max bid $${a.maxBid} must equal Budget.maxBid=${budget.maxBid}`,
      );
      assertEquals(
        a.slotsLeft,
        budget.slotsLeft,
        `${a.slotsLeft} slots left must equal Budget.slotsLeft=${budget.slotsLeft}`,
      );
    },
  });
}

Deno.test({
  name: "live: anchor reflects a different Budget block",
  ignore: !LIVE,
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const budget: CoachBudget = {
      remaining: 38,
      maxBid: 9,
      slotsLeft: 5,
      slotsTotal: 16,
    };
    const text = await callCoach(
      makePayload(budget, "Should I bid on Garrett Wilson at $8?"),
    );
    const a = extractAnchor(text);
    assert(a, `expected math anchor, got: ${text.slice(-200)}`);
    assertEquals(a!.bank, budget.remaining);
    assertEquals(a!.maxBid, budget.maxBid);
    assertEquals(a!.slotsLeft, budget.slotsLeft);
  },
});
