// TierCliffHeatmap — pure count of remaining players in each (position, tier).
// Tier = bucket by espn overall_rank within position. Pure math, no AI.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DraftEvent } from "@/lib/draft-types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const TIER_SIZES: Record<string, number[]> = {
  QB: [4, 6, 6, 6, 8],
  RB: [5, 7, 8, 10, 12],
  WR: [5, 7, 8, 10, 12],
  TE: [3, 4, 5, 6, 8],
  K: [10, 10, 10],
  DST: [5, 7, 10],
};

function tierOf(pos: string, posRank: number): number {
  const sizes = TIER_SIZES[pos];
  if (!sizes) return Math.ceil(posRank / 6);
  let cum = 0;
  for (let i = 0; i < sizes.length; i++) {
    cum += sizes[i];
    if (posRank <= cum) return i + 1;
  }
  return sizes.length + 1;
}

interface Player {
  name_norm: string;
  position: string;
  pos_rank: number;
}

interface Props {
  events: DraftEvent[];
}

const POSITIONS = ["QB", "RB", "WR", "TE"];

export default function TierCliffHeatmap({ events }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("espn_player_ranks")
      .select("player_name_norm, position, pos_rank")
      .not("pos_rank", "is", null)
      .order("pos_rank", { ascending: true })
      .then((r) => {
        if (cancelled || !r.data) return;
        setPlayers(
          (r.data as any[])
            .filter((p) => p.position && p.pos_rank)
            .map((p) => ({
              name_norm: p.player_name_norm,
              position: p.position,
              pos_rank: p.pos_rank,
            })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

  const grid = useMemo(() => {
    // pos -> tier -> {total, remaining}
    const out: Record<string, Record<number, { total: number; remaining: number }>> = {};
    for (const pos of POSITIONS) out[pos] = {};
    for (const p of players) {
      if (!POSITIONS.includes(p.position)) continue;
      const t = tierOf(p.position, p.pos_rank);
      const cell = out[p.position][t] ?? { total: 0, remaining: 0 };
      cell.total++;
      if (!drafted.has(p.name_norm)) cell.remaining++;
      out[p.position][t] = cell;
    }
    return out;
  }, [players, drafted]);

  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Tier Cliff
        </h3>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground/70">Loading…</p>
      </div>
    );
  }

  // Show tiers 1-5
  const tiers = [1, 2, 3, 4, 5];

  return (
    <div className="rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Tier Cliff
        </h3>
        <span className="font-mono text-[9px] text-muted-foreground/60">
          remaining / total
        </span>
      </div>
      <div className="grid grid-cols-[28px_repeat(5,minmax(0,1fr))] gap-1">
        <div />
        {tiers.map((t) => (
          <div
            key={t}
            className="text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
          >
            T{t}
          </div>
        ))}
        {POSITIONS.map((pos) => (
          <RowFragment key={pos} pos={pos} tiers={tiers} cells={grid[pos]} />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  pos,
  tiers,
  cells,
}: {
  pos: string;
  tiers: number[];
  cells: Record<number, { total: number; remaining: number }>;
}) {
  return (
    <>
      <div className="flex items-center font-mono text-[10px] font-semibold text-foreground/80">
        {pos}
      </div>
      {tiers.map((t) => {
        const c = cells[t] ?? { total: 0, remaining: 0 };
        if (c.total === 0)
          return <div key={t} className="rounded border border-border/30 bg-background/30" />;
        const pct = c.remaining / c.total;
        const tone =
          c.remaining === 0
            ? "bg-muted/40 text-muted-foreground/50"
            : pct <= 0.25
              ? "bg-destructive/30 text-destructive border-destructive/50"
              : pct <= 0.5
                ? "bg-warning/25 text-warning border-warning/40"
                : "bg-success/15 text-success border-success/30";
        return (
          <div
            key={t}
            className={`flex flex-col items-center justify-center rounded border border-border/40 py-1 ${tone}`}
          >
            <span className="font-mono text-[12px] font-bold tabular-nums leading-none">
              {c.remaining}
            </span>
            <span className="font-mono text-[8px] tabular-nums opacity-60">
              /{c.total}
            </span>
          </div>
        );
      })}
    </>
  );
}
