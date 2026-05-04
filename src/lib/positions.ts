import { Position } from "./draft-types";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export const POS_COLORS: Record<Position | "UNK", string> = {
  QB: "bg-red-500/20 text-red-300 border-red-500/40",
  RB: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  WR: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  TE: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  K: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  DST: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  UNK: "bg-muted text-muted-foreground border-border",
};
