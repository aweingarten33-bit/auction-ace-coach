// Auction value calculator — Superflex only.
// Inputs: player (autocomplete from blended/loaded prices) + risk slider.
// Outputs: Fair / Target / Max bid.
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import { loadSleeperPlayers, searchPlayers, type SleeperPlayer } from "@/lib/sleeper";
import type { PriceEstimate, Position } from "@/lib/draft-types";
import { useDraftStore } from "@/lib/draft-store";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function AuctionCalculator({
  prices,
  onShowDetails,
}: {
  prices: PriceEstimate[];
  onShowDetails?: (name: string, position?: Position) => void;
}) {
  const { settings } = useDraftStore();
  const [name, setName] = useState("");
  const [position, setPosition] = useState<Position | undefined>(undefined);
  const [baseline, setBaseline] = useState<number>(0);
  const [risk, setRisk] = useState<number>(0);
  const [touched, setTouched] = useState(false); // user manually edited baseline
  const [players, setPlayers] = useState<SleeperPlayer[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadSleeperPlayers().then(setPlayers).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const priceByName = useMemo(() => {
    const m = new Map<string, PriceEstimate>();
    for (const p of prices) m.set(norm(p.name), p);
    return m;
  }, [prices]);

  const suggestions = useMemo(() => {
    if (name.trim().length < 2) return [];
    return searchPlayers(players, name, 8);
  }, [players, name]);

  const choose = (p: SleeperPlayer) => {
    setName(p.full_name);
    setPosition((p.position as Position) || undefined);
    const hit = priceByName.get(norm(p.full_name));
    if (hit && !touched) setBaseline(hit.price);
    else if (!touched) setBaseline(0);
    setOpen(false);
  };

  // Bid range math:
  //   target = baseline * (0.92 - risk * 0.02)   // bargain hunter goes lower
  //   max    = baseline * (1.12 + risk * 0.03)   // pay-up gets higher ceiling
  // risk ∈ [-3..+3]
  const fair = Math.max(0, Math.round(baseline));
  const target = baseline > 0 ? Math.max(1, Math.round(baseline * (0.92 - risk * 0.02))) : 0;
  const max = baseline > 0 ? Math.max(fair, Math.round(baseline * (1.12 + risk * 0.03))) : 0;

  const riskLabel =
    risk < 0 ? "Bargain hunter" : risk > 0 ? "Pay up for safety" : "Neutral";

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Pick a player — Fair, Target, and Max bids update from the blended Superflex values
        ({settings.numTeams}-team · ${settings.totalBudget}).
      </p>

      {/* Player autocomplete */}
      <div ref={wrapRef} className="relative">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Player
        </label>
        <Input
          ref={inputRef}
          value={name}
          placeholder="Start typing a name…"
          onChange={(e) => { setName(e.target.value); setOpen(true); setHighlight(0); setTouched(false); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || !suggestions.length) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => (h + 1) % suggestions.length); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length); }
            else if (e.key === "Enter" && suggestions[highlight]) { e.preventDefault(); choose(suggestions[highlight]); }
            else if (e.key === "Escape") setOpen(false);
          }}
          className="h-10"
        />
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-lg">
            {suggestions.map((p, i) => {
              const hit = priceByName.get(norm(p.full_name));
              return (
                <button
                  key={p.player_id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); choose(p); }}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent/40 ${i === highlight ? "bg-accent/30" : ""}`}
                >
                  <span className="min-w-0 truncate font-medium">{p.full_name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {p.team && <span>{p.team}</span>}
                    {p.position && (
                      <Badge variant="outline" className={`${POS_COLORS[p.position as keyof typeof POS_COLORS] || ""} px-1.5 py-0 text-[10px]`}>
                        {p.position}
                      </Badge>
                    )}
                    {hit && <span className="font-mono tabular-nums text-foreground">${hit.price}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Baseline */}
      <div>
        <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Baseline value</span>
          {position && (
            <Badge variant="outline" className={`${POS_COLORS[position] || ""} px-1.5 py-0 text-[10px]`}>
              {position}
            </Badge>
          )}
        </label>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-muted-foreground">$</span>
          <Input
            type="number"
            min={0}
            value={baseline || ""}
            onChange={(e) => { setBaseline(Number(e.target.value) || 0); setTouched(true); }}
            placeholder="0"
            className="h-10 font-mono tabular-nums"
          />
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Auto-filled from blended SF values. Edit to override.
        </p>
      </div>

      {/* Risk slider */}
      <div>
        <label className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Risk adjustment</span>
          <span className="text-muted-foreground/80 normal-case tracking-normal">{riskLabel}</span>
        </label>
        <input
          type="range"
          min={-3}
          max={3}
          step={1}
          value={risk}
          onChange={(e) => setRisk(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground">
          <span>−3 bargain</span><span>0</span><span>+3 pay up</span>
        </div>
      </div>

      {/* Output cards */}
      <div className="grid grid-cols-3 gap-2">
        <BidCard label="Fair" value={fair} tone="fair" sub="Market" />
        <BidCard label="Target" value={target} tone="target" sub="Bid first" />
        <BidCard label="Max" value={max} tone="max" sub="Walk-away" />
      </div>

      {baseline > 0 && (
        <div className="rounded-md border border-border/60 bg-secondary/20 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Suggested range
          </p>
          <p className="font-mono text-xl tabular-nums">${target} – ${max}</p>
        </div>
      )}
    </div>
  );
}

function BidCard({ label, value, tone, sub }: { label: string; value: number; tone: "fair" | "target" | "max"; sub: string }) {
  const ring = tone === "fair" ? "border-sky-500/40 bg-sky-500/5"
    : tone === "target" ? "border-emerald-500/40 bg-emerald-500/5"
    : "border-amber-500/40 bg-amber-500/5";
  const accent = tone === "fair" ? "text-sky-400"
    : tone === "target" ? "text-emerald-400"
    : "text-amber-400";
  return (
    <div className={`rounded-lg border p-3 ${ring}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider ${accent}`}>{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums">${value}</p>
      <p className="mt-0.5 text-[9px] text-muted-foreground">{sub}</p>
    </div>
  );
}
