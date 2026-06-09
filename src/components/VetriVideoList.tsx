import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Youtube, ExternalLink, Loader2 } from "lucide-react";

interface VideoRow {
  video_id: string;
  title: string;
  url: string;
  published_at: string | null;
  takes_count: number;
}

function fmtDate(s: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function VetriVideoList() {
  const [videos, setVideos] = useState<VideoRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("vetri_notes")
        .select("video_id, title, url, published_at, takes")
        .eq("status", "ready")
        .order("published_at", { ascending: false })
        .limit(50);
      if (cancelled) return;
      if (error || !data) {
        setVideos([]);
        return;
      }
      setVideos(
        data.map((r: any) => ({
          video_id: r.video_id,
          title: r.title,
          url: r.url,
          published_at: r.published_at,
          takes_count: Array.isArray(r.takes) ? r.takes.length : 0,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (videos === null) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading analyst videos…
      </div>
    );
  }
  if (!videos.length) {
    return <p className="text-[11px] italic text-muted-foreground">No videos ingested yet.</p>;
  }

  const totalTakes = videos.reduce((s, v) => s + v.takes_count, 0);

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {videos.length} videos · {totalTakes} player takes tracked
      </p>
      <ul className="space-y-1.5">
        {videos.map((v) => (
          <li key={v.video_id}>
            <a
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 rounded-md border border-border bg-secondary/30 p-2 transition hover:border-primary/40 hover:bg-secondary/50"
            >
              <Youtube className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-foreground">{v.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmtDate(v.published_at)} · {v.takes_count} {v.takes_count === 1 ? "take" : "takes"}
                </p>
              </div>
              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
