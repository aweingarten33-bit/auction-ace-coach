// Parse a fantasy auction price sheet (PDF, image, or pasted text) into structured player/price pairs
// using Gemini multimodal via the Lovable AI gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a fantasy football auction price-sheet parser.
You will receive a PDF, image, or text containing player names and dollar values from an auction draft.
Extract EVERY player you can confidently identify with a price.
- "Price" can be the player's projected auction value, last year's winning bid, or current ADP $ — whichever is present.
- Skip team rows, totals, headers, kickers/defenses if no $.
- Normalize names: "Hurts, Jalen" → "Jalen Hurts". Keep team abbreviations OUT of the name.
- If a player has multiple numbers (e.g. projected $ and actual $), prefer the auction value / cost / bid number.
- Round prices to whole dollars.
Return ONLY via the tool call. Do not include commentary.`;

const TOOL = {
  type: "function",
  function: {
    name: "submit_players",
    description: "Submit the extracted players and prices.",
    parameters: {
      type: "object",
      properties: {
        players: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Full player name, e.g. 'Jalen Hurts'" },
              position: { type: "string", description: "QB|RB|WR|TE|K|DST if known, else empty", enum: ["QB", "RB", "WR", "TE", "K", "DST", ""] },
              price: { type: "integer", description: "Whole-dollar price" },
            },
            required: ["name", "price"],
          },
        },
      },
      required: ["players"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { fileBase64, mimeType, text } = await req.json() as {
      fileBase64?: string;
      mimeType?: string;
      text?: string;
    };

    if (!fileBase64 && !text) {
      return new Response(JSON.stringify({ error: "Provide fileBase64+mimeType or text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent: any[] = [
      { type: "text", text: "Extract every player + price from this auction draft sheet." },
    ];
    if (fileBase64 && mimeType) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mimeType};base64,${fileBase64}` },
      });
    }
    if (text) {
      userContent.push({ type: "text", text: `\n\nRAW TEXT:\n${text}` });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userContent },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_players" } },
        max_tokens: 8000,
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await resp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "No structured output" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const args = JSON.parse(call.function.arguments || "{}");
    const players = (args.players || []).filter((p: any) => p.name && Number.isFinite(p.price) && p.price > 0);

    return new Response(JSON.stringify({ players }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-price-sheet error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
