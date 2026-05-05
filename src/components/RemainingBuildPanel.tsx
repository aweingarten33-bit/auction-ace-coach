import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import type { BuildProjection } from "@/lib/simulator";
import type { Position } from "@/lib/draft-types";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  projection: BuildProjection;
  hypoPrice: number;
  hypoName?: string;
  hypoPos?: Position;
  compact?: boolean;
}

const slotBadge = (pos: BuildProjection["slots"][number]["pos"]) =>
  pos === "FLEX" || pos === "BENCH"
    ? "bg-muted text-foreground border-border"
    : POS_COLORS[pos as Position];

export default function RemainingBuildPanel({
  projection,
  hypoPrice,
  hypoName,
  hypoPos,
  compact = false,
}: Props) {
  const {
    feasible,
    remainingAfter,
    slotsLeftAfter,
    slots,
    dollarsLeftover,
    riskFlags,
  } = projection;

  return (
    <Card
      className={`border ${
        feasible ? "border-success/40" : "border-warning/50"
      } bg-gradient-card ${compact ? "p-2.5" : "p-3"}`}
    >
      <div className="flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          If you win {hypoName ? `${hypoName} ` : ""}@ ${hypoPrice}
        </p>
        {feasible ? (
          <Badge variant="outline" className="border-success/50 bg-success/10 text-success px-1.5 py-0 text-[10px]">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Build OK
          </Badge>
        ) : (
          <Badge variant="outline" className="border-warning/60 bg-warning/10 text-warning px-1.5 py-0 text-[10px]">
            <AlertTriangle className="mr-1 h-3 w-3" /> Tight
          </Badge>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tabular-nums">
        <span className="text-muted-foreground">
          Bank <span className="font-bold text-foreground">${remainingAfter}</span>
        </span>
        <span className="text-muted-foreground">
          Slots <span className="font-bold text-foreground">{slotsLeftAfter}</span>
        </span>
        <span className="text-muted-foreground">
          Leftover <span className="font-bold text-foreground">${dollarsLeftover}</span>
        </span>
      </div>

      {/* Plan rows */}
      {slots.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
          {slots.slice(0, 9).map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded border border-border/50 bg-secondary/30 px-1.5 py-1 text-[11px]"
            >
              <Badge variant="outline" className={`${slotBadge(s.pos)} px-1 py-0 text-[9px]`}>
                {s.pos}
              </Badge>
              <span className="ml-1 truncate text-muted-foreground">
                {s.candidateName ?? "—"}
              </span>
              <span className="ml-1 font-mono font-bold tabular-nums text-foreground">
                ${s.plannedSpend}
              </span>
            </div>
          ))}
          {slots.length > 9 && (
            <div className="flex items-center justify-center rounded border border-dashed border-border/40 px-1.5 py-1 text-[10px] text-muted-foreground">
              +{slots.length - 9} more
            </div>
          )}
        </div>
      )}

      {riskFlags.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {riskFlags.map((r, i) => (
            <li key={i} className="text-[10px] text-warning">
              ⚠ {r}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
