// FantasyLife rankings - per-position lists pulled from their free articles.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Player { rank: number; name: string; position: string; team: string; }
interface RankList { source: string; label: string; position: string; url: string; players: Player[]; }

const SOURCES: { source: string; label: string; position: string; url: string }[] = [
  {
    source: "top50",
    label: "Top 50 Overall (Kendall)",
    position: "ALL",
    url: "https://www.fantasylife.com/articles/fantasy/fantasy-football-2026-top-50-rankings-bijan-robinson-or-jahmyr-gibbs-at-101",
  },
  {
    source: "qb",
    label: "Top QBs",
    position: "QB",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-a-way-too-early-look-at-qb",
  },
  {
    source: "rb",
    label: "Top RBs",
    position: "RB",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-bijan-robinson-leads-the-top-20",
  },
  {
    source: "wr",
    label: "Top WRs",
    position: "WR",
    url: "https://www.fantasylife.com/articles/fantasy/2026-fantasy-football-rankings-a-way-too-early-look-at-wr",
  },
  {
    source: "te",
    label: "Top TEs",
    position: "TE",
    url: "https://www.fantasylife.com/articles/fantasy/2026-tight-end-tiers-for-fantasy-football-harold-fannin",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("FIRECRAWL_API_KEY");
    if (!key) return j({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const lists = await Promise.all(
      SOURCES.map(async (s): Promise<RankList> => {
        try {
          const md = await scrape(s.url, key);
          return { ...s, players: parseArticleList(md, s.position) };
        } catch (e) {
          console.error(s.source, e);
          return { ...s, players: [] };
        }
      }),
    );
    return j({ lists, fetchedAt: new Date().toISOString() });
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
  // Pattern B: "1. Name | TEAM"  (position from default)
  const reB = new RegExp(`\\b(\\d{1,3})\\.\\s+([A-Z][A-Za-z'.\\-]+(?:\\s[A-Za-z'.\\-]+){0,3})\\s*\\|\\s*(${TEAM})\\b`, "g");

  for (const m of clean.matchAll(reA)) {
    const rank = parseInt(m[1], 10);
    const name = m[2].trim();
    const position = m[3] === "DST" ? "D/ST" : m[3];
    const team = m[4];
    const k = name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ rank, name, position, team });
  }
  if (out.length === 0) {
    for (const m of clean.matchAll(reB)) {
      const rank = parseInt(m[1], 10);
      const name = m[2].trim();
      const team = m[3];
      const k = name.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ rank, name, position: defaultPos === "ALL" ? "" : defaultPos, team });
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
