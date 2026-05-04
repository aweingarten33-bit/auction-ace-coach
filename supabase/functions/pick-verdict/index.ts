// Pick Verdict — returns a structured decision card for a candidate pick
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an elite fantasy football auction draft analyst. You evaluate a CANDIDATE PICK (player + proposed price + drafter) against the live draft state and return a structured verdict.

You MUST call the "emit_verdict" tool exactly once with a sharp, decisive evaluation. Do not return prose.

Verdict semantics:
- STEAL: well below fair value, jump on it
- BID: fair value, fits roster, recommend bidding up to maxBid
- PASS: fits, but not at this price — let someone else have it
- TRAP: do NOT bid; bad fit, overpriced, or wrecks budget/roster math

Rules:
- Respect the user's price sheet as their fair-value baseline.
- maxBid MUST never leave the user unable to fill remaining slots ($1 minimum each).
- For "other team" picks, frame factors from the user's perspective (does this help/hurt them?), set verdict to PASS or TRAP based on whether the user should have outbid.
- Each factor: short phrase, max 8 words. 2–4 aggravating, 2–4 mitigating.
- missingInfo: 0–3 items the user could tell you to sharpen the call (e.g., "your tier for this player").
- rationale: ONE sentence, max 18 words.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_verdict",
    description: "Emit a structured verdict for the candidate pick.",
    parameters: {
      type: "object",
      properties: {
        verdict: { type: "string", enum: ["STEAL", "BID", "PASS", "TRAP"] },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        maxBid: { type: "integer", minimum: 1 },
        riskLevel: { type: "string", enum: ["low", "moderate", "high"] },
        aggravating: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        mitigating: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 4 },
        missingInfo: { type: "array", items: { type: "string" }, maxItems: 3 },
        rationale: { type: "string" },
      },
      required: ["verdict", "confidence", "maxBid", "riskLevel", "aggravating", "mitigating", "rationale"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const payload = await req.json();
    const userMsg = `## Candidate Pick
Player: ${payload.candidate?.player ?? "(unknown)"}
Position: ${payload.candidate?.position ?? "(unknown)"}
Proposed Price: $${payload.candidate?.price ?? "?"}
Drafter: ${payload.candidate?.drafter === "me" ? "USER (me)" : "OTHER team"}

## Budget
${JSON.stringify(payload.budget, null, 2)}

## League Settings
${JSON.stringify(payload.settings, null, 2)}

## Roster Required vs Filled (user)
Required: ${JSON.stringify(payload.rosterRequired)}
Filled: ${JSON.stringify(payload.rosterFilled)}

## Spend by Position (entire draft)
${JSON.stringify(payload.spendByPosition)}

## Recent Runs (last ${payload.recentRuns?.window})
${JSON.stringify(payload.recentRuns?.counts)}

## User's Price Sheet (top 60)
${(payload.prices ?? []).slice(0, 60).map((x: any) => `${x.name} - $${x.price}`).join("\n")}

## Recent Draft Log (last 15)
${(payload.events ?? []).slice(-15).map((e: any) =>
  `${e.drafter === "me" ? "[ME]" : "[OTHER]"} ${e.player}${e.position ? ` (${e.position})` : ""} - $${e.price}`
).join("\n")}

Return your verdict via the emit_verdict tool now.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_verdict" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No verdict returned" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const verdict = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(verdict), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pick-verdict error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
