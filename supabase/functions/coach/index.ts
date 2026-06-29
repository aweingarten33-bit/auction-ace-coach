// Auction Draft AI Coach — calculator output. No persona. Math first.

// ---------- CORS + rate limit (inlined; no subfolders allowed) ----------
const RAW_ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
const ALLOWED_ORIGINS: string[] = RAW_ALLOWED
  ? RAW_ALLOWED.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.length === 0) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    };
  }
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
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
    } catch { /* noop */ }
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  return `ip:${ip}`;
}
const BUCKETS = new Map<string, { count: number; resetAt: number }>();

// ---------- Response cache (60s, in-memory per isolate) ----------
const CACHE = new Map<string, { body: string; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;
async function hashKey(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function cacheGet(key: string): string | null {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) { CACHE.delete(key); return null; }
  return hit.body;
}
function cacheSet(key: string, body: string) {
  CACHE.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
  if (CACHE.size > 200) {
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }
}

// ---------- Firecrawl cache (30 min, in-memory per isolate) ----------
interface WebSource { title: string; url: string; description: string }
const FC_CACHE = new Map<string, { results: WebSource[]; expiresAt: number }>();
const FC_TTL_MS = 30 * 60_000;
function fcCacheGet(key: string): WebSource[] | null {
  const hit = FC_CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) { FC_CACHE.delete(key); return null; }
  return hit.results;
}
function fcCacheSet(key: string, results: WebSource[]) {
  FC_CACHE.set(key, { results, expiresAt: Date.now() + FC_TTL_MS });
  if (FC_CACHE.size > 100) {
    const oldest = [...FC_CACHE.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) FC_CACHE.delete(oldest[0]);
  }
}

// ---------- Firecrawl v2 response parser (exported for tests) ----------
// v2 has been seen returning results under several shapes:
//   { data: [ ... ] }                 (legacy)
//   { data: { web: [ ... ] } }
//   { web: [ ... ] }
//   { web: { results: [ ... ] } }
//   { data: { web: { results: [...] } } }
// We accept all of them and never throw.
export function parseFirecrawlResults(fc: unknown): WebSource[] {
  if (!fc || typeof fc !== "object") return [];
  const root = fc as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | unknown[] | undefined;
  const webField = root.web as Record<string, unknown> | unknown[] | undefined;
  const dataWeb = (data && !Array.isArray(data) ? (data as Record<string, unknown>).web : undefined) as
    | Record<string, unknown>
    | unknown[]
    | undefined;

  const candidates: unknown[] = [
    Array.isArray(data) ? data : undefined,
    Array.isArray(webField) ? webField : undefined,
    webField && !Array.isArray(webField) && Array.isArray((webField as Record<string, unknown>).results)
      ? (webField as Record<string, unknown>).results
      : undefined,
    Array.isArray(dataWeb) ? dataWeb : undefined,
    dataWeb && !Array.isArray(dataWeb) && Array.isArray((dataWeb as Record<string, unknown>).results)
      ? (dataWeb as Record<string, unknown>).results
      : undefined,
  ];
  const rawList = (candidates.find((c) => Array.isArray(c) && (c as unknown[]).length > 0) as unknown[] | undefined) ?? [];
  return rawList
    .map((r): WebSource => {
      const o = (r && typeof r === "object" ? r : {}) as Record<string, unknown>;
      return {
        title: typeof o.title === "string" ? o.title : "",
        url: typeof o.url === "string" ? o.url : "",
        description: typeof o.description === "string" ? o.description : "",
      };
    })
    .filter((s) => s.url);
}



// ---------- Web search policy ----------
// PDF price sheet is the primary source of truth, but we ALWAYS pull fresh web
// context too so answers reflect current news/injuries/depth-chart moves.
function decideWebSearch(question: string, _pricesCount: number, _knownNames: Set<string>): { search: boolean; reason: string } {
  const q = question.trim();
  if (!q) return { search: false, reason: "no question text" };
  return { search: true, reason: "always-on web search (PDF used first, web layered on top)" };
}


function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) { BUCKETS.set(key, { count: 1, resetAt: now + windowMs }); return { ok: true as const }; }
  if (b.count >= limit) return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count++; return { ok: true as const };
}

