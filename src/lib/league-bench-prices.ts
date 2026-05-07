// Derives realistic max-bid values for bench roles (backup QB, handcuff RB,
// depth WR/TE) from your league's actual auction history instead of using
// the generic 0.4× avg "everything's $1" fallback.
//
// For each season:
//  - Sort drafted players by bid_amount within each position (proxy for posRank)
//  - Players ranked beyond the starter cutoff become bench candidates
//  - We bucket those into roles and compute the median price per role across seasons.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BenchRole = "BACKUP_QB" | "HANDCUFF_RB" | "DEPTH_WR" | "DEPTH_TE" | "DART";

export interface BenchPrice {
  role: BenchRole;
  label: string;
  median: number;
  count: number;
}

const ROLE_LABEL: Record<BenchRole, string> = {
  BACKUP_QB: "Backup QB",
  HANDCUFF_RB: "Handcuff/Depth RB",
  DEPTH_WR: "Depth WR",
  DEPTH_TE: "Backup TE",
  DART: "Dart bench",
};

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

interface Row {
  season: number;
  position: string | null;
  bid_amount: number;
  player_name: string;
}

export function buildBenchPrices(
  rows: Row[],
  numTeams: number,
  opts: { superflex?: boolean } = {},
): BenchPrice[] {
  const superflex = !!opts.superflex;

  // Dedupe (season, player) — historical importer can write dups.
  const seen = new Set<string>();
  const deduped: Row[] = [];
  for (const r of rows) {
    const k = `${r.season}|${r.player_name?.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(r);
  }

  const bucketBids: Record<BenchRole, number[]> = {
    BACKUP_QB: [], HANDCUFF_RB: [], DEPTH_WR: [], DEPTH_TE: [], DART: [],
  };

  const bySeasonPos = new Map<string, Row[]>();
  for (const r of deduped) {
    if (!r.position) continue;
    const k = `${r.season}|${r.position}`;
    const arr = bySeasonPos.get(k) ?? [];
    arr.push(r);
    bySeasonPos.set(k, arr);
  }

  // Starter cutoffs per position. QB cutoff doubles in superflex leagues
  // because the superflex slot is ~90% filled by a 2nd QB — so QB13+ in a
  // 12-team superflex league is still a starter, not a bench piece. True
  // backup QB only starts at QB(2*numTeams)+1.
  const qbStarterCount = superflex ? numTeams * 2 : numTeams;

  for (const [k, arr] of bySeasonPos) {
    const [, pos] = k.split("|");
    arr.sort((a, b) => b.bid_amount - a.bid_amount);
    arr.forEach((r, i) => {
      const rank = i + 1;
      if (pos === "QB") {
        if (rank > qbStarterCount) bucketBids.BACKUP_QB.push(r.bid_amount);
      } else if (pos === "RB") {
        if (rank > Math.round(numTeams * 2.5)) bucketBids.HANDCUFF_RB.push(r.bid_amount);
      } else if (pos === "WR") {
        if (rank > Math.round(numTeams * 3)) bucketBids.DEPTH_WR.push(r.bid_amount);
      } else if (pos === "TE") {
        if (rank > numTeams) bucketBids.DEPTH_TE.push(r.bid_amount);
      }
    });
  }

  const out: BenchPrice[] = [];
  (Object.keys(bucketBids) as BenchRole[]).forEach((role) => {
    const bids = bucketBids[role];
    if (!bids.length) return;
    const meaningful = bids.filter((b) => b > 1);
    const m = meaningful.length >= 2 ? median(meaningful) : median(bids);
    out.push({ role, label: ROLE_LABEL[role], median: Math.max(1, m), count: bids.length });
  });

  if (!out.find((b) => b.role === "DART")) {
    out.push({ role: "DART", label: ROLE_LABEL.DART, median: 1, count: 0 });
  }
  return out;
}

export function useLeagueBenchPrices(numTeams: number, superflex = false) {
  const [prices, setPrices] = useState<BenchPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("league_auction_history")
        .select("season, position, bid_amount, player_name")
        .order("season", { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      setPrices(buildBenchPrices(data as Row[], numTeams, { superflex }));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [numTeams, superflex]);

  return { prices, loading };
}

