import { useMemo } from "react";
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
  QB: "bg-red-500/20 text-white border-red-500/30",
  RB: "bg-emerald-500/20 text-white border-emerald-500/30",
  WR: "bg-sky-500/20 text-white border-sky-500/30",
  TE: "bg-orange-500/20 text-white border-orange-500/30",
  FLEX: "bg-violet-500/20 text-white border-violet-500/30",
  SUPERFLEX: "bg-red-500/20 text-white border-red-500/30",
  K: "bg-violet-500/20 text-white border-violet-500/30",
  DST: "bg-amber-500/20 text-white border-amber-500/30",
  BENCH: "bg-secondary text-white border-border",
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

  // Single source of truth:
  // - preset mode stores only user overrides + actual drafted spend
  // - all other displayed dollars are derived from strategy/market state
  // There is deliberately NO effect that writes calculated values back into
  // the same state controlled by these inputs.
  const displayedAllocations = useMemo(() => {
    if (plannerStrategy === "manual") return slotAllocations;
    return computeSlotDollars(plannerStrategy, settings, {
      touchedSlots,
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    });
  }, [lockedSlots, plannerStrategy, prices, settings, slotAllocations, touchedSlots]);

  const valueFor = (slot: PlannerSlot) => Math.max(0, Number(displayedAllocations[slot.id] ?? 0));
  const slotsPlanned = slots.reduce((sum, slot) => sum + valueFor(slot), 0);
  const draftedSpend = slots
    .filter((slot) => lockedSlots[slot.id])
    .reduce((sum, slot) => sum + Math.max(0, Number(slotAllocations[slot.id] ?? 0)), 0);
  const draftedCount = slots.filter((slot) => lockedSlots[slot.id]).length;
  const budgetLeft = Math.max(0, settings.totalBudget - draftedSpend);
  const openSlots = slots.filter((slot) => !lockedSlots[slot.id]).length;
  const bidCeiling = maxBid(budgetLeft, openSlots);

  const keepOnlyDraftedSpend = () => {
    const kept: Record<string, number> = {};
    for (const slot of slots) {
      if (lockedSlots[slot.id]) kept[slot.id] = Math.max(0, Number(slotAllocations[slot.id] ?? 0));
    }
    return kept;
  };

  const applyStrategy = (strategy: StrategyId) => {
    if (strategy === "manual") {
      // Manual starts from exactly what is currently visible, then the user owns it.
      setSlotAllocations({ ...displayedAllocations });
      setPlannerStrategy("manual");
      return;
    }

    // A new preset is a clean blueprint. Preserve only actual drafted purchases;
    // stale overrides from another strategy must not bleed into the new one.
    setSlotAllocations(keepOnlyDraftedSpend());
    setPlannerStrategy(strategy);
  };

  const handleAllocationChange = (slot: PlannerSlot, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    const amount = digits === "" ? 0 : Math.max(0, Math.min(999, Number(digits)));

    if (plannerStrategy === "manual") {
      setSlotAllocation(slot.id, amount);
      return;
    }

    // No background effect can overwrite this. The typed amount is stored as
    // an override and the rest of the displayed plan is derived around it.
    setSlotAllocation(slot.id, amount);
    markSlotTouched(slot.id);
  };

  const handleReset = () => {
    if (plannerStrategy === "manual") return;
    clearTouchedSlots();
    setSlotAllocations(keepOnlyDraftedSpend());
  };

  const handleDraftedToggle = (slot: PlannerSlot, fixedDollar: boolean) => {
    const isLocked = !!lockedSlots[slot.id];
    if (isLocked) {
      toggleSlotLock(slot.id);
      return;
    }

    const actual = fixedDollar ? 1 : valueFor(slot);

    if (plannerStrategy === "manual") {
      // Freeze the purchase and proportionally rescale the remaining manual plan.
      const nextCurrent = { ...slotAllocations, [slot.id]: actual };
      const nextLocks = { ...lockedSlots, [slot.id]: true };
      const rebalanced = rebalanceProportional("manual", settings, {
        touchedSlots,
        lockedSlots: nextLocks,
        currentAllocations: nextCurrent,
        prices,
      });
      setSlotAllocations({ ...nextCurrent, ...rebalanced, [slot.id]: actual });
      toggleSlotLock(slot.id);
      return;
    }

    // In preset mode only the real purchase is persisted. Locking it changes
    // every remaining displayed slot on the next render.
    setSlotAllocation(slot.id, actual);
    toggleSlotLock(slot.id);
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
          {STRATEGIES.map((strategy) => (
            <button
              key={strategy}
              type="button"
              onClick={() => applyStrategy(strategy)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
                plannerStrategy === strategy
                  ? "border-primary bg-primary !text-white"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
              )}
            >
              {STRATEGY_LABELS[strategy]}
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
          Change any open $ amount and that number stays fixed while the other open slots recalculate. After you win a player, enter his name, replace the target with the actual price, then tap <span className="font-semibold text-foreground">Drafted</span>.
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
                    onChange={(event) => handleAllocationChange(slot, event.target.value)}
                    className={cn(
                      "h-8 w-14 rounded-lg px-2 text-right font-mono text-sm",
                      isLocked && "border-success/40 bg-success/5 text-success disabled:opacity-100",
                    )}
                    aria-label={isLocked ? `${slot.label} actual spend` : `${slot.label} planned allocation`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDraftedToggle(slot, fixedDollar)}
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
