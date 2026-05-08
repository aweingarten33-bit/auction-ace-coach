// Public endpoint: returns the league's team list without requiring the
// visitor to be logged in. Uses any stored ESPN credentials (admin's) via
// service role so league members can pick their team for personalization.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    // Pick the most recently verified credential as the league source of truth.
    const { data: creds } = await sb
      .from("espn_credentials")
      .select("swid, espn_s2, league_id, season_id")
      .not("league_id", "is", null)
      .not("season_id", "is", null)
      .order("last_verified_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (!creds?.league_id || !creds?.season_id) {
      return j({ error: "No league configured yet. The commissioner needs to connect ESPN." }, 400);
    }

    const cookie = `SWID=${creds.swid}; espn_s2=${creds.espn_s2}`;
    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${creds.season_id}/segments/0/leagues/${creds.league_id}?view=mTeam`;
    const r = await fetch(espnUrl, {
      headers: { cookie, accept: "application/json", "user-agent": "Mozilla/5.0" },
    });
    const ctype = r.headers.get("content-type") ?? "";
    if (!r.ok || !ctype.includes("application/json")) {
      return j({ error: `ESPN ${r.status}`, hint: "Commissioner may need to re-connect ESPN." }, 400);
    }
    const data = await r.json();
    const teams = (data.teams ?? []).map((t: any) => ({
      id: t.id,
      name:
        (typeof t.name === "string" && t.name.trim()) ||
        `${t.location ?? ""} ${t.nickname ?? ""}`.trim() ||
        `Team ${t.id}`,
      abbrev: t.abbrev,
    }));
    return j({ ok: true, teams, league: { id: creds.league_id, season: creds.season_id, name: data?.settings?.name } });
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
