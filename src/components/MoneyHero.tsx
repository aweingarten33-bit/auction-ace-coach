// MoneyHero — instrumented $-remaining readout. Bloomberg/oscilloscope vibe:
// monospace tabular numerals, hairline rule, signal-color status dot, subtle
// tick on spend. No glow, no gradients, no animation theatrics.
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

  useEffect(() => {
    if (prev.current !== remaining) {
      const d = remaining - prev.current;
      if (d < 0) {
        setDelta(d);
        const t = setTimeout(() => setDelta(null), 1400);
        prev.current = remaining;
        return () => clearTimeout(t);
      }
      prev.current = remaining;
    }
  }, [remaining]);

  const pct = total > 0 ? remaining / total : 1;
  const dotClass =
    pct < 0.2
      ? "bg-destructive"
      : pct < 0.45
        ? "bg-warning"
        : "bg-success";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold leading-none tracking-tight tabular-nums text-foreground">
          ${remaining}
        </span>
        <span className="font-mono text-[10px] leading-none text-muted-foreground/70 tabular-nums">
          /{total}
        </span>
        {delta !== null && (
          <span
            key={delta}
            className="ml-1 font-mono text-[10px] font-semibold leading-none text-destructive tabular-nums [animation:fade-out_1.4s_ease-out_forwards]"
          >
            {delta}
          </span>
        )}
      </div>
      {showMax && (
        <>
          <span className="h-3 w-px bg-border/60" aria-hidden />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            max <span className="text-foreground">${maxBid}</span>
          </span>
        </>
      )}
    </div>
  );
}
