// MoneyHero — Stark HUD readout. Big mono number, no denominator,
// thin scan line, corner ticks. Color shifts amber → red as bank drains.
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
        const t = setTimeout(() => setDelta(null), 1600);
        prev.current = remaining;
        return () => clearTimeout(t);
      }
      prev.current = remaining;
    }
  }, [remaining]);

  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  const tone =
    pct < 0.2
      ? "text-destructive"
      : pct < 0.45
        ? "text-warning"
        : "text-primary";
  const dotTone =
    pct < 0.2 ? "bg-destructive" : pct < 0.45 ? "bg-warning" : "bg-primary";

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      {/* Corner ticks — HUD frame */}
      <span className="absolute left-0 top-0 h-1.5 w-1.5 border-l border-t border-primary/40" aria-hidden />
      <span className="absolute right-0 top-0 h-1.5 w-1.5 border-r border-t border-primary/40" aria-hidden />
      <span className="absolute left-0 bottom-0 h-1.5 w-1.5 border-l border-b border-primary/40" aria-hidden />
      <span className="absolute right-0 bottom-0 h-1.5 w-1.5 border-r border-b border-primary/40" aria-hidden />

      <div className="flex w-full items-center gap-2.5 px-2 py-1">
        {/* Live dot */}
        <span className="relative flex h-1.5 w-1.5 items-center justify-center" aria-hidden>
          <span className={`absolute inset-0 rounded-full ${dotTone} opacity-70 animate-ping`} />
          <span className={`relative h-1.5 w-1.5 rounded-full ${dotTone}`} />
        </span>

        {/* Hero number */}
        <span
          className={`font-mono text-[28px] font-bold leading-none tracking-tight tabular-nums ${tone} drop-shadow-[0_0_6px_currentColor]`}
        >
          ${remaining}
        </span>

        {/* Spend tick */}
        {delta !== null && (
          <span
            key={delta}
            className="font-mono text-[11px] font-semibold leading-none text-destructive tabular-nums [animation:fade-out_1.6s_ease-out_forwards]"
          >
            {delta}
          </span>
        )}

        {/* Right-side meta */}
        <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
          {showMax && (
            <>
              <span>max</span>
              <span className="text-foreground tabular-nums">${maxBid}</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
