// Budget Planner — modeled on the user's real ChatGPT draft conversation.
// Three things in one place:
//   1) $ allocation per roster slot (QB1 $65, QB2 $26, RB1 $45, …) that must sum to budget
//   2) "Can I afford X + Y?" affordability checker against the current plan
//   3) "What can I get for $X at POS?" lookup against the price sheet
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Check, ChevronDown, Download, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
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
import { useLeagueBenchPrices } from "@/lib/league-bench-prices";

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

// Bench prices come from real league history (Backup QB, Handcuff RB, Depth WR,
// Backup TE, Dart). Order matters — first bench slot gets the most expensive role.
interface BenchPriceLite { role: string; median: number }

function suggestedAllocations(
  slots: Slot[],
  budget: number,
  strategyWeights?: Partial<Record<Slot["pos"], number[]>>,
  benchPrices?: BenchPriceLite[],
): Record<string, number> {
  // Baseline weights for STARTING slots (no-strategy default) — SUPERFLEX league.
  // Bench is no longer in the weight table — it's set from real league history below.
  const base: Record<Exclude<Slot["pos"], "BENCH">, number[]> = {
    QB: [10, 7, 1],
    RB: [7, 4.5, 2.5, 1.5, 1],
    WR: [6.5, 4.5, 3, 1.5, 1],
    TE: [2.5, 1],
    FLEX: [2.5],
    SUPERFLEX: [7, 1],
    K: [0.05],
    DST: [0.05],
  };
  const weights = { ...base } as Record<Exclude<Slot["pos"], "BENCH">, number[]>;
  if (strategyWeights) {
    for (const k of Object.keys(base) as (keyof typeof base)[]) {
      const mult = strategyWeights[k] ?? [];
      weights[k] = base[k].map((w, i) => w * (mult[i] ?? mult[mult.length - 1] ?? 1));
    }
  }

  // 1) Bench: assign from league history medians (most-expensive role first).
  const benchSlots = slots.filter((s) => s.pos === "BENCH");
  const starterSlots = slots.filter((s) => s.pos !== "BENCH");
  const out: Record<string, number> = {};

  // Build the bench ladder: highest median first, then $1 fillers for the rest.
  // Order: Backup QB → Handcuff RB → Depth WR → Backup TE → Dart → $1.
  const ROLE_ORDER = ["BACKUP_QB", "HANDCUFF_RB", "DEPTH_WR", "DEPTH_TE", "DART"];
  const ladder: number[] = [];
  if (benchPrices && benchPrices.length) {
    const byRole = new Map(benchPrices.map((b) => [b.role, b.median]));
    for (const r of ROLE_ORDER) {
      const v = byRole.get(r);
      if (typeof v === "number") ladder.push(Math.max(1, v));
    }
  }
  benchSlots.forEach((s, i) => {
    out[s.id] = ladder[i] ?? 1;
  });
  const benchTotal = benchSlots.reduce((a, s) => a + (out[s.id] ?? 0), 0);

  // 2) Starters: distribute remaining $ by weights with $1 floor each.
  const remainingForStarters = Math.max(starterSlots.length, budget - benchTotal);
  const counters: Record<string, number> = {};
  const raw: number[] = starterSlots.map((s) => {
    const idx = counters[s.pos] ?? 0;
    counters[s.pos] = idx + 1;
    const ws = (weights as Record<string, number[]>)[s.pos] ?? [0.1];
    return ws[idx] ?? ws[ws.length - 1] ?? 0.1;
  });
  const floor = starterSlots.length;
  const pool = Math.max(0, remainingForStarters - floor);
  const sumW = raw.reduce((a, b) => a + b, 0) || 1;
  let allocated = 0;
  starterSlots.forEach((s, i) => {
    const v = Math.max(1, Math.round(1 + (raw[i] / sumW) * pool));
    out[s.id] = v;
    allocated += v;
  });

  // 3) Reconcile rounding diff against the largest starter slot.
  const grandTotal = allocated + benchTotal;
  const diff = budget - grandTotal;
  if (diff !== 0 && starterSlots.length > 0) {
    const biggestId = [...starterSlots].sort((a, b) => out[b.id] - out[a.id])[0].id;
    out[biggestId] = Math.max(1, out[biggestId] + diff);
  }
  return out;
}

export default function Planner() {
  const navigate = useNavigate();
  const setupComplete = useDraftStore((s) => s.setupComplete);
  useEffect(() => { if (!setupComplete) navigate("/"); }, [setupComplete, navigate]);
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
      <PlannerBody />
    </div>
  );
}

