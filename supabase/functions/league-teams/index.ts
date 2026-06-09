// Auth endpoint: returns team list from canonical league snapshot using the
// caller's profile.league_id (deterministic shared-league context).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { data: prof } = await sb
      .from("profiles")
      .select("league_id")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!prof?.league_id) return j({ error: "No league joined yet." }, 400);

    const { data: snap } = await sb
      .from("league_snapshots")
      .select("league_id, season_id, league_name, teams, synced_at")
      .eq("league_id", prof.league_id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!snap) return j({ error: "No league snapshot yet. Commissioner needs to sync ESPN." }, 400);
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
