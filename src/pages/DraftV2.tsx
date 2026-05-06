// /draft-v2 — new layout from user mockups (desktop + mobile).
// READ-ONLY against existing data: reuses store + ESPN sync hook + components.
// Does NOT modify any ESPN/Sleeper logic, store actions, or pricing.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sparkles, ChevronLeft, MessageSquare, Target, Layers, Users, History, ArrowUp, Sun, Moon, Trophy } from "lucide-react";
import coachBotImg from "@/assets/coach-bot.png";

import { useDraftStore } from "@/lib/draft-store";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import {
  computeBudget, countByPosition, recentRuns, spendByPosition,
} from "@/lib/draft-math";
import { computeMarketPulse, valueFor as computeValueFor, whatIfPick } from "@/lib/value";
import { decide } from "@/lib/decision-engine";
import { computeDrain, computeGet } from "@/lib/nomination";
import { getStrategy } from "@/lib/strategies";
import { ApiError, fetchTargets, streamCoach } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { Position, PriceEstimate } from "@/lib/draft-types";

import LiveBidStrip from "@/components/LiveBidStrip";
import DecisionCard from "@/components/DecisionCard";
import RosterHero, { SlotRow, BestTarget } from "@/components/RosterHero";
import NominationCard from "@/components/NominationCard";
import UpNextQueue, { QueueTarget } from "@/components/UpNextQueue";
import Watchlist from "@/components/Watchlist";
import MarketHeat from "@/components/MarketHeat";
import TierBreakAlerts from "@/components/TierBreakAlerts";
import CoachMessage from "@/components/CoachMessage";

type MobileTab = "decision" | "planner" | "targets" | "market" | "log";

