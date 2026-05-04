// Verifies ESPN cookies and returns the user's leagues for the requested season.
// Stores cookies + selected league in espn_credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  swid: string;
  espn_s2: string;
  season: number;
  league_id?: number;
  team_id?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "missing auth" }, 401);

    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return j({ error: "unauthorized" }, 401);

    const body = (await req.json()) as Body;
    if (!body.swid || !body.espn_s2 || !body.season) {
      return j({ error: "swid, espn_s2, season required" }, 400);
    }
    const swid = body.swid.trim();
    const s2 = body.espn_s2.trim();

    // Fan API → list leagues for the user
    const fanUrl = `https://fan.api.espn.com/apis/v2/fans/${encodeURIComponent(swid)}?context=fantasy&useCookieAuth=true`;
    const cookie = `SWID=${swid}; espn_s2=${s2}`;

    const fanRes = await fetch(fanUrl, { headers: { cookie, accept: "application/json" } });
    if (!fanRes.ok) {
      return j({ error: `ESPN auth failed (${fanRes.status})`, hint: "Re-copy cookies, make sure SWID includes the braces { }" }, 400);
    }
    const fanData = await fanRes.json();

    const leagues = (fanData?.preferences ?? [])
      .map((p: any) => p?.metaData?.entry)
      .filter((e: any) => e && e.groups?.[0]?.groupId && e.seasonId === body.season && e.abbrev === "FFL")
      .map((e: any) => ({
        leagueId: Number(e.groups[0].groupId),
        leagueName: e.groups[0].groupName,
        teamId: Number(e.entryId),
        teamName: e.entryMetadata?.teamName ?? `Team ${e.entryId}`,
        seasonId: e.seasonId,
      }));

    // Persist creds + (optional) selected league
    const upsertRow: any = {
      user_id: u.user.id,
      swid, espn_s2: s2,
      season_id: body.season,
      last_verified_at: new Date().toISOString(),
    };
    if (body.league_id) upsertRow.league_id = body.league_id;
    if (body.team_id) upsertRow.team_id = body.team_id;

    const { error } = await sb.from("espn_credentials").upsert(upsertRow, { onConflict: "user_id" });
    if (error) return j({ error: error.message }, 500);

    return j({ ok: true, leagues, season: body.season });
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
