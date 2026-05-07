// Shared anchor-price map: league 3yr auction average + ESPN 2026 auction value.
// Consumed by decide() so when a player is NOT on the user's price sheet,
// we still show a real per-player anchor instead of falling back to the
// user's wallet cap (which made every off-sheet player look like $213).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AnchorEntry } from "./decision-engine";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function useAnchorMap(): Record<string, AnchorEntry> {
  const [map, setMap] = useState<Record<string, AnchorEntry>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hist, espn] = await Promise.all([
          supabase
            .from("league_auction_history")
            .select("player_name, bid_amount")
            .then((r) => r.data ?? []),
          supabase
            .from("espn_player_ranks")
            .select("player_name_norm, auction_value")
            .then((r) => r.data ?? []),
        ]);
        if (cancelled) return;

        const out: Record<string, AnchorEntry> = {};

        // 1) League 3yr average — highest priority fallback after the sheet
        const agg = new Map<string, { sum: number; n: number }>();
        for (const row of hist as Array<{ player_name: string | null; bid_amount: number | null }>) {
          if (!row.player_name || row.bid_amount == null) continue;
          const k = norm(row.player_name);
          const cur = agg.get(k) ?? { sum: 0, n: 0 };
          cur.sum += Number(row.bid_amount);
          cur.n += 1;
          agg.set(k, cur);
        }
        for (const [k, v] of agg) {
          if (v.n > 0) out[k] = { price: Math.max(1, Math.round(v.sum / v.n)), source: "league" };
        }

        // 2) ESPN as second-tier fallback (only if no league data)
        for (const row of espn as Array<{ player_name_norm: string | null; auction_value: number | null }>) {
          if (!row.player_name_norm || row.auction_value == null) continue;
          const k = norm(row.player_name_norm);
          if (!out[k] && Number(row.auction_value) > 0) {
            out[k] = { price: Math.max(1, Math.round(Number(row.auction_value))), source: "espn" };
          }
        }

        setMap(out);
      } catch (e) {
        console.warn("[useAnchorMap] load failed", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return map;
}
