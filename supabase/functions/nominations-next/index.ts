// Predict next 10 likely NOMINATED players (by anyone in the room) with confidence + signal breakdown.
// Uses deterministic signals: position runs, tier breaks, who's hoarding what, recent paid-vs-sheet,
// then asks the model to pick exact names from the user's price sheet via a tool call.
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
const corsHeaders = { /* legacy alias kept for minimal diff */ };

const SYSTEM_PROMPT = `You are an elite fantasy football auction draft strategist.

Your ONLY job is to predict the NEXT 10 PLAYERS LIKELY TO BE NOMINATED in the room (by ANY team, including the user). This is about NOMINATION ORDER — who is about to get thrown out for bidding — not who the user should target.

You receive deterministic draft state: budget snapshot, every team's apparent roster gaps, recent picks, position runs, market multiplier, and a per-position "fallback board" of the top undrafted players by sheet $.

Heuristics for nomination prediction (apply in order):
1. Tier-break urgency: when only a couple of elite players remain at a hot position, somebody nominates one to force the bid war.
2. Position runs: if the last 3-5 picks were heavy on one position, expect the run to continue OR a hard pivot to a thin position someone is hoarding budget for.
3. Budget pressure: teams with big budget left tend to nominate elites; teams short on cash nominate cheap fillers (K/DST/handcuffs) to drain others.
4. Roster needs across the room: positions where MULTIPLE teams still need a starter get nominated sooner.
5. The user's own likely next nomination counts too — include it if it scores high.

For EACH of the 10 predictions, call emit_nominations with:
- "name": exact name from the price sheet when possible. Otherwise a widely-known undrafted player who fits.
- "position": one of QB/RB/WR/TE/K/DST.
- "confidence" (0-100 integer): how sure you are this is one of the next 10 nominated. Higher = stronger signal.
- "expectedBid" (integer >= 1): what you think they'll go for given the market multiplier (NOT a recommendation — a forecast).
- "reason" (max ~90 chars): one punchy line citing the SPECIFIC signal. Concrete.
- "trigger" (max ~50 chars): a short label for the dominant signal. e.g. "Last RB1 standing", "QB run continues", "Bid drainer".
- "signals" object with three integer scores 0-100:
   * "trend": how strongly recent runs / room momentum push this nomination. High when a position run is active or the player is in a hot tier.
   * "value": market value strength — high when sheet $ is high relative to going rate (bargain risk forces nomination), or when a tier-break creates a forced bid.
   * "rosterNeed": how many teams in the room still need this position as a starter. High = multiple open slots league-wide.

Order by confidence DESCENDING. Earlier picks should have higher confidence than later picks.

Hard rules:
- NEVER predict a player who is already in the draft log or on the user's roster/keepers.
- expectedBid must respect market reality (sheet $ * market multiplier ~).
- 10 distinct players. Spread positions if signals are mixed; cluster positions if a real run is on.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_nominations",
    description: "Emit the 10 most likely next nominations.",
    parameters: {
      type: "object",
      properties: {
        nominations: {
          type: "array",
          minItems: 10,
          maxItems: 10,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              position: { type: "string", enum: ["QB", "RB", "WR", "TE", "K", "DST"] },
              confidence: { type: "integer", minimum: 0, maximum: 100 },
              expectedBid: { type: "integer", minimum: 1 },
              reason: { type: "string" },
              trigger: { type: "string" },
              signals: {
                type: "object",
                properties: {
                  trend: { type: "integer", minimum: 0, maximum: 100 },
                  value: { type: "integer", minimum: 0, maximum: 100 },
                  rosterNeed: { type: "integer", minimum: 0, maximum: 100 },
                },
                required: ["trend", "value", "rosterNeed"],
                additionalProperties: false,
              },
            },
            required: ["name", "position", "confidence", "expectedBid", "reason", "trigger", "signals"],
            additionalProperties: false,
          },
        },
        roomRead: { type: "string", description: "One-line read on the room's mood/tempo. Optional, ~80 chars max." },
      },
      required: ["nominations"],
      additionalProperties: false,
    },
  },
};


Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const p = await req.json();

    const norm = (s: string) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const draftedSet = new Set<string>(
      [
        ...((p.events ?? []) as any[]).map((e) => norm(e.player)),
        ...((p.myRoster ?? []) as any[]).map((x) => norm(x.player)),
      ].filter(Boolean),
    );

    // Market multiplier
    const sheetMap = new Map<string, { price: number; pos?: string }>();
    for (const r of (p.prices ?? []) as any[])
      sheetMap.set(norm(r.name), { price: Number(r.price) || 0, pos: r.position });
    let paidSum = 0, sheetSum = 0, nMatched = 0;
    for (const e of (p.events ?? []) as any[]) {
      const ref = sheetMap.get(norm(e.player));
      if (!ref || ref.price <= 0) continue;
      paidSum += Number(e.price) || 0; sheetSum += ref.price; nMatched++;
    }
    const marketMult = nMatched >= 3 && sheetSum > 0 ? paidSum / sheetSum : 1;

    // Filter inputs (optional from client)
    const filters = (p.filters ?? {}) as {
      positions?: string[];
      tier?: "elite" | "starter" | "depth" | "any";
      priceMin?: number;
      priceMax?: number;
    };
    const posFilter = Array.isArray(filters.positions) && filters.positions.length
      ? new Set(filters.positions.map((s: string) => String(s).toUpperCase()))
      : null;
    const priceMin = Number.isFinite(filters.priceMin) ? Number(filters.priceMin) : null;
    const priceMax = Number.isFinite(filters.priceMax) ? Number(filters.priceMax) : null;
    const tier = filters.tier && filters.tier !== "any" ? filters.tier : null;

    // Fallback board per position — top 12 undrafted by sheet, with going$
    const POS_LIST = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
    const fallbackByPos: Record<string, { name: string; sheet: number; going: number }[]> = {};
    for (const pos of POS_LIST) {
      let list = ((p.prices ?? []) as any[])
        .filter((r) => r.position === pos && !draftedSet.has(norm(r.name)) && Number(r.price) > 0)
        .sort((a, b) => Number(b.price) - Number(a.price));
      // tier slicing on the position list (rough: top 4 elite, next 8 starter, rest depth)
      if (tier === "elite") list = list.slice(0, 4);
      else if (tier === "starter") list = list.slice(4, 12);
      else if (tier === "depth") list = list.slice(12, 30);
      else list = list.slice(0, 12);
      const mapped = list.map((r) => ({
        name: r.name,
        sheet: Number(r.price),
        going: Math.max(1, Math.round(Number(r.price) * marketMult)),
      }));
      const priced = mapped.filter((r) => {
        if (priceMin != null && r.going < priceMin) return false;
        if (priceMax != null && r.going > priceMax) return false;
        return true;
      });
      fallbackByPos[pos] = posFilter && !posFilter.has(pos) ? [] : priced;
    }

    // Tier-break detection: gap between #1 and #2 undrafted at each position
    const tierBreaks: { pos: string; topName: string; topGoing: number; gap: number }[] = [];
    for (const pos of POS_LIST) {
      const rows = fallbackByPos[pos];
      if (rows.length >= 2) {
        const gap = rows[0].going - rows[1].going;
        if (gap >= 5) tierBreaks.push({ pos, topName: rows[0].name, topGoing: rows[0].going, gap });
      } else if (rows.length === 1) {
        tierBreaks.push({ pos, topName: rows[0].name, topGoing: rows[0].going, gap: rows[0].going });
      }
    }

    const fallbackText = POS_LIST
      .map((pos) => {
        const rows = fallbackByPos[pos];
        if (!rows.length) return `${pos}: (no undrafted on sheet)`;
        return `${pos}: ${rows.map((r) => `${r.name} sheet$${r.sheet}/going$${r.going}`).join(" | ")}`;
      })
      .join("\n");

    const tierBreakText = tierBreaks.length
      ? tierBreaks.map((t) => `${t.pos}: ${t.topName} ($${t.topGoing}) — gap to next: $${t.gap}`).join("\n")
      : "(no significant tier breaks)";

    const userMsg = [
      `## Settings\n${JSON.stringify(p.settings)}`,
      `## Budget (you)\n${JSON.stringify(p.budget)}`,
      `## Roster Required\n${JSON.stringify(p.rosterRequired)}`,
      `## Roster Filled (you)\n${JSON.stringify(p.rosterFilled)}`,
      `## Roster Gaps (you, sorted by urgency)\n${JSON.stringify(p.gaps)}`,
      `## Draft Log (every pick so far, all teams)\n${(p.events ?? []).map((e: any) => `${e.drafter === "me" ? "[ME]" : "[OTHER]"} ${e.player}${e.position ? ` (${e.position})` : ""} $${e.price}`).join("\n") || "(empty)"}`,
      `## Spend by Position (across the room)\n${JSON.stringify(p.spendByPosition)}`,
      `## Recent Runs (last ${p.recentRuns?.window} picks)\n${JSON.stringify(p.recentRuns?.counts)}`,
      `## Market Multiplier\nmultiplier=${marketMult.toFixed(3)} samples=${nMatched}\n(sheet $ x multiplier = realistic going $)`,
      `## Tier Breaks (DETERMINISTIC — large gap between #1 undrafted and #2 at this position)\n${tierBreakText}`,
      `## Fallback Board (DETERMINISTIC — top undrafted per position)\n${fallbackText}`,
      `## Watchlist (user pinned)\n${(p.watchlist ?? []).join(", ") || "(none)"}`,
      `## User Filters (HARD CONSTRAINTS — every prediction MUST satisfy these)\npositions: ${posFilter ? Array.from(posFilter).join(",") : "any"}\ntier: ${tier ?? "any"}\nprice range (going $): ${priceMin ?? "-∞"} to ${priceMax ?? "+∞"}\nIf the Fallback Board is empty due to filters, return the closest 10 candidates that still satisfy the position/tier filter, ignoring the price band as last resort and noting it in roomRead.`,
      `## Task\nCall emit_nominations with the 10 players MOST LIKELY to be nominated next, ordered by confidence DESCENDING. For each, fill in signals.trend / signals.value / signals.rosterNeed (each 0-100) so the user can see WHY. Cite the dominant signal in reason+trigger. Predictions must be undrafted players from the Fallback Board when possible.`,
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
        tool_choice: { type: "function", function: { name: "emit_nominations" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("nominations-next gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      console.error("no tool call", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return predictions" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(call.function.arguments);

    // Filter out any predictions that are already drafted (defensive)
    if (Array.isArray(parsed?.nominations)) {
      parsed.nominations = parsed.nominations.filter((n: any) => n?.name && !draftedSet.has(norm(n.name)));
    }

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("nominations-next error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
