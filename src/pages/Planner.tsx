// Budget Planner — modeled on the user's real ChatGPT draft conversation.
// Three things in one place:
//   1) $ allocation per roster slot (QB1 $65, QB2 $26, RB1 $45, …) that must sum to budget
//   2) "Can I afford X + Y?" affordability checker against the current plan
//   3) "What can I get for $X at POS?" lookup against the price sheet
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Check, Download, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useDraftStore } from "@/lib/draft-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { computeBudget } from "@/lib/draft-math";
import { Position, PriceEstimate } from "@/lib/draft-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { POS_COLORS } from "@/lib/positions";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Slot {
  id: string;       // stable per-slot id, e.g. "QB-1", "RB-2", "BENCH-9"
  label: string;    // "QB1", "RB2", "Bench 1"
  pos: Position | "FLEX" | "SUPERFLEX" | "BENCH";
}

type RosterShape = ReturnType<typeof useDraftStore.getState>["settings"]["roster"];

function buildSlots(roster: RosterShape): Slot[] {
  const order: { key: keyof RosterShape; pos: Slot["pos"]; pretty: string }[] = [
    { key: "QB", pos: "QB", pretty: "QB" },
    { key: "RB", pos: "RB", pretty: "RB" },
    { key: "WR", pos: "WR", pretty: "WR" },
    { key: "TE", pos: "TE", pretty: "TE" },
    { key: "FLEX", pos: "FLEX", pretty: "FLEX" },
    { key: "SUPERFLEX", pos: "SUPERFLEX", pretty: "SF" },
    { key: "K", pos: "K", pretty: "K" },
    { key: "DST", pos: "DST", pretty: "DST" },
    { key: "BENCH", pos: "BENCH", pretty: "Bench" },
  ];
  const slots: Slot[] = [];
  for (const row of order) {
    const n = roster[row.key];
    for (let i = 1; i <= n; i++) {
      slots.push({ id: `${String(row.key)}-${i}`, label: n > 1 ? `${row.pretty}${i}` : row.pretty, pos: row.pos });
    }
  }
  return slots;
}

// Sensible default $ for a slot given remaining budget and position
function defaultAlloc(slot: Slot, idx: number, total: number, budget: number): Record<string, number> {
  // Heuristic: front-load WR/RB/QB1, then taper. Bench/K/DST minimums.
  // This mirrors the user's "QB1 $65, QB2 $26, RB1 $45..." shape.
  return {}; // unused — calculator below produces values directly
}

function suggestedAllocations(slots: Slot[], budget: number): Record<string, number> {
  // Simple weighted suggestion. K/DST/Bench = $1, Bench last = $1.
  // Remaining split by position weights.
  const weights: Record<Slot["pos"], number[]> = {
    QB: [9, 3, 1],
    RB: [8, 5, 2.5, 1.5, 1],
    WR: [7, 5, 3, 1.5, 1],
    TE: [3, 1],
    FLEX: [2.5],
    SUPERFLEX: [4, 1],
    K: [0.05],
    DST: [0.05],
    BENCH: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  };
  const counters: Record<string, number> = {};
  const raw: number[] = slots.map((s) => {
    const idx = counters[s.pos] ?? 0;
    counters[s.pos] = idx + 1;
    const w = weights[s.pos]?.[idx] ?? weights[s.pos]?.[weights[s.pos].length - 1] ?? 0.1;
    return w;
  });
  // Reserve $1 floor per slot
  const floor = slots.length;
  if (budget <= floor) return Object.fromEntries(slots.map((s) => [s.id, 1]));
  const pool = budget - floor;
  const sumW = raw.reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  let allocated = 0;
  slots.forEach((s, i) => {
    const v = Math.max(1, Math.round(1 + (raw[i] / sumW) * pool));
    out[s.id] = v;
    allocated += v;
  });
  // Reconcile rounding to exact budget by adjusting the largest slot
  const diff = budget - allocated;
  if (diff !== 0) {
    const biggestId = [...slots].sort((a, b) => out[b.id] - out[a.id])[0].id;
    out[biggestId] = Math.max(1, out[biggestId] + diff);
  }
  return out;
}

