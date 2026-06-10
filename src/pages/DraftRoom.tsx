// DraftRoom.tsx — live auction sidecar.
// Primary view: available players within your budget, updating in real time.
// Everything else is one tap away.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Calculator,
  
  Settings,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useDraftStore } from "@/lib/draft-store";

import { useAuth } from "@/hooks/useAuth";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { useSelectedTeam } from "@/hooks/useSelectedTeam";
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
import { buildPlannerBoard } from "@/lib/planner-slots";
import LastPickImpact from "@/components/LastPickImpact";
import AuctionCalculator from "@/components/AuctionCalculator";
import { loadBlendedAuctionPrices, PRICE_SOURCE_VERSION } from "@/lib/price-blend";

import SyncStatusPill from "@/components/SyncStatusPill";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type PanelId = "recent" | "calc";


// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DraftRoom() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { team: selectedTeam } = useSelectedTeam();
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
  const [leagueName, setLeagueName] = useState("");

  // Redirect to setup if no data yet (admin only; guests can view).
  useEffect(() => {
    const isGuest = !user || user.is_anonymous;
    if (!isGuest && !setupComplete && prices.length === 0 && events.length === 0) {
      navigate("/setup", { replace: true });
    }
  }, [user, setupComplete, prices.length, events.length, navigate]);

  // Live sync — picks auto-tag as "me", nominations show the current bid climbing
  const { liveBid } = useEspnLiveSync({
    expectingEvents: setupComplete,
    teamIdOverride: selectedTeam?.id ?? null,
  });

  // Pull league name from ESPN, with cache fallback
  useEffect(() => {
    (async () => {
      const cached = localStorage.getItem("league_name_cache");
      if (cached) setLeagueName(cached);
      try {
        const { data } = await supabase.functions.invoke("league-teams");
        const name = (data as any)?.league?.name as string | undefined;
        if (name) {
          setLeagueName(name);
          try { localStorage.setItem("league_name_cache", name); } catch { /* ignore */ }
          return;
        }
      } catch { /* fall through */ }
      const { data: ev } = await supabase
        .from("live_draft_events")
        .select("raw")
        .order("created_at", { ascending: false })
        .limit(25);
      const rows = (ev ?? []) as Array<{ raw: any }>;
      const found = rows.find((r) => r?.raw?.league?.name)?.raw?.league?.name as string | undefined;
      if (found) {
        setLeagueName(found);
        try { localStorage.setItem("league_name_cache", found); } catch { /* ignore */ }
      }
    })();
  }, []);

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
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-2 pt-1 pb-2"
      >
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
            onGoToEspn={() => navigate("/espn")}
          />
        </Sheet>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-lg font-bold leading-tight">
            Auction Draft Assistant
          </p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {selectedTeam && leagueName && (
              <span className="truncate text-[10px] text-muted-foreground">{selectedTeam.name}</span>
            )}
            <SyncStatusPill compact />
          </div>
        </div>

      </header>

      {/* ── SPEND BAR ───────────────────────────────────────── */}
      <div className="h-1 shrink-0 bg-secondary/50">
        <div className="h-full bg-primary transition-all" style={{ width: `${spentPct}%` }} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-3">
        <div className="space-y-4">
          {/* Budget summary */}
          {selectedTeam && (() => {
            const allocated = Object.values(slotAllocations).reduce((a, b) => a + (Number(b) || 0), 0);
            const moneyLeft = budget.totalBudget - allocated;
            return (
              <div className="flex items-center gap-4">
                <span className="font-semibold">{selectedTeam.name}</span>
                <span className="text-xl font-bold">Budget ${budget.totalBudget}</span>
                <span className={`text-xl font-bold ${moneyLeft >= 0 ? "" : "text-destructive"}`}>
                  Money left ${moneyLeft}
                </span>
              </div>
            );
          })()}
          {/* Strategy picker + per-slot budget allocations */}
          <PositionBudgetBar />
          {/* Last pick delta */}
          {events.length > 0 && (
            <LastPickImpact settings={settings} keepers={keepers} events={events} />
          )}
        </div>
      </div>

      {/* ── BOTTOM BAR (fixed/frozen) ──────────────────────── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center px-3 py-2">
        
          <button
            onClick={() => setPanel("calc")}
            aria-label="Auction calculator"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          >
            <Calculator className="h-5 w-5" />
            <span className="text-xs font-medium">Auction calculator</span>
          </button>
          <button
            onClick={() => setPanel("recent")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          >
            <Clock className="h-4 w-4" />
            <span className="text-xs font-medium">Recent</span>
          </button>

          {/* Coach FAB */}
          <Sheet open={aiOpen} onOpenChange={setAiOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ask the Coach"
                className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-lg active:scale-95 transition"
              >
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
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
                {panel === "recent" && "Recent picks"}
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
              {panel === "recent" && (
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No picks yet.</p>
                  ) : (
                    <RecentPicksList
                      events={events.slice(-20).reverse()}
                      onPick={(n, p) => { setPanel(null); openDetails(n, p); }}
                    />
                  )}
                  {myItems.length > 0 && (
                    <section>
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Your roster ({myItems.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {myItems.map((it) => (
                          <button
                            key={it.player}
                            type="button"
                            onClick={() => { setPanel(null); openDetails(it.player, it.position); }}
                            className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-xs hover:bg-secondary/60"
                          >
                            {it.position && (
                              <span className={`text-[9px] font-semibold ${POS_COLORS[it.position] ?? ""}`}>
                                {it.position}
                              </span>
                            )}
                            <span className="font-medium">{it.player}</span>
                            {it.price != null && (
                              <span className="font-mono text-[10px] text-muted-foreground">${it.price}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
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
                            onClick={() => { setPanel(null); openDetails(name); }}
                            className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/60"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
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
            leagueName={leagueName}
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
  onGoToEspn,
}: {
  onClose: () => void;
  onSignOut: () => void;
  onGoToSetup: () => void;
  onGoToEspn: () => void;
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
          onClick={() => { onClose(); onGoToEspn(); }}
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
    </SheetContent>
  );
}

function RefreshLeagueButton({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { error } = await supabase.functions.invoke("espn-sync");
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
  const rows = top.map((r) => ({ name: r.name, position: r.position, price: r.price as number | null }));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        Loading consensus rankings…
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {rows.map((p, i) => {
        const isPicked = drafted.has(norm(p.name));
        const isFiftyDivider = i === 50;
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
