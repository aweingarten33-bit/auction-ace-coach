// Slim "Can I afford X+Y+Z?" — just the checker, no strategy/slot tables.
import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget } from "@/lib/draft-math";
import { POS_COLORS } from "@/lib/positions";
import type { Position, PriceEstimate } from "@/lib/draft-types";
import PricedPlayerAutocomplete from "@/components/PricedPlayerAutocomplete";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function AffordabilityChecker() {
  const { settings, keepers, events, prices } = useDraftStore();
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [c, setC] = useState("");
  const rows = [a, b, c].filter((s) => s.trim().length > 0);

  const priceFor = (name: string) => {
    const k = norm(name);
    const hit = prices.find((p) => norm(p.name) === k);
    if (!hit) return null;
    return { price: hit.price, pos: (hit as PriceEstimate & { position?: Position }).position };
  };

  const results = rows.map((n) => ({ name: n.trim(), info: priceFor(n) }));
  const sum = results.reduce((s, r) => s + (r.info?.price ?? 0), 0);
  const remainingAfter = budget.remaining - sum;
  const slotsAfter = budget.slotsLeft - results.filter((r) => r.info).length;
  const minNeeded = Math.max(0, slotsAfter);
  const cushion = remainingAfter - minNeeded;
  const canAfford = sum > 0 && remainingAfter >= minNeeded && slotsAfter >= 0;

  const posBadge = (pos?: Position) => {
    const cls = pos && pos in POS_COLORS ? POS_COLORS[pos] : POS_COLORS.UNK;
    return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${cls}`}>{pos}</span>;
  };

  const exclude = [...events.map((e) => e.player), ...keepers.map((k) => k.player)];

  return (
    <Card className="p-3">
      <p className="mb-2 text-[11px] text-muted-foreground">
        Add up to 3 players. I'll add their prices, subtract from your bank, and tell you yes or no with the math.
      </p>
      <div className="space-y-2">
        <PricedPlayerAutocomplete value={a} onChange={setA} prices={prices} excludeNames={exclude} placeholder="Player 1" />
        <PricedPlayerAutocomplete value={b} onChange={setB} prices={prices} excludeNames={exclude} placeholder="+ Player 2" />
        <PricedPlayerAutocomplete value={c} onChange={setC} prices={prices} excludeNames={exclude} placeholder="+ Player 3" />
      </div>

      {rows.length > 0 && (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
          <div className="space-y-1">
            {results.map((r) => (
              <div key={r.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.name}</span>
                  {r.info?.pos && posBadge(r.info.pos)}
                </div>
                <span className={`font-mono tabular-nums ${r.info ? "" : "text-muted-foreground"}`}>
                  {r.info ? `$${r.info.price}` : "no price on sheet"}
                </span>
              </div>
            ))}
          </div>

          <div className={`flex items-center gap-2 rounded-md border px-2.5 py-2 font-semibold ${canAfford ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
            {canAfford ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {canAfford
              ? `Yes — you can afford this`
              : slotsAfter < 0
                ? `No — you only have ${budget.slotsLeft} roster spot${budget.slotsLeft === 1 ? "" : "s"} left`
                : `No — leaves only $${remainingAfter} for ${slotsAfter} more slot${slotsAfter === 1 ? "" : "s"} ($1/slot minimum)`}
          </div>

          <div className="rounded-md border border-border/60 bg-background/60 p-2 font-mono text-[11px] tabular-nums leading-relaxed">
            <div className="mb-1 font-sans text-[10px] uppercase tracking-wide text-muted-foreground">The math</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Money now</span><span>${budget.remaining}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">− These {results.filter(r=>r.info).length} player{results.filter(r=>r.info).length===1?"":"s"}</span><span>−${sum}</span></div>
            <div className="my-1 border-t border-border/60" />
            <div className="flex justify-between"><span className="text-muted-foreground">= Money after</span><span className="font-semibold text-foreground">${remainingAfter}</span></div>
            <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Slots left after</span><span>{slotsAfter}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Min to fill them ($1 each)</span><span>${minNeeded}</span></div>
            <div className="my-1 border-t border-border/60" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spare cash for studs</span>
              <span className={cushion >= 0 ? "text-emerald-400" : "text-red-400"}>${cushion}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
