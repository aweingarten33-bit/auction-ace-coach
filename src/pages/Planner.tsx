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
import PricedPlayerAutocomplete from "@/components/PricedPlayerAutocomplete";
import { STRATEGIES, getStrategy } from "@/lib/strategies";

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

function suggestedAllocations(slots: Slot[], budget: number, strategyWeights?: Partial<Record<Slot["pos"], number[]>>): Record<string, number> {
  // Baseline weights (no-strategy default) — SUPERFLEX league:
  // QBs are heavily upweighted because nearly every team starts 2 of them,
  // and the SUPERFLEX slot itself is treated as a 2nd-QB-quality spot.
  const base: Record<Slot["pos"], number[]> = {
    QB: [10, 7, 1],          // QB1 elite, QB2 still very valuable
    RB: [7, 4.5, 2.5, 1.5, 1],
    WR: [6.5, 4.5, 3, 1.5, 1],
    TE: [2.5, 1],
    FLEX: [2.5],
    SUPERFLEX: [7, 1],       // superflex slot ≈ a 2nd starting QB
    K: [0.05],
    DST: [0.05],
    BENCH: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  };
  // Apply per-position multipliers from the chosen strategy (if any)
  const weights: Record<Slot["pos"], number[]> = { ...base };
  if (strategyWeights) {
    for (const k of Object.keys(strategyWeights) as (keyof typeof base)[]) {
      const mult = strategyWeights[k] ?? [];
      weights[k] = base[k].map((w, i) => w * (mult[i] ?? mult[mult.length - 1] ?? 1));
    }
  }
  const counters: Record<string, number> = {};
  const raw: number[] = slots.map((s) => {
    const idx = counters[s.pos] ?? 0;
    counters[s.pos] = idx + 1;
    const w = weights[s.pos]?.[idx] ?? weights[s.pos]?.[weights[s.pos].length - 1] ?? 0.1;
    return w;
  });
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
    strategyId, setStrategyId,
  } = useDraftStore();
  const strategy = getStrategy(strategyId);

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
      setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights));
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
              Setup · Allocate · Check · Find
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
        {/* ---------- Step 1: Setup ---------- */}
        <SetupChecklist />

        {/* ---------- Strategy picker ---------- */}
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">★</span>
            <h2 className="text-sm font-semibold">Draft strategy</h2>
            {strategyId !== "none" && (
              <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                {strategy.label}
              </span>
            )}
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Pick a build to lock in. The $ allocations and Coach AI will follow it. Pick <strong>No strategy</strong> if you want to stay flexible.
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {STRATEGIES.map((s) => {
              const active = s.id === strategyId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStrategyId(s.id);
                    setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, s.weights));
                  }}
                  className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                    active
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-border bg-card/40 hover:bg-card/70"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {s.label}
                    {active && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight">{s.short}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] italic text-muted-foreground/80">
            {strategy.description}
          </p>
        </Card>


        {/* ---------- Step 2: Slot allocation ---------- */}

        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">2</span>
              <Calculator className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">$ per roster slot</h2>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                onClick={() => setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights))}
                title="Auto-suggest from chosen strategy"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Suggest
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearSlotAllocations()} title="Clear">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mb-3 text-[11px] text-muted-foreground">
            Edit any slot. Auto-suggest splits your <span className="font-mono">${settings.totalBudget}</span> using your{" "}
            <span className="font-semibold text-foreground">{strategy.label}</span> shape.
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
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">3</span>
            <Check className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Can I afford X + Y + Z?</h2>
          </div>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Add up to 3 players you're thinking about (e.g. Josh Jacobs <span className="text-muted-foreground/60">+</span> Josh Allen <span className="text-muted-foreground/60">+</span> Justin Herbert). I'll add their prices, subtract from your bank, and tell you yes or no with the exact math.
          </p>
          <div className="space-y-2">
            <PricedPlayerAutocomplete value={checkA} onChange={setCheckA} prices={prices} excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]} placeholder="Player 1 (e.g. Josh Jacobs)" />
            <PricedPlayerAutocomplete value={checkB} onChange={setCheckB} prices={prices} excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]} placeholder="+ Player 2 (e.g. Josh Allen)" />
            <PricedPlayerAutocomplete value={checkC} onChange={setCheckC} prices={prices} excludeNames={[...events.map(e=>e.player), ...keepers.map(k=>k.player)]} placeholder="+ Player 3 (e.g. Justin Herbert)" />
          </div>
          {checkRows.length > 0 && (
            <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              {/* Per-player breakdown */}
              <div className="space-y-1">
                {checkResults.map((r) => (
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

              {/* Verdict pill */}
              <div className={`flex items-center gap-2 rounded-md border px-2.5 py-2 font-semibold ${canAfford ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-red-500/40 bg-red-500/10 text-red-400"}`}>
                {canAfford ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {canAfford
                  ? `Yes — you can afford this`
                  : slotsAfter < 0
                    ? `No — you only have ${budget.slotsLeft} roster spot${budget.slotsLeft === 1 ? "" : "s"} left`
                    : `No — leaves only $${remainingAfter} for ${slotsAfter} more slot${slotsAfter === 1 ? "" : "s"} ($1/slot minimum)`}
              </div>

              {/* Exact math */}
              <div className="rounded-md border border-border/60 bg-background/60 p-2 font-mono text-[11px] tabular-nums leading-relaxed">
                <div className="mb-1 font-sans text-[10px] uppercase tracking-wide text-muted-foreground">The math</div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bank now</span><span>${budget.remaining}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">− Cost of these {checkResults.filter(r=>r.info).length} player{checkResults.filter(r=>r.info).length===1?"":"s"}</span><span>−${checkSum}</span></div>
                <div className="my-1 border-t border-border/60" />
                <div className="flex justify-between"><span className="text-muted-foreground">= Bank after</span><span className="font-semibold text-foreground">${remainingAfter}</span></div>
                <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Slots open now</span><span>{budget.slotsLeft}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">− Slots used</span><span>−{checkResults.filter(r=>r.info).length}</span></div>
                <div className="my-1 border-t border-border/60" />
                <div className="flex justify-between"><span className="text-muted-foreground">= Slots left after</span><span className="font-semibold text-foreground">{slotsAfter}</span></div>
                <div className="mt-2 flex justify-between"><span className="text-muted-foreground">Min $ needed (1/slot)</span><span>${minNeededForRest}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cushion (Bank after − min)</span><span className={remainingAfter - minNeededForRest >= 0 ? "text-emerald-400" : "text-red-400"}>${remainingAfter - minNeededForRest}</span></div>
              </div>
            </div>
          )}
        </Card>

        {/* ---------- $ → players lookup ---------- */}
        <Card className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">4</span>
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

function SyncHistoryButton() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [needsEspn, setNeedsEspn] = useState(false);

  const run = async () => {
    setBusy(true);
    setSummary(null);
    setNeedsEspn(false);
    try {
      const [draftRes, ranksRes] = await Promise.all([
        supabase.functions.invoke("espn-historical-draft", { body: { seasonsBack: 3 } }),
        supabase.functions.invoke("espn-historical-ranks", { body: { seasonsBack: 3 } }),
      ]);
      const dErr = (draftRes.data as any)?.error || draftRes.error?.message;
      const rErr = (ranksRes.data as any)?.error || ranksRes.error?.message;
      const combined = `${dErr ?? ""} ${rErr ?? ""}`.toLowerCase();
      if (combined.includes("connect espn")) {
        setNeedsEspn(true);
        toast.error("Connect ESPN first to sync history.", {
          action: { label: "Open ESPN settings", onClick: () => navigate("/espn") },
        });
      } else if (dErr || rErr) {
        toast.error(`Sync issue: ${dErr || rErr}`);
      } else {
        const ds = (draftRes.data as any)?.summary ?? [];
        const rs = (ranksRes.data as any)?.summary ?? [];
        const okSeasons = ds.filter((s: any) => s.status === "ok").map((s: any) => s.season);
        const rankSeasons = rs.filter((s: any) => s.status === "ok").map((s: any) => s.season);
        toast.success(`Synced drafts: ${okSeasons.join(", ") || "none"} · ranks: ${rankSeasons.join(", ") || "none"}`);
        setSummary(`Drafts ${okSeasons.length}/${ds.length} · Ranks ${rankSeasons.length}/${rs.length}`);
      }
    } catch (e: any) {
      toast.error(`Sync failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  if (needsEspn) {
    return (
      <button
        onClick={() => navigate("/espn")}
        className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 hover:bg-amber-500/20"
      >
        Connect ESPN to sync history →
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <Button size="sm" variant="outline" onClick={run} disabled={busy} className="h-7 text-xs">
        <Download className="mr-1 h-3 w-3" />
        {busy ? "Syncing…" : "Sync 3yr history"}
      </Button>
      {summary && <span className="text-[10px] text-muted-foreground">{summary}</span>}
    </div>
  );
}


// ============================================================
// Step 1: Setup checklist — 1a Connect ESPN, 1b Sync history, 1c Upload cheat sheet
// ============================================================
function SetupChecklist() {
  const navigate = useNavigate();
  const { prices } = useDraftStore();
  const [espnConnected, setEspnConnected] = useState<boolean | null>(null);
  const [historySeasons, setHistorySeasons] = useState<number[]>([]);
  const [rankSeasons, setRankSeasons] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const [{ data: creds }, { data: hist }, { data: ranks }] = await Promise.all([
      supabase.from("espn_credentials").select("league_id, season_id").eq("user_id", u.user.id).maybeSingle(),
      supabase.from("league_auction_history").select("season").eq("user_id", u.user.id),
      supabase.from("espn_preseason_ranks").select("season"),
    ]);
    setEspnConnected(!!creds?.league_id);
    setHistorySeasons([...new Set((hist ?? []).map((r: any) => r.season))].sort((a, b) => b - a));
    setRankSeasons([...new Set((ranks ?? []).map((r: any) => r.season))].sort((a, b) => b - a));
  };

  useEffect(() => { refresh(); }, []);

  const runSync = async () => {
    setBusy(true);
    try {
      const [d, r] = await Promise.all([
        supabase.functions.invoke("espn-historical-draft", { body: { seasonsBack: 3 } }),
        supabase.functions.invoke("espn-historical-ranks", { body: { seasonsBack: 3 } }),
      ]);
      const err = (d.data as any)?.error || (r.data as any)?.error;
      if (err?.toLowerCase?.().includes("connect espn")) {
        toast.error("Connect ESPN first.");
      } else if (err) {
        toast.error(`Sync issue: ${err}`);
      } else {
        toast.success("History synced.");
        await refresh();
      }
    } finally { setBusy(false); }
  };

  const Step = ({ n, label, done, children }: { n: string; label: string; done: boolean; children: React.ReactNode }) => (
    <div className="flex items-start gap-2 rounded-md border bg-card/40 p-2">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
        {done ? "✓" : n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold">{label}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{children}</div>
      </div>
    </div>
  );

  const hasPrices = prices.length > 0;

  return (
    <Card className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary">1</span>
        <h2 className="text-sm font-semibold">Setup — load your data</h2>
      </div>
      <div className="space-y-2">
        <Step n="1a" label="Connect ESPN league" done={!!espnConnected}>
          {espnConnected ? (
            <span className="text-emerald-500">Connected.</span>
          ) : (
            <button onClick={() => navigate("/espn")} className="text-primary underline">
              Paste SWID + espn_s2 + league ID →
            </button>
          )}
        </Step>
        <Step n="1b" label="Sync last 3 yrs of auction history" done={historySeasons.length > 0 && rankSeasons.length > 0}>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={runSync} disabled={busy || !espnConnected} className="h-6 text-[11px]">
              <Download className="mr-1 h-3 w-3" />
              {busy ? "Syncing…" : historySeasons.length ? "Re-sync" : "Sync now"}
            </Button>
            <span className="text-[10px]">
              Drafts: {historySeasons.join(", ") || "—"} · Ranks: {rankSeasons.join(", ") || "—"}
            </span>
          </div>
        </Step>
        <Step n="1c" label="Upload this year's cheat sheet (tiers)" done={hasPrices}>
          {hasPrices
            ? <span className="text-emerald-500">{prices.length} players priced. Re-import in setup wizard.</span>
            : <button onClick={() => navigate("/?step=1&edit=1")} className="text-primary underline">Open setup wizard →</button>}
        </Step>
      </div>
    </Card>
  );
}
