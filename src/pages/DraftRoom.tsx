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
  Wifi,
  WifiOff,
  Pin,
  PinOff,
  Check,
  Sparkles,
  ChevronRight,
  ListOrdered,
  ExternalLink,
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
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import DecisionCard from "@/components/AuctionPlayerCard";
import MarketHeat from "@/components/MarketHeat";
import CounterAnchorDetector from "@/components/CounterAnchorDetector";
import StealReachCounter from "@/components/StealReachCounter";

import OpponentHeatmap from "@/components/OpponentHeatmap";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";
import MoneyHero from "@/components/MoneyHero";
import AiQuickPanel from "@/components/AiQuickPanel";

import AffordabilityChecker from "@/components/AffordabilityChecker";
import FantasyLifeFeed from "@/components/FantasyLifeFeed";
import PlayerSearchPanel from "@/components/PlayerSearchPanel";
import { PlannerBody } from "@/pages/Planner";

import FootballShieldIcon from "@/components/FootballShieldIcon";
import superFootballLogo from "@/assets/logo-wu-football-clean.png";
import wuWOutline from "@/assets/wu-w-outline.png";

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
  } = useDraftStore();

  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  
  const [query, setQuery] = useState<string>("");
  const [activeName, setActiveName] = useState<string>("");
  const [sleeper, setSleeper] = useState<SleeperPlayer[]>([]);
  const [highlight, setHighlight] = useState<number>(0);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [leagueName, setLeagueName] = useState<string>("");
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSleeperPlayers().then(setSleeper).catch(() => {});
  }, []);

  // Pull league name from the most recent live_draft_event raw payload
  useEffect(() => {
    (async () => {
      const cached = localStorage.getItem("league_name_cache");
      if (cached) setLeagueName(cached);
      const { data } = await supabase
        .from("live_draft_events")
        .select("raw")
        .order("created_at", { ascending: false })
        .limit(25);
      const rows = (data ?? []) as Array<{ raw: any }>;
      const found = rows.find((r) => r?.raw?.league?.name)?.raw?.league?.name as
        | string
        | undefined;
      if (found) {
        setLeagueName(found);
        try { localStorage.setItem("league_name_cache", found); } catch { /* ignore */ }
      }
    })();
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

  // Visitors land directly in the draft room — setup is opt-in via the menu

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
  const [targets, setTargets] = useState<Awaited<ReturnType<typeof fetchTargets>>["targets"]>([]);
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
        gaps: gaps.map((g) => ({
          pos: g.pos,
          severity: g.severity,
          starterShort: g.starterShort,
        })),
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

  // First-load
  useEffect(() => {
    if (!setupComplete) return;
    if (targets.length === 0 && !targetsMutation.isPending) targetsMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupComplete]);

  // Refresh targets after every won pick — debounced so a flurry of
  // events (e.g. 3 picks in 5s) only triggers ONE LLM call.
  // 8s debounce: long enough to coalesce a run, short enough that the
  // list feels live.
  useEffect(() => {
    if (!setupComplete) return;
    if (events.length === 0) return;

    const t = setTimeout(() => {
      if (!targetsMutation.isPending) targetsMutation.mutate();
    }, 8000);

    return () => clearTimeout(t);
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

  // These are intentionally retained for the search UI/drawer logic even when
  // the home search is moved into the menu.
  void highlight;
  void setHighlight;
  void searchOpen;
  void setSearchOpen;
  void suggestions;
  void valueFor;
  void openMan;
  // ── Decision card for active name ─────────────────────────────────────
  const activePrice = useMemo(
    () => prices.find((p) => norm(p.name) === norm(activeName))?.price ?? 0,
    [prices, activeName],
  );

  const activePosition = useMemo(
    () => prices.find((p) => norm(p.name) === norm(activeName))?.position as Position | undefined,
    [prices, activeName],
  );

  void activePrice;

  const decisionResult = useMemo(() => {
    if (!activeName) return { decision: null, error: "" };

    try {
      const d = decide({
        settings,
        keepers,
        events,
        prices,
        player: activeName,
        position: activePosition,
        currentPrice: 0,
        anchorMap,
      });
      return { decision: d, error: "" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[decide] threw for", activeName, e);
      return { decision: null, error: msg };
    }
  }, [activeName, activePosition, settings, keepers, events, prices, anchorMap]);
  const decision = decisionResult.decision;
  const decisionError = decisionResult.error;

  // ── Helpers ───────────────────────────────────────────────────────────
  const lockToPlayer = (name: string) => {
    if (!name) return;
    setActiveName(name);
    setQuery("");
    // Inline card — scroll it into view so the user sees it immediately.
    setTimeout(() => {
      document
        .getElementById("decision-card-inline")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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

  void liveColor;
  void liveLabel;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── LEAGUE TITLE BAR ─────────────────────────────────────────── */}
      <div
        className="border-b border-border/40 bg-background/95 px-4 py-2 text-center"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <h1 className="truncate text-sm font-semibold uppercase tracking-wider text-foreground">
          {leagueName ? `The ${leagueName}` : "The Bro We're Senior Citizens"}{" "}
          <span className="text-muted-foreground">Auction Draft Assistant</span>
        </h1>
      </div>
      {/* ── STICKY STATUS BAR ────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 h-12 w-12 flex items-center justify-center text-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/30"
                aria-label="Open menu"
              >
                <Menu className="h-7 w-7" strokeWidth={2.5} />
              </Button>
            </SheetTrigger>
            <DrawerContents
              onClose={() => setDrawerOpen(false)}
              gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
              budget={budget}
              pulseMultiplier={pulse.multiplier}
              events={events}
              prices={prices}
              anchorMap={anchorMap}
              settings={settings}
              activeName={activeName}
              onSignOut={async () => {
                await signOut();
                navigate("/auth");
              }}
              onGoToSetup={() => navigate("/setup")}
              onGoToEspn={() => navigate("/espn")}
              onGoToClassicDraft={() => navigate("/draft")}
              onGoToPlanner={() => navigate("/planner")}
              onLockPlayer={lockToPlayer}
              watchlist={watchlist}
              keepers={keepers}
              onPin={pinPlayer}
              onUnpin={unpinPlayer}
            />
          </Sheet>

          {/* Budget lives inside the hamburger menu — no chip on the homepage. */}
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
        {/* Find (player or $) lives in the hamburger drawer now. */}

        {/* DECISION CARD — rendered INLINE (no Dialog/Portal/Overlay).
            Every previous popup attempt failed silently on mobile. Going
            inline removes every variable: no portals, no animations, no
            stacking contexts, no pointer-events traps. If a player is
            selected, the card is in the DOM right here. Period. */}
        {activeName && (
          <section
            id="decision-card-inline"
            className="rounded-lg border-2 border-primary bg-background p-3 shadow-glow"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Decision · {activeName}
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
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => setActiveName("")}
                  aria-label="Close decision card"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {decision ? (
              <>
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
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-secondary/30 p-4 text-center">
                <p className="text-base font-semibold">{activeName}</p>
                <p className="text-xs text-muted-foreground">
                  No decision available. Make sure setup is complete (budget, roster, prices).
                </p>
                {decisionError && (
                  <p className="rounded bg-destructive/10 p-2 text-left font-mono text-[10px] text-destructive">
                    {decisionError}
                  </p>
                )}
              </div>
            )}
          </section>
        )}

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
                  className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/60"
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
            className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-transparent"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <img
              src={superFootballLogo}
              alt="Open AI tools"
              className="h-16 w-16 object-contain drop-shadow-[0_0_10px_rgba(255,180,80,0.7)] hover:drop-shadow-[0_0_16px_rgba(255,180,80,1)] active:scale-90 transition-all"
            />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-background bg-foreground text-background shadow-md">
              <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            {targets.length > 0 && (
              <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
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
            coachContext={() => ({
              settings: {
                totalBudget: settings.totalBudget,
                numTeams: settings.numTeams,
                scoring: settings.scoring,
                leagueType: settings.leagueType,
                format: settings.format,
                context: settings.context,
              },
              budget,
              keepers,
              myRoster: myItems,
              rosterRequired: requiredCount,
              rosterFilled: myCount,
              events,
              prices,
              spendByPosition: spend,
              recentRuns: runs,
              draftedPlayers: events.map((e) => e.player),
              showMath: true,
              // Engine grounding — when a player is locked in, hand the Coach
              // the deterministic verdict so it can EXPLAIN but never CONTRADICT
              engineDecision: decision
                ? {
                    player: decision.player,
                    position: decision.position,
                    verdict: decision.verdict,
                    oneLiner: decision.oneLiner,
                    goUpTo: decision.goUpTo,
                    stopAt: decision.stopAt,
                    anchorPrice: decision.anchorPrice,
                    anchorSource: decision.anchorSource,
                    plan: decision.plan,
                    better: decision.better,
                    betterReason: decision.betterReason,
                    confidence: decision.confidence,
                  }
                : undefined,
            })}
          />
        </SheetContent>
      </Sheet>

      {/* ── FOOTER CREDIT ────────────────────────────────────────────── */}
      <footer
        className="mt-8 border-t border-border/40 px-4 py-6 text-center"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <p
          className="inline-block text-xs font-bold uppercase tracking-[0.18em] text-foreground/85"
          style={{
            fontFamily: '"Special Elite", "Courier New", monospace',
            transform: "rotate(-3deg)",
            textShadow: "1px 1px 0 hsl(var(--background)), 2px 2px 0 hsl(var(--foreground) / 0.15)",
            filter: "contrast(1.05)",
          }}
        >
          Built by Andrew Weingarten
        </p>
      </footer>
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
  anchorMap: Record<string, import("@/lib/decision-engine").AnchorEntry>;
  settings: ReturnType<typeof useDraftStore.getState>["settings"];
  activeName: string;
  onSignOut: () => void;
  onGoToSetup: () => void;
  onGoToEspn: () => void;
  onGoToClassicDraft: () => void;
  onGoToPlanner: () => void;
  onLockPlayer: (name: string) => void;
  watchlist: string[];
  keepers: { player: string; cost?: number }[];
  onPin: (name: string) => void;
  onUnpin: (name: string) => void;
}

function DrawerContents({
  onClose,
  gaps,
  budget,
  pulseMultiplier,
  events,
  prices,
  anchorMap,
  settings,
  activeName,
  onSignOut,
  onGoToSetup,
  onGoToEspn,
  onGoToClassicDraft,
  onGoToPlanner,
  onLockPlayer,
  watchlist,
  keepers,
  onPin,
  onUnpin,
}: DrawerProps) {
  const [section, setSection] = useState<
    "menu" | "lookup" | "top100" | "afford" | "market" | "fantasylife"
  >("menu");

  void activeName;
  void onGoToClassicDraft;
  void onGoToPlanner;

  const sections = [
    { id: "lookup" as const, label: "Find (player or $)", icon: Search, hint: "Type a player name or dollar amount." },
    { id: "top100" as const, label: "Top 100 · math-backed $", icon: ListOrdered, hint: "Best-value board, blended anchors." },
    { id: "afford" as const, label: "Can I afford X + Y + Z?", icon: Check, hint: "Pressure-test a plan before spending." },
    { id: "market" as const, label: "Market & Opponents", icon: TrendingUp, hint: "Room pulse plus opponent scan." },
    { id: "fantasylife" as const, label: "Fantasy Life", icon: ExternalLink, hint: "Latest articles from fantasylife.com." },
  ];

  return (
    <SheetContent side="left" className="flex w-[88%] max-w-md flex-col p-0 sm:w-[420px]">
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
            {section === "menu" ? "Menu" : section}
          </span>
        </SheetTitle>
      </SheetHeader>

      {section === "menu" && (
        <div className="flex-1 overflow-y-auto">
          <div className="border-b border-border/40 px-4 py-3">
            <MoneyHero
              remaining={budget.remaining}
              total={budget.totalBudget}
              showMax={budget.maxBid > 0}
              maxBid={budget.maxBid}
              slotsLeft={budget.slotsLeft}
            />
          </div>
          <div className="space-y-1 p-3">
            {sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className="flex w-full items-center gap-3 rounded-md border border-border/40 bg-secondary/20 px-3 py-2.5 text-left hover:bg-secondary/40"
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
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-destructive hover:bg-destructive/10"
            >
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      )}

      {section === "lookup" && (
        <div className="flex-1 overflow-y-auto p-3">
          <LookupSection
            prices={prices}
            anchorMap={anchorMap}
            events={events}
            maxBid={budget.maxBid}
            onPick={(name) => {
              onLockPlayer(name);
              onClose();
            }}
          />
        </div>
      )}

      {section === "top100" && (
        <div className="flex-1 overflow-y-auto p-3">
          <Top100List
            prices={prices}
            anchorMap={anchorMap}
            events={events}
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
          
          <MarketHeat
            events={events}
            prices={prices}
            gaps={gaps}
            maxBid={budget.maxBid}
            remaining={budget.remaining}
            pulseMultiplier={pulseMultiplier}
          />
          <OpponentHeatmap settings={settings} />
        </div>
      )}

      {section === "fantasylife" && (
        <div className="flex-1 overflow-y-auto p-3">
          <FantasyLifeFeed />
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
          className="flex items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-xs"
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

  void settings;

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
            placeholder={`Write your draft plan in plain English. Examples:\n• Spend big at RB and WR\n• Wait on QB unless there is a discount\n• Do not overpay for TE`}
            rows={8}
            className="w-full rounded border border-border/60 bg-secondary/20 p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
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
              className="flex items-center justify-between rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-xs"
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
  anchorMap,
  events,
  maxBid,
  onPick,
}: {
  prices: PriceEstimate[];
  anchorMap: Record<string, import("@/lib/decision-engine").AnchorEntry>;
  events: ReturnType<typeof useDraftStore.getState>["events"];
  maxBid: number;
  onPick: (name: string) => void;
}) {
  const [input, setInput] = useState<string>("");
  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

  // Merge sheet prices with anchor cascade — same math as player cards.
  const pricedPool = useMemo(() => {
    type Row = { name: string; price: number; position?: PriceEstimate["position"] };
    const out: Row[] = [];
    const seen = new Set<string>();
    for (const p of prices) {
      const key = norm(p.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const anchor = anchorMap[key]?.price;
      const finalPrice = anchor && anchor > 0 ? anchor : p.price;
      out.push({ name: p.name, price: finalPrice, position: p.position });
    }
    return out;
  }, [prices, anchorMap]);

  const trimmed = input.trim();
  const isDollar = /^\$?\d+$/.test(trimmed);
  const target = isDollar ? Number(trimmed.replace(/\D/g, "")) : 0;

  const matches = useMemo(() => {
    const pool = pricedPool.filter((p) => !drafted.has(norm(p.name)));

    if (isDollar && target > 0) {
      return pool
        .filter((p) => p.price > 0 && p.price <= target)
        .sort((a, b) => b.price - a.price)
        .slice(0, 30);
    }

    if (!isDollar && trimmed.length >= 2) {
      const q = norm(trimmed);
      return pool
        .filter((p) => norm(p.name).includes(q))
        .sort((a, b) => b.price - a.price)
        .slice(0, 30);
    }

    return [];
  }, [pricedPool, drafted, target, trimmed, isDollar]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/50 bg-secondary/20 p-2.5 text-xs text-muted-foreground">
        Type a <span className="font-semibold text-foreground">player name</span> or a <span className="font-semibold text-foreground">dollar amount</span>. Tap a result to open the Decision Card (max bid + math).
      </div>

      <div>
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Bijan Robinson  or  25"
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
        {trimmed.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Search a player by name, or enter a $ amount.
          </p>
        )}

        {trimmed.length > 0 && matches.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isDollar
              ? `No undrafted players priced at or under $${target}.`
              : "No matches in your price sheet."}
          </p>
        )}

        {matches.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p.name)}
            className="flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-left text-xs hover:bg-secondary/40"
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
  const [busy, setBusy] = useState<boolean>(false);

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
      className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 text-muted-foreground ${busy ? "animate-spin" : ""}`} />
      <span className="text-sm">{busy ? "Refreshing..." : "Refresh league from ESPN"}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top 100 list — ESPN-style PDF rows in a slide-in panel.
// Rank · Pos · Name · math-backed $. Tap a row → opens the Decision Card.
// ─────────────────────────────────────────────────────────────────────────────
function Top100List({
  prices,
  anchorMap,
  events,
  onPick,
}: {
  prices: PriceEstimate[];
  anchorMap: Record<string, import("@/lib/decision-engine").AnchorEntry>;
  events: ReturnType<typeof useDraftStore.getState>["events"];
  onPick: (name: string) => void;
}) {
  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

  // Use the full cascade (anchorMap) for $ values — same math as the player cards
  // (Sleeper 80 / ESPN 20, blended with last-3-yr league history + VORP).
  // Falls back to sheet price if no anchor exists.
  const top = useMemo(() => {
    type Row = { name: string; price: number; position?: PriceEstimate["position"] };
    const byName = new Map<string, Row>();
    for (const p of prices) {
      const key = norm(p.name);
      const anchor = anchorMap[key]?.price;
      const finalPrice = anchor && anchor > 0 ? anchor : p.price;
      if (finalPrice > 0) byName.set(key, { name: p.name, price: finalPrice, position: p.position });
    }
    return Array.from(byName.values())
      .sort((a, b) => b.price - a.price)
      .slice(0, 100);
  }, [prices, anchorMap]);

  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No prices loaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-2 pb-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="w-6 text-right">#</span>
        <span className="w-9">Pos</span>
        <span className="flex-1">Player</span>
        <span className="w-12 text-right">$ Value</span>
      </div>
      {top.map((p, i) => {
        const isDrafted = drafted.has(norm(p.name));
        const posTint = p.position ? POS_COLORS[p.position] ?? "" : "";
        return (
          <button
            key={`${p.name}-${i}`}
            type="button"
            onClick={() => !isDrafted && onPick(p.name)}
            disabled={isDrafted}
            className={cn(
              "flex w-full items-center gap-2 rounded border border-border/40 px-2 py-1.5 text-left",
              isDrafted
                ? "bg-muted/30 opacity-40 line-through"
                : "bg-secondary/20 hover:bg-secondary/60 active:bg-secondary/80",
            )}
          >
            <span className="w-5 text-right font-mono text-[11px] tabular-nums text-muted-foreground shrink-0">
              {i + 1}
            </span>
            <span className="w-8 shrink-0">
              {p.position && (
                <Badge variant="outline" className={cn(posTint, "text-[9px] px-1 py-0")}>
                  {p.position}
                </Badge>
              )}
            </span>
            <span className="flex-1 min-w-0 truncate text-[12px] font-medium">{p.name}</span>
            <span className="w-10 text-right font-mono text-[12px] tabular-nums text-primary shrink-0">
              ${p.price}
            </span>
          </button>
        );
      })}
    </div>
  );
}
