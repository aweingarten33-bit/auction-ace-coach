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
    // evict oldest
    const oldest = [...CACHE.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }
}

function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) { BUCKETS.set(key, { count: 1, resetAt: now + windowMs }); return { ok: true as const }; }
  if (b.count >= limit) return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count++; return { ok: true as const };
}

// ---------- Matthew Berry-style fantasy expert prompt ----------
const SYSTEM_PROMPT = `You are a fantasy football expert in the mold of Matthew Berry and the ESPN Fantasy Focus crew. Conversational, confident, a little fun — but always useful. The user is mid-draft and has limited time, so get to the point fast.

You can answer ANY fantasy football question: draft strategy, player takes, sleepers, busts, start/sit logic, dynasty vs redraft, trade ideas, injury impact, schedule, coaching changes, anything. Use real player knowledge.

You ALSO have access to live draft state when available (budget, roster, drafted players, price sheet). Use it when relevant — but don't force the calculator format on every answer.

HOW TO ANSWER:
- Lead with the answer. One or two sentences max before the reasoning.
- Be direct and opinionated — the user wants a take, not a hedge. ("Love him at that price." "Hard pass." "I'd pivot to RB here.")
- Keep it tight. 3-6 short sentences or a few bullets is the sweet spot. Never write a wall of text.
- EVERY bid recommendation MUST end with a one-line math anchor in italics, in EXACTLY this format: *(Bank $X · max bid $Y · N slots left)* — pull X, Y, N from the Budget block. Do not break this into multiple bullets or sections.
- If the user asks a general fantasy question (not draft-specific), just answer it like Berry would on the podcast.
- Markdown is fine (bold, bullets). No headers like "Verdict/Why/Targets" unless the user asks for that format.

HARD RULES:
- NEVER recommend a player who appears in the "Drafted Players" list — they're gone.
- NEVER recommend a max bid above the user's stated max bid or one that leaves <$1 per remaining slot.
- If you genuinely don't know something current (recent injury, trade, depth chart change), say so instead of guessing.
- No "good luck!", no closing sign-offs, no emojis.`;

interface DraftEventPayload { player: string; position?: string; price: number; drafter: "me" | "other" }
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
  parts.push(`## Undrafted Price Sheet (full, sorted by sheet $ desc)\n${undrafted.slice(0, 200).join("\n") || "(empty)"}`);
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
    let webContext = "";
    const q = (payload.userQuestion || "").trim();
    const shouldSearch = !!FIRECRAWL_API_KEY && q.length > 0 && q.split(/\s+/).length >= 3;
    if (shouldSearch) {
      try {
        const searchQuery = `${q} fantasy football 2026 ESPN OR FantasyPros OR "Matthew Berry"`;
        const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery, limit: 3, tbs: "qdr:m" }),
        });
        if (fcRes.ok) {
          const fc = await fcRes.json();
          const results = (fc?.data ?? fc?.web ?? []).slice(0, 3);
          if (results.length) {
            webContext = results
              .map((r: { url?: string; title?: string; description?: string }, i: number) =>
                `[${i + 1}] ${r.title || ""}\n${r.description || ""}\nSource: ${r.url || ""}`,
              )
              .join("\n\n");
          }
        } else {
          console.warn("Firecrawl search failed", fcRes.status, await fcRes.text());
        }
      } catch (err) {
        console.warn("Firecrawl error", err);
      }
    }

    const sysBase = SYSTEM_PROMPT + (payload.showMath ? MATH_ADDENDUM : "");
    const sysPrompt = webContext
      ? sysBase +
        `\n\nWEB SEARCH RESULTS — use these to inform your answer when relevant. If you quote or rely on one, cite it inline like "(per ESPN — <url>)" so the user can click through.\n\n${webContext}`
      : sysBase;
    const messages: { role: string; content: string }[] = [{ role: "system", content: sysPrompt }];
    if (payload.history?.length) {
      for (const h of payload.history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    const userMsg = buildUserMessage(payload);
    messages.push({ role: "user", content: userMsg });

    // 60s response cache keyed by full message stack
    const cacheKey = await hashKey(JSON.stringify(messages));
    const cached = cacheGet(cacheKey);
    if (cached) {
      const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: cached } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sse, { headers: { ...cors, "Content-Type": "text/event-stream", "X-Cache": "HIT" } });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: true,
        max_tokens: 600,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit upstream" }), { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...cors, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!resp.body) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
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

    return new Response(forwardStream, { headers: { ...cors, "Content-Type": "text/event-stream", "X-Cache": "MISS" } });
  } catch (e) {
    console.error("coach error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
