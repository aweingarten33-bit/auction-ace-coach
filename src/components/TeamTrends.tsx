// TeamTrends — read-only personalized drafting tendencies for a team
// over the last 3 seasons. Pulled from league_auction_history via the
// team-trends edge function.
import { useEffect, useState } from "react";
import { TrendingUp, Crown, Target, Banknote, ChevronDown, Info } from "lucide-react";
import { POS_COLORS } from "@/lib/positions";

interface Trends {
  avgByPos: Record<string, number>;
  avgCountByPos?: Record<string, number>;
  avgPerPlayerByPos?: Record<string, number>;
  medianPerPlayerByPos?: Record<string, number>;
  seasonSpreadByPos?: Record<string, { season: number; spend: number }[]>;
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [breakdownMode, setBreakdownMode] = useState<"total" | "perPlayer">("total");

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
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
        >
          Total $ spent on each position
          <Info className="h-3 w-3" />
        </button>
        {showHelp && (
          <div className="mb-1.5 rounded-md border border-border/50 bg-foreground/5 px-2 py-1.5 text-[11px] leading-snug text-foreground/80">
            <p className="mb-1">
              <strong>Total $ on position</strong> = everything they spend on ALL their QBs
              (or RBs, etc.) in one draft, added up. e.g. $55 QB1 + $20 QB2 + $5 backup = $80 total.
            </p>
            <p>
              <strong>$ per player</strong> = what they paid for one individual guy. Useful for
              spotting their ceiling on a single bid.
            </p>
          </div>
        )}
        <p className="mb-1.5 text-[10px] text-muted-foreground">
          Averaged dollars paid at that position per draft (last {seasons.length} yrs) — not a per-player target. Tap a row for the breakdown.
        </p>

        {/* Mode toggle */}
        <div className="mb-2 inline-flex rounded-md border border-border/50 bg-foreground/5 p-0.5 text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setBreakdownMode("total")}
            className={`rounded px-2 py-0.5 transition ${
              breakdownMode === "total" ? "bg-foreground/15 text-foreground" : "text-muted-foreground"
            }`}
          >
            $ total on position
          </button>
          <button
            type="button"
            onClick={() => setBreakdownMode("perPlayer")}
            className={`rounded px-2 py-0.5 transition ${
              breakdownMode === "perPlayer" ? "bg-foreground/15 text-foreground" : "text-muted-foreground"
            }`}
          >
            $ per player
          </button>
        </div>

        <div className="space-y-1">
          {POS_ORDER.map((pos) => {
            const v = trends.avgByPos[pos] ?? 0;
            const count = trends.avgCountByPos?.[pos] ?? 0;
            const perPlayerAvg = trends.avgPerPlayerByPos?.[pos] ?? 0;
            const perPlayerMed = trends.medianPerPlayerByPos?.[pos] ?? 0;
            const spread = trends.seasonSpreadByPos?.[pos] ?? [];
            const spreadVals = spread.map((s) => s.spend);
            const low = spreadVals.length ? Math.min(...spreadVals) : 0;
            const high = spreadVals.length ? Math.max(...spreadVals) : 0;
            const rowVal = breakdownMode === "total" ? v : perPlayerAvg;
            const rowMax =
              breakdownMode === "total"
                ? maxSpend
                : Math.max(
                    ...POS_ORDER.map((p) => trends.avgPerPlayerByPos?.[p] ?? 0),
                    1,
                  );
            const pct = (rowVal / rowMax) * 100;
            const color = (POS_COLORS as any)[pos] ?? "bg-foreground/40";
            const isOpen = expanded === pos;
            const hasData = v > 0 || count > 0;
            return (
              <div key={pos}>
                <button
                  type="button"
                  onClick={() => hasData && setExpanded(isOpen ? null : pos)}
                  className="flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-foreground/5 disabled:cursor-default disabled:hover:bg-transparent"
                  disabled={!hasData}
                >
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    } ${hasData ? "" : "opacity-30"}`}
                  />
                  <span className="w-8 text-[10px] font-semibold text-muted-foreground">{pos}</span>
                  <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-foreground/5">
                    <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 text-right text-[10px] tabular-nums text-foreground/80">
                    ${rowVal}
                  </span>
                </button>
                {isOpen && hasData && (
                  <div className="ml-6 mt-0.5 mb-1 space-y-1.5 rounded-md bg-foreground/5 px-2 py-1.5 text-[11px] text-foreground/80">
                    <div>
                      Drafts <strong>{count}</strong> {pos}{count === 1 ? "" : "s"} per year, spending{" "}
                      <strong>${v}</strong> total on the position.
                    </div>
                    <div>
                      Per-player: avg <strong>${perPlayerAvg}</strong> · median{" "}
                      <strong>${perPlayerMed}</strong>
                    </div>
                    {spread.length > 0 && high > 0 && (
                      <div>
                        <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Spread last {spread.length} yrs · low ${low} / avg ${v} / high ${high}
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-foreground/10">
                          {/* low-to-high range bar */}
                          <div
                            className={`absolute inset-y-0 ${color} opacity-40`}
                            style={{
                              left: `${(low / high) * 100}%`,
                              width: `${100 - (low / high) * 100}%`,
                            }}
                          />
                          {/* avg marker */}
                          <div
                            className="absolute inset-y-[-2px] w-0.5 bg-foreground"
                            style={{ left: `${(v / high) * 100}%` }}
                            title={`avg $${v}`}
                          />
                        </div>
                        <div className="mt-1 flex gap-2 text-[10px] font-mono text-muted-foreground">
                          {spread.map((s) => (
                            <span key={s.season}>
                              {s.season}: <span className="text-foreground/80">${s.spend}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
