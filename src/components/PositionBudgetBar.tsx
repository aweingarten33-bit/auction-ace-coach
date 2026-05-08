// Position Budget Bar
// Per-team fair-share = league position share (scoring + leagueType aware) × totalBudget.
// Uses the same allocation model as the tier engine so targets feel right
// (e.g. Superflex $225 → QB ~$54, RB ~$70, WR ~$62, TE ~$22).
import { Card } from "@/components/ui/card";
import { useDraftStore } from "@/lib/draft-store";
import { spendByPosition } from "@/lib/draft-math";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/draft-types";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

// Mirrors positionShare() in vetri-tiers.ts but inlined to avoid coupling.
function shareByPosition(settings: ReturnType<typeof useDraftStore.getState>["settings"]): Record<Position, number> {
  const base: Record<Position, number> = {
    RB: 0.42, WR: 0.34, QB: 0.08, TE: 0.10, DST: 0.03, K: 0.03,
  };
  if (settings.scoring === "PPR") {
    base.WR += 0.04; base.TE += 0.02; base.RB -= 0.06;
  } else if (settings.scoring === "Standard") {
    base.RB += 0.04; base.WR -= 0.03; base.TE -= 0.01;
  }
  if (settings.leagueType === "Superflex" || settings.leagueType === "2QB") {
    const qbBoost = 0.16;
    base.QB += qbBoost;
    base.RB -= qbBoost * 0.6;
    base.WR -= qbBoost * 0.4;
  }
  if (settings.roster.K === 0) { base.WR += base.K * 0.5; base.RB += base.K * 0.5; base.K = 0; }
  if (settings.roster.DST === 0) { base.WR += base.DST * 0.5; base.RB += base.DST * 0.5; base.DST = 0; }
  const total = Object.values(base).reduce((s, v) => s + v, 0);
  if (total > 0) for (const k of Object.keys(base) as Position[]) base[k] = base[k] / total;
  return base;
}

export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);

  const data = useMemo(() => {
    const myEvents = events.filter((e) => e.drafter === "me");
    const spent = spendByPosition(myEvents);
    for (const k of keepers) {
      const p = k.position ?? "UNK";
      spent[p] = (spent[p] ?? 0) + k.cost;
    }
    const share = shareByPosition(settings);
    return POSITIONS.map((pos) => {
      const dollars = spent[pos] ?? 0;
      const targetDollars = Math.max(1, Math.round(settings.totalBudget * share[pos]));
      const overBy = dollars - targetDollars;
      const status: "under" | "ok" | "over" =
        overBy >= 25 ? "over" : overBy <= -targetDollars * 0.5 && spent[pos] != null ? "under" : "ok";
      return { pos, dollars, targetDollars, overBy, status };
    });
  }, [settings, keepers, events]);

  const totalSpent = data.reduce((s, d) => s + d.dollars, 0);
  // Always show — targets are useful even before any picks
  void totalSpent;

  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Spending by position</h3>
        <span className="font-mono text-[10px] text-muted-foreground">vs fair share</span>
      </div>
      <div className="space-y-1.5">
        {data.map((d) => {
          const pctOfTarget = d.targetDollars > 0 ? Math.min(1.5, d.dollars / d.targetDollars) : 0;
          return (
            <div key={d.pos} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold">{d.pos}</span>
                <span className={cn(
                  "font-mono",
                  d.status === "over" && "text-destructive font-bold",
                  d.status === "under" && "text-amber-500",
                )}>
                  ${d.dollars} / ${d.targetDollars}
                  {d.status === "over" && ` (+$${d.overBy})`}
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all",
                    d.status === "over" ? "bg-destructive" :
                    d.status === "under" ? "bg-amber-500" :
                    "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, pctOfTarget * 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${100 / 1.5}%` }}
                  title="fair share line"
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Target = league position share × ${settings.totalBudget} budget, adjusted for {settings.scoring} + {settings.leagueType}.
      </p>
    </Card>
  );
}
