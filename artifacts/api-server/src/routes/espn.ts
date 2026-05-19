import { Router, type IRouter } from "express";

const router: IRouter = Router();

type EspnTeam = {
  id: number;
  abbrev?: string;
  name?: string;
  location?: string;
  nickname?: string;
};

router.get("/espn/teams", async (req, res) => {
  const leagueId = String(req.query["leagueId"] ?? "");
  const season = String(req.query["season"] ?? new Date().getFullYear());
  const swid = String(req.query["swid"] ?? "");
  const s2 = String(req.query["s2"] ?? "");

  if (!leagueId) {
    return res.status(400).json({ error: "leagueId is required" });
  }

  const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leagues/${leagueId}?view=mTeam`;

  try {
    const cookie = swid && s2 ? `SWID=${swid}; espn_s2=${s2}` : "";
    const r = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-fantasy-source": "kona",
        "x-fantasy-platform": "kona-PROD",
        ...(cookie ? { cookie } : {}),
      },
    });

    if (!r.ok) {
      const body = await r.text();
      return res
        .status(r.status)
        .json({ error: "ESPN request failed", status: r.status, body: body.slice(0, 500) });
    }

    const data = (await r.json()) as { teams?: EspnTeam[] };
    const teams = (data.teams ?? []).map((t) => {
      const name =
        [t.location, t.nickname].filter(Boolean).join(" ").trim() ||
        t.name ||
        `Team ${t.id}`;
      return { id: String(t.id), name, abbrev: t.abbrev ?? "" };
    });

    return res.json({ teams, leagueId, season });
  } catch (err) {
    return res.status(500).json({ error: "Fetch failed", message: String(err) });
  }
});

export default router;
