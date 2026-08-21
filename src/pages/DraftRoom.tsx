// DraftRoom.tsx — focused second-screen auction sidecar.
// ESPN runs the auction. Auction Ace owns expected prices, the user's live
// budget plan, player context, and the AI Coach.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Settings, Sparkles, WifiOff, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useDraftStore } from "@/lib/draft-store";
import type { Position, PriceEstimate } from "@/lib/draft-types";
import { POS_COLORS } from "@/lib/positions";
import { buildPlannerBoard, buildPlannerSlots, type SlotGroup } from "@/lib/planner-slots";
import {
  getStrategySummary,
  maxBid,
  type StrategyId,
} from "@/lib/planner-strategies";
import {
  loadBlendedAuctionPrices,
  PRICE_SOURCE_VERSION,
  type BlendedPrice,
} from "@/lib/price-blend";

import auctionDraftBadge from "@/assets/auction-draft-assist-badge.png";
import AiQuickPanel from "@/components/AiQuickPanel";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";
import PositionBudgetBar from "@/components/PositionBudgetBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const splitNames = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

function groupPosition(group: SlotGroup): Position | undefined {
  if (["QB", "RB", "WR", "TE", "K", "DST"].includes(group)) return group as Position;
  return undefined;
}

export default function DraftRoom() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    settings,
    prices,
    setupComplete,
    slotAllocations,
    slotNotes,
    lockedSlots,
    plannerStrategy,
    setPrices,
  } = useDraftStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<{ name: string; position?: Position } | null>(null);

  // Reload Expected Prices whenever any league input that changes the market
  // changes. The old app only keyed this to budget; that could leave stale
  // values after changing team count, scoring, league type, or roster size.
  const settingsSignature = useMemo(
    () => JSON.stringify({
      totalBudget: settings.totalBudget,
      numTeams: settings.numTeams,
      scoring: settings.scoring,
      leagueType: settings.leagueType,
      format: settings.format,
      roster: settings.roster,
    }),
    [settings],
  );

  useEffect(() => {
    let cancelled = false;
    const sourceKey = `${PRICE_SOURCE_VERSION}:${settingsSignature}`;
    try {
      if (prices.length > 0 && localStorage.getItem("auction-price-source") === sourceKey) return;
    } catch { /* localStorage is optional */ }

    loadBlendedAuctionPrices(settings.totalBudget, settings)
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        setPrices(rows);
        try { localStorage.setItem("auction-price-source", sourceKey); } catch { /* optional */ }
      })
      .catch(() => { /* keep planner usable if the sheet cannot load */ });

    return () => { cancelled = true; };
  }, [prices.length, setPrices, settings, settingsSignature]);

  useEffect(() => {
    const isGuest = !user || user.is_anonymous;
    if (!isGuest && !setupComplete && prices.length === 0) navigate("/setup", { replace: true });
  }, [navigate, prices.length, setupComplete, user]);

  const plannerSlots = useMemo(() => buildPlannerSlots(settings), [settings]);
  const plannerBoard = useMemo(
    () => buildPlannerBoard(settings, slotAllocations, slotNotes, lockedSlots),
    [lockedSlots, settings, slotAllocations, slotNotes],
  );

  const draftedRows = useMemo(() => plannerSlots
    .filter((slot) => lockedSlots[slot.id])
    .map((slot) => {
      const names = splitNames(slotNotes[slot.id] ?? "");
      const player = names[0] ?? "";
      const priceRow = prices.find((p) => player && norm(p.name) === norm(player));
      return {
        slot,
        player,
        allNames: names,
        price: Math.max(0, Number(slotAllocations[slot.id] ?? 0)),
        position: priceRow?.position ?? groupPosition(slot.group),
      };
    }), [lockedSlots, plannerSlots, prices, slotAllocations, slotNotes]);

  const draftedNames = useMemo(() => {
    const out = new Set<string>();
    for (const row of draftedRows) for (const name of row.allNames) out.add(norm(name));
    return out;
  }, [draftedRows]);

  const draftedSpend = draftedRows.reduce((sum, row) => sum + row.price, 0);
  const budgetLeft = Math.max(0, settings.totalBudget - draftedSpend);
  const openSlots = Math.max(0, plannerSlots.length - draftedRows.length);
  const legalMaxBid = maxBid(budgetLeft, openSlots);
  const spentPct = settings.totalBudget > 0
    ? Math.min(100, Math.round((draftedSpend / settings.totalBudget) * 100))
    : 0;

  const myRoster = useMemo(() => draftedRows
    .filter((row) => row.player)
    .map((row) => ({
      player: row.player,
      position: row.position,
      price: row.price,
      source: "planner" as const,
      slot: row.slot.label,
    })), [draftedRows]);

  const rosterFilled = useMemo(() => {
    const counts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DST: 0 };
    for (const row of myRoster) if (row.position) counts[row.position] = (counts[row.position] ?? 0) + 1;
    return counts;
  }, [myRoster]);

  const rosterRequired = useMemo(() => ({
    QB: settings.roster.QB + (settings.leagueType === "Superflex" || settings.leagueType === "2QB" ? settings.roster.SUPERFLEX : 0),
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
    FLEX: settings.roster.FLEX,
    BENCH: settings.roster.BENCH,
  }), [settings]);

  const spendByPosition = useMemo(() => {
    const out: Record<string, number> = {};
    for (const row of myRoster) {
      const key = row.position ?? "OTHER";
      out[key] = (out[key] ?? 0) + row.price;
    }
    return out;
  }, [myRoster]);

  const strategy = useMemo(() => {
    const id = plannerStrategy as StrategyId;
    const summary = getStrategySummary(id, prices);
    const spend = summary.qbSpendLow != null && summary.qbSpendHigh != null
      ? ` Expected QB pair range $${summary.qbSpendLow}–$${summary.qbSpendHigh}.`
      : "";
    return {
      id,
      label: summary.label,
      guidance: `${summary.qbTargets}. ${summary.description}${spend}`,
    };
  }, [plannerStrategy, prices]);

  const budgetContext = useMemo(() => ({
    totalBudget: settings.totalBudget,
    spent: draftedSpend,
    remaining: budgetLeft,
    maxBid: legalMaxBid,
    slotsLeft: openSlots,
  }), [budgetLeft, draftedSpend, legalMaxBid, openSlots, settings.totalBudget]);

  const openDetails = (name: string, position?: Position) => setDetailFor({ name, position });

  const selectedPrice = detailFor
    ? (prices as BlendedPrice[]).find((p) => norm(p.name) === norm(detailFor.name))
    : undefined;
  const overallRank = detailFor
    ? (prices as BlendedPrice[]).findIndex((p) => norm(p.name) === norm(detailFor.name)) + 1
    : undefined;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex shrink-0 items-center gap-1 border-b border-border bg-background/95 px-1.5 py-0 backdrop-blur-sm">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Menu"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </Button>
          <SettingsDrawer
            onClose={() => setDrawerOpen(false)}
            onSignOut={async () => { await signOut(); navigate("/auth"); }}
            onGoToSetup={() => navigate("/setup")}
          />
        </Sheet>

        <div className="min-w-0 flex-1 leading-tight">
          <img
            src={auctionDraftBadge}
            alt="Auction Draft Assist"
            className="h-28 w-full max-w-[320px] object-contain invert brightness-200"
          />
        </div>
      </header>

      <div className="-mt-6 h-[3px] shrink-0 bg-muted">
        <div
          className="h-full transition-all"
          style={{ width: `${spentPct}%`, background: "hsl(var(--primary))" }}
        />
      </div>

      <Tabs defaultValue="planner" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-2 border-b border-border bg-background/95 px-2.5 pb-2 pt-2 backdrop-blur-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planner">Budget Planner</TabsTrigger>
            <TabsTrigger value="top350">Top 350</TabsTrigger>
          </TabsList>

          <div className="flex items-baseline justify-between gap-3 pr-1">
            <div className="flex items-baseline gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Budget</span>
              <span className="text-xl font-bold tabular-nums">$</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={settings.totalBudget}
                onChange={(e) => {
                  const v = Math.max(1, Math.floor(Number(e.target.value) || 0));
                  useDraftStore.getState().setSettings({ totalBudget: v });
                }}
                className="w-16 border-b border-transparent bg-transparent text-center text-xl font-bold tabular-nums outline-none focus:border-accent"
                aria-label="Total auction budget"
              />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold tabular-nums text-accent">${budgetLeft}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">actual left</span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-20 pt-2">
          <TabsContent value="planner" className="mt-0">
            <PositionBudgetBar />
          </TabsContent>

          <TabsContent value="top350" className="mt-0">
            <Top350List
              prices={prices}
              draftedNames={draftedNames}
              onPick={openDetails}
            />
          </TabsContent>
        </div>
      </Tabs>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-center px-3 py-2">
          <Sheet open={aiOpen} onOpenChange={setAiOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ask the Coach"
                className="coach-ai-mark flex h-11 items-center gap-2 rounded-full px-4 active:scale-95 transition hover:brightness-110"
              >
                <Sparkles className="coach-ai-mark-icon h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs font-semibold">Ask the Coach</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="ai-sheet-frozen flex flex-col p-0">
              <SheetHeader className="border-b border-border/60 px-4 py-3">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <span className="coach-ai-mark flex h-9 w-9 items-center justify-center rounded-full">
                    <Sparkles className="coach-ai-mark-icon" size={18} strokeWidth={1.75} />
                  </span>
                  Ask the Coach
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
                    roster: settings.roster,
                    context: `Auction Ace v2. Price Sheet numbers are Expected Prices for THIS league, not generic AAVs. Active strategy: ${strategy.label}. ${strategy.guidance}`,
                  },
                  budget: budgetContext,
                  keepers: [],
                  myRoster,
                  rosterRequired,
                  rosterFilled,
                  events: [],
                  prices,
                  spendByPosition,
                  recentRuns: [],
                  draftedPlayers: Array.from(draftedNames),
                  showMath: false,
                  strategy,
                  budgetBoard: plannerBoard,
                })}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <PlayerDetailsOverlay
        open={!!detailFor}
        onOpenChange={(open) => !open && setDetailFor(null)}
        name={detailFor?.name ?? ""}
        position={detailFor?.position ?? selectedPrice?.position}
        sheetPrice={selectedPrice?.price}
        posRank={selectedPrice?.positionRank}
        totalAtPos={selectedPrice?.position ? prices.filter((p) => p.position === selectedPrice.position).length : undefined}
        overallRank={overallRank && overallRank > 0 ? overallRank : undefined}
        remaining={budgetLeft}
        maxBid={legalMaxBid}
        slotsLeft={openSlots}
      />
    </div>
  );
}

