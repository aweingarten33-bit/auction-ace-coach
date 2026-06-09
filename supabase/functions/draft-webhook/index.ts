// Receives live draft events from the Auction Coach Chrome extension.
//
// Auth: the extension sends X-Extension-Token (a random token stored in
// extension_tokens table, shown to the admin in ESPN settings).
// We look up the token owner with the service role key, then insert the
// event as that user so Supabase Realtime pushes it to everyone in the league.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-extension-token",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const VALID_EVENT_TYPES = new Set(["nomination", "bid", "won", "undo"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return j({ error: "method not allowed" }, 405);

  const token = req.headers.get("x-extension-token")?.trim();
  if (!token) return j({ error: "missing x-extension-token" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  // Validate token → find owner
  const { data: tokenRow, error: tokenErr } = await admin
    .from("extension_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) return j({ error: "invalid token" }, 401);
  const userId = tokenRow.user_id as string;

  // Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return j({ error: "invalid json" }, 400);
  }

  const eventType = String(body.event_type ?? "");
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return j({ error: `invalid event_type: ${eventType}` }, 400);
  }

  // Nominations and bids with no player name are noise — ignore
  if (!body.player_name && eventType !== "undo") {
    return j({ ok: true, skipped: true });
  }

  // Build the row — only trusted fields from the extension payload
  const row = {
    user_id: userId,
    source: "extension" as const,
    event_type: eventType,
    player_name: body.player_name ? String(body.player_name) : null,
    player_position: body.player_position ? String(body.player_position) : null,
    player_team: body.player_team ? String(body.player_team) : null,
    espn_player_id: typeof body.espn_player_id === "number" ? body.espn_player_id : null,
    price: typeof body.price === "number" ? Math.round(body.price) : null,
    drafter_team_id: typeof body.drafter_team_id === "number" ? body.drafter_team_id : null,
    drafter_team_name: body.drafter_team_name ? String(body.drafter_team_name) : null,
    raw: body.raw ?? null,
    occurred_at: body.occurred_at ? String(body.occurred_at) : new Date().toISOString(),
  };

  const { error: insertErr } = await admin.from("live_draft_events").insert(row);
  if (insertErr) return j({ error: insertErr.message }, 500);

  // Update last_used_at (fire-and-forget)
  admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token", token)
    .then(() => {});

  return j({ ok: true, event_type: eventType, player: row.player_name });
});
