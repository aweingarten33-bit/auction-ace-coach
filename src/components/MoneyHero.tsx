// MoneyHero — instrument readout. Big mono $-remaining + a thin oscilloscope
// bar that drains as you spend. Restrained palette, real signal.
import { useEffect, useRef, useState } from "react";

interface Props {
  remaining: number;
  total: number;
  showMax: boolean;
  maxBid: number;
}

export default function MoneyHero({ remaining, total, showMax, maxBid }: Props) {
  const prev = useRef(remaining);
  const [delta, setDelta] = useState<number | null>(null);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (prev.current !== remaining) {
      const d = remaining - prev.current;
      if (d < 0) {
        setDelta(d);
        setBump(true);
        const t1 = setTimeout(() => setDelta(null), 1600);
        const t2 = setTimeout(() => setBump(false), 280);
        prev.current = remaining;
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
      prev.current = remaining;
    }
  }, [remaining]);

  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  const tone =
    pct < 0.2 ? "text-destructive" : pct < 0.45 ? "text-warning" : "text-foreground";
  const barTone =
    pct < 0.2 ? "bg-destructive" : pct < 0.45 ? "bg-warning" : "bg-primary";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {/* Top row: hero number + max */}
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={`font-mono text-[26px] font-bold leading-none tracking-tight tabular-nums transition-transform ${tone} ${bump ? "scale-[1.04]" : "scale-100"}`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          ${remaining}
        </span>
        {delta !== null && (
          <span
            key={delta}
            className="font-mono text-[11px] font-semibold leading-none text-destructive tabular-nums [animation:fade-out_1.6s_ease-out_forwards]"
          >
            {delta}
          </span>
        )}
        {showMax && (
          <span className="ml-auto flex items-baseline gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            <span>max</span>
            <span className="text-foreground tabular-nums">${maxBid}</span>
          </span>
        )}
      </div>

      {/* Drain meter — thin oscilloscope rail */}
      <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-border/60">
        <div
          className={`h-full ${barTone} transition-[width] duration-500 ease-out`}
          style={{ width: `${pct * 100}%` }}
        />
        {/* Tick marks at 25 / 50 / 75 */}
        {[0.25, 0.5, 0.75].map((p) => (
          <span
            key={p}
            className="absolute top-0 h-full w-px bg-background/70"
            style={{ left: `${p * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
