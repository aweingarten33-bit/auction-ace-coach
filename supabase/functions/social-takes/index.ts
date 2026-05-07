// Pulls latest episode info (title + description + link) from 3 fantasy podcasts
// via their RSS feeds, plus Matthew Berry's written Love/Hate column from NBC
// via Firecrawl. NO AI summarization — what's in the source is what you see.
//
// Returns: { shows: [{ id, name, episodeTitle, description, sourceUrl, updatedAt, loveHate? }] }

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

type Show = {
  id: string;
  name: string;
  rss: string;
  extra?: "berry-love-hate";
};

const SHOWS: Show[] = [
  {
    id: "footballers",
    name: "The Fantasy Footballers",
    rss: "https://feeds.simplecast.com/sw7PGWfw",
  },
  {
    id: "happy-hour",
    name: "Fantasy Football Happy Hour with Matthew Berry",
    rss: "https://www.omnycontent.com/d/playlist/006cbbeb-1b7a-4729-b380-b3df0127e8db/2cb90df4-a4ac-4bdc-a5f9-b3df0134b66d/f0d76f16-f5bd-4148-a13a-b3df0134b677/podcast.rss",
    extra: "berry-love-hate",
  },
  {
    id: "fantasy-focus",
    name: "Fantasy Focus Football (ESPN)",
    rss: "https://www.espn.com/espnradio/feeds/rss/podcast.xml?id=2942325",
  },
];

function parseLatestEpisode(xml: string) {
  const itemMatch = xml.match(/<item[\s\S]*?<\/item>/);
  if (!itemMatch) return null;
  const item = itemMatch[0];
  const get = (tag: string) => {
    const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!m) return "";
    return m[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  };
  const linkMatch = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  const link = linkMatch ? linkMatch[1].trim() : "";
  return {
    title: get("title"),
    description:
      get("content:encoded") ||
      get("description") ||
      get("itunes:summary") ||
      get("itunes:subtitle"),
    pubDate: get("pubDate"),
    link,
  };
}

// Find the latest Berry Love/Hate column URL via Firecrawl search, then scrape it
async function fetchBerryLoveHate(): Promise<{ url: string; markdown: string; title: string } | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    // Search Berry's NBC column hub for recent love/hate articles
    const map = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "site:nbcsports.com Matthew Berry love hate fantasy football",
        limit: 5,
        tbs: "qdr:m",
      }),
    });
    if (!map.ok) return null;
    const mapData = await map.json();
    const results: any[] = mapData?.data ?? mapData?.web?.results ?? [];
    const hit = results.find((r: any) =>
      /love.*hate/i.test(`${r.title ?? ""} ${r.url ?? ""}`),
    ) ?? results[0];
    if (!hit?.url) return null;

    const scrape = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: hit.url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    if (!scrape.ok) return null;
    const scrapeData = await scrape.json();
    const md: string =
      scrapeData?.data?.markdown ?? scrapeData?.markdown ?? "";
    if (!md) return null;
    return {
      url: hit.url,
      title: hit.title ?? "Matthew Berry's Love/Hate",
      markdown: md.slice(0, 20000),
    };
  } catch (e) {
    console.error("fetchBerryLoveHate error:", e);
    return null;
  }
}

async function processShow(show: Show) {
  const out: any = {
    id: show.id,
    name: show.name,
    episodeTitle: null,
    description: null,
    sourceUrl: null,
    updatedAt: null,
  };
  try {
    const r = await fetch(show.rss, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (r.ok) {
      const xml = await r.text();
      const ep = parseLatestEpisode(xml);
      if (ep) {
        out.episodeTitle = ep.title;
        out.description = ep.description;
        out.sourceUrl = ep.link || null;
        out.updatedAt = ep.pubDate;
      }
    }
    if (show.extra === "berry-love-hate") {
      const lh = await fetchBerryLoveHate();
      if (lh) {
        out.loveHate = {
          title: lh.title,
          url: lh.url,
          markdown: lh.markdown,
        };
      }
    }
  } catch (e) {
    console.error(`processShow ${show.id} error:`, e);
  }
  return out;
}

// 90-min in-memory cache
let cache: { at: number; data: any } | null = null;
const TTL_MS = 90 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("refresh") === "1";
    if (!force && cache && Date.now() - cache.at < TTL_MS) {
      return new Response(JSON.stringify({ ...cache.data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const shows = await Promise.all(SHOWS.map(processShow));
    const payload = { shows, generatedAt: new Date().toISOString() };
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
