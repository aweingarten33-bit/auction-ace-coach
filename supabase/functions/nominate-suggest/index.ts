// Agentic nomination suggester — pulls live state + price sheet + your past
// drafts (league_auction_history) + analyst takes (vetri_notes) and returns
// 3 player nominations with a strategy tag and one-line reason.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const norm = (s: string) =>
  String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const SYSTEM_PROMPT = `You are an elite fantasy football auction strategist.

Your job: pick THREE players the user should NOMINATE next. A nomination is a name you throw out for the room to bid on — it does NOT mean you want the player.

You have THREE strategies to choose from for each suggestion:
- "drain"    : Expensive player the user does NOT need. Forces other teams to spend.
- "plug"     : Cheap player ($1–$3) that fills a roster hole nobody will fight for.
- "enforcer" : Mid-priced player likely to go AT or ABOVE value — burns budget across the room.

You will receive:
- Current draft state (budget, slots, gaps, who's been drafted, who is on each opponent's roster)
- The user's price sheet
- The user's past auction history (how they tend to spend)
- Analyst takes from vetri_notes (use sparingly — only if a take applies to a candidate)

Rules:
- NEVER suggest a drafted player or one on the user's roster/keepers.
- Each suggestion's "price" must be the realistic going price (sheet price adjusted by market).
- "reason" must be ONE punchy line (max ~80 chars). Concrete. Reference an opponent's gap when using drain/enforcer, or the user's gap when using plug.
- Order suggestions by impact (best first).
- If you have an analyst take that supports a pick, append " — per take" to the reason.

Call emit_nominations with exactly 3 suggestions.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_nominations",
    description: "Emit 3 nomination suggestions.",
    parameters: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              position: {
                type: "string",
                enum: ["QB", "RB", "WR", "TE", "K", "DST"],
              },
              strategy: {
                type: "string",
                enum: ["drain", "plug", "enforcer"],
              },
              price: { type: "integer", minimum: 1 },
              reason: { type: "string" },
            },
            required: ["name", "position", "strategy", "price", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const p = await req.json();

    // ---- Build drafted set ----
    const draftedSet = new Set<string>(
      [
        ...((p.events ?? []) as any[]).map((e) => norm(e.player)),
        ...((p.myRoster ?? []) as any[]).map((x) => norm(x.player)),
      ].filter(Boolean),
    );

    // ---- Market multiplier ----
    const sheetMap = new Map<string, { price: number; pos?: string }>();
    for (const r of (p.prices ?? []) as any[]) {
      sheetMap.set(norm(r.name), {
        price: Number(r.price) || 0,
        pos: r.position,
      });
    }
    let paidSum = 0, sheetSum = 0, n = 0;
    for (const e of (p.events ?? []) as any[]) {
      const ref = sheetMap.get(norm(e.player));
      if (!ref || ref.price <= 0) continue;
      paidSum += Number(e.price) || 0;
      sheetSum += ref.price;
      n++;
    }
    const marketMult = n >= 3 && sheetSum > 0 ? paidSum / sheetSum : 1;

    // ---- Undrafted pool by position ----
    const POS_LIST = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
    const poolByPos: Record<string, { name: string; sheet: number; going: number }[]> = {};
    for (const pos of POS_LIST) {
      poolByPos[pos] = ((p.prices ?? []) as any[])
        .filter((r) => r.position === pos && !draftedSet.has(norm(r.name)) && Number(r.price) > 0)
        .sort((a, b) => Number(b.price) - Number(a.price))
        .slice(0, 12)
        .map((r) => ({
          name: r.name,
          sheet: Number(r.price),
          going: Math.max(1, Math.round(Number(r.price) * marketMult)),
        }));
    }

    // ---- Pull user's past auction history ----
    let pastSpend = "(no history)";
    try {
      const { data: hist } = await supabase
        .from("league_auction_history")
        .select("player_name, position, bid_amount, season")
        .order("created_at", { ascending: false })
        .limit(150);
      if (hist && hist.length) {
        const byPos: Record<string, { total: number; count: number; max: number }> = {};
        for (const h of hist) {
          const pos = h.position ?? "??";
          byPos[pos] = byPos[pos] ?? { total: 0, count: 0, max: 0 };
          byPos[pos].total += Number(h.bid_amount) || 0;
          byPos[pos].count++;
          byPos[pos].max = Math.max(byPos[pos].max, Number(h.bid_amount) || 0);
        }
        pastSpend = Object.entries(byPos)
          .map(([pos, v]) => `${pos}: avg$${Math.round(v.total / v.count)} max$${v.max} (n=${v.count})`)
          .join(" | ");
      }
    } catch (e) {
      console.warn("history fetch failed", e);
    }

    // ---- Pull relevant analyst takes for top undrafted candidates ----
    let takesText = "(no takes)";
    try {
      const topNames = POS_LIST.flatMap((pos) => poolByPos[pos].slice(0, 3).map((r) => r.name));
      const { data: notes } = await supabase
        .from("vetri_notes")
        .select("title, takes")
        .eq("status", "ready")
        .order("published_at", { ascending: false })
        .limit(20);
      if (notes && notes.length) {
        const matches: string[] = [];
        for (const note of notes) {
          const takes = Array.isArray(note.takes) ? note.takes : [];
          for (const t of takes) {
            const tStr = typeof t === "string" ? t : (t?.text || JSON.stringify(t));
            for (const name of topNames) {
              if (tStr.toLowerCase().includes(name.toLowerCase().split(" ").slice(-1)[0])) {
                matches.push(`${name}: ${tStr.slice(0, 120)}`);
                break;
              }
            }
            if (matches.length >= 8) break;
          }
          if (matches.length >= 8) break;
        }
        if (matches.length) takesText = matches.join("\n");
      }
    } catch (e) {
      console.warn("notes fetch failed", e);
    }

    const poolText = POS_LIST
      .map((pos) => {
        const rows = poolByPos[pos];
        if (!rows.length) return `${pos}: (none undrafted)`;
        return `${pos}: ${rows.map((r) => `${r.name} $${r.going}`).join(" | ")}`;
      })
      .join("\n");

    const opponentText = ((p.opponents ?? []) as any[])
      .map((o: any) => `Team ${o.teamId}: budget$${o.budgetLeft} slots${o.slotsLeft} needs[${(o.needs ?? []).join(",")}]`)
      .join("\n") || "(no opponent data)";

    const userMsg = [
      `## Your Budget\n${JSON.stringify(p.budget)}`,
      `## Your Roster Gaps\n${JSON.stringify(p.gaps)}`,
      `## Your Roster\n${(p.myRoster ?? []).map((x: any) => `${x.player} (${x.position ?? "?"}) $${x.price}`).join("\n") || "(empty)"}`,
      `## Opponent State\n${opponentText}`,
      `## Market Multiplier\n${marketMult.toFixed(3)} (samples=${n})`,
      `## Undrafted Pool (going$ = sheet × market)\n${poolText}`,
      `## Your Past Auction Tendencies\n${pastSpend}`,
      `## Analyst Takes (apply if relevant)\n${takesText}`,
      `## Recent Picks\n${((p.events ?? []) as any[]).slice(-12).map((e: any) => `${e.drafter === "me" ? "[ME]" : `[T${e.drafterTeamId ?? "?"}]`} ${e.player} $${e.price}`).join("\n") || "(none)"}`,
      `## Task\nReturn 3 nominations using emit_nominations. Mix strategies (drain/plug/enforcer) when sensible.`,
    ].join("\n\n");

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
        tool_choice: { type: "function", function: { name: "emit_nominations" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("nominate-suggest gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      console.error("no tool call", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "Model did not return suggestions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(call.function.arguments);

    // Filter out any drafted names that snuck through
    if (Array.isArray(parsed?.suggestions)) {
      parsed.suggestions = parsed.suggestions.filter(
        (s: any) => !draftedSet.has(norm(s?.name ?? "")),
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("nominate-suggest error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
