// Pulls FantasyLife consensus rankings (Weekly + ROS) and a Top-50 article list.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Player { rank: number; name: string; position: string; team: string; tier?: number; }
interface RankList { source: string; label: string; url: string; players: Player[]; }

const SOURCES = [
  { source: "weekly", label: "Weekly Consensus", url: "https://www.fantasylife.com/tools/nfl-rankings" },
  { source: "ros", label: "Rest-of-Season Consensus", url: "https://www.fantasylife.com/tools/rest-of-season-fantasy-football-rankings" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("FIRECRAWL_API_KEY");
    if (!key) return j({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const lists: RankList[] = [];
    for (const s of SOURCES) {
      try {
        const md = await scrape(s.url, key);
        lists.push({ ...s, players: parsePlayers(md) });
      } catch (e) {
        lists.push({ ...s, players: [] });
        console.error(s.source, e);
      }
    }
    return j({ lists, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

async function scrape(url: string, key: string): Promise<string> {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 4000 }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `Firecrawl ${r.status}`);
  return data?.data?.markdown ?? data?.markdown ?? "";
}

// Match: First **Last**\<br>\<br>POSTEAM    e.g. Jahmyr **Gibbs**\<br>\<br>RBDET
const PLAYER_RE = /([A-Z][A-Za-z\.'\-]+(?:\s[A-Z][A-Za-z\.'\-]+)*)\s\*\*([A-Z][A-Za-z\.'\-]+(?:\s[A-Z][A-Za-z\.'\-]+)*)\*\*[\\\s<br>]*?(QB|RB|WR|TE|K|DST|D\/ST)([A-Z]{2,4})/g;
const TIER_RE = /^\|\s*Tier\s+(\d+)/i;

function parsePlayers(md: string): Player[] {
  const out: Player[] = [];
  const seen = new Set<string>();
  let tier = 0;
  let rank = 0;
  for (const line of md.split("\n")) {
    const t = line.match(TIER_RE);
    if (t) { tier = parseInt(t[1], 10); continue; }
    PLAYER_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = PLAYER_RE.exec(line)) !== null) {
      const name = `${m[1]} ${m[2]}`.trim();
      const position = m[3] === "DST" ? "D/ST" : m[3];
      const team = m[4];
      const key = `${name}|${position}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rank += 1;
      out.push({ rank, name, position, team, tier: tier || undefined });
      if (out.length >= 200) return out;
    }
  }
  return out;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