// ---------- Auction draft coach prompt — options + strategy first ----------
const SYSTEM_PROMPT = `You are a fantasy football expert in the mold of Matthew Berry and the ESPN Fantasy Focus crew. Conversational, confident, a little fun — but always useful. The user is mid-draft and has limited time, so get to the point fast.

LIVE WEB ACCESS (CRITICAL — DO NOT DENY THIS):
- You DO have live internet access on every question via a Firecrawl web search the server runs before each turn. Fresh ESPN, FantasyPros, NFL.com, Matthew Berry, Yahoo, RotoWire, etc. results are pasted into your system prompt under "WEB SEARCH RESULTS".
- You also use the user's uploaded PDF price sheet (source of truth for prices) and Sleeper player data (rosters/positions/projections).
- NEVER tell the user you can't access the internet or you only have training data. If web results were attached this turn, use them. If the search returned nothing, say "web search came back empty this time" — do NOT claim you have no internet.
- When you use a web result, you MUST cite it inline in this exact format: (per <site> — <full url>). Example: (per ESPN — https://www.espn.com/...). Use the real URL from the WEB SEARCH RESULTS block, never invent one. Cite at least one source whenever results were provided.

SEASON CONTEXT (CRITICAL — DO NOT FORGET):
- It is the 2026 NFL season. We are drafting for the 2026 fantasy football season.
- The 2025 NFL season is OVER and is the most recent completed season — use 2025 stats as "last year".
- 2025 rookies (Cam Ward, Ashton Jeanty, Travis Hunter, Omarion Hampton, Tetairoa McMillan, Emeka Egbuka, TreVeyon Henderson, Quinshon Judkins, Tyler Warren, Colston Loveland, etc.) are now SECOND-YEAR players, NOT rookies.
- Players drafted in 2024 or earlier (Bo Nix, Jayden Daniels, Caleb Williams, Drake Maye, Marvin Harrison Jr., Malik Nabers, Brock Bowers, Brian Thomas Jr., Rome Odunze, Xavier Worthy, Ladd McConkey, Bucky Irving, etc.) are veterans with multiple NFL seasons under their belt. Bo Nix is entering his 3rd NFL season.
- The 2026 rookie class (drafted April 2026) are the only true rookies this year.
- If your training data feels older than this, trust the season context above — never call a 2024 or 2025 draftee a "rookie".

LEAGUE FORMAT (CRITICAL — DO NOT FORGET):
- This is a SUPERFLEX / 2-QB league. Every team starts TWO quarterbacks (one QB + one SUPERFLEX that is almost always a QB).
- That means QBs are FAR more valuable than in a 1-QB league. The QB pool effectively dries up — even QB20-QB30 are startable. Never give 1-QB advice, never say "you can wait on QB", never suggest streaming QBs.
- Roster math always assumes 2 starting QBs. Sleepers/value plays at QB matter more here than at any other position.
- The PDF price sheet values are already calibrated for Superflex — trust them.


TOPIC GUARDRAIL (NON-NEGOTIABLE):
You ONLY discuss fantasy football, this user's league, this user's auction draft, NFL players, NFL teams, NFL coaching/schedule/injury/depth-chart context, and the math/strategy of salary-cap drafts. That's it.
If the user asks about ANYTHING else — general trivia, history, coding, other sports outside NFL context, life advice, math homework, current events unrelated to NFL, jokes, recipes, "who invented X", "write me a poem", politics, celebrities (non-NFL), etc. — you refuse in ONE short sentence and pivot back. Example: "I only do fantasy football and your draft — want me to scan the board for value?" Do NOT answer the off-topic question even partially. Do NOT explain why at length. One sentence + pivot. No exceptions, no "just this once," no role-play workarounds. If the user insists, refuse again.
Borderline cases that ARE allowed: NFL news, player off-field stuff that affects availability (suspensions, holdouts, legal trouble), coaching changes, injuries, scheme fit, college background of an NFL player, stadium/weather impact on a game.

You can answer ANY fantasy football question: draft strategy, player takes, sleepers, busts, start/sit logic, dynasty vs redraft, trade ideas, injury impact, schedule, coaching changes, anything. Use real player knowledge.

You have the user's budget settings and the full price sheet. You do NOT have access to live roster or drafted-player data, so never write as if you do.

HOW TO ANSWER "WHAT ARE MY OPTIONS AT [POSITION]?":
This is the most important question type. When the user asks about their options at a position (e.g. "what are my RB options?", "who can I get at WR?", "what QBs fit my budget?"), give them BOTH:
1. **Strategic paths** — name 2 distinct approaches with tradeoffs. Examples: "Spend $40+ on an elite RB now (Stars & Scrubs) vs. wait for $15-20 RBs later (Zero RB)." Be specific to their budget.
2. **Specific players** — for each path, name 2-3 actual players from the Price Sheet that fit the budget. Format: "**Player Name** (~$Y) — one-line reason." Use the projected price only — do NOT print the raw "sheet $X" token.

HOW TO ANSWER FILTERED LIST QUESTIONS (e.g. "top 5 RBs starting at $15", "best WRs under $10", "cheapest QBs", "sleepers at RB"):
- The "Undrafted Price Sheet" block below is your SOURCE OF TRUTH for who is available and what they cost. Do NOT name players from memory for these questions — pull them from that list only.
- Parse the filter precisely:
  - "starting at $X" or "around $X" → going$ within roughly $X-2 to $X+5 (lean to players whose going$ is >= $X).
  - "under $X" / "below $X" → going$ <= X.
  - "at position P" → only rows tagged (P). For "FLEX", include RB/WR/TE.
- Then sort by sheet$ descending (that's the projection rank) and list EXACTLY the number requested.
- Format each line: "1. **Name** (POS, ~$Y) — short reason." Use the projected/going price only. Never print "sheet$X" or "going$X" tokens — those are internal labels.
- If fewer than N players match, say so and list what's there. Never pad with drafted players or made-up names.
- For "sleepers": pull from the Undrafted Price Sheet where going$ is cheap (≤ $8) but sheet$ is meaningfully higher than going$ (value gap), OR a clear upside role (rookie RB1, new WR1, ascending TE). Always name 3-5 real undrafted players from the sheet.
- Double-check every player you name is NOT in the Drafted Players list before sending.

HOW TO ANSWER EVERYTHING ELSE:
- Lead with the answer. One or two sentences max before the reasoning.
- Be direct and opinionated — the user wants a take, not a hedge. ("Love him at that price." "Hard pass." "I'd pivot to RB here.")
- Keep it tight. 3-6 short sentences or a few bullets is the sweet spot. Never write a wall of text.
- Do NOT print a math anchor line (no "Bank $X · max bid $Y · N slots left"). The app shows budget separately — don't repeat it.
- If the user asks a general fantasy question (not draft-specific), just answer it like Berry would on the podcast.
- Markdown is fine (bold, bullets). No headers like "Verdict/Why/Targets" unless the user asks for that format.

HARD RULES:
- NEVER recommend a player who appears in the "Drafted Players" list — they're gone.
- NEVER recommend a max bid that leaves <$1 per remaining slot.
- NEVER use the phrase "still available" or imply you can see the user's live roster. If the draft is not connected, answer from the price sheet without roster-context language.
- If you genuinely don't know something current (recent injury, trade, depth chart change), say so instead of guessing.
- No "good luck!", no closing sign-offs, no emojis.

BUDGET BOARD PROPOSALS (very important):
The user has a manual budget board with one row per roster slot. Each row holds a dollar value and a target-player note. K, DST, and BENCH slots default to $1 and should stay $1 unless the user explicitly asks otherwise.
When the user asks you to build, swap, or rebalance their board (examples: "build me a $225 plan", "swap Bijan for Jacobs", "set RB1 to $30", "make WR1 = Nabers $33"), end your reply with a machine-readable proposal block so the app can show an "Apply to planner" button. Use this EXACT format on its own lines, after your prose answer:

<<<PLANNER_PROPOSAL>>>
{"kind":"full"|"patch","slots":[{"id":"QB-1","dollars":67,"target":"Josh Allen"}, ...],"total":225,"note":"Fits $225 exactly"}
<<<END>>>

Rules for the proposal block:
- "kind":"full" = a complete board (replace every editable slot). "kind":"patch" = only change the slots listed.
- "id" must match a slot id from the "## Budget Board" block below (e.g. "QB-1", "RB-2", "WR-3", "SUPERFLEX-1", "BENCH-3").
- "dollars" is an integer >= 0. "target" is a short player name string (or "").
- Never include locked slots in your proposal — those are already drafted.
- "total" is the sum of all slot dollars in the proposed board. Make it match the user's totalBudget when proposing a full plan.
- Omit the block entirely for pure Q&A or strategy talk where you're not proposing dollar/target changes.`;

