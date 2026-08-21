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

// Expected-price SHAPE for this league at a $225 budget.
//
// These are not copied public auction prices. The shape is calibrated from the
// current 2026 Superflex market/ranking relationship, then the economy checksum
// below forces the full paid-player pool to fit the actual dollars in a
// 12-team room. Josh Allen stays at the user's room-specific ~$69 anchor.
//
// The non-$1 curve lengths intentionally total 204 players:
// 36 QB + 66 RB + 82 WR + 20 TE. With 12 K + 12 DST at $1, that represents the
// 228 roster slots in the user's 12-team, 19-player league. Deeper names remain
// on the Top 350 as $1 fliers rather than creating imaginary extra room money.
const CURVES: Record<"QB" | "RB" | "WR" | "TE", number[]> = {
  QB: [69, 66, 65, 57, 54, 48, 44, 39, 37, 35, 32, 30, 27, 25, 23, 21, 19, 17, 15, 14, 12, 11, 10, 9, 8, 7, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2],
  RB: [60, 58, 52, 48, 44, 41, 37, 34, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  WR: [55, 53, 50, 45, 43, 40, 38, 36, 34, 32, 30, 29, 27, 25, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 11, 10, 10, 9, 9, 8, 8, 8, 7, 7, 7, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  TE: [34, 28, 12, 10, 8, 7, 6, 5, 4, 3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1],
};

// 2026 ordering for the meaningful-money portion of the board. This is kept
// separate from dollar values on purpose: public rankings/auction behavior help
// identify tier order, while Auction Ace's league model owns the final dollars.
// Lower tiers fall back to the legacy sheet's within-position ordering.
const ORDER: Partial<Record<"QB" | "RB" | "WR" | "TE", string[]>> = {
  QB: [
    "Josh Allen", "Jayden Daniels", "Lamar Jackson", "Drake Maye", "Jalen Hurts",
    "Joe Burrow", "Jaxson Dart", "Trevor Lawrence", "Dak Prescott", "Bo Nix",
    "Brock Purdy", "Matthew Stafford", "Caleb Williams", "Justin Herbert",
    "Patrick Mahomes", "Kyler Murray", "Tyler Shough", "Jared Goff", "Daniel Jones",
    "Baker Mayfield", "Malik Willis", "Jordan Love", "C.J. Stroud", "Sam Darnold",
    "Bryce Young", "Cam Ward", "Jacoby Brissett", "Geno Smith", "Fernando Mendoza",
    "Aaron Rodgers", "Deshaun Watson", "Tua Tagovailoa", "Shedeur Sanders",
    "Kirk Cousins", "Michael Penix Jr.", "J.J. McCarthy", "Carson Beck",
    "Justin Fields", "Joe Flacco", "Mac Jones",
  ],
  RB: [
    "Jahmyr Gibbs", "Bijan Robinson", "Christian McCaffrey", "Jonathan Taylor",
    "De'Von Achane", "James Cook", "Ashton Jeanty", "Jeremiyah Love",
    "Saquon Barkley", "Derrick Henry", "Chase Brown", "Kenneth Walker III",
    "Omarion Hampton", "Breece Hall", "Josh Jacobs", "Javonte Williams",
    "Travis Etienne", "Kyren Williams", "Quinshon Judkins", "Cam Skattebo",
    "Bucky Irving", "Bhayshul Tuten", "D'Andre Swift", "TreVeyon Henderson",
    "David Montgomery", "Jadarian Price", "Rhamondre Stevenson", "Jaylen Warren",
    "Rico Dowdle", "Tony Pollard", "Kenny Gainwell", "Jonathon Brooks",
    "Chuba Hubbard", "J.K. Dobbins", "Kyle Monangai", "Jacory Croskey-Merritt",
    "Rachaad White", "Aaron Jones", "Jordan Mason", "Blake Corum", "RJ Harvey",
    "Woody Marks", "Zach Charbonnet", "Alvin Kamara", "Tyjae Spears",
  ],
  WR: [
    "Ja'Marr Chase", "Puka Nacua", "Jaxon Smith-Njigba", "Amon-Ra St. Brown",
    "CeeDee Lamb", "Justin Jefferson", "Drake London", "Rashee Rice", "Nico Collins",
    "Chris Olave", "Garrett Wilson", "A.J. Brown", "Malik Nabers", "George Pickens",
    "Tetairoa McMillan", "Zay Flowers", "DeVonta Smith", "Emeka Egbuka",
    "Davante Adams", "Ladd McConkey", "Terry McLaurin", "Tee Higgins", "Jaylen Waddle",
    "Rome Odunze", "Jameson Williams", "DJ Moore", "Luther Burden III", "Carnell Tate",
    "Courtland Sutton", "Marvin Harrison Jr.", "DK Metcalf", "Parker Washington",
    "Alec Pierce", "Mike Evans", "Christian Watson", "Matthew Golden", "Michael Wilson",
    "Brian Thomas Jr.", "Jakobi Meyers", "Wan'Dale Robinson", "Jordan Addison",
    "Khalil Shakir", "Jayden Reed", "Xavier Worthy", "Josh Downs", "Quentin Johnston",
  ],
  TE: [
    "Trey McBride", "Brock Bowers", "Colston Loveland", "Tyler Warren", "Kyle Pitts",
    "Harold Fannin Jr.", "Sam LaPorta", "Tucker Kraft", "George Kittle", "Travis Kelce",
    "Dallas Goedert", "Jake Ferguson", "Mark Andrews", "T.J. Hockenson", "Isaiah Likely",
    "Dalton Kincaid", "Kenyon Sadiq", "Hunter Henry", "Juwan Johnson", "Brenton Strange",
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
 * Rankings determine who occupies a tier. Position curves determine the shape
 * of the expected auction market. The economy checksum then forces all premiums
 * above $1 to equal the real discretionary money in the room. This prevents AI
 * guesses from creating a fictional auction economy.
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

  // Rounding can move the room by a few dollars. Reconcile exactly without
  // moving K/DST or the Allen anchor.
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
  const expectedPremium = Math.max(0, roomDollars - draftedSlots);
  return {
    roomDollars,
    draftedSlots,
    discretionaryTarget: expectedPremium,
    modeledPremiumDollars: premiumDollars,
    reconciled: premiumDollars === expectedPremium,
  };
}
