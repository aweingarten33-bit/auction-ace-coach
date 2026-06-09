// Shared helpers for the Budget Planner. Used by PositionBudgetBar UI,
// the AI coach context, and the "Apply to planner" action so slot IDs stay
// consistent everywhere.
import type { LeagueSettings, Position } from "@/lib/draft-types";

export type SlotGroup = Position | "FLEX" | "SUPERFLEX" | "BENCH";

export interface PlannerSlot {
  id: string;
  label: string;
  group: SlotGroup;
}

export interface PlannerBoardSlot extends PlannerSlot {
  dollars: number;
  target: string;
  locked: boolean;
}

export interface PlannerBoard {
  totalBudget: number;
  slots: PlannerBoardSlot[];
}

export function defaultFor(group: SlotGroup): number {
  if (group === "K" || group === "DST" || group === "BENCH") return 1;
  return 0;
}

export function buildPlannerSlots(settings: LeagueSettings): PlannerSlot[] {
  const slots: PlannerSlot[] = [];
  const add = (group: SlotGroup, count: number, labelFor: (i: number) => string) => {
    for (let i = 1; i <= count; i += 1) {
      slots.push({ id: `${group}-${i}`, label: labelFor(i), group });
    }
  };

  add("QB",   settings.roster.QB,   (i) => settings.roster.QB === 1 ? "QB" : `QB${i}`);
  add("RB",   settings.roster.RB,   (i) => `RB${i}`);
  add("WR",   settings.roster.WR,   (i) => `WR${i}`);
  add("TE",   settings.roster.TE,   (i) => settings.roster.TE === 1 ? "TE" : `TE${i}`);
  add("FLEX", settings.roster.FLEX, (i) => settings.roster.FLEX === 1 ? "FLEX" : `FLEX${i}`);
  {
    const isSF = settings.leagueType === "Superflex" || settings.leagueType === "2QB";
    add("SUPERFLEX", settings.roster.SUPERFLEX, (i) => {
      if (isSF) return settings.roster.SUPERFLEX === 1 ? `QB${settings.roster.QB + 1}` : `QB${settings.roster.QB + i}`;
      return settings.roster.SUPERFLEX === 1 ? "SF" : `SF${i}`;
    });
  }
  add("K",     settings.roster.K,     (i) => settings.roster.K === 1 ? "K" : `K${i}`);
  add("DST",   settings.roster.DST,   (i) => settings.roster.DST === 1 ? "DST" : `DST${i}`);
  add("BENCH", settings.roster.BENCH, (i) => `BE${i}`);

  return slots;
}

export function buildPlannerBoard(
  settings: LeagueSettings,
  slotAllocations: Record<string, number>,
  slotNotes: Record<string, string>,
  lockedSlots: Record<string, boolean>,
): PlannerBoard {
  const slots = buildPlannerSlots(settings).map<PlannerBoardSlot>((s) => ({
    ...s,
    dollars: s.id in slotAllocations ? slotAllocations[s.id] : defaultFor(s.group),
    target: slotNotes[s.id] ?? "",
    locked: !!lockedSlots[s.id],
  }));
  return { totalBudget: settings.totalBudget, slots };
}
