// Pull latest episode show notes from 4 fantasy podcasts (+ Berry Love/Hate),
// run through Lovable AI to extract 3-6 actionable player takes per source.
// Returns: { shows: [{ id, name, updatedAt, bullets: string[], sourceUrl }] }
//
// Cached in-memory per cold start; client also caches with react-query.

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

type Show = {
  id: string;
  name: string;
  rss?: string;
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

// crude XML extraction — just need the latest <item>'s title + description + pubDate
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
      .replace(/\s+/g, " ")
      .trim();
  };
  return {
    title: get("title"),
    description:
      get("content:encoded") ||
      get("description") ||
      get("itunes:summary") ||
      get("itunes:subtitle"),
    pubDate: get("pubDate"),
  };
}

async function fetchBerryLoveHate(): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    // Search for the latest love/hate column
    const search = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: "Matthew Berry Love Hate week NBC Sports fantasy",
        limit: 3,
        tbs: "qdr:w",
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!search.ok) return null;
    const data = await search.json();
    const hit =
      data?.data?.find?.((r: any) =>
        /love.*hate/i.test(`${r.title} ${r.url}`),
      ) ?? data?.data?.[0];
    return hit?.markdown ? hit.markdown.slice(0, 8000) : null;
  } catch {
    return null;
  }
}

async function aiBullets(source: string, sourceLabel: string): Promise<string[]> {
  const sys =
    "You read fantasy football podcast show notes and convert them into ULTRA-SHORT player takes a manager can scan during a live auction draft. Rules: NO prices/dollars/auction values. NO episode titles. NO timestamps. NO intros. ONLY player-specific takes. Each bullet under 90 chars. 3-8 bullets total. Format: '<Player Name>: <take>'. If the show uses a recurring segment label (like 'Love/Hate', 'Stock Up/Stock Down', 'Buy/Sell', 'Risers/Fallers', 'Studs & Duds') prefix that bullet with the EXACT label from the source in brackets, e.g. '[LOVE] Bucky Irving: workhorse role locked'. Skip bullets that are just promo/news with no player opinion.";
  const user = `Source: ${sourceLabel}\n\n${source.slice(0, 6000)}`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_takes",
              description: "Emit player takes",
              parameters: {
                type: "object",
                properties: {
                  bullets: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["bullets"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_takes" } },
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return [];
    const parsed = JSON.parse(args);
    return Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : [];
  } catch {
    return [];
  }
}

async function processShow(show: Show) {
  const out: any = { id: show.id, name: show.name, bullets: [], updatedAt: null, sourceUrl: null };
  try {
    if (show.rss) {
      const r = await fetch(show.rss, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (r.ok) {
        const xml = await r.text();
        const ep = parseLatestEpisode(xml);
        if (ep) {
          out.updatedAt = ep.pubDate;
          out.episodeTitle = ep.title;
          const text = `${ep.title}\n\n${ep.description}`;
          out.bullets = await aiBullets(text, show.name);
        }
      }
    }
    if (show.extra === "berry-love-hate") {
      const lh = await fetchBerryLoveHate();
      if (lh) {
        const lhBullets = await aiBullets(lh, "Matthew Berry Love/Hate column");
        out.loveHate = lhBullets;
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