interface DraftEventPayload { player: string; position?: string; price: number; drafter: "me" | "other" }
interface EngineDecision {
  player: string;
  position?: string;
  verdict: "BID" | "PASS" | "STOP" | "ONLY IF CHEAP";
  oneLiner: string;
  goUpTo: number;
  stopAt: number;
  anchorPrice: number;
  anchorSource: "sheet" | "league" | "espn" | "none";
  plan: { status: "ok" | "tight" | "broken"; reason: string };
  better: "buy" | "pass" | "tie";
  betterReason: string;
  confidence: "high" | "medium" | "low";
}
interface CoachPayload {
  settings: Record<string, unknown>;
  budget: Record<string, unknown>;
  keepers?: { player: string; position?: string; cost: number }[];
  myRoster?: { player: string; position?: string; price: number; source?: string }[];
  rosterFilled: Record<string, number>;
  rosterRequired: Record<string, number>;
  events: DraftEventPayload[];
  prices: { name: string; price: number; position?: string }[];
  spendByPosition: Record<string, number>;
  recentRuns: { window: number; counts: Record<string, number> };
  latestEvent?: DraftEventPayload;
  userQuestion?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  draftedPlayers?: string[];
  showMath?: boolean;
  strategy?: { id: string; label: string; guidance: string };
  /** Pure-math verdict from the Decision Engine. When present, Coach must
   *  not contradict the verdict, goUpTo, or stopAt — only explain. */
  engineDecision?: EngineDecision;
  /** Live snapshot of the user's budget planner board. */
  budgetBoard?: {
    totalBudget: number;
    slots: { id: string; label: string; group: string; dollars: number; target: string; locked: boolean }[];
  };
}

