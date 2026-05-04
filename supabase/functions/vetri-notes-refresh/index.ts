// Pulls Sal Vetri's latest YouTube videos via public RSS, scrapes auto-captions,
// falls back to OpenAI Whisper transcription of the audio stream when captions
// are missing, then distills with Lovable AI into structured "takes".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CHANNEL_ID = "UC6oJruhkkXrws3HWqPfMHJw"; // @salvetri
const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

interface FeedItem {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string | null;
  description: string;
}

function parseFeed(xml: string, max: number): FeedItem[] {
  const items: FeedItem[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) && items.length < max) {
    const block = m[1];
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    const title = block.match(/<title>([^<]+)<\/title>/)?.[1];
    const published = block.match(/<published>([^<]+)<\/published>/)?.[1] ?? null;
    const description = block.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] ?? "";
    if (id && title) {
      items.push({
        videoId: id,
        title: decodeXml(title),
        url: `https://www.youtube.com/watch?v=${id}`,
        publishedAt: published,
        description: decodeXml(description).trim(),
      });
    }
  }
  return items;
}

function decodeXml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractJsonObjectAfter(html: string, marker: string): any | null {
  const markerIdx = html.indexOf(marker);
  if (markerIdx < 0) return null;
  const start = html.indexOf("{", markerIdx);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function descriptionLooksActionable(description: string): boolean {
  const text = description.trim();
  if (text.length < 80) return false;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const timestamped = lines.filter((l) => /(?:^|\s)(?:\d{1,2}:)?\d{1,2}:\d{2}\b/.test(l));
  const playerish = lines.filter((l) =>
    /\b(QB|RB|WR|TE)\b/.test(l) ||
    /[-–—:]\s*[A-Z][a-z'.-]+\s+[A-Z][a-z'.-]+/.test(l) ||
    /^[•*-]?\s*[A-Z][a-z'.-]+\s+[A-Z][a-z'.-]+\b/.test(l)
  );
  return timestamped.length >= 2 || playerish.length >= 3;
}

function expectedTakeCountFromTitle(title: string): number | null {
  const m = title.match(/\b(\d{1,2})\s+(?:rookies|players|sleepers|breakouts|league winners|targets|fades|values)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n <= 15 ? n : null;
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!watch.ok) return null;
    const html = await watch.text();
    const m = html.match(/"captionTracks":(\[[^\]]+\])/);
    if (!m) return null;
    // Parse the JSON-ish array. It's already valid JSON when extracted.
    let tracks: any[];
    try {
      tracks = JSON.parse(m[1].replace(/\\u0026/g, "&"));
    } catch {
      return null;
    }
    const track = tracks.find((t) => t?.languageCode === "en") ?? tracks[0];
    if (!track?.baseUrl) return null;
    const ttResp = await fetch(track.baseUrl, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!ttResp.ok) return null;
    const tt = await ttResp.text();
    // <text start="..." dur="...">caption</text>
    const lines: string[] = [];
    const re = /<text[^>]*>([\s\S]*?)<\/text>/g;
    let lm: RegExpExecArray | null;
    while ((lm = re.exec(tt))) {
      const raw = decodeXml(lm[1])
        .replace(/<[^>]+>/g, "")
        .replace(/\n/g, " ")
        .trim();
      if (raw) lines.push(raw);
    }
    const transcript = lines.join(" ").replace(/\s+/g, " ").trim();
    return transcript || null;
  } catch (e) {
    console.error("transcript error", videoId, e);
    return null;
  }
}

