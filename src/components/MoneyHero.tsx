// MoneyHero — the loud, glowing $-remaining display for draft night.
// Animates on every spend with a red "−$X" spark, color-shifts when
// you're flush (>60%) or low (<25%).
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
        const t = setTimeout(() => setDelta(null), 1500);
        prev.current = remaining;
        return () => clearTimeout(t);
      }
      prev.current = remaining;
    }
  }, [remaining]);

  const pct = total > 0 ? remaining / total : 1;
  const tone = pct < 0.25 ? "is-low" : pct > 0.6 ? "is-flush" : "";

  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <div className="relative flex items-baseline">
        <span className={`money-hero text-[34px] ${tone}`}>
          ${remaining}
        </span>
        {delta !== null && (
          <span className="money-spark ml-2">{delta}</span>
        )}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        left{showMax ? ` · max $${maxBid}` : ""}
      </span>
    </div>
  );
}
