// Returns drafting trends for a given team over the last N seasons.
// Public (no auth) — read-only research data shared across the league.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Pick {
  season: number;
  team_id: number;
  player_name: string;
  position: string | null;
  bid_amount: number;
  pick_overall: number | null;
}

const POS_GROUPS = ["QB", "RB", "WR", "TE", "K", "DST"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const teamId = Number(url.searchParams.get("team_id"));
    const seasons = Number(url.searchParams.get("seasons") ?? 3);
    if (!teamId || Number.isNaN(teamId)) {
      return new Response(JSON.stringify({ error: "team_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("league_auction_history")
      .select("season, team_id, player_name, position, bid_amount, pick_overall")
      .eq("team_id", teamId)
      .order("season", { ascending: false });

    if (error) throw error;

    // Dedupe: multiple users ingest the same league. Key by season+pick_overall.
    const seen = new Set<string>();
    const picks: Pick[] = [];
    for (const row of (data ?? []) as Pick[]) {
      const key = `${row.season}-${row.pick_overall}-${row.player_name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push(row);
    }

    // Restrict to last N seasons
    const allSeasons = Array.from(new Set(picks.map((p) => p.season))).sort((a, b) => b - a);
    const useSeasons = allSeasons.slice(0, seasons);
    const recent = picks.filter((p) => useSeasons.includes(p.season));

    if (recent.length === 0) {
      return new Response(
        JSON.stringify({ seasons: [], trends: null, picks: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Per-season aggregates
    const perSeason = useSeasons.map((s) => {
      const rows = recent.filter((p) => p.season === s);
      const total = rows.reduce((sum, r) => sum + (r.bid_amount ?? 0), 0);
      const byPos: Record<string, { spend: number; count: number }> = {};
      for (const p of POS_GROUPS) byPos[p] = { spend: 0, count: 0 };
      for (const r of rows) {
        const pos = (r.position ?? "").toUpperCase();
        const bucket = byPos[pos] ?? (byPos[pos] = { spend: 0, count: 0 });
        bucket.spend += r.bid_amount ?? 0;
        bucket.count += 1;
      }
      const top3Spend = [...rows]
        .sort((a, b) => (b.bid_amount ?? 0) - (a.bid_amount ?? 0))
        .slice(0, 3)
        .reduce((s, r) => s + (r.bid_amount ?? 0), 0);
      const topPick = rows.reduce<Pick | null>(
        (best, r) => (!best || (r.bid_amount ?? 0) > (best.bid_amount ?? 0) ? r : best),
        null,
      );
      return { season: s, total, byPos, top3Spend, topPick };
    });

    // Average position spend + count across seasons
    const avgByPos: Record<string, number> = {};
    const avgCountByPos: Record<string, number> = {};
    for (const pos of POS_GROUPS) {
      const sumSpend = perSeason.reduce((s, ps) => s + (ps.byPos[pos]?.spend ?? 0), 0);
      const sumCount = perSeason.reduce((s, ps) => s + (ps.byPos[pos]?.count ?? 0), 0);
      avgByPos[pos] = perSeason.length ? Math.round(sumSpend / perSeason.length) : 0;
      avgCountByPos[pos] = perSeason.length
        ? Math.round((sumCount / perSeason.length) * 10) / 10
        : 0;
    }
    const avgTotal = perSeason.length
      ? Math.round(perSeason.reduce((s, ps) => s + ps.total, 0) / perSeason.length)
      : 0;
    const avgTop3Pct = perSeason.length
      ? perSeason.reduce(
          (s, ps) => s + (ps.total ? ps.top3Spend / ps.total : 0),
          0,
        ) / perSeason.length
      : 0;
    const avgTopBid = perSeason.length
      ? Math.round(
          perSeason.reduce((s, ps) => s + (ps.topPick?.bid_amount ?? 0), 0) /
            perSeason.length,
        )
      : 0;

    // Style label
    let style = "Balanced";
    if (avgTop3Pct > 0.55) style = "Stars & Scrubs";
    else if (avgTop3Pct < 0.4) style = "Spread the Wealth";

    // Top position by spend
    const topPos = (Object.entries(avgByPos).sort((a, b) => b[1] - a[1])[0] ?? ["—", 0])[0];

    // Cheap-position tendency: smallest non-zero among QB/TE
    const lateRound = ["QB", "TE"].sort(
      (a, b) => (avgByPos[a] ?? 0) - (avgByPos[b] ?? 0),
    )[0];

    return new Response(
      JSON.stringify({
        seasons: useSeasons,
        perSeason,
        trends: {
          avgByPos,
          avgTotal,
          avgTop3Pct,
          avgTopBid,
          style,
          topPos,
          lateRound,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("team-trends error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
