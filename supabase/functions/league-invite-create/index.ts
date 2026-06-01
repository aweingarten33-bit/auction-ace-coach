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

    const { data: prof } = await sb.from("profiles").select("league_id").eq("user_id", u.user.id).maybeSingle();
    if (!prof?.league_id) return j({ error: "No league selected" }, 400);

    const { data: snap } = await sb
      .from("league_snapshots")
      .select("season_id")
      .eq("league_id", prof.league_id)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!snap?.season_id) return j({ error: "No league snapshot available" }, 400);

    const token = crypto.randomUUID().replace(/-/g, "");
    const expires_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb.from("league_invite_tokens").insert({
      token,
      league_id: prof.league_id,
      season_id: snap.season_id,
      created_by: u.user.id,
      expires_at,
    });
    if (error) return j({ error: error.message }, 500);
    return j({ ok: true, token, league_id: prof.league_id, season_id: snap.season_id, expires_at });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
