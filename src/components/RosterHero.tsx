import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { POS_COLORS } from "@/lib/positions";
import { Position, PriceEstimate } from "@/lib/draft-types";
import { Target, Zap } from "lucide-react";
import AnimatedNumber from "./AnimatedNumber";

interface SlotRow {
  pos: Position | "FLEX" | "BENCH";
  have: number;
  need: number;
  short: number;
  maxBid: number;       // per-slot max bid for this position
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
  critical: "border-destructive/60 bg-destructive/10 text-destructive",
  need: "border-warning/50 bg-warning/10 text-warning",
  depth: "border-border bg-secondary/40 text-muted-foreground",
  done: "border-success/40 bg-success/10 text-success",
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
    <Card className="relative overflow-hidden border-primary/30 bg-gradient-card p-4 shadow-glow">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, hsl(var(--primary)) 0 1px, transparent 1px 12px)",
        }}
      />
      <div className="relative">
        {/* Top stat strip */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary/80">
              ⚡ Your Build · Live
            </p>
            <h2 className="font-chyron text-lg font-extrabold uppercase italic tracking-tight text-foreground neon-text">
              Roster + Needs
            </h2>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px] tabular-nums text-muted-foreground">
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wide">Bank</p>
              <AnimatedNumber
                value={remaining}
                prefix="$"
                className="block text-base font-bold text-primary"
              />
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wide">Max Bid</p>
              <AnimatedNumber
                value={maxBid}
                prefix="$"
                className="block text-base font-bold text-foreground"
              />
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wide">Slots</p>
              <p className="text-base font-bold tabular-nums text-foreground">
                <AnimatedNumber value={slotsLeft} />
                <span className="text-xs text-muted-foreground">/{slotsTotal}</span>
              </p>
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
                <span className="font-mono text-[10px] tabular-nums text-foreground/80">
                  {r.have}/{r.need}
                </span>
              </div>
              {r.severity !== "done" && (
                <div className="mt-0.5 flex items-center justify-between font-mono text-[10px] tabular-nums">
                  <span className="text-[8px] uppercase tracking-wider opacity-70">max</span>
                  <span className="font-bold">${r.maxBid}</span>
                </div>
              )}
            </div>

          ))}
        </div>

        {/* Best next target — only when we have one */}
        {bestTarget && (
        <div className="mt-3 flex items-stretch gap-2 rounded-md border border-primary/40 bg-primary/5 p-2.5">
          <div className="flex h-auto w-9 shrink-0 items-center justify-center rounded bg-primary/15">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary/90">
              Best Next Target
            </p>
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-foreground">
                    {bestTarget.name}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${POS_COLORS[bestTarget.position]} px-1.5 py-0 text-[10px]`}
                  >
                    {bestTarget.position}
                  </Badge>
                  <span className="ml-auto font-mono text-sm font-bold text-primary">
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
              className="self-center bg-gradient-primary text-primary-foreground"
              onClick={() => onLoadTarget(bestTarget.name, bestTarget.position)}
            >
              <Zap className="mr-1 h-3 w-3" /> Load
            </Button>
          )}
        </div>
        )}
      </div>
    </Card>
  );
}

export type { SlotRow, BestTarget };
