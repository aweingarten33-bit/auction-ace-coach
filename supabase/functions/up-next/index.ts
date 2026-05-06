// Spotify-style "Up Next" queue — returns top 3 target players as structured JSON

const RAW_ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
const ALLOWED_ORIGINS: string[] = RAW_ALLOWED ? RAW_ALLOWED.split(",").map((s) => s.trim()).filter(Boolean) : [];
const ALLOW_HEADERS = "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";
function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.length === 0) return { "Access-Control-Allow-Origin": origin || "*", "Access-Control-Allow-Headers": ALLOW_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Headers": ALLOW_HEADERS, "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
function callerKey(req: Request): string {
  const auth = req.headers.get("authorization") ?? ""; const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) { try { const parts = m[1].split("."); if (parts.length >= 2) { const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))); if (payload?.sub) return `u:${payload.sub}`; } } catch { /* */ } }
  return `ip:${req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon"}`;
}
const BUCKETS = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now(); const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) { BUCKETS.set(key, { count: 1, resetAt: now + windowMs }); return { ok: true as const }; }
  if (b.count >= limit) return { ok: false as const, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count++; return { ok: true as const };
}

const SYSTEM_PROMPT = `You are an elite fantasy football auction draft strategist powering a Spotify-style "Up Next" queue.

You will receive deterministic draft state (budget, slots, max bid, roster gaps, draft log, the user's price sheet, recent runs).

Your ONLY job is to call the emit_queue tool with the THREE best players the user should target RIGHT NOW.

Rules:
- Pick from the user's price sheet when possible. Otherwise use widely known players appropriate for the format.
- NEVER list a player who is already drafted (in the draft log) or already on the user's roster/keepers.
- Each suggested maxBid MUST be <= the user's current max bid AND must leave $1 per remaining slot.
- "matchPct" (0-100) reflects how well the player fits the user's needs RIGHT NOW (positional gap urgency + value vs price sheet + market timing). Higher = better fit.
- "reason" is ONE short punchy line (max ~70 chars). Concrete: positional fit + value angle. No fluff.
- Order the 3 by matchPct descending.
- "openMan" (optional, max ~60 chars): one line on which position the room is sleeping on, if any.

For EACH target also emit (all required):
- "grade" (1-5 integer): consensus quality score for this player at the suggested bid given current draft state. 5 = elite call, 1 = desperate.
- "worstCase" (max ~90 chars): plain-English downside if user PASSES. Must name the realistic next-best player at that position with a $ estimate, and say what it costs the roster in everyday words. Format: "You'll likely settle for <Alt Name> at ~$X, and you'd still be short a starting <POS>." Example: "You'll likely settle for Pollard at ~$14, and you'd still be short a starting RB." No jargon like "starter shorts", "critical", or "leaves N".
- "knockoff" ({ "name": string, "position": same enum, "price": int >= 1 }): a meaningfully cheaper DHgate-style alternative at the SAME position. Knockoff price MUST be < maxBid * 0.6 and >= 1. Pull from the price sheet when possible. If literally no cheaper alternative exists, repeat the player with price = maxBid (rare).
- "dossier" (max ~110 chars): IMDb-style one-liner — role, team if known, key trait, why-now. No fluff.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_queue",
    description: "Emit the top 3 players the user should target next.",
    parameters: {
      type: "object",
      properties: {
        targets: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              position: { type: "string", enum: ["QB", "RB", "WR", "TE", "K", "DST"] },
              matchPct: { type: "integer", minimum: 0, maximum: 100 },
              maxBid: { type: "integer", minimum: 1 },
              reason: { type: "string" },
              grade: { type: "integer", minimum: 1, maximum: 5 },
              worstCase: { type: "string" },
              knockoff: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  position: { type: "string", enum: ["QB", "RB", "WR", "TE", "K", "DST"] },
                  price: { type: "integer", minimum: 1 },
                },
                required: ["name", "position", "price"],
                additionalProperties: false,
              },
              dossier: { type: "string" },
            },
            required: ["name", "position", "matchPct", "maxBid", "reason", "grade", "worstCase", "knockoff", "dossier"],
            additionalProperties: false,
          },
        },
        openMan: { type: "string" },
      },
      required: ["targets"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req: Request) => {
  const corsHeaders = corsFor(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const rl = rateLimit(callerKey(req), 20, 60_000);
  if (!rl.ok) return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec) } });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const p = await req.json();

    // ---- Deterministic pre-compute so the model doesn't have to do math ----
    const norm = (s: string) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const draftedSet = new Set<string>(
      [
        ...((p.events ?? []) as any[]).map((e) => norm(e.player)),
        ...((p.myRoster ?? []) as any[]).map((x) => norm(x.player)),
      ].filter(Boolean),
    );

    // Market multiplier from observed paid vs sheet
    const sheetMap = new Map<string, { price: number; pos?: string }>();
    for (const r of (p.prices ?? []) as any[]) sheetMap.set(norm(r.name), { price: Number(r.price) || 0, pos: r.position });
    let paidSum = 0, sheetSum = 0, n = 0;
    for (const e of (p.events ?? []) as any[]) {
      const ref = sheetMap.get(norm(e.player));
      if (!ref || ref.price <= 0) continue;
      paidSum += Number(e.price) || 0; sheetSum += ref.price; n++;
    }
    const marketMult = n >= 3 && sheetSum > 0 ? paidSum / sheetSum : 1;
    const confident = n >= 8;

    // Per-position fallback board: top 8 undrafted, sorted by sheet price desc, with market-adjusted "going rate"
    const POS_LIST = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
    const fallbackByPos: Record<string, { name: string; sheet: number; going: number }[]> = {};
    for (const pos of POS_LIST) {
      const list = ((p.prices ?? []) as any[])
        .filter((r) => r.position === pos && !draftedSet.has(norm(r.name)) && Number(r.price) > 0)
        .sort((a, b) => Number(b.price) - Number(a.price))
        .slice(0, 8)
        .map((r) => ({
          name: r.name,
          sheet: Number(r.price),
          going: Math.max(1, Math.round(Number(r.price) * marketMult)),
        }));
      fallbackByPos[pos] = list;
    }

    const fallbackText = POS_LIST
      .map((pos) => {
        const rows = fallbackByPos[pos];
        if (!rows.length) return `${pos}: (no undrafted on sheet)`;
        return `${pos}: ${rows.map((r) => `${r.name} sheet$${r.sheet}/going$${r.going}`).join(" | ")}`;
      })
      .join("\n");

    const userMsg = [
      `## Settings\n${JSON.stringify(p.settings)}`,
      `## Budget\n${JSON.stringify(p.budget)}`,
      `## Roster Required\n${JSON.stringify(p.rosterRequired)}`,
      `## Roster Filled (you)\n${JSON.stringify(p.rosterFilled)}`,
      `## Roster Gaps (sorted by urgency)\n${JSON.stringify(p.gaps)}`,
      `## My Roster\n${(p.myRoster ?? []).map((x: any) => `${x.player}${x.position ? ` (${x.position})` : ""} $${x.price}`).join("\n") || "(none)"}`,
      `## Draft Log\n${(p.events ?? []).map((e: any) => `${e.drafter === "me" ? "[ME]" : "[OTHER]"} ${e.player}${e.position ? ` (${e.position})` : ""} $${e.price}`).join("\n") || "(empty)"}`,
      `## Spend by Position\n${JSON.stringify(p.spendByPosition)}`,
      `## Recent Runs (last ${p.recentRuns?.window})\n${JSON.stringify(p.recentRuns?.counts)}`,
      `## Market Multiplier (DETERMINISTIC)\nmultiplier=${marketMult.toFixed(3)} samples=${n} confident=${confident}\n(use this to convert sheet price -> going rate; "going" already pre-computed below)`,
      `## Fallback Board (DETERMINISTIC — undrafted only, top 8 by sheet $ per position, with market-adjusted going$)\n${fallbackText}`,
      `## User Price Sheet (first 100)\n${(p.prices ?? []).slice(0, 100).map((x: any) => `${x.name} $${x.price}`).join("\n") || "(none)"}`,
      `## Watchlist (user pinned — prefer when fit is real)\n${(p.watchlist ?? []).join(", ") || "(none)"}`,
      `## Dismissed (user rejected — DO NOT suggest these)\n${(p.dismissed ?? []).join(", ") || "(none)"}`,
      `## Task\nCall emit_queue with the 3 best targets right now. Never include any name from the Dismissed list.\n\nFor each target's "worstCase": the alternative MUST be the highest-ranked name from the Fallback Board for that POS that is NOT the target itself, and the $ MUST equal that row's "going" value. The gap consequence MUST cite the actual Roster Gaps entry for that POS (severity + starterShort).\n\nFor each target's "knockoff": pull from the same Fallback Board for the same POS where going$ < target.maxBid * 0.6; use the highest-going row that satisfies that. If none qualify, pick the cheapest row on the board for that POS.`,
    ].join("\n\n");


    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_queue" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("up-next gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      console.error("no tool call", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return queue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(call.function.arguments);

    // ---- Server-side enforcement of DHgate knockoff rules ----
    // Knockoff MUST: come from the user's price sheet, match the target's
    // position, not be drafted, not be the target itself, and have
    // price < maxBid * 0.6. If the AI violates any rule we overwrite with the
    // best deterministic candidate from fallbackByPos. If none exist we
    // gracefully drop knockoff and set knockoffNote.
    if (Array.isArray(parsed?.targets)) {
      for (const t of parsed.targets) {
        const pos = t?.position as string | undefined;

        // ---- Snap maxBid to deterministic going-price ----
        // The model picks WHO to target; the $ comes from sheet × marketMult so
        // the user sees the same number on every refresh. Falls back to AI value
        // only when the player isn't on the sheet.
        const sheetRef = sheetMap.get(norm(t?.name ?? ""));
        if (sheetRef && sheetRef.price > 0) {
          t.maxBid = Math.max(1, Math.round(sheetRef.price * marketMult));
        }

        const maxBid = Number(t?.maxBid) || 0;
        const ceiling = maxBid * 0.6;
        const ceilingFloor = Math.max(0, Math.floor(ceiling));
        const board = (pos && fallbackByPos[pos]) ? fallbackByPos[pos] : [];

        const eligible = board.filter(
          (r) =>
            norm(r.name) !== norm(t?.name ?? "") &&
            !draftedSet.has(norm(r.name)) &&
            r.going > 0 &&
            r.going < ceiling,
        );

        const ko = t?.knockoff;
        const koValid =
          ko &&
          typeof ko.name === "string" &&
          ko.position === pos &&
          Number(ko.price) > 0 &&
          Number(ko.price) < ceiling &&
          norm(ko.name) !== norm(t?.name ?? "") &&
          !draftedSet.has(norm(ko.name)) &&
          sheetMap.has(norm(ko.name));

        if (koValid) {
          const boardRow = board.find((r) => norm(r.name) === norm(ko.name));
          if (boardRow) ko.price = boardRow.going;
        } else if (eligible.length > 0) {
          const best = eligible.sort((a, b) => b.going - a.going)[0];
          t.knockoff = { name: best.name, position: pos, price: best.going };
          t.knockoffSource = "server-enforced";
        } else {
          delete t.knockoff;
          t.knockoffNote = `No ${pos} alt under $${ceilingFloor} on your sheet`;
        }
      }
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("up-next error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