// ---- Whisper fallback ---------------------------------------------------
// Extracts a direct (non-ciphered) audio stream URL from the YouTube watch
// page and sends it to OpenAI Whisper. Returns null if no usable URL is
// available (some videos sign their URLs and require signature deciphering,
// which we don't implement here).
async function fetchAudioStreamUrl(videoId: string): Promise<{ url: string; mime: string } | null> {
  try {
    const watch = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!watch.ok) return null;
    const html = await watch.text();
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;\s*(?:var|<\/script>)/);
    if (!m) return null;
    let player: any;
    try { player = JSON.parse(m[1]); } catch { return null; }
    const formats: any[] = player?.streamingData?.adaptiveFormats ?? [];
    // audio-only mp4 (m4a) — smallest bitrate to stay under Whisper 25MB
    const audio = formats
      .filter((f) => typeof f?.mimeType === "string" && f.mimeType.startsWith("audio/") && f.url)
      .sort((a, b) => (a.bitrate ?? 0) - (b.bitrate ?? 0))[0];
    if (!audio) return null;
    return { url: audio.url, mime: (audio.mimeType.split(";")[0] || "audio/mp4") };
  } catch (e) {
    console.error("audio extract error", videoId, e);
    return null;
  }
}

async function transcribeWithWhisper(videoId: string): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not set, skipping Whisper fallback");
    return null;
  }
  const stream = await fetchAudioStreamUrl(videoId);
  if (!stream) {
    console.warn("no audio stream URL for", videoId);
    return null;
  }
  try {
    const audioResp = await fetch(stream.url, { headers: { "User-Agent": UA } });
    if (!audioResp.ok) {
      console.warn("audio fetch failed", videoId, audioResp.status);
      return null;
    }
    const buf = await audioResp.arrayBuffer();
    if (buf.byteLength > 25 * 1024 * 1024) {
      console.warn("audio too large for Whisper", videoId, buf.byteLength);
      return null;
    }
    const ext = stream.mime.includes("webm") ? "webm" : "m4a";
    const form = new FormData();
    form.append("file", new Blob([buf], { type: stream.mime }), `${videoId}.${ext}`);
    form.append("model", "whisper-1");
    form.append("response_format", "text");
    const wResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!wResp.ok) {
      console.error("whisper error", videoId, wResp.status, await wResp.text());
      return null;
    }
    const text = (await wResp.text()).trim();
    return text || null;
  } catch (e) {
    console.error("whisper exception", videoId, e);
    return null;
  }
}

const SUMMARY_TOOL = {
  type: "function",
  function: {
    name: "emit_takes",
    description: "Emit structured Sal Vetri takes from a video transcript.",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "2-3 sentence overview of the video's thesis." },
        positions: {
          type: "array",
          items: { type: "string", enum: ["QB", "RB", "WR", "TE", "K", "DST"] },
          description: "Positions discussed.",
        },
        takes: {
          type: "array",
          minItems: 0,
          maxItems: 12,
          items: {
            type: "object",
            properties: {
              player: { type: "string", description: "Player full name." },
              position: { type: "string", enum: ["QB", "RB", "WR", "TE", "K", "DST"] },
              lean: {
                type: "string",
                enum: ["target", "value", "fade", "avoid", "sleeper", "breakout", "neutral"],
                description: "Sal's directional take.",
              },
              tier: { type: "string", description: "Tier label if mentioned (e.g. 'Tier 1 RB'). Optional, may be empty." },
              reasoning: { type: "string", description: "Punchy 1-sentence WHY in Sal's voice. <=140 chars." },
            },
            required: ["player", "position", "lean", "reasoning"],
            additionalProperties: false,
          },
        },
      },
      required: ["summary", "positions", "takes"],
      additionalProperties: false,
    },
  },
};

