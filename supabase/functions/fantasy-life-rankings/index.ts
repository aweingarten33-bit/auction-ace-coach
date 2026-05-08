// FantasyLife rankings - per-position lists pulled from their free articles.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Player { rank: number; name: string; position: string; team: string; note?: string; }
interface RankList { source: string; label: string; position: string; url: string; players: Player[]; kind: "ranking" | "sleeper"; }

const SOURCES: { source: string; label: string; position: string; url: string; kind: "ranking" | "sleeper" }[] = [
  {
    source: "qb", label: "QB", position: "QB", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-a-way-too-early-look-at-qb",
  },
  {
    source: "rb", label: "RB", position: "RB", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-bijan-robinson-leads-the-top-20",
  },
  {
    source: "wr", label: "WR", position: "WR", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-a-way-too-early-look-at-wr",
  },
  {
    source: "te", label: "TE", position: "TE", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/2026-tight-end-tiers-for-fantasy-football-harold-fannin",
  },
  {
    source: "k", label: "K", position: "K", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/fantasy-football-kicker-rankings-2025",
  },
  {
    source: "dst", label: "DEF", position: "D/ST", kind: "ranking",
    url: "https://www.fantasylife.com/articles/fantasy/2025-fantasy-football-defense-rankings-and-tiers-broncos-eagles-and-more",
  },
  // — Sleepers / breakouts (under-the-radar league winners) —
  {
    source: "sleepers-all", label: "💤 Sleepers", position: "ALL", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/2025-fantasy-football-sleepers",
  },
  {
    source: "sleepers-qb", label: "💤 QB", position: "QB", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/quarterback-sleepers-for-fantasy-football-2025",
  },
  {
    source: "sleepers-rb", label: "💤 RB", position: "RB", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/running-back-sleepers-for-fantasy-football-2025",
  },
  {
    source: "sleepers-wr", label: "💤 WR", position: "WR", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/wide-receiver-sleepers-for-2025-fantasy-football-keon-coleman-ra",
  },
  {
    source: "breakouts", label: "🚀 Breakouts", position: "ALL", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/2025-fantasy-football-breakouts-marvin-mims-sean-tucker-and-more",
  },
  {
    source: "breakouts-wr", label: "🚀 WR Y2-3", position: "WR", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/year-2-3-wide-receiver-breakouts-for-fantasy-football",
  },
  {
    source: "breakouts-wr-late", label: "🚀 WR Late", position: "WR", kind: "sleeper",
    url: "https://www.fantasylife.com/articles/fantasy/late-breakout-wide-receiver-candidates-for-2025-fantasy-football",
  },
];

