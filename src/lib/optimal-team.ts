// Optimal Team builder — DraftMath-style.
//
// Given the user's league settings + a projection/$ map, return the lineup
// with the highest total projected points that fits the budget and roster.
//
// Pure research view: no bidding, no live picks. Just "if you spent every
// dollar perfectly, this is the best 2QB lineup you could build."
//
// Algorithm: beam search over starter slots (fast & near-optimal).
//   - Bench/K/DST reserved at $1 each (matches planner memory rule).
//   - Slot order: QB, QB-or-RB/WR/TE (SUPERFLEX), RB, RB, WR, WR, TE, FLEX.
//   - At each slot we expand the top N eligible candidates not already picked
//     and keep the top K states by projection sum.
import type { LeagueSettings, Position } from "./draft-types";
import type { VorpEntry } from "./use-vorp-map";

export interface OptimalPlayer {
  name: string;
  position: Position;
  price: number;
  projection: number;
}

export interface OptimalLineup {
  picks: { slot: string; player: OptimalPlayer }[];
  totalProjection: number;
  totalSpent: number;
  reservedDollar: number; // bench + K + DST count
  budget: number;
  feasible: boolean;
}

interface Candidate extends OptimalPlayer {
  key: string; // normalized name
}

interface SlotDef {
  label: string;
  eligible: Position[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function buildSlotOrder(settings: LeagueSettings): SlotDef[] {
  const slots: SlotDef[] = [];
  for (let i = 0; i < settings.roster.QB; i++) slots.push({ label: `QB${i + 1}`, eligible: ["QB"] });
  for (let i = 0; i < settings.roster.RB; i++) slots.push({ label: `RB${i + 1}`, eligible: ["RB"] });
  for (let i = 0; i < settings.roster.WR; i++) slots.push({ label: `WR${i + 1}`, eligible: ["WR"] });
  for (let i = 0; i < settings.roster.TE; i++) slots.push({ label: `TE${i + 1}`, eligible: ["TE"] });
  for (let i = 0; i < settings.roster.FLEX; i++) slots.push({ label: `FLEX${i + 1}`, eligible: ["RB", "WR", "TE"] });
  for (let i = 0; i < settings.roster.SUPERFLEX; i++) slots.push({ label: `SF${i + 1}`, eligible: ["QB", "RB", "WR", "TE"] });
  return slots;
}

interface State {
  picks: { slot: string; player: Candidate }[];
  spent: number;
  proj: number;
  used: Set<string>;
}

const BEAM = 60;
const CANDIDATES_PER_SLOT = 24;

export function computeOptimalTeam(
  settings: LeagueSettings,
  vorpMap: Record<string, VorpEntry>,
  vorpPositions: Map<string, Position>,
): OptimalLineup {
  const slots = buildSlotOrder(settings);
  const benchCount = settings.roster.BENCH + settings.roster.K + settings.roster.DST;
  const reserved = benchCount; // $1 each
  const startersBudget = Math.max(slots.length, settings.totalBudget - reserved);

  // Build candidate pool per position.
  const pool: Record<Position, Candidate[]> = { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] };
  for (const [key, entry] of Object.entries(vorpMap)) {
    const pos = vorpPositions.get(key);
    if (!pos || pos === "K" || pos === "DST") continue;
    pool[pos].push({
      key,
      name: key, // replaced below when we have the display name
      position: pos,
      price: entry.price,
      projection: entry.projection,
    });
  }
  for (const p of Object.keys(pool) as Position[]) {
    pool[p].sort((a, b) => b.projection - a.projection);
  }

  // Beam search.
  let beam: State[] = [{ picks: [], spent: 0, proj: 0, used: new Set() }];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const remainingSlotsAfter = slots.length - i - 1;
    const candidates: Candidate[] = [];
    for (const pos of slot.eligible) {
      for (const c of pool[pos].slice(0, CANDIDATES_PER_SLOT)) candidates.push(c);
    }
    const next: State[] = [];
    for (const st of beam) {
      for (const c of candidates) {
        if (st.used.has(c.key)) continue;
        const newSpent = st.spent + c.price;
        // Need at least $1 for each remaining starter slot.
        if (newSpent + remainingSlotsAfter > startersBudget) continue;
        const used = new Set(st.used);
        used.add(c.key);
        next.push({
          picks: [...st.picks, { slot: slot.label, player: c }],
          spent: newSpent,
          proj: st.proj + c.projection,
          used,
        });
      }
    }
    next.sort((a, b) => b.proj - a.proj);
    beam = next.slice(0, BEAM);
    if (beam.length === 0) break;
  }

  const best = beam[0];
  if (!best) {
    return {
      picks: [],
      totalProjection: 0,
      totalSpent: 0,
      reservedDollar: reserved,
      budget: settings.totalBudget,
      feasible: false,
    };
  }

  return {
    picks: best.picks.map((p) => ({
      slot: p.slot,
      player: {
        name: p.player.name,
        position: p.player.position,
        price: p.player.price,
        projection: p.player.projection,
      },
    })),
    totalProjection: Math.round(best.proj * 10) / 10,
    totalSpent: best.spent + reserved,
    reservedDollar: reserved,
    budget: settings.totalBudget,
    feasible: true,
  };
}
