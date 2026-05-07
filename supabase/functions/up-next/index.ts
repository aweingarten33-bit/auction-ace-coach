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
function titleize(norm: string): string {
  // crude reverse of norm() — split runs of letters/digits and Title Case
  return norm.replace(/([a-z])([0-9])/g, "$1 $2").replace(/(^|\s)([a-z])/g, (_, s, c) => s + c.toUpperCase());
}

const SYSTEM_PROMPT = `You are an elite fantasy football auction draft strategist powering a Spotify-style "Up Next" queue.

You will receive deterministic draft state (budget, slots, max bid, roster gaps, draft log, the user's price sheet, recent runs).

Your ONLY job is to call the emit_queue tool with the TEN best players the user should target RIGHT NOW, ranked best→worst.

Rules:
- Pick from the user's price sheet when possible. Otherwise use widely known players appropriate for the format.
- NEVER list a player who is already drafted (in the draft log) or already on the user's roster/keepers.
- "maxBid" = the REALISTIC AUCTION PRICE this specific player goes for in a $${"{BUDGET}"} ${"{LEAGUE_TYPE}"} league. NOT the user's affordability ceiling. Each player should have a DIFFERENT, player-specific price reflecting their actual market value (e.g. Mahomes $55, McCaffrey $65, Jefferson $60 — NOT all the same number). Must be <= user's affordability max and leave $1 per remaining slot, but otherwise reflect true market.
- "matchPct" (0-100) reflects how well the player fits the user's needs RIGHT NOW (positional gap urgency + value vs price sheet + market timing). Higher = better fit.
- "reason" is ONE short punchy line (max ~70 chars). Concrete: positional fit + value angle. No fluff.
- Order all 10 by matchPct descending.
- "openMan" (optional, max ~60 chars): one line on which position the room is sleeping on, if any.

For EACH target also emit (all required):
- "grade" (1-5 integer): consensus quality score for this player at the suggested bid given current draft state. 5 = elite call, 1 = desperate.
- "worstCase" (max ~90 chars): plain-English downside if user PASSES. Must name the realistic next-best player at that position with a $ estimate. Format: "You'll likely settle for <Alt Name> at ~$X."
- "knockoff" ({ "name": string, "position": same enum, "price": int >= 1 }): a meaningfully cheaper alternative at the SAME position. Knockoff price MUST be < maxBid * 0.6 and >= 1.
- "dossier" (max ~110 chars): IMDb-style one-liner — role, team if known, key trait, why-now. No fluff.`;

