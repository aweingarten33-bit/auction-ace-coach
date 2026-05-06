// COMMAND CENTER — the war room before the draft starts.
// Editorial sports-page meets cinematic control room.
// Everything here answers: budget, needs, plan, missed targets, "what now?"
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Calculator, Target, Bot, TrendingUp, Compass, ArrowRight, Trophy } from "lucide-react";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget, countByPosition, recentRuns } from "@/lib/draft-math";
import { computeMarketPulse } from "@/lib/value";
import { Position } from "@/lib/draft-types";
import { getStrategy } from "@/lib/strategies";
import WarRoomShell from "@/components/WarRoomShell";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export default function CommandCenter() {
  const navigate = useNavigate();
  const { settings, keepers, events, prices, watchlist, strategyId, setupComplete, draftPlan } = useDraftStore();
  const budget = computeBudget(settings, keepers, events);
  const myEvents = events.filter((e) => e.drafter === "me");
  const myRoster = [...keepers, ...myEvents.map((e) => ({ position: e.position, player: e.player, cost: e.price }))];
  const counts = countByPosition(myRoster as { position?: Position }[]);
  const pulse = computeMarketPulse(events, prices);
  const runs = recentRuns(events, 6);
  const strat = getStrategy(strategyId);
  const isLive = events.length > 0;
  const burnRate = budget.slotsLeft > 0 ? budget.remaining / budget.slotsLeft : 0;

  // Need state per slot
  const need = useMemo(() => {
    const req: Record<string, number> = {
      QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
      RB: settings.roster.RB,
      WR: settings.roster.WR,
      TE: settings.roster.TE,
      K: settings.roster.K,
      DST: settings.roster.DST,
    };
    return (Object.keys(req) as Position[]).map((p) => ({
      pos: p,
      have: (counts as any)[p] || 0,
      need: req[p],
      short: Math.max(0, req[p] - ((counts as any)[p] || 0)),
    }));
  }, [counts, settings]);

  // Missed memories — players I bid on / watched that someone else won
  const missed = useMemo(() => {
    const watchSet = new Set(watchlist.map(norm));
    return events
      .filter((e) => e.drafter === "other" && watchSet.has(norm(e.player)))
      .slice(-4)
      .reverse()
      .map((e) => {
        const ref = prices.find((p) => norm(p.name) === norm(e.player));
        return { name: e.player, sold: e.price, ref: ref?.price ?? null, pos: e.position };
      });
  }, [events, watchlist, prices]);

  // Top remaining targets by my watchlist
  const topTargets = useMemo(() => {
    const drafted = new Set(events.map((e) => norm(e.player)));
    return watchlist
      .filter((w) => !drafted.has(norm(w)))
      .slice(0, 4)
      .map((w) => {
        const p = prices.find((x) => norm(x.name) === norm(w));
        return { name: w, price: p?.price ?? null, pos: p?.position };
      });
  }, [watchlist, events, prices]);

  const pulseLabel =
    !pulse.confident ? "calibrating" :
    pulse.multiplier > 1.10 ? "overpaying" :
    pulse.multiplier < 0.92 ? "discounted" : "at price";
  const pulseTone =
    !pulse.confident ? "text-muted-foreground" :
    pulse.multiplier > 1.10 ? "heat-bad" :
    pulse.multiplier < 0.92 ? "heat-good" : "heat-fair";

  const nextMove =
    !setupComplete   ? { text: "Finish setup before the draft starts", to: "/setup", cta: "Open setup" }
    : !isLive        ? { text: "The room hasn't started. Open the live draft when it does.", to: "/draft", cta: "Open live draft" }
    : burnRate < 1.5 ? { text: "Bank running thin. Cap next bid near $" + Math.max(1, Math.round(burnRate * 2)) + ".", to: "/draft", cta: "Resume draft" }
    : pulse.multiplier > 1.12 ? { text: `Room is ${Math.round((pulse.multiplier - 1) * 100)}% over price. Wait for the next dip.`, to: "/market", cta: "Read the room" }
    : { text: "You're on plan. Keep nominating off-target players.", to: "/draft", cta: "Resume draft" };

  return (
    <WarRoomShell title="The War Room" eyebrow={isLive ? "Live · Pick " + (events.length + 1) : "Pre-draft"}>
      <div className="px-4 md:px-8 max-w-6xl mx-auto">

        {/* ===== TOP — situational headline + next move ===== */}
        <section className="grid md:grid-cols-3 gap-3 md:gap-4 mt-4">
          <div className="md:col-span-2 room-card room-card-lift p-5 md:p-6 relative overflow-hidden">
            <div className="absolute -top-12 -right-10 w-56 h-56 rounded-full opacity-25 blur-3xl"
                 style={{ background: "radial-gradient(circle, hsl(38 95% 60%), transparent 70%)" }} />
            <div className="room-eyebrow">The next move</div>
            <h2 className="room-display text-2xl md:text-3xl mt-1 leading-tight">{nextMove.text}</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => navigate(nextMove.to)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-[hsl(var(--primary-foreground))]"
                style={{ background: "linear-gradient(160deg, hsl(38 95% 60%), hsl(16 88% 56%))" }}>
                <Radio className="h-4 w-4" /> {nextMove.cta}
              </button>
              <button onClick={() => navigate("/coach")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-foreground/15 text-foreground hover:bg-foreground/5">
                <Bot className="h-4 w-4" /> Ask the brain
              </button>
              <button onClick={() => navigate("/planner")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-foreground/15 text-foreground hover:bg-foreground/5">
                <Calculator className="h-4 w-4" /> Run the numbers
              </button>
            </div>
          </div>

          {/* Pressure dial */}
          <div className="room-card p-5 relative overflow-hidden">
            <div className="room-eyebrow">Room temperature</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`room-display text-4xl ${pulseTone}`}>{(pulse.multiplier * 100).toFixed(0)}%</span>
              <span className="room-mono text-xs text-muted-foreground">of sheet</span>
            </div>
            <div className={`mt-1 text-sm font-medium ${pulseTone}`}>{pulseLabel}</div>
            <div className="mt-3 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div className="h-full pressure-bar" style={{ width: `${Math.min(100, Math.max(15, pulse.multiplier * 80))}%` }} />
            </div>
            <button onClick={() => navigate("/market")}
              className="mt-3 text-xs room-label text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1">
              Read the room <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </section>

        {/* ===== BUDGET / ROSTER STRIP ===== */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4">
          {[
            { eyebrow: "Bank",     value: `$${budget.remaining}`, sub: `of $${settings.totalBudget}`,    tone: "text-[hsl(var(--primary))]" },
            { eyebrow: "Max bid",  value: `$${budget.maxBid}`,    sub: `${budget.slotsLeft} slots left`, tone: "text-foreground" },
            { eyebrow: "$/slot",   value: `$${burnRate.toFixed(0)}`, sub: "average burn",                tone: burnRate < 1.5 ? "heat-bad" : burnRate < 3 ? "heat-warn" : "heat-good" },
            { eyebrow: "Filled",   value: `${budget.slotsFilled}/${budget.slotsTotal}`, sub: "roster",   tone: "text-foreground" },
          ].map((s) => (
            <div key={s.eyebrow} className="room-card p-4">
              <div className="room-eyebrow">{s.eyebrow}</div>
              <div className={`room-mono text-2xl mt-1 ${s.tone}`}>{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </section>

        {/* ===== TWO-COLUMN — needs + targets ===== */}
        <section className="grid md:grid-cols-2 gap-3 md:gap-4 mt-4">
          {/* Team needs */}
          <div className="room-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="room-eyebrow">Team needs</div>
                <div className="room-display text-xl mt-0.5">Where you're thin</div>
              </div>
              <Trophy className="h-5 w-5 text-foreground/40" />
            </div>
            <div className="mt-4 space-y-2">
              {need.filter((n) => n.need > 0).map((n) => {
                const pct = n.need > 0 ? (n.have / n.need) * 100 : 100;
                const tone = n.short === 0 ? "heat-good" : n.short >= 2 ? "heat-bad" : "heat-warn";
                return (
                  <div key={n.pos} className="flex items-center gap-3">
                    <div className="w-10 room-mono text-sm">{n.pos}</div>
                    <div className="flex-1 h-2 rounded-full bg-foreground/8 overflow-hidden">
                      <div className="h-full"
                           style={{ width: `${Math.min(100, pct)}%`, background: n.short === 0 ? "hsl(138 75% 48%)" : n.short >= 2 ? "hsl(0 78% 58%)" : "hsl(38 90% 60%)" }} />
                    </div>
                    <div className={`room-mono text-xs ${tone} w-20 text-right`}>
                      {n.have}/{n.need} {n.short > 0 ? `· need ${n.short}` : "✓"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Targets snapshot */}
          <div className="room-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="room-eyebrow">Dream list</div>
                <div className="room-display text-xl mt-0.5">Who you still want</div>
              </div>
              <button onClick={() => navigate("/targets")} className="text-xs room-label text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1">
                All targets <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            {topTargets.length === 0 ? (
              <div className="mt-4 text-sm text-muted-foreground">
                No targets pinned. Add players from the live draft to build your dream list.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-foreground/8">
                {topTargets.map((t) => (
                  <div key={t.name} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium">{t.name}</div>
                      <div className="text-[11px] text-muted-foreground room-label">{t.pos || "—"}</div>
                    </div>
                    <div className="room-mono text-sm text-[hsl(var(--primary))]">
                      {t.price ? `$${t.price}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== STRATEGY + MISSED MEMORIES ===== */}
        <section className="grid md:grid-cols-2 gap-3 md:gap-4 mt-4">
          <div className="room-card p-5 relative overflow-hidden">
            <div className="absolute -top-10 -left-6 w-40 h-40 rounded-full opacity-20 blur-3xl"
                 style={{ background: "radial-gradient(circle, hsl(16 88% 56%), transparent 70%)" }} />
            <div className="room-eyebrow">Plan of attack</div>
            <div className="room-display text-xl mt-0.5">{strat?.label || "No strategy set"}</div>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
              {strat?.short || "Pick a draft strategy to anchor every recommendation."}
            </p>
            {draftPlan?.content && (
              <p className="mt-3 text-xs text-foreground/70 italic line-clamp-3">"{draftPlan.content}"</p>
            )}
            <button onClick={() => navigate("/strategy")} className="mt-3 text-xs room-label text-[hsl(var(--primary))] hover:underline inline-flex items-center gap-1">
              Open strategy room <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Missed memories — Eternal Sunshine for the budget */}
          <div className="room-card p-5">
            <div className="room-eyebrow">Missed</div>
            <div className="room-display text-xl mt-0.5">Players you let go</div>
            {missed.length === 0 ? (
              <div className="mt-3 text-sm text-muted-foreground">No missed targets yet. They will fade in here.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {missed.map((m) => (
                  <div key={m.name} className="memory-fade flex items-baseline justify-between text-sm">
                    <div>
                      <span className="font-medium text-foreground/85">{m.name}</span>
                      <span className="ml-2 text-[10px] room-label text-muted-foreground">{m.pos || ""}</span>
                    </div>
                    <div className="room-mono text-xs text-foreground/65">
                      sold ${m.sold}{m.ref ? ` · sheet $${m.ref}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ===== RECENT TICKER + QUICK LINKS ===== */}
        {events.length > 0 && (
          <section className="mt-4 room-card p-3 overflow-hidden">
            <div className="flex items-center gap-3 text-xs">
              <span className="room-eyebrow text-[hsl(var(--accent))] shrink-0">Tape</span>
              <div className="flex-1 overflow-hidden whitespace-nowrap">
                <div className="inline-flex gap-6 room-ticker">
                  {[...events.slice(-12), ...events.slice(-12)].map((e, i) => {
                    const ref = prices.find((p) => norm(p.name) === norm(e.player));
                    const v = ref ? e.price - ref.price : 0;
                    const tone = !ref ? "text-muted-foreground" : v < -2 ? "heat-good" : v > 2 ? "heat-bad" : "text-foreground/70";
                    return (
                      <span key={i} className="room-mono">
                        <span className="text-foreground/85">{e.player}</span>
                        <span className="text-muted-foreground"> · ${e.price}</span>
                        {ref ? <span className={`ml-1 ${tone}`}>({v >= 0 ? "+" : ""}{v})</span> : null}
                        <span className="text-muted-foreground/50"> · {e.position || "—"}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
          {[
            { Icon: Radio,      label: "Live draft",   to: "/draft" },
            { Icon: Target,     label: "Targets",      to: "/targets" },
            { Icon: TrendingUp, label: "Room",         to: "/market" },
            { Icon: Compass,    label: "Strategy",     to: "/strategy" },
          ].map((q) => (
            <button key={q.label} onClick={() => navigate(q.to)}
              className="room-card p-3 flex items-center gap-2 hover:bg-foreground/5 transition-colors">
              <q.Icon className="h-4 w-4 text-[hsl(var(--primary))]" />
              <span className="text-sm room-label">{q.label}</span>
              <ArrowRight className="h-3 w-3 ml-auto text-foreground/40" />
            </button>
          ))}
        </section>
      </div>
    </WarRoomShell>
  );
}
