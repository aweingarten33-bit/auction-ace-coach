// Pulls current-season ESPN positional rankings + auction values for all
// fantasy-relevant players. Cached in espn_player_ranks so the Vetri panel
// can auto-assign a tier when Sal doesn't say one.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization");
    let userId: string | null = null;
    if (auth) {
      const sb = createClient(url, anon, { global: { headers: { Authorization: auth } } });
      const { data: u } = await sb.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
      if (u.user) userId = u.user.id;
    }

    const sbAdmin = createClient(url, serviceKey);

    let creds: { swid: string; espn_s2: string; league_id: number | null; season_id: number | null } | null = null;
    if (userId) {
      const { data } = await sbAdmin.from("espn_credentials").select("swid, espn_s2, league_id, season_id").eq("user_id", userId).maybeSingle();
      creds = data;
    }
    if (!creds?.season_id) {
      const { data: shared } = await sbAdmin.from("espn_credentials").select("swid, espn_s2, league_id, season_id").not("season_id", "is", null).order("last_verified_at", { ascending: false }).limit(1).maybeSingle();
      if (shared?.season_id) creds = shared;
    }
    if (!creds?.season_id) return j({ error: "Connect ESPN first." }, 400);

    const season = creds.season_id;
    const cookie = creds.swid && creds.espn_s2 ? `SWID=${creds.swid}; espn_s2=${creds.espn_s2}` : "";

    // kona_player_info returns full draftRanksByRankType + auctionValue.
    // players_wl does NOT — prior runs saved 14k rows with every rank null.
    // filterStatsForTopScoringPeriodIds asks ESPN to include projected season stats
    // (statSourceId=1, statSplitTypeId=0, seasonId=current) in player.stats[].
    const filter = {
      players: {
        limit: 600,
        sortDraftRanks: { sortPriority: 100, sortAsc: true, value: "STANDARD" },
        filterSlotIds: { value: [0, 2, 4, 6, 17, 16] },
        filterRanksForSlotIds: { value: [0, 2, 4, 6, 17, 16] },
        filterStatsForTopScoringPeriodIds: { value: 17, additionalValue: [`10${season}`, `00${season}`] },
      },
    };

    const espnUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/segments/0/leaguedefaults/3?view=kona_player_info`;
    const r = await fetch(espnUrl, {
      headers: {
        accept: "application/json",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://fantasy.espn.com/",
        origin: "https://fantasy.espn.com",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(cookie ? { cookie } : {}),
        "x-fantasy-filter": JSON.stringify(filter),
        "x-fantasy-source": "kona",
        "x-fantasy-platform": "kona-PROD",
      },
    });
    const text = await r.text();
    if (!r.ok) return j({ error: `ESPN ${r.status}`, body: text.slice(0, 200) }, 502);
    if (text.trimStart().startsWith("<")) {
      return j({ error: "ESPN returned HTML instead of JSON (likely auth/WAF block)", body: text.slice(0, 200) }, 502);
    }
    let parsed: any;
    try { parsed = JSON.parse(text); } catch (e) {
      return j({ error: `Bad JSON from ESPN: ${e instanceof Error ? e.message : String(e)}`, body: text.slice(0, 200) }, 502);
    }
    // kona_player_info returns { players: [{ player: {...}, ... }] }
    const players: any[] = Array.isArray(parsed?.players)
      ? parsed.players.map((entry: any) => entry.player ?? entry)
      : Array.isArray(parsed) ? parsed : [];
    if (!players.length) return j({ error: "No players in ESPN response", body: JSON.stringify(parsed).slice(0, 200) }, 502);

    const rows = players
      .map((p: any) => {
        const id = p.id;
        const name = p.fullName ?? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
        if (!id || !name) return null;
        const position = POS[p.defaultPositionId] ?? null;
        // Prefer PPR (most leagues, incl. half-PPR which ESPN doesn't publish separately).
        const ranks = p.draftRanksByRankType?.PPR ?? p.draftRanksByRankType?.STANDARD ?? null;

        // ESPN projected season stat line. statSourceId=1 (projected),
        // statSplitTypeId=0 (full season), seasonId=current.
        let projected_stats: Record<string, number> | null = null;
        let projected_points: number | null = null;
        if (Array.isArray(p.stats)) {
          const proj = p.stats.find((s: any) =>
            s.seasonId === season && s.statSourceId === 1 && s.statSplitTypeId === 0
          );
          if (proj) {
            projected_points = typeof proj.appliedTotal === "number" ? Math.round(proj.appliedTotal * 10) / 10 : null;
            const st = proj.stats || {};
            const num = (k: string | number) => {
              const v = st[String(k)];
              return typeof v === "number" ? Math.round(v) : null;
            };
            // ESPN stat IDs: 3 passYds, 4 passTD, 20 int, 23 rushAtt, 24 rushYds, 25 rushTD,
            // 41 rec, 42 recYds, 43 recTD, 53 targets, 210 games. Only keep non-null fields.
            const raw: Record<string, number | null> = {
              passYds: num(3),
              passTD: num(4),
              int: num(20),
              rushAtt: num(23),
              rushYds: num(24),
              rushTD: num(25),
              rec: num(53) ?? num(41),
              recYds: num(42),
              recTD: num(43),
              targets: num(58),
              games: num(210),
            };
            const cleaned: Record<string, number> = {};
            for (const [k, v] of Object.entries(raw)) if (v != null && v !== 0) cleaned[k] = v;
            if (Object.keys(cleaned).length) projected_stats = cleaned;
          }
        }

        return {
          season,
          espn_player_id: id,
          player_name: name,
          player_name_norm: norm(name),
          position,
          overall_rank: ranks?.rank ?? null,
          pos_rank: ranks?.positionalRank ?? null,
          auction_value: ranks?.auctionValue ?? null,
          projected_points,
          projected_stats,
          prior_ppg: null as number | null,
          prior_season: null as number | null,
        };
      })
      .filter(Boolean) as Array<any>;

    // Compute pos_rank ourselves when ESPN omits positionalRank: rank players
    // within each position by overall_rank ascending. This is what the auto-fill
    // tier mapping needs.
    const byPos = new Map<string, typeof rows>();
    for (const r of rows) {
      if (!r.position || r.overall_rank == null) continue;
      const arr = byPos.get(r.position) ?? [];
      arr.push(r);
      byPos.set(r.position, arr);
    }
    for (const arr of byPos.values()) {
      arr.sort((a, b) => (a.overall_rank ?? 9999) - (b.overall_rank ?? 9999));
      arr.forEach((r, i) => { if (r.pos_rank == null) r.pos_rank = i + 1; });
    }

    // Fetch last season's actual fantasy stats so the auto-fill can sanity-check
    // ESPN's preseason rank against real production (e.g. ESPN ranks a guy WR15
    // but he was WR4 in PPG -> bump his tier).
    const priorSeason = season - 1;
    try {
      const priorUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${priorSeason}/segments/0/leaguedefaults/3?view=kona_player_info`;
      const priorFilter = {
        players: {
          limit: 1000,
          filterStatsForTopScoringPeriodIds: { value: 17, additionalValue: [`00${priorSeason}`] },
        },
      };
      const pr = await fetch(priorUrl, {
        headers: {
          accept: "application/json",
          referer: "https://fantasy.espn.com/",
          origin: "https://fantasy.espn.com",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          ...(cookie ? { cookie } : {}),
          "x-fantasy-filter": JSON.stringify(priorFilter),
          "x-fantasy-source": "kona",
          "x-fantasy-platform": "kona-PROD",
        },
      });
      const ptext = await pr.text();
      if (pr.ok && !ptext.trimStart().startsWith("<")) {
        const pparsed = JSON.parse(ptext);
        const ppl: any[] = Array.isArray(pparsed?.players)
          ? pparsed.players.map((e: any) => e.player ?? e)
          : Array.isArray(pparsed) ? pparsed : [];
        const ppgById = new Map<number, number>();
        for (const p of ppl) {
          if (!p?.id || !Array.isArray(p.stats)) continue;
          // statSourceId 0 = actual, statSplitTypeId 0 = full season
          const actual = p.stats.find((s: any) =>
            s.seasonId === priorSeason && s.statSourceId === 0 && s.statSplitTypeId === 0
          );
          const ppg = actual?.appliedAverage;
          if (typeof ppg === "number" && ppg > 0) ppgById.set(p.id, Math.round(ppg * 10) / 10);
        }
        for (const r of rows) {
          const ppg = ppgById.get(r.espn_player_id);
          if (ppg != null) {
            r.prior_ppg = ppg;
            r.prior_season = priorSeason;
          }
        }
      }
    } catch (e) {
      console.warn(`prior-season stats fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    let upserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sbAdmin
        .from("espn_player_ranks")
        .upsert(chunk, { onConflict: "season,espn_player_id" });
      if (error) return j({ error: `upsert: ${error.message}`, upserted }, 500);
      upserted += chunk.length;
    }

    return j({ ok: true, season, upserted });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
