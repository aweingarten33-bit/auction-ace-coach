import { Position } from "./draft-types";

export const POSITIONS: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

export const POS_COLORS: Record<Position | "UNK", string> = {
  QB: "bg-red-500/20 text-black border-red-500/40",
  RB: "bg-emerald-500/20 text-black border-emerald-500/40",
  WR: "bg-sky-500/20 text-black border-sky-500/40",
  TE: "bg-orange-500/20 text-black border-orange-500/40",
  K: "bg-violet-500/20 text-black border-violet-500/40",
  DST: "bg-amber-500/20 text-black border-amber-500/40",
  UNK: "bg-muted text-black border-border",
};
