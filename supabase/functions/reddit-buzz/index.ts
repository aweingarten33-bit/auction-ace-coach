// Reddit buzz — pulls hot threads from r/fantasyfootball, optionally filtered
// by a player name. Uses Reddit's public JSON endpoints — no auth required.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Thread {
  id: string;
  title: string;
  url: string;          // permalink to the comment thread
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  selftext: string;
  link_flair_text: string | null;
}

const UA = "lovable-auction-coach/1.0";

async function fetchJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" } });
  if (!r.ok) throw new Error(`Reddit ${r.status}`);
  return r.json();
}

function mapChildren(children: any[]): Thread[] {
  return children
    .map((c) => c?.data)
    .filter(Boolean)
    .map((d: any) => ({
      id: d.id,
      title: d.title ?? "",
      url: `https://www.reddit.com${d.permalink}`,
      author: d.author ?? "",
      subreddit: d.subreddit ?? "fantasyfootball",
      score: d.score ?? 0,
      num_comments: d.num_comments ?? 0,
      created_utc: d.created_utc ?? 0,
      selftext: (d.selftext ?? "").slice(0, 500),
      link_flair_text: d.link_flair_text ?? null,
    }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const player: string | undefined = body?.player;
    const subs = ["fantasyfootball", "fantasyfootballadvice"];

    let threads: Thread[] = [];
    if (player && typeof player === "string" && player.trim().length > 1) {
      // Search across both subs for the player name, restricted to last month
      const q = encodeURIComponent(`"${player.trim()}"`);
      const url = `https://www.reddit.com/r/${subs.join("+")}/search.json?q=${q}&restrict_sr=1&sort=new&t=month&limit=25`;
      const data = await fetchJson(url);
      threads = mapChildren(data?.data?.children ?? []);
    } else {
      // No player → hot feed from r/fantasyfootball
      const data = await fetchJson(`https://www.reddit.com/r/fantasyfootball/hot.json?limit=25`);
      threads = mapChildren(data?.data?.children ?? []).filter((t) => !t.title.toLowerCase().startsWith("[mod"));
    }

    // Sort: engagement-weighted (score + 2x comments)
    threads.sort((a, b) => (b.score + 2 * b.num_comments) - (a.score + 2 * a.num_comments));

    return new Response(JSON.stringify({ threads: threads.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reddit-buzz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", threads: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
