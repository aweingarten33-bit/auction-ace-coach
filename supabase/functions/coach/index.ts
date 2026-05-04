// Auction Draft AI Coach - streams strategy advice based on deterministic state
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an elite fantasy football auction draft coach giving real-time guidance during a LIVE auction draft.

You will receive a deterministic snapshot of draft state computed by the client (budget, slots remaining, max bid, keepers, current roster, roster filled, full draft log, position spend, recent runs, the user's own price sheet, and league context).

Your job, after every event or question, is to respond conversationally but SHARP and DIRECT. Your response must:

1. STATE THE MATH FIRST. Always lead with the current budget summary in 1-2 short lines:
   "You have $X left with Y spots open. Max bid: $Z. Avg/slot: $A."

2. ANALYZE THE MARKET. Note any positional runs, inflation vs the user's price sheet, or spending patterns relevant right now.

3. ANALYZE TEAM NEEDS. Briefly call out remaining roster gaps and where the team is strong/weak.

4. STRATEGY RECOMMENDATION. Tell the user clearly:
   - Which position(s) to target next and WHY
   - A specific max bid range for the next target
   - Whether to pivot strategy if the original plan is no longer realistic

5. SLEEPER / VALUE SUGGESTIONS. Suggest 1-3 specific players (use names from the user's price sheet when possible, otherwise widely known names appropriate for the format). Include short reasoning for each — never just a name.

HARD RULES:
- NEVER recommend a bid that would leave the user unable to fill remaining slots ($1 minimum each).
- NEVER suggest impossible builds. Enforce budget discipline.
- BE TERSE. Coach-speak, not essay. Bullet structure preferred. No fluff, no preamble.
- Use short Markdown: **bold** the key numbers and recommendations, simple bullet lists.
- Adapt as the draft unfolds — if the original plan breaks, say so explicitly and pivot.
- Account for league type (Superflex/2QB inflates QB cost) and scoring (PPR boosts pass-catchers).
- Treat keepers as already rostered players with locked-in costs. In dynasty/keeper leagues, mention their names/positions when they materially change needs.

Format the entire response in clean markdown. Aim for 8-15 short lines total.`;

interface CoachPayload {
  settings: any;
  budget: any;
  keepers?: any[];
  myRoster?: any[];
  rosterFilled: any;
  rosterRequired: any;
  events: any[];
  prices: { name: string; price: number }[];
  spendByPosition: Record<string, number>;
  recentRuns: { window: number; counts: Record<string, number> };
  latestEvent?: any;
  userQuestion?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

function buildUserMessage(p: CoachPayload): string {
  const parts: string[] = [];
  parts.push(`## League Settings\n${JSON.stringify(p.settings, null, 2)}`);
  parts.push(`## Budget State\n${JSON.stringify(p.budget, null, 2)}`);
  if (p.keepers?.length) {
    parts.push(
      `## User Keepers - already rostered, count toward budget and roster slots\n${p.keepers
        .map((k: any) => `${k.player}${k.position ? ` (${k.position})` : ""} - $${k.cost}`)
        .join("\n")}`
    );
  }
  if (p.myRoster?.length) {
    parts.push(
      `## User Current Roster (keepers + drafted players)\n${p.myRoster
        .map((x: any) => `[${x.source ?? "roster"}] ${x.player}${x.position ? ` (${x.position})` : ""} - $${x.price}`)
        .join("\n")}`
    );
  }
  parts.push(
    `## Roster\nRequired: ${JSON.stringify(p.rosterRequired)}\nFilled by user: ${JSON.stringify(p.rosterFilled)}`
  );
  parts.push(`## Spend By Position (entire draft)\n${JSON.stringify(p.spendByPosition)}`);
  parts.push(
    `## Recent Picks (last ${p.recentRuns.window})\n${JSON.stringify(p.recentRuns.counts)}`
  );
  if (p.prices?.length) {
    parts.push(
      `## User's Price Sheet (first 80)\n${p.prices
        .slice(0, 80)
        .map((x) => `${x.name} - $${x.price}`)
        .join("\n")}`
    );
  }
  if (p.events?.length) {
    parts.push(
      `## Draft Log (chronological)\n${p.events
        .map(
          (e: any) =>
            `${e.drafter === "me" ? "[ME]" : "[OTHER]"} ${e.player}${e.position ? ` (${e.position})` : ""} - $${e.price}`
        )
        .join("\n")}`
    );
  }
  if (p.latestEvent) {
    parts.push(
      `## Latest Event\n${p.latestEvent.drafter === "me" ? "[ME]" : "[OTHER]"} ${p.latestEvent.player}${p.latestEvent.position ? ` (${p.latestEvent.position})` : ""} - $${p.latestEvent.price}`
    );
  }
  if (p.userQuestion) {
    parts.push(`## User Question\n${p.userQuestion}`);
  } else {
    parts.push(`## Task\nGive your live coaching response now based on the latest event.`);
  }
  return parts.join("\n\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const payload = (await req.json()) as CoachPayload;

    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    if (payload.history?.length) {
      for (const h of payload.history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    messages.push({ role: "user", content: buildUserMessage(payload) });

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("coach error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
