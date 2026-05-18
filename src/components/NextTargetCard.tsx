// NextTargetCard — research-only suggestion of which position to attack next.
// Pure derivation from existing engines (gaps, budget shares, prices, market
// pulse). No bid amounts, no nominate buttons, no per-player advice.
import { Target } from "lucide-react";
import type { DraftEvent, Position, PriceEstimate } from "@/lib/draft-types";
import { positionShare } from "@/lib/vetri-tiers";
import type { MarketPulse } from "@/lib/value";
import type { useDraftStore } from "@/lib/draft-store";

type Settings = ReturnType<typeof useDraftStore.getState>["settings"];

interface Gap {
  pos: Position | string;
  starterShort: number;
  severity: "critical" | "need" | "depth" | "done";
}

interface Props {
  settings: Settings;
  gaps: Gap[];
  spend: Partial<Record<Position, number>>;
  remaining: number;
  prices: PriceEstimate[];
  events: DraftEvent[];
  pulse: MarketPulse;
}

const POS: Position[] = ["QB", "RB", "WR", "TE"];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function NextTargetCard({
  settings,
  gaps,
  spend,
  remaining,
  prices,
  events,
  pulse,
}: Props) {
  const share = positionShare(settings);
  const targetByPos = Object.fromEntries(
    POS.map((p) => [p, Math.round(settings.totalBudget * share[p])]),
  ) as Record<Position, number>;

  // Top remaining price by position from the user's price sheet (excluding drafted).
  const drafted = new Set(events.map((e) => norm(e.player)));
  const topAvailByPos: Record<Position, number> = {
    QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0,
  };
  for (const p of prices) {
    if (!p.position || !POS.includes(p.position)) continue;
    if (drafted.has(norm(p.name))) continue;
    if ((p.price ?? 0) > topAvailByPos[p.position]) topAvailByPos[p.position] = p.price ?? 0;
  }

  const scored = POS.map((pos) => {
    const gap = gaps.find((g) => g.pos === pos);
    const short = gap?.starterShort ?? 0;
    const sev = gap?.severity ?? "done";

    const target = targetByPos[pos] ?? 0;
    const spent = spend[pos] ?? 0;
    const underBy = Math.max(0, target - spent);
    const sharePct = target > 0 ? underBy / target : 0;

    const top = topAvailByPos[pos] ?? 0;

    const sevWeight = sev === "critical" ? 100 : sev === "need" ? 60 : sev === "depth" ? 15 : 0;
    const shareWeight = sharePct * 40;
    const valueWeight = top > 0 && remaining > 0
      ? Math.min(20, (top / Math.max(1, remaining)) * 60)
      : 0;

    const score = sevWeight + shareWeight + valueWeight;
    return { pos, score, short, sev, target, spent, underBy, top };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 5) return null;

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
    reasons.push(`Board: top ${top.pos} left priced at ~$${top.top}.`);
  }
  if (pulse.confident && pulse.multiplier > 1.05) {
    reasons.push(`⚠ Room is hot overall (×${pulse.multiplier.toFixed(2)}); expect overpays.`);
  } else if (pulse.confident && pulse.multiplier < 0.95) {
    reasons.push(`Market is cooling (×${pulse.multiplier.toFixed(2)}) — value window open.`);
  }

  const runnerUp = scored[1];

  return (
    <section className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Target className="h-3.5 w-3.5" />
        Go after next
      </p>

      <span className="text-2xl font-bold tracking-tight text-foreground">{top.pos}</span>

      <ul className="mt-2 space-y-1 text-[12px] leading-snug text-foreground/85">
        {reasons.map((r, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-muted-foreground">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>

      {runnerUp && runnerUp.score > 5 && (
        <p className="mt-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          Also consider: <span className="font-semibold text-foreground/80">{runnerUp.pos}</span>
        </p>
      )}
    </section>
  );
}
