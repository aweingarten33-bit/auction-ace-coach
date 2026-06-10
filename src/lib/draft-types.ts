export type Position = "QB" | "RB" | "WR" | "TE" | "K" | "DST";
export type Scoring = "PPR" | "Half PPR" | "Standard";
export type LeagueType = "Standard" | "Superflex" | "2QB";
export type LeagueFormat = "Redraft" | "Keeper" | "Dynasty";

export interface RosterSlots {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number;
  SUPERFLEX: number;
  K: number;
  DST: number;
  BENCH: number;
}

export interface LeagueSettings {
  totalBudget: number;
  numTeams: number;
  scoring: Scoring;
  leagueType: LeagueType;
  format: LeagueFormat;
  roster: RosterSlots;
  keeperIncrease: string; // free-form e.g. "+4/+8/+12"
  context: string;
}

export interface PriceEstimate {
  name: string;
  price: number;
  position?: Position;
}

export interface DraftEvent {
  id: string;
  player: string;
  position?: Position;
  price: number;
  drafter: "me" | "other";
  ts: number;
}

export interface Keeper {
  id: string;
  player: string;
  position?: Position;
  cost: number;
}

export const DEFAULT_ROSTER: RosterSlots = {
  QB: 1,
  RB: 2,
  WR: 3,
  TE: 1,
  FLEX: 0,
  SUPERFLEX: 1,
  K: 0,
  DST: 0,
  BENCH: 6,
};

export const DEFAULT_SETTINGS: LeagueSettings = {
  totalBudget: 225,
  numTeams: 12,
  scoring: "Half PPR",
  leagueType: "Superflex",
  format: "Keeper",
  roster: DEFAULT_ROSTER,
  keeperIncrease: "+5 per year of being kept",
  context: "",
};
