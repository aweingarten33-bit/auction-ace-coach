// Spotify-style "Up Next" queue — returns top 3 target players as structured JSON
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
- "worstCase" (max ~50 chars): one-line MiniMax-style downside if the user PASSES on this player (who/what they'd be stuck with).
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
            },
            required: ["name", "position", "matchPct", "maxBid", "reason"],
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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
    const p = await req.json();

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
      `## User Price Sheet (first 100)\n${(p.prices ?? []).slice(0, 100).map((x: any) => `${x.name} $${x.price}`).join("\n") || "(none)"}`,
      `## Watchlist (user pinned — prefer when fit is real)\n${(p.watchlist ?? []).join(", ") || "(none)"}`,
      `## Dismissed (user rejected — DO NOT suggest these)\n${(p.dismissed ?? []).join(", ") || "(none)"}`,
      `## Task\nCall emit_queue with the 3 best targets right now. Never include any name from the Dismissed list.`,
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
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("up-next error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
