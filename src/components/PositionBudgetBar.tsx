import { useEffect, useMemo, useRef } from "react";
import { CheckCircle2, RotateCcw, Undo2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import SlotTargetsInput from "@/components/SlotTargetsInput";
import { useDraftStore } from "@/lib/draft-store";
import { cn } from "@/lib/utils";
import { buildPlannerSlots, type PlannerSlot, type SlotGroup } from "@/lib/planner-slots";
import {
  computeSlotDollars,
  getStrategySummary,
  rebalanceProportional,
  maxBid,
  STRATEGY_LABELS,
  type StrategyId,
} from "@/lib/planner-strategies";

const GROUP_COLOR: Record<SlotGroup, string> = {
  QB:        "bg-red-500/20 text-white border-red-500/30",
  RB:        "bg-emerald-500/20 text-white border-emerald-500/30",
  WR:        "bg-sky-500/20 text-white border-sky-500/30",
  TE:        "bg-orange-500/20 text-white border-orange-500/30",
  FLEX:      "bg-violet-500/20 text-white border-violet-500/30",
  SUPERFLEX: "bg-red-500/20 text-white border-red-500/30",
  K:         "bg-violet-500/20 text-white border-violet-500/30",
  DST:       "bg-amber-500/20 text-white border-amber-500/30",
  BENCH:     "bg-secondary text-white border-border",
};

const STRATEGIES: StrategyId[] = [
  "double-elite-qb",
  "hero-qb",
  "elite-balanced-qb",
  "balanced-qbs",
  "value-qb",
  "bargain-qb",
  "punt-qb",
  "manual",
];

export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const prices = useDraftStore((s) => s.prices);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const setSlotAllocation = useDraftStore((s) => s.setSlotAllocation);
  const setSlotAllocations = useDraftStore((s) => s.setSlotAllocations);
  const lockedSlots = useDraftStore((s) => s.lockedSlots);
  const toggleSlotLock = useDraftStore((s) => s.toggleSlotLock);
  const slotNotes = useDraftStore((s) => s.slotNotes);
  const setSlotNote = useDraftStore((s) => s.setSlotNote);
  const touchedSlots = useDraftStore((s) => s.touchedSlots);
  const markSlotTouched = useDraftStore((s) => s.markSlotTouched);
  const clearTouchedSlots = useDraftStore((s) => s.clearTouchedSlots);
  const plannerStrategy = useDraftStore((s) => s.plannerStrategy) as StrategyId;
  const setPlannerStrategy = useDraftStore((s) => s.setPlannerStrategy) as unknown as (s: StrategyId) => void;

  const slots = useMemo(() => buildPlannerSlots(settings), [settings]);
  const summary = useMemo(() => getStrategySummary(plannerStrategy, prices), [plannerStrategy, prices]);

  // Preset modes are editable. A user-edited slot becomes a hard planning
  // constraint and the other OPEN slots are recalculated around that exact
  // number. Crucially, slotAllocations is not a dependency here: this effect
  // writes allocations, so depending on the value it writes causes the
  // controlled inputs to fight the user and can create update loops.
  useEffect(() => {
    if (plannerStrategy === "manual") return;
    const computed = computeSlotDollars(plannerStrategy, settings, {
      touchedSlots,
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    });
    const next: Record<string, number> = { ...slotAllocations };
    let changed = false;
    for (const [id, amount] of Object.entries(computed)) {
      if (lockedSlots[id]) continue;
      if (next[id] !== amount) {
        next[id] = amount;
        changed = true;
      }
    }
    if (changed) setSlotAllocations(next);
    // We intentionally do not depend on slotAllocations because this effect
    // writes it. User edits are driven by touchedSlots; drafted spend by locks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerStrategy, settings, touchedSlots, lockedSlots, prices]);

  // Manual mode: ordinary edits stay manual. A change to the drafted/locked
  // set is different — that is real spend, so remaining planned dollars scale
  // proportionally to the bank that actually remains.
  const lockKey = useMemo(
    () => Object.keys(lockedSlots).filter((id) => lockedSlots[id]).sort().join("|"),
    [lockedSlots],
  );
  const previousLockKey = useRef(lockKey);
  useEffect(() => {
    if (plannerStrategy !== "manual") {
      previousLockKey.current = lockKey;
      return;
    }
    if (previousLockKey.current === lockKey) return;
    previousLockKey.current = lockKey;

    const computed = rebalanceProportional("manual", settings, {
      touchedSlots,
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    });
    const next = { ...slotAllocations };
    let changed = false;
    for (const [id, amount] of Object.entries(computed)) {
      if (lockedSlots[id]) continue;
      if (next[id] !== amount) {
        next[id] = amount;
        changed = true;
      }
    }
    if (changed) setSlotAllocations(next);
    // Only real drafted-set changes trigger this in Manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockKey, plannerStrategy]);

  const valueFor = (slot: PlannerSlot) => slot.id in slotAllocations ? slotAllocations[slot.id] : 0;

  const slotsPlanned = slots.reduce((sum, s) => sum + valueFor(s), 0);
  const draftedSpend = slots
    .filter((s) => lockedSlots[s.id])
    .reduce((sum, s) => sum + valueFor(s), 0);
  const draftedCount = slots.filter((s) => lockedSlots[s.id]).length;
  const budgetLeft = Math.max(0, settings.totalBudget - draftedSpend);
  const openSlots = slots.filter((s) => !lockedSlots[s.id]).length;
  const remainingForBid = settings.totalBudget - draftedSpend;
  const bidCeiling = maxBid(remainingForBid, openSlots);

  const applyPreset = (strategy: StrategyId) => {
    setPlannerStrategy(strategy);
    if (strategy === "manual") return;

    // Strategy changes should be visible immediately, not one render/effect
    // later. setPlannerStrategy clears touched slots, so calculate this preset
    // with only actual drafted locks held fixed.
    const fresh = computeSlotDollars(strategy, settings, {
      touchedSlots: {},
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    });
    setSlotAllocations({ ...slotAllocations, ...fresh });
  };

  const handleAllocationChange = (slot: PlannerSlot, raw: string) => {
    const parsed = Number(raw.replace(/[^0-9]/g, ""));
    const amount = Number.isFinite(parsed) ? Math.max(0, Math.min(999, parsed)) : 0;

    if (plannerStrategy === "manual") {
      setSlotAllocation(slot.id, amount);
      markSlotTouched(slot.id);
      return;
    }

    // Build the next state first so the exact number typed is treated as a
    // hard constraint during this same interaction. This avoids the old race
    // where the preset immediately overwrote the controlled input.
    const nextTouched = { ...touchedSlots, [slot.id]: true };
    const nextCurrent = { ...slotAllocations, [slot.id]: amount };
    const rebalanced = computeSlotDollars(plannerStrategy, settings, {
      touchedSlots: nextTouched,
      lockedSlots,
      currentAllocations: nextCurrent,
      prices,
    });

    markSlotTouched(slot.id);
    setSlotAllocations({ ...nextCurrent, ...rebalanced, [slot.id]: amount });
  };

  const handleReset = () => {
    clearTouchedSlots();
    if (plannerStrategy === "manual") return;
    const fresh = computeSlotDollars(plannerStrategy, settings, {
      touchedSlots: {},
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    });
    setSlotAllocations({ ...slotAllocations, ...fresh });
  };

  const qbLeavesLow = summary.qbSpendHigh == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendHigh);
  const qbLeavesHigh = summary.qbSpendLow == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendLow);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border/50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Strategy</span>
          <button
            type="button"
            onClick={handleReset}
            disabled={plannerStrategy === "manual"}
            title={plannerStrategy === "manual" ? "Manual plans are not auto-reset" : "Reset to strategy values"}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-secondary hover:text-foreground disabled:opacity-30"
            aria-label="Reset budget plan"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STRATEGIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => applyPreset(s)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                plannerStrategy === s
                  ? "border-primary bg-primary !text-white"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {STRATEGY_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="mt-2 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-foreground">{summary.qbTargets}</span>
            {summary.qbSpendLow != null && summary.qbSpendHigh != null && (
              <span className="font-mono text-xs font-bold text-accent">
                QB spend ${summary.qbSpendLow}–${summary.qbSpendHigh}
              </span>
            )}
          </div>
          {qbLeavesLow != null && qbLeavesHigh != null && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              Leaves roughly ${qbLeavesLow}–${qbLeavesHigh} for everything else. {summary.description}
            </div>
          )}
          {plannerStrategy === "manual" && (
            <div className="mt-0.5 text-[10px] text-muted-foreground">{summary.description}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-border/50 bg-secondary/20 px-3 py-2 text-center">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Drafted</div>
          <div className="font-mono text-sm font-bold">{draftedCount}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Spent</div>
          <div className="font-mono text-sm font-bold">${draftedSpend}</div>
        </div>
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Budget left</div>
          <div className="font-mono text-sm font-bold text-accent">${budgetLeft}</div>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 text-[10px] leading-snug text-muted-foreground">
          Preset numbers are editable — change any open $ amount and the other open slots rebalance around it. Win a player in ESPN → put his name in the slot → replace the target $ with the actual price → tap <span className="font-semibold text-foreground">Drafted</span>. Actual spend freezes and the remaining plan recalibrates.
        </div>

        <div className="space-y-1.5">
          {slots.map((slot) => {
            const value = valueFor(slot);
            const isLocked = !!lockedSlots[slot.id];
            const note = slotNotes[slot.id] ?? "";
            const fixedDollar = slot.group === "K" || slot.group === "DST";

            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center font-bold",
                    slot.label === "Superflex" ? "text-[8px]" : "text-[10px]",
                    GROUP_COLOR[slot.group],
                    isLocked && "opacity-60",
                  )}
                >
                  {slot.label}
                </span>

                <SlotTargetsInput
                  value={note}
                  onChange={(val) => setSlotNote(slot.id, val)}
                  group={slot.group}
                  placeholder={isLocked ? "drafted player" : "targets…"}
                  ariaLabel={isLocked ? `${slot.label} drafted player` : `${slot.label} target players`}
                />

                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    value={String(value)}
                    disabled={isLocked || fixedDollar}
                    onChange={(e) => handleAllocationChange(slot, e.target.value)}
                    className={cn(
                      "h-8 w-14 rounded-lg px-2 text-right font-mono text-sm",
                      isLocked && "border-success/40 bg-success/5 text-success disabled:opacity-100",
                    )}
                    aria-label={isLocked ? `${slot.label} actual spend` : `${slot.label} planned allocation`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isLocked) setSlotAllocation(slot.id, fixedDollar ? 1 : value);
                    toggleSlotLock(slot.id);
                  }}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors",
                    isLocked
                      ? "bg-success/15 text-success hover:bg-success/25"
                      : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                  aria-label={isLocked ? `Undo drafted ${slot.label}` : `Mark ${slot.label} drafted at $${fixedDollar ? 1 : value}`}
                  title={isLocked ? "Undo drafted purchase" : "Freeze this actual purchase and recalculate remaining budget"}
                >
                  {isLocked ? <Undo2 className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  <span>{isLocked ? "Undo" : "Drafted"}</span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
          <span>Planned total: ${slotsPlanned}</span>
          <span>Max legal single bid now: ${bidCeiling}</span>
        </div>
      </div>
    </div>
  );
}