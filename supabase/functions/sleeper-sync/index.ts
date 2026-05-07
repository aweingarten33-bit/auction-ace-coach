// Pulls Sleeper's player DB, derives pos_rank + projected auction value, upserts.
// Manually triggered from the UI (Refresh button).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FANTASY_POS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Convert overall search_rank -> approximate $ value on a $200 / 12-team budget.
// Curve roughly mirrors fantasy auction values: top 1 ~ $65, falls off fast.
function valueFromRank(overallRank: number): number {
  if (!overallRank || overallRank <= 0) return 0;
  if (overallRank > 200) return 1;
  // Exponential decay calibrated to common values
  const v = 75 * Math.exp(-overallRank / 35) + 1;
  return Math.max(1, Math.round(v));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log("Fetching Sleeper players…");
    const resp = await fetch("https://api.sleeper.app/v1/players/nfl");
    if (!resp.ok) throw new Error(`Sleeper fetch failed: ${resp.status}`);
    const raw = await resp.json();

    type Row = {
      sleeper_player_id: string;
      player_name: string;
      player_name_norm: string;
      position: string | null;
      team: string | null;
      age: number | null;
      years_exp: number | null;
      is_rookie: boolean;
      status: string | null;
      injury_status: string | null;
      injury_notes: string | null;
      depth_chart_order: number | null;
      search_rank: number | null;
    };

    const rows: Row[] = [];
    for (const id in raw) {
      const p = raw[id];
      if (!p) continue;
      const pos = p.position;
      if (!pos || !FANTASY_POS.has(pos)) continue;
      const name = p.full_name || `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
      if (!name) continue;
      const mappedPos = pos === "DEF" ? "DST" : pos;
      rows.push({
        sleeper_player_id: id,
        player_name: name,
        player_name_norm: norm(name),
        position: mappedPos,
        team: p.team ?? null,
        age: p.age ?? null,
        years_exp: p.years_exp ?? null,
        is_rookie: (p.years_exp ?? 99) === 0,
        status: p.status ?? null,
        injury_status: p.injury_status ?? null,
        injury_notes: p.injury_notes ?? null,
        depth_chart_order: p.depth_chart_order ?? null,
        search_rank: p.search_rank ?? null,
      });
    }

    // Derive pos_rank within position by search_rank (lower = better).
    const byPos = new Map<string, Row[]>();
    for (const r of rows) {
      if (!r.position) continue;
      const arr = byPos.get(r.position) ?? [];
      arr.push(r);
      byPos.set(r.position, arr);
    }
    const posRankMap = new Map<string, number>();
    const valueMap = new Map<string, number>();
    let overallRanked: { id: string; sr: number }[] = rows
      .filter((r) => r.search_rank != null)
      .map((r) => ({ id: r.sleeper_player_id, sr: r.search_rank! }))
      .sort((a, b) => a.sr - b.sr);
    overallRanked.forEach((r, i) => valueMap.set(r.id, valueFromRank(i + 1)));

    for (const [, arr] of byPos) {
      arr.sort((a, b) => (a.search_rank ?? 9e9) - (b.search_rank ?? 9e9));
      arr.forEach((r, i) => posRankMap.set(r.sleeper_player_id, i + 1));
    }

    const enriched = rows.map((r) => ({
      ...r,
      pos_rank: posRankMap.get(r.sleeper_player_id) ?? null,
      projected_auction_value: valueMap.get(r.sleeper_player_id) ?? null,
    }));

    // Chunked upsert
    const CHUNK = 1000;
    let upserted = 0;
    for (let i = 0; i < enriched.length; i += CHUNK) {
      const slice = enriched.slice(i, i + CHUNK);
      const { error } = await sb
        .from("sleeper_players")
        .upsert(slice, { onConflict: "sleeper_player_id" });
      if (error) throw error;
      upserted += slice.length;
    }

    const rookieCount = enriched.filter((r) => r.is_rookie).length;
    console.log(`Synced ${upserted} players (${rookieCount} rookies)`);

    return new Response(
      JSON.stringify({ success: true, total: upserted, rookies: rookieCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sleeper-sync error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
