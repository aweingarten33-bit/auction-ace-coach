// Scrapes fantasylife.com homepage via Firecrawl and returns article cards.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Article { title: string; url: string; category: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const key = Deno.env.get("FIRECRAWL_API_KEY");
    if (!key) return j({ error: "FIRECRAWL_API_KEY not configured" }, 500);

    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "https://www.fantasylife.com/",
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    const data = await r.json();
    if (!r.ok) return j({ error: data?.error || `Firecrawl ${r.status}` }, 502);

    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const articles = parseArticles(md).slice(0, 25);
    return j({ articles, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return j({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

// Pull "### [Title](url)" blocks. Category is usually the link right above.
function parseArticles(md: string): Article[] {
  const lines = md.split("\n");
  const out: Article[] = [];
  let lastCategory = "Fantasy";
  const catRe = /^\s*\[([^\]]+)\]\(https:\/\/www\.fantasylife\.com\/articles\/[^)]+\)\s*$/;
  const headRe = /^\s*(?:#+\s*)?(?:\d+\.\s*)?###\s*\[([^\]]+)\]\((https:\/\/www\.fantasylife\.com\/articles\/[^)]+)\)/;
  const topRe = /^\s*#\s*\[([^\]]+)\]\((https:\/\/www\.fantasylife\.com\/articles\/[^)]+)\)/;
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim();
    const cm = line.match(catRe);
    if (cm) { lastCategory = cm[1]; continue; }
    const m = line.match(headRe) || line.match(topRe);
    if (m) {
      const title = m[1].trim();
      const url = m[2].trim();
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({ title, url, category: lastCategory });
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
