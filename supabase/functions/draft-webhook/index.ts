// Public webhook that the Chrome extension POSTs draft events to.
// Auth = X-Extension-Token header matched against extension_tokens.token.
// CORS: allow chrome-extension origins.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-extension-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EventSchema = z.object({
  event_type: z.enum(["nomination", "bid", "won", "undo"]),
  player_name: z.string().min(1).max(120).optional(),
  player_position: z.string().max(8).optional(),
  player_team: z.string().max(8).optional(),
  espn_player_id: z.number().int().optional(),
  price: z.number().int().min(0).max(999).optional(),
  drafter_team_id: z.number().int().optional(),
  drafter_team_name: z.string().max(80).optional(),
  occurred_at: z.string().optional(),
  raw: z.any().optional(),
});

const BodySchema = z.union([EventSchema, z.object({ events: z.array(EventSchema).max(50) })]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "POST only" }, 405);

  try {
    const token = req.headers.get("x-extension-token");
    if (!token) return j({ error: "missing X-Extension-Token" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, service);

    const { data: tok } = await sb
      .from("extension_tokens")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    if (!tok) return j({ error: "invalid token" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return j({ error: parsed.error.flatten() }, 400);

    const events = "events" in parsed.data ? parsed.data.events : [parsed.data];
    const rows = events.map((e) => ({
      user_id: tok.user_id,
      source: "extension",
      event_type: e.event_type,
      player_name: e.player_name,
      player_position: e.player_position,
      player_team: e.player_team,
      espn_player_id: e.espn_player_id,
      price: e.price,
      drafter_team_id: e.drafter_team_id,
      drafter_team_name: e.drafter_team_name,
      occurred_at: e.occurred_at ?? new Date().toISOString(),
      raw: e.raw,
    }));

    const { error } = await sb.from("live_draft_events").insert(rows);
    if (error) return j({ error: error.message }, 500);

    await sb
      .from("extension_tokens")
      .update({ last_used_at: new Date().toISOString() })
      .eq("token", token);

    return j({ ok: true, count: rows.length });
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
