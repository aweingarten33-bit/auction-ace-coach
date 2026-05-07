// StealReachCounter — pure deterministic tally of every closed pick tonight.
// For each event with a price, compare to anchorMap (league 3yr avg → ESPN).
// Steal:  paid ≤ anchor − 15% (or ≥ $3 under for cheap players)
// Reach:  paid ≥ anchor + 25%
// Fair:   everything else
// Net edge: Σ(anchor − paid) across YOUR picks only. Positive = you're winning.
import { useMemo } from "react";
import type { DraftEvent } from "@/lib/draft-types";
import type { AnchorEntry } from "@/lib/decision-engine";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  events: DraftEvent[];
  anchorMap: Record<string, AnchorEntry>;
}

export default function StealReachCounter({ events, anchorMap }: Props) {
  const stats = useMemo(() => {
    let steals = 0;
    let reaches = 0;
    let fair = 0;
    let myEdge = 0; // sum(anchor - paid) for MY picks only
    let myPicks = 0;
    let lastVerdict: { name: string; kind: "steal" | "reach" | "fair"; delta: number } | null = null;

    for (const e of events) {
      if (!e.player || !e.price || e.price <= 0) continue;
      const anchor = anchorMap[norm(e.player)]?.price ?? 0;
      if (anchor <= 0) continue;
      const delta = anchor - e.price; // positive = under anchor = steal-ish
      const pct = delta / anchor;
      let kind: "steal" | "reach" | "fair";
      if (pct >= 0.15 || (anchor <= 10 && delta >= 3)) kind = "steal";
      else if (pct <= -0.25) kind = "reach";
      else kind = "fair";

      if (kind === "steal") steals++;
      else if (kind === "reach") reaches++;
      else fair++;

      if (e.drafter === "me") {
        myPicks++;
        myEdge += delta;
      }

      lastVerdict = { name: e.player, kind, delta };
    }
    return { steals, reaches, fair, myEdge, myPicks, lastVerdict };
  }, [events, anchorMap]);

  if (stats.steals + stats.reaches + stats.fair === 0) return null;

  const edgeColor =
    stats.myEdge > 0
      ? "text-success"
      : stats.myEdge < 0
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Tonight's Tape
        </h3>
        {stats.lastVerdict && (
          <span className="font-mono text-[10px] text-muted-foreground/70">
            last:{" "}
            <span
              className={
                stats.lastVerdict.kind === "steal"
                  ? "text-success"
                  : stats.lastVerdict.kind === "reach"
                    ? "text-destructive"
                    : "text-foreground"
              }
            >
              {stats.lastVerdict.kind.toUpperCase()}
            </span>{" "}
            {stats.lastVerdict.delta >= 0 ? "+" : ""}
            {stats.lastVerdict.delta}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Cell label="Steals" value={stats.steals} tone="text-success" />
        <Cell label="Fair" value={stats.fair} tone="text-foreground" />
        <Cell label="Reaches" value={stats.reaches} tone="text-destructive" />
      </div>
      {stats.myPicks > 0 && (
        <div className="mt-2 flex items-baseline justify-between border-t border-border/50 pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Your edge
          </span>
          <span className={`font-mono text-base font-bold tabular-nums ${edgeColor}`}>
            {stats.myEdge >= 0 ? "+" : ""}${stats.myEdge}
          </span>
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-border/40 bg-background/40 py-1.5">
      <span className={`font-mono text-xl font-bold leading-none tabular-nums ${tone}`}>{value}</span>
      <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
