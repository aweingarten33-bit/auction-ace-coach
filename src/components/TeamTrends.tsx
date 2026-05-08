// TeamTrends — read-only personalized drafting tendencies for a team
// over the last 3 seasons. Pulled from league_auction_history via the
// team-trends edge function.
import { useEffect, useState } from "react";
import { TrendingUp, Crown, Target, Banknote } from "lucide-react";
import { POS_COLORS } from "@/lib/positions";

interface Trends {
  avgByPos: Record<string, number>;
  avgTotal: number;
  avgTop3Pct: number;
  avgTopBid: number;
  style: string;
  topPos: string;
  lateRound: string;
}

interface PerSeason {
  season: number;
  total: number;
  top3Spend: number;
  topPick: { player_name: string; bid_amount: number; position: string | null } | null;
}

interface Payload {
  seasons: number[];
  perSeason: PerSeason[];
  trends: Trends | null;
}

const POS_ORDER = ["QB", "RB", "WR", "TE", "K", "DST"] as const;

export default function TeamTrends({ teamId, teamName }: { teamId: number; teamName: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/team-trends?team_id=${teamId}&seasons=3`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        const json = (await res.json()) as Payload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border/60 bg-background/40 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {teamName} — 3-yr trends
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Loading drafting history…</p>
      </section>
    );
  }

  if (!data?.trends || data.seasons.length === 0) {
    return null;
  }

  const { trends, perSeason, seasons } = data;
  const maxSpend = Math.max(...POS_ORDER.map((p) => trends.avgByPos[p] ?? 0), 1);

  return (
    <section className="rounded-2xl border border-border/60 bg-background/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {teamName} — last {seasons.length} drafts
        </p>
        <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          {trends.style}
        </span>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Banknote className="h-3.5 w-3.5" />} label="Top bid avg" value={`$${trends.avgTopBid}`} />
        <Stat icon={<Crown className="h-3.5 w-3.5" />} label="Stud spend" value={`${Math.round(trends.avgTop3Pct * 100)}%`} hint="Share of total budget spent on their 3 priciest players" />
        <Stat icon={<Target className="h-3.5 w-3.5" />} label="Loves" value={trends.topPos} />
      </div>

      {/* Avg spend by position */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Avg spend by position
        </p>
        <div className="space-y-1">
          {POS_ORDER.map((pos) => {
            const v = trends.avgByPos[pos] ?? 0;
            const pct = (v / maxSpend) * 100;
            const color = (POS_COLORS as any)[pos] ?? "bg-foreground/40";
            return (
              <div key={pos} className="flex items-center gap-2">
                <span className="w-8 text-[10px] font-semibold text-muted-foreground">{pos}</span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                  <div
                    className={`h-full ${color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[10px] tabular-nums text-foreground/80">
                  ${v}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Per-season top picks */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Biggest swings
        </p>
        <div className="space-y-1">
          {perSeason.map((ps) => (
            <div key={ps.season} className="flex items-center justify-between rounded-md bg-foreground/5 px-2 py-1.5 text-xs">
              <span className="font-mono text-[10px] text-muted-foreground">{ps.season}</span>
              {ps.topPick ? (
                <>
                  <span className="flex-1 truncate px-2">{ps.topPick.player_name}</span>
                  <span className="font-mono tabular-nums text-foreground">${ps.topPick.bid_amount}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <TrendingUp className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Tends to load up at <strong className="text-foreground">{trends.topPos}</strong> and waits on{" "}
          <strong className="text-foreground">{trends.lateRound}</strong>.
        </span>
      </p>
    </section>
  );
}

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-foreground/5 px-2 py-1.5" title={hint}>
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-0.5 text-sm font-bold tabular-nums">{value}</p>
    </div>
  );
}
