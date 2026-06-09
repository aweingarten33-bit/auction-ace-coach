import { useMemo } from "react";
import { Info, Lock, RotateCcw, Sparkles, Trash2 } from "lucide-react";
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

  // ── Base plan: user override per slot, else strategy suggestion ────────
  const basePlan = useMemo(() => {
    const next: Record<string, number> = {};
    for (const slot of slots) next[slot.id] = slotAllocations[slot.id] ?? suggested[slot.id] ?? 1;
    return next;
  }, [slotAllocations, slots, suggested]);

  // ── Picks I've made (events + keepers), grouped by position ────────────
  const picksByGroup = useMemo(() => {
    const out: Record<string, { price: number; name: string }[]> = {};
    const push = (pos: string | null | undefined, price: number, name: string) => {
      const g = (pos ?? "UNK") as string;
      (out[g] ??= []).push({ price, name });
    };
    for (const e of events) if (e.drafter === "me") push(e.position, e.price, e.player ?? "Pick");
    for (const k of keepers) push(k.position, k.cost, k.player ?? "Keeper");
    for (const g of Object.keys(out)) out[g].sort((a, b) => b.price - a.price);
    return out;
  }, [events, keepers]);

  // ── Lock filled slots at the actual price, redistribute leftover ───────
  const { allocations, locked } = useMemo(() => {
    const locked: Record<string, { price: number; name: string }> = {};
    // Assign each pick in a group to the highest-planned unfilled slot in that group.
    for (const group of Object.keys(picksByGroup)) {
      const groupSlots = slots
        .filter((s) => s.group === group)
        .sort((a, b) => (basePlan[b.id] ?? 0) - (basePlan[a.id] ?? 0));
      const picks = picksByGroup[group];
      for (let i = 0; i < Math.min(picks.length, groupSlots.length); i += 1) {
        locked[groupSlots[i].id] = picks[i];
      }
    }

    const lockedSum = Object.values(locked).reduce((s, p) => s + p.price, 0);
    const unfilled = slots.filter((s) => !(s.id in locked));
    const baseSum = unfilled.reduce((s, slot) => s + (basePlan[slot.id] ?? 0), 0) || 1;
    const remaining = Math.max(0, settings.totalBudget - lockedSum);

    // Proportional redistribute with $1 floor, then integer-correct so the
    // unfilled allocations sum to exactly `remaining`.
    const floor = remaining >= unfilled.length ? 1 : 0;
    const spendable = Math.max(0, remaining - floor * unfilled.length);
    const exact = unfilled.map((slot) => floor + (spendable * (basePlan[slot.id] ?? 0)) / baseSum);
    const rounded = exact.map((v) => Math.max(floor, Math.round(v)));
    let diff = remaining - rounded.reduce((sum, v) => sum + v, 0);
    const order = exact
      .map((v, i) => ({ i, frac: v - Math.floor(v) }))
      .sort((a, b) => diff > 0 ? b.frac - a.frac : a.frac - b.frac);
    let guard = 0;
    while (diff !== 0 && guard < 1000) {
      for (const { i } of order) {
        if (diff === 0) break;
        if (diff > 0) { rounded[i] += 1; diff -= 1; }
        else if (rounded[i] > floor) { rounded[i] -= 1; diff += 1; }
      }
      guard += 1;
    }

    const allocations: Record<string, number> = {};
    for (const slot of slots) {
      allocations[slot.id] = slot.id in locked ? locked[slot.id].price : 0;
    }
    unfilled.forEach((slot, i) => { allocations[slot.id] = rounded[i]; });
    return { allocations, locked };
  }, [slots, basePlan, picksByGroup, settings.totalBudget]);

  // Legacy display: total spent by position group (sum of locked slots)
  const spent = useMemo(() => {
    const byPos = spendByPosition(events.filter((e) => e.drafter === "me"));
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
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            $ per roster slot
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-lg px-2 text-xs text-muted-foreground"
              onClick={() => setSlotAllocations(suggested)}
            >
              <Sparkles className="h-3 w-3" />
              Suggest
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
              onClick={clearSlotAllocations}
              title="Clear edits"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/70" />
          When you edit a slot, the leftover or overage is proportionally redistributed across the remaining open slots.
        </p>
        <div className="space-y-2">
          {slots.map((slot) => {
            const value = allocations[slot.id] ?? 0;
            const barPct = maxAllocation > 0 ? (value / maxAllocation) * 100 : 0;
            const groupData = spentByGroup[slot.group];
            // Show spent on the first slot of each group only
            const isFirstInGroup = slot.index === 1;
            const groupSpent = groupData?.spent ?? 0;

            const lockInfo = locked[slot.id];
            const isLocked = !!lockInfo;

            return (
              <div key={slot.id} className="flex items-center gap-2.5">
                {/* Position badge */}
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[10px] font-bold",
                    GROUP_COLOR[slot.group],
                    isLocked && "opacity-60",
                  )}
                >
                  {slot.label}
                </span>

                {/* Visual bar */}
                <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-secondary/40">
                  <div
                    className={cn(
                      "h-full rounded-md transition-all",
                      GROUP_BAR[slot.group],
                      isLocked && "opacity-100",
                    )}
                    style={{ width: `${barPct}%`, opacity: isLocked ? 1 : 0.7 }}
                  />
                  {isLocked && (
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground/80 truncate">
                      {lockInfo.name}
                    </span>
                  )}
                  {!isLocked && isFirstInGroup && groupSpent > 0 && (
                    <div
                      className="absolute left-0 top-0 h-full rounded-md bg-white/20"
                      style={{ width: `${Math.min(100, (groupSpent / Math.max(1, groupData?.planned ?? 1)) * 100)}%` }}
                    />
                  )}
                </div>

                {/* Dollar input (or locked actual price) */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    value={String(value)}
                    disabled={isLocked}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                      setSlotAllocation(slot.id, Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 0);
                    }}
                    className={cn(
                      "h-8 w-16 rounded-lg px-2 text-right font-mono text-sm",
                      isLocked && "border-success/40 bg-success/5 text-success disabled:opacity-100",
                    )}
                    aria-label={`${slot.label} allocation`}
                    title={isLocked ? `Paid $${lockInfo.price} for ${lockInfo.name}` : undefined}
                  />
                </div>

                {isLocked ? (
                  <Lock className="h-3 w-3 shrink-0 text-success" />
                ) : isFirstInGroup && groupSpent > 0 ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    ${groupSpent} spent
                  </span>
                ) : (
                  <span className="w-3 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer totals ─────────────────────────────── */}
      <div className="border-t border-border/50 px-4 py-3">
        {(() => {
          const lockedSum = Object.values(locked).reduce((s, p) => s + p.price, 0);
          const remaining = settings.totalBudget - lockedSum;
          return (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Spent</span>
                <span className="font-mono font-semibold">${lockedSum}</span>
                <span className="text-muted-foreground">/ ${settings.totalBudget}</span>
              </div>
              <div className="rounded-full border border-primary/40 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                ${remaining} replanned across {slots.length - Object.keys(locked).length} slots
              </div>
            </div>
          );
        })()}
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
  {
    const isSF = settings.leagueType === "Superflex" || settings.leagueType === "2QB";
    add("SUPERFLEX", settings.roster.SUPERFLEX, (i) => {
      if (isSF) return settings.roster.SUPERFLEX === 1 ? `QB${settings.roster.QB + 1}` : `QB${settings.roster.QB + i}`;
      return settings.roster.SUPERFLEX === 1 ? "SF" : `SF${i}`;
    });
  }
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
  const qbCurve = superflex ? [32, 22, 8] : [15, 5];
  const curves: Partial<Record<SlotGroup, number[]>> = {
    QB:        qbCurve,
    // In superflex/2QB leagues, the SUPERFLEX slot is typically a 2nd QB,
    // so weight it like the next QB in the curve rather than as a generic flex.
    SUPERFLEX: superflex ? qbCurve.slice(settings.roster.QB) : [22, 10],
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
