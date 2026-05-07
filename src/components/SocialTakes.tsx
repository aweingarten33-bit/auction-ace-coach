// "What's social saying" — accordion of latest player takes from
// fantasy football podcasts (RSS → AI bullets, no prices, no fluff).
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type ShowResult = {
  id: string;
  name: string;
  bullets: string[];
  loveHate?: string[];
  updatedAt?: string | null;
  episodeTitle?: string;
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

function Bullet({ text }: { text: string }) {
  // Pull "[LABEL]" prefix if present
  const m = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (m) {
    return (
      <li className="flex gap-1.5 text-[12px] leading-snug">
        <span className="shrink-0 rounded bg-primary/15 px-1 text-[9px] font-bold uppercase tracking-wider text-primary">
          {m[1]}
        </span>
        <span>{m[2]}</span>
      </li>
    );
  }
  return <li className="text-[12px] leading-snug">{text}</li>;
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
    return <p className="px-2 py-6 text-center text-xs text-muted-foreground">Pulling takes…</p>;
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
        const total = (s.bullets?.length ?? 0) + (s.loveHate?.length ?? 0);
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
                <p className="text-[10px] text-muted-foreground">
                  {total} take{total === 1 ? "" : "s"}
                  {s.updatedAt ? ` · ${timeAgo(s.updatedAt)}` : ""}
                </p>
              </div>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="space-y-3 border-t border-border/60 px-3 py-3">
                {s.bullets?.length ? (
                  <ul className="space-y-1.5">
                    {s.bullets.map((b, i) => <Bullet key={i} text={b} />)}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No player-specific takes in the latest episode notes.
                  </p>
                )}
                {s.loveHate && s.loveHate.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Berry's Love / Hate
                    </p>
                    <ul className="space-y-1.5">
                      {s.loveHate.map((b, i) => <Bullet key={i} text={b} />)}
                    </ul>
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
