import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListMusic, RefreshCw, Eye } from "lucide-react";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";

export interface QueueTarget {
  name: string;
  position: Position;
  matchPct: number;
  maxBid: number;
  reason: string;
}

interface Props {
  targets: QueueTarget[];
  openMan?: string;
  loading: boolean;
  empty: boolean;
  onRefresh: () => void;
  onPick: (t: QueueTarget) => void;
}

function matchTone(pct: number) {
  if (pct >= 85) return "text-success border-success/40 bg-success/10";
  if (pct >= 70) return "text-primary border-primary/40 bg-primary/10";
  if (pct >= 55) return "text-warning border-warning/40 bg-warning/10";
  return "text-muted-foreground border-border bg-secondary/40";
}

export default function UpNextQueue({ targets, openMan, loading, empty, onRefresh, onPick }: Props) {
  return (
    <Card className="bg-gradient-card p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <ListMusic className="h-3.5 w-3.5" /> Up Next
          {loading && <span className="text-muted-foreground normal-case">· tuning...</span>}
        </h2>
        <Button size="sm" variant="ghost" onClick={onRefresh} disabled={loading} className="h-7 px-2">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {openMan && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[11px]">
          <Eye className="mt-0.5 h-3 w-3 shrink-0 text-accent" />
          <span className="text-foreground/90"><span className="font-semibold text-accent">Open man:</span> {openMan}</span>
        </div>
      )}

      <div className="space-y-2">
        {empty && !loading && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            Log your first pick — your queue will populate.
          </p>
        )}
        {loading && !targets.length && (
          [0, 1, 2].map((i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-md border border-border bg-secondary/40" />
          ))
        )}
        {targets.map((t, i) => (
          <button
            key={`${t.name}-${i}`}
            onClick={() => onPick(t)}
            className="group relative w-full overflow-hidden rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-left transition hover:border-primary/50 hover:bg-secondary/70"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold text-muted-foreground">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className={`${POS_COLORS[t.position]} text-[10px] px-1.5 py-0`}>
                    {t.position}
                  </Badge>
                  <span className="truncate font-semibold text-sm">{t.name}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                  {t.reason}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums ${matchTone(t.matchPct)}`}>
                  {t.matchPct}% match
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  bid ≤ <span className="font-bold text-foreground">${t.maxBid}</span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
