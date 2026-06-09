import { useMemo, useState } from "react";
import { Info, Lock, LockOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDraftStore } from "@/lib/draft-store";
import { spendByPosition } from "@/lib/draft-math";
import { cn } from "@/lib/utils";
import type { LeagueSettings, Position } from "@/lib/draft-types";

type AllocationMode = "even" | "manual";


type SlotGroup = Position | "FLEX" | "SUPERFLEX" | "BENCH";

interface PlannerSlot {
  id: string;
  label: string;
  group: SlotGroup;
  index: number;
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


// ── Main budget planner ───────────────────────────────────────────────────
export default function PositionBudgetBar() {
  const settings = useDraftStore((s) => s.settings);
  const keepers = useDraftStore((s) => s.keepers);
  const events = useDraftStore((s) => s.events);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const setSlotAllocation = useDraftStore((s) => s.setSlotAllocation);
  const setSlotAllocations = useDraftStore((s) => s.setSlotAllocations);
  const clearSlotAllocations = useDraftStore((s) => s.clearSlotAllocations);
  const lockedSlots = useDraftStore((s) => s.lockedSlots);
  const toggleSlotLock = useDraftStore((s) => s.toggleSlotLock);

  const [mode, setMode] = useState<AllocationMode>(() => {
    try { return (localStorage.getItem("planner-mode") as AllocationMode) || "even"; } catch { return "even"; }
  });
  const updateMode = (m: AllocationMode) => {
    setMode(m);
    try { localStorage.setItem("planner-mode", m); } catch { /* quota */ }
  };

  const slots = useMemo(() => buildSlots(settings), [settings]);


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

  // ── Pure manual board: locked slots stay frozen, unlocked split the leftover equally ──
  const { allocations, locked } = useMemo(() => {
    const locked: Record<string, { price: number; name: string }> = {};
    // Assign each pick in a group to a slot in that group (in pick order).
    for (const group of Object.keys(picksByGroup)) {
      const groupSlots = slots.filter((s) => s.group === group);
      const picks = picksByGroup[group];
      for (let i = 0; i < Math.min(picks.length, groupSlots.length); i += 1) {
        locked[groupSlots[i].id] = picks[i];
      }
    }

    const draftedSum = Object.values(locked).reduce((s, p) => s + p.price, 0);
    const unfilled = slots.filter((s) => !(s.id in locked));
    // Both user-locked AND user-typed slots are frozen; only untouched slots auto-fill.
    const userFrozen = unfilled.filter((s) => lockedSlots[s.id] || s.id in slotAllocations);
    const userFrozenSum = userFrozen.reduce((s, slot) => s + (slotAllocations[slot.id] ?? 0), 0);
    const open = unfilled.filter((s) => !lockedSlots[s.id] && !(s.id in slotAllocations));
    const remaining = Math.max(0, settings.totalBudget - draftedSum - userFrozenSum);

    // Equal split across the still-open slots (only in "even" mode).
    // In "manual" mode, untouched slots stay at $0 — user types every value.
    const rounded = open.map(() => 0);
    if (mode === "even" && open.length > 0) {
      const floor = remaining >= open.length ? 1 : 0;
      const spendable = Math.max(0, remaining - floor * open.length);
      const share = spendable / open.length;
      for (let j = 0; j < open.length; j += 1) rounded[j] = Math.max(floor, Math.round(floor + share));
      let diff = remaining - rounded.reduce((sum, v) => sum + v, 0);
      let i = 0;
      let guard = 0;
      while (diff !== 0 && guard < 5000) {
        const idx = i % open.length;
        if (diff > 0) { rounded[idx] += 1; diff -= 1; }
        else if (rounded[idx] > floor) { rounded[idx] -= 1; diff += 1; }
        i += 1;
        guard += 1;
      }
    }

    const allocations: Record<string, number> = {};
    for (const slot of slots) {
      if (slot.id in locked) allocations[slot.id] = locked[slot.id].price;
      else if (slot.id in slotAllocations) allocations[slot.id] = slotAllocations[slot.id];
      else allocations[slot.id] = 0;
    }
    open.forEach((slot, idx) => { allocations[slot.id] = rounded[idx]; });
    return { allocations, locked };
  }, [slots, picksByGroup, settings.totalBudget, slotAllocations, lockedSlots, mode]);


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

      {/* ── Slot breakdown ────────────────────────────── */}
      <div className="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            $ per roster slot
          </p>
        </div>

        <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/70" />
          Type a value or lock a slot — leftover budget splits evenly across the remaining open slots.
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
            const isDrafted = !!lockInfo;
            const isUserLocked = !!lockedSlots[slot.id] && !isDrafted;
            const isLocked = isDrafted || isUserLocked;

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
                  {isDrafted && (
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
                      isDrafted && "border-success/40 bg-success/5 text-success disabled:opacity-100",
                      isUserLocked && "border-primary/40 bg-primary/5 text-primary disabled:opacity-100",
                    )}
                    aria-label={`${slot.label} allocation`}
                    title={isDrafted ? `Paid $${lockInfo.price} for ${lockInfo.name}` : isUserLocked ? `Locked at $${value}` : "Lock this slot to edit its value"}
                  />
                </div>

                {isDrafted ? (
                  <Lock className="h-3 w-3 shrink-0 text-success" />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      // Persist the current displayed value before toggling so the lock freezes it.
                      if (!isUserLocked) setSlotAllocation(slot.id, value);
                      toggleSlotLock(slot.id);
                    }}
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors",
                      isUserLocked
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "text-muted-foreground/60 hover:bg-secondary hover:text-foreground",
                    )}
                    aria-label={isUserLocked ? `Unlock ${slot.label}` : `Lock ${slot.label}`}
                    title={isUserLocked ? "Unlock — let this slot redistribute" : "Lock this value"}
                  >
                    {isUserLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                  </button>
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

