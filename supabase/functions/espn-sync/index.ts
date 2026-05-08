// Pulls league settings, teams, rosters, budgets from ESPN using stored cookies.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "missing auth" }, 401);

    const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u.user) return j({ error: "unauthorized" }, 401);

    // Prefer the caller's own creds; if their row lacks a league, fall back to
    // any configured league (ESPN connection is admin-owned/shared in this app).
    let { data: creds } = await sb
      .from("espn_credentials")
      .select("swid, espn_s2, league_id, season_id")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (!creds?.league_id || !creds?.season_id) {
      const admin = createClient(url, service);
      const { data: shared } = await admin
        .from("espn_credentials")
        .select("swid, espn_s2, league_id, season_id")
        .not("league_id", "is", null)
        .not("season_id", "is", null)
        .order("last_verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (shared?.league_id && shared?.season_id) creds = shared;
    }

    if (!creds?.league_id || !creds?.season_id) {
      return j({ error: "No league configured. Commissioner needs to connect ESPN first." }, 400);
    }


    const cookie = `SWID=${creds.swid}; espn_s2=${creds.espn_s2}`;
    // ESPN moved fantasy endpoints under lm-api-reads.fantasy.espn.com for recent seasons.
    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${creds.season_id}/segments/0/leagues/${creds.league_id}?view=mTeam&view=mRoster&view=mSettings&view=mDraftDetail&view=mStandings`;

    const r = await fetch(espnUrl, {
      headers: {
        cookie,
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
      },
    });
    const ctype = r.headers.get("content-type") ?? "";
    if (!r.ok || !ctype.includes("application/json")) {
      const body = await r.text();
      return j({
        error: `ESPN ${r.status}`,
        detail: body.slice(0, 300),
        hint: r.status === 401 || r.status === 403
          ? "Cookies expired — re-paste SWID + espn_s2."
          : "ESPN returned a non-JSON response (likely a login/redirect page).",
      }, 400);
    }
    const data = await r.json();

    const settings = data?.settings ?? {};
    const acq = settings?.acquisitionSettings ?? {};
    const roster = settings?.rosterSettings ?? {};
    const draft = settings?.draftSettings ?? {};

    // Auction draft budget. ESPN exposes it under draftSettings.auctionBudget;
    // acquisitionSettings.acquisitionBudget is the in-season FAAB waiver budget
    // and we must NOT use that (it's e.g. $75/$100 in most leagues).
    const auctionBudget =
      draft.auctionBudget ??
      settings?.draftSettings?.auctionBudget ??
      data?.draftDetail?.auctionBudget ??
      200;

    const teams = (data.teams ?? []).map((t: any) => ({
      id: t.id,
      name: `${t.location ?? ""} ${t.nickname ?? ""}`.trim() || `Team ${t.id}`,
      abbrev: t.abbrev,
      remainingBudget: auctionBudget - sumRosterPaid(t),
      roster: (t.roster?.entries ?? []).map((e: any) => ({
        playerId: e.playerId,
        name: e.playerPoolEntry?.player?.fullName,
        position: posCode(e.playerPoolEntry?.player?.defaultPositionId),
        bidAmount: e.playerPoolEntry?.appliedStatTotal ?? null,
        acquisitionType: e.acquisitionType,
      })),
    }));

    // Build keepers list for the requesting user's team.
    // ESPN exposes keeper info two ways:
    //   1. team.draftStrategy.keeperPlayerIds (just ids)
    //   2. roster entry's playerPoolEntry.keeperValue / keeperValueFuture (cost)
    //   3. draftDetail.picks[] with keeper=true and bidAmount (most reliable for $)
    // We combine them so we get name + position + actual keeper cost.
    const myTeamId = creds.team_id;
    const myTeam = (data.teams ?? []).find((t: any) => t.id === myTeamId);
    const keeperPicks = (data.draftDetail?.picks ?? []).filter(
      (p: any) => p.keeper === true && p.teamId === myTeamId,
    );
    const costByPid = new Map<number, number>();
    for (const p of keeperPicks) {
      if (typeof p.playerId === "number" && typeof p.bidAmount === "number") {
        costByPid.set(p.playerId, p.bidAmount);
      }
    }
    const keepers: { playerId: number; name: string; position: string | null; cost: number }[] = [];
    if (myTeam) {
      const keeperIds = new Set<number>([
        ...((myTeam.draftStrategy?.keeperPlayerIds as number[]) ?? []),
        ...costByPid.keys(),
      ]);
      for (const entry of myTeam.roster?.entries ?? []) {
        const pid = entry.playerId;
        const ppe = entry.playerPoolEntry;
        const kv = ppe?.keeperValue ?? ppe?.keeperValueFuture;
        const isKeeper = keeperIds.has(pid) || (typeof kv === "number" && kv > 0);
        if (!isKeeper) continue;
        const cost = costByPid.get(pid) ?? (typeof kv === "number" ? kv : 0);
        keepers.push({
          playerId: pid,
          name: ppe?.player?.fullName ?? `Player ${pid}`,
          position: posCode(ppe?.player?.defaultPositionId),
          cost,
        });
      }
    }

    // Infer scoring from receptions stat (statId 53). 1=PPR, 0.5=Half, 0=Standard
    const scoringItems: any[] = settings?.scoringSettings?.scoringItems ?? [];
    const recItem = scoringItems.find((i) => i.statId === 53);
    const recPts = typeof recItem?.points === "number" ? recItem.points : null;
    const scoringLabel = recPts == null
      ? null
      : recPts >= 0.9 ? "PPR" : recPts >= 0.4 ? "Half PPR" : "Standard";

    return j({
      ok: true,
      league: {
        id: creds.league_id,
        season: creds.season_id,
        name: settings.name,
        size: settings.size,
        budget: auctionBudget,
        faabBudget: acq.acquisitionBudget ?? null,
        rosterSlots: roster.lineupSlotCounts ?? {},
        scoring: scoringLabel,
        receptionPoints: recPts,
        draftType: draft.type,
        draftStarted: data.draftDetail?.drafted ?? false,
      },
      teams,
      keepers,
    });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function sumRosterPaid(t: any) {
  let sum = 0;
  for (const e of t.roster?.entries ?? []) {
    sum += e.playerPoolEntry?.appliedStatTotal ?? 0;
  }
  return sum;
}

const POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
function posCode(id?: number) { return id ? POS[id] ?? null : null; }

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