export default function DraftV2() {
  const navigate = useNavigate();
  const {
    settings, keepers, prices, events, setupComplete, watchlist, dismissed,
    pinPlayer, unpinPlayer, dismissPlayer, strategyId, quickPrompts,
  } = useDraftStore();
  const strategy = getStrategy(strategyId);

  useEffect(() => { if (!setupComplete) navigate("/"); }, [setupComplete, navigate]);

  const espnSync = useEspnLiveSync({ expectingEvents: setupComplete });

  // ---------- derived (read-only) ----------
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);
  const myItems = useMemo(() => [
    ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
    ...events.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
  ], [keepers, events]);
  const myCount = useMemo(() => countByPosition(myItems), [myItems]);
  const spend = useMemo(() => spendByPosition(events), [events]);
  const runs = useMemo(() => recentRuns(events, 6), [events]);
  const pulse = useMemo(() => computeMarketPulse(events, prices), [events, prices]);
  const valueFor = useMemo(
    () => (name: string, bid: number) => computeValueFor(name, bid, prices, pulse),
    [prices, pulse]
  );

  const requiredCount = {
    QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB, WR: settings.roster.WR, TE: settings.roster.TE,
    K: settings.roster.K, DST: settings.roster.DST,
    FLEX: settings.roster.FLEX, BENCH: settings.roster.BENCH,
  };
  const flexNeed = requiredCount.FLEX;
  const flexHave = Math.max(0,
    (myCount.RB - requiredCount.RB) + (myCount.WR - requiredCount.WR) + (myCount.TE - requiredCount.TE));
  const flexShort = Math.max(0, flexNeed - flexHave);

  const gaps = (["QB","RB","WR","TE","DST","K"] as const)
    .filter((p) => requiredCount[p] > 0)
    .map((pos) => {
      const starterHave = Math.min(myCount[pos], requiredCount[pos]);
      const starterShort = Math.max(0, requiredCount[pos] - starterHave);
      const severity: "critical"|"need"|"depth"|"done" =
        starterShort >= 2 ? "critical"
        : starterShort === 1 ? "need"
        : myCount[pos] < requiredCount[pos] + 1 && (pos === "RB" || pos === "WR") ? "depth"
        : "done";
      return { pos, starterHave, starterNeed: requiredCount[pos], starterShort, severity };
    })
    .sort((a,b) => ({critical:0,need:1,depth:2,done:3} as const)[a.severity] - ({critical:0,need:1,depth:2,done:3} as const)[b.severity]);

  const startersTotal = requiredCount.QB+requiredCount.RB+requiredCount.WR+requiredCount.TE+requiredCount.K+requiredCount.DST+requiredCount.FLEX;
  const startersFilled = Math.min(startersTotal,
    Math.min(myCount.QB,requiredCount.QB)+Math.min(myCount.RB,requiredCount.RB)+
    Math.min(myCount.WR,requiredCount.WR)+Math.min(myCount.TE,requiredCount.TE)+
    Math.min(myCount.K,requiredCount.K)+Math.min(myCount.DST,requiredCount.DST)+
    Math.min(flexHave,flexNeed));
  const benchFilled = Math.max(0, myItems.length - startersFilled);

  const whatIfFor = (pos: Position, bid: number) =>
    whatIfPick(settings, keepers, events, myCount, requiredCount, pos, bid);

  const heroRows: SlotRow[] = useMemo(() => {
    const sevW = { critical: 2.6, need: 1.9, depth: 1.05, done: 0.4 } as const;
    const cap = budget.maxBid, avg = budget.avgPerSlot;
    const rows: SlotRow[] = gaps.map((g) => ({
      pos: g.pos as Position, have: g.starterHave, need: g.starterNeed, short: g.starterShort,
      maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevW[g.severity]))),
      severity: g.severity,
    }));
    if (flexNeed > 0) {
      const sev = flexShort > 0 ? "need" : "done";
      rows.push({ pos: "FLEX", have: flexHave, need: flexNeed, short: flexShort,
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevW[sev]))), severity: sev });
    }
    if (requiredCount.BENCH > 0) {
      const sev = benchFilled >= requiredCount.BENCH ? "done" : "depth";
      rows.push({ pos: "BENCH", have: benchFilled, need: requiredCount.BENCH,
        short: Math.max(0, requiredCount.BENCH - benchFilled),
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevW[sev]))), severity: sev });
    }
    return rows;
  }, [gaps, flexNeed, flexHave, flexShort, requiredCount.BENCH, benchFilled, budget.maxBid, budget.avgPerSlot]);

  const bestTarget: BestTarget | null = useMemo(() => {
    if (budget.slotsLeft <= 0 || budget.maxBid <= 0) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const drafted = new Set([...events.map(e=>norm(e.player)), ...keepers.map(k=>norm(k.player))]);
    const priority = heroRows.filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX" && r.short > 0);
    const fallback = heroRows.filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX");
    const ordered = priority.length ? priority : fallback;
    for (const row of ordered) {
      const pos = row.pos as Position;
      const candidates = prices
        .filter((p: PriceEstimate) => {
          if (drafted.has(norm(p.name))) return false;
          if ((p as { position?: Position }).position && (p as { position?: Position }).position !== pos) return false;
          return p.price > 0 && p.price <= Math.max(row.maxBid, budget.maxBid);
        })
        .sort((a,b) => b.price - a.price);
      const top = candidates[0];
      if (top) {
        const v = valueFor(top.name, Math.min(top.price, row.maxBid));
        return {
          name: top.name, position: pos,
          maxBid: Math.min(row.maxBid, budget.maxBid),
          reason: `${row.severity === "critical" ? `Plugs ${pos} hole` : row.severity === "need" ? `Fills ${pos} starter` : `Best ${pos} value`}${v?.verdict && v.verdict !== "unknown" ? ` · ${v.verdict}` : ""} · market $${top.price}`,
        };
      }
    }
    return null;
  }, [heroRows, prices, events, keepers, budget.slotsLeft, budget.maxBid, valueFor]);

  // Live decision based on ESPN bid (or empty)
  const liveBid = espnSync.liveBid;
  const decision = liveBid?.player
    ? decide({ settings, keepers, events, prices,
        player: liveBid.player,
        position: (liveBid.position as Position) || undefined,
        currentPrice: liveBid.price || 0 })
    : null;

  // ---------- targets queue ----------
  const [queue, setQueue] = useState<QueueTarget[]>([]);
  const [openMan, setOpenMan] = useState<string | undefined>(undefined);
  const targetsMutation = useMutation({
    mutationFn: () => fetchTargets({
      settings: { totalBudget: settings.totalBudget, numTeams: settings.numTeams,
        scoring: settings.scoring, leagueType: settings.leagueType,
        format: settings.format, context: settings.context },
      budget, myRoster: myItems, rosterRequired: requiredCount, rosterFilled: myCount,
      gaps: gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort })),
      events, prices, spendByPosition: spend, recentRuns: runs, dismissed, watchlist,
    }),
    onSuccess: ({ targets, openMan }) => {
      setQueue(targets.filter((t) => !dismissed.includes(t.name)));
      setOpenMan(openMan);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Queue unavailable."),
  });

  // ---------- coach (chat) ----------
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachText, setCoachText] = useState("");
  const [coachHistory, setCoachHistory] = useState<{ role: "user"|"assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);

  const askCoach = async (q: string) => {
    setCoachOpen(true); setStreaming(true); setCoachText("");
    setCoachHistory((h) => [...h, { role: "user", content: q }]);
    let acc = "";
    try {
      await streamCoach({
        settings: { totalBudget: settings.totalBudget, numTeams: settings.numTeams,
          scoring: settings.scoring, leagueType: settings.leagueType,
          format: settings.format, keeperIncrease: settings.keeperIncrease, context: settings.context },
        budget, keepers, myRoster: myItems,
        rosterRequired: requiredCount, rosterFilled: myCount,
        events, prices, spendByPosition: spend, recentRuns: runs,
        userQuestion: q, vetriTakes: [], history: coachHistory.slice(-6),
        draftedPlayers: events.map((e) => e.player), showMath: true,
        strategy: { id: strategy.id, label: strategy.label, guidance: strategy.coachGuidance },
      }, (chunk) => { acc += chunk; setCoachText(acc); coachRef.current?.scrollTo({ top: 1e9 }); });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Assistant error");
      setCoachText("⚠️ Assistant unavailable."); setStreaming(false); return;
    } finally { setStreaming(false); }
    if (acc) setCoachHistory((h) => [...h, { role: "assistant", content: acc }]);
  };

  // ---------- mobile tab + theme ----------
  const [tab, setTab] = useState<MobileTab>("decision");
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    (typeof localStorage !== "undefined" && (localStorage.getItem("draft-v2-theme") as "dark" | "light")) || "dark"
  );
  useEffect(() => { localStorage.setItem("draft-v2-theme", theme); }, [theme]);

  // ---------- top-rail card data (existing signals) ----------
  const railCards = useMemo(() => {
    const out: { kind: string; title: string; body: string; tone: string }[] = [];
    if (decision && decision.hasPlayer) {
      out.push({
        kind: "decision",
        title: `${decision.verdict} · ${decision.player}`,
        body: `Up to $${decision.goUpTo} · stop $${decision.stopAt}`,
        tone: decision.verdict === "BID" ? "border-success/50 bg-success/5"
          : decision.verdict === "STOP" ? "border-destructive/50 bg-destructive/5"
          : "border-warning/40 bg-warning/5",
      });
    }
    const critical = heroRows.find((r) => r.severity === "critical");
    const need = heroRows.find((r) => r.severity === "need");
    const gap = critical || need;
    if (gap) {
      out.push({
        kind: "gap",
        title: `${gap.pos} ${gap.severity === "critical" ? "hole" : "open starter"}`,
        body: `${gap.have}/${gap.need} filled · max $${gap.maxBid}`,
        tone: gap.severity === "critical" ? "border-destructive/50 bg-destructive/5" : "border-warning/40 bg-warning/5",
      });
    }
    if (bestTarget) {
      out.push({
        kind: "target",
        title: `Target: ${bestTarget.name}`,
        body: `${bestTarget.position} · up to $${bestTarget.maxBid}`,
        tone: "border-primary/40 bg-primary/5",
      });
    }
    out.push({
      kind: "budget",
      title: `$${budget.remaining} left`,
      body: `${budget.slotsLeft}/${budget.slotsTotal} spots · max $${budget.maxBid}`,
      tone: "border-border bg-card",
    });
    return out;
  }, [decision, heroRows, bestTarget, budget]);

  // ---------- render ----------
  return (
    <div className={`${theme === "light" ? "theme-light" : ""} font-manly flex h-screen flex-col bg-background text-foreground`}>
      {/* SCOREBUG TOP BAR — broadcast lower-third feel */}
      <header className="relative flex h-16 shrink-0 items-stretch border-b-4 border-primary bg-card text-sm overflow-hidden">
        {/* Diagonal accent stripe (Fox-broadcast feel) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-primary"
          style={{ clipPath: "polygon(0 0, 100% 0, 60% 100%, 0 100%)" }}
        />
        {/* TEAM tag — like home team box */}
        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 ml-3" style={{ clipPath: "polygon(0 0, 100% 0, 92% 100%, 0 100%)" }}>
          <Trophy className="h-4 w-4" strokeWidth={3} />
          <span className="font-black uppercase tracking-widest text-[13px]">YOU</span>
        </div>
        {/* Score / cash on hand */}
        <div className="flex items-center gap-1 bg-foreground text-background px-4">
          <span className="text-[9px] font-black uppercase tracking-widest opacity-70">CASH</span>
          <span className="font-black text-2xl tabular-nums leading-none">${budget.remaining}</span>
        </div>
        {/* Down & distance — slots / max bid */}
        <div className="hidden sm:flex items-center gap-3 px-4 border-l-2 border-border">
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">SPOTS</span>
            <span className="font-black text-base tabular-nums">{budget.slotsLeft}/{budget.slotsTotal}</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">MAX</span>
            <span className="font-black text-base tabular-nums text-primary">${budget.maxBid}</span>
          </div>
        </div>
        {/* Live bid ticker (chyron) */}
        {liveBid?.player && (
          <div className="hidden md:flex flex-1 items-center gap-2 bg-destructive text-destructive-foreground px-4 min-w-0">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-current animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest shrink-0">ON THE BLOCK</span>
            <span className="truncate font-bold uppercase tracking-wide">{liveBid.player}</span>
            <span className="ml-auto font-black tabular-nums">${liveBid.price}</span>
          </div>
        )}
        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-1 px-3 border-l-2 border-border">
          <button
            onClick={() => navigate("/draft")}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground px-2"
            title="v1"
          >
            <ChevronLeft className="inline h-3 w-3" />V1
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center border-2 border-border text-muted-foreground hover:text-foreground hover:border-primary"
            title={theme === "dark" ? "Day game" : "Night game"}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => navigate("/planner")}
            className="bg-primary text-primary-foreground px-3 h-8 font-black uppercase tracking-widest text-[10px] hover:opacity-90"
          >
            Playbook
          </button>
        </div>
      </header>

      {/* CHYRON RAIL — broadcast lower-third cards */}
      <div className="flex shrink-0 gap-0 overflow-x-auto border-b-2 border-border bg-card">
        {railCards.map((c, i) => (
          <div
            key={i}
            className={`relative min-w-[240px] md:min-w-[280px] shrink-0 border-r-2 border-border px-4 py-2.5 ${c.tone}`}
          >
            {/* left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              {c.kind}
            </div>
            <div className="mt-0.5 text-base font-black uppercase tracking-wide truncate">{c.title}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{c.body}</div>
          </div>
        ))}
      </div>

      {/* MAIN — desktop: 60/40 split. mobile: tab-driven single column. */}
      <main className="flex flex-1 overflow-hidden">
        {/* LEFT / DESKTOP — Assistant (mobile shows under tab=decision) */}
        <section className={`${tab === "decision" ? "flex" : "hidden"} md:flex w-full md:w-[60%] flex-col border-r border-border bg-card`}>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Assistant
            <span className="ml-auto text-[10px] font-normal text-muted-foreground">
              {streaming ? "thinking…" : "live context"}
            </span>
          </div>

          <div ref={coachRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            <LiveBidStrip bid={liveBid} recommendedMax={budget.maxBid} />
            {decision && <DecisionCard d={decision} />}

            {coachHistory.length === 0 && !streaming && !decision && (
              <Card className="bg-muted/40 p-4 text-sm text-muted-foreground">
                Ask anything. I see your budget, roster, prices, and the room.
              </Card>
            )}
            {coachHistory.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-secondary px-3 py-1.5 text-[13px]">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div key={i} className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1"><CoachMessage content={m.content} /></div>
              </div>
            ))}
            {streaming && coachText && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1"><CoachMessage content={coachText} /></div>
              </div>
            )}
          </div>

          {/* quick prompts + input */}
          <div className="border-t border-border px-3 pb-3 pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.slice(0, 4).map((b) => (
                <Button key={b.id} size="sm" variant="outline" disabled={streaming}
                  onClick={() => askCoach(b.prompt)}
                  className="h-7 rounded-full px-2.5 text-[11px] font-normal text-muted-foreground hover:text-foreground">
                  {b.label}
                </Button>
              ))}
            </div>
            <div className="flex items-end gap-2 rounded-2xl border-2 border-primary/40 bg-background px-3 py-1.5 focus-within:border-primary">
              <Input
                placeholder='Ask… e.g. "Should I bid on Bijan?"'
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && followUp.trim()) {
                    const q = followUp.trim(); setFollowUp(""); askCoach(q);
                  }
                }}
                disabled={streaming}
                className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button size="sm" disabled={streaming || !followUp.trim()}
                onClick={() => { const q = followUp.trim(); setFollowUp(""); askCoach(q); }}
                className="h-9 w-9 shrink-0 rounded-full p-0">
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* RIGHT / DESKTOP — Planner (mobile = tab=planner) */}
        <section className={`${tab === "planner" ? "block" : "hidden"} md:block w-full md:w-[40%] overflow-y-auto bg-muted/20 p-4 space-y-4`}>
          <RosterHero
            remaining={budget.remaining}
            slotsLeft={budget.slotsLeft}
            slotsTotal={budget.slotsTotal}
            maxBid={budget.maxBid}
            rows={heroRows}
            bestTarget={bestTarget}
            onLoadTarget={(name) => { askCoach(`Should I target ${name}? What's my max bid?`); }}
          />
          <NominationCard
            drain={computeDrain({ settings, keepers, events, prices })}
            get={computeGet({ settings, keepers, events, prices })}
            aiSuggestions={[]}
            aiLoading={false}
            onAskAi={() => askCoach("Who should I nominate next to drain other teams?")}
            onPickAi={() => {}}
          />
          <TierBreakAlerts prices={prices} events={events} keepers={keepers} />
        </section>

        {/* MOBILE-ONLY tabs: targets / market / log */}
        {tab === "targets" && (
          <section className="block md:hidden w-full overflow-y-auto bg-muted/20 p-4 space-y-4">
            <UpNextQueue
              targets={queue}
              openMan={openMan}
              loading={targetsMutation.isPending}
              empty={!queue.length}
              pulseMultiplier={pulse.multiplier}
              pulseConfident={pulse.confident}
              watchlist={watchlist}
              onRefresh={() => targetsMutation.mutate()}
              onPick={(t) => askCoach(`Should I bid on ${t.name}? Max?`)}
              onPin={(n) => { pinPlayer(n); toast(`Pinned ${n}`); }}
              onUnpin={(n) => unpinPlayer(n)}
              onDismiss={(n) => { dismissPlayer(n); setQueue((q) => q.filter((t) => t.name !== n)); }}
              valueFor={valueFor}
              whatIfFor={whatIfFor}
            />
            <Watchlist
              watchlist={watchlist}
              onUnpin={(n) => unpinPlayer(n)}
              onLoad={(n) => askCoach(`Tell me about ${n}.`)}
              valueFor={valueFor}
              maxBid={budget.maxBid}
            />
          </section>
        )}
        {tab === "market" && (
          <section className="block md:hidden w-full overflow-y-auto bg-muted/20 p-4 space-y-4">
            <MarketHeat
              events={events} prices={prices}
              gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
              maxBid={budget.maxBid} remaining={budget.remaining}
              pulseMultiplier={pulse.multiplier}
            />
          </section>
        )}
        {tab === "log" && (
          <section className="block md:hidden w-full overflow-y-auto bg-muted/20 p-4">
            <Card className="p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Draft Log · {events.length}
              </div>
              {events.length ? (
                <ul className="space-y-0">
                  {[...events].reverse().map((e) => (
                    <li key={e.id} className="flex items-baseline gap-2 border-b border-border/30 py-1.5 last:border-b-0">
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${e.drafter === "me" ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className={e.drafter === "me" ? "font-medium text-primary" : "text-foreground"}>{e.player}</span>
                        {e.position && <span className="ml-1.5 text-[10px] uppercase text-muted-foreground">{e.position}</span>}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">${e.price}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-xs text-muted-foreground">No picks yet.</p>}
            </Card>
          </section>
        )}
      </main>

      {/* DESKTOP BOTTOM NAV */}
      <nav className="hidden md:flex h-12 shrink-0 items-center gap-6 border-t border-border bg-card px-6 text-sm">
        <button onClick={() => targetsMutation.mutate()} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Target className="h-4 w-4" /> Targets
        </button>
        <button onClick={() => askCoach("Who should I nominate next?")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Layers className="h-4 w-4" /> Nomination
        </button>
        <button onClick={() => navigate("/draft")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <Users className="h-4 w-4" /> Players
        </button>
        <button onClick={() => navigate("/draft")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <History className="h-4 w-4" /> History
        </button>
        <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">
          RB ${spend.RB ?? 0} · WR ${spend.WR ?? 0} · QB ${spend.QB ?? 0}
        </span>
      </nav>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav className="flex md:hidden h-16 shrink-0 items-center justify-around border-t border-border bg-card text-[11px]">
        {([
          { id: "decision", label: "Decide", Icon: Sparkles },
          { id: "planner",  label: "Plan",   Icon: Layers },
          { id: "targets",  label: "Targets",Icon: Target },
          { id: "market",   label: "Market", Icon: Users },
          { id: "log",      label: "Log",    Icon: History },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex h-full flex-1 flex-col items-center justify-center gap-0.5 ${
              tab === id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* COACH SHEET (mobile/desktop fallback for ad-hoc questions when not on Decide tab) */}
      <Sheet open={coachOpen} onOpenChange={setCoachOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="md:hidden fixed bottom-20 right-4 z-30 h-12 w-12 rounded-full p-0 shadow-glow"
            title="Coach"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-[460px]">
          <SheetHeader className="border-b border-border px-3 py-2.5">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <img src={coachBotImg} alt="" className="h-6 w-6 rounded-full object-cover" />
              Coach
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-auto p-4 text-sm">
            {coachHistory.length === 0 && <p className="text-muted-foreground">Ask anything.</p>}
            {coachHistory.map((m, i) => (
              <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}>
                <CoachMessage content={m.content} />
              </div>
            ))}
            {streaming && <CoachMessage content={coachText} />}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Input value={followUp} onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && followUp.trim()) { const q = followUp.trim(); setFollowUp(""); askCoach(q); } }}
                placeholder="Ask…" />
              <Button onClick={() => { if (followUp.trim()) { const q = followUp.trim(); setFollowUp(""); askCoach(q); } }}>Send</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
