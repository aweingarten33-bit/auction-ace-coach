import cheatSheet2026 from "@/assets/cheat-sheet-2026.json";
import type { LeagueSettings, Position, PriceEstimate } from "@/lib/draft-types";
import { DEFAULT_SETTINGS } from "@/lib/draft-types";
import {
  buildExpectedPrices,
  expectedPriceEconomy,
  normalizeExpectedPlayerName,
} from "@/lib/expected-price-model";

const BASE_BUDGET = 225;

export const PRICE_SOURCE_VERSION = "league-expected-2026-v2";

type CheatSheetRow = { name: string; position?: string; team?: string; price: number };

export type BlendedPrice = PriceEstimate & {
  team?: string;
  positionRank?: number;
};

export const normalizePlayerName = normalizeExpectedPlayerName;

function toPosition(pos?: string | null): Position | undefined {
  if (!pos) return undefined;
  const normalized = pos === "DEF" || pos === "D/ST" ? "DST" : pos;
  return ["QB", "RB", "WR", "TE", "K", "DST"].includes(normalized) ? (normalized as Position) : undefined;
}

/**
 * Returns ONE price per player: Expected Price for the user's league.
 *
 * The old implementation merely scaled the AI-generated sheet by budget.
 * This version uses the sheet as the player pool/fallback ordering, then runs
 * the league-calibrated Superflex expected-price model and economy checksum.
 */
export async function loadBlendedAuctionPrices(
  totalBudget = BASE_BUDGET,
  settingsOverride?: Partial<LeagueSettings>,
): Promise<BlendedPrice[]> {
  const budget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : BASE_BUDGET;
  const settings: LeagueSettings = {
    ...DEFAULT_SETTINGS,
    ...settingsOverride,
    totalBudget: budget,
    roster: {
      ...DEFAULT_SETTINGS.roster,
      ...(settingsOverride?.roster ?? {}),
    },
  };

  const input = (cheatSheet2026 as CheatSheetRow[])
    .filter((p) => p.name && Number.isFinite(Number(p.price)))
    .map((p) => ({
      name: p.name,
      position: toPosition(p.position),
      team: p.team,
      // The legacy price is retained ONLY as fallback rank ordering below the
      // curated 2026 tiers. It is not surfaced as a second value.
      price: Math.max(1, Number(p.price) || 1),
    }));

  const modeled = buildExpectedPrices(input, settings);
  const economy = expectedPriceEconomy(modeled, settings);
  if (!economy.reconciled) {
    console.warn("Expected-price economy did not reconcile", economy);
  }

  return modeled.map((p) => ({
    name: p.name,
    position: p.position,
    team: p.team,
    positionRank: p.positionRank,
    price: p.price,
  }));
}