const TOOL = {
  type: "function",
  function: {
    name: "emit_queue",
    description: "Emit the top 10 players the user should target next, ranked best to worst.",
    parameters: {
      type: "object",
      properties: {
        targets: {
          type: "array",
          minItems: 5,
          maxItems: 10,
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const p = await req.json();

    // ---- Deterministic pre-compute so the model doesn't have to do math ----
    const norm = (s: string) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const draftedSet = new Set<string>(
      [
        ...((p.events ?? []) as any[]).map((e) => norm(e.player)),
        ...((p.myRoster ?? []) as any[]).map((x) => norm(x.player)),
      ].filter(Boolean),
    );

    // ---- ANCHOR PRICES from real data sources, in priority order ----
    // 1) league_auction_history (3yr avg of YOUR league's actual paid prices)
    // 2) espn_player_ranks (current-season ESPN auction value)
    // Build a player->price map keyed by normalized name.
    const anchorByName = new Map<string, { price: number; pos?: string; src: string }>();
    const sbHeaders = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
    try {
      const histResp = await fetch(
        `${SUPABASE_URL}/rest/v1/league_auction_history?select=player_name,position,bid_amount,season&season=in.(2023,2024,2025)`,
        { headers: sbHeaders },
      );
      if (histResp.ok) {
        const rows = (await histResp.json()) as any[];
        const agg = new Map<string, { sum: number; n: number; pos?: string }>();
        for (const r of rows) {
          const k = norm(r.player_name);
          if (!k) continue;
          const cur = agg.get(k) || { sum: 0, n: 0, pos: r.position };
          cur.sum += Number(r.bid_amount) || 0;
          cur.n += 1;
          cur.pos = cur.pos || r.position;
          agg.set(k, cur);
        }
        for (const [k, v] of agg) {
          if (v.n > 0) anchorByName.set(k, { price: Math.max(1, Math.round(v.sum / v.n)), pos: v.pos, src: "league3yr" });
        }
      }
    } catch (e) { console.error("league_auction_history fetch", e); }

    try {
      const ranksResp = await fetch(
        `${SUPABASE_URL}/rest/v1/espn_player_ranks?select=player_name,position,auction_value&auction_value=not.is.null&order=auction_value.desc&limit=400`,
        { headers: sbHeaders },
      );
      if (ranksResp.ok) {
        const rows = (await ranksResp.json()) as any[];
        for (const r of rows) {
          const k = norm(r.player_name);
          if (!k) continue;
          // Don't overwrite league3yr — that's higher signal
          if (anchorByName.has(k)) continue;
          const v = Number(r.auction_value) || 0;
          if (v > 0) anchorByName.set(k, { price: Math.max(1, Math.round(v)), pos: r.position, src: "espn2026" });
        }
      }
    } catch (e) { console.error("espn_player_ranks fetch", e); }

    // Market multiplier from observed paid vs anchor (uses live picks vs real anchors)
    const sheetMap = new Map<string, { price: number; pos?: string }>();
    for (const r of (p.prices ?? []) as any[]) sheetMap.set(norm(r.name), { price: Number(r.price) || 0, pos: r.position });
    let paidSum = 0, sheetSum = 0, n = 0;
    for (const e of (p.events ?? []) as any[]) {
      const ref = sheetMap.get(norm(e.player)) ?? anchorByName.get(norm(e.player));
      if (!ref || !ref.price || ref.price <= 0) continue;
      paidSum += Number(e.price) || 0; sheetSum += ref.price; n++;
    }
    const marketMult = n >= 3 && sheetSum > 0 ? paidSum / sheetSum : 1;
    const confident = n >= 8;

    // Per-position fallback board: merges user sheet + anchor data (3yr league + ESPN).
    // Each row carries source so the prompt and engine know what we're trusting.
    const POS_LIST = ["QB", "RB", "WR", "TE", "K", "DST"] as const;
    const fallbackByPos: Record<string, { name: string; sheet: number; going: number; src: string }[]> = {};
    for (const pos of POS_LIST) {
      const merged = new Map<string, { name: string; sheet: number; going: number; src: string }>();
      // sheet rows
      for (const r of (p.prices ?? []) as any[]) {
        if (r.position !== pos) continue;
        const k = norm(r.name);
        if (!k || draftedSet.has(k)) continue;
        const sheet = Number(r.price) || 0;
        if (sheet <= 0) continue;
        merged.set(k, { name: r.name, sheet, going: Math.max(1, Math.round(sheet * marketMult)), src: "sheet" });
      }
      // anchor rows (league3yr / espn2026) — fill gaps
      for (const [k, a] of anchorByName) {
        if (a.pos !== pos) continue;
        if (draftedSet.has(k)) continue;
        if (merged.has(k)) continue;
        merged.set(k, { name: titleize(k), sheet: a.price, going: Math.max(1, Math.round(a.price * marketMult)), src: a.src });
      }
      fallbackByPos[pos] = Array.from(merged.values()).sort((a, b) => b.going - a.going).slice(0, 10);
    }

    const fallbackText = POS_LIST
      .map((pos) => {
        const rows = fallbackByPos[pos];
        if (!rows.length) return `${pos}: (no data)`;
        return `${pos}: ${rows.map((r) => `${r.name} $${r.going}(${r.src})`).join(" | ")}`;
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
      `## Task\nCall emit_queue with the 10 best targets right now, ranked best→worst by matchPct. Never include any name from the Dismissed list.\n\nFor each target's "worstCase": the alternative MUST be the highest-ranked name from the Fallback Board for that POS that is NOT the target itself, and the $ MUST equal that row's "going" value.\n\nFor each target's "knockoff": pull from the same Fallback Board for the same POS where going$ < target.maxBid * 0.6; use the highest-going row that satisfies that. If none qualify, pick the cheapest row on the board for that POS.`,
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

    // ---- Suggested-bid engine (deterministic, capped by affordability) ----
    // Blend = 0.6 × MarketPrice + 0.4 × AIPrice (AI = its own maxBid guess).
    // ScarcityMult: critical=+25%, need=+10%, else 1.0.
    // RunMult: +5% per recent same-pos pick in window (cap +20%).
    // Hard ceiling: user's affordability max (budget.maxBid). Never exceeds it.
    const affordabilityCeiling = Math.max(1, Number(p?.budget?.maxBid) || 1);
    const gapByPos = new Map<string, string>();
    for (const g of (p.gaps ?? []) as any[]) gapByPos.set(g.pos, g.severity);
    const runCounts = (p?.recentRuns?.counts ?? {}) as Record<string, number>;

    // Replacement price per position (used when player isn't on the sheet —
    // we use the median of the top-8 fallback going prices for that position
    // so we never default to the affordability ceiling).
    const replacementByPos: Record<string, number> = {};
    for (const pos of POS_LIST) {
      const board = fallbackByPos[pos] ?? [];
      if (board.length) {
        const sorted = [...board].map((r) => r.going).sort((a, b) => a - b);
        replacementByPos[pos] = sorted[Math.floor(sorted.length / 2)] || 1;
      }
    }

    if (Array.isArray(parsed?.targets)) {
      // Detect duplicate AI prices (model lazily returned ceiling for all) so
      // we can spread them out using the position fallback board.
      const aiPrices = parsed.targets.map((t: any) => Number(t?.maxBid) || 0);
      const allSame = aiPrices.length > 1 && aiPrices.every((v: number) => v === aiPrices[0]);

      for (const t of parsed.targets) {
        const pos = t?.position as string | undefined;
        const nameKey = norm(t?.name ?? "");

        // 1. Anchor priority: user sheet → league 3yr avg → ESPN 2026 → AI guess
        const sheetRef = sheetMap.get(nameKey);
        const anchorRef = anchorByName.get(nameKey);
        const board = (pos && fallbackByPos[pos]) ? fallbackByPos[pos] : [];
        const topGoing = board[0]?.going || 0;

        let basePrice: number;
        let priceSrc: string;
        if (sheetRef && sheetRef.price > 0) {
          basePrice = Math.round(sheetRef.price * marketMult);
          priceSrc = "sheet";
        } else if (anchorRef && anchorRef.price > 0) {
          basePrice = Math.round(anchorRef.price * marketMult);
          priceSrc = anchorRef.src;
        } else if (allSame && topGoing > 0) {
          basePrice = topGoing;
          priceSrc = "board";
        } else {
          basePrice = Number(t?.maxBid) || (topGoing || Math.round(affordabilityCeiling * 0.3));
          priceSrc = "ai";
        }
        (t as any).priceSource = priceSrc;

        // 2. Scarcity nudge
        const sev = pos ? gapByPos.get(pos) : undefined;
        const scarcityMult = sev === "critical" ? 1.15 : sev === "need" ? 1.05 : 1.0;

        // 3. Run nudge
        const runN = pos ? Number(runCounts[pos] || 0) : 0;
        const runMult = 1 + Math.min(0.15, runN * 0.05);

        const suggested = Math.max(
          1,
          Math.min(affordabilityCeiling, Math.round(basePrice * scarcityMult * runMult)),
        );
        t.maxBid = suggested;

        const maxBid = suggested;
        const ceiling = maxBid * 0.6;
        const ceilingFloor = Math.max(0, Math.floor(ceiling));
        // (board already computed above)

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
