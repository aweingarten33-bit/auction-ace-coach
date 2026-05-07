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
  Menu,
  Search,
  Settings,
  RefreshCw,
  X,
  TrendingUp,
  Users,
  MessageSquare,
  Mic,
  History,
  ChevronRight,
  Wifi,
  WifiOff,
  Pin,
  PinOff,
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

import DecisionCard from "@/components/DecisionCard";
import MarketHeat from "@/components/MarketHeat";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import VetriPlayerSummary from "@/components/VetriPlayerSummary";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";

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
  const anchorMap = useAnchorMap();
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
    if (query.trim().length < 2) return [];
    const hits = searchPlayers(sleeper, query, 8).filter(
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
  }, [query, sleeper, draftedSet, priceByName]);

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

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-lg font-bold leading-none tabular-nums">
                ${budget.remaining}
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                {budget.slotsLeft} slots · max ${budget.maxBid}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1">
            <span className={`h-1.5 w-1.5 rounded-full ${liveColor}`} />
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {liveLabel}
            </span>
          </div>
        </div>

        {/* Live nomination strip — only when something's actively up for bid */}
        {espnSync.liveBid && (
          <div className="border-t border-border/40 bg-secondary/40 px-4 py-1.5">
            <p className="mx-auto flex max-w-3xl items-center gap-2 text-[11px]">
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
          </div>
        )}
      </header>

      {/* ── MAIN ──────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-5 pb-24">
        {/* SEARCH / LOOKUP */}
        <section ref={searchWrapRef}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
                setHighlight(0);
              }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (!searchOpen || !suggestions.length) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlight((h) => (h + 1) % suggestions.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const pick = suggestions[highlight];
                  if (pick) lockToPlayer(pick.name);
                } else if (e.key === "Escape") {
                  setSearchOpen(false);
                }
              }}
              placeholder="Look up a player…"
              className="h-12 pl-9 pr-9 text-base"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Search results dropdown */}
          {searchOpen && suggestions.length > 0 && (
            <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-card shadow-lg">
              {suggestions.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => lockToPlayer(p.name)}
                  className={`flex w-full items-center gap-2 border-b border-border/40 px-3 py-2.5 text-left last:border-0 hover:bg-secondary/60 ${
                    i === highlight ? "bg-secondary/60" : ""
                  }`}
                >
                  <span className="flex-1 truncate text-sm">{p.name}</span>
                  {p.team && (
                    <span className="text-[10px] text-muted-foreground">{p.team}</span>
                  )}
                  {p.position && (
                    <Badge
                      variant="outline"
                      className={`${POS_COLORS[p.position as Position] ?? ""} text-[10px] px-1.5 py-0`}
                    >
                      {p.position}
                    </Badge>
                  )}
                  <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
                    {p.price != null ? `$${p.price}` : "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* DECISION CARD — when a player is locked in */}
        {decision && (
          <section>
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
                    <>
                      <PinOff className="mr-1 h-3 w-3" />
                      Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="mr-1 h-3 w-3" />
                      Pin
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setActiveName("")}
                >
                  Clear
                </Button>
              </div>
            </div>
            <DecisionCard d={decision} />
            {/* Vetri's take on this player, inline */}
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
          </section>
        )}

        {/* TARGETS */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Targets
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => targetsMutation.mutate()}
              disabled={targetsMutation.isPending}
              className="h-7 px-2 text-[11px]"
            >
              <RefreshCw
                className={`mr-1 h-3 w-3 ${targetsMutation.isPending ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          {openMan && (
            <div className="mb-2 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-[11px]">
              <span className="font-semibold text-accent">Nobody's bidding on:</span>{" "}
              <button
                type="button"
                onClick={() => lockToPlayer(openMan)}
                className="font-medium text-foreground hover:text-primary"
              >
                {openMan}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {targetsMutation.isPending && targets.length === 0 && (
              <>
                <div className="h-16 animate-pulse rounded-md border border-border bg-secondary/30" />
                <div className="h-16 animate-pulse rounded-md border border-border bg-secondary/30" />
                <div className="h-16 animate-pulse rounded-md border border-border bg-secondary/30" />
              </>
            )}
            {!targetsMutation.isPending && targets.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Tap Refresh to generate targets.
              </p>
            )}
            {targets.slice(0, 5).map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => lockToPlayer(t.name)}
                className="block w-full overflow-hidden rounded-md border border-border bg-secondary/30 p-3 text-left transition hover:border-primary/50 hover:bg-secondary/50"
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${POS_COLORS[t.position] ?? ""} text-[10px] px-1.5 py-0`}
                      >
                        {t.position}
                      </Badge>
                      <span className="truncate text-sm font-semibold">{t.name}</span>
                      {watchlist.includes(t.name) && (
                        <Pin className="h-3 w-3 fill-primary text-primary" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {t.reason}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold tabular-nums">${t.maxBid}</p>
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      max
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

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

      {/* Floating Budget Planner — chat-bubble style FAB */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open budget planner"
            className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <MessageSquare className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 rounded-full bg-background px-1.5 py-0.5 text-[9px] font-mono font-bold text-foreground border border-border">
              ${budget.remaining}
            </span>
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[88%] max-w-md flex-col p-0 sm:w-96">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle className="text-sm font-semibold">Budget Planner</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-3">
            <PlanSection budget={budget} />
          </div>
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
    "menu" | "plan" | "lookup" | "market" | "opponents" | "vetri" | "recent"
  >("menu");

  const sections = [
    { id: "plan" as const, label: "Plan", icon: Settings, hint: "Strategy & slot allocations" },
    { id: "lookup" as const, label: "Lookup", icon: Search, hint: "Affordability · what can I get for $X" },
    { id: "market" as const, label: "Market", icon: TrendingUp, hint: "Trending picks · run alerts" },
    { id: "opponents" as const, label: "Opponents", icon: Users, hint: "What every team has spent" },
    { id: "vetri" as const, label: "Analyst", icon: MessageSquare, hint: "Vetri's takes" },
    { id: "recent" as const, label: "Recent picks", icon: History, hint: `Last ${Math.min(events.length, 10)} picks` },
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
            {section === "menu" ? "Menu" : section === "vetri" ? "Analyst" : section}
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

          <div className="border-t border-border/40 px-3 py-3">
            <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              More tools
            </p>
            <button
              type="button"
              onClick={() => { onClose(); onGoToClassicDraft(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40"
            >
              <History className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">Classic Draft view</p>
                <p className="text-[11px] text-muted-foreground">Roster hero · tier alerts · coach chat · watchlist</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => { onClose(); onGoToPlanner(); }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40"
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">Planner</p>
                <p className="text-[11px] text-muted-foreground">Slot allocations & flow planner</p>
              </div>
            </button>
          </div>

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

      {section === "market" && (
        <div className="flex-1 overflow-y-auto p-3">
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
          <Card className="p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recent analyst takes
            </p>
            <VetriPlayerSummary />
          </Card>
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
  const setSettings = useDraftStore((s) => s.setSettings);
  const strategyId = (settings as any).strategy ?? "balanced";
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
              onClick={() => setSettings({ ...(settings as any), strategy: s.id })}
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
  const [amount, setAmount] = useState(String(Math.max(1, Math.floor(maxBid / 2))));
  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );
  const target = Number(amount) || 0;
  const matches = useMemo(() => {
    return prices
      .filter((p) => !drafted.has(norm(p.name)))
      .filter((p) => p.price <= target && p.price >= Math.max(1, target - 5))
      .sort((a, b) => b.price - a.price)
      .slice(0, 12);
  }, [prices, drafted, target]);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          What can I get for…
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">$</span>
          <Input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className="h-9"
          />
          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
            max ${maxBid}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {matches.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No undrafted players around ${target}.
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
