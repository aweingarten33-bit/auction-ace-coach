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
  /** Optional sub-role label, e.g. "Backup QB", "Handcuff RB". Used for bench rows. */
  label?: string;
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

      {/* Best next target — clear 3-part layout: TARGET · MAX BID · REASONING */}
      {bestTarget && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              AI Recommendation
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Target</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="truncate text-base font-bold text-foreground">{bestTarget.name}</span>
                <Badge
                  variant="outline"
                  className={`${POS_COLORS[bestTarget.position]} px-1.5 py-0 text-[10px]`}
                >
                  {bestTarget.position}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Max bid</p>
              <p className="text-base font-bold text-primary tabular-nums">${bestTarget.maxBid}</p>
            </div>
          </div>
          <div className="mt-2 border-t border-primary/20 pt-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Why</p>
            <p className="mt-0.5 text-[12px] leading-snug text-foreground/85">{bestTarget.reason}</p>
          </div>
          {onLoadTarget && (
            <Button
              size="sm"
              className="mt-2 w-full"
              onClick={() => onLoadTarget(bestTarget.name, bestTarget.position)}
            >
              <Zap className="mr-1 h-3 w-3" /> Load into bid form
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export type { SlotRow, BestTarget };
