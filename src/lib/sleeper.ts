// Sleeper public API — no auth needed.
// Players endpoint is ~5MB; we fetch once per day and cache in localStorage.

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
}

const CACHE_KEY = "sleeper_players_v2";
const CACHE_TS_KEY = "sleeper_players_ts_v2";
const ONE_DAY = 24 * 60 * 60 * 1000;
const FANTASY_POS = new Set(["QB", "RB", "WR", "TE", "K", "DEF"]);

let memCache: SleeperPlayer[] | null = null;
let inflight: Promise<SleeperPlayer[]> | null = null;

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
    const resp = await fetch("https://api.sleeper.app/v1/players/nfl");
    if (!resp.ok) throw new Error("Sleeper fetch failed");
    const raw = await resp.json();
    const list: SleeperPlayer[] = [];
    for (const id in raw) {
      const p = raw[id];
      if (!p) continue;
      const pos = p.position;
      if (!pos || !FANTASY_POS.has(pos)) continue;
      // Skip retired/inactive players with no team unless they have a search_rank
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
