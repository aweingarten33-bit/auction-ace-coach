// Sleeper public API — no auth needed.
// Players endpoint is ~5MB; we fetch once per day and cache in localStorage.
// Season projections (yds/TDs/rec/PPR pts) are merged onto each player.

export interface SleeperProjection {
  games?: number | null;
  pts_ppr?: number | null;
  pts_half_ppr?: number | null;
  pass_yd?: number | null;
  pass_td?: number | null;
  pass_int?: number | null;
  rush_att?: number | null;
  rush_yd?: number | null;
  rush_td?: number | null;
  rec?: number | null;
  rec_yd?: number | null;
  rec_td?: number | null;
}

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  age?: number | null;
  years_exp?: number | null;
  status?: string | null;
  injury_status?: string | null;
  injury_notes?: string | null;
  injury_body_part?: string | null;
  number?: number | null;
  height?: string | null;
  weight?: string | null;
  depth_chart_order?: number | null;
  depth_chart_position?: string | null;
  fantasy_positions?: string[] | null;
  search_rank?: number | null;
  projection?: SleeperProjection | null;
}

const CACHE_KEY = "sleeper_players_v3"; // bumped: now includes projections
const CACHE_TS_KEY = "sleeper_players_ts_v3";
const ONE_DAY = 24 * 60 * 60 * 1000;
const FANTASY_POS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

let memCache: SleeperPlayer[] | null = null;
let inflight: Promise<SleeperPlayer[]> | null = null;

async function fetchProjectionsByPlayerId(): Promise<Map<string, SleeperProjection>> {
  try {
    const resp = await fetch(
      "https://api.sleeper.com/projections/nfl/2025?season_type=regular&order_by=ppr",
    );
    if (!resp.ok) return new Map();
    const raw: Array<{ player_id: string; stats?: Record<string, number | null> }> = await resp.json();
    const m = new Map<string, SleeperProjection>();
    for (const row of raw) {
      const s = row.stats || {};
      m.set(row.player_id, {
        games: s.gp ?? null,
        pts_ppr: s.pts_ppr ?? null,
        pts_half_ppr: s.pts_half_ppr ?? null,
        pass_yd: s.pass_yd ?? null,
        pass_td: s.pass_td ?? null,
        pass_int: s.pass_int ?? null,
        rush_att: s.rush_att ?? null,
        rush_yd: s.rush_yd ?? null,
        rush_td: s.rush_td ?? null,
        rec: s.rec ?? null,
        rec_yd: s.rec_yd ?? null,
        rec_td: s.rec_td ?? null,
      });
    }
    return m;
  } catch {
    return new Map();
  }
}

export async function loadSleeperPlayers(): Promise<SleeperPlayer[]> {
  if (memCache) return memCache;
  if (inflight) return inflight;

  // Try localStorage
  try {
    const ts = parseInt(localStorage.getItem(CACHE_TS_KEY) || "0", 10);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && Date.now() - ts < ONE_DAY) {
      memCache = JSON.parse(cached);
      return memCache!;
    }
  } catch {}

  inflight = (async () => {
    const [resp, projMap] = await Promise.all([
      fetch("https://api.sleeper.app/v1/players/nfl"),
      fetchProjectionsByPlayerId(),
    ]);
    if (!resp.ok) throw new Error("Sleeper fetch failed");
    const raw = await resp.json();
    const list: SleeperPlayer[] = [];
    for (const id in raw) {
      const p = raw[id];
      if (!p) continue;
      const pos = p.position;
      if (!pos || !FANTASY_POS.has(pos)) continue;
      const name = p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
      if (!name) continue;
      list.push({
        player_id: id,
        full_name: name,
        first_name: p.first_name,
        last_name: p.last_name,
        position: pos === "DEF" ? "DST" : pos,
        team: p.team,
        age: p.age,
        years_exp: p.years_exp,
        status: p.status,
        injury_status: p.injury_status,
        injury_notes: p.injury_notes,
        injury_body_part: p.injury_body_part,
        number: p.number,
        height: p.height,
        weight: p.weight,
        depth_chart_order: p.depth_chart_order,
        depth_chart_position: p.depth_chart_position,
        fantasy_positions: p.fantasy_positions,
        search_rank: p.search_rank ?? 999999,
        projection: projMap.get(id) ?? null,
      });
    }
    list.sort((a, b) => (a.search_rank ?? 9e9) - (b.search_rank ?? 9e9));
    memCache = list;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
    } catch {}
    return list;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function searchPlayers(
  players: SleeperPlayer[],
  query: string,
  limit = 8
): SleeperPlayer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts: SleeperPlayer[] = [];
  const contains: SleeperPlayer[] = [];
  for (const p of players) {
    const name = p.full_name.toLowerCase();
    if (name.startsWith(q)) starts.push(p);
    else if (name.includes(q)) contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

// 2025 NFL bye weeks (regular season). Update yearly.
export const NFL_BYE_WEEKS_2025: Record<string, number> = {
  PIT: 5, CHI: 5, ATL: 5, GB: 5,
  HOU: 6, MIN: 6,
  BAL: 7, BUF: 7,
  ARI: 8, DET: 8, JAX: 8, LV: 8, LAR: 8, SEA: 8,
  CLE: 9, NYJ: 9, PHI: 9, TB: 9,
  CIN: 10, DAL: 10, KC: 10, TEN: 10,
  IND: 11, NO: 11,
  DEN: 12, LAC: 12, MIA: 12, WAS: 12,
  CAR: 14, NE: 14, NYG: 14, SF: 14,
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

let nameIndex: Map<string, SleeperPlayer> | null = null;
function buildIndex(players: SleeperPlayer[]) {
  const m = new Map<string, SleeperPlayer>();
  for (const p of players) {
    const key = norm(p.full_name);
    // Prefer the higher-ranked (lower search_rank) when names collide
    const existing = m.get(key);
    if (!existing || (p.search_rank ?? 9e9) < (existing.search_rank ?? 9e9)) {
      m.set(key, p);
    }
  }
  return m;
}

export function findPlayerByName(
  players: SleeperPlayer[],
  name: string,
): SleeperPlayer | undefined {
  if (!players?.length || !name) return undefined;
  if (!nameIndex || nameIndex.size !== players.length) {
    nameIndex = buildIndex(players);
  }
  return nameIndex.get(norm(name));
}

export function byeWeekForTeam(team?: string | null): number | undefined {
  if (!team) return undefined;
  return NFL_BYE_WEEKS_2025[team.toUpperCase()];
}

export interface TrendingAdd {
  player_id: string;
  count: number;
  player?: SleeperPlayer;
}

export async function fetchTrendingAdds(
  lookbackHours = 24,
  limit = 25,
): Promise<TrendingAdd[]> {
  const [resp, players] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=${lookbackHours}&limit=${limit}`),
    loadSleeperPlayers(),
  ]);
  if (!resp.ok) throw new Error("Sleeper trending fetch failed");
  const raw: { player_id: string; count: number }[] = await resp.json();
  const byId = new Map(players.map((p) => [p.player_id, p]));
  return raw
    .map((r) => ({ ...r, player: byId.get(r.player_id) }))
    .filter((r) => r.player && (r.player.position && r.player.position !== "K"));
}
