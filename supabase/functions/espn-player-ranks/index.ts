// Pulls current-season ESPN positional rankings + auction values for all
// fantasy-relevant players. Cached in espn_player_ranks so the Vetri panel
// can auto-assign a tier when Sal doesn't say one.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "missing auth" }, 401);

    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return j({ error: "unauthorized" }, 401);

    const { data: creds } = await sb
      .from("espn_credentials")
      .select("swid, espn_s2, league_id, season_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!creds?.season_id) return j({ error: "Connect ESPN first." }, 400);

    const season = creds.season_id;
    const cookie = creds.swid && creds.espn_s2 ? `SWID=${creds.swid}; espn_s2=${creds.espn_s2}` : "";

    // ESPN's players_wl endpoint returns up to ~600 ranked players in one shot.
    // X-Fantasy-Filter limits to fantasy-relevant positions and sorts by overall rank.
    const filter = {
      players: {
        limit: 600,
        sortDraftRanks: { sortPriority: 100, sortAsc: true, value: "STANDARD" },
        filterStatsForTopScoringPeriodIds: { value: 2 },
      },
    };

    const espnUrl = `https://fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/players?scoringPeriodId=0&view=players_wl`;
    const r = await fetch(espnUrl, {
      headers: {
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
        "x-fantasy-filter": JSON.stringify(filter),
        "x-fantasy-source": "kona",
        "x-fantasy-platform": "kona-PROD",
      },
    });
    if (!r.ok) {
      const text = await r.text();
      return j({ error: `ESPN ${r.status}`, body: text.slice(0, 200) }, 502);
    }
    const players = await r.json();
    if (!Array.isArray(players)) return j({ error: "Unexpected ESPN response shape" }, 502);

    const rows = players
      .map((p: any) => {
        const id = p.id;
        const name = p.fullName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
        if (!id || !name) return null;
        const position = POS[p.defaultPositionId] ?? null;
        const ranks = p.draftRanksByRankType?.STANDARD ?? p.draftRanksByRankType?.PPR ?? null;
        return {
          season,
          espn_player_id: id,
          player_name: name,
          player_name_norm: norm(name),
          position,
          overall_rank: ranks?.rank ?? null,
          pos_rank: ranks?.positionalRank ?? null,
          auction_value: ranks?.auctionValue ?? null,
          projected_points: null,
        };
      })
      .filter(Boolean);

    // Use service role for upsert (bypasses RLS write block on this read-only-public table).
    const sbAdmin = createClient(url, serviceKey);
    // Upsert in chunks to stay under payload limits.
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sbAdmin
        .from("espn_player_ranks")
        .upsert(chunk, { onConflict: "season,espn_player_id" });
      if (error) return j({ error: `upsert: ${error.message}`, upserted }, 500);
      upserted += chunk.length;
    }

    return j({ ok: true, season, upserted });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
