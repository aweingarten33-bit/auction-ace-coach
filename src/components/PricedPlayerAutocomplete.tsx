import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { PriceEstimate, Position } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";
import { loadSleeperPlayers, searchPlayers, SleeperPlayer } from "@/lib/sleeper";
import { useAnchorMap } from "@/lib/use-anchor-map";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Props {
  value: string;
  onChange: (val: string) => void;
  prices: PriceEstimate[];
  excludeNames?: string[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

interface Suggestion {
  name: string;
  position?: string;
  team?: string;
  price?: number;
  key: string;
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
  const [sleeperPlayers, setSleeperPlayers] = useState<SleeperPlayer[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { map: anchorMap } = useAnchorMap();

  useEffect(() => {
    loadSleeperPlayers().then(setSleeperPlayers).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const excluded = useMemo(() => new Set(excludeNames.map(norm)), [excludeNames]);

  // Override sheet prices with cascade anchors so all consumers see the same math.
  const effectivePrice = (name: string, sheetPrice?: number): number | undefined => {
    const anchor = anchorMap[norm(name)]?.price;
    if (anchor && anchor > 0) return anchor;
    return sheetPrice;
  };

  const priceMap = useMemo(() => {
    const m = new Map<string, PriceEstimate>();
    for (const p of prices) m.set(norm(p.name), { ...p, price: effectivePrice(p.name, p.price) ?? p.price });
    return m;
  }, [prices, anchorMap]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = value.trim();
    if (q.length < 1) return [];
    const qn = norm(q);

    const out: Suggestion[] = [];
    const seen = new Set<string>();

    // 1) Price sheet matches first (have $ values)
    const priceMatches = prices
      .filter((p) => !excluded.has(norm(p.name)) && norm(p.name).includes(qn))
      .sort((a, b) => {
        const aStarts = norm(a.name).startsWith(qn) ? 0 : 1;
        const bStarts = norm(b.name).startsWith(qn) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return (b.price || 0) - (a.price || 0);
      });
    for (const p of priceMatches) {
      const k = norm(p.name);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        name: p.name,
        position: (p as PriceEstimate & { position?: string }).position,
        price: p.price,
        key: k,
      });
      if (out.length >= 8) return out;
    }

    // 2) Sleeper fallback for everything else
    if (sleeperPlayers.length && q.length >= 2) {
      const sleeperHits = searchPlayers(sleeperPlayers, q, 8);
      for (const sp of sleeperHits) {
        const k = norm(sp.full_name);
        if (seen.has(k) || excluded.has(k)) continue;
        seen.add(k);
        const priced = priceMap.get(k);
        out.push({
          name: sp.full_name,
          position: sp.position || (priced as (PriceEstimate & { position?: string }) | undefined)?.position,
          team: sp.team,
          price: priced?.price,
          key: k + ":" + sp.player_id,
        });
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [prices, value, excluded, sleeperPlayers, priceMap]);

  const choose = (s: Suggestion) => {
    onChange(s.name);
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
          {suggestions.map((s, i) => {
            const cls = s.position && s.position in POS_COLORS ? POS_COLORS[s.position as Position] : "";
            return (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); choose(s); }}
                onMouseEnter={() => setHighlight(i)}
                className={`flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/40 ${i === highlight ? "bg-accent/30" : ""}`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm font-medium">{s.name}</span>
                  {s.position && (
                    <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold ${cls}`}>{s.position}</span>
                  )}
                  {s.team && <span className="shrink-0 text-[11px] text-muted-foreground">{s.team}</span>}
                </span>
                <span className={`shrink-0 font-mono text-xs tabular-nums ${s.price != null ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {s.price != null ? `$${s.price}` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
