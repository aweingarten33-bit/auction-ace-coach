// DraftRoom.tsx — live auction sidecar.
// Primary view: available players within your budget, updating in real time.
// Everything else is one tap away.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Calculator,
  X,
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useDraftStore } from "@/lib/draft-store";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  adjustPricesForDrafted,
  computeBudget,
  countByPosition,
  spendByPosition,
  recentRuns,
} from "@/lib/draft-math";

import { usePlayerRanks } from "@/lib/league-tier-prices";
import { Position, PriceEstimate } from "@/lib/draft-types";
import type { AnchorEntry } from "@/lib/decision-engine";
import { POS_COLORS } from "@/lib/positions";
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

import AiQuickPanel from "@/components/AiQuickPanel";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";
import PositionBudgetBar from "@/components/PositionBudgetBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { buildPlannerBoard } from "@/lib/planner-slots";
import LastPickImpact from "@/components/LastPickImpact";
import AuctionCalculator from "@/components/AuctionCalculator";
import { loadBlendedAuctionPrices, PRICE_SOURCE_VERSION } from "@/lib/price-blend";



const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type PanelId = "calc";


// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DraftRoom() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const {
    settings,
    keepers,
    events,
    prices,
    setupComplete,
    watchlist,
    pinPlayer,
    unpinPlayer,
    slotAllocations,
    slotNotes,
    lockedSlots,
    setPrices,
  } = useDraftStore();

  // Auto-load the only auction values source: uploaded PDF sheet + DraftSharks SF.
  useEffect(() => {
    let cancelled = false;
    const sourceKey = `${PRICE_SOURCE_VERSION}-${settings.totalBudget}`;
    try {
      if (prices.length > 0 && localStorage.getItem("auction-price-source") === sourceKey) return;
    } catch { /* ignore */ }
    loadBlendedAuctionPrices(settings.totalBudget)
      .then((rows) => {
        if (cancelled || rows.length === 0) return;
        setPrices(rows);
        try { localStorage.setItem("auction-price-source", sourceKey); } catch { /* ignore */ }
      })
      .catch(() => { /* keep app usable if DraftSharks is temporarily unavailable */ });
    return () => { cancelled = true; };
  }, [prices.length, setPrices, settings.totalBudget]);




  const [drawerOpen, setDrawerOpen] = useState(false);
  const [panel, setPanel] = useState<PanelId | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<{ name: string; position?: Position } | null>(null);
  // Redirect to setup if no data yet (admin only; guests can view).
  useEffect(() => {
    const isGuest = !user || user.is_anonymous;
    if (!isGuest && !setupComplete && prices.length === 0 && events.length === 0) {
      navigate("/setup", { replace: true });
    }
  }, [user, setupComplete, prices.length, events.length, navigate]);

  const { lookup: lookupRank } = usePlayerRanks();

  // ── Computed ────────────────────────────────────────────────────────────
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
  
  // Re-price undrafted players in real time as players come off the board.
  const adjustedPrices = useMemo(() => adjustPricesForDrafted(prices, events), [prices, events]);
  const anchorMap = useMemo<Record<string, AnchorEntry>>(() => {
    const out: Record<string, AnchorEntry> = {};
    for (const p of adjustedPrices) {
      const row = p as PriceEstimate & { pdfPrice?: number; draftSharksPrice?: number };
      if (row.price > 0) {
        out[norm(row.name)] = {
          price: row.price,
          source: "sheet",
          marketPrice: row.price,
          marketSources: { pdf: row.pdfPrice, draftSharks: row.draftSharksPrice },
        };
      }
    }
    return out;
  }, [adjustedPrices]);

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

  const openDetails = (name: string, position?: Position) => {
    setDetailFor({ name, position });
  };

  const spentPct =
    budget.totalBudget > 0
      ? Math.min(100, Math.round(((budget.totalBudget - budget.remaining) / budget.totalBudget) * 100))
      : 0;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-2 pt-1 pb-1.5 backdrop-blur-sm">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Menu"
            onClick={() => {
              if (sessionStorage.getItem("menu_unlocked") === "1") {
                setDrawerOpen(true);
                return;
              }
              const pw = window.prompt("Enter password to open menu");
              if (pw === "33Superman33") {
                sessionStorage.setItem("menu_unlocked", "1");
                setDrawerOpen(true);
              } else if (pw !== null) {
                toast.error("Incorrect password");
              }
            }}
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
          <p className="truncate font-bebas text-lg tracking-wider leading-tight">
            <span className="text-foreground">Auction Draft</span>{" "}
            <span className="text-accent">Assistant</span>
          </p>
        </div>
      </header>

      {/* ── SPEND BAR ───────────────────────────────────────── */}
      <div className="h-[3px] shrink-0 bg-muted">
        <div
          className="h-full transition-all"
          style={{
            width: `${spentPct}%`,
            background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)",
            boxShadow: "0 0 10px hsl(var(--primary) / 0.6)",
          }}
        />
      </div>

      <Tabs defaultValue="planner" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-2 border-b border-border bg-background/95 px-2.5 pb-2 pt-2 backdrop-blur-sm">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="planner">Budget Planner</TabsTrigger>
            <TabsTrigger value="top100">Top 100</TabsTrigger>
          </TabsList>
          {(() => {
            const allocated = Object.values(slotAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
            const moneyLeft = settings.totalBudget - allocated;
            return (
              <div className="flex items-baseline justify-between gap-3 pr-[44px]">
                <div className="flex items-baseline gap-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Budget</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">$</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={settings.totalBudget}
                    onChange={(e) => {
                      const v = Math.max(1, Math.floor(Number(e.target.value) || 0));
                      useDraftStore.getState().setSettings({ totalBudget: v });
                    }}
                    className="w-16 bg-transparent text-xl font-bold tabular-nums text-center text-foreground outline-none focus:ring-0 border-b border-transparent focus:border-accent"
                    aria-label="Total auction budget"
                  />
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-bold tabular-nums ${moneyLeft >= 0 ? "text-accent" : "text-destructive"}`}
                    style={moneyLeft >= 0 ? { textShadow: "0 0 12px hsl(var(--accent) / 0.4)" } : undefined}
                  >
                    ${moneyLeft}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">left</span>
                </div>
              </div>
            );
          })()}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-20 pt-2">
          <TabsContent value="planner" className="space-y-2 mt-0">
            <PositionBudgetBar />
            {events.length > 0 && (
              <LastPickImpact settings={settings} keepers={keepers} events={events} />
            )}
          </TabsContent>

          <TabsContent value="top100" className="mt-0">
            <Top100List
              prices={adjustedPrices}
              anchorMap={anchorMap}
              events={events}
              onPick={(name, position) => openDetails(name, position)}
            />
          </TabsContent>
        </div>
      </Tabs>




      {/* ── BOTTOM BAR (fixed/frozen) ──────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-center gap-16 px-3 py-2">
          <Sheet open={panel === "calc"} onOpenChange={(o) => setPanel(o ? "calc" : null)}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Auction calculator"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-card text-accent shadow-[0_0_14px_hsl(var(--accent)/0.3)] hover:bg-accent/10 active:scale-95 transition"
              >
                <Calculator className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[92%] max-w-md flex-col p-0 sm:w-[420px]">
              <SheetHeader className="border-b border-border px-4 py-3">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Calculator className="h-4 w-4 text-accent" />
                  Auction calculator
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
                <AuctionCalculator
                  prices={adjustedPrices}
                  onShowDetails={(name, position) => setDetailFor({ name, position })}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Coach FAB */}
          <Sheet open={aiOpen} onOpenChange={setAiOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ask the Coach"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-accent-foreground shadow-[0_0_18px_hsl(var(--accent)/0.55)] active:scale-95 transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[92%] max-w-md flex-col p-0 sm:w-[420px]">
              <SheetHeader className="border-b border-border/60 px-4 py-3">
                <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
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
                    context: settings.context,
                  },
                  budget,
                  keepers,
                  myRoster: myItems,
                  rosterRequired: requiredCount,
                  rosterFilled: myCount,
                  events,
                  prices: adjustedPrices,
                  spendByPosition: spend,
                  recentRuns: runs,
                  draftedPlayers: events.map((e) => e.player),
                  showMath: false,
                  strategy: {
                    id: "none",
                    label: "Manual",
                    guidance: "",
                  },
                  budgetBoard: buildPlannerBoard(settings, slotAllocations, slotNotes, lockedSlots),
                })}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ── SLIDE-IN PANEL (search / top50 / recent) ────────── */}
      {panel && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setPanel(null)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full flex-col bg-background shadow-[-20px_0_60px_rgba(0,0,0,0.8)] sm:w-[min(100%,460px)]"
            style={{ animation: "tool-panel-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both" }}
          >
            <div
              className="flex shrink-0 items-center gap-3 border-b border-border/60 px-3 pt-1 pb-2"
            >
              <button
                onClick={() => setPanel(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/40 hover:bg-secondary/80"
                aria-label="Close"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <h2 className="text-base font-semibold">
                {panel === "calc" && "Auction calculator"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
              {panel === "calc" && (
                <div className="space-y-3">
                  <AuctionCalculator
                    prices={adjustedPrices}
                    onShowDetails={(name, position) => setDetailFor({ name, position })}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Player details modal */}
      {(() => {
        const key = detailFor ? norm(detailFor.name) : "";
        const sheet = detailFor ? adjustedPrices.find((p) => norm(p.name) === key) : undefined;
        const anchor = key ? anchorMap[key] : undefined;
        let posRank: number | undefined;
        let totalAtPos: number | undefined;
        const pos = detailFor?.position ?? sheet?.position;

        // Preferred source: ESPN player ranks (always populated post-connect)
        const espnRank = detailFor ? lookupRank(detailFor.name) : null;
        if (espnRank?.pos_rank && (espnRank.position === pos || !pos)) {
          posRank = espnRank.pos_rank;
        }

        if (pos) {
          const samePos = prices
            .filter((p) => p.position === pos && p.price > 0)
            .map((p) => ({ name: p.name, price: p.price }));
          if (samePos.length >= 5) {
            totalAtPos = samePos.length;
            // Fall back to sheet-based rank only if ESPN didn't provide one
            if (posRank == null) {
              if (detailFor && !samePos.some((p) => norm(p.name) === key)) {
                const anchorPrice = anchor?.price;
                if (anchorPrice && anchorPrice > 0) {
                  samePos.push({ name: detailFor.name, price: anchorPrice });
                  totalAtPos = samePos.length;
                }
              }
              samePos.sort((a, b) => b.price - a.price);
              const idx = samePos.findIndex((p) => norm(p.name) === key);
              if (idx >= 0) posRank = idx + 1;
            }
          }
        }
        return (
          <PlayerDetailsOverlay
            open={!!detailFor}
            onOpenChange={(o) => !o && setDetailFor(null)}
            name={detailFor?.name ?? ""}
            leagueName={""}
            position={detailFor?.position}
            sheetPrice={sheet?.price}
            anchor={anchor}
            posRank={posRank}
            totalAtPos={totalAtPos}
            overallRank={espnRank?.overall_rank ?? undefined}
            remaining={budget.remaining}
            maxBid={budget.maxBid}
            slotsLeft={budget.slotsLeft}
            gaps={gaps}
          />
        );
      })()}

      {/* Pin controls */}
      {detailFor && (
        <PinControls
          name={detailFor.name}
          isPinned={watchlist.includes(detailFor.name)}
          onPin={pinPlayer}
          onUnpin={unpinPlayer}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function PinControls({
  name,
  isPinned,
  onPin,
  onUnpin,
}: {
  name: string;
  isPinned: boolean;
  onPin: (n: string) => void;
  onUnpin: (n: string) => void;
}) {
  return (
    <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2" style={{ pointerEvents: "auto" }}>
      <Button
        size="sm"
        variant={isPinned ? "secondary" : "default"}
        onClick={() => (isPinned ? onUnpin(name) : onPin(name))}
        className="shadow-lg"
      >
        {isPinned ? "Unpin" : "Pin to watchlist"}
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function RecentPicksList({
  events,
  onPick,
}: {
  events: ReturnType<typeof useDraftStore.getState>["events"];
  onPick: (name: string, position?: Position) => void;
}) {
  return (
    <div className="space-y-1">
      {events.map((e, i) => (
        <button
          key={`${e.player}-${i}`}
          type="button"
          onClick={() => onPick(e.player, e.position)}
          className="flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-left text-xs hover:bg-secondary/40"
        >
          {e.position && (
            <Badge variant="outline" className={`${POS_COLORS[e.position] ?? ""} text-[10px] px-1.5 py-0`}>
              {e.position}
            </Badge>
          )}
          <span className="flex-1 truncate font-medium">{e.player}</span>
          <span className="font-mono tabular-nums">${e.price}</span>
          <span className="w-16 truncate text-right text-[10px] text-muted-foreground">
            {e.drafter === "me" ? "you" : (e as any).drafterName ?? "—"}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
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
        <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
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


// ─────────────────────────────────────────────────────────────────────────────
const POSITION_FILTER_OPTIONS: (Position | "ALL")[] = [
  "ALL", "QB", "RB", "WR", "TE", "K", "DST",
];

function Top100List({
  prices,
  anchorMap,
  events,
  onPick,
}: {
  prices: PriceEstimate[];
  anchorMap: Record<string, AnchorEntry>;
  events: ReturnType<typeof useDraftStore.getState>["events"];
  onPick: (name: string, position?: Position) => void;
}) {
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<Position | "ALL">("ALL");
  const drafted = useMemo(() => new Set(events.map((e) => norm(e.player))), [events]);
  const top = useMemo(() => {
    type Row = { name: string; price: number; position?: PriceEstimate["position"] };
    const byName = new Map<string, Row>();
    for (const p of prices) {
      const key = norm(p.name);
      const anchor = anchorMap[key]?.price;
      const finalPrice = anchor && anchor > 0 ? anchor : p.price;
      if (finalPrice > 0) byName.set(key, { name: p.name, price: finalPrice, position: p.position });
    }
    return Array.from(byName.values()).sort((a, b) => b.price - a.price).slice(0, 100);
  }, [prices, anchorMap]);

  const filtered = useMemo(() => {
    const s = norm(search);
    return top.filter((p) => {
      if (s && !norm(p.name).includes(s)) return false;
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      return true;
    });
  }, [top, search, posFilter]);

  const rows = filtered.map((r) => ({ name: r.name, position: r.position, price: r.price as number | null }));

  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Loading consensus rankings…
      </p>
    );
  }

  const activeFilters = search.trim() !== "" || posFilter !== "ALL";
  const clearFilters = () => {
    setSearch("");
    setPosFilter("ALL");
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search players…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 pr-9 text-sm"
        />
        {search.trim() !== "" && (
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
      <div className="flex items-center gap-2">
        <div className="flex flex-1 overflow-hidden rounded-lg border border-border bg-secondary/20">
          {POSITION_FILTER_OPTIONS.map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosFilter(pos)}
              className={`flex-1 px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                posFilter === pos
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-secondary/40"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
        {activeFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 rounded-lg border border-border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:bg-secondary/40 hover:text-foreground"
          >
            Reset
          </button>
        )}
      </div>
      <div className="space-y-1">
        {rows.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No players match.</p>
        )}
        {rows.map((p, i) => {
          const isPicked = drafted.has(norm(p.name));
          const isFiftyDivider = i === 50 && search.trim() === "" && posFilter === "ALL";
          return (
            <div key={p.name}>
              {isFiftyDivider && (
                <div className="my-2 flex items-center gap-2">
                  <div className="h-[3px] flex-1 bg-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                    Next 50
                  </span>
                  <div className="h-[3px] flex-1 bg-foreground" />
                </div>
              )}
              <button
                type="button"
                disabled={isPicked}
                onClick={() => !isPicked && onPick(p.name, p.position)}
                className={`flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-left text-xs hover:bg-secondary/40 ${isPicked ? "opacity-50" : ""}`}
              >
                <span className="w-6 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                {p.position && (
                  <Badge variant="outline" className={`${POS_COLORS[p.position] ?? ""} text-[10px] px-1.5 py-0`}>
                    {p.position}
                  </Badge>
                )}
                <span className={`flex-1 truncate font-medium ${isPicked ? "line-through" : ""}`}>{p.name}</span>
                {p.price != null && <span className="font-mono tabular-nums">${p.price}</span>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// BudgetSnapshot — read-only summary shown inside the Budget panel.
// ─────────────────────────────────────────────────────────────────────────────
function BudgetSnapshot({
  teamName,
  remaining,
  total,
  maxBid,
  slotsLeft,
  gaps,
}: {
  teamName: string;
  remaining: number;
  total: number;
  maxBid: number;
  slotsLeft: number;
  gaps: { pos: Position; severity: "critical" | "need" | "depth" | "done"; starterShort: number }[];
}) {
  const spent = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0;

  return (
    <section className="rounded-lg border border-border bg-secondary/20 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {teamName}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Budget</p>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat label="Remaining" value={`$${remaining}`} hero />
        <Stat label="Max bid" value={`$${maxBid}`} />
        <Stat label="Slots left" value={String(slotsLeft)} />
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Spent ${spent} of ${total}</span>
          <span className="font-mono">{pct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {gaps.filter((g) => g.severity !== "done").length > 0 && (
        <div className="flex flex-wrap gap-1">
          {gaps
            .filter((g) => g.severity !== "done")
            .map((g) => (
              <span
                key={g.pos}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  g.severity === "critical"
                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                    : g.severity === "need"
                      ? "border-warning/50 bg-warning/10 text-warning"
                      : "border-border bg-secondary/40 text-muted-foreground"
                }`}
              >
                {g.pos} -{g.starterShort}
              </span>
            ))}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, hero = false }: { label: string; value: string; hero?: boolean }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/60 p-2 text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-mono tabular-nums ${hero ? "text-xl font-semibold text-foreground" : "text-base font-medium text-foreground/90"}`}>
        {value}
      </p>
    </div>
  );
}
