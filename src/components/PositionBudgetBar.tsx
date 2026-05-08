import { useMemo } from "react";
import { Calculator, RotateCcw, Sparkles, Star, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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

export function DraftStrategyPanel({ compact = false }: { compact?: boolean }) {
  const strategyId = useDraftStore((s) => s.strategyId);
  const customStrategyRules = useDraftStore((s) => s.customStrategyRules);
  const setStrategyId = useDraftStore((s) => s.setStrategyId);
  const setCustomStrategyRules = useDraftStore((s) => s.setCustomStrategyRules);
  const strategy = getStrategy(strategyId);

  return (
    <Card className={cn("p-3", !compact && "space-y-3")}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Draft strategy</p>
          <p className="truncate text-[11px] text-muted-foreground">{strategy.short}</p>
        </div>
        <Select value={strategy.id} onValueChange={setStrategyId}>
          <SelectTrigger className="h-10 w-[170px] shrink-0 rounded-xl px-3 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!compact && (
        <p className="text-xs leading-relaxed text-muted-foreground">{strategy.description}</p>
      )}

      {strategy.id === "custom" && (
        <Textarea
          value={customStrategyRules}
          onChange={(e) => setCustomStrategyRules(e.target.value.slice(0, 700))}
          placeholder="Write the rules this planner should follow."
          className="mt-3 min-h-24 text-xs"
        />
      )}
    </Card>
  );
}

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

  return (
    <div className="space-y-3">
      <DraftStrategyPanel compact />

      <Card className="space-y-4 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calculator className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              $ per roster slot
            </p>
            <p className="text-sm font-semibold">Budget planner</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={() => setSlotAllocations(suggested)}
              title="Reset to suggested split"
              aria-label="Reset to suggested split"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1 rounded-xl px-2 text-xs"
              onClick={() => setSlotAllocations(suggested)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Suggest
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
              onClick={clearSlotAllocations}
              title="Clear custom edits"
              aria-label="Clear custom edits"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          Edit any slot. Suggest splits your ${settings.totalBudget} using your <span className="font-semibold text-foreground">{strategy.label}</span> shape.
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {slots.map((slot) => {
            const value = allocations[slot.id] ?? 0;
            const groupSpent = spent[slot.group] ?? 0;
            return (
              <label key={slot.id} className="grid grid-cols-[minmax(2.75rem,1fr)_auto_minmax(4.75rem,6rem)] items-center gap-2">
                <span className="truncate text-sm font-medium">{slot.label}</span>
                <span className="font-mono text-lg text-muted-foreground">$</span>
                <Input
                  inputMode="numeric"
                  value={String(value)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                    setSlotAllocation(slot.id, Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 0);
                  }}
                  className={cn(
                    "h-11 rounded-xl px-3 text-left font-mono text-lg",
                    groupSpent > 0 && slot.index === 1 && "ring-1 ring-primary/30",
                  )}
                  aria-label={`${slot.label} budget allocation`}
                />
              </label>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <PlannerStat label="Planned" value={`$${plannedTotal}`} tone={delta === 0 ? "ok" : delta > 0 ? "bad" : "warn"} />
          <PlannerStat label="Budget" value={`$${settings.totalBudget}`} />
          <PlannerStat
            label={delta === 0 ? "Balanced" : delta > 0 ? "Over" : "Unspent"}
            value={delta === 0 ? "$0" : `$${Math.abs(delta)}`}
            tone={delta === 0 ? "ok" : delta > 0 ? "bad" : "warn"}
          />
        </div>
      </Card>
    </div>
  );
}

function PlannerStat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-2 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn(
        "font-mono text-base font-semibold",
        tone === "ok" && "text-success",
        tone === "warn" && "text-warning",
        tone === "bad" && "text-destructive",
      )}>{value}</p>
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

  add("QB", settings.roster.QB, (i) => settings.roster.QB === 1 ? "QB" : `QB${i}`);
  add("RB", settings.roster.RB, (i) => `RB${i}`);
  add("WR", settings.roster.WR, (i) => `WR${i}`);
  add("TE", settings.roster.TE, (i) => settings.roster.TE === 1 ? "TE" : `TE${i}`);
  add("FLEX", settings.roster.FLEX, (i) => settings.roster.FLEX === 1 ? "FLEX" : `FLEX${i}`);
  add("SUPERFLEX", settings.roster.SUPERFLEX, (i) => settings.roster.SUPERFLEX === 1 ? "SF" : `SF${i}`);
  add("K", settings.roster.K, (i) => settings.roster.K === 1 ? "K" : `K${i}`);
  add("DST", settings.roster.DST, (i) => settings.roster.DST === 1 ? "DST" : `DST${i}`);
  add("BENCH", settings.roster.BENCH, (i) => `BE${i}`);

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
      if (diff > 0) {
        rounded[i] += 1;
        diff -= 1;
      } else if (rounded[i] > floor) {
        rounded[i] -= 1;
        diff += 1;
      }
    }
    guard += 1;
  }

  return Object.fromEntries(slots.map((slot, i) => [slot.id, rounded[i]]));
}

function baseSlotWeight(slot: PlannerSlot, settings: LeagueSettings): number {
  const superflex = settings.leagueType === "Superflex" || settings.leagueType === "2QB";
  const curves: Partial<Record<SlotGroup, number[]>> = {
    QB: superflex ? [32, 22, 8] : [15, 5],
    SUPERFLEX: [22, 10],
    RB: [22, 16, 9, 5, 3],
    WR: [21, 16, 10, 6, 4],
    TE: [9, 4],
    FLEX: [9, 6],
    BENCH: [2.2, 2, 1.8, 1.5, 1.2, 1, 1, 1],
    K: [0.5],
    DST: [0.5],
  };
  const curve = curves[slot.group] ?? [1];
  return curve[Math.min(slot.index - 1, curve.length - 1)] ?? 1;
}
