import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { LeagueSettings, Position } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";
import { Flame, Users } from "lucide-react";

interface Row {
  player_name: string | null;
  player_position: string | null;
  price: number | null;
  drafter_team_name: string | null;
  occurred_at: string | null;
  created_at: string | null;
}

interface Props {
  settings: LeagueSettings;
  /** Name of YOUR team (so we can mark/exclude). Optional. */
  myTeamName?: string;
}

type TeamAgg = {
  team: string;
  isMe: boolean;
  spent: number;
  picks: number;
  byPos: Record<Position, number>;
  byPosSpend: Record<Position, number>;
  lastPos?: Position;
  lastAt: number;
};

const POS_LIST: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];

const emptyByPos = (): Record<Position, number> =>
  ({ QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 } as Record<Position, number>);

/**
 * Score how likely a team is to target each position next.
 * Heuristic blends:
 *   - need pressure (how short of starters they are)
 *   - depth pressure (RB/WR get bonus once starters are filled)
 *   - budget headroom relative to slots remaining
 *   - recency penalty for the position they just took
 */
function scoreNeeds(
  agg: TeamAgg,
  required: Record<Position, number>,
  totalSlots: number,
  totalBudget: number,
) {
  const slotsLeft = Math.max(1, totalSlots - agg.picks);
  const remaining = Math.max(0, totalBudget - agg.spent);
  const headroom = remaining / slotsLeft; // avg $ per remaining slot

  const scores: Record<Position, number> = emptyByPos();
  for (const p of POS_LIST) {
    const need = required[p];
    const have = agg.byPos[p];
    const short = Math.max(0, need - have);
    let s = 0;

    // Starter shortage dominates
    s += short * 50;

    // RB/WR depth bonus (FLEX-eligible)
    if ((p === "RB" || p === "WR") && have <= need) s += 10;
    if (p === "TE" && have < need) s += 5;

    // Penalize K/DST until late
    if (p === "K" || p === "DST") {
      if (slotsLeft > 4) s -= 30;
      else if (have >= need) s -= 100;
      else s += 5; // late & still missing
    }

    // Mild recency penalty so we don't predict same pos twice in a row
    if (agg.lastPos === p) s -= 8;

    // If they have lots of $ per slot, they likely chase studs (RB/WR)
    if (headroom > 25 && (p === "RB" || p === "WR")) s += 6;

    // Already over-rostered? cap
    if (have >= need + 2) s -= 20;

    scores[p] = s;
  }
  return scores;
}

function intensity(score: number): { bg: string; label: string } {
  if (score >= 60) return { bg: "bg-destructive/80 text-destructive-foreground", label: "Hot" };
  if (score >= 35) return { bg: "bg-destructive/40 text-foreground", label: "Likely" };
  if (score >= 15) return { bg: "bg-warning/40 text-foreground", label: "Watch" };
  if (score >= 0) return { bg: "bg-secondary/60 text-muted-foreground", label: "—" };
  return { bg: "bg-secondary/30 text-muted-foreground/60", label: "Cold" };
}

