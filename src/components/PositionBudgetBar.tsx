import { useEffect, useMemo, useRef } from "react";
import { CheckCircle2, DownloadCloud, Undo2 } from "lucide-react";
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

// The planner is a single always-editable board. These are reference cards
// only — picking one just swaps the QB-target guidance shown below; it never
// touches your numbers. "Load these numbers" is the one explicit action that
// writes a strategy's dollars into your plan.
const STRATEGIES: StrategyId[] = [
  "double-elite-qb",
  "hero-qb",
  "elite-balanced-qb",
  "balanced-qbs",
  "value-qb",
  "bargain-qb",
  "punt-qb",
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
  const plannerStrategy = useDraftStore((s) => s.plannerStrategy);
  const setPlannerStrategy = useDraftStore((s) => s.setPlannerStrategy);

  const slots = useMemo(() => buildPlannerSlots(settings), [settings]);
  const summary = useMemo(() => getStrategySummary(plannerStrategy, prices), [plannerStrategy, prices]);

  // The board is a single source of truth: whatever is in slotAllocations is
  // what's shown, full stop. Nothing derives or silently overwrites it.
  // Strategy cards above are reference-only (QB targets + spend band); the
  // only way their numbers reach the board is the explicit "Load" action.
  // The two exceptions, both explicit and predictable: correcting a locked
  // (Drafted) price rescales the rest of the plan around it, and changing
  // the total budget rescales the whole plan proportionally.
  const displayedAllocations = slotAllocations;

  // First time this league's plan has ever been opened, seed it from the
  // selected strategy so it isn't a wall of blank/zero inputs. After this,
  // the board is fully manual — nothing re-seeds it automatically again.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    if (Object.keys(slotAllocations).length > 0) return;
    setSlotAllocations(computeSlotDollars(plannerStrategy, settings, { lockedSlots, prices }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prevBudgetRef = useRef(settings.totalBudget);
  useEffect(() => {
    const prevBudget = prevBudgetRef.current;
    prevBudgetRef.current = settings.totalBudget;
    if (prevBudget === settings.totalBudget) return;
    setSlotAllocations(rebalanceProportional("manual", settings, {
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    }));
    // Only re-run when the budget itself changes — not on every allocation edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.totalBudget]);

  const valueFor = (slot: PlannerSlot) => Math.max(0, Number(displayedAllocations[slot.id] ?? 0));
  const slotsPlanned = slots.reduce((sum, slot) => sum + valueFor(slot), 0);
  const draftedSpend = slots
    .filter((slot) => lockedSlots[slot.id])
    .reduce((sum, slot) => sum + Math.max(0, Number(slotAllocations[slot.id] ?? 0)), 0);
  const draftedCount = slots.filter((slot) => lockedSlots[slot.id]).length;
  const budgetLeft = Math.max(0, settings.totalBudget - draftedSpend);
  const openSlots = slots.filter((slot) => !lockedSlots[slot.id]).length;
  const bidCeiling = maxBid(budgetLeft, openSlots);

  // Pick a reference card — informational only, never touches the board.
  const selectStrategy = (strategy: StrategyId) => setPlannerStrategy(strategy);

  // The one explicit action that writes a strategy's numbers into the board,
  // preserving actual drafted spend on any slot already locked in.
  const handleLoadStrategy = () => {
    setSlotAllocations(computeSlotDollars(plannerStrategy, settings, {
      lockedSlots,
      currentAllocations: slotAllocations,
      prices,
    }));
  };

  const handleAllocationChange = (slot: PlannerSlot, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    const amount = digits === "" ? 0 : Math.max(0, Math.min(999, Number(digits)));
    const isLocked = !!lockedSlots[slot.id];

    if (isLocked) {
      // Correcting an already-drafted price: keep it locked, rescale the
      // remaining open slots around the corrected actual spend.
      const nextCurrent = { ...slotAllocations, [slot.id]: amount };
      const rebalanced = rebalanceProportional("manual", settings, {
        lockedSlots,
        currentAllocations: nextCurrent,
        prices,
      });
      setSlotAllocations({ ...nextCurrent, ...rebalanced, [slot.id]: amount });
      return;
    }
    setSlotAllocation(slot.id, amount);
  };

  const handleDraftedToggle = (slot: PlannerSlot, fixedDollar: boolean) => {
    const isLocked = !!lockedSlots[slot.id];
    if (isLocked) {
      toggleSlotLock(slot.id);
      return;
    }

    const actual = fixedDollar ? 1 : valueFor(slot);

    // Freeze the purchase and proportionally rescale the rest of the plan.
    const nextCurrent = { ...slotAllocations, [slot.id]: actual };
    const nextLocks = { ...lockedSlots, [slot.id]: true };
    const rebalanced = rebalanceProportional("manual", settings, {
      lockedSlots: nextLocks,
      currentAllocations: nextCurrent,
      prices,
    });
    setSlotAllocations({ ...nextCurrent, ...rebalanced, [slot.id]: actual });
    toggleSlotLock(slot.id);
  };

  const qbLeavesLow = summary.qbSpendHigh == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendHigh);
  const qbLeavesHigh = summary.qbSpendLow == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendLow);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border/50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Strategy reference</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {STRATEGIES.map((strategy) => (
            <button
              key={strategy}
              type="button"
              onClick={() => selectStrategy(strategy)}
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
          <button
            type="button"
            onClick={handleLoadStrategy}
            className="mt-2 flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary/20"
          >
            <DownloadCloud className="h-3.5 w-3.5" />
            Load these numbers into my plan
          </button>
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
          These numbers are yours to edit anytime. After you win a player, enter his name, tap <span className="font-semibold text-foreground">Drafted</span>, then fix the $ to what he actually cost — the rest of your plan rescales to match. Changing your total budget above rescales everything too.
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
                    disabled={fixedDollar}
                    onChange={(event) => handleAllocationChange(slot, event.target.value)}
                    className={cn(
                      "h-8 w-14 rounded-lg px-2 text-right font-mono text-sm",
                      isLocked && "border-success/40 bg-success/5 text-success",
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
