// DraftRoom.tsx — calm, minimalist home page for draft night.
//
// Three things always visible:
//  1. Status bar (budget · slots · max bid · live indicator)
//  2. Targets (top 3 from AI engine, simplified card)
//  3. Player lookup (search → decision card fills the screen)
//
// Everything else (Market, Opponent room, Vetri, recent picks, settings)
// lives in a slide-in drawer triggered by the hamburger.
//
// Reuses ALL existing engines: computeBudget, computeMarketPulse, valueFor,
// decide, fetchTargets, useEspnLiveSync. No new backend work needed.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  Menu, Search, Settings, RefreshCw, X, TrendingUp, Users, MessageSquare,
  Mic, History, ChevronRight, Wifi, WifiOff, Pin, PinOff, Check, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useDraftStore } from "@/lib/draft-store";
import { useAuth } from "@/hooks/useAuth";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { STRATEGIES, getStrategy } from "@/lib/strategies";
import { supabase } from "@/integrations/supabase/client";
import {
  computeBudget,
  countByPosition,
  spendByPosition,
  recentRuns,
} from "@/lib/draft-math";
import { computeMarketPulse, valueFor as computeValueFor } from "@/lib/value";
import { decide } from "@/lib/decision-engine";
import { useAnchorMap } from "@/lib/use-anchor-map";
import { ApiError, fetchTargets } from "@/lib/api";
import { Position, PriceEstimate } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";
import { loadSleeperPlayers, searchPlayers, SleeperPlayer } from "@/lib/sleeper";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import DecisionCard from "@/components/DecisionCard";
import MarketHeat from "@/components/MarketHeat";
import CounterAnchorDetector from "@/components/CounterAnchorDetector";
import StealReachCounter from "@/components/StealReachCounter";
import WalletRace from "@/components/WalletRace";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import VetriPlayerSummary from "@/components/VetriPlayerSummary";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";
import MoneyHero from "@/components/MoneyHero";
import AiQuickPanel from "@/components/AiQuickPanel";
import SocialTakes from "@/components/SocialTakes";
import AffordabilityChecker from "@/components/AffordabilityChecker";
import { PlannerBody } from "@/pages/Planner";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DraftRoom() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const {
    settings,
    keepers,
    events,
    prices,
    setupComplete,
    watchlist,
    dismissed,
    pinPlayer,
    unpinPlayer,
    dismissPlayer,
  } = useDraftStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeName, setActiveName] = useState(""); // currently-shown player in the decision card
  const [sleeper, setSleeper] = useState<SleeperPlayer[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSleeperPlayers().then(setSleeper).catch(() => {});
  }, []);

  // Anchor price map: league 3yr avg + ESPN 2026 auction value, used by
  // decide() so off-sheet players show real numbers instead of the wallet cap.
  const { map: anchorMap } = useAnchorMap();
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Force users into setup if it's not done yet
  useEffect(() => {
    if (!setupComplete) navigate("/setup");
  }, [setupComplete, navigate]);

  // Live extension sync — backfills picks, tracks the current nomination
  const espnSync = useEspnLiveSync({ expectingEvents: setupComplete });

  // ── Engines ────────────────────────────────────────────────────────────
  const budget = useMemo(
    () => computeBudget(settings, keepers, events),
    [settings, keepers, events],
  );
  const myItems = useMemo(
    () => [
      ...keepers.map((k) => ({
        player: k.player,
        position: k.position,
        price: k.cost,
        source: "keeper" as const,
      })),
      ...events
        .filter((e) => e.drafter === "me")
        .map((e) => ({
          player: e.player,
          position: e.position,
          price: e.price,
          source: "draft" as const,
        })),
    ],
    [keepers, events],
  );
  const myCount = useMemo(() => countByPosition(myItems), [myItems]);
  const spend = useMemo(() => spendByPosition(events), [events]);
  const runs = useMemo(() => recentRuns(events, 6), [events]);
  const pulse = useMemo(() => computeMarketPulse(events, prices), [events, prices]);
  const valueFor = useMemo(
    () => (name: string, bid: number) => computeValueFor(name, bid, prices, pulse),
    [prices, pulse],
  );

  const requiredCount = {
    QB: settings.roster.QB + (settings.leagueType !== "Standard" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
    FLEX: settings.roster.FLEX,
    BENCH: settings.roster.BENCH,
  };
  const gaps = (["QB", "RB", "WR", "TE", "DST", "K"] as const)
    .filter((p) => requiredCount[p] > 0)
    .map((pos) => {
      const starterHave = Math.min(myCount[pos], requiredCount[pos]);
      const starterNeed = requiredCount[pos];
      const starterShort = Math.max(0, starterNeed - starterHave);
      const severity: "critical" | "need" | "depth" | "done" =
        starterShort >= 2
          ? "critical"
          : starterShort === 1
            ? "need"
            : myCount[pos] < starterNeed + 1 && (pos === "RB" || pos === "WR")
              ? "depth"
              : "done";
      return { pos, starterHave, starterNeed, starterShort, severity };
    });

  // ── Targets queue (AI) ────────────────────────────────────────────────
  const [targets, setTargets] = useState<
    Awaited<ReturnType<typeof fetchTargets>>["targets"]
  >([]);
  const [openMan, setOpenMan] = useState<string | undefined>();
  const targetsMutation = useMutation({
    mutationFn: () =>
      fetchTargets({
        settings: {
          totalBudget: settings.totalBudget,
          numTeams: settings.numTeams,
          scoring: settings.scoring,
          leagueType: settings.leagueType,
          format: settings.format,
          context: settings.context,
        },
        budget,
        myRoster: myItems,
        rosterRequired: requiredCount,
        rosterFilled: myCount,
        gaps: gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort })),
        events,
        prices,
        spendByPosition: spend,
        recentRuns: runs,
        dismissed,
        watchlist,
      }),
    onSuccess: ({ targets, openMan }) => {
      setTargets(targets.filter((t) => !dismissed.includes(t.name)));
      setOpenMan(openMan);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't refresh targets."),
  });

  // First-load and auto-refresh every 12 picks
  useEffect(() => {
    if (!setupComplete) return;
    if (targets.length === 0 && !targetsMutation.isPending) targetsMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupComplete]);
  useEffect(() => {
    if (!setupComplete) return;
    if (events.length > 0 && events.length % 12 === 0) targetsMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, setupComplete]);

  // ── Search → suggestions (Sleeper full NFL DB + price overlay) ───────
  const draftedSet = useMemo(() => new Set(events.map((e) => norm(e.player))), [events]);
  const priceByName = useMemo(() => {
    const m = new Map<string, PriceEstimate>();
    for (const p of prices) m.set(norm(p.name), p);
    return m;
  }, [prices]);
  const suggestions = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];
    // $-amount mode: starts with $ or is pure digits → "what can I afford"
    const dollarMatch = trimmed.match(/^\$?(\d{1,3})$/);
    if (dollarMatch) {
      const target = parseInt(dollarMatch[1], 10);
      if (target <= 0) return [];
      return prices
        .filter((p) => !draftedSet.has(norm(p.name)) && p.price > 0 && p.price <= target)
        .sort((a, b) => b.price - a.price)
        .slice(0, 12)
        .map((p) => ({
          name: p.name,
          position: (p as PriceEstimate & { position?: Position }).position,
          team: null as string | null,
          price: p.price,
        }));
    }
    if (trimmed.length < 2) return [];
    const hits = searchPlayers(sleeper, trimmed, 8).filter(
      (p) => !draftedSet.has(norm(p.full_name)),
    );
    return hits.map((p) => {
      const price = priceByName.get(norm(p.full_name));
      return {
        name: p.full_name,
        position: (price?.position ?? p.position) as Position | undefined,
        team: p.team ?? null,
        price: price?.price ?? null,
      };
    });
  }, [query, sleeper, draftedSet, priceByName, prices]);

  // ── Decision card for active name ─────────────────────────────────────
  const activePrice = useMemo(
    () => prices.find((p) => norm(p.name) === norm(activeName))?.price ?? 0,
    [prices, activeName],
  );
  const activePosition = useMemo(
    () => prices.find((p) => norm(p.name) === norm(activeName))?.position as Position | undefined,
    [prices, activeName],
  );
  const decision = useMemo(() => {
    if (!activeName) return null;
    try {
      return decide({
        settings,
        keepers,
        events,
        prices,
        player: activeName,
        position: activePosition,
        currentPrice: 0, // pre-bid lookup — show me the ceiling, not "what should I bid against $X"
        anchorMap,
      });
    } catch {
      return null;
    }
  }, [activeName, activePosition, settings, keepers, events, prices, anchorMap]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const lockToPlayer = (name: string) => {
    setActiveName(name);
    setQuery("");
  };
  const isPinned = (name: string) => watchlist.includes(name);

  // Live status for the indicator
  const liveColor =
    espnSync.status === "live"
      ? "bg-emerald-500"
      : espnSync.status === "idle"
        ? "bg-emerald-500/60"
        : espnSync.status === "stale"
          ? "bg-amber-500"
          : "bg-rose-500";
  const liveLabel =
    espnSync.status === "live"
      ? "LIVE"
      : espnSync.status === "idle"
        ? "READY"
        : espnSync.status === "stale"
          ? "STALE"
          : "OFFLINE";

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── STICKY STATUS BAR ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-9 w-9"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <DrawerContents
              onClose={() => setDrawerOpen(false)}
              gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
              budget={budget}
              pulseMultiplier={pulse.multiplier}
              events={events}
              prices={prices}
              settings={settings}
              activeName={activeName}
              onSignOut={async () => { await signOut(); navigate("/auth"); }}
              onGoToSetup={() => navigate("/setup")}
              onGoToEspn={() => navigate("/espn")}
              onGoToClassicDraft={() => navigate("/draft")}
              onGoToPlanner={() => navigate("/planner")}
              onLockPlayer={lockToPlayer}
            />
          </Sheet>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MoneyHero
              remaining={budget.remaining}
              total={settings.totalBudget}
              showMax={budget.maxBid > 0}
              maxBid={budget.maxBid}
              slotsLeft={budget.slotsLeft}
            />
          </div>

        </div>

        {/* Live nomination strip — only when something's actively up for bid */}
        {espnSync.liveBid && (
          <div className="border-t border-border/40 bg-secondary/40 px-4 py-1.5">
            <div className="mx-auto flex max-w-3xl flex-col gap-1">
              <p className="flex items-center gap-2 text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                  On the block:
                </span>
                <button
                  type="button"
                  onClick={() => lockToPlayer(espnSync.liveBid!.player)}
                  className="truncate font-medium text-foreground hover:text-primary"
                >
                  {espnSync.liveBid.player}
                </button>
                <span className="ml-auto font-mono tabular-nums text-foreground">
                  ${espnSync.liveBid.price}
                </span>
                {espnSync.liveBid.bidder && (
                  <span className="text-muted-foreground">· {espnSync.liveBid.bidder}</span>
                )}
              </p>
              <CounterAnchorDetector
                player={espnSync.liveBid.player}
                livePrice={espnSync.liveBid.price}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl space-y-3 px-3 pt-2 pb-24">
        {/* How values are calculated — intentionally vague */}
        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] leading-snug text-foreground/85">
          <p>
            <span className="font-semibold text-primary">How we get our numbers:</span>{" "}
            Every price, max bid, and recommendation on this screen comes from a
            proprietary math model — not guesses, and not AI. We blend your
            league's own auction history, current roster needs, remaining budget
            per slot, and live market behavior into a set of equations that
            update in real time as the draft moves.
          </p>
        </div>
        {/* Search moved to menu → "Find (player or $)" */}

        {/* DECISION CARD — popup bubble when a player is locked in */}
        <Dialog open={!!decision} onOpenChange={(o) => { if (!o) setActiveName(""); }}>
          <DialogContent className="top-4 left-1/2 -translate-x-1/2 translate-y-0 max-h-[calc(100dvh-2rem)] w-[94vw] max-w-md overflow-y-auto p-4 data-[state=closed]:slide-out-to-top-0 data-[state=open]:slide-in-from-top-0">
            {decision && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Decision
                  </p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() =>
                        isPinned(activeName) ? unpinPlayer(activeName) : pinPlayer(activeName)
                      }
                    >
                      {isPinned(activeName) ? (
                        <><PinOff className="mr-1 h-3 w-3" />Unpin</>
                      ) : (
                        <><Pin className="mr-1 h-3 w-3" />Pin</>
                      )}
                    </Button>
                  </div>
                </div>
                <DecisionCard d={decision} />
                <div className="mt-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Analyst take
                  </p>
                  <Card className="p-3 text-[12px]">
                    <VetriTakesForPlayer
                      player={activeName}
                      emptyText="No analyst take on this player yet."
                    />
                  </Card>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* BUDGET PLANNER — strategy, slots, affordability, lookup */}
        <PlannerBody />

        {/* WATCHLIST — only shown if user has pinned anyone */}
        {watchlist.length > 0 && (
          <section>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pinned ({watchlist.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {watchlist.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => lockToPlayer(name)}
                  className="rounded-full border border-border bg-secondary/30 px-3 py-1 text-[11px] hover:border-primary/50 hover:bg-secondary/50"
                >
                  {name}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Floating AI tools — chat-bubble FAB. Targets + Coach AI live here. */}
      <Sheet open={aiOpen} onOpenChange={setAiOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open AI tools"
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <Sparkles className="h-6 w-6" />
            {targets.length > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                {targets.length}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[92%] max-w-md flex-col p-0 sm:w-[420px]">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Tools
            </SheetTitle>
          </SheetHeader>
          <AiQuickPanel
            targets={targets}
            targetsLoading={targetsMutation.isPending}
            onRefreshTargets={() => targetsMutation.mutate()}
            onPickTarget={(name) => {
              setAiOpen(false);
              lockToPlayer(name);
            }}
            coachContext={() => ({
              settings: {
                totalBudget: settings.totalBudget, numTeams: settings.numTeams,
                scoring: settings.scoring, leagueType: settings.leagueType,
                format: settings.format, context: settings.context,
              },
              budget, keepers, myRoster: myItems,
              rosterRequired: requiredCount, rosterFilled: myCount,
              events, prices, spendByPosition: spend, recentRuns: runs,
              draftedPlayers: events.map((e) => e.player),
              showMath: true,
            })}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer — Market, Opponents, Vetri, Recent picks, Settings
// ─────────────────────────────────────────────────────────────────────────────

interface DrawerProps {
  onClose: () => void;
  gaps: { pos: Position; severity: "critical" | "need" | "depth" | "done" }[];
  budget: ReturnType<typeof computeBudget>;
  pulseMultiplier: number;
  events: ReturnType<typeof useDraftStore.getState>["events"];
  prices: PriceEstimate[];
  settings: ReturnType<typeof useDraftStore.getState>["settings"];
  activeName: string;
  onSignOut: () => void;
  onGoToSetup: () => void;
  onGoToEspn: () => void;
  onGoToClassicDraft: () => void;
  onGoToPlanner: () => void;
  onLockPlayer: (name: string) => void;
}

function DrawerContents({
  onClose,
  gaps,
  budget,
  pulseMultiplier,
  events,
  prices,
  settings,
  activeName,
  onSignOut,
  onGoToSetup,
  onGoToEspn,
  onGoToClassicDraft,
  onGoToPlanner,
  onLockPlayer,
}: DrawerProps) {
  const [section, setSection] = useState<
    "menu" | "plan" | "lookup" | "afford" | "market" | "opponents" | "vetri" | "recent"
  >("menu");

  const sections = [
    { id: "lookup" as const, label: "Find (player or $)", icon: Search, hint: "Type a player's name to see if you should bid on him and how high to go. Or type a dollar amount (like 25) to see every player still on the board you could grab for that price." },
    { id: "afford" as const, label: "Can I afford X + Y + Z?", icon: Check, hint: "Pick up to 3 players you're dreaming about. I'll add up their prices, take it out of your money, and tell you straight up: yes you can pull it off, or no here's why it breaks your team." },
    { id: "market" as const, label: "Market", icon: TrendingUp, hint: "See what the room is doing right now — who's getting overpaid, who's a steal, and whether a position run is happening so you don't get caught flat-footed." },
    { id: "opponents" as const, label: "Opponents", icon: Users, hint: "A quick scoreboard of every other team — how much money they've burned, how many roster spots they have left, and who they already own. Spot the desperate teams." },
    { id: "vetri" as const, label: "What's social saying", icon: MessageSquare, hint: "The latest takes from Matthew Berry, ESPN, FantasyPros and CBS — sleepers, busts, who's hot, who's hurt — pulled fresh so you don't have to open 5 tabs." },
  ];

  return (
    <SheetContent side="left" className="flex w-[88%] max-w-md flex-col p-0 sm:w-96">
      <SheetHeader className="border-b border-border/60 px-4 py-3">
        <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
          {section !== "menu" && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-7 w-7"
              onClick={() => setSection("menu")}
              aria-label="Back"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
          )}
          <span className="capitalize">
            {section === "menu" ? "Menu" : section === "vetri" ? "What's social saying" : section === "afford" ? "Can I afford X + Y + Z?" : section === "lookup" ? "Find (player or $)" : section}
          </span>
        </SheetTitle>
      </SheetHeader>

      {section === "menu" && (
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1 p-3">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border/60 bg-secondary/20 px-3 py-3 text-left hover:border-primary/40 hover:bg-secondary/40"
              >
                <s.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="hidden" />

          <div className="border-t border-border/40 px-3 py-3">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Settings
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToSetup();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">League & roster</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onGoToEspn();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40"
            >
              <Wifi className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">ESPN connection</span>
            </button>
            <RefreshLeagueButton onDone={onClose} />
            <button
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-muted-foreground hover:bg-secondary/40"
            >
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {section === "plan" && (
        <div className="flex-1 overflow-y-auto p-3">
          <PlanSection budget={budget} />
        </div>
      )}

      {section === "lookup" && (
        <div className="flex-1 overflow-y-auto p-3">
          <LookupSection
            prices={prices}
            events={events}
            maxBid={budget.maxBid}
            onPick={(name) => {
              onLockPlayer(name);
              onClose();
            }}
          />
        </div>
      )}

      {section === "afford" && (
        <div className="flex-1 overflow-y-auto p-3">
          <AffordabilityChecker />
        </div>
      )}

      {section === "market" && (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <StealReachCounter events={events} />
          <WalletRace totalBudget={settings.totalBudget} numTeams={settings.numTeams} />
          <MarketHeat
            events={events}
            prices={prices}
            gaps={gaps}
            maxBid={budget.maxBid}
            remaining={budget.remaining}
            pulseMultiplier={pulseMultiplier}
          />
        </div>
      )}

      {section === "opponents" && (
        <div className="flex-1 overflow-y-auto p-3">
          <OpponentHeatmap settings={settings} />
        </div>
      )}

      {section === "vetri" && (
        <div className="flex-1 overflow-y-auto p-3">
          <SocialTakes />
        </div>
      )}

      {section === "recent" && (
        <div className="flex-1 overflow-y-auto p-3">
          <RecentPicksList events={events} />
        </div>
      )}
    </SheetContent>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent picks
// ─────────────────────────────────────────────────────────────────────────────

function RecentPicksList({
  events,
}: {
  events: ReturnType<typeof useDraftStore.getState>["events"];
}) {
  const recent = [...events].reverse().slice(0, 30);
  if (!recent.length) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        No picks yet — events will appear here as they happen.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      {recent.map((e, i) => (
        <div
          key={`${e.player}-${i}`}
          className="flex items-center gap-2 rounded border border-border/40 bg-secondary/20 px-3 py-2 text-[12px]"
        >
          {e.position && (
            <Badge
              variant="outline"
              className={`${POS_COLORS[e.position] ?? ""} text-[10px] px-1.5 py-0`}
            >
              {e.position}
            </Badge>
          )}
          <span className="flex-1 truncate font-medium">{e.player}</span>
          <span className="font-mono tabular-nums">${e.price}</span>
          <span className="w-16 truncate text-right text-[10px] text-muted-foreground">
            {e.drafter === "me" ? "you" : (e as any).drafterName ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan — strategy picker + slot allocations
// ─────────────────────────────────────────────────────────────────────────────

function PlanSection({ budget }: { budget: ReturnType<typeof computeBudget> }) {
  const settings = useDraftStore((s) => s.settings);
  const customStrategyRules = useDraftStore((s) => s.customStrategyRules);
  const setCustomStrategyRules = useDraftStore((s) => s.setCustomStrategyRules);
  const strategyId = useDraftStore((s) => s.strategyId);
  const setStrategyId = useDraftStore((s) => s.setStrategyId);
  const strategy = getStrategy(strategyId);
  const w = (pos: "QB" | "RB" | "WR" | "TE", i = 0) =>
    strategy.weights?.[pos]?.[i] ?? 1;

  const slots: Array<[string, number]> = [
    ["QB1", Math.round(budget.totalBudget * 0.06 * w("QB", 0))],
    ["RB1", Math.round(budget.totalBudget * 0.18 * w("RB", 0))],
    ["RB2", Math.round(budget.totalBudget * 0.1 * w("RB", 1))],
    ["WR1", Math.round(budget.totalBudget * 0.18 * w("WR", 0))],
    ["WR2", Math.round(budget.totalBudget * 0.1 * w("WR", 1))],
    ["TE1", Math.round(budget.totalBudget * 0.05 * w("TE", 0))],
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Strategy
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStrategyId(s.id)}
              className={`rounded border px-2 py-1.5 text-left text-[11px] transition ${
                strategyId === s.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/50 bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              <div className="font-medium">{s.label}</div>
              <div className="text-[10px] opacity-70">{s.short}</div>
            </button>
          ))}
        </div>
      </div>

      {strategyId === "custom" && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your custom rules
          </p>
          <textarea
            value={customStrategyRules}
            onChange={(e) => setCustomStrategyRules(e.target.value)}
            placeholder={`Write your draft plan in plain English. Examples:\n• Spend $80 on 2 elite WRs\n• Never pay over $5 for a QB\n• Target a TE in the $8-12 range\n• Save at least $20 for bench dart throws`}
            rows={8}
            className="w-full rounded border border-border/60 bg-secondary/20 p-3 text-[12px] leading-relaxed font-mono outline-none focus:border-primary"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            The AI coach will follow these rules when judging bids and giving advice.
          </p>
        </div>
      )}

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Slot allocations
        </p>
        <div className="space-y-1">
          {slots.map(([label, amt]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded border border-border/40 bg-secondary/20 px-3 py-1.5 text-[12px]"
            >
              <span className="font-medium">{label}</span>
              <span className="font-mono tabular-nums">${amt}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup — affordability + "what can I get for $X"
// ─────────────────────────────────────────────────────────────────────────────

function LookupSection({
  prices,
  events,
  maxBid,
  onPick,
}: {
  prices: PriceEstimate[];
  events: ReturnType<typeof useDraftStore.getState>["events"];
  maxBid: number;
  onPick: (name: string) => void;
}) {
  const [input, setInput] = useState("");
  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

  const target = Number(input.replace(/\D/g, "")) || 0;

  const matches = useMemo(() => {
    if (target <= 0) return [];
    const pool = prices.filter((p) => !drafted.has(norm(p.name)));
    // Show everyone you can afford at this price: priced ≤ target,
    // sorted most expensive first (best value for the money).
    return pool
      .filter((p) => p.price > 0 && p.price <= target)
      .sort((a, b) => b.price - a.price)
      .slice(0, 30);
  }, [prices, drafted, target]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/50 bg-secondary/20 p-2.5 text-[11px] leading-snug text-muted-foreground">
        Type a <span className="font-semibold text-foreground">dollar amount</span> and I'll list every undrafted player on your price sheet you can afford at or under that price — sorted most expensive first so you see the best value for the money. Tap a result to lock its decision card.
      </div>
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          What can I get for…
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter a $ amount"
            inputMode="numeric"
            className="h-9"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
            max ${maxBid}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {target <= 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Enter a dollar amount to see undrafted players you can afford.
          </p>
        )}
        {target > 0 && matches.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No undrafted players priced at or under ${target}.
          </p>
        )}
        {matches.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p.name)}
            className="flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-3 py-2 text-left text-[12px] hover:bg-secondary/40"
          >
            {p.position && (
              <Badge
                variant="outline"
                className={`${POS_COLORS[p.position] ?? ""} text-[10px] px-1.5 py-0`}
              >
                {p.position}
              </Badge>
            )}
            <span className="flex-1 truncate font-medium">{p.name}</span>
            <span className="font-mono tabular-nums">${p.price}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Refresh league from ESPN
// ─────────────────────────────────────────────────────────────────────────────

function RefreshLeagueButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { error } = await supabase.functions.invoke("espn-refresh-league");
          if (error) throw error;
          toast.success("League refreshed from ESPN.");
          onDone();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Refresh failed.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 text-muted-foreground ${busy ? "animate-spin" : ""}`} />
      <span className="text-sm">{busy ? "Refreshing…" : "Refresh league from ESPN"}</span>
    </button>
  );
}
