import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AuctionRow {
  season: number;
  player_name: string;
  position: string | null;
  bid_amount: number;
}

// Tier sizes per position — roughly mirror standard FantasyPros tiers.
const TIER_SIZES: Record<string, number[]> = {
  QB: [4, 6, 6, 6, 8],   // T1=top4, T2=next6, ...
  RB: [5, 7, 8, 10, 12],
  WR: [5, 7, 8, 10, 12],
  TE: [3, 4, 5, 6, 8],
  K:  [10, 10, 10],
  DST:[5, 7, 10],
};


const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

export function tierForPosRank(position: string, posRank: number): number {
  return tierFor(position, posRank);
}

export interface TierPrice {
  position: string;
  tier: number;        // 1-based
  avg: number;         // avg $ across all seasons
  count: number;       // sample size
  perSeason: { season: number; avg: number; count: number }[];
}

function tierFor(pos: string, rankInPos: number): number {
  const sizes = TIER_SIZES[pos];
  if (!sizes) return Math.ceil(rankInPos / 6);
  let cumulative = 0;
  for (let i = 0; i < sizes.length; i++) {
    cumulative += sizes[i];
    if (rankInPos <= cumulative) return i + 1;
  }
  return sizes.length + 1; // dart-throw tier
}

export function buildTierPrices(rows: AuctionRow[]): TierPrice[] {
  // Group by season + position, rank by bid desc, assign tier.
  const bySeasonPos = new Map<string, AuctionRow[]>();
  for (const r of rows) {
    if (!r.position) continue;
    const k = `${r.season}|${r.position}`;
    const arr = bySeasonPos.get(k) ?? [];
    arr.push(r);
    bySeasonPos.set(k, arr);
  }

  // posTier -> {season -> [bids]}
  const acc = new Map<string, Map<number, number[]>>();
  for (const [k, arr] of bySeasonPos) {
    const [seasonStr, pos] = k.split("|");
    const season = parseInt(seasonStr, 10);
    arr.sort((a, b) => b.bid_amount - a.bid_amount);
    arr.forEach((r, i) => {
      const tier = tierFor(pos, i + 1);
      const key = `${pos}|${tier}`;
      if (!acc.has(key)) acc.set(key, new Map());
      const seasonMap = acc.get(key)!;
      const bids = seasonMap.get(season) ?? [];
      bids.push(r.bid_amount);
      seasonMap.set(season, bids);
    });
  }

  const out: TierPrice[] = [];
  for (const [key, seasonMap] of acc) {
    const [position, tierStr] = key.split("|");
    const tier = parseInt(tierStr, 10);
    const perSeason = Array.from(seasonMap.entries())
      .map(([season, bids]) => ({
        season,
        avg: bids.reduce((s, n) => s + n, 0) / bids.length,
        count: bids.length,
      }))
      .sort((a, b) => b.season - a.season);
    const allBids = perSeason.flatMap((s) => Array(s.count).fill(s.avg));
    const avg = allBids.length ? allBids.reduce((s, n) => s + n, 0) / allBids.length : 0;
    out.push({ position, tier, avg, count: allBids.length, perSeason });
  }
  return out.sort((a, b) =>
    a.position === b.position ? a.tier - b.tier : a.position.localeCompare(b.position),
  );
}

export function priceForPositionTier(prices: TierPrice[], position: string, tier: number): TierPrice | null {
  return prices.find((p) => p.position === position && p.tier === tier) ?? null;
}

// Best-effort: parse "Tier 1 RB", "T2 WR", "Tier 3" into a number.
export function parseTierLabel(label?: string | null): number | null {
  if (!label) return null;
  const m = label.match(/(?:tier|t)\s*([0-9]+)/i);
  return m ? parseInt(m[1], 10) : null;
}

export function useLeagueTierPrices() {
  const [prices, setPrices] = useState<TierPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [seasons, setSeasons] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("league_auction_history")
        .select("season, player_name, position, bid_amount")
        .order("season", { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      setPrices(buildTierPrices(data as AuctionRow[]));
      setSeasons(Array.from(new Set(data.map((r: any) => r.season))).sort((a, b) => b - a));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { prices, seasons, loading };
}

export interface PlayerRank {
  espn_player_id: number;
  player_name: string;
  player_name_norm: string;
  position: string | null;
  pos_rank: number | null;
  overall_rank: number | null;
  auction_value: number | null;
}

export function usePlayerRanks() {
  const [byName, setByName] = useState<Map<string, PlayerRank>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("espn_player_ranks")
        .select("espn_player_id, player_name, player_name_norm, position, pos_rank, overall_rank, auction_value")
        .order("overall_rank", { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setLoading(false);
        return;
      }
      const map = new Map<string, PlayerRank>();
      for (const r of data as PlayerRank[]) map.set(r.player_name_norm, r);
      setByName(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const lookup = (name: string): PlayerRank | null => byName.get(norm(name)) ?? null;
  return { lookup, loading, size: byName.size };
}

