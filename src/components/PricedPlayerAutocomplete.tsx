import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { PriceEstimate, Position } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  value: string;
  onChange: (val: string) => void;
  prices: PriceEstimate[];
  excludeNames?: string[]; // already drafted/keepers
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export default function PricedPlayerAutocomplete({
  value,
  onChange,
  prices,
  excludeNames = [],
  placeholder = "Player name",
  autoFocus,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const excluded = useMemo(() => new Set(excludeNames.map(norm)), [excludeNames]);

  const suggestions = useMemo(() => {
    const q = value.trim();
    if (q.length < 1) return [];
    const qn = norm(q);
    return prices
      .filter((p) => !excluded.has(norm(p.name)))
      .filter((p) => norm(p.name).includes(qn))
      .sort((a, b) => {
        const an = norm(a.name), bn = norm(b.name);
        const aStarts = an.startsWith(qn) ? 0 : 1;
        const bStarts = bn.startsWith(qn) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return (b.price || 0) - (a.price || 0);
      })
      .slice(0, 8);
  }, [prices, value, excluded]);

  const choose = (p: PriceEstimate) => {
    onChange(p.name);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className={`relative min-w-0 ${className || ""}`}>
      <Input
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (open && suggestions.length) {
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % suggestions.length); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length); return; }
            if (e.key === "Enter" && suggestions[highlight]) { e.preventDefault(); choose(suggestions[highlight]); return; }
            if (e.key === "Escape") { setOpen(false); return; }
          }
        }}
        className="font-medium"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((p, i) => {
            const pos = (p as PriceEstimate & { position?: Position }).position;
            const cls = pos && pos in POS_COLORS ? POS_COLORS[pos as Position] : "";
            return (
              <button
                key={p.name + i}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); choose(p); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40 ${i === highlight ? "bg-accent/30" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{p.name}</span>
                  {pos && (
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{pos}</span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-foreground">${p.price}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
