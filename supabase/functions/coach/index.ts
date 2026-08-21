// Auction Ace AI Coach — Expected Price + live planner state.
// ESPN remains the actual draft room; the user manually supplies live bid
// context and locks purchases in the Budget Planner.

const RAW_ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
const ALLOWED_ORIGINS = RAW_ALLOWED ? RAW_ALLOWED.split(",").map((s) => s.trim()).filter(Boolean) : [];
const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.length) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      Vary: "Origin",
    };
  }
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function callerKey(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      const parts = m[1].split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        if (payload?.sub) return `u:${payload.sub}`;
      }
    } catch { /* fall back to IP */ }
  }
  return `ip:${req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon"}`;
}

const BUCKETS = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = BUCKETS.get(key);
  if (!current || current.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const };
  }
  if (current.count >= limit) {
    return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true as const };
}

interface WebSource { title: string; url: string; description: string }
const FC_CACHE = new Map<string, { results: WebSource[]; expiresAt: number }>();
const FC_TTL_MS = 30 * 60_000;

function fcCacheGet(key: string): WebSource[] | null {
  const hit = FC_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    FC_CACHE.delete(key);
    return null;
  }
  return hit.results;
}

function fcCacheSet(key: string, results: WebSource[]) {
  FC_CACHE.set(key, { results, expiresAt: Date.now() + FC_TTL_MS });
  if (FC_CACHE.size > 100) {
    const oldest = [...FC_CACHE.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) FC_CACHE.delete(oldest[0]);
  }
}

// Exported for the existing parser tests.
export function parseFirecrawlResults(fc: unknown): WebSource[] {
  if (!fc || typeof fc !== "object") return [];
  const root = fc as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | unknown[] | undefined;
  const webField = root.web as Record<string, unknown> | unknown[] | undefined;
  const dataWeb = (data && !Array.isArray(data) ? (data as Record<string, unknown>).web : undefined) as Record<string, unknown> | unknown[] | undefined;

  const candidates: unknown[] = [
    Array.isArray(data) ? data : undefined,
    Array.isArray(webField) ? webField : undefined,
    webField && !Array.isArray(webField) && Array.isArray((webField as Record<string, unknown>).results)
      ? (webField as Record<string, unknown>).results : undefined,
    Array.isArray(dataWeb) ? dataWeb : undefined,
    dataWeb && !Array.isArray(dataWeb) && Array.isArray((dataWeb as Record<string, unknown>).results)
      ? (dataWeb as Record<string, unknown>).results : undefined,
  ];

  const list = (candidates.find((c) => Array.isArray(c) && (c as unknown[]).length) as unknown[] | undefined) ?? [];
  return list.map((row): WebSource => {
    const o = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    return {
      title: typeof o.title === "string" ? o.title : "",
      url: typeof o.url === "string" ? o.url : "",
      description: typeof o.description === "string" ? o.description : "",
    };
  }).filter((s) => s.url);
}

interface CoachPayload {
  settings: Record<string, unknown>;
  budget: Record<string, unknown>;
  keepers?: unknown[];
  myRoster?: { player: string; position?: string; price: number; source?: string; slot?: string }[];
  rosterFilled?: Record<string, number>;
  rosterRequired?: Record<string, number>;
  events?: unknown[];
  prices: { name: string; price: number; position?: string }[];
  spendByPosition?: Record<string, number>;
  recentRuns?: unknown[];
  userQuestion?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  draftedPlayers?: string[];
  showMath?: boolean;
  strategy?: { id: string; label: string; guidance: string };
  budgetBoard?: {
    totalBudget: number;
    slots: { id: string; label: string; group: string; dollars: number; target: string; locked: boolean }[];
  };
}

