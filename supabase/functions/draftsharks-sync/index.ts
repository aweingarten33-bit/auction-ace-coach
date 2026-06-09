// Scrape DraftSharks Superflex auction values via Firecrawl and parse the FULL
// HTML table (524+ player rows are all server-rendered, just JS-paginated visually).
// Stores marketValue (consensus across experts) per player.
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

interface ParsedPlayer {
  player_name: string;
  player_name_norm: string;
  team: string | null;
  position: string;
  overall_rank: number | null;
  position_rank: number | null;
  value_200: number;
}

function parseRows(html: string): ParsedPlayer[] {
  // Strip SVG bodies — they bloat the HTML and trip up regex
  const stripped = html.replace(/<svg[\s\S]*?<\/svg>/g, "");
  const rowRe = /<tr class="player-row">([\s\S]*?)<\/tr>/g;
  const out: ParsedPlayer[] = [];
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(stripped)) !== null) {
    const row = m[1];
    const rank = row.match(/<div class="column-title rank-index">\s*(\d+)\s*<\/div>/)?.[1];
    // Player name — prefer the hide-on-mobile link (full name)
    const name = row.match(/<a class="hide-on-mobile"[^>]*>\s*([^<]+?)\s*<\/a>/)?.[1]
              ?? row.match(/href="https:\/\/www\.draftsharks\.com\/fantasy\/points-outlook\/[^"]+"[^>]*>\s*([^<]+?)\s*<\/a>/)?.[1];
    if (!name) continue;
    // Team is a <span> inside team-position-logo-container
    const teamMatch = row.match(/<div class="team-position-logo-container">[\s\S]*?<span>\s*([A-Z]{2,4})\s*<\/span>/);
    const team = teamMatch ? teamMatch[1] : null;
    // Position-rank text e.g. "QB1", "RB12" — the wrapping class is unreliable, parse text
    const posRankText = row.match(/<div class="position-rank[^"]*">\s*([A-Z/]+)(\d+)\s*<\/div>/);
    if (!posRankText) continue;
    let position = posRankText[1];
    const positionRank = Number(posRankText[2]);
    if (position === "DEF" || position === "D/ST") position = "DST";
    // Market value (consensus across experts)
    const valMatch = row.match(/data-attribute="auctionMarketValue"[^>]*data-value="\$(\d+)"/)
                  ?? row.match(/data-value="\$(\d+)"\s+data-attribute="auctionMarketValue"/);
    if (!valMatch) continue;
    const value = Number(valMatch[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const cleanName = name.trim();
    const nameNorm = norm(cleanName);
    if (!nameNorm) continue;
    out.push({
      player_name: cleanName,
      player_name_norm: nameNorm,
      team,
      position,
      overall_rank: rank ? Number(rank) : null,
      position_rank: positionRank,
      value_200: Math.max(1, Math.round(value)),
    });
  }
  return out;
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
        formats: ["html"],
        onlyMainContent: false,
      }),
    });
    if (!fcRes.ok) {
      const txt = await fcRes.text();
      throw new Error(`Firecrawl ${fcRes.status}: ${txt.slice(0, 300)}`);
    }
    const fcJson = await fcRes.json();
    const data = fcJson.data ?? fcJson;
    const html: string = data?.html ?? "";
    if (!html || html.length < 1000) throw new Error(`HTML too small (${html.length})`);

    const parsed = parseRows(html);
    if (parsed.length === 0) throw new Error("No player rows parsed — selectors may have changed");

    // Dedupe on norm key (keep highest value)
    const byKey = new Map<string, ParsedPlayer>();
    for (const p of parsed) {
      const cur = byKey.get(p.player_name_norm);
      if (!cur || p.value_200 > cur.value_200) byKey.set(p.player_name_norm, p);
    }
    const finalRows = Array.from(byKey.values()).map((r) => ({
      ...r,
      fetched_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await sb
      .from("draftsharks_sf_values")
      .upsert(finalRows, { onConflict: "player_name_norm" });
    if (upsertErr) throw upsertErr;

    return new Response(
      JSON.stringify({
        ok: true,
        scraped: parsed.length,
        synced: finalRows.length,
        sampleTop5: finalRows.slice(0, 5).map((r) => ({ name: r.player_name, pos: r.position, val: r.value_200 })),
      }),
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
