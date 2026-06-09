// Scrape DraftSharks Superflex auction values via Firecrawl JSON extraction
// and upsert into public.draftsharks_sf_values. Returns count synced.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");

interface DSPlayer {
  overall_rank?: number;
  name: string;
  team?: string;
  position: string;
  position_rank?: number;
  value_200: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: "https://www.draftsharks.com/auction-values/superflex",
        formats: [{
          type: "json",
          prompt: "Extract ALL players in the auction values table — return every single row. Fields per player: overall_rank (int), name (full name string), team (3-letter), position (QB/RB/WR/TE/K/DST), position_rank (int derived from QB1->1, RB2->2, etc.), value_200 (int dollar value in the $200 budget column). Do NOT truncate.",
          schema: {
            type: "object",
            properties: {
              players: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    overall_rank: { type: "integer" },
                    name: { type: "string" },
                    team: { type: "string" },
                    position: { type: "string" },
                    position_rank: { type: "integer" },
                    value_200: { type: "integer" },
                  },
                  required: ["name", "position", "value_200"],
                },
              },
            },
          },
        }],
        onlyMainContent: true,
      }),
    });
    if (!fcRes.ok) {
      const txt = await fcRes.text();
      throw new Error(`Firecrawl ${fcRes.status}: ${txt.slice(0, 300)}`);
    }
    const fcJson = await fcRes.json();
    const data = fcJson.data ?? fcJson;
    const players: DSPlayer[] = data?.json?.players ?? [];
    if (!Array.isArray(players) || players.length === 0) {
      throw new Error(`No players extracted (got ${players?.length ?? 0})`);
    }

    const fetchedAt = new Date().toISOString();
    const rows = players
      .filter((p) => p?.name && p?.position && typeof p?.value_200 === "number" && p.value_200 > 0)
      .map((p) => ({
        player_name: p.name,
        player_name_norm: norm(p.name),
        team: p.team ?? null,
        position: p.position === "DEF" ? "DST" : p.position,
        overall_rank: p.overall_rank ?? null,
        position_rank: p.position_rank ?? null,
        value_200: Math.max(1, Math.round(p.value_200)),
        fetched_at: fetchedAt,
      }))
      .filter((r) => r.player_name_norm.length > 0);

    // Dedupe on player_name_norm (keep highest value if duplicates)
    const byKey = new Map<string, typeof rows[number]>();
    for (const r of rows) {
      const cur = byKey.get(r.player_name_norm);
      if (!cur || r.value_200 > cur.value_200) byKey.set(r.player_name_norm, r);
    }
    const finalRows = Array.from(byKey.values());

    const { error: upsertErr } = await sb
      .from("draftsharks_sf_values")
      .upsert(finalRows, { onConflict: "player_name_norm" });
    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({ ok: true, synced: finalRows.length, fetchedAt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("draftsharks-sync error", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
