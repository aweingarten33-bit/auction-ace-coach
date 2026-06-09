import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { useDraftStore } from "@/lib/draft-store";
import { cn } from "@/lib/utils";
import type { LeagueSettings, Position } from "@/lib/draft-types";

type SlotGroup = Position | "FLEX" | "SUPERFLEX" | "BENCH";

interface PlannerSlot {
  id: string;
  label: string;
  group: SlotGroup;
}

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

// Sensible defaults so the user starts with something reasonable.
function defaultFor(group: SlotGroup): number {
  if (group === "K" || group === "DST" || group === "BENCH") return 1;
  return 0;
}

export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const setSlotAllocation = useDraftStore((s) => s.setSlotAllocation);

  const slots = useMemo(() => buildSlots(settings), [settings]);

  const valueFor = (slot: PlannerSlot) =>
    slot.id in slotAllocations ? slotAllocations[slot.id] : defaultFor(slot.group);

  const planned = slots.reduce((sum, s) => sum + valueFor(s), 0);
  const remaining = settings.totalBudget - planned;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-4 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          $ per roster slot
        </p>

        <div className="space-y-2">
          {slots.map((slot) => {
            const value = valueFor(slot);
            return (
              <div key={slot.id} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "w-12 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[10px] font-bold",
                    GROUP_COLOR[slot.group],
                  )}
                >
                  {slot.label}
                </span>
                <div className="flex-1" />
                <div className="flex shrink-0 items-center gap-0.5">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    inputMode="numeric"
                    value={String(value)}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, ""));
                      setSlotAllocation(slot.id, Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 0);
                    }}
                    className="h-8 w-16 rounded-lg px-2 text-right font-mono text-sm"
                    aria-label={`${slot.label} allocation`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Planned</span>
            <span className="font-mono font-semibold">${planned}</span>
            <span className="text-muted-foreground">/ ${settings.totalBudget}</span>
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-0.5 text-xs font-semibold",
              remaining === 0
                ? "border-success/40 bg-success/10 text-success"
                : remaining > 0
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {remaining >= 0 ? `$${remaining} left` : `$${Math.abs(remaining)} over`}
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
      slots.push({ id: `${group}-${i}`, label: labelFor(i), group });
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