// In-memory cache shared across warm invocations (~6h TTL)
let CACHE: { at: number; payload: unknown } | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";
    if (!force && CACHE && Date.now() - CACHE.at < CACHE_TTL_MS) {
      return j(CACHE.payload);
    }

    const key = Deno.env.get("FIRECRAWL_API_KEY");
    if (!key) return j({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const lists = await Promise.all(
      SOURCES.map(async (s): Promise<RankList> => {
        try {
          const md = await scrape(s.url, key);
          const players = s.kind === "sleeper"
            ? parseSleeperList(md, s.position)
            : parseArticleList(md, s.position);
          return { ...s, players };
        } catch (e) {
          console.error(s.source, e);
          return { ...s, players: [] };
        }
      }),
    );
    const payload = { lists, fetchedAt: new Date().toISOString() };
    CACHE = { at: Date.now(), payload };
    return j(payload);
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function scrape(url: string, key: string): Promise<string> {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `Firecrawl ${r.status}`);
  return data?.data?.markdown ?? data?.markdown ?? "";
}

// Articles use formats like:
//   **1. Bijan Robinson | ATL**
//   ### **2\. Jahmyr Gibbs \| DET**
//   1. Ja'Marr Chase, WR, CIN
const TEAM = "ARI|ATL|BAL|BUF|CAR|CHI|CIN|CLE|DAL|DEN|DET|GB|HOU|IND|JAC|JAX|KC|LV|LAC|LA|LAR|MIA|MIN|NE|NO|NYG|NYJ|PHI|PIT|SEA|SF|TB|TEN|WAS";
const POS = "QB|RB|WR|TE|K|D/ST|DST";

function parseArticleList(md: string, defaultPos: string): Player[] {
  const out: Player[] = [];
  const seen = new Set<string>();
  // Strip markdown noise
  const clean = md.replace(/\\/g, "").replace(/\*/g, "");

  // Pattern A: "1. Name, POS, TEAM"
  const reA = new RegExp(`\\b(\\d{1,3})\\.\\s+([A-Z][A-Za-z'.\\-]+(?:\\s[A-Za-z'.\\-]+){0,3})\\s*,\\s*(${POS})\\s*,\\s*(${TEAM})\\b`, "g");
  // Pattern B: "1. Name | POS | TEAM"
  const reB = new RegExp(`\\b(\\d{1,3})\\.\\s+([A-Z][A-Za-z'.\\-]+(?:\\s[A-Za-z'.\\-]+){0,3})\\s*\\|\\s*(${POS})\\s*\\|\\s*(${TEAM})\\b`, "g");
  // Pattern C: "1. Name | TEAM"  (position from default)
  const reC = new RegExp(`\\b(\\d{1,3})\\.\\s+([A-Z][A-Za-z'.\\-]+(?:\\s[A-Za-z'.\\-]+){0,3})\\s*\\|\\s*(${TEAM})\\b`, "g");

  const pushAll = (re: RegExp, posIdx: number | null, teamIdx: number) => {
    for (const m of clean.matchAll(re)) {
      const rank = parseInt(m[1], 10);
      const name = m[2].trim();
      const pos = posIdx ? (m[posIdx] === "DST" ? "D/ST" : m[posIdx]) : (defaultPos === "ALL" ? "" : defaultPos);
      const team = m[teamIdx];
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ rank, name, position: pos, team });
    }
  };
  pushAll(reA, 3, 4);
  pushAll(reB, 3, 4);
  if (out.length === 0) pushAll(reC, null, 3);

  // Pattern D (FantasyLife player-card embeds, document order):
  //   POSTEAM![...](.../players/ID/Slug-With%20Encoded)
  {
    const reD = new RegExp(`(${POS})(${TEAM})\\b[^\\n]*?/players/\\d+/([A-Za-z0-9%.'\\-]+)`, "g");
    let rank = out.length;
    for (const m of clean.matchAll(reD)) {
      const pos = m[1] === "DST" ? "D/ST" : m[1];
      const team = m[2];
      let name = m[3];
      try { name = decodeURIComponent(name); } catch { /* ignore */ }
      name = name.replace(/-/g, " ").replace(/\s+/g, " ").trim();
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      rank += 1;
      out.push({ rank, name, position: pos, team });
    }
  }

  // Pattern E (heading style): "Name | TEAM" with default position
  if (defaultPos !== "ALL") {
    const reE = new RegExp(`([A-Z][A-Za-z'.\\-]+(?:\\s[A-Za-z'.\\-]+){0,3})\\s*\\|\\s*(${TEAM}|Rookie)\\b`, "g");
    let rank = out.length;
    for (const m of clean.matchAll(reE)) {
      const name = m[1].trim();
      const team = m[2];
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      rank += 1;
      out.push({ rank, name, position: defaultPos, team });
    }
  }

  // Pattern F (plain numbered text list, often after the embedded cards):
  //   "16. Tetairoa McMillan"   "23. DK Metcalf"
  if (defaultPos !== "ALL") {
    const reF = /(?:^|\n)\s{0,4}(\d{1,3})\.\s+([A-Z][A-Za-z'.]+(?:\s+(?:Jr\.|Sr\.|II|III|IV|[A-Z][A-Za-z'.]+)){1,3})\s*$/gm;
    for (const m of clean.matchAll(reF)) {
      const rank = parseInt(m[1], 10);
      const name = m[2].trim();
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ rank, name, position: defaultPos, team: "" });
    }
  }

  // Pattern G (D/ST tiered article — extract NFL team names in document order)
  if (defaultPos === "D/ST" && out.length === 0) {
    const teamMap: Record<string, string> = {
      Cardinals: "ARI", Falcons: "ATL", Ravens: "BAL", Bills: "BUF", Panthers: "CAR",
      Bears: "CHI", Bengals: "CIN", Browns: "CLE", Cowboys: "DAL", Broncos: "DEN",
      Lions: "DET", Packers: "GB", Texans: "HOU", Colts: "IND", Jaguars: "JAX",
      Chiefs: "KC", Raiders: "LV", Chargers: "LAC", Rams: "LAR", Dolphins: "MIA",
      Vikings: "MIN", Patriots: "NE", Saints: "NO", Giants: "NYG", Jets: "NYJ",
      Eagles: "PHI", Steelers: "PIT", Seahawks: "SEA", "49ers": "SF", Niners: "SF",
      Buccaneers: "TB", Titans: "TEN", Commanders: "WAS",
    };
    const reG = /\b(Cardinals|Falcons|Ravens|Bills|Panthers|Bears|Bengals|Browns|Cowboys|Broncos|Lions|Packers|Texans|Colts|Jaguars|Chiefs|Raiders|Chargers|Rams|Dolphins|Vikings|Patriots|Saints|Giants|Jets|Eagles|Steelers|Seahawks|49ers|Niners|Buccaneers|Titans|Commanders)\b/g;
    let rank = 0;
    for (const m of clean.matchAll(reG)) {
      const team = teamMap[m[1]];
      if (!team || seen.has(team)) continue;
      seen.add(team);
      rank += 1;
      out.push({ rank, name: m[1], position: "D/ST", team });
    }
  }

  out.sort((a, b) => a.rank - b.rank);
  return out.slice(0, 60);
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