function SettingsDrawer({
  onClose,
  onSignOut,
  onGoToSetup,
}: {
  onClose: () => void;
  onSignOut: () => void;
  onGoToSetup: () => void;
}) {
  return (
    <SheetContent side="bottom" className="flex h-[60vh] flex-col gap-0 rounded-t-3xl border-t border-border/60 p-0">
      <SheetHeader className="border-b border-border/60 px-4 py-3">
        <SheetTitle className="text-sm font-semibold">Menu</SheetTitle>
      </SheetHeader>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Settings</p>
        <button
          type="button"
          onClick={() => { onClose(); onGoToSetup(); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left hover:bg-secondary/40"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">League & roster</span>
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-destructive hover:bg-destructive/10"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </SheetContent>
  );
}

const POSITION_FILTER_OPTIONS: (Position | "ALL")[] = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];

function Top350List({
  prices,
  draftedNames,
  onPick,
}: {
  prices: PriceEstimate[];
  draftedNames: Set<string>;
  onPick: (name: string, position?: Position) => void;
}) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<Position | "ALL">("ALL");

  const top = useMemo(() => {
    const byName = new Map<string, PriceEstimate>();
    for (const p of prices) if (p.price > 0) byName.set(norm(p.name), p);
    return Array.from(byName.values())
      .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
      .slice(0, 350)
      .map((p, index) => ({ ...p, overallRank: index + 1 }));
  }, [prices]);

  const filtered = useMemo(() => {
    const query = norm(search);
    return top.filter((p) => {
      if (query && !norm(p.name).includes(query)) return false;
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      return true;
    });
  }, [posFilter, search, top]);

  if (!top.length) return <p className="py-8 text-center text-xs text-muted-foreground">Loading Expected Prices…</p>;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your league Expected Price</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">One number per player. Locked players come directly from the Budget Planner.</div>
      </div>

      <div className="relative">
        <Input
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pr-9 text-sm"
        />
        {search.trim() && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex overflow-hidden rounded-lg border border-border bg-secondary/20">
        {POSITION_FILTER_OPTIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => setPosFilter(pos)}
            className={`flex-1 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              posFilter === pos ? "bg-foreground !text-black" : "text-muted-foreground hover:bg-secondary/40"
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {!filtered.length && <p className="py-6 text-center text-xs text-muted-foreground">No players match.</p>}
        {filtered.map((p) => {
          const isLocked = draftedNames.has(norm(p.name));
          return (
            <button
              key={p.name}
              type="button"
              disabled={isLocked}
              onClick={() => !isLocked && onPick(p.name, p.position)}
              className={`flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-left text-xs hover:bg-secondary/40 ${isLocked ? "opacity-45" : ""}`}
            >
              <span className="w-7 text-right font-mono text-[10px] text-muted-foreground">{p.overallRank}</span>
              {p.position && (
                <Badge variant="outline" className={`${POS_COLORS[p.position] ?? ""} px-1.5 py-0 text-[10px]`}>
                  {p.position}
                </Badge>
              )}
              <span className={`min-w-0 flex-1 truncate font-medium ${isLocked ? "line-through" : ""}`}>{p.name}</span>
              {isLocked && <span className="text-[9px] font-semibold uppercase text-muted-foreground">Locked</span>}
              <span className="font-mono font-semibold tabular-nums">${p.price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
