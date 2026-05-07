// CounterAnchorDetector — flags the live nomination if its current price
// drifts >X% from the league anchor. Pure ratio: live/anchor. No model.
import type { AnchorEntry } from "@/lib/decision-engine";
import { useAnchorMap } from "@/lib/use-anchor-map";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  player: string | null;
  livePrice: number | null;
}

export default function CounterAnchorDetector({ player, livePrice }: Props) {
  const { map } = useAnchorMap();
  if (!player || !livePrice || livePrice <= 0) return null;
  const anchor: AnchorEntry | undefined = map[norm(player)];
  if (!anchor || anchor.price <= 0) return null;

  const ratio = livePrice / anchor.price;
  const delta = livePrice - anchor.price;
  const pct = Math.round((ratio - 1) * 100);

  let kind: "steal" | "fair" | "reach" = "fair";
  if (ratio <= 0.85) kind = "steal";
  else if (ratio >= 1.25) kind = "reach";

  const tone =
    kind === "steal"
      ? "border-success/60 bg-success/10 text-success"
      : kind === "reach"
        ? "border-destructive/60 bg-destructive/10 text-destructive"
        : "border-border bg-muted/30 text-muted-foreground";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded border px-2 py-1 font-mono text-[10px] ${tone}`}
    >
      <span className="uppercase tracking-[0.18em]">{kind}</span>
      <span className="tabular-nums">
        ${livePrice} vs ${anchor.price} ({pct >= 0 ? "+" : ""}
        {pct}%)
      </span>
    </div>
  );
}
