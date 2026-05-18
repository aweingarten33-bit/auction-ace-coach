import { useMemo } from "react";
import { RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDraftStore } from "@/lib/draft-store";
import { getStrategy, STRATEGIES } from "@/lib/strategies";
import { spendByPosition } from "@/lib/draft-math";
import { cn } from "@/lib/utils";
import type { LeagueSettings, Position } from "@/lib/draft-types";

type SlotGroup = Position | "FLEX" | "SUPERFLEX" | "BENCH";

interface PlannerSlot {
  id: string;
  label: string;
  group: SlotGroup;
  index: number;
}

const GROUP_COLOR: Record<SlotGroup, string> = {
  QB:        "bg-red-500/20 text-red-300 border-red-500/30",
  RB:        "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  WR:        "bg-sky-500/20 text-sky-300 border-sky-500/30",
  TE:        "bg-orange-500/20 text-orange-300 border-orange-500/30",
  FLEX:      "bg-violet-500/20 text-violet-300 border-violet-500/30",
  SUPERFLEX: "bg-red-500/20 text-red-300 border-red-500/30",
  K:         "bg-violet-500/20 text-violet-300 border-violet-500/30",
  DST:       "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BENCH:     "bg-secondary text-muted-foreground border-border",
};

const GROUP_BAR: Record<SlotGroup, string> = {
  QB:        "bg-red-400",
  RB:        "bg-emerald-400",
  WR:        "bg-sky-400",
  TE:        "bg-orange-400",
  FLEX:      "bg-violet-400",
  SUPERFLEX: "bg-red-400",
  K:         "bg-violet-400",
  DST:       "bg-amber-400",
  BENCH:     "bg-secondary-foreground/30",
};

// ── DraftStrategyPanel (exported for external use) ────────────────────────
export function DraftStrategyPanel({ compact = false }: { compact?: boolean }) {
  const strategyId = useDraftStore((s) => s.strategyId);
  const customStrategyRules = useDraftStore((s) => s.customStrategyRules);
  const setStrategyId = useDraftStore((s) => s.setStrategyId);
  const setCustomStrategyRules = useDraftStore((s) => s.setCustomStrategyRules);
  const strategy = getStrategy(strategyId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {!compact && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Strategy
            </p>
          )}
          <Select value={strategy.id} onValueChange={setStrategyId}>
            <SelectTrigger className="h-9 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STRATEGIES.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-sm">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {!compact && (
        <p className="text-xs leading-relaxed text-muted-foreground">{strategy.description}</p>
      )}
      {strategy.id === "custom" && (
        <Textarea
          value={customStrategyRules}
          onChange={(e) => setCustomStrategyRules(e.target.value.slice(0, 700))}
          placeholder="Write the rules this planner should follow."
          className="min-h-20 text-xs"
        />
      )}
    </div>
  );
}

