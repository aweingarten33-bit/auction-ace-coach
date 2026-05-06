// /draft-os — new shell layout (Top Status / Decision Rail / Mode / Tabs / Planner Bar).
// Read-only against the store; reuses existing assistant + decision logic patterns.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useMutation } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, X } from "lucide-react";

import { useDraftStore } from "@/lib/draft-store";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import {
  computeBudget, countByPosition, recentRuns, spendByPosition,
} from "@/lib/draft-math";
import { computeMarketPulse } from "@/lib/value";
import { decide } from "@/lib/decision-engine";
import { getStrategy } from "@/lib/strategies";
import { ApiError, streamCoach } from "@/lib/api";
import { Position } from "@/lib/draft-types";
import CoachMessage from "@/components/CoachMessage";

type Tab = "assistant" | "players";
type Mode = "setup" | "draft";

export default function DraftOS() {
  const navigate = useNavigate();
  const {
    settings, keepers, prices, events, setupComplete,
    strategyId, quickPrompts,
  } = useDraftStore();
  const strategy = getStrategy(strategyId);

  useEffect(() => { if (!setupComplete) navigate("/"); }, [setupComplete, navigate]);

  const espnSync = useEspnLiveSync({ expectingEvents: setupComplete });
  const liveBid = espnSync.liveBid;

  // ---------- derived ----------
  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);
  const myItems = useMemo(() => [
    ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
    ...events.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
  ], [keepers, events]);
  const myCount = useMemo(() => countByPosition(myItems), [myItems]);
  const spend = useMemo(() => spendByPosition(events), [events]);
  const runs = useMemo(() => recentRuns(events, 6), [events]);
  const pulse = useMemo(() => computeMarketPulse(events, prices), [events, prices]);

  const requiredCount = {
    QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB, WR: settings.roster.WR, TE: settings.roster.TE,
    K: settings.roster.K, DST: settings.roster.DST,
    FLEX: settings.roster.FLEX, BENCH: settings.roster.BENCH,
  };

  const decision = liveBid?.player
    ? decide({ settings, keepers, events, prices,
        player: liveBid.player,
        position: (liveBid.position as Position) || undefined,
        currentPrice: liveBid.price || 0 })
    : null;

  // ---------- decision rail cards ----------
  const railCards = useMemo(() => {
    const out: { label: string; tone: string; primary: string; sub: string }[] = [];
    if (decision?.hasPlayer) {
      const tone =
        decision.verdict === "BID" ? "text-success"
        : decision.verdict === "STOP" ? "text-destructive"
        : "text-warning";
      out.push({
        label: decision.verdict,
        tone,
        primary: `$${decision.goUpTo}`,
        sub: decision.player,
      });
    } else {
      out.push({ label: "WAIT", tone: "text-warning", primary: "Hold", sub: "No live bid" });
    }
    out.push({
      label: "BUDGET",
      tone: "text-foreground",
      primary: `$${budget.remaining}`,
      sub: `${budget.slotsLeft}/${budget.slotsTotal} spots`,
    });
    out.push({
      label: "MAX BID",
      tone: "text-primary",
      primary: `$${budget.maxBid}`,
      sub: `avg $${budget.avgPerSlot}`,
    });
    return out;
  }, [decision, budget]);

  // ---------- mode + tab + planner ----------
  const [mode, setMode] = useState<Mode>("draft");
  const [tab, setTab] = useState<Tab>("assistant");
  const [showPlanner, setShowPlanner] = useState(false);
  const [search, setSearch] = useState("");

  // Planner per-position spend vs target (target = avg per required slot)
  const plannerRows = useMemo(() => {
    const rows: { pos: string; spent: number; target: number }[] = [];
    const positions: Position[] = ["QB", "RB", "WR", "TE", "K", "DST"];
    const totalRequired = Math.max(1,
      requiredCount.QB + requiredCount.RB + requiredCount.WR + requiredCount.TE +
      requiredCount.K + requiredCount.DST + requiredCount.FLEX + requiredCount.BENCH);
    const dollarsPerSlot = settings.totalBudget / totalRequired;
    for (const p of positions) {
      const need = requiredCount[p];
      if (!need) continue;
      rows.push({ pos: p, spent: spend[p] || 0, target: Math.round(dollarsPerSlot * need) });
    }
    if (requiredCount.FLEX) rows.push({ pos: "FLEX", spent: 0, target: Math.round(dollarsPerSlot * requiredCount.FLEX) });
    if (requiredCount.BENCH) rows.push({ pos: "BENCH", spent: 0, target: Math.round(dollarsPerSlot * requiredCount.BENCH) });
    return rows;
  }, [requiredCount, spend, settings.totalBudget]);

  // ---------- players list ----------
  const draftedSet = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    return new Set([...events.map((e) => norm(e.player)), ...keepers.map((k) => norm(k.player))]);
  }, [events, keepers]);

  const filteredPlayers = useMemo(() => {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const q = search.trim().toLowerCase();
    return prices
      .filter((p) => !draftedSet.has(norm(p.name)))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.price - a.price)
      .slice(0, 50);
  }, [prices, draftedSet, search]);

  // ---------- assistant ----------
  const [coachText, setCoachText] = useState("");
  const [coachHistory, setCoachHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);

  const askCoach = async (q: string) => {
    if (!q.trim() || streaming) return;
    setStreaming(true); setCoachText("");
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

  return (
    <div className="relative flex h-screen flex-col bg-background text-foreground font-manly">
      {/* TOP STATUS BAR */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4 text-xs">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/draft")} className="text-muted-foreground hover:text-foreground">v1</button>
          <span className="font-mono font-semibold tabular-nums">${budget.remaining}</span>
        </div>
        <span className="font-mono text-muted-foreground tabular-nums">{budget.slotsLeft}/{budget.slotsTotal}</span>
      </div>

      {/* DECISION CARD RAIL */}
      <div className="flex shrink-0 gap-3 overflow-x-auto border-b border-border bg-background px-4 py-2">
        {railCards.map((c, i) => (
          <Card key={i} className="min-w-[180px] shrink-0 rounded-xl border p-3">
            <div className={`text-[10px] font-semibold uppercase tracking-wider ${c.tone}`}>{c.label}</div>
            <div className="text-sm font-bold">{c.primary}</div>
            <div className="text-[11px] text-muted-foreground truncate">{c.sub}</div>
          </Card>
        ))}
      </div>

      {/* MODE SWITCH */}
      <div className="flex shrink-0 border-b border-border bg-card">
        {(["setup", "draft"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2 text-xs uppercase tracking-wider ${
              mode === m ? "border-b-2 border-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* MAIN NAV */}
      <div className="flex shrink-0 border-b border-border bg-card">
        {(["assistant", "players"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm uppercase tracking-wider ${
              tab === t ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div ref={coachRef} className="flex-1 overflow-y-auto p-4 pb-20">
        {tab === "assistant" && (
          <div className="space-y-4">
            <Card className="border bg-card p-4 text-sm">
              {mode === "draft"
                ? decision?.hasPlayer
                  ? <><span className="font-semibold">{decision.verdict}</span> on {decision.player} — up to <span className="font-mono">${decision.goUpTo}</span>, stop <span className="font-mono">${decision.stopAt}</span>.</>
                  : "No live nominee. Ask anything — I see your budget, roster, prices, and the room."
                : "Setup mode: review your roster targets and budget allocation in the planner below."}
            </Card>

            {/* quick prompts */}
            <div className="flex flex-wrap gap-2">
              {quickPrompts.slice(0, 4).map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant="outline"
                  disabled={streaming}
                  onClick={() => askCoach(b.prompt)}
                >
                  {b.label}
                </Button>
              ))}
            </div>

            {/* chat history */}
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

            {/* free-form input */}
            <form
              className="flex gap-2 pt-2"
              onSubmit={(e) => { e.preventDefault(); const q = followUp; setFollowUp(""); askCoach(q); }}
            >
              <Input
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Ask the coach…"
                disabled={streaming}
              />
              <Button type="submit" disabled={streaming || !followUp.trim()}>Ask</Button>
            </form>
          </div>
        )}

        {tab === "players" && (
          <div>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search players..."
              className="mb-3"
            />
            <div className="space-y-2">
              {filteredPlayers.length === 0 && (
                <div className="text-sm text-muted-foreground">No players match.</div>
              )}
              {filteredPlayers.map((p) => (
                <Card key={p.name} className="flex items-center justify-between border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    {p.position && (
                      <div className="text-[11px] uppercase text-muted-foreground">{p.position}</div>
                    )}
                  </div>
                  <div className="font-mono font-semibold tabular-nums">${p.price}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PERSISTENT PLANNER BAR */}
      <button
        onClick={() => setShowPlanner(true)}
        className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center overflow-x-auto border-t border-border bg-card px-4 text-xs"
      >
        <div className="flex gap-6 whitespace-nowrap">
          {plannerRows.map((r) => (
            <span key={r.pos} className="flex items-center gap-1.5">
              <span className="font-semibold">{r.pos}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                ${r.spent}<span className="opacity-50">/${r.target}</span>
              </span>
            </span>
          ))}
        </div>
      </button>

      {/* EXPANDABLE PLANNER SHEET */}
      {showPlanner && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setShowPlanner(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-2xl border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider">Budget Planner</span>
              <button onClick={() => setShowPlanner(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {plannerRows.map((r) => {
                const pct = r.target > 0 ? Math.min(100, Math.round((r.spent / r.target) * 100)) : 0;
                return (
                  <Card key={r.pos} className="border p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{r.pos}</div>
                    <div className="mt-1 font-mono text-lg font-bold tabular-nums">${r.spent}</div>
                    <div className="text-[11px] text-muted-foreground">target ${r.target}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </Card>
                );
              })}
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => { setShowPlanner(false); navigate("/planner"); }}
            >
              Open Full Planner
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
