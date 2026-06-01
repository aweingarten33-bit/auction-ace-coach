// Matthew Berry (Fantasy Life) + Sleeper blended auction values, superflex-aware.
// - Pulls Berry per-position rank lists from fantasy-life-rankings (Firecrawl-backed).
// - Converts pos-rank -> $ via per-position curve calibrated for $200/12-team.
// - Pulls Sleeper projected_auction_value from sleeper_players table.
// - Applies superflex QB multiplier when requested (default true — this app is SF).
// - Averages Berry & Sleeper into a single blended value per player.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");

// Per-position curve: topValue * exp(-(rank-1)/decay), floored at $1.
// Calibrated for 12-team / $200 budget redraft auction.
type Curve = { top: number; decay: number };
const STD_CURVES: Record<string, Curve> = {
  QB:   { top: 14, decay: 4 },
  RB:   { top: 62, decay: 9 },
  WR:   { top: 58, decay: 10 },
  TE:   { top: 24, decay: 5 },
  K:    { top: 2,  decay: 6 },
  "D/ST": { top: 3, decay: 6 },
  DST:  { top: 3, decay: 6 },
};
// Superflex shifts ~25-30% of league budget into QBs. Top QBs become RB1-tier
// money AND every RB/WR/TE/K/DST top number drops accordingly. Don't just inflate
// QBs — deflate everyone else, otherwise the budget doesn't add up.
const SF_CURVES: Record<string, Curve> = {
  QB:   { top: 45, decay: 12 },  // top QBs ~$45 (was $14 in 1QB)
  RB:   { top: 48, decay: 9 },   // ~22% off standard
  WR:   { top: 45, decay: 10 },  // ~22% off standard
  TE:   { top: 18, decay: 5 },   // ~25% off standard
  K:    { top: 1,  decay: 6 },
  "D/ST": { top: 2, decay: 6 },
  DST:  { top: 2, decay: 6 },
};

function curveValue(c: Curve, rank: number): number {
  if (!rank || rank <= 0) return 1;
  return Math.max(1, Math.round(c.top * Math.exp(-(rank - 1) / c.decay)));
}

interface BerryPlayer { rank: number; name: string; position: string; team: string; }
interface RankList { source: string; position: string; players: BerryPlayer[]; kind: "ranking" | "sleeper" }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let body: { superflex?: boolean; teams?: number; budget?: number } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* ignore */ }
    }
    const superflex = body.superflex !== false; // default true
    const teams = body.teams ?? 12;
    const budget = body.budget ?? 200;
    const budgetScale = (teams * budget) / (12 * 200); // simple linear scaler

    // 1) Berry rank lists from fantasy-life-rankings
    const flRes = await fetch(`${SUPABASE_URL}/functions/v1/fantasy-life-rankings`, {
      headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    });
    if (!flRes.ok) throw new Error(`fantasy-life-rankings ${flRes.status}`);
    const flJson = await flRes.json();
    const lists: RankList[] = flJson?.lists ?? [];

    const curves = superflex ? SF_CURVES : STD_CURVES;
    type Row = { name: string; key: string; position: string; team: string; berry?: number; sleeper?: number };
    const rows = new Map<string, Row>();

    for (const list of lists) {
      if (list.kind !== "ranking") continue; // skip sleepers/breakouts (no rank)
      const pos = list.position === "DST" ? "D/ST" : list.position;
      const curve = curves[pos] ?? curves.WR;
      for (const p of list.players) {
        if (!p.name || !p.rank) continue;
        const k = norm(p.name);
        if (!k) continue;
        const v = Math.max(1, Math.round(curveValue(curve, p.rank) * budgetScale));
        const cur = rows.get(k) ?? { name: p.name, key: k, position: pos, team: p.team || "" };
        // Keep best (lowest) rank per player across overlapping lists
        cur.berry = cur.berry == null ? v : Math.max(cur.berry, v);
        cur.position = pos;
        if (p.team) cur.team = p.team;
        rows.set(k, cur);
      }
    }

    // 2) Sleeper projected_auction_value (raise limit beyond 1000 default)
    const { data: sleeperRows, error } = await sb
      .from("sleeper_players")
      .select("player_name, player_name_norm, position, projected_auction_value")
      .gt("projected_auction_value", 0)
      .order("projected_auction_value", { ascending: false })
      .limit(5000);
    if (error) throw error;

    for (const r of (sleeperRows ?? []) as Array<{ player_name: string; player_name_norm: string; position: string | null; projected_auction_value: number | null }>) {
      const k = norm(r.player_name_norm || r.player_name);
      if (!k) continue;
      let v = Number(r.projected_auction_value || 0);
      const pos = (r.position === "DEF" ? "D/ST" : r.position) || "";
      // Sleeper's projected_auction_value is single-QB tuned. In SF, inflate QBs
      // and DEFLATE every other position (~22% off) — total budget is fixed, so
      // RB/WR/TE money has to come from somewhere when QBs go up.
      if (superflex) {
        if (pos === "QB") v = Math.round(v * 1.35);
        else if (pos === "RB" || pos === "WR" || pos === "TE") v = Math.round(v * 0.78);
      }
      // Scale to actual league budget (Sleeper's projected_auction_value is $200/12-team)
      v = v * budgetScale;
      // SF QB cap scales with budget too
      if (superflex && pos === "QB") v = Math.min(50 * budgetScale, v);
      const cur = rows.get(k) ?? { name: r.player_name, key: k, position: pos, team: "" };
      cur.sleeper = Math.max(1, Math.round(v));
      if (!cur.position) cur.position = pos;
      rows.set(k, cur);
    }

    // 3) Blend: average available sources (1 source = use it directly)
    const out: Record<string, { name: string; position: string; team: string; berry: number | null; sleeper: number | null; blended: number }> = {};
    for (const [k, r] of rows) {
      const inputs = [r.berry, r.sleeper].filter((x): x is number => typeof x === "number" && x > 0);
      if (inputs.length === 0) continue;
      const blended = Math.max(1, Math.round(inputs.reduce((a, b) => a + b, 0) / inputs.length));
      out[k] = {
        name: r.name,
        position: r.position,
        team: r.team,
        berry: r.berry ?? null,
        sleeper: r.sleeper ?? null,
        blended,
      };
    }

    return new Response(
      JSON.stringify({
        superflex, teams, budget,
        playerCount: Object.keys(out).length,
        fetchedAt: new Date().toISOString(),
        values: out,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("blended-values error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