// ── Main budget planner ───────────────────────────────────────────────────
export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const setSlotAllocation = useDraftStore((s) => s.setSlotAllocation);
  const setSlotAllocations = useDraftStore((s) => s.setSlotAllocations);
  const clearSlotAllocations = useDraftStore((s) => s.clearSlotAllocations);
  const strategyId = useDraftStore((s) => s.strategyId);
  const strategy = getStrategy(strategyId);

  const slots = useMemo(() => buildSlots(settings), [settings]);
  const suggested = useMemo(() => suggestAllocations(settings, strategyId), [settings, strategyId]);
  const allocations = useMemo(() => {
    const next: Record<string, number> = {};
    for (const slot of slots) next[slot.id] = slotAllocations[slot.id] ?? suggested[slot.id] ?? 1;
    return next;
  }, [slotAllocations, slots, suggested]);

  const spent = useMemo(() => {
    const mine = events.filter((e) => e.drafter === "me");
    const byPos = spendByPosition(mine);
    for (const k of keepers) {
      const pos = k.position ?? "UNK";
      byPos[pos] = (byPos[pos] ?? 0) + k.cost;
    }
    return byPos;
  }, [events, keepers]);

  const plannedTotal = slots.reduce((sum, slot) => sum + (allocations[slot.id] ?? 0), 0);
  const delta = plannedTotal - settings.totalBudget;
  const maxAllocation = Math.max(1, ...slots.map((s) => allocations[s.id] ?? 0));

  // Group slots by position for spent tracking
  const spentByGroup = useMemo(() => {
    const out: Record<string, { spent: number; planned: number }> = {};
    for (const slot of slots) {
      const g = slot.group;
      if (!out[g]) out[g] = { spent: spent[g] ?? 0, planned: 0 };
      out[g].planned += allocations[slot.id] ?? 0;
    }
    return out;
  }, [slots, spent, allocations]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">

      {/* ── Strategy section ─────────────────────────── */}
      <div className="border-b border-border/50 px-4 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Draft strategy
        </p>
        <DraftStrategyPanel />
      </div>

      {/* ── Slot breakdown ────────────────────────────── */}
      <div className="px-4 py-4">
        {/* Column header row */}
        <div className="mb-2 flex items-center gap-2.5">
          <span className="w-12 shrink-0" />
          <span className="flex-1" />
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 rounded-lg px-2 text-[10px] text-muted-foreground"
              onClick={() => setSlotAllocations(suggested)}
            >
              <Sparkles className="h-3 w-3" />
              Suggest
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 rounded-lg px-2 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => {
                const zeroed: Record<string, number> = {};
                for (const slot of slots) zeroed[slot.id] = 0;
                setSlotAllocations(zeroed);
              }}
            >
              <Trash2 className="h-3 w-3" />
              Clear
            </Button>
            <span className="w-16 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              $ / slot
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {slots.map((slot) => {
            const value = allocations[slot.id] ?? 0;
            const barPct = maxAllocation > 0 ? (value / maxAllocation) * 100 : 0;
            const groupData = spentByGroup[slot.group];
            const isFirstInGroup = slot.index === 1;
            const groupSpent = groupData?.spent ?? 0;

            return (
              <div key={slot.id} className="flex items-center gap-2.5">
                {/* Position badge */}
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[10px] font-bold",
                    GROUP_COLOR[slot.group],
                  )}
                >
                  {slot.label}
                </span>

                {/* Visual bar */}
                <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-secondary/40">
                  <div
                    className={cn("h-full rounded-md transition-all", GROUP_BAR[slot.group])}
                    style={{ width: `${barPct}%`, opacity: 0.7 }}
                  />
                  {isFirstInGroup && groupSpent > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full rounded-md bg-white/20"
                      style={{ width: `${Math.min(100, (groupSpent / Math.max(1, groupData?.planned ?? 1)) * 100)}%` }}
                    />
                  )}
                </div>

                {/* Dollar input — editing one slot auto-redistributes the rest */}
                <Input
                  inputMode="numeric"
                  value={String(value)}
                  onChange={(e) => {
                    const newVal = Math.max(0, Math.min(settings.totalBudget, Number(e.target.value.replace(/[^0-9]/g, "")) || 0));
                    const otherSlots = slots.filter((s) => s.id !== slot.id);
                    const otherTotal = otherSlots.reduce((sum, s) => sum + (allocations[s.id] ?? 0), 0);
                    const remaining = Math.max(0, settings.totalBudget - newVal);
                    const next: Record<string, number> = { [slot.id]: newVal };
                    if (otherTotal === 0) {
                      const each = Math.floor(remaining / (otherSlots.length || 1));
                      otherSlots.forEach((s) => { next[s.id] = each; });
                    } else {
                      let distributed = 0;
                      otherSlots.forEach((s, i) => {
                        if (i === otherSlots.length - 1) {
                          next[s.id] = Math.max(0, remaining - distributed);
                        } else {
                          const share = Math.round(((allocations[s.id] ?? 0) / otherTotal) * remaining);
                          next[s.id] = Math.max(0, share);
                          distributed += next[s.id];
                        }
                      });
                    }
                    setSlotAllocations(next);
                  }}
                  className="h-8 w-16 shrink-0 rounded-lg px-2 text-right font-mono text-sm"
                  aria-label={`${slot.label} allocation`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer totals ─────────────────────────────── */}
      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Planned</span>
            <span className="font-mono font-semibold">${plannedTotal}</span>
          </div>
          <div className={cn(
            "rounded-full border px-3 py-0.5 text-xs font-semibold",
            delta === 0
              ? "border-success/40 bg-success/10 text-success"
              : delta > 0
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-warning/40 bg-warning/10 text-warning",
          )}>
            {delta === 0
              ? "✓ Balanced"
              : delta > 0
                ? `$${delta} over budget`
                : `$${Math.abs(delta)} unspent`}
          </div>
        </div>
      </div>
    </div>
  );
}


