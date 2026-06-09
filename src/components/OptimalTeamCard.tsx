// Optimal Team @ $200 — DraftMath-style research card.
// Shows the highest-projection 2QB lineup the league budget can buy.
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDraftStore } from "@/lib/draft-store";
import { useVorpMap } from "@/lib/use-vorp-map";
import { computeOptimalTeam } from "@/lib/optimal-team";
import { Trophy, Loader2 } from "lucide-react";

const POS_COLOR: Record<string, string> = {
  QB: "bg-red-500/15 text-red-400 border-red-500/30",
  RB: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  WR: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  TE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export default function OptimalTeamCard() {
  const { settings } = useDraftStore();
  const { players, loading } = useVorpMap(settings);

  const lineup = useMemo(
    () => computeOptimalTeam(settings, players),
    [settings, players],
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Optimal Team @ ${settings.totalBudget}
          </span>
          {lineup.feasible && (
            <span className="text-xs font-normal text-muted-foreground">
              {lineup.totalProjection.toFixed(1)} pts
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Building lineup…
          </div>
        ) : !lineup.feasible || lineup.picks.length === 0 ? (
          <p className="py-3 text-xs text-muted-foreground">
            Not enough projection data to build a lineup yet.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border/40">
              {lineup.picks.map((p) => (
                <li
                  key={p.slot}
                  className="flex items-center justify-between gap-2 py-1.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`shrink-0 px-1.5 py-0 text-[10px] ${POS_COLOR[p.player.position] ?? ""}`}
                    >
                      {p.slot}
                    </Badge>
                    <span className="truncate font-medium">{p.player.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 tabular-nums">
                    <span className="text-muted-foreground">{p.player.projection.toFixed(1)}</span>
                    <span className="w-9 text-right font-semibold text-primary">
                      ${p.player.price}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
              <span>
                Starters ${lineup.totalSpent - lineup.reservedDollar} · Bench/K/DST $
                {lineup.reservedDollar}
              </span>
              <span className="font-medium text-foreground">
                Total ${lineup.totalSpent} / ${lineup.budget}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
