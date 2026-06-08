// Pulls ESPN preseason ranks + projected auction values for the last N seasons
// and stores them in espn_preseason_ranks. Joined with league_auction_history
// to build a tier-based price model: "what did Tier-N players actually go for?"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization");
    let userId: string | null = null;
    if (auth) {
      const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
      const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
      if (u.user) userId = u.user.id;
    }

    const sbAdmin = createClient(url, serviceKey);
    const body = await req.json().catch(() => ({}));
    const seasonsBack = Math.min(Math.max(parseInt(body.seasonsBack ?? "3", 10) || 3, 1), 10);

    let creds: { swid: string; espn_s2: string; season_id: number | null } | null = null;
    if (userId) {
      const { data } = await sbAdmin.from("espn_credentials").select("swid, espn_s2, season_id").eq("user_id", userId).maybeSingle();
      creds = data;
    }
    if (!creds?.season_id) {
      const { data: shared } = await sbAdmin.from("espn_credentials").select("swid, espn_s2, season_id").not("season_id", "is", null).order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
      if (shared?.season_id) creds = shared;
    }
    if (!creds?.season_id) return j({ error: "Connect ESPN first." }, 400);

    const cookie = creds.swid && creds.espn_s2 ? `SWID=${creds.swid}; espn_s2=${creds.espn_s2}` : "";
    const currentSeason: number = creds.season_id;
    const seasons = Array.from({ length: seasonsBack }, (_, i) => currentSeason - 1 - i);

    const sbAdmin = createClient(url, serviceKey);
    const summary: { season: number; players: number; status: string; error?: string }[] = [];

    const filter = {
      players: {
        limit: 600,
        sortDraftRanks: { sortPriority: 100, sortAsc: true, value: "STANDARD" },
      },
    };

    for (const season of seasons) {
      try {
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
          summary.push({ season, players: 0, status: "skipped", error: `ESPN ${r.status}` });
          continue;
        }
        const players = await r.json();
        if (!Array.isArray(players)) {
          summary.push({ season, players: 0, status: "bad_response" });
          continue;
        }

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
              projected_auction_value: ranks?.auctionValue ?? null,
              projected_points: null,
            };
          })
          .filter(Boolean);

        let upserted = 0;
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const { error } = await sbAdmin
            .from("espn_preseason_ranks")
            .upsert(chunk, { onConflict: "season,espn_player_id" });
          if (error) {
            summary.push({ season, players: upserted, status: "insert_failed", error: error.message });
            upserted = -1;
            break;
          }
          upserted += chunk.length;
        }
        if (upserted >= 0) summary.push({ season, players: upserted, status: "ok" });
      } catch (e) {
        summary.push({ season, players: 0, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    return j({ ok: true, summary });
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
