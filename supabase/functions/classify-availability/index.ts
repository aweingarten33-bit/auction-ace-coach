// Classifies player availability notes for non-injury risks (suspensions,
// holdouts, legal, PUP/NFI, personal). Used as an LLM tiebreaker when the
// regex layer finds an ambiguous trigger word (e.g. "contract" alone, which
// could be a dispute OR a signed extension).
//
// Returns one classification per input item with a discount factor.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Item {
  id: string;
  name: string;
  status?: string | null;
  note?: string | null;
}

interface Classification {
  id: string;
  missing: boolean;
  reason: string;
  severity: "none" | "low" | "med" | "high";
  factor: number; // multiplier on anchor price
}

const SEVERITY_TO_FACTOR: Record<string, number> = {
  none: 1,
  low: 0.9,
  med: 0.8,
  high: 0.6,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { items } = (await req.json()) as { items: Item[] };
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ classifications: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    const system = `You classify NFL fantasy football player availability notes for an AUCTION DRAFT.
You are looking for NON-INJURY reasons a player may miss real game time:
suspensions (PED/conduct/gambling), holdouts/contract disputes, PUP, NFI,
legal trouble (arrests/charges), personal absences, missed training camp.

DO NOT flag: signed extensions, contract restructures, "no legal issues",
"cleared from PUP", returned to practice, healthy scratches, depth-chart notes.

For each item, output:
- missing: true if the player is likely to miss game time
- reason: short label (e.g. "Suspended 6 games", "Holdout", "PUP", "Legal", "Personal")
- severity: "none" | "low" (camp rust only) | "med" (1-3 games at risk) | "high" (4+ games or season)
- If unclear or note is benign, return missing:false, severity:"none".`;

    const user = `Classify these players. Return EXACTLY one entry per input id.\n\n` +
      items.map((it) => `id=${it.id} name="${it.name}" status="${it.status ?? ""}" note="${(it.note ?? "").slice(0, 500)}"`).join("\n");

    const tool = {
      type: "function",
      function: {
        name: "report_availability",
        description: "Return availability classifications for each player.",
        parameters: {
          type: "object",
          properties: {
            classifications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  missing: { type: "boolean" },
                  reason: { type: "string" },
                  severity: { type: "string", enum: ["none", "low", "med", "high"] },
                },
                required: ["id", "missing", "reason", "severity"],
                additionalProperties: false,
              },
            },
          },
          required: ["classifications"],
          additionalProperties: false,
        },
      },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_availability" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429 || aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI rate/credit limit", classifications: [] }), {
          status: aiResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error", classifications: [] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { classifications: [] };
    const classifications: Classification[] = (args.classifications ?? []).map((c: any) => ({
      id: String(c.id),
      missing: !!c.missing,
      reason: String(c.reason ?? ""),
      severity: (["none", "low", "med", "high"].includes(c.severity) ? c.severity : "none") as Classification["severity"],
      factor: SEVERITY_TO_FACTOR[c.severity] ?? 1,
    }));

    return new Response(JSON.stringify({ classifications }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-availability error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown", classifications: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
