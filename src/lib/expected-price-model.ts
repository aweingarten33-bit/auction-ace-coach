import type { LeagueSettings, Position, PriceEstimate } from "./draft-types";

export interface ExpectedPriceInput {
  name: string;
  position?: string;
  team?: string;
  price: number;
}

export interface ExpectedPriceEstimate extends PriceEstimate {
  team?: string;
  positionRank?: number;
}

const BASE_BUDGET = 225;
const FIXED_POSITIONS = new Set<Position>(["K", "DST"]);

// These curves describe the SHAPE of this specific league at a $225 budget.
// They are not copied auction prices. They are calibrated for 12 teams,
// 1 QB + 1 Superflex, 2 RB, 3 WR, 1 TE, 9 bench, Half PPR, $1 K/DST.
// A league-economy reconciliation below scales the non-Allen premiums so the
// board cannot imply more or less money than the room actually contains.
const CURVES: Record<"QB" | "RB" | "WR" | "TE", number[]> = {
  QB: [69, 60, 57, 51, 48, 45, 41, 38, 35, 33, 30, 28, 25, 23, 21, 19, 17, 15, 13, 12, 10, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1, 1],
  RB: [50, 49, 42, 40, 37, 34, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  WR: [47, 45, 43, 40, 38, 36, 34, 32, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  TE: [29, 27, 18, 16, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 5, 4, 3, 2, 2, 1],
};

// Fresh 2026 ordering overrides for the meaningful-money portion of the board.
// Lower tiers fall back to the existing sheet's within-position order. This
// keeps the board current without pretending a public site's dollar values are
// this league's dollar values.
const ORDER: Partial<Record<"QB" | "RB" | "WR" | "TE", string[]>> = {
  QB: [
    "Josh Allen", "Drake Maye", "Lamar Jackson", "Joe Burrow", "Jalen Hurts",
    "Jayden Daniels", "Justin Herbert", "Caleb Williams", "Trevor Lawrence",
    "Dak Prescott", "Jaxson Dart", "Brock Purdy", "Patrick Mahomes", "Bo Nix",
    "Matthew Stafford", "Jared Goff", "Jordan Love", "Baker Mayfield", "C.J. Stroud",
    "Cam Ward", "Sam Darnold", "Bryce Young", "Tyler Shough", "Daniel Jones",
    "Michael Penix Jr.", "Tua Tagovailoa", "Geno Smith", "Malik Willis",
  ],
  RB: [
    "Jahmyr Gibbs", "Bijan Robinson", "Christian McCaffrey", "Jonathan Taylor",
    "Derrick Henry", "De'Von Achane", "James Cook", "Ashton Jeanty", "Chase Brown",
    "Saquon Barkley", "Josh Jacobs", "Breece Hall", "Omarion Hampton", "Jeremiyah Love",
    "Kyren Williams", "Cam Skattebo", "Javonte Williams", "Kenneth Walker III",
    "Bucky Irving", "D'Andre Swift", "Quinshon Judkins", "TreVeyon Henderson",
    "Travis Etienne", "David Montgomery",
  ],
  WR: [
    "Puka Nacua", "Ja'Marr Chase", "Jaxon Smith-Njigba", "Amon-Ra St. Brown",
    "CeeDee Lamb", "Drake London", "Justin Jefferson", "Rashee Rice", "George Pickens",
    "A.J. Brown", "Nico Collins", "Zay Flowers", "Chris Olave", "Garrett Wilson",
    "Tetairoa McMillan", "DeVonta Smith", "Tee Higgins", "Emeka Egbuka", "Ladd McConkey",
    "Davante Adams", "Jameson Williams", "Terry McLaurin", "Malik Nabers", "Rome Odunze",
    "Jaylen Waddle", "DJ Moore", "Brian Thomas Jr.", "DK Metcalf", "Marvin Harrison Jr.",
  ],
  TE: [
    "Brock Bowers", "Trey McBride", "Tyler Warren", "Colston Loveland", "Harold Fannin Jr.",
    "Sam LaPorta", "Kyle Pitts", "Travis Kelce", "George Kittle", "Tucker Kraft",
    "Dallas Goedert", "Mark Andrews", "Jake Ferguson", "Hunter Henry",
  ],
};

export const normalizeExpectedPlayerName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function toPosition(pos?: string | null): Position | undefined {
  if (!pos) return undefined;
  const normalized = pos === "DEF" || pos === "D/ST" ? "DST" : pos;
  return ["QB", "RB", "WR", "TE", "K", "DST"].includes(normalized) ? (normalized as Position) : undefined;
}

function rosterSize(settings: LeagueSettings): number {
  return Object.values(settings.roster).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
}

function rankRows(rows: ExpectedPriceInput[]): Array<ExpectedPriceInput & { position: Position; positionRank: number }> {
  const result: Array<ExpectedPriceInput & { position: Position; positionRank: number }> = [];
  for (const position of ["QB", "RB", "WR", "TE", "K", "DST"] as Position[]) {
    const atPos = rows
      .map((row, originalIndex) => ({ row, originalIndex, position: toPosition(row.position) }))
      .filter((x) => x.position === position);

    const curated = position === "QB" || position === "RB" || position === "WR" || position === "TE"
      ? ORDER[position] ?? []
      : [];
    const curatedIndex = new Map(curated.map((name, i) => [normalizeExpectedPlayerName(name), i]));

    atPos.sort((a, b) => {
      const ai = curatedIndex.get(normalizeExpectedPlayerName(a.row.name));
      const bi = curatedIndex.get(normalizeExpectedPlayerName(b.row.name));
      if (ai != null && bi != null) return ai - bi;
      if (ai != null) return -1;
      if (bi != null) return 1;
      const priceDiff = Number(b.row.price || 0) - Number(a.row.price || 0);
      return priceDiff || a.originalIndex - b.originalIndex;
    });

    atPos.forEach((x, i) => result.push({ ...x.row, position, positionRank: i + 1 }));
  }
  return result;
}

function baseCurvePrice(position: Position, rank: number): number {
  if (FIXED_POSITIONS.has(position)) return 1;
  const curve = CURVES[position as "QB" | "RB" | "WR" | "TE"];
  return curve?.[rank - 1] ?? 1;
}

/**
 * Build ONE number per player: Expected Price for this league.
 *
 * The model deliberately separates market SHAPE from league ECONOMY:
 *  - current rankings/order determine who occupies each scarcity tier;
 *  - position curves encode expected Superflex auction behavior;
 *  - an economy checksum forces the total discretionary dollars to reconcile
 *    to teams × budget minus the $1 minimum for every roster slot;
 *  - Josh Allen is held at the user's room-specific $69 anchor at $225.
 */
export function buildExpectedPrices(
  rows: ExpectedPriceInput[],
  settings: LeagueSettings,
): ExpectedPriceEstimate[] {
  const ranked = rankRows(rows);
  const budget = Number.isFinite(settings.totalBudget) && settings.totalBudget > 0 ? settings.totalBudget : BASE_BUDGET;
  const budgetRatio = budget / BASE_BUDGET;

  const raw = ranked.map((row) => {
    const base = baseCurvePrice(row.position, row.positionRank);
    const scaled = base <= 1 ? 1 : 1 + (base - 1) * budgetRatio;
    return { ...row, rawPrice: scaled };
  });

  const roomDollars = Math.max(1, settings.numTeams) * budget;
  const draftedSlots = Math.max(1, settings.numTeams) * rosterSize(settings);
  const discretionaryTarget = Math.max(0, roomDollars - draftedSlots);

  const allenKey = normalizeExpectedPlayerName("Josh Allen");
  const allen = raw.find((r) => normalizeExpectedPlayerName(r.name) === allenKey && r.position === "QB");
  const allenTarget = allen ? 1 + (69 - 1) * budgetRatio : 0;
  const allenPremium = Math.max(0, allenTarget - 1);

  const otherPremiumRaw = raw.reduce((sum, r) => {
    if (normalizeExpectedPlayerName(r.name) === allenKey && r.position === "QB") return sum;
    return sum + Math.max(0, r.rawPrice - 1);
  }, 0);
  const otherPremiumTarget = Math.max(0, discretionaryTarget - allenPremium);
  const premiumScale = otherPremiumRaw > 0 ? otherPremiumTarget / otherPremiumRaw : 1;

  const priced = raw.map<ExpectedPriceEstimate>((r) => {
    const isAllen = normalizeExpectedPlayerName(r.name) === allenKey && r.position === "QB";
    const expected = isAllen
      ? allenTarget
      : 1 + Math.max(0, r.rawPrice - 1) * premiumScale;
    return {
      name: r.name,
      position: r.position,
      team: r.team,
      positionRank: r.positionRank,
      price: Math.max(1, Math.round(expected)),
    };
  });

  // Rounding can move the room by a few dollars. Reconcile the premium pool
  // exactly without ever moving K/DST or the Josh Allen anchor.
  const roundedPremium = priced.reduce((sum, p) => sum + Math.max(0, p.price - 1), 0);
  let diff = Math.round(discretionaryTarget - roundedPremium);
  if (diff !== 0) {
    const adjustable = priced
      .filter((p) => !FIXED_POSITIONS.has(p.position as Position) && normalizeExpectedPlayerName(p.name) !== allenKey)
      .sort((a, b) => b.price - a.price || (a.positionRank ?? 999) - (b.positionRank ?? 999));
    let i = 0;
    let guard = 0;
    while (diff !== 0 && adjustable.length && guard++ < 10000) {
      const p = adjustable[i % adjustable.length];
      if (diff > 0) {
        p.price += 1;
        diff -= 1;
      } else if (p.price > 1) {
        p.price -= 1;
        diff += 1;
      }
      i += 1;
      if (i > adjustable.length * 20 && diff < 0 && adjustable.every((x) => x.price <= 1)) break;
    }
  }

  return priced.sort((a, b) => b.price - a.price || (a.positionRank ?? 999) - (b.positionRank ?? 999) || a.name.localeCompare(b.name));
}

export function expectedPriceEconomy(prices: ExpectedPriceEstimate[], settings: LeagueSettings) {
  const roomDollars = settings.numTeams * settings.totalBudget;
  const draftedSlots = settings.numTeams * rosterSize(settings);
  const premiumDollars = prices.reduce((sum, p) => sum + Math.max(0, p.price - 1), 0);
  return {
    roomDollars,
    draftedSlots,
    discretionaryTarget: Math.max(0, roomDollars - draftedSlots),
    modeledPremiumDollars: premiumDollars,
    reconciled: premiumDollars === Math.max(0, roomDollars - draftedSlots),
  };
}
