// Verifies ESPN cookies and returns the user's leagues for the requested season.
// Stores cookies + selected league in espn_credentials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fan API "abbrev" → game slug. Anything not in this map (FFLPK pickem,
// FFLM tournament challenge, etc.) is filtered out.
const GAME_SLUG: Record<string, string> = {
  FFL: "ffl", FBA: "fba", FLB: "flb", FHL: "fhl",
};

interface Body {
  swid: string;
  espn_s2: string;
  season: number;
  sport?: string;
  league_id?: number;
  team_id?: number;
  save?: boolean;
  clear_selection?: boolean;
}

interface League {
  sport: string;
  game: string;
  season: number;
  leagueId: number;
  leagueName: string;
  teamId: number;
  teamName?: string;
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

    const { swid, s2 } = normalizeCookies(body.swid, body.espn_s2);
    const fanId = swid.replace(/[{}]/g, "");
    console.log("[espn-connect] swid:", swid, "| s2 len:", s2.length, "| s2 head:", s2.slice(0, 16), "tail:", s2.slice(-16));

    if (!/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(fanId)) {
      return j({ error: "Invalid SWID", hint: "The SWID must be a valid UUID. Copy it directly from Chrome DevTools → Application → Cookies → espn.com." }, 400);
    }
    if (!/^[\x21-\x7E]+$/.test(s2)) {
      return j({ error: "Invalid espn_s2", hint: "The espn_s2 cookie contains invalid characters. Copy the raw value from DevTools." }, 400);
    }
    if (s2.length < 200) {
      return j({ error: "espn_s2 looks truncated", hint: `Got ${s2.length} chars; a real espn_s2 is 300+ chars. In Chrome DevTools → Application → Cookies → espn.com, click the espn_s2 row and copy the full value from the "Cookie Value" panel at the bottom (the table column truncates it).` }, 400);
    }

    const allLeagues = await fetchLeagues(swid, s2);

    // Filter for the requested season (and optional sport)
    const seasonLeagues = allLeagues.filter((l) =>
      l.season === Number(body.season) && (!body.sport || l.sport === body.sport)
    );

    // Persist creds + optional selection
    if (body.save !== false) {
      const upsertRow: Record<string, unknown> = {
        user_id: u.user.id,
        swid, espn_s2: s2,
        season_id: body.season,
        last_verified_at: new Date().toISOString(),
      };
      if (body.league_id) upsertRow.league_id = body.league_id;
      if (body.team_id) upsertRow.team_id = body.team_id;
      if (body.clear_selection) {
        upsertRow.league_id = null;
        upsertRow.team_id = null;
      }
      const { error } = await sb.from("espn_credentials").upsert(upsertRow, { onConflict: "user_id" });
      if (error) return j({ error: error.message }, 500);
    }

    return j({
      ok: true,
      season: body.season,
      leagues: seasonLeagues,
      debug: {
        totalEntries: allLeagues.length,
        seasons: [...new Set(allLeagues.map((l) => l.season))],
        sports: [...new Set(allLeagues.map((l) => l.sport))],
      },
      hint: seasonLeagues.length === 0
        ? `ESPN returned ${allLeagues.length} fantasy entries but none matched season ${body.season}.`
        : undefined,
    });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// ─────────────────────────── helpers ───────────────────────────

function normalizeCookies(rawSwid: string, rawS2: string) {
  const clean = (v: string) => v.trim().replace(/^['"]|['"]$/g, "");
  const cookieValue = (raw: string, name: string) => {
    const value = clean(raw);
    const m = value.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`, "i"));
    return clean(m?.[1] ?? value);
  };

  let swid = cookieValue(rawSwid, "SWID")
    .replace(/\s+/g, "")
    .replace(/^%7B/i, "{")
    .replace(/%7D$/i, "}");
  if (!swid.startsWith("{")) swid = `{${swid}`;
  if (!swid.endsWith("}")) swid = `${swid}}`;

  const s2 = cookieValue(rawS2, "espn_s2").replace(/\s+/g, "");
  return { swid, s2 };
}

async function fetchLeagues(swid: string, s2: string): Promise<League[]> {
  // CRITICAL: encodeURIComponent(swid) keeps the braces → %7BGUID%7D in the path.
  // Stripping the braces returns 404 "fan not found".
  const fanUrl =
    `https://fan.api.espn.com/apis/v2/fans/${encodeURIComponent(swid)}` +
    `?context=fantasy&featureFlags=expandAthlete&showAirings=buy,live,replay` +
    `&source=ESPN.com+-+FAM`;

  const res = await fetch(fanUrl, {
    headers: {
      cookie: `SWID=${swid}; espn_s2=${s2}`,
      accept: "application/json",
      "accept-language": "en-US,en;q=0.9",
      referer: "https://fantasy.espn.com/",
      origin: "https://fantasy.espn.com",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`ESPN fan API ${res.status}: ${detail || "(empty body)"}`);
  }

  return parseLeagues(await res.json());
}

function parseLeagues(fan: unknown): League[] {
  // deno-lint-ignore no-explicit-any
  const prefs: any[] = Array.isArray((fan as any)?.preferences) ? (fan as any).preferences : [];
  const out: League[] = [];

  for (const p of prefs) {
    const entry = p?.metaData?.entry;
    if (!entry) continue;
    const abbrev: string = entry.abbrev ?? "";
    const game = GAME_SLUG[abbrev];
    if (!game) continue;
    // deno-lint-ignore no-explicit-any
    const groups: any[] = Array.isArray(entry.groups) ? entry.groups : [];
    const group = groups[0];
    if (!group?.groupId) continue;
    const seasonId = Number(entry.seasonId);
    const leagueId = Number(group.groupId);
    const teamId = Number(entry.entryId);
    if (!seasonId || !leagueId || !teamId) continue;
    out.push({
      sport: abbrev,
      game,
      season: seasonId,
      leagueId,
      leagueName: String(group.groupName ?? "").trim(),
      teamId,
      teamName: entry.entryMetadata?.teamName ?? undefined,
    });
  }

  const seen = new Set<string>();
  return out.filter((l) => {
    const k = `${l.season}-${l.leagueId}-${l.teamId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
