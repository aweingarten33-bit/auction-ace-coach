import {
  DraftEvent,
  Keeper,
  LeagueSettings,
  Position,
  PriceEstimate,
  RosterSlots,
} from "./draft-types";

export function parsePlayerLine(input: string): { name: string; price: number } | null {
  const trimmed = input.trim();
  // Match "Name - 45" / "Name – $45" / "Name $45"
  const m = trimmed.match(/^(.+?)\s*[-–—:]\s*\$?(\d+(?:\.\d+)?)\s*$/);
  if (m) {
    const price = Math.round(parseFloat(m[2]));
    if (price <= 0) return null;
    return { name: m[1].trim(), price };
  }
  const m2 = trimmed.match(/^(.+?)\s+\$?(\d+(?:\.\d+)?)\s*$/);
  if (m2) {
    const price = Math.round(parseFloat(m2[2]));
    if (price <= 0) return null;
    return { name: m2[1].trim(), price };
  }
  return null;
}

export function parsePriceSheet(text: string): PriceEstimate[] {
  return text
    .split(/\r?\n/)
    .map((l) => parsePlayerLine(l))
    .filter(Boolean)
    .map((p) => ({ name: p!.name, price: p!.price }));
}

export function totalRosterSize(r: RosterSlots): number {
  return r.QB + r.RB + r.WR + r.TE + r.FLEX + r.SUPERFLEX + r.K + r.DST + r.BENCH;
}

export interface BudgetState {
  totalBudget: number;
  spent: number;
  spentOnKeepers: number;
  remaining: number;
  slotsTotal: number;
  slotsFilled: number;
  slotsLeft: number;
  maxBid: number; // remaining - (slotsLeft - 1)
  avgPerSlot: number;
}

export function computeBudget(
  settings: LeagueSettings,
  keepers: Keeper[],
  events: DraftEvent[]
): BudgetState {
  const myEvents = events.filter((e) => e.drafter === "me");
  const spentOnKeepers = keepers.reduce((s, k) => s + k.cost, 0);
  const spentDraft = myEvents.reduce((s, e) => s + e.price, 0);
  const spent = spentOnKeepers + spentDraft;
  const remaining = settings.totalBudget - spent;
  const slotsTotal = totalRosterSize(settings.roster);
  const slotsFilled = keepers.length + myEvents.length;
  const slotsLeft = Math.max(0, slotsTotal - slotsFilled);
  const maxBid = slotsLeft <= 0 ? 0 : remaining - (slotsLeft - 1);
  const avgPerSlot = slotsLeft > 0 ? remaining / slotsLeft : 0;
  return {
    totalBudget: settings.totalBudget,
    spent,
    spentOnKeepers,
    remaining,
    slotsTotal,
    slotsFilled,
    slotsLeft,
    maxBid,
    avgPerSlot,
  };
}

export interface RosterCount {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  K: number;
  DST: number;
  UNK: number;
}

export function emptyCount(): RosterCount {
  return { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0, UNK: 0 };
}

export function countByPosition(items: { position?: Position }[]): RosterCount {
  const c = emptyCount();
  for (const it of items) {
    if (it.position && it.position in c) (c as any)[it.position]++;
    else c.UNK++;
  }
  return c;
}

export function spendByPosition(events: DraftEvent[]) {
  const c: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0, UNK: 0 };
  for (const e of events) {
    const k = e.position ?? "UNK";
    c[k] = (c[k] ?? 0) + e.price;
  }
  return c;
}

export function recentRuns(events: DraftEvent[], window = 6) {
  const recent = events.slice(-window);
  const c: Record<string, number> = {};
  for (const e of recent) {
    const k = e.position ?? "UNK";
    c[k] = (c[k] ?? 0) + 1;
  }
  return { window: recent.length, counts: c };
}