const SYSTEM_PROMPT = `You are Auction Ace Coach, a fast in-draft advisor for the 2026 NFL fantasy season.

CORE MODEL
- The Price Sheet contains ONE number per player: EXPECTED PRICE for THIS user's league. It is not generic AAV, not a second hidden valuation, and not a guaranteed max bid.
- Never invent a separate "true value", "fair value", or competing proprietary dollar value. Use Expected Price + the user's actual budget plan + current NFL context.
- The user's league settings in the message are authoritative. This is Superflex/2QB unless those settings explicitly say otherwise.
- The user is drafting in ESPN separately. You DO NOT see the ESPN room, live bids, opponent budgets, nominations, or who other teams drafted.
- If the user says "Player X is at $Y", treat $Y as authoritative live context for that question.

LIVE PLANNER
- The Budget block contains REAL spend, REAL remaining bank, current legal max bid, and slots left. Use it for affordability.
- Budget Board rows tagged [LOCKED-DRAFTED] are actual purchases at the exact amount paid. They are the roster truth.
- Unlocked rows are future planned allocations, not money already spent.
- Never overwrite or propose changes to a locked row.
- When a purchase is above/below plan, explain where the remaining plan has room to contract/expand.

EXPECTED PRICE
- Compare a live bid to Expected Price, but don't blindly buy just because it is below Expected Price or blindly pass just because it is $1 over. Roster construction and scarcity matter.
- Do not replace Auction Ace Expected Prices with web AAVs. Web results are for injuries, roles, depth charts, transactions, suspensions and other current football context.

FAST BID QUESTIONS
When the user asks whether to bid/continue on a player, answer in this compact structure:
**CALL:** BUY / KEEP BIDDING / STOP / PASS
**TARGET:** the practical price zone right now
**STOP:** a concrete stop number that never violates the legal max bid
**WHY:** 1-2 short sentences using Expected Price, plan slot and roster context
**PLAN IMPACT:** what the decision does to the remaining build
Do not pad the answer.

OTHER QUESTIONS
- For position options, give 2 strategic paths and specific players from the Price Sheet.
- For filtered player lists, use only players/prices actually present in the Price Sheet.
- Never say a player is "still available" or "left on the board" unless the user explicitly told you that.
- Be decisive, concise and practical.

CURRENT INFORMATION
- It is the 2026 NFL season. 2025 is the most recent completed season.
- Use attached web search results when relevant and cite a used result as (per Site — full URL). Never invent URLs.

PLANNER PROPOSALS
When the user explicitly asks you to build, swap, or rebalance planner slots, end with:
<<<PLANNER_PROPOSAL>>>
{"kind":"full"|"patch","slots":[{"id":"QB-1","dollars":60,"target":"Player"}],"total":225,"note":"short note"}
<<<END>>>
Only include editable/unlocked rows. Omit this block for ordinary Q&A.`;

