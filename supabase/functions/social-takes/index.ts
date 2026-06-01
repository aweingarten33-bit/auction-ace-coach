// Two sources, no AI:
//  1. Matthew Berry's Love/Hate column (Firecrawl scrape of NBC)
//  2. ESPN Fantasy Football latest player-list article (Firecrawl search + scrape)
//
// Returns: { sources: [{ id, name, title, url, markdown, updatedAt? }] }

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

type Source = { id: string; name: string; title: string; url: string; markdown: string };

async function firecrawlSearch(query: string) {
  const r = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit: 8, tbs: "qdr:m" }),
  });
  if (!r.ok) return [];
  const data = await r.json();
  const raw = data?.data ?? data?.web?.results ?? data?.results ?? [];
  return (Array.isArray(raw) ? raw : []) as any[];
}

async function firecrawlScrape(url: string): Promise<string | null> {
  const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  const md = data?.data?.markdown ?? data?.markdown;
  return typeof md === "string" ? md.slice(0, 25000) : null;
}

async function getBerryLoveHate(): Promise<Source | null> {
  const results = await firecrawlSearch(
    "site:nbcsports.com Matthew Berry love hate fantasy football",
  );
  const hit = results.find((r) => /love.*hate/i.test(`${r.title ?? ""} ${r.url ?? ""}`)) ?? results[0];
  if (!hit?.url) return null;
  const md = await firecrawlScrape(hit.url);
  if (!md) return null;
  return {
    id: "berry-love-hate",
    name: "Matthew Berry's Love / Hate",
    title: hit.title ?? "Matthew Berry's Love/Hate",
    url: hit.url,
    markdown: md,
  };
}

async function getEspnFantasyArticle(): Promise<Source | null> {
  // ESPN fantasy football hub — surfaces whatever the latest article is
  // (rankings/sleepers/busts in pre-season, start-sit in-season).
  const url = "https://www.espn.com/fantasy/football/";
  const md = await firecrawlScrape(url);
  if (!md) return null;
  return {
    id: "espn-fantasy",
    name: "ESPN Fantasy Football",
    title: "Latest from ESPN Fantasy hub",
    url,
    markdown: md,
  };
}

async function getFantasyPros(): Promise<Source | null> {
  const url = "https://www.fantasypros.com/nfl/";
  const md = await firecrawlScrape(url);
  if (!md) return null;
  return {
    id: "fantasypros",
    name: "FantasyPros",
    title: "Latest from FantasyPros NFL",
    url,
    markdown: md,
  };
}

async function getCbsSports(): Promise<Source | null> {
  const url = "https://www.cbssports.com/fantasy/football/";
  const md = await firecrawlScrape(url);
  if (!md) return null;
  return {
    id: "cbs",
    name: "CBS Sports Fantasy",
    title: "Latest from CBS Sports Fantasy",
    url,
    markdown: md,
  };
}

let cache: { at: number; data: any } | null = null;
const TTL_MS = 90 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";
    if (!force && cache && Date.now() - cache.at < TTL_MS) {
      return new Response(JSON.stringify({ ...cache.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [berry, espn, fp, cbs] = await Promise.all([
      getBerryLoveHate(),
      getEspnFantasyArticle(),
      getFantasyPros(),
      getCbsSports(),
    ]);
    const sources = [berry, espn, fp, cbs].filter(Boolean) as Source[];
    const payload = { sources, generatedAt: new Date().toISOString() };
    cache = { at: Date.now(), data: payload };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("social-takes error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