export default function Planner() {
  const navigate = useNavigate();
  const {
    settings, keepers, events, prices, setupComplete,
    slotAllocations, setSlotAllocation, setSlotAllocations, clearSlotAllocations,
  } = useDraftStore();

  useEffect(() => {
    if (!setupComplete) navigate("/");
  }, [setupComplete, navigate]);

  const slots = useMemo(() => buildSlots(settings.roster), [settings.roster]);
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  // Initialize allocations the first time the page loads or roster changes shape
  useEffect(() => {
    const known = new Set(Object.keys(slotAllocations));
    const slotIds = new Set(slots.map((s) => s.id));
    const sameSet = known.size === slotIds.size && [...slotIds].every((id) => known.has(id));
    if (!sameSet) {
      setSlotAllocations(suggestedAllocations(slots, settings.totalBudget));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, settings.totalBudget]);

  const totalAllocated = useMemo(
    () => slots.reduce((s, sl) => s + (slotAllocations[sl.id] ?? 0), 0),
    [slots, slotAllocations]
  );
  const diff = settings.totalBudget - totalAllocated; // positive = under, negative = over

  // ---------- Affordability checker ----------
  const [checkA, setCheckA] = useState("");
  const [checkB, setCheckB] = useState("");
  const [checkC, setCheckC] = useState("");
  const checkRows = [checkA, checkB, checkC].filter((s) => s.trim().length > 0);

  const priceFor = (name: string): { price: number; pos?: Position } | null => {
    if (!name.trim()) return null;
    const k = norm(name);
    const hit = prices.find((p) => norm(p.name) === k);
    if (!hit) return null;
    return { price: hit.price, pos: (hit as PriceEstimate & { position?: Position }).position };
  };

  const checkResults = checkRows.map((n) => ({ name: n.trim(), info: priceFor(n) }));
  const checkSum = checkResults.reduce((s, r) => s + (r.info?.price ?? 0), 0);
  const remainingAfter = budget.remaining - checkSum;
  const slotsAfter = budget.slotsLeft - checkResults.filter((r) => r.info).length;
  const minNeededForRest = Math.max(0, slotsAfter); // $1/slot floor
  const canAfford = checkSum > 0 && remainingAfter >= minNeededForRest && slotsAfter >= 0;

  // ---------- "What can I get for $X at POS" ----------
  const [lookupBudget, setLookupBudget] = useState("");
  const [lookupPos, setLookupPos] = useState<"ANY" | Position>("ANY");
  const draftedKeys = useMemo(
    () => new Set([...events.map((e) => norm(e.player)), ...keepers.map((k) => norm(k.player))]),
    [events, keepers]
  );
  const lookupResults = useMemo(() => {
    const target = parseInt(lookupBudget, 10);
    if (!Number.isFinite(target) || target <= 0) return [];
    const tol = Math.max(2, Math.round(target * 0.15)); // ±15% tolerance
    return prices
      .filter((p) => !draftedKeys.has(norm(p.name)))
      .filter((p) => {
        const pos = (p as PriceEstimate & { position?: Position }).position;
        if (lookupPos !== "ANY" && pos && pos !== lookupPos) return false;
        if (lookupPos !== "ANY" && !pos) return false;
        return p.price >= target - tol && p.price <= target + tol;
      })
      .sort((a, b) => Math.abs(a.price - target) - Math.abs(b.price - target))
      .slice(0, 12);
  }, [prices, draftedKeys, lookupBudget, lookupPos]);

  const posBadge = (pos?: Position | "FLEX" | "SUPERFLEX" | "BENCH") => {
    const cls = pos && pos in POS_COLORS ? POS_COLORS[pos as Position] : POS_COLORS.UNK;
    return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${cls}`}>{pos}</span>;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/draft")} aria-label="Back to draft">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-base font-semibold leading-tight">Budget Planner</h1>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Allocate · Check affordability · Find players at a price
            </p>
          </div>
        </div>
        <Link to="/draft" className="text-xs font-medium text-primary hover:underline">Live draft →</Link>
      </header>

      {/* Summary bar */}
      <div className="mx-auto max-w-3xl px-3 pt-3">
        <Card className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
          <div><span className="text-muted-foreground">Bank</span> <span className="font-bold">${budget.remaining}</span></div>
          <span className="text-muted-foreground/50">·</span>
          <div><span className="text-muted-foreground">Max bid</span> <span className="font-bold">${budget.maxBid}</span></div>
          <span className="text-muted-foreground/50">·</span>
          <div><span className="font-bold">{budget.slotsLeft}</span> <span className="text-muted-foreground">slots left</span></div>
          <span className="text-muted-foreground/50">·</span>
          <div><span className="text-muted-foreground">Plan total</span>{" "}
            <span className={`font-bold ${diff === 0 ? "text-emerald-500" : diff < 0 ? "text-red-500" : "text-amber-500"}`}>
              ${totalAllocated} / ${settings.totalBudget}
            </span>
            {diff !== 0 && (
              <span className={`ml-1 text-[11px] ${diff < 0 ? "text-red-500" : "text-amber-500"}`}>
                ({diff > 0 ? `+${diff} unspent` : `${diff} over`})
              </span>
            )}
          </div>
        </Card>
      </div>

      <main className="mx-auto max-w-3xl space-y-4 p-3">
        {/* ---------- Slot allocation ---------- */}
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">$ per roster slot</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                onClick={() => setSlotAllocations(suggestedAllocations(slots, settings.totalBudget))}
                title="Auto-suggest"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Suggest
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearSlotAllocations()} title="Clear">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Edit any slot. Auto-suggest splits your <span className="font-mono">${settings.totalBudget}</span> by position weight.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-md border bg-card/50 px-2 py-1.5">
                <div className="w-14 shrink-0 text-xs font-medium">{s.label}</div>
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number" inputMode="numeric" min={1}
                  value={slotAllocations[s.id] ?? ""}
                  onChange={(e) => setSlotAllocation(s.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-7 w-full px-1.5 text-sm tabular-nums"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* ---------- Affordability checker ---------- */}
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Can I afford…?</h2>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Type 1–3 players you want. Prices come from your sheet.
          </p>
          <div className="space-y-2">
            <PlayerAutocomplete value={checkA} onChange={setCheckA} placeholder="Player 1 (e.g. Jalen Hurts)" />
            <PlayerAutocomplete value={checkB} onChange={setCheckB} placeholder="Player 2 (optional)" />
            <PlayerAutocomplete value={checkC} onChange={setCheckC} placeholder="Player 3 (optional)" />
          </div>
          {checkRows.length > 0 && (
            <div className="mt-3 space-y-1.5 rounded-md border bg-muted/30 p-2 text-sm">
              {checkResults.map((r) => (
                <div key={r.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.info?.pos && posBadge(r.info.pos)}
                  </div>
                  <span className={`font-mono tabular-nums ${r.info ? "" : "text-muted-foreground"}`}>
                    {r.info ? `$${r.info.price}` : "no price"}
                  </span>
                </div>
              ))}
              <div className="mt-2 border-t pt-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Cost</span><span className="font-mono">${checkSum}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank after</span><span className="font-mono">${remainingAfter}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Slots left after</span><span className="font-mono">{slotsAfter}</span></div>
                <div className={`mt-2 flex items-center gap-1.5 font-semibold ${canAfford ? "text-emerald-500" : "text-red-500"}`}>
                  {canAfford ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  {canAfford
                    ? `Yes — ${remainingAfter - minNeededForRest >= 0 ? `$${remainingAfter - minNeededForRest} cushion` : "tight"} for the remaining ${slotsAfter} slots`
                    : remainingAfter < minNeededForRest
                      ? `No — leaves only $${remainingAfter} for ${slotsAfter} slots ($1/slot minimum)`
                      : "No — too many slots"}
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ---------- $ → players lookup ---------- */}
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">What can I get for $X?</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input
              type="number" inputMode="numeric" min={1}
              value={lookupBudget} onChange={(e) => setLookupBudget(e.target.value)}
              placeholder="28"
              className="h-8 w-20"
            />
            <span className="text-sm text-muted-foreground">at</span>
            <div className="flex gap-1">
              {(["ANY", "QB", "RB", "WR", "TE"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLookupPos(p)}
                  className={`rounded px-2 py-0.5 text-xs font-medium border ${lookupPos === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted/30 border-border"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          {lookupResults.length > 0 ? (
            <ul className="mt-3 divide-y rounded-md border bg-muted/30">
              {lookupResults.map((p) => {
                const pos = (p as PriceEstimate & { position?: Position }).position;
                return (
                  <li key={p.name} className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {pos && posBadge(pos)}
                    </div>
                    <span className="font-mono tabular-nums">${p.price}</span>
                  </li>
                );
              })}
            </ul>
          ) : lookupBudget ? (
            <p className="mt-3 text-xs text-muted-foreground">No players within ±15% of ${lookupBudget}{lookupPos !== "ANY" ? ` at ${lookupPos}` : ""}.</p>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
