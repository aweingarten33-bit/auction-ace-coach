import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POS_COLORS } from "@/lib/positions";
import { Position } from "@/lib/draft-types";
import { Target, Zap } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

interface SlotRow {
  pos: Position | "FLEX" | "BENCH";
  have: number;
  need: number;
  short: number;
  maxBid: number;
  severity: "critical" | "need" | "depth" | "done";
}

interface BestTarget {
  name: string;
  position: Position;
  maxBid: number;
  reason: string;
}

interface RosterHeroProps {
  remaining: number;
  slotsLeft: number;
  slotsTotal: number;
  maxBid: number;
  rows: SlotRow[];
  bestTarget: BestTarget | null;
  onLoadTarget?: (name: string, position: Position) => void;
}

const sevTone: Record<SlotRow["severity"], string> = {
  critical: "border-destructive/50 bg-destructive/5 text-destructive",
  need: "border-warning/40 bg-warning/5 text-warning",
  depth: "border-border bg-secondary/30 text-muted-foreground",
  done: "border-success/30 bg-success/5 text-success",
};

export default function RosterHero({
  remaining,
  slotsLeft,
  slotsTotal,
  maxBid,
  rows,
  bestTarget,
  onLoadTarget,
}: RosterHeroProps) {
  const openRows = rows.filter((r) => r.short > 0 || r.severity !== "done");

  return (
    <Card className="p-4">
      {/* Top stat strip */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Your Build
          </p>
          <h2 className="text-base font-semibold text-foreground">
            Roster &amp; Needs
          </h2>
        </div>
        <div className="flex items-center gap-4 tabular-nums">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Bank</p>
            <AnimatedNumber value={remaining} prefix="$" className="block text-base font-semibold text-primary" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max Bid</p>
            <AnimatedNumber value={maxBid} prefix="$" className="block text-base font-semibold text-foreground" />
          </div>
        </div>
      </div>

      {/* Per-slot grid */}
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {(openRows.length ? openRows : rows).map((r) => (
          <div
            key={r.pos}
            className={`flex flex-col rounded-md border px-2 py-1.5 ${sevTone[r.severity]}`}
          >
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={`${
                  r.pos === "FLEX" || r.pos === "BENCH"
                    ? "bg-muted text-foreground border-border"
                    : POS_COLORS[r.pos as Position]
                } px-1.5 py-0 text-[10px]`}
              >
                {r.pos}
              </Badge>
              <span className="text-[10px] tabular-nums text-foreground/80">
                {r.have}/{r.need}
              </span>
            </div>
            {r.severity !== "done" && (
              <div className="mt-0.5 flex items-center justify-between text-[10px] tabular-nums">
                <span className="text-[9px] uppercase tracking-wider opacity-70">max</span>
                <span className="font-semibold">${r.maxBid}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Best next target */}
      {bestTarget && (
        <div className="mt-3 flex items-stretch gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5">
          <div className="flex h-auto w-9 shrink-0 items-center justify-center rounded bg-primary/10">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Best Next Target
            </p>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {bestTarget.name}
              </span>
              <Badge
                variant="outline"
                className={`${POS_COLORS[bestTarget.position]} px-1.5 py-0 text-[10px]`}
              >
                {bestTarget.position}
              </Badge>
              <span className="ml-auto text-sm font-semibold text-primary tabular-nums">
                ≤ ${bestTarget.maxBid}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {bestTarget.reason}
            </p>
          </div>
          {onLoadTarget && (
            <Button
              size="sm"
              className="self-center"
              onClick={() => onLoadTarget(bestTarget.name, bestTarget.position)}
            >
              <Zap className="mr-1 h-3 w-3" /> Load
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export type { SlotRow, BestTarget };
