// OpponentBidProfiler — pure SQL aggregates from league_auction_history.
// Per-team facts only: avg $ per position, max bid, count of $40+ buys.
// Zero AI, zero predictions. Just counts.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  team: string;
  position: string;
  bid: number;
}

const POSITIONS = ["QB", "RB", "WR", "TE"];

export default function OpponentBidProfiler() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("league_auction_history")
        .select("team_id, position, bid_amount, raw");
      if (cancelled || !data) return;
      const out: Row[] = [];
      for (const r of data as any[]) {
        const team =
          (r.raw && (r.raw.team_name || r.raw.team || r.raw.owner)) ||
          (r.team_id != null ? `Team ${r.team_id}` : null);
        if (!team || !r.position || r.bid_amount == null) continue;
        out.push({
          team: String(team),
          position: r.position,
          bid: Number(r.bid_amount),
        });
      }
      setRows(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const profiles = useMemo(() => {
    const byTeam = new Map<string, Row[]>();
    for (const r of rows) {
      const arr = byTeam.get(r.team) ?? [];
      arr.push(r);
      byTeam.set(r.team, arr);
    }
    return Array.from(byTeam.entries())
      .map(([team, arr]) => {
        const byPos: Record<string, number[]> = {};
        for (const p of POSITIONS) byPos[p] = [];
        for (const r of arr) {
          if (byPos[r.position]) byPos[r.position].push(r.bid);
        }
        const avgBy: Record<string, number> = {};
        for (const p of POSITIONS) {
          const xs = byPos[p];
          avgBy[p] = xs.length ? Math.round(xs.reduce((s, n) => s + n, 0) / xs.length) : 0;
        }
        return {
          team,
          picks: arr.length,
          maxBid: arr.reduce((m, r) => Math.max(m, r.bid), 0),
          big: arr.filter((r) => r.bid >= 40).length,
          avgBy,
        };
      })
      .sort((a, b) => b.maxBid - a.maxBid);
  }, [rows]);

  if (profiles.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Opponent Bid Profiles
        </h3>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">
          No league history found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Opponent Bid Profiles
        </h3>
        <span className="font-mono text-[9px] text-muted-foreground/60">3yr history</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[10px]">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border/40">
              <th className="py-1 pr-2 text-left">Team</th>
              <th className="px-1 text-right">Picks</th>
              <th className="px-1 text-right">Max</th>
              <th className="px-1 text-right">$40+</th>
              {POSITIONS.map((p) => (
                <th key={p} className="px-1 text-right">
                  {p} avg
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.team} className="border-b border-border/20 last:border-0">
                <td className="truncate py-1 pr-2 text-foreground">{p.team}</td>
                <td className="px-1 text-right tabular-nums">{p.picks}</td>
                <td className="px-1 text-right tabular-nums text-foreground">${p.maxBid}</td>
                <td className="px-1 text-right tabular-nums">{p.big}</td>
                {POSITIONS.map((pos) => (
                  <td key={pos} className="px-1 text-right tabular-nums text-muted-foreground">
                    {p.avgBy[pos] > 0 ? `$${p.avgBy[pos]}` : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