function numberFrom(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildUserMessage(p: CoachPayload): string {
  const expectedPrices = (p.prices ?? [])
    .filter((r) => Number(r.price) > 0)
    .sort((a, b) => Number(b.price) - Number(a.price))
    .map((r) => `${r.name}${r.position ? ` (${r.position})` : ""}\texpected$${r.price}`);

  const parts: string[] = [];
  parts.push(`## League Settings\n${JSON.stringify(p.settings)}`);
  parts.push(`## Live Budget (REAL money, not planned allocation)\n${JSON.stringify(p.budget)}`);

  if (p.strategy) parts.push(`## Active Strategy\n${JSON.stringify(p.strategy)}`);
  if (p.myRoster?.length) parts.push(`## Drafted Roster\n${JSON.stringify(p.myRoster)}`);
  if (p.rosterRequired) parts.push(`## Roster Requirements\n${JSON.stringify(p.rosterRequired)}`);
  if (p.spendByPosition) parts.push(`## Actual Spend By Position\n${JSON.stringify(p.spendByPosition)}`);

  parts.push(`## Expected Price Top 350\n${expectedPrices.join("\n") || "(empty)"}`);

  if (p.budgetBoard) {
    const bb = p.budgetBoard;
    const lockedSpend = bb.slots.filter((s) => s.locked).reduce((sum, s) => sum + numberFrom(s.dollars, 0), 0);
    const plannedTotal = bb.slots.reduce((sum, s) => sum + numberFrom(s.dollars, 0), 0);
    const budgetRemaining = numberFrom(p.budget?.remaining, Math.max(0, bb.totalBudget - lockedSpend));
    const rows = bb.slots.map((s) =>
      `${s.id}\t${s.label}\t$${s.dollars}\t${s.target || "(no target)"}${s.locked ? "\t[LOCKED-DRAFTED]" : "\t[PLANNED]"}`,
    ).join("\n");
    parts.push(`## Budget Board\ntotalBudget=$${bb.totalBudget}\nactualDraftedSpend=$${lockedSpend}\nrealRemaining=$${budgetRemaining}\nfullPlanTotal=$${plannedTotal}\nid\tlabel\t$\ttarget\tstate\n${rows}`);
  }

  if (p.userQuestion) parts.push(`## Question\n${p.userQuestion}`);
  else parts.push("## Task\nReview the current planner and give one concise recommendation.");
  return parts.join("\n\n");
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const rl = rateLimit(callerKey(req), 12, 60_000);
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests. Slow down." }), {
      status: 429,
      headers: { ...cors, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) },
    });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const payload = (await req.json()) as CoachPayload;

    const question = (payload.userQuestion ?? "").trim();
    const pricesCount = (payload.prices ?? []).filter((r) => Number(r.price) > 0).length;
    const draftedCount = payload.budgetBoard?.slots.filter((s) => s.locked).length ?? 0;

    let sources: WebSource[] = [];
    let webContext = "";
    let fcCacheStatus: "hit" | "miss" | "skip" | "error" = "skip";
    const searchQuery = question ? `${question} fantasy football NFL 2026` : "";

    if (FIRECRAWL_API_KEY && searchQuery) {
      const cacheKey = searchQuery.toLowerCase();
      const cached = fcCacheGet(cacheKey);
      if (cached) {
        sources = cached;
        fcCacheStatus = "hit";
      } else {
        try {
          const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, limit: 8, tbs: "qdr:w" }),
          });
          if (fcRes.ok) {
            const json = await fcRes.json().catch(() => null);
            sources = parseFirecrawlResults(json).slice(0, 6);
            fcCacheStatus = "miss";
            if (sources.length) fcCacheSet(cacheKey, sources);
          } else {
            fcCacheStatus = "error";
          }
        } catch {
          fcCacheStatus = "error";
        }
      }

      if (sources.length) {
        webContext = sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.description}\nSource: ${s.url}`).join("\n\n");
      }
    }

    const strategyAddendum = payload.strategy
      ? `\n\nACTIVE USER STRATEGY: ${payload.strategy.label}. ${payload.strategy.guidance}`
      : "";
    const webAddendum = webContext
      ? `\n\nWEB SEARCH RESULTS — use only when relevant to current football context:\n${webContext}`
      : "";
    const systemPrompt = SYSTEM_PROMPT + strategyAddendum + webAddendum;

    const messages: { role: string; content: string }[] = [{ role: "system", content: systemPrompt }];
    for (const h of (payload.history ?? []).slice(-6)) messages.push({ role: h.role, content: h.content });
    const userMessage = buildUserMessage(payload);
    messages.push({ role: "user", content: userMessage });

    const confidence = {
      label: pricesCount >= 200 ? "high" : pricesCount > 0 ? "medium" : "low",
      pdf: pricesCount > 0 ? 1 : 0,
      web: Math.min(1, sources.length / 3),
      score: pricesCount > 0 ? (sources.length ? 1 : 0.9) : 0.2,
      basis: `${pricesCount} league-calibrated Expected Prices + ${sources.length} current web source${sources.length === 1 ? "" : "s"}`,
    };

    const metaSse = `data: ${JSON.stringify({ meta: {
      searched: !!searchQuery && !!FIRECRAWL_API_KEY,
      searchReason: searchQuery ? "current 2026 football context" : "no question text",
      searchQuery,
      firecrawlCache: fcCacheStatus,
      sources,
      confidence,
      debug: {
        undraftedPriceCount: pricesCount,
        draftedCount,
        historyTurns: payload.history?.length ?? 0,
        systemPromptChars: systemPrompt.length,
        userMessageChars: userMessage.length,
        webSnippets: sources.map((s, i) => ({ idx: i + 1, title: s.title, url: s.url, description: s.description })),
      },
    } })}\n\n`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages,
        stream: true,
        max_completion_tokens: 1000,
      }),
    });

    const fallbackSse = (message: string) => new Response(
      metaSse + `data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\ndata: [DONE]\n\n`,
      { headers: { ...cors, "Content-Type": "text/event-stream", "X-Fallback": "1" } },
    );

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("AI gateway error", resp.status, detail);
      if (resp.status === 429) return fallbackSse("⚠️ Coach is rate-limited right now. Try again in about 30 seconds.");
      if (resp.status === 402) return fallbackSse("⚠️ AI credits are exhausted for this workspace. Your planner and Expected Prices are still intact.");
      return fallbackSse(`⚠️ Coach couldn't generate a reply (gateway ${resp.status}). Try again in a moment.`);
    }
    if (!resp.body) return fallbackSse("⚠️ Coach returned an empty response. Try again.");

    const encoder = new TextEncoder();
    const combined = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(metaSse));
        const reader = resp.body!.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(combined, {
      headers: { ...cors, "Content-Type": "text/event-stream", "X-Auction-Ace": "expected-price-v2" },
    });
  } catch (error) {
    console.error("coach error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
