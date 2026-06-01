// Lifted out of the deleted VetriNotesPanel so vetri-search / VetriTakesForPlayer
// can keep working without the panel UI.
import type { Position } from "./draft-types";

export interface VetriTake {
  player: string;
  position: Position;
  lean: "target" | "value" | "fade" | "avoid" | "sleeper" | "breakout" | "neutral";
  tier?: string;
  reasoning: string;
  salPrice?: string;
  estPrice?: number;
}

// League auction budget. Default model context is $200; this league = $225 (minus keepers).
const LEAGUE_BUDGET = 225;
const BUDGET_SCALE = LEAGUE_BUDGET / 200;
export const scaledEstBid = (n?: number) =>
  typeof n === "number" && n > 0 ? Math.max(1, Math.round(n * BUDGET_SCALE)) : null;
