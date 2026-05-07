// RedditBuzz — live r/fantasyfootball buzz. Default = hot feed.
// If a player is currently nominated, switches to threads about that player.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MessageCircle, ArrowUp, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Thread {
  id: string;
  title: string;
  url: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  selftext: string;
  link_flair_text: string | null;
}

function timeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function RedditBuzz({ defaultPlayer }: { defaultPlayer?: string }) {
  const [query, setQuery] = useState(defaultPlayer ?? "");
  const [activePlayer, setActivePlayer] = useState(defaultPlayer ?? "");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["reddit-buzz", activePlayer],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("reddit-buzz", {
        body: activePlayer ? { player: activePlayer } : {},
      });
      if (error) throw error;
      return (data?.threads ?? []) as Thread[];
    },
    staleTime: 60_000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by player (optional)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setActivePlayer(query.trim());
              if (e.key === "Escape") {
                setQuery("");
                setActivePlayer("");
              }
            }}
            className="h-8 pl-7 text-xs"
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={() => setActivePlayer(query.trim())}
        >
          Search
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {activePlayer ? `r/fantasyfootball · "${activePlayer}"` : "r/fantasyfootball · hot"}
        </p>
        {activePlayer && (
          <button
            className="font-mono text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => {
              setQuery("");
              setActivePlayer("");
            }}
          >
            clear
          </button>
        )}
      </div>

      {isFetching && !data && (
        <p className="py-6 text-center text-xs text-muted-foreground">Loading buzz…</p>
      )}

      {data?.length === 0 && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          No threads found{activePlayer ? ` for "${activePlayer}"` : ""}.
        </p>
      )}

      <ul className="space-y-2">
        {(data ?? []).map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-border/60 bg-card/40 p-3 transition-colors hover:border-border"
          >
            <a
              href={t.url}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-snug text-foreground group-hover:text-primary">
                  {t.title}
                </p>
                <ExternalLink className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              {t.selftext && (
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  {t.selftext}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  {t.score}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {t.num_comments}
                </span>
                <span>{timeAgo(t.created_utc)} ago</span>
                {t.link_flair_text && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px]">
                    {t.link_flair_text}
                  </Badge>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
