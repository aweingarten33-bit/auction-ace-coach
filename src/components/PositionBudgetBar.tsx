import { useEffect, useMemo } from "react";
import { Lock, LockOpen, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import SlotTargetsInput from "@/components/SlotTargetsInput";
import { useDraftStore } from "@/lib/draft-store";
import { cn } from "@/lib/utils";
import { buildPlannerSlots, type PlannerSlot, type SlotGroup } from "@/lib/planner-slots";
import {
  computeSlotDollars,
  maxBid,
  STRATEGY_LABELS,
  type StrategyId,
} from "@/lib/planner-strategies";

const GROUP_COLOR: Record<SlotGroup, string> = {
  QB:        "bg-red-500/20 text-black border-red-500/30",
  RB:        "bg-emerald-500/20 text-black border-emerald-500/30",
  WR:        "bg-sky-500/20 text-black border-sky-500/30",
  TE:        "bg-orange-500/20 text-black border-orange-500/30",
  FLEX:      "bg-violet-500/20 text-black border-violet-500/30",
  SUPERFLEX: "bg-red-500/20 text-black border-red-500/30",
  K:         "bg-violet-500/20 text-black border-violet-500/30",
  DST:       "bg-amber-500/20 text-black border-amber-500/30",
  BENCH:     "bg-secondary text-black border-border",
};

const STRATEGIES: StrategyId[] = ["hero-qb", "balanced-qbs", "bargain-qb"];

export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
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
  const plannerStrategy = useDraftStore((s) => s.plannerStrategy);
  const setPlannerStrategy = useDraftStore((s) => s.setPlannerStrategy);

  const slots = useMemo(() => buildPlannerSlots(settings), [settings]);


  // Auto-fill any slot the user hasn't manually touched/locked.
  useEffect(() => {
    const computed = computeSlotDollars(plannerStrategy, settings, {
      touchedSlots,
      lockedSlots,
      currentAllocations: slotAllocations,
    });
    const next: Record<string, number> = { ...slotAllocations };
    let changed = false;
    for (const id of Object.keys(computed)) {
      if (touchedSlots[id] || lockedSlots[id]) continue;
      if (next[id] !== computed[id]) {
        next[id] = computed[id];
        changed = true;
      }
    }
    if (changed) setSlotAllocations(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerStrategy, settings, touchedSlots, lockedSlots]);

  const valueFor = (slot: PlannerSlot) =>
    slot.id in slotAllocations ? slotAllocations[slot.id] : 0;

  const slotsPlanned = slots.reduce((sum, s) => sum + valueFor(s), 0);
  const planned = slotsPlanned;
  const remaining = settings.totalBudget - planned;
  const openSlots = slots.filter((s) => !lockedSlots[s.id]).length;
  const remainingForBid =
    settings.totalBudget -
    slots.filter((s) => lockedSlots[s.id]).reduce((a, s) => a + valueFor(s), 0);
  const bidCeiling = maxBid(remainingForBid, openSlots);

  const handleReset = () => {
    clearTouchedSlots();
    const fresh = computeSlotDollars(plannerStrategy, settings, {
      lockedSlots,
      currentAllocations: slotAllocations,
    });
    setSlotAllocations({ ...slotAllocations, ...fresh });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Strategy pills */}
      <div className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Strategy
        </span>
        {STRATEGIES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPlannerStrategy(s)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
              plannerStrategy === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground",
            )}
          >
            {STRATEGY_LABELS[s]}
          </button>
        ))}
        <button
          type="button"
          onClick={handleReset}
          title="Reset to auto-filled values"
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-secondary hover:text-foreground"
          aria-label="Reset budget plan"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>



      <div className="px-4 py-3">
        <div className="space-y-1.5">
          {slots.map((slot) => {
            const value = valueFor(slot);
            const isLocked = !!lockedSlots[slot.id];
            const note = slotNotes[slot.id] ?? "";
            const isFixed = slot.group === "K" || slot.group === "DST";

            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[10px] font-bold",
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
                  ariaLabel={`${slot.label} target players`}
                />

                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    value={String(value)}
                    disabled={isLocked || isFixed}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                      setSlotAllocation(slot.id, Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 0);
                      markSlotTouched(slot.id);
                    }}
                    className={cn(
                      "h-8 w-14 rounded-lg px-2 text-right font-mono text-sm",
                      isLocked && "border-success/40 bg-success/5 text-success disabled:opacity-100",
                    )}
                    aria-label={`${slot.label} allocation`}
                  />
                </div>

                <button
                  type="button"
                  disabled={isFixed}
                  onClick={() => {
                    if (!isLocked) setSlotAllocation(slot.id, value);
                    toggleSlotLock(slot.id);
                  }}
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                    isLocked
                      ? "bg-success/15 text-success hover:bg-success/25"
                      : "text-muted-foreground/60 hover:bg-secondary hover:text-foreground",
                    isFixed && "opacity-30",
                  )}
                  aria-label={isLocked ? `Unlock ${slot.label}` : `Lock ${slot.label} (drafted)`}
                  title={isLocked ? "Unlock this slot" : "Lock — player drafted at this price"}
                >
                  {isLocked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Planned</span>
            <span className="font-mono font-semibold">${planned}</span>
            <span className="text-muted-foreground">/ ${settings.totalBudget}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="rounded-full border border-border bg-secondary/40 px-2.5 py-0.5 text-[11px] font-semibold text-foreground"
              title="Most you could bid on any one player and still afford $1 per remaining slot (reserve held back)"
            >
              Max bid ${bidCeiling}
            </span>
            <span
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                remaining === 0
                  ? "border-success/40 bg-success/10 text-success"
                  : remaining > 0
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-destructive/40 bg-destructive/10 text-destructive",
              )}
            >
              {remaining >= 0 ? `$${remaining} left` : `$${Math.abs(remaining)} over`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
