// NextTargetCard — research-only suggestion of which position to attack next.
// Pure derivation from existing engines (gaps, budget shares, anchor prices,
// market pulse). No bid amounts, no nominate buttons, no per-player advice.
import { Target } from "lucide-react";
import type { Position, PriceEstimate } from "@/lib/draft-types";
import { positionShare } from "@/lib/vetri-tiers";
import type { useDraftStore } from "@/lib/draft-store";

type Settings = ReturnType<typeof useDraftStore.getState>["settings"];

interface Gap {
  pos: Position | string;
  starterShort: number;
  severity: "critical" | "need" | "depth" | "done";
}

interface PulseEntry {
  position: Position;
  hot: boolean;
  multiplier: number; // >1 means inflated, <1 means deflating
}

interface Props {
  settings: Settings;
  gaps: Gap[];
  spend: Partial<Record<Position, number>>;
  remaining: number;
  anchorMap: Map<string, PriceEstimate>;
  pulse: PulseEntry[];
}

const POS: Position[] = ["QB", "RB", "WR", "TE"];

export default function NextTargetCard({
  settings,
  gaps,
  spend,
  remaining,
  anchorMap,
  pulse,
}: Props) {
  const share = positionShare(settings);
  const targetByPos = Object.fromEntries(
    POS.map((p) => [p, Math.round(settings.totalBudget * share[p])]),
  ) as Record<Position, number>;

  // Top remaining anchor price by position (proxy for "best player available $")
  const topAvailByPos: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
  for (const est of anchorMap.values()) {
    const p = est.position as Position;
    if (!POS.includes(p)) continue;
    if ((est.price ?? 0) > (topAvailByPos[p] ?? 0)) topAvailByPos[p] = est.price ?? 0;
  }

  const pulseByPos = new Map(pulse.map((p) => [p.position, p]));

  const scored = POS.map((pos) => {
    const gap = gaps.find((g) => g.pos === pos);
    const short = gap?.starterShort ?? 0;
    const sev = gap?.severity ?? "done";

    const target = targetByPos[pos] ?? 0;
    const spent = spend[pos] ?? 0;
    const underBy = Math.max(0, target - spent); // $ left vs fair share
    const sharePct = target > 0 ? underBy / target : 0;

    const top = topAvailByPos[pos] ?? 0;
    const heat = pulseByPos.get(pos);
    const mult = heat?.multiplier ?? 1;
    const hot = heat?.hot ?? false;

    // Score: shortage dominates, then under-share, top player on board, cooled market.
    const sevWeight = sev === "critical" ? 100 : sev === "need" ? 60 : sev === "depth" ? 15 : 0;
    const shareWeight = sharePct * 40;
    const valueWeight = top > 0 && remaining > 0 ? Math.min(20, (top / Math.max(1, remaining)) * 60) : 0;
    const heatPenalty = hot ? 25 : Math.max(0, (1 - mult) * 30); // cooled = bonus

    const score = sevWeight + shareWeight + valueWeight + heatPenalty;

    return { pos, score, short, sev, target, spent, underBy, top, mult, hot };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 5) return null;

  // Build human-readable reasons
  const reasons: string[] = [];
  if (top.short > 0) {
    reasons.push(
      `Roster: short ${top.short} starter${top.short > 1 ? "s" : ""} at ${top.pos} (${top.sev}).`,
    );
  }
  if (top.underBy >= 5) {
    reasons.push(
      `Budget: spent $${top.spent} of $${top.target} fair share — $${top.underBy} headroom.`,
    );
  }
  if (top.top > 0) {
    reasons.push(`Board: top ${top.pos} left anchors at ~$${top.top}.`);
  }
  if (top.hot) {
    reasons.push(`⚠ Market is hot at ${top.pos} (×${top.mult.toFixed(2)}); expect overpays.`);
  } else if (top.mult < 0.95) {
    reasons.push(`Market: ${top.pos} cooling (×${top.mult.toFixed(2)}) — value window.`);
  }

  const runnerUp = scored[1];

  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Target className="h-3.5 w-3.5" />
          Next target
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Research only
        </p>
      </div>

      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-foreground">{top.pos}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          score {Math.round(top.score)}
        </span>
      </div>

      <ul className="space-y-1 text-[12px] leading-snug text-foreground/85">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-muted-foreground">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {runnerUp && runnerUp.score > 5 && (
        <p className="mt-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          Backup plan: <span className="font-semibold text-foreground/80">{runnerUp.pos}</span>{" "}
          (score {Math.round(runnerUp.score)})
        </p>
      )}
    </section>
  );
}
