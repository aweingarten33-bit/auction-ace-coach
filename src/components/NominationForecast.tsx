// "Up Next: Nomination Forecast" — predicts the next 3 likely nominated players
// in the room with confidence + reasoning. ESPN broadcast styling, all tokens.
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { POS_COLORS } from "@/lib/positions";
import { Radio, RefreshCw, TrendingUp } from "lucide-react";

export interface NominationPrediction {
  name: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DST";
  confidence: number;
  expectedBid: number;
  reason: string;
  trigger: string;
  signals?: {
    trend: number;
    value: number;
    rosterNeed: number;
  };
}

interface Props {
  predictions: NominationPrediction[];
  roomRead?: string;
  loading: boolean;
  onRefresh: () => void;
  onPick?: (name: string, position: NominationPrediction["position"]) => void;
}

function confTone(c: number) {
  if (c >= 75) return { bar: "bg-primary", text: "text-primary", label: "HIGH" };
  if (c >= 50) return { bar: "bg-accent", text: "text-accent", label: "MED" };
  return { bar: "bg-muted-foreground", text: "text-muted-foreground", label: "LOW" };
}

export default function NominationForecast({
  predictions,
  roomRead,
  loading,
  onRefresh,
  onPick,
}: Props) {
  return (
    <Card className="scoreboard p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="lower-third text-[10px]">
            <Radio className="mr-1 inline h-3 w-3 -translate-y-px" />
            UP NEXT · NOMINATION FORECAST
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={loading}
          className="h-7 gap-1 px-2 text-[10px] font-semibold"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Reading room..." : "Refresh"}
        </Button>
      </div>

      {roomRead && (
        <div className="mb-2 flex items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-2 py-1">
          <TrendingUp className="h-3 w-3 shrink-0 text-accent" />
          <p className="font-mono text-[10px] text-foreground/90">{roomRead}</p>
        </div>
      )}

      {!predictions.length && !loading && (
        <p className="py-4 text-center font-mono text-[11px] text-muted-foreground">
          Log a few picks, then hit Refresh — I'll predict who gets thrown out next.
        </p>
      )}

      <div className="space-y-1.5">
        {predictions.map((n, idx) => {
          const tone = confTone(n.confidence);
          return (
            <div
              key={`${n.name}-${idx}`}
              className="rounded-sm border border-border bg-card/60 p-2 transition hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-chyron text-[18px] font-extrabold italic leading-none text-primary tabular-nums">
                    #{idx + 1}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${POS_COLORS[n.position]} px-1.5 py-0 text-[9px]`}
                  >
                    {n.position}
                  </Badge>
                  <span className="truncate text-sm font-semibold">{n.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    ~<span className="font-bold text-foreground">${n.expectedBid}</span>
                  </span>
                  <span className={`font-mono text-[10px] font-bold ${tone.text}`}>
                    {n.confidence}%
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${tone.bar} transition-all duration-500`}
                  style={{ width: `${Math.max(4, Math.min(100, n.confidence))}%` }}
                />
              </div>

              <div className="mt-1.5 flex items-start justify-between gap-2">
                <p className="font-mono text-[10px] leading-snug text-foreground/85">
                  <span className="lower-third mr-1.5 inline-block bg-primary px-1 py-0 text-[8px] text-primary-foreground">
                    {n.trigger}
                  </span>
                  {n.reason}
                </p>
                {onPick && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onPick(n.name, n.position)}
                    className="h-6 shrink-0 px-2 text-[10px]"
                    title="Load into pick form to prep your bid"
                  >
                    Prep
                  </Button>
                )}
              </div>

              {/* Signal breakdown */}
              {n.signals && (
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {([
                    { key: "trend", label: "TREND", val: n.signals.trend, color: "bg-accent" },
                    { key: "value", label: "VALUE", val: n.signals.value, color: "bg-primary" },
                    { key: "rosterNeed", label: "NEED", val: n.signals.rosterNeed, color: "bg-warning" },
                  ] as const).map((s) => (
                    <div key={s.key} className="rounded-sm border border-border/60 bg-secondary/30 px-1.5 py-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[8px] font-bold tracking-wider text-muted-foreground">
                          {s.label}
                        </span>
                        <span className="font-mono text-[9px] font-bold tabular-nums text-foreground">
                          {s.val}
                        </span>
                      </div>
                      <div className="mt-0.5 h-0.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${s.color} transition-all duration-500`}
                          style={{ width: `${Math.max(2, Math.min(100, s.val))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
