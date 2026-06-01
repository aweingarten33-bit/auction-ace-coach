// Grounded news check for flagged players. Uses Lovable AI with Google Search
// grounding to find recent (last 30 days) news affecting fantasy availability:
// suspension, holdout, season-ending injury, retirement, trade, depth-chart demotion.
//
// Hard guardrails:
// - Tool-call output only (schema-enforced)
// - Requires source_url; result discarded without one
// - Confidence floor — only "high" returns a discount
// - Math anchor is the ceiling — this can only subtract value
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlayerInput {
  id: string;
  name: string;
  position?: string | null;
  team?: string | null;
  trigger: string; // why we flagged them — for prompt context
}

interface NewsResult {
  id: string;
  missing_games: boolean;
  reason: string;
  weeks_out: number | null;
  confidence: "low" | "med" | "high";
  source_url: string;
  factor: number; // 1 = no change, <1 = discount
}

// Map (severity → discount). Only applied when confidence === "high".
const factorFor = (reason: string, weeks: number | null): number => {
  const r = reason.toLowerCase();
  if (r.includes("retire")) return 0.05;
  if (r.includes("season-ending") || r.includes("season ending") || r.includes("ir")) return 0.15;
  if (r.includes("suspen")) {
    if (weeks && weeks >= 6) return 0.4;
    if (weeks && weeks >= 3) return 0.6;
    return 0.7;
  }
  if (r.includes("surgery") || r.includes("torn") || r.includes("acl") || r.includes("achilles")) return 0.4;
  if (r.includes("holdout") || r.includes("hold-in")) return 0.8;
  if (r.includes("trade")) return 0.85; // trades can hurt or help — be light
  if (r.includes("demot") || r.includes("benched")) return 0.6;
  return 0.85;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { players } = (await req.json()) as { players: PlayerInput[] };
    if (!Array.isArray(players) || players.length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");

    // Cap to 30 to control cost — caller should pre-filter to flagged subset.
    const batch = players.slice(0, 30);

    const system = `You check current news for NFL fantasy auction drafts.
For each player, decide if they will MISS REGULAR-SEASON GAMES due to:
suspension, holdout, season-ending injury, surgery (4+ weeks recovery),
retirement, recent trade, or depth-chart demotion.

DO NOT flag for: weather, weekly questionable tags, day-to-day issues,
contract extensions, restructures, normal training camp absences.

Use Google Search to find news from the LAST 30 DAYS. If you cannot find
a credible recent source, set confidence:"low" and missing_games:false.

For each player return: id, missing_games (bool), reason (short, e.g.
"6-game PED suspension"), weeks_out (number or null), confidence
("low"|"med"|"high"), source_url (a real URL you found, or "" if none).

ONLY confidence:"high" results will be applied. Be conservative.`;

    const userMsg =
      `Check these players. Return ONE entry per id.\n\n` +
      batch
        .map(
          (p) =>
            `id=${p.id} | ${p.name} (${p.position ?? "?"}, ${p.team ?? "?"}) | flag_reason: ${p.trigger}`,
        )
        .join("\n");

    const tool = {
      type: "function",
      function: {
        name: "report_news",
        description: "Report recent fantasy-relevant news per player.",
        parameters: {
          type: "object",
          properties: {
            results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  missing_games: { type: "boolean" },
                  reason: { type: "string" },
                  weeks_out: { type: ["number", "null"] },
                  confidence: { type: "string", enum: ["low", "med", "high"] },
                  source_url: { type: "string" },
                },
                required: ["id", "missing_games", "reason", "weeks_out", "confidence", "source_url"],
                additionalProperties: false,
              },
            },
          },
          required: ["results"],
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
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_news" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI error", aiResp.status, t);
      const status = aiResp.status === 429 || aiResp.status === 402 ? aiResp.status : 500;
      return new Response(JSON.stringify({ error: "AI unavailable", results: [] }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { results: [] };

    const results: NewsResult[] = (args.results ?? [])
      .map((r: any): NewsResult | null => {
        const confidence = ["low", "med", "high"].includes(r.confidence) ? r.confidence : "low";
        const hasSource = typeof r.source_url === "string" && /^https?:\/\//i.test(r.source_url);
        // GUARDRAIL: only apply discount when high-confidence AND has a real source
        const apply = r.missing_games && confidence === "high" && hasSource;
        return {
          id: String(r.id),
          missing_games: !!r.missing_games,
          reason: String(r.reason || ""),
          weeks_out: typeof r.weeks_out === "number" ? r.weeks_out : null,
          confidence,
          source_url: hasSource ? r.source_url : "",
          factor: apply ? factorFor(r.reason || "", typeof r.weeks_out === "number" ? r.weeks_out : null) : 1,
        };
      })
      .filter(Boolean);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-player-news error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown", results: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
