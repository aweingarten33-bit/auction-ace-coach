import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import SlotTargetsInput from "@/components/SlotTargetsInput";
import { useDraftStore } from "@/lib/draft-store";
import { cn } from "@/lib/utils";
import { buildPlannerSlots, type SlotGroup } from "@/lib/planner-slots";
import { getStrategySummary, STRATEGY_LABELS, type StrategyId } from "@/lib/planner-strategies";

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

// Reference cards only — picking one just swaps the QB-target guidance
// shown below; it never touches your roster.
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
  const setSlotLocked = useDraftStore((s) => s.setSlotLocked);
  const slotNotes = useDraftStore((s) => s.slotNotes);
  const setSlotNote = useDraftStore((s) => s.setSlotNote);
  const plannerStrategy = useDraftStore((s) => s.plannerStrategy);
  const setPlannerStrategy = useDraftStore((s) => s.setPlannerStrategy);

  const slots = useMemo(() => buildPlannerSlots(settings), [settings]);
  const summary = useMemo(() => getStrategySummary(plannerStrategy, prices), [plannerStrategy, prices]);
  const selectStrategy = (strategy: StrategyId) => setPlannerStrategy(strategy);

  // Every slot starts blank. Nothing is pre-filled or "planned" — you type
  // the real price only once you've actually won that player. A slot with
  // a price above $0 counts as spent; that's the only rule, no exceptions.
  const handlePriceChange = (slotId: string, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    const amount = digits === "" ? 0 : Math.max(0, Math.min(settings.totalBudget, Number(digits)));
    setSlotAllocation(slotId, amount);
    setSlotLocked(slotId, amount > 0);
  };

  const qbLeavesLow = summary.qbSpendHigh == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendHigh);
  const qbLeavesHigh = summary.qbSpendLow == null ? null : Math.max(0, settings.totalBudget - summary.qbSpendLow);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border/50 px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Strategy reference</span>
        </div>

        <select
          value={plannerStrategy}
          onChange={(e) => selectStrategy(e.target.value as StrategyId)}
          className="w-full rounded-md border border-border bg-secondary/40 px-2.5 py-1.5 text-[12px] font-medium text-foreground outline-none focus:border-accent"
          aria-label="Strategy reference"
        >
          {STRATEGIES.map((strategy) => (
            <option key={strategy} value={strategy}>
              {STRATEGY_LABELS[strategy]}
            </option>
          ))}
        </select>

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
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 text-[10px] leading-snug text-muted-foreground">
          Every slot starts blank. The moment you win a player, type his name and what you actually paid — that's it. Nothing is pre-filled or planned ahead, so what you see here is always real.
        </div>

        <div className="space-y-1.5">
          {slots.map((slot) => {
            const value = Math.max(0, Number(slotAllocations[slot.id] ?? 0));
            const note = slotNotes[slot.id] ?? "";

            return (
              <div key={slot.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center font-bold",
                    slot.label === "Superflex" ? "text-[8px]" : "text-[10px]",
                    GROUP_COLOR[slot.group],
                  )}
                >
                  {slot.label}
                </span>

                <SlotTargetsInput
                  value={note}
                  onChange={(val) => setSlotNote(slot.id, val)}
                  group={slot.group}
                  placeholder="player name"
                  ariaLabel={`${slot.label} player name`}
                />

                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    value={value === 0 ? "" : String(value)}
                    placeholder="0"
                    onChange={(event) => handlePriceChange(slot.id, event.target.value)}
                    className="h-8 w-14 rounded-lg px-2 text-right font-mono text-sm"
                    aria-label={`${slot.label} price paid`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