async function distill(title: string, transcript: string, source: "captions" | "description" | "whisper" = "captions"): Promise<{ summary: string; positions: string[]; takes: any[] } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  // Cap transcript length to keep token usage sane
  const trimmed = transcript.length > 28000 ? transcript.slice(0, 28000) + " [truncated]" : transcript;

  const system = `You are an analyst extracting actionable fantasy football takes from Sal Vetri's YouTube content. Sal is a sharp, contrarian fantasy analyst — capture HIS opinions and directional calls on specific players, not generic advice. Be faithful to what he actually says. If he's high on a player, lean=target/breakout/sleeper. If he's down, lean=fade/avoid. Use 'value' when he says good price. Use 'neutral' only when he discusses without a clear direction.`;

  const sourceNote = source === "description"
    ? "## Source\nThis is the YouTube DESCRIPTION (captions weren't available). Descriptions often contain timestamped player lists like '2:15 - Bijan Robinson (target)'. Treat each entry as Sal's stated take. If a description entry has no clear lean, use 'neutral'."
    : source === "whisper"
    ? "## Source\nThis is a WHISPER audio transcription (no captions were available). Expect occasional misspellings of player names — normalize to the most likely real NFL player."
    : "";
  const user = `## Video Title\n${title}\n${sourceNote}\n\n## Content (${source}, may have minor errors)\n${trimmed}\n\n## Task\nCall emit_takes with Sal's structured takes. Include only players he expresses a clear opinion on. Reasoning must quote/paraphrase his actual rationale, not generic stats.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      tools: [SUMMARY_TOOL],
      tool_choice: { type: "function", function: { name: "emit_takes" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error", resp.status, t);
    if (resp.status === 429) throw new Error("rate_limit");
    if (resp.status === 402) throw new Error("payment_required");
    throw new Error(`ai_${resp.status}`);
  }
  const data = await resp.json();
  const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return null;
  try {
    return JSON.parse(args);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const max = Math.min(parseInt(url.searchParams.get("max") ?? "5", 10) || 5, 10);
    const force = url.searchParams.get("force") === "1";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const feedResp = await fetch(RSS_URL, { headers: { "User-Agent": UA } });
    if (!feedResp.ok) throw new Error(`RSS fetch ${feedResp.status}`);
    const xml = await feedResp.text();
    const items = parseFeed(xml, max);

    const { data: existing } = await sb
      .from("vetri_notes")
      .select("video_id, status")
      .in("video_id", items.map((i) => i.videoId));
    const existingMap = new Map((existing ?? []).map((r) => [r.video_id, r.status]));

    const results: { videoId: string; title: string; status: string; error?: string }[] = [];

    for (const item of items) {
      const prior = existingMap.get(item.videoId);
      if (!force && prior === "ready") {
        results.push({ videoId: item.videoId, title: item.title, status: "skipped" });
        continue;
      }

      // Upsert a "processing" row so the UI shows it immediately.
      await sb.from("vetri_notes").upsert(
        {
          video_id: item.videoId,
          title: item.title,
          url: item.url,
          published_at: item.publishedAt,
          status: "processing",
          error: null,
        },
        { onConflict: "video_id" },
      );

      let transcript = await fetchTranscript(item.videoId);
      let source: "captions" | "description" | "whisper" = "captions";
      if (!transcript) {
        // Fallback 1: timestamped descriptions (cheap, often present)
        if (item.description && item.description.length > 120) {
          transcript = item.description;
          source = "description";
        } else {
          // Fallback 2: Whisper audio transcription (paid)
          const whisperText = await transcribeWithWhisper(item.videoId);
          if (whisperText && whisperText.length > 100) {
            transcript = whisperText;
            source = "whisper";
          } else {
            await sb
              .from("vetri_notes")
              .update({ status: "no_transcript", error: "No captions, description, or Whisper transcript available" })
              .eq("video_id", item.videoId);
            results.push({ videoId: item.videoId, title: item.title, status: "no_transcript" });
            continue;
          }
        }
      }

      try {
        const distilled = await distill(item.title, transcript, source);
        if (!distilled) {
          await sb
            .from("vetri_notes")
            .update({ status: "failed", error: "Model returned no takes", transcript })
            .eq("video_id", item.videoId);
          results.push({ videoId: item.videoId, title: item.title, status: "failed" });
          continue;
        }
        await sb
          .from("vetri_notes")
          .update({
            status: "ready",
            error: null,
            transcript,
            summary: distilled.summary,
            takes: distilled.takes,
            positions: distilled.positions ?? [],
          })
          .eq("video_id", item.videoId);
        results.push({ videoId: item.videoId, title: item.title, status: "ready" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "unknown";
        await sb
          .from("vetri_notes")
          .update({ status: "failed", error: msg, transcript })
          .eq("video_id", item.videoId);
        results.push({ videoId: item.videoId, title: item.title, status: "failed", error: msg });
        if (msg === "rate_limit" || msg === "payment_required") break;
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vetri-notes-refresh error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
