import type { VercelRequest, VercelResponse } from "@vercel/node";

const GAME_SLUG: Record<string, string> = {
  FFL: "ffl", FBA: "fba", FLB: "flb", FHL: "fhl",
};

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
  if (!swid.endsWith("}"))   swid = `${swid}}`;
  const s2 = cookieValue(rawS2, "espn_s2").replace(/\s+/g, "");
  return { swid, s2 };
}

function parseLeagues(fan: unknown): { sport: string; game: string; season: number; leagueId: number; leagueName: string; teamId: number; teamName?: string }[] {
  const prefs: any[] = Array.isArray((fan as any)?.preferences) ? (fan as any).preferences : [];
  const out: any[] = [];
  for (const p of prefs) {
    const entry = p?.metaData?.entry;
    if (!entry) continue;
    const abbrev: string = entry.abbrev ?? "";
    const game = GAME_SLUG[abbrev];
    if (!game) continue;
    const groups: any[] = Array.isArray(entry.groups) ? entry.groups : [];
    const group = groups[0];
    if (!group?.groupId) continue;
    const seasonId  = Number(entry.seasonId);
    const leagueId  = Number(group.groupId);
    const teamId    = Number(entry.entryId);
    if (!seasonId || !leagueId || !teamId) continue;
    out.push({
      sport:      abbrev,
      game,
      season:     seasonId,
      leagueId,
      leagueName: String(group.groupName ?? "").trim(),
      teamId,
      teamName:   entry.entryMetadata?.teamName ?? undefined,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { swid: rawSwid, espn_s2: rawS2, season, league_id, team_id } = req.body ?? {};

  if (!rawSwid || !rawS2) return res.status(400).json({ error: "swid and espn_s2 are required" });

  const { swid, s2 } = normalizeCookies(rawSwid, rawS2);
  const year = season ?? new Date().getFullYear();

  // If league_id provided, just confirm the selection (client stores in localStorage).
  if (league_id) {
    return res.json({ ok: true, league_id, team_id: team_id ?? null });
  }

  // Validate before hitting ESPN
  const fanId = swid.replace(/[{}]/g, "");
  if (!/^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/.test(fanId)) {
    return res.json({ leagues: [], error: "Invalid SWID — must be a UUID like {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}." });
  }
  if (s2.length < 200) {
    return res.json({ leagues: [], error: `espn_s2 looks truncated (${s2.length} chars). The real value is 300+ chars — copy from the "Cookie Value" panel at the bottom of DevTools.` });
  }

  // Fetch from ESPN's fan API (same endpoint as the original Supabase edge function)
  const fanUrl =
    `https://fan.api.espn.com/apis/v2/fans/${encodeURIComponent(swid)}` +
    `?context=fantasy&featureFlags=expandAthlete&showAirings=buy,live,replay&source=ESPN.com+-+FAM`;

  try {
    const r = await fetch(fanUrl, {
      headers: {
        cookie:            `SWID=${swid}; espn_s2=${s2}`,
        accept:            "application/json",
        "accept-language": "en-US,en;q=0.9",
        referer:           "https://fantasy.espn.com/",
        origin:            "https://fantasy.espn.com",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (r.status === 401 || r.status === 403) {
      return res.json({ leagues: [], error: "ESPN rejected these cookies — they may have expired. Re-copy SWID and espn_s2 from espn.com DevTools." });
    }
    if (!r.ok) {
      const body = (await r.text()).slice(0, 200);
      return res.json({ leagues: [], error: `ESPN returned ${r.status}. ${body}` });
    }

    const fan = await r.json();
    const allLeagues = parseLeagues(fan);
    const leagues = allLeagues.filter((l) => l.season === Number(year));

    if (leagues.length === 0 && allLeagues.length > 0) {
      return res.json({
        leagues: [],
        hint: `Connected to ESPN but no leagues found for season ${year}. Found leagues in seasons: ${[...new Set(allLeagues.map((l) => l.season))].join(", ")}.`,
      });
    }

    return res.json({ leagues });
  } catch (err) {
    return res.json({ leagues: [], error: `Could not reach ESPN: ${String(err)}` });
  }
}