export default function OpponentHeatmap({ settings, myTeamName }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Initial fetch + realtime
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("live_draft_events")
        .select("player_name, player_position, price, drafter_team_name, occurred_at, created_at")
        .eq("user_id", userId)
        .eq("event_type", "won")
        .order("created_at", { ascending: true })
        .limit(2000);
      if (!cancelled && data) setRows(data as Row[]);
    })();

    const channel = supabase
      .channel(`opp_heatmap:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_draft_events", filter: `user_id=eq.${userId}` },
        (payload) => {
          const r = payload.new as any;
          if (r.event_type !== "won") return;
          setRows((cur) => [...cur, r as Row]);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const required: Record<Position, number> = useMemo(() => {
    const r = settings.roster;
    return {
      QB: r.QB + (settings.leagueType !== "Standard" ? r.SUPERFLEX : 0),
      RB: r.RB,
      WR: r.WR,
      TE: r.TE,
      K: r.K,
      DST: r.DST,
    };
  }, [settings]);

  const totalSlots = useMemo(() => {
    const r = settings.roster;
    return r.QB + r.RB + r.WR + r.TE + r.FLEX + r.SUPERFLEX + r.K + r.DST + r.BENCH;
  }, [settings]);

  const teams = useMemo<TeamAgg[]>(() => {
    const map = new Map<string, TeamAgg>();
    for (const row of rows) {
      const name = (row.drafter_team_name || "Unknown").trim() || "Unknown";
      let agg = map.get(name);
      if (!agg) {
        agg = {
          team: name,
          isMe: !!myTeamName && name.toLowerCase() === myTeamName.toLowerCase(),
          spent: 0,
          picks: 0,
          byPos: emptyByPos(),
          byPosSpend: emptyByPos(),
          lastAt: 0,
        };
        map.set(name, agg);
      }
      const price = Number(row.price) || 0;
      agg.spent += price;
      agg.picks += 1;
      const pos = (row.player_position || "").toUpperCase() as Position;
      if (POS_LIST.includes(pos)) {
        agg.byPos[pos] += 1;
        agg.byPosSpend[pos] += price;
        const t = new Date(row.occurred_at || row.created_at || 0).getTime();
        if (t >= agg.lastAt) {
          agg.lastAt = t;
          agg.lastPos = pos;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Me first, then most-active teams
      if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
      return b.picks - a.picks;
    });
  }, [rows, myTeamName]);

  if (!teams.length) {
    return (
      <Card className="bg-gradient-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Opponent Heatmap
          </h2>
        </div>
        <p className="py-4 text-center text-xs text-muted-foreground">
          Waiting for ESPN picks. Once teams start drafting, you'll see who's likely chasing what.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Opponent Heatmap
          </h2>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" /> {teams.length}
        </span>
      </div>

      <div className="max-h-[320px] overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[9px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-1.5 text-left font-semibold">Team</th>
              <th className="pb-1.5 text-right font-semibold">$ Left</th>
              <th className="pb-1.5 text-right font-semibold">Slots</th>
              {POS_LIST.map((p) => (
                <th key={p} className="pb-1.5 text-center font-semibold">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => {
              const remaining = Math.max(0, settings.totalBudget - t.spent);
              const slotsLeft = Math.max(0, totalSlots - t.picks);
              const scores = scoreNeeds(t, required, totalSlots, settings.totalBudget);
              return (
                <tr
                  key={t.team}
                  className={`border-t border-border/40 ${t.isMe ? "bg-primary/5" : ""}`}
                >
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="max-w-[110px] truncate font-medium">{t.team}</span>
                      {t.isMe && (
                        <Badge variant="outline" className="border-primary/40 px-1 py-0 text-[9px] text-primary">
                          YOU
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">${remaining}</td>
                  <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">{slotsLeft}</td>
                  {POS_LIST.map((p) => {
                    const have = t.byPos[p];
                    const need = required[p];
                    const { bg, label } = intensity(scores[p]);
                    return (
                      <td key={p} className="py-1 px-0.5">
                        <div
                          className={`mx-auto flex h-9 min-w-[34px] flex-col items-center justify-center rounded-md ${bg} px-1 transition`}
                          title={`${t.team} · ${p}: ${have}/${need} · score ${scores[p].toFixed(0)} (${label})`}
                        >
                          <span className="font-mono text-[10px] leading-none tabular-nums">
                            {have}/{need}
                          </span>
                          <span className="mt-0.5 text-[8px] font-bold uppercase leading-none tracking-wider opacity-80">
                            {label}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Likelihood:</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/80" /> Hot</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-destructive/40" /> Likely</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-warning/40" /> Watch</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-secondary/60" /> Neutral</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-secondary/30" /> Cold</span>
      </div>
      <p className="mt-1 text-[9px] text-muted-foreground">
        Inferred from each team's roster gaps, remaining $ per slot, and the position they just took.
      </p>
    </Card>
  );
}
