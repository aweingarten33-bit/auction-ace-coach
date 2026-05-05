// Pulls auction draft results from ESPN for the last N seasons and stores
// them in league_auction_history. Used to derive league-specific tier prices
// (e.g. "in your league, Tier 1 RBs avg $58") that anchor Vetri bid estimates.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POS: Record<number, string> = { 1: "QB", 2: "RB", 3: "WR", 4: "TE", 5: "K", 16: "DST" };
const posCode = (id?: number) => (id ? POS[id] ?? null : null);

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

    const body = await req.json().catch(() => ({}));
    const seasonsBack = Math.min(Math.max(parseInt(body.seasonsBack ?? "3", 10) || 3, 1), 15);

    const { data: creds } = await sb
      .from("espn_credentials")
      .select("swid, espn_s2, league_id, season_id")
      .eq("user_id", u.user.id)
      .maybeSingle();

    if (!creds?.league_id || !creds?.season_id) {
      return j({ error: "No ESPN league selected yet. Go to the ESPN connection step and pick your league + team, then come back." }, 400);
    }

    const cookie = `SWID=${creds.swid}; espn_s2=${creds.espn_s2}`;
    const currentSeason: number = creds.season_id;
    const seasons = Array.from({ length: seasonsBack }, (_, i) => currentSeason - 1 - i);

    const summary: { season: number; picks: number; status: string; error?: string }[] = [];

    for (const season of seasons) {
      try {
        const espnUrl =
          `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}` +
          `/segments/0/leagues/${creds.league_id}` +
          `?view=mDraftDetail&view=mSettings&view=mTeam`;

        const r = await fetch(espnUrl, {
          headers: {
            cookie,
            accept: "application/json",
            "accept-language": "en-US,en;q=0.9",
            referer: "https://fantasy.espn.com/",
            origin: "https://fantasy.espn.com",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
        });
        const text = await r.text();
        if (!r.ok) {
          summary.push({ season, picks: 0, status: "skipped", error: `ESPN ${r.status}: ${text.slice(0, 120)}` });
          continue;
        }
        if (text.trimStart().startsWith("<")) {
          summary.push({ season, picks: 0, status: "skipped", error: "ESPN returned HTML (auth/WAF block)" });
          continue;
        }
        let data: any;
        try { data = JSON.parse(text); } catch (e) {
          summary.push({ season, picks: 0, status: "skipped", error: `Bad JSON: ${e instanceof Error ? e.message : String(e)}` });
          continue;
        }

        const draftType = data?.settings?.draftSettings?.type;
        const picks = data?.draftDetail?.picks ?? [];
        if (!Array.isArray(picks) || picks.length === 0) {
          summary.push({ season, picks: 0, status: "no_draft_data" });
          continue;
        }

        // Build playerId -> {name, pos} from teams' rosters where present.
        const playerMap = new Map<number, { name: string; pos: string | null }>();
        for (const t of data.teams ?? []) {
          for (const e of t.roster?.entries ?? []) {
            const p = e.playerPoolEntry?.player;
            if (p?.id) {
              playerMap.set(p.id, { name: p.fullName ?? `Player ${p.id}`, pos: posCode(p.defaultPositionId) });
            }
          }
        }

        // Auction picks have bidAmount > 0; snake picks don't.
        const auctionPicks = picks.filter((p: any) => typeof p.bidAmount === "number" && p.bidAmount > 0);
        if (auctionPicks.length === 0) {
          summary.push({ season, picks: 0, status: draftType === 1 ? "snake_draft" : "no_auction_data" });
          continue;
        }

        // For any picks missing from team rosters (dropped players), fetch
        // player metadata in bulk from the players endpoint with x-fantasy-filter.
        const missingIds = auctionPicks
          .map((p: any) => p.playerId)
          .filter((id: number) => id && !playerMap.has(id));
        if (missingIds.length > 0) {
          try {
            const playersUrl = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${season}/players?view=players_wl`;
            const pr = await fetch(playersUrl, {
              headers: {
                cookie,
                accept: "application/json",
                "accept-language": "en-US,en;q=0.9",
                referer: "https://fantasy.espn.com/",
                origin: "https://fantasy.espn.com",
                "user-agent":
                  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "x-fantasy-filter": JSON.stringify({ players: { filterIds: { value: missingIds }, limit: missingIds.length } }),
                "x-fantasy-source": "kona",
                "x-fantasy-platform": "kona-PROD",
              },
            });
            const ptext = await pr.text();
            if (pr.ok && !ptext.trimStart().startsWith("<")) {
              const players = JSON.parse(ptext);
              if (Array.isArray(players)) {
                for (const p of players) {
                  if (p?.id) {
                    playerMap.set(p.id, {
                      name: p.fullName ?? (`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || `Player ${p.id}`),
                      pos: posCode(p.defaultPositionId),
                    });
                  }
                }
              }
            }
          } catch (_) { /* best-effort */ }
        }

        const rows = auctionPicks
          .map((p: any) => {
            const meta = playerMap.get(p.playerId) ?? { name: `Player ${p.playerId}`, pos: null };
            return {
              user_id: u.user.id,
              league_id: creds.league_id,
              season,
              espn_player_id: p.playerId,
              player_name: meta.name,
              position: meta.pos,
              bid_amount: p.bidAmount,
              team_id: p.teamId ?? null,
              pick_overall: p.overallPickNumber ?? null,
              raw: p,
            };
          });

        // Wipe + reinsert this season's data so re-syncs are idempotent.
        await sb
          .from("league_auction_history")
          .delete()
          .eq("user_id", u.user.id)
          .eq("league_id", creds.league_id)
          .eq("season", season);

        if (rows.length > 0) {
          const { error } = await sb.from("league_auction_history").insert(rows);
          if (error) {
            summary.push({ season, picks: 0, status: "insert_failed", error: error.message });
            continue;
          }
        }

        summary.push({ season, picks: rows.length, status: "ok" });
      } catch (e) {
        summary.push({ season, picks: 0, status: "error", error: e instanceof Error ? e.message : String(e) });
      }
    }

    return j({ ok: true, league_id: creds.league_id, summary });
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
