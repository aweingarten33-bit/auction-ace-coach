// Returns the team list for the active league.
// Works for three caller types:
//   1. Admin / league-joined user  → looks up their profile.league_id
//   2. Anonymous Supabase session  → no profile; falls back to most recent snapshot
//   3. No auth header at all       → same fallback (guest mode)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Service-role client — used to read league snapshots without RLS restrictions
    const admin = createClient(url, serviceKey);

    // Try to resolve league_id from the caller's profile first
    let leagueId: number | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
      const { data: u } = await sb.auth.getUser();
      if (u.user) {
        const { data: prof } = await sb
          .from("profiles")
          .select("league_id")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (prof?.league_id) leagueId = Number(prof.league_id);
      }
    }

    // Build the snapshot query
    let query = admin
      .from("league_snapshots")
      .select("league_id, season_id, league_name, teams, synced_at")
      .order("synced_at", { ascending: false })
      .limit(1);

    if (leagueId) query = query.eq("league_id", leagueId);

    const { data: snap } = await query.maybeSingle();
    if (!snap) {
      // Return 200 with empty teams + message so callers can render an empty
      // state instead of throwing a runtime error in the client.
      return j({ ok: true, teams: [], error: "No league snapshot yet. Commissioner needs to sync ESPN first." });
    }

    return j({
      ok: true,
      teams: Array.isArray(snap.teams) ? snap.teams : [],
      league: { id: snap.league_id, season: snap.season_id, name: snap.league_name, synced_at: snap.synced_at },
    });
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
