// Position Budget Bar
// Fair-share target = sum of top-N prices at that position (from your price
// sheet) ÷ number of teams. N = roster slots needed across the league.
// If no prices loaded, falls back to a league-type heuristic.
import { Card } from "@/components/ui/card";
import { useDraftStore } from "@/lib/draft-store";
import { spendByPosition, computeBudget } from "@/lib/draft-math";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Position } from "@/lib/draft-types";

const POSITIONS: Position[] = ["QB", "RB", "WR", "TE"];

export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);

  const prices = useDraftStore((s) => s.prices);

  const data = useMemo(() => {
    const budget = computeBudget(settings, keepers, events);
    const myEvents = events.filter((e) => e.drafter === "me");
    const spent = spendByPosition(myEvents);
    for (const k of keepers) {
      const p = k.position ?? "UNK";
      spent[p] = (spent[p] ?? 0) + k.cost;
    }

    const isSF = settings.leagueType !== "Standard" && settings.roster.SUPERFLEX > 0;
    const r = settings.roster;
    const teams = Math.max(1, settings.numTeams);

    // Approx starters needed per team per position (FLEX split RB/WR/TE)
    const startersPerTeam: Record<Position, number> = {
      QB: r.QB + (isSF ? r.SUPERFLEX : 0),
      RB: r.RB + r.FLEX * 0.5,
      WR: r.WR + r.FLEX * 0.4,
      TE: r.TE + r.FLEX * 0.1,
      K: r.K,
      DST: r.DST,
    };
    // Bench depth split (RB/WR heavy)
    const benchSplit: Record<Position, number> = {
      QB: 0.1, RB: 0.4, WR: 0.4, TE: 0.1, K: 0, DST: 0,
    };
    const rosterableByPos: Record<Position, number> = {
      QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0,
    };
    for (const p of POSITIONS) {
      rosterableByPos[p] = Math.round((startersPerTeam[p] + r.BENCH * benchSplit[p]) * teams);
    }

    // Sum top-N prices per position from user's price sheet
    const pricesByPos: Record<Position, number[]> = { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] };
    for (const p of prices) {
      if (p.position && p.position in pricesByPos) pricesByPos[p.position].push(p.price);
    }
    for (const p of POSITIONS) pricesByPos[p].sort((a, b) => b - a);

    // Heuristic fallback if no prices uploaded
    const fallbackPct: Record<Position, number> = isSF
      ? { QB: 0.22, RB: 0.34, WR: 0.30, TE: 0.10, K: 0.02, DST: 0.02 }
      : { QB: 0.07, RB: 0.42, WR: 0.36, TE: 0.11, K: 0.02, DST: 0.02 };

    return POSITIONS.map((pos) => {
      const dollars = spent[pos] ?? 0;
      const need = rosterableByPos[pos];
      const topN = pricesByPos[pos].slice(0, need);
      const sumTopN = topN.reduce((s, v) => s + v, 0);
      const fromPrices = need > 0 && topN.length >= Math.min(need, 3)
        ? Math.round(sumTopN / teams)
        : 0;
      const targetDollars = fromPrices > 0 ? fromPrices : Math.round(budget.totalBudget * fallbackPct[pos]);
      const overBy = dollars - targetDollars;
      const status: "under" | "ok" | "over" =
        overBy >= 25 ? "over" : overBy <= -targetDollars * 0.5 && spent[pos] != null ? "under" : "ok";
      return { pos, dollars, targetDollars, overBy, status };
    });
  }, [settings, keepers, events, prices]);


  const totalSpent = data.reduce((s, d) => s + d.dollars, 0);
  if (totalSpent === 0 && events.length === 0 && keepers.length === 0) return null;

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
        Bar past the line = over fair share. Red = blew it by $25+.
      </p>
    </Card>
  );
}
