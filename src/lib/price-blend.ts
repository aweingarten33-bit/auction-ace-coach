import { supabase } from "@/integrations/supabase/client";
import cheatSheet2026 from "@/assets/cheat-sheet-2026.json";
import type { Position, PriceEstimate } from "@/lib/draft-types";

const PDF_BASE_BUDGET = 225;
const DRAFTSHARKS_BASE_BUDGET = 200;

export const PRICE_SOURCE_VERSION = "pdf-draftsharks-2026-v1";

type CheatSheetRow = { name: string; position?: string; team?: string; price: number };
type DraftSharksRow = {
  player_name: string | null;
  position: string | null;
  team: string | null;
  value_200: number | null;
};

export type BlendedPrice = PriceEstimate & {
  team?: string;
  pdfPrice?: number;
  draftSharksPrice?: number;
};

export const normalizePlayerName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function toPosition(pos?: string | null): Position | undefined {
  if (!pos) return undefined;
  const normalized = pos === "DEF" || pos === "D/ST" ? "DST" : pos;
  return ["QB", "RB", "WR", "TE", "K", "DST"].includes(normalized) ? (normalized as Position) : undefined;
}

export async function loadBlendedAuctionPrices(totalBudget = PDF_BASE_BUDGET): Promise<BlendedPrice[]> {
  const budget = Number.isFinite(totalBudget) && totalBudget > 0 ? totalBudget : PDF_BASE_BUDGET;
  const pdfScale = budget / PDF_BASE_BUDGET;
  const rows = new Map<string, BlendedPrice>();

  for (const p of cheatSheet2026 as CheatSheetRow[]) {
    if (!p.name || !Number.isFinite(Number(p.price)) || Number(p.price) <= 0) continue;
    const key = normalizePlayerName(p.name);
    const pdfPrice = Math.max(1, Math.round(Number(p.price) * pdfScale));
    rows.set(key, {
      name: p.name,
      position: toPosition(p.position),
      team: p.team,
      price: pdfPrice,
      pdfPrice,
    });
  }

  return Array.from(rows.values()).sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
}