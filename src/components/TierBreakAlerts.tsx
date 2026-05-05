// Tier-break alerts — pure deterministic. Fires when only N elites remain at a position.
import { Position, PriceEstimate, DraftEvent, Keeper } from "@/lib/draft-types";
import { AlertTriangle } from "lucide-react";
import { POS_COLORS } from "@/lib/positions";

interface Props {
  prices: PriceEstimate[];
  events: DraftEvent[];
  keepers: Keeper[];
  /** Show only these positions (default all). */
  positions?: Position[];
  className?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Break {
  pos: Position;
  topName: string;
  topPrice: number;
  remainingTier: number;
  gap: number;
  next?: { name: string; price: number };
}

/** Group consecutive sheet entries into "tiers" by price-gap (>= 25% drop = tier break). */
function detectBreaks(prices: PriceEstimate[], drafted: Set<string>): Break[] {
  const POS: Position[] = ["QB", "RB", "WR", "TE"];
  const out: Break[] = [];
  for (const pos of POS) {
    const list = prices
      .filter((p) => (p as any).position === pos && p.price > 0 && !drafted.has(norm(p.name)))
      .sort((a, b) => b.price - a.price);
    if (list.length < 2) continue;
    // Walk top of board; first significant gap is the tier edge.
    let tierEnd = 0;
    for (let i = 0; i < Math.min(list.length - 1, 6); i++) {
      const gap = list[i].price - list[i + 1].price;
      const pct = list[i].price > 0 ? gap / list[i].price : 0;
      if (gap >= 5 && pct >= 0.2) {
        tierEnd = i;
        break;
      }
    }
    if (tierEnd === 0) continue; // no clean break in top
    const top = list[tierEnd];
    const next = list[tierEnd + 1];
    const remaining = tierEnd + 1; // count of elites still on the board
    if (remaining > 3) continue; // only alert when scarcity is real
    out.push({
      pos,
      topName: top.name,
      topPrice: top.price,
      remainingTier: remaining,
      gap: top.price - (next?.price ?? 0),
      next: next ? { name: next.name, price: next.price } : undefined,
    });
  }
  return out.sort((a, b) => a.remainingTier - b.remainingTier);
}

export default function TierBreakAlerts({ prices, events, keepers, positions, className }: Props) {
  const drafted = new Set<string>([
    ...events.map((e) => norm(e.player)),
    ...keepers.map((k) => norm(k.player)),
  ]);
  const breaks = detectBreaks(prices, drafted).filter((b) =>
    !positions || positions.includes(b.pos)
  );
  if (!breaks.length) return null;
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      {breaks.map((b) => (
        <div
          key={b.pos}
          className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1.5 text-[11px]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <div className="flex-1 min-w-0">
            <span className={`mr-1 inline-block rounded-sm px-1 text-[9px] font-bold ${POS_COLORS[b.pos]}`}>
              {b.pos}
            </span>
            <span className="font-semibold">
              {b.remainingTier === 1 ? "Last" : `Only ${b.remainingTier}`} {b.pos} tier-1 left
            </span>
            <span className="ml-1 text-muted-foreground">
              — <span className="font-medium text-foreground">{b.topName}</span>{" "}
              (${b.topPrice})
              {b.next && (
                <> · drop to <span className="font-medium">{b.next.name}</span> ${b.next.price} (-${b.gap})</>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