export function PlannerBody() {
  const {
    settings, keepers, events, prices,
    slotAllocations, setSlotAllocation, setSlotAllocations, clearSlotAllocations,
    strategyId, setStrategyId, setSettings,
  } = useDraftStore();
  const strategy = getStrategy(strategyId);
  const [refreshing, setRefreshing] = useState(false);

  const refreshFromEspn = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("espn-sync", {});
      if (error || data?.error) {
        toast.error(data?.error ?? error?.message ?? "ESPN refresh failed");
        return;
      }
      const lg = data.league;
      const newBudget = lg?.budget;
      if (typeof newBudget === "number" && newBudget > 0 && newBudget !== settings.totalBudget) {
        setSettings({ totalBudget: newBudget });
        toast.success(`League refreshed — auction budget is $${newBudget}`);
      } else {
        toast.success(`League refreshed — auction budget is $${newBudget ?? settings.totalBudget}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const slots = useMemo(() => buildSlots(settings.roster), [settings.roster]);
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  // Real league-history-derived bench prices (Backup QB, Handcuff RB, …).
  const { prices: benchPrices } = useLeagueBenchPrices(
    settings.numTeams,
    settings.leagueType !== "Standard" && settings.roster.SUPERFLEX > 0,
  );

  useEffect(() => {
    const known = new Set(Object.keys(slotAllocations));
    const slotIds = new Set(slots.map((s) => s.id));
    const sameSet = known.size === slotIds.size && [...slotIds].every((id) => known.has(id));
    if (!sameSet && benchPrices.length > 0) {
      setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights, benchPrices));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.length, settings.totalBudget, benchPrices.length]);

  const totalAllocated = useMemo(
    () => slots.reduce((s, sl) => s + (slotAllocations[sl.id] ?? 0), 0),
    [slots, slotAllocations]
  );
  const diff = settings.totalBudget - totalAllocated;

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
  const minNeededForRest = Math.max(0, slotsAfter);
  const canAfford = checkSum > 0 && remainingAfter >= minNeededForRest && slotsAfter >= 0;

  // (lookup-by-$ removed — Player Search panel now covers it with live filters)

  const posBadge = (pos?: Position | "FLEX" | "SUPERFLEX" | "BENCH") => {
    const cls = pos && pos in POS_COLORS ? POS_COLORS[pos as Position] : POS_COLORS.UNK;
    return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${cls}`}>{pos}</span>;
  };

  return (
    <>

      {/* Refresh league moved to the hamburger menu (Settings → Refresh league from ESPN). */}

      <main className="mx-auto max-w-3xl space-y-4 p-3">
        {/* ---------- Strategy picker ---------- */}
        <StrategyPickerCard
          strategyId={strategyId}
          strategy={strategy}
          onPick={(id, weights) => {
            setStrategyId(id);
            setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, weights, benchPrices));
          }}
        />


        {/* ---------- Step 2: Slot allocation ---------- */}

        <div className="rounded-2xl bg-[#141414] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
                <Calculator className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Step 2</div>
                <h2 className="truncate text-[15px] font-semibold text-foreground">$ per roster slot</h2>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost" size="sm"
                onClick={() => setSlotAllocations(suggestedAllocations(slots, settings.totalBudget, strategy.weights, benchPrices))}
                title="Auto-suggest from chosen strategy"
                className="h-8 px-2 text-foreground hover:bg-white/10"
              >
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Suggest
              </Button>
              <Button variant="ghost" size="sm" onClick={() => clearSlotAllocations()} title="Clear" className="h-8 w-8 p-0 text-foreground hover:bg-white/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="mb-3 text-[12px] leading-snug text-muted-foreground">
            Edit any slot. Auto-suggest splits your{" "}
            <span className="font-semibold text-foreground">${settings.totalBudget}</span>{" "}
            using your <span className="font-semibold text-foreground">{strategy.label}</span> shape.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-2.5 py-2">
                <div className="w-12 shrink-0 text-[12px] font-medium text-foreground">{s.label}</div>
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number" inputMode="numeric" min={1}
                  value={slotAllocations[s.id] ?? ""}
                  onChange={(e) => setSlotAllocation(s.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-7 w-full border-0 bg-transparent px-1 text-sm font-semibold tabular-nums text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Affordability checker moved to the menu (Can I afford X+Y+Z?) */}

        {/* "$X → players" lookup removed — Player Search on the home tab covers this with live filters. */}
      </main>
    </>
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
        toast.error("Connect ESPN first to sync history.");
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
      <span className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600">
        Connect ESPN on the sign-in page to sync history
      </span>
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
// Strategy picker — collapsible
// ============================================================
function StrategyPickerCard({
  strategyId,
  strategy,
  onPick,
}: {
  strategyId: string;
  strategy: ReturnType<typeof getStrategy>;
  onPick: (id: string, weights: ReturnType<typeof getStrategy>["weights"]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl bg-[#141414] p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
          <span className="text-base font-semibold text-foreground">★</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Draft strategy</div>
          <div className="text-[15px] font-semibold text-foreground truncate">{strategy.label}</div>
        </div>
        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-4">
          <p className="mb-3 text-[12px] text-muted-foreground leading-snug">
            Pick a build to lock in. The $ allocations and Coach AI will follow it. Pick <strong className="text-foreground">No strategy</strong> if you want to stay flexible.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STRATEGIES.map((s) => {
              const active = s.id === strategyId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onPick(s.id, s.weights)}
                  className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "bg-white/10 ring-1 ring-white/20"
                      : "bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    {s.label}
                    {active && <Check className="h-3.5 w-3.5 text-foreground/80" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-tight">{s.short}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] italic text-muted-foreground/80">{strategy.description}</p>
        </div>
      )}
    </div>
  );
}


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
            <span className="text-muted-foreground">Use "Connect ESPN" on the sign-in page.</span>
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
