// "What's social saying" — accordion of latest podcast episodes (raw RSS notes,
// no AI summarization) plus Matthew Berry's full Love/Hate column scraped from NBC.
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type LoveHate = { title: string; url: string; markdown: string };
type ShowResult = {
  id: string;
  name: string;
  episodeTitle?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  updatedAt?: string | null;
  loveHate?: LoveHate;
};

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!t) return "";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SocialTakes() {
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["social-takes"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("social-takes");
      if (error) throw error;
      return data as { shows: ShowResult[]; generatedAt: string };
    },
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return <p className="px-2 py-6 text-center text-xs text-muted-foreground">Pulling latest…</p>;
  }
  const shows = data?.shows ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          What's social saying
        </p>
        <Button
          size="sm" variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-6 px-2 text-[10px]"
        >
          <RefreshCw className={`mr-1 h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {shows.map((s) => {
        const isOpen = open === s.id;
        return (
          <div
            key={s.id}
            className="overflow-hidden rounded-lg border border-border/60 bg-card"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-secondary/40"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{s.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {s.episodeTitle ?? "Latest episode"}
                  {s.updatedAt ? ` · ${timeAgo(s.updatedAt)}` : ""}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-border/60 px-3 py-3">
                {s.episodeTitle && (
                  <div>
                    <p className="text-[12px] font-semibold leading-snug">{s.episodeTitle}</p>
                    {s.description && (
                      <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    {s.sourceUrl && (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                      >
                        Open episode <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {s.loveHate && (
                  <div className="border-t border-border/40 pt-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Berry's Love / Hate (column)
                      </p>
                      <a
                        href={s.loveHate.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                      >
                        Full article <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="prose prose-sm max-w-none text-[11px] leading-relaxed dark:prose-invert prose-headings:text-[12px] prose-headings:font-semibold prose-p:my-1.5 prose-li:my-0.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {s.loveHate.markdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