function buildSlots(settings: LeagueSettings): PlannerSlot[] {
  const slots: PlannerSlot[] = [];
  const add = (group: SlotGroup, count: number, labelFor: (i: number) => string) => {
    for (let i = 1; i <= count; i += 1) {
      slots.push({ id: `${group}-${i}`, label: labelFor(i), group, index: i });
    }
  };

  add("QB",        settings.roster.QB,        (i) => settings.roster.QB === 1 ? "QB" : `QB${i}`);
  add("RB",        settings.roster.RB,        (i) => `RB${i}`);
  add("WR",        settings.roster.WR,        (i) => `WR${i}`);
  add("TE",        settings.roster.TE,        (i) => settings.roster.TE === 1 ? "TE" : `TE${i}`);
  add("FLEX",      settings.roster.FLEX,      (i) => settings.roster.FLEX === 1 ? "FLEX" : `FLEX${i}`);
  add("SUPERFLEX", settings.roster.SUPERFLEX, (i) => settings.roster.SUPERFLEX === 1 ? "SF" : `SF${i}`);
  add("K",         settings.roster.K,         (i) => settings.roster.K === 1 ? "K" : `K${i}`);
  add("DST",       settings.roster.DST,       (i) => settings.roster.DST === 1 ? "DST" : `DST${i}`);
  add("BENCH",     settings.roster.BENCH,     (i) => `BE${i}`);

  return slots;
}

function suggestAllocations(settings: LeagueSettings, strategyId: string): Record<string, number> {
  const strategy = getStrategy(strategyId);
  const slots = buildSlots(settings);
  if (!slots.length) return {};

  const weights = slots.map((slot) => {
    const base = baseSlotWeight(slot, settings);
    const mult = strategy.weights[slot.group]?.[slot.index - 1] ?? 1;
    return Math.max(0.05, base * mult);
  });

  const floor = settings.totalBudget >= slots.length ? 1 : 0;
  const spendable = Math.max(0, settings.totalBudget - floor * slots.length);
  const weightTotal = weights.reduce((sum, w) => sum + w, 0) || 1;
  const exact = weights.map((w) => floor + (spendable * w) / weightTotal);
  const rounded = exact.map((v) => Math.max(floor, Math.round(v)));

  let diff = settings.totalBudget - rounded.reduce((sum, v) => sum + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v), weight: weights[i] }))
    .sort((a, b) => diff > 0 ? b.frac - a.frac : b.weight - a.weight);

  let guard = 0;
  while (diff !== 0 && guard < 1000) {
    for (const { i } of order) {
      if (diff === 0) break;
      if (diff > 0) { rounded[i] += 1; diff -= 1; }
      else if (rounded[i] > floor) { rounded[i] -= 1; diff += 1; }
    }
    guard += 1;
  }

  return Object.fromEntries(slots.map((slot, i) => [slot.id, rounded[i]]));
}

function baseSlotWeight(slot: PlannerSlot, settings: LeagueSettings): number {
  const superflex = settings.leagueType === "Superflex" || settings.leagueType === "2QB";
  const curves: Partial<Record<SlotGroup, number[]>> = {
    QB:        superflex ? [32, 22, 8] : [15, 5],
    SUPERFLEX: [22, 10],
    RB:        [22, 16, 9, 5, 3],
    WR:        [21, 16, 10, 6, 4],
    TE:        [9, 4],
    FLEX:      [9, 6],
    BENCH:     [2.2, 2, 1.8, 1.5, 1.2, 1, 1, 1],
    K:         [0.5],
    DST:       [0.5],
  };
  const curve = curves[slot.group] ?? [1];
  return curve[Math.min(slot.index - 1, curve.length - 1)] ?? 1;
}
