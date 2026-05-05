import { useEffect, useState } from "react";
import { searchVetriTakes, VetriTakeMatch } from "@/lib/vetri-search";
import { scaledEstBid } from "@/lib/vetri-types";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Youtube, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

const LEAN_TONE: Record<string, { bg: string; text: string; icon: typeof TrendingUp | null }> = {
  target: { bg: "bg-success/15 border-success/40", text: "text-success", icon: TrendingUp },
  breakout: { bg: "bg-success/15 border-success/40", text: "text-success", icon: TrendingUp },
  sleeper: { bg: "bg-primary/15 border-primary/40", text: "text-primary", icon: Sparkles },
  value: { bg: "bg-primary/15 border-primary/40", text: "text-primary", icon: TrendingUp },
  fade: { bg: "bg-warning/15 border-warning/40", text: "text-warning", icon: TrendingDown },
  avoid: { bg: "bg-destructive/15 border-destructive/40", text: "text-destructive", icon: TrendingDown },
  neutral: { bg: "bg-secondary/40 border-border", text: "text-muted-foreground", icon: null },
};

function fmtDate(s: string | null): string {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

interface Props {
  player: string;
  emptyText?: string;
  compact?: boolean;
  /** When true, render nothing if there are no takes (and skip the loading line). */
  hideWhenEmpty?: boolean;
  /** Optional header rendered above the takes (only shown when there ARE takes, if hideWhenEmpty). */
  header?: React.ReactNode;
  /** Optional wrapper rendered around the takes (only shown when there ARE takes, if hideWhenEmpty). */
  wrapperClassName?: string;
}

export default function VetriTakesForPlayer({
  player,
  emptyText = "No analyst takes on this player yet.",
  compact,
  hideWhenEmpty,
  header,
  wrapperClassName,
}: Props) {
  const [matches, setMatches] = useState<VetriTakeMatch[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMatches(null);
    searchVetriTakes(player).then((m) => {
      if (!cancelled) setMatches(m);
    });
    return () => {
      cancelled = true;
    };
  }, [player]);

  if (matches === null) {
    if (hideWhenEmpty) return null;
    return <p className="text-[10px] italic text-muted-foreground">Loading analyst takes…</p>;
  }
  if (matches.length === 0) {
    if (hideWhenEmpty) return null;
    return <p className="text-[10px] italic text-muted-foreground">{emptyText}</p>;
  }

  const list = (
    <div className="space-y-1.5">
      {matches.map((m, i) => {
        const tone = LEAN_TONE[m.take.lean] ?? LEAN_TONE.neutral;
        const Icon = tone.icon;
        return (
          <div key={i} className={`rounded-md border px-2 py-1.5 ${tone.bg}`}>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`${tone.text} border-current text-[9px] px-1.5 py-0 uppercase`}>
                {Icon && <Icon className="mr-0.5 inline h-2.5 w-2.5" />}
                {m.take.lean}
              </Badge>
              {m.take.tier && (
                <span className="text-[9px] text-muted-foreground">{m.take.tier}</span>
              )}
              <a
                href={m.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-foreground"
                title={m.videoTitle}
              >
                <Youtube className="h-2.5 w-2.5" />
                {fmtDate(m.publishedAt)}
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
            <p className={`mt-1 leading-snug ${compact ? "text-[10px]" : "text-[11px]"}`}>
              {m.take.reasoning}
            </p>
            {(() => {
              const est = scaledEstBid(m.take.estPrice);
              const sal = m.take.salPrice?.trim();
              if (!est && !sal) return null;
              return (
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {sal && (
                    <span className="rounded-sm border border-success/40 bg-success/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-success">
                      Analyst: {sal}
                    </span>
                  )}
                  {est && (
                    <span className="rounded-sm border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
                      Bid ~${est}
                    </span>
                  )}
                </div>
              );
            })()}
            {!compact && (
              <p className="mt-0.5 truncate text-[9px] text-muted-foreground">📺 {m.videoTitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );

  if (hideWhenEmpty) {
    return (
      <div className={wrapperClassName}>
        {header}
        {list}
      </div>
    );
  }
  return list;
}
