import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const leagueId = String(req.query["leagueId"] ?? "");
  const season   = String(req.query["season"] ?? new Date().getFullYear());
  const swid     = String(req.query["swid"] ?? "");
  const s2       = String(req.query["s2"] ?? "");

  if (!leagueId) return res.status(400).json({ error: "leagueId is required" });

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam&view=mSettings`;

  try {
    const cookie = swid && s2 ? `SWID=${swid}; espn_s2=${s2}` : "";
    const r = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-fantasy-source": "kona",
        "x-fantasy-platform": "kona-PROD",
        "user-agent": "Mozilla/5.0",
        ...(cookie ? { cookie } : {}),
      },
    });

    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: "ESPN request failed", status: r.status, body: body.slice(0, 200) });
    }

    const data = (await r.json()) as { teams?: any[]; settings?: any };
    const leagueName = data.settings?.name ?? null;
    const teams = (data.teams ?? []).map((t: any) => {
      const name = [t.location, t.nickname].filter(Boolean).join(" ").trim() || t.name || `Team ${t.id}`;
      return { id: String(t.id), name, abbrev: t.abbrev ?? "" };
    });

    return res.json({ teams, leagueId, season, leagueName });
  } catch (err) {
    return res.status(500).json({ error: "Fetch failed", message: String(err) });
  }
}
