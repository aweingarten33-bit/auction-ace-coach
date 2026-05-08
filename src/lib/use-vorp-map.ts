// VORP (Value Over Replacement Player) → dollars.
//
// Why: gives every projected player an anchor price even if they have no league
// history AND no auction value on file. Foundation for fixing "no anchor" players.
//
// Math (standard auction VORP):
//   1. Replacement level for pos P = projection of the (numTeams * startersAt(P) + slack)th
//      ranked player at that position. Below replacement = $0 marginal value.
//   2. VORP_i = max(0, projection_i - replacement_P)
//   3. Total VORP across all draftable players ≈ total auction $ pool minus $1 minimums.
//   4. Player $ = $1 + VORP_i * ($ pool / total VORP).
//
// Output is a per-player anchor dollar value, league-aware (uses settings).
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LeagueSettings, Position } from "./draft-types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

interface ProjRow {
  name: string;
  position: Position | null;
  pts: number;
}

export interface VorpEntry {
  price: number;        // computed anchor $
  vorp: number;         // raw projection - replacement
  projection: number;   // raw projected points
  replacement: number;  // replacement-level pts at this position
}

const STARTER_FOR: Record<Position, (s: LeagueSettings) => number> = {
  QB: (s) => s.roster.QB + (s.leagueType !== "Standard" ? s.roster.SUPERFLEX : 0),
  RB: (s) => s.roster.RB + Math.ceil(s.roster.FLEX * 0.45),
  WR: (s) => s.roster.WR + Math.ceil(s.roster.FLEX * 0.45),
  TE: (s) => s.roster.TE + Math.ceil(s.roster.FLEX * 0.10),
  K:  (s) => s.roster.K,
  DST:(s) => s.roster.DST,
};

export function useVorpMap(settings: LeagueSettings): {
  map: Record<string, VorpEntry>;
  loading: boolean;
} {
  const [rows, setRows] = useState<ProjRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("espn_player_ranks")
          .select("player_name, position, projected_points")
          .gt("projected_points", 0);
        if (cancelled) return;
        const out: ProjRow[] = [];
        for (const r of (data ?? []) as Array<{ player_name: string | null; position: string | null; projected_points: number | null }>) {
          if (!r.player_name || r.projected_points == null) continue;
          out.push({
            name: r.player_name,
            position: (r.position as Position) ?? null,
            pts: Number(r.projected_points),
          });
        }
        setRows(out);
      } catch (e) {
        console.warn("[useVorpMap] load failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const map = useMemo(() => {
    if (!rows.length) return {} as Record<string, VorpEntry>;

    // 1) Replacement level per position
    const byPos: Record<Position, ProjRow[]> = { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] };
    for (const r of rows) if (r.position && r.position in byPos) byPos[r.position].push(r);
    for (const p in byPos) byPos[p as Position].sort((a, b) => b.pts - a.pts);

    const replacement: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    (Object.keys(byPos) as Position[]).forEach((pos) => {
      const need = Math.max(1, Math.round(STARTER_FOR[pos](settings) * settings.numTeams));
      const list = byPos[pos];
      const idx = Math.min(list.length - 1, need); // 1 past last starter = replacement
      replacement[pos] = list[idx]?.pts ?? list[list.length - 1]?.pts ?? 0;
    });

    // 2) Compute VORP per player + total positive VORP
    const draftable: { name: string; pos: Position; vorp: number; pts: number }[] = [];
    let totalVorp = 0;
    (Object.keys(byPos) as Position[]).forEach((pos) => {
      for (const r of byPos[pos]) {
        const v = Math.max(0, r.pts - replacement[pos]);
        if (v > 0) totalVorp += v;
        draftable.push({ name: r.name, pos, vorp: v, pts: r.pts });
      }
    });

    // 3) Convert VORP → dollars. Pool = league total budget * numTeams - ($1 * total slots).
    const slotsPerTeam =
      settings.roster.QB + settings.roster.RB + settings.roster.WR + settings.roster.TE +
      settings.roster.FLEX + settings.roster.SUPERFLEX + settings.roster.K + settings.roster.DST +
      settings.roster.BENCH;
    const totalSlots = slotsPerTeam * settings.numTeams;
    const totalPool = settings.totalBudget * settings.numTeams;
    const surplusPool = Math.max(0, totalPool - totalSlots); // $$ above $1 minimums
    const dollarsPerVorp = totalVorp > 0 ? surplusPool / totalVorp : 0;

    const out: Record<string, VorpEntry> = {};
    for (const d of draftable) {
      const price = Math.max(1, Math.round(1 + d.vorp * dollarsPerVorp));
      out[norm(d.name)] = {
        price,
        vorp: Math.round(d.vorp),
        projection: Math.round(d.pts),
        replacement: Math.round(replacement[d.pos]),
      };
    }
    return out;
  }, [rows, settings]);

  return { map, loading };
}