const MATH_ADDENDUM = ``;

function buildUserMessage(p: CoachPayload): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const draftedSet = new Set<string>([
    ...(p.draftedPlayers ?? []),
    ...(p.events ?? []).map((e) => e.player),
    ...(p.myRoster ?? []).map((m) => m.player),
    ...(p.keepers ?? []).map((k) => k.player),
  ].map((n) => norm(String(n))).filter(Boolean));

  // Market multiplier
  const sheetMap = new Map<string, number>();
  for (const r of (p.prices ?? [])) sheetMap.set(norm(r.name), Number(r.price) || 0);
  let paid = 0, sheet = 0, n = 0;
  for (const e of (p.events ?? [])) {
    const ref = sheetMap.get(norm(e.player));
    if (!ref || ref <= 0) continue;
    paid += Number(e.price) || 0; sheet += ref; n++;
  }
  const mult = n >= 3 && sheet > 0 ? paid / sheet : 1;

  // Undrafted price sheet — full, sorted by sheet $ desc
  const undrafted = (p.prices ?? [])
    .filter((r) => Number(r.price) > 0 && !draftedSet.has(norm(r.name)))
    .sort((a, b) => Number(b.price) - Number(a.price))
    .map((r) => `${r.name}${r.position ? ` (${r.position})` : ""} sheet$${r.price} going$${Math.max(1, Math.round(Number(r.price) * mult))}`);

  const parts: string[] = [];

  parts.push(`## Settings\n${JSON.stringify(p.settings)}`);
  parts.push(`## Budget\n${JSON.stringify(p.budget)}`);
  parts.push(`## Roster (you)\nfilled=${JSON.stringify(p.rosterFilled)}\nrequired=${JSON.stringify(p.rosterRequired)}`);
  if (p.myRoster?.length) {
    parts.push(`## My Roster\n${p.myRoster.map((x) => `${x.player}${x.position ? ` (${x.position})` : ""} $${x.price}`).join("\n")}`);
  }
  parts.push(`## Spend by Position\n${JSON.stringify(p.spendByPosition)}`);
  parts.push(`## Recent picks (last ${p.recentRuns?.window})\n${JSON.stringify(p.recentRuns?.counts)}`);
  parts.push(`## Market Multiplier\nx${mult.toFixed(3)} (samples=${n}) — convert sheet $ to going $`);
  parts.push(`## Drafted Players (FORBIDDEN — never name any of these)\n${Array.from(draftedSet).join(", ") || "(none yet)"}`);
  parts.push(`## Undrafted Price Sheet (FULL list from user's PDF, sorted by sheet $ desc — sleepers/$1-$3 guys are at the bottom)\n${undrafted.join("\n") || "(empty)"}`);
  if (p.budgetBoard) {
    const bb = p.budgetBoard;
    const rows = bb.slots.map((s) =>
      `${s.id}\t${s.label}\t$${s.dollars}\t${s.target || "(no target)"}${s.locked ? "\t[LOCKED-DRAFTED]" : ""}`,
    ).join("\n");
    const total = bb.slots.reduce((a, b) => a + b.dollars, 0);
    parts.push(`## Budget Board (live planner snapshot)\ntotalBudget=$${bb.totalBudget}\nplanned=$${total}\nremaining=$${bb.totalBudget - total}\nid\tlabel\t$\ttarget\n${rows}`);
  }
  if (p.latestEvent) {
    parts.push(`## Latest Event\n${p.latestEvent.drafter === "me" ? "[ME]" : "[OTHER]"} ${p.latestEvent.player}${p.latestEvent.position ? ` (${p.latestEvent.position})` : ""} $${p.latestEvent.price}`);
  }
  if (p.userQuestion) parts.push(`## Question\n${p.userQuestion}`);
  else parts.push(`## Task\nGive verdict for the latest event.`);
  return parts.join("\n\n");
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Per-user rate limit: 12 calls / 60s
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

    // ---------- Optional live web search via Firecrawl ----------
    const q = (payload.userQuestion || "").trim();
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const knownNames = new Set<string>((payload.prices ?? []).map((r) => norm(r.name)).filter(Boolean));
    const pricesCount = (payload.prices ?? []).filter((r) => Number(r.price) > 0).length;
    const decision = FIRECRAWL_API_KEY
      ? decideWebSearch(q, pricesCount, knownNames)
      : { search: false, reason: "Firecrawl not configured" };

    let sources: WebSource[] = [];
    let webContext = "";
    let fcCacheStatus: "hit" | "miss" | "skip" | "error" = "skip";
    const searchQuery = decision.search
      ? `${q} fantasy football 2026 superflex`
      : "";

    if (decision.search && FIRECRAWL_API_KEY) {
      const fcKey = searchQuery.toLowerCase().trim();
      const cached = fcCacheGet(fcKey);
      if (cached) {
        sources = cached;
        fcCacheStatus = "hit";
      } else {
        try {
          const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, limit: 10, tbs: "qdr:w" }),
          });
          if (fcRes.ok) {
            let fc: unknown = null;
            try { fc = await fcRes.json(); } catch (parseErr) {
              console.warn("Firecrawl JSON parse failed", parseErr);
            }
            try {
              sources = parseFirecrawlResults(fc).slice(0, 8);
              fcCacheStatus = "miss";
              if (sources.length) fcCacheSet(fcKey, sources);
            } catch (shapeErr) {
              console.warn("Firecrawl shape parse failed", shapeErr);
              sources = [];
              fcCacheStatus = "error";
            }
          } else {
            console.warn("Firecrawl search failed", fcRes.status, await fcRes.text());
            fcCacheStatus = "error";
          }
        } catch (err) {
          console.warn("Firecrawl error", err);
          fcCacheStatus = "error";
        }
      }
      if (sources.length) {
        webContext = sources
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.description}\nSource: ${r.url}`)
          .join("\n\n");
      }
    }

    // Confidence: PDF is always source of truth. Web is a bonus.
    const draftedCount = (payload.draftedPlayers?.length ?? 0)
      + (payload.events?.length ?? 0)
      + (payload.myRoster?.length ?? 0);
    const pdfWeight = pricesCount > 0 ? 1.0 : 0;
    const webWeight = decision.search ? Math.min(1, sources.length / 3) : 0;
    const blendedScore = Math.min(1, pdfWeight * 0.8 + webWeight * 0.2);
    const confidenceLabel: "high" | "medium" | "low" =
      pricesCount >= 50 ? "high" : pricesCount > 0 ? "medium" : "low";
    const confidence = {
      label: confidenceLabel,
      pdf: Number(pdfWeight.toFixed(2)),
      web: Number(webWeight.toFixed(2)),
      score: Number(blendedScore.toFixed(2)),
      basis: decision.search
        ? `${pricesCount} PDF prices + ${sources.length} web source${sources.length === 1 ? "" : "s"}`
        : `${pricesCount} PDF prices, no web call`,
    };


    const sysBase = SYSTEM_PROMPT + (payload.showMath ? MATH_ADDENDUM : "");
    const strategyAddendum = payload.strategy && payload.strategy.id !== "none"
      ? `\n\nUSER STRATEGY: ${payload.strategy.label}.\n${payload.strategy.guidance}\nIf a recommendation breaks this plan, label it clearly as "this breaks your ${payload.strategy.label} plan" before approving it.`
      : `\n\nUSER STRATEGY: None chosen. Judge bids on raw value and roster gaps. Don't lecture about plans.`;
    const sysWithStrategy = sysBase + strategyAddendum;
    const sysPrompt = webContext
      ? sysWithStrategy +
        `\n\nWEB SEARCH RESULTS — use these to inform your answer when relevant. If you quote or rely on one, cite it inline like "(per ESPN — <url>)" so the user can click through.\n\n${webContext}`
      : sysWithStrategy;
    const messages: { role: string; content: string }[] = [{ role: "system", content: sysPrompt }];
    if (payload.history?.length) {
      for (const h of payload.history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    const userMsg = buildUserMessage(payload);
    messages.push({ role: "user", content: userMsg });

    // Meta envelope sent as the first SSE event so the client can render
    // sources / confidence / debug regardless of whether the body is cached.
    const meta = {
      meta: {
        searched: decision.search,
        searchReason: decision.reason,
        searchQuery,
        firecrawlCache: fcCacheStatus,
        sources,
        confidence,
        debug: {
          undraftedPriceCount: pricesCount,
          draftedCount,
          historyTurns: payload.history?.length ?? 0,
          systemPromptChars: sysPrompt.length,
          userMessageChars: userMsg.length,
          webSnippets: sources.map((s, i) => ({ idx: i + 1, title: s.title, url: s.url, description: s.description })),
        },
      },
    };
    const metaSse = `data: ${JSON.stringify(meta)}\n\n`;

    // 60s response cache keyed by full message stack
    const cacheKey = await hashKey(JSON.stringify(messages));
    const cached = cacheGet(cacheKey);
    if (cached) {
      const sse = metaSse + `data: ${JSON.stringify({ choices: [{ delta: { content: cached } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sse, { headers: { ...cors, "Content-Type": "text/event-stream", "X-Cache": "HIT" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages,
        stream: true,
        max_completion_tokens: 1200,
      }),
    });

    // Graceful SSE fallback — keep the UI consistent (meta + content + [DONE])
    // instead of returning a 500 JSON blob that the streaming client can't render.
    const fallbackSse = (msg: string, status = 200, extraHeaders: Record<string, string> = {}) => {
      const body = metaSse +
        `data: ${JSON.stringify({ choices: [{ delta: { content: msg } }] })}\n\n` +
        `data: [DONE]\n\n`;
      return new Response(body, {
        status,
        headers: { ...cors, ...extraHeaders, "Content-Type": "text/event-stream", "X-Fallback": "1" },
      });
    };

    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) {
        return fallbackSse(
          "⚠️ The AI is rate-limited right now — give it ~30s and ask again. Your price sheet and planner are still loaded.",
          200,
          { "Retry-After": "30" },
        );
      }
      if (resp.status === 402) {
        return fallbackSse(
          "⚠️ AI credits are exhausted on this workspace — top them up in Settings → Workspace → Usage to keep the coach live. Your PDF and planner are still intact.",
        );
      }
      const inputNote = pricesCount === 0
        ? "no PDF prices loaded"
        : `${pricesCount} priced players loaded${decision.search ? `, ${sources.length} web source${sources.length === 1 ? "" : "s"} fetched` : ", web search skipped"}`;
      return fallbackSse(
        `⚠️ Coach AI couldn't generate a reply (gateway error ${resp.status}). Inputs that were available: ${inputNote}. Try again in a moment.`,
      );
    }

    if (!resp.body) {
      return fallbackSse("⚠️ The AI returned an empty response. Try asking again.");
    }
    // Tee stream: forward to client AND accumulate completion for cache
    const [forwardStream, captureStream] = resp.body.tee();
    (async () => {
      try {
        const reader = captureStream.getReader();
        const decoder = new TextDecoder();
        let buf = "", acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buf.indexOf("\n")) !== -1) {
            let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (json === "[DONE]") break;
            try {
              const parsed = JSON.parse(json);
              const c = parsed.choices?.[0]?.delta?.content;
              if (c) acc += c;
            } catch { /* ignore partial */ }
          }
        }
        if (acc.trim().length > 0) cacheSet(cacheKey, acc);
      } catch (err) {
        console.error("cache capture failed", err);
      }
    })();

    // Prepend meta SSE event then pipe model stream.
    const encoder = new TextEncoder();
    const combined = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(metaSse));
        const reader = forwardStream.getReader();
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

    return new Response(combined, { headers: { ...cors, "Content-Type": "text/event-stream", "X-Cache": "MISS" } });

  } catch (e) {
    console.error("coach error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
