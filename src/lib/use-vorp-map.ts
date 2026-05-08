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

interface HistRow { name: string; position: Position | null; bid: number; season: number }

export function useVorpMap(settings: LeagueSettings): {
  map: Record<string, VorpEntry>;
  loading: boolean;
} {
  const [rows, setRows] = useState<ProjRow[]>([]);
  const [hist, setHist] = useState<HistRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [projRes, histRes] = await Promise.all([
          supabase
            .from("espn_player_ranks")
            .select("player_name, position, projected_points")
            .gt("projected_points", 0),
          supabase
            .from("league_auction_history")
            .select("player_name, position, bid_amount, season")
            .order("season", { ascending: false }),
        ]);
        if (cancelled) return;

        const proj: ProjRow[] = [];
        for (const r of (projRes.data ?? []) as Array<{ player_name: string | null; position: string | null; projected_points: number | null }>) {
          if (!r.player_name || r.projected_points == null) continue;
          proj.push({ name: r.player_name, position: (r.position as Position) ?? null, pts: Number(r.projected_points) });
        }
        setRows(proj);

        // Last 3 seasons only
        const histRows: HistRow[] = [];
        const seasonsSeen = new Set<number>();
        for (const r of (histRes.data ?? []) as Array<{ player_name: string | null; position: string | null; bid_amount: number | null; season: number | null }>) {
          if (!r.player_name || r.bid_amount == null || r.season == null) continue;
          seasonsSeen.add(r.season);
          if (seasonsSeen.size > 3 && !Array.from(seasonsSeen).slice(0, 3).includes(r.season)) continue;
          histRows.push({ name: r.player_name, position: (r.position as Position) ?? null, bid: Number(r.bid_amount), season: r.season });
        }
        setHist(histRows);
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
      const idx = Math.min(list.length - 1, need);
      replacement[pos] = list[idx]?.pts ?? list[list.length - 1]?.pts ?? 0;
    });

    // 2) Compute VORP per player + total positive VORP, indexed by name
    const projByName = new Map<string, { pos: Position; vorp: number; pts: number }>();
    const draftable: { name: string; pos: Position; vorp: number; pts: number }[] = [];
    let totalVorp = 0;
    (Object.keys(byPos) as Position[]).forEach((pos) => {
      for (const r of byPos[pos]) {
        const v = Math.max(0, r.pts - replacement[pos]);
        if (v > 0) totalVorp += v;
        draftable.push({ name: r.name, pos, vorp: v, pts: r.pts });
        projByName.set(norm(r.name), { pos, vorp: v, pts: r.pts });
      }
    });

    // 3) Pool & global $/VORP
    const slotsPerTeam =
      settings.roster.QB + settings.roster.RB + settings.roster.WR + settings.roster.TE +
      settings.roster.FLEX + settings.roster.SUPERFLEX + settings.roster.K + settings.roster.DST +
      settings.roster.BENCH;
    const totalSlots = slotsPerTeam * settings.numTeams;
    const totalPool = settings.totalBudget * settings.numTeams;
    const surplusPool = Math.max(0, totalPool - totalSlots);
    const globalDPV = totalVorp > 0 ? surplusPool / totalVorp : 0;

    // 4) Per-position $/VORP from last 3 drafts.
    //    For each pos, sum (avg $ paid per player) and (their VORP from current projections)
    //    across players that appear in BOTH history and projections. Ratio = league's true rate.
    const posAgg: Record<Position, { dollars: number; vorp: number; n: number }> = {
      QB: { dollars: 0, vorp: 0, n: 0 }, RB: { dollars: 0, vorp: 0, n: 0 },
      WR: { dollars: 0, vorp: 0, n: 0 }, TE: { dollars: 0, vorp: 0, n: 0 },
      K:  { dollars: 0, vorp: 0, n: 0 }, DST:{ dollars: 0, vorp: 0, n: 0 },
    };
    // average $ across seasons per player first
    const playerSeasons = new Map<string, { bids: number[]; pos: Position | null }>();
    for (const h of hist) {
      const k = norm(h.name);
      const cur = playerSeasons.get(k) ?? { bids: [], pos: h.position };
      cur.bids.push(h.bid);
      if (!cur.pos) cur.pos = h.position;
      playerSeasons.set(k, cur);
    }
    for (const [k, v] of playerSeasons) {
      const proj = projByName.get(k);
      if (!proj || proj.vorp <= 0) continue;
      const avgBid = v.bids.reduce((s, b) => s + b, 0) / v.bids.length;
      if (avgBid < 2) continue; // ignore $1 endgame
      const pos = proj.pos;
      posAgg[pos].dollars += avgBid - 1; // surplus over min
      posAgg[pos].vorp += proj.vorp;
      posAgg[pos].n += 1;
    }

    const MIN_SAMPLE = 8;
    const posDPV: Record<Position, number> = { QB: globalDPV, RB: globalDPV, WR: globalDPV, TE: globalDPV, K: globalDPV, DST: globalDPV };
    (Object.keys(posAgg) as Position[]).forEach((pos) => {
      const a = posAgg[pos];
      if (a.n >= MIN_SAMPLE && a.vorp > 0) {
        const raw = a.dollars / a.vorp;
        // Blend toward global to avoid wild swings on thin samples
        const trust = Math.min(1, a.n / 25);
        posDPV[pos] = raw * trust + globalDPV * (1 - trust);
      }
    });
    console.info("[useVorpMap] $/VORP (league-tuned)", posDPV, "global:", globalDPV);

    const out: Record<string, VorpEntry> = {};
    for (const d of draftable) {
      const dpv = posDPV[d.pos] || globalDPV;
      const price = Math.max(1, Math.round(1 + d.vorp * dpv));
      out[norm(d.name)] = {
        price,
        vorp: Math.round(d.vorp),
        projection: Math.round(d.pts),
        replacement: Math.round(replacement[d.pos]),
      };
    }
    return out;
  }, [rows, hist, settings]);

  return { map, loading };
}
