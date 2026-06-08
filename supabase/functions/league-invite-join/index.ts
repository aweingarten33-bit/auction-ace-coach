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
    const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!u.user) return j({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || "").trim();
    if (!token) return j({ error: "token required" }, 400);

    const { data: inv } = await sb
      .from("league_invite_tokens")
      .select("league_id, season_id, expires_at")
      .eq("token", token)
      .maybeSingle();
    if (!inv) return j({ error: "Invalid invite token" }, 404);
    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) return j({ error: "Invite expired" }, 400);

    const { error } = await sb.from("profiles").update({ league_id: inv.league_id }).eq("user_id", u.user.id);
    if (error) return j({ error: error.message }, 500);

    return j({ ok: true, league_id: inv.league_id, season_id: inv.season_id });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
