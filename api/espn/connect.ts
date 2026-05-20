import type { VercelRequest, VercelResponse } from "@vercel/node";

// Calls ESPN's membership API to list all leagues the user belongs to.
// Also handles saving credential context (via returned data — client stores in localStorage).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { swid, espn_s2, season, league_id, team_id } = req.body ?? {};

  if (!swid || !espn_s2) return res.status(400).json({ error: "swid and espn_s2 are required" });

  const year = season ?? new Date().getFullYear();
  const cookie = `SWID=${swid}; espn_s2=${espn_s2}`;

  // If league_id provided, just confirm the selection (credentials stored client-side).
  if (league_id) {
    return res.json({ ok: true, league_id, team_id: team_id ?? null });
  }

  // Discover leagues via ESPN membership API.
  try {
    const r = await fetch(
      `https://fan.api.espn.com/apis/v1/memberships?region=us&lang=en&buyerId=espn&appId=ffl&view=mBasicteam&seasonId=${year}`,
      {
        headers: {
          accept: "application/json",
          cookie,
          "user-agent": "Mozilla/5.0",
        },
      }
    );

    if (r.status === 401 || r.status === 403) {
      return res.status(200).json({
        leagues: [],
        error: "ESPN rejected these cookies — they may have expired. Re-copy SWID and espn_s2 from espn.com DevTools.",
      });
    }

    if (!r.ok) {
      return res.status(200).json({
        leagues: [],
        hint: `ESPN returned ${r.status}. Try refreshing espn.com and re-copying the cookies.`,
      });
    }

    const memberships = (await r.json()) as any[];

    // ESPN returns an array of membership objects, each with a list of entries.
    // Each entry with appId "ffl" is a fantasy football league.
    const leagues: { leagueId: number; leagueName: string; teamId: number; teamName: string; seasonId: number }[] = [];

    for (const membership of memberships) {
      const entries = membership?.entries ?? [];
      for (const entry of entries) {
        if (entry?.appId !== "ffl") continue;
        const league = entry?.league;
        const team   = entry?.team;
        if (!league?.id) continue;
        leagues.push({
          leagueId:   league.id,
          leagueName: league.name ?? `League ${league.id}`,
          teamId:     team?.id ?? 0,
          teamName:   team?.name ?? "My Team",
          seasonId:   Number(year),
        });
      }
    }

    if (leagues.length === 0) {
      return res.json({
        leagues: [],
        hint: "No fantasy football leagues found for this account. Make sure you're using cookies from a logged-in espn.com session that has an active FFL league.",
      });
    }

    return res.json({ leagues });
  } catch (err) {
    return res.status(200).json({
      leagues: [],
      error: "Could not reach ESPN. Check your network and try again.",
    });
  }
}
