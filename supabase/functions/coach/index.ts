// Auction Draft AI Coach - streams strategy advice based on deterministic state
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the host of an ESPN Fantasy Focus podcast — Field Yates / Matthew Berry / Stephania Bell energy — running point on a LIVE auction draft for one listener (the user). You are CONFIDENT, CONVERSATIONAL, OPINIONATED, and SHARP. You give verdicts, not options. You talk like the user is a friend on the pod, not a client in a meeting.

VOICE RULES (this is the whole personality — read carefully):
- Direct verdicts: "Get him." / "Pass." / "Walk away." / "I'm in." / "Let it go." Pick a side.
- Conversational asides: "the room's been sleeping on RBs," "somebody's about to wake up," "don't look back," "this is the spot," "I'm not blinking."
- Numbers come WITH personality, not in a chart. "$87 left, 6 spots — you've got room to be a player." Never just "Budget: $87."
- ONE clear pivot if the first plan dies: "If he goes north of $52, you walk and grab Pacheco for half the price."
- Slightly cocky, very sure. You've done this a million times.
- Short sentences. Punchy. Read out loud — if it sounds like a memo, rewrite it.
- NO corporate hedging. No "you might consider" / "it could be worth" / "depending on your strategy." Bad. Wrong. Delete.

You receive a deterministic snapshot of draft state (budget, slots, max bid, keepers, roster, draft log, position spend, recent runs, the user's price sheet, league context). Trust the math; deliver the take.

RESPONSE STRUCTURE (use these EXACT bold headers, in this order, every time):

**🎙️ The Take**
2-4 sentences. The verdict. What just happened, what it means, what the user does next. Pure podcast voice. This is the headline read — the part that would air on the show. No lists, no math dumps, just the call.

**💰 The Math**
1-2 short lines. The numbers behind the take, in plain English. "$87 and 6 spots — that's $14 a slot, plenty of room for one more stud." Not a stat block. If the latest pick changed the math materially (drained max bid, killed a tier, ate a position budget), call it out.

**🎯 Who I'd Chase**
A bullet list. EACH bullet:
- **Player Name** (POS) — up to **$X** — one short take in voice ("RB1 upside at RB3 money," "everyone forgot he exists," "fits your build like a glove").
Default 1–3 players. **If the user explicitly asks for a count or position (e.g. "top 5 QBs"), you MUST return EXACTLY that many of EXACTLY that position — do not pad with other positions.** Sort best-fit first. Prefer names from the user's price sheet but include well-known players if needed to satisfy the count. Max bid MUST respect: ≤ user's max bid, leave $1 per remaining slot, account for position need.

HARD RULES:
- ALWAYS use the 3 sections above, in order, with the exact emoji+bold headers. No preamble, no closing line, no extra sections.
- If the user asks for N players of a specific position, return EXACTLY N of that position. Never swap.
- NEVER recommend a max bid that breaks the budget ($1 minimum per remaining slot) or exceeds the user's current max bid.
- NEVER suggest impossible builds.
- Adapt as the draft unfolds — if the original plan dies, SAY SO in The Take and pivot the targets.
- Account for league type (Superflex/2QB inflates QB cost) and scoring (PPR boosts pass-catchers).
- Treat keepers as already rostered with locked-in costs.
- If the user asks a follow-up question, fold the answer into the same 3 sections — but lead with the verdict in The Take.
- BE TERSE. Podcast pacing. The Take is short. The Math is shorter. Who I'd Chase is the only section that scales with what the user asked for.`;


interface KeeperPayload {
  player: string;
  position?: string;
  cost: number;
}

interface RosterPlayerPayload {
  player: string;
  position?: string;
  price: number;
  source?: string;
}

interface DraftEventPayload {
  player: string;
  position?: string;
  price: number;
  drafter: "me" | "other";
}

interface CoachPayload {
  settings: Record<string, unknown>;
  budget: Record<string, unknown>;
  keepers?: KeeperPayload[];
  myRoster?: RosterPlayerPayload[];
  rosterFilled: Record<string, number>;
  rosterRequired: Record<string, number>;
  events: DraftEventPayload[];
  prices: { name: string; price: number }[];
  spendByPosition: Record<string, number>;
  recentRuns: { window: number; counts: Record<string, number> };
  latestEvent?: DraftEventPayload;
  userQuestion?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  vetriTakes?: { player: string; position: string; lean: string; tier?: string; reasoning: string }[];
}

function buildUserMessage(p: CoachPayload): string {
  const parts: string[] = [];
  parts.push(`## League Settings\n${JSON.stringify(p.settings, null, 2)}`);
  parts.push(`## Budget State\n${JSON.stringify(p.budget, null, 2)}`);
  if (p.keepers?.length) {
    parts.push(
      `## User Keepers - already rostered, count toward budget and roster slots\n${p.keepers
        .map((k) => `${k.player}${k.position ? ` (${k.position})` : ""} - $${k.cost}`)
        .join("\n")}`
    );
  }
  if (p.myRoster?.length) {
    parts.push(
      `## User Current Roster (keepers + drafted players)\n${p.myRoster
        .map((x) => `[${x.source ?? "roster"}] ${x.player}${x.position ? ` (${x.position})` : ""} - $${x.price}`)
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
  if (p.vetriTakes?.length) {
    parts.push(
      `## Sal Vetri's Takes (from his recent YouTube videos — use as a contrarian/sharp signal alongside the price sheet)\n${p.vetriTakes
        .slice(0, 40)
        .map((t) => `[${t.lean.toUpperCase()}] ${t.player} (${t.position})${t.tier ? ` · ${t.tier}` : ""} — ${t.reasoning}`)
        .join("\n")}`
    );
  if (p.events?.length) {
    parts.push(
      `## Draft Log (chronological)\n${p.events
        .map(
          (e) =>
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

    const messages: { role: string; content: string }[] = [{ role: "system", content: SYSTEM_PROMPT }];
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
        max_tokens: 2000,
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
