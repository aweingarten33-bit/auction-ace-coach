import {
  DraftEvent,
  Keeper,
  LeagueSettings,
  Position,
  PriceEstimate,
  RosterSlots,
} from "./draft-types";

/**
 * Permissive parser — accepts almost anything a user might paste:
 *   Jalen Hurts - 65
 *   Jalen Hurts $65
 *   Jalen Hurts, QB, 65
 *   Jalen Hurts | QB | $65
 *   Jalen Hurts\tQB\t65            (tab-sep, e.g. ESPN/FantasyPros copy-paste)
 *   1. Jalen Hurts (PHI - QB) $65
 *   QB1  Jalen Hurts  PHI  65
 * Returns null when no number found.
 */
const POSITION_ALIASES: Record<string, Position> = {
  QB: "QB",
  RB: "RB",
  WR: "WR",
  TE: "TE",
  K: "K",
  PK: "K",
  DST: "DST",
  DEF: "DST",
  "D/ST": "DST",
};

function normalizePosition(value: string | undefined): Position | undefined {
  if (!value) return undefined;
  return POSITION_ALIASES[value.trim().toUpperCase().replace(/[^A-Z/]/g, "")];
}

export function parsePlayerLine(input: string): { name: string; price: number; position?: Position } | null {
  let line = input.trim();
  if (!line) return null;

  // Strip leading rank like "1." / "12)" / "#3"
  line = line.replace(/^[#\d]+[.)\s]+/, "").trim();

  // Find LAST number in the line — that's the price (FantasyPros puts price last)
  const priceMatches = [...line.matchAll(/\$?(\d+(?:\.\d+)?)/g)];
  if (!priceMatches.length) return null;
  const last = priceMatches[priceMatches.length - 1];
  const price = Math.round(parseFloat(last[1]));
  if (!Number.isFinite(price) || price <= 0) return null;

  // Everything before the price = name segment (may include team/pos junk)
  let nameSegment = line.slice(0, last.index).trim();
  const position = normalizePosition(
    nameSegment.toUpperCase().match(/\b(QB|RB|WR|TE|PK|K|DST|DEF|D\/ST)\b/)?.[1]
  );
  // Drop common trailing separators
  nameSegment = nameSegment.replace(/[\s,|\t\-–—:]+$/g, "").trim();
  // Drop parenthetical team/pos like "(PHI - QB)"
  nameSegment = nameSegment.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  // Drop leading position tag like "QB1 " or "RB - "
  nameSegment = nameSegment.replace(/^(QB|RB|WR|TE|PK|K|DST|DEF|D\/ST)\d*\s*[-,|:]?\s*/i, "").trim();
  // If comma-or-pipe separated, take the first chunk that looks like a name
  const chunks = nameSegment.split(/\s*[,|\t]\s*/).filter(Boolean);
  let name = chunks[0] || nameSegment;
  // Strip any trailing team abbreviation like "Jalen Hurts PHI"
  name = name.replace(/\s+(?:[A-Z]{2,4})$/, "").trim();
  // Strip a trailing position
  name = name.replace(/\s+(QB|RB|WR|TE|PK|K|DST|DEF|D\/ST)$/i, "").trim();

  if (!name || name.length < 2) return null;
  return { name, price, position };
}

export function parsePriceSheet(text: string): PriceEstimate[] {
  const seen = new Set<string>();
  const out: PriceEstimate[] = [];
  for (const line of text.split(/\r?\n/)) {
    const p = parsePlayerLine(line);
    if (!p) continue;
    const key = p.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: p.name, price: p.price, position: p.position });
  }
  return out;
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

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Re-price undrafted players based on positional scarcity.
 *
 * As players come off the board, everyone below them moves up in rank.
 * A player who was QB5 with 4 QBs gone is now effectively QB1 in the
 * remaining pool — their adjusted price blends toward what QB1 historically
 * cost, scaled by how many players above them were taken.
 *
 * The store's `prices` array is never mutated; this returns a new array
 * used only for display and decision-engine input.
 */
export function adjustPricesForDrafted(
  prices: PriceEstimate[],
  events: DraftEvent[],
): PriceEstimate[] {
  if (events.length === 0) return prices;

  const drafted = new Set(events.map((e) => normName(e.player)));

  // Per position: original price ladder sorted desc (highest price = rank 1)
  const ladders = new Map<string, PriceEstimate[]>();
  for (const p of prices) {
    const pos = p.position ?? "UNK";
    const arr = ladders.get(pos) ?? [];
    arr.push(p);
    ladders.set(pos, arr);
  }
  for (const [pos, arr] of ladders) {
    ladders.set(pos, [...arr].sort((a, b) => b.price - a.price));
  }

  return prices.map((p) => {
    if (drafted.has(normName(p.name))) return p; // already off the board

    const pos = p.position ?? "UNK";
    const ladder = ladders.get(pos) ?? [];
    const originalRank = ladder.findIndex((pl) => normName(pl.name) === normName(p.name)) + 1;
    if (originalRank <= 1) return p; // already top of position

    // How many players originally ranked above this player have been drafted?
    const draftedAbove = ladder
      .slice(0, originalRank - 1)
      .filter((pl) => drafted.has(normName(pl.name))).length;

    if (draftedAbove === 0) return p;

    const newRank = originalRank - draftedAbove;
    // What did the Nth player historically cost? Use the original price at that slot.
    const priceAtNewRank = ladder[newRank - 1]?.price ?? p.price;
    if (priceAtNewRank <= p.price) return p; // only adjust upward

    // Blend toward new-rank price. Scale smoothly: 12% per player drafted above,
    // capped at 65% so original player-specific data still has weight.
    const blend = Math.min(0.65, draftedAbove * 0.12);
    const adjusted = Math.round(p.price * (1 - blend) + priceAtNewRank * blend);
    return { ...p, price: adjusted };
  });
}
