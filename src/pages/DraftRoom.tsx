// DraftRoom.tsx — live auction sidecar.
// Primary view: available players within your budget, updating in real time.
// Everything else is one tap away.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  Search,
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
import { computeMarketPulse } from "@/lib/value";
import { useAnchorMap } from "@/lib/use-anchor-map";
import { Position, PriceEstimate } from "@/lib/draft-types";
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
import OpponentHeatmap from "@/components/OpponentHeatmap";
import AiQuickPanel from "@/components/AiQuickPanel";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";
import PositionBudgetBar, { DraftStrategyPanel } from "@/components/PositionBudgetBar";
import NextTargetCard from "@/components/NextTargetCard";
import LastPickImpact from "@/components/LastPickImpact";
import BestAvailableBoard from "@/components/BestAvailableBoard";
import SyncStatusPill from "@/components/SyncStatusPill";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

type PanelId = "search" | "top50" | "recent";
type TabId = "plan" | "board";

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
  } = useDraftStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("plan");
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

  const { map: anchorMap } = useAnchorMap();

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
  const pulse = useMemo(() => computeMarketPulse(events, prices), [events, prices]);
  // Re-price undrafted players in real time as players come off the board.
  const adjustedPrices = useMemo(() => adjustPricesForDrafted(prices, events), [prices, events]);

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
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-background px-2 py-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Menu">
              <Menu className="h-5 w-5" strokeWidth={2} />
            </Button>
          </SheetTrigger>
          <SettingsDrawer
            onClose={() => setDrawerOpen(false)}
            onSignOut={async () => { await signOut(); navigate("/auth"); }}
            onGoToSetup={() => navigate("/setup")}
            onGoToEspn={() => navigate("/espn")}
          />
        </Sheet>

        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold leading-tight">
            {leagueName || selectedTeam?.name || "Draft Room"}
          </p>
          {selectedTeam && leagueName && (
            <p className="truncate text-[10px] text-muted-foreground">{selectedTeam.name}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span className="font-mono text-sm font-bold tabular-nums">${budget.remaining} left</span>
          <span className="text-[10px] text-muted-foreground">max ${budget.maxBid} · {budget.slotsLeft} slots</span>
        </div>
      </header>

      {/* ── SPEND BAR ───────────────────────────────────────── */}
      <div className="h-1 shrink-0 bg-secondary/50">
        <div className="h-full bg-primary transition-all" style={{ width: `${spentPct}%` }} />
      </div>

      {/* ── TAB TOGGLE ──────────────────────────────────────── */}
      <div className="flex shrink-0 gap-1 border-b border-border/60 bg-background px-3 py-2">
        <button
          onClick={() => setTab("plan")}
          className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${
            tab === "plan"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Plan
        </button>
        <button
          onClick={() => setTab("board")}
          className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${
            tab === "board"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Board {liveBid && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" />}
        </button>
      </div>

      {/* ── PLAN TAB ────────────────────────────────────────── */}
      {tab === "plan" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-24 pt-3">
          <div className="space-y-4">
            {/* Budget summary */}
            {selectedTeam && (
              <BudgetSnapshot
                teamName={selectedTeam.name}
                remaining={budget.remaining}
                total={budget.totalBudget}
                maxBid={budget.maxBid}
                slotsLeft={budget.slotsLeft}
                gaps={gaps}
              />
            )}
            {/* Strategy picker + per-slot budget allocations */}
            <PositionBudgetBar />
            {/* Next target recommendation */}
            {selectedTeam && (
              <NextTargetCard
                settings={settings}
                gaps={gaps}
                spend={spend}
                remaining={budget.remaining}
                prices={adjustedPrices}
                events={events}
                pulse={pulse}
              />
            )}
            {/* Last pick delta */}
            {events.length > 0 && (
              <LastPickImpact settings={settings} keepers={keepers} events={events} />
            )}
            {/* Opponent spending heatmap */}
            <OpponentHeatmap settings={settings} />
          </div>
        </div>
      )}

      {/* ── BOARD TAB ───────────────────────────────────────── */}
      {tab === "board" && (
        <div className="min-h-0 flex-1 overflow-hidden">
          <BestAvailableBoard
            prices={adjustedPrices}
            events={events}
            maxBid={budget.maxBid}
            remaining={budget.remaining}
            liveBid={liveBid}
            onSelect={openDetails}
          />
        </div>
      )}

      {/* ── BOTTOM BAR ──────────────────────────────────────── */}
      <div
        className="shrink-0 border-t border-border/60 bg-background/95 backdrop-blur-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center px-3 py-2">
          <button
            onClick={() => setPanel("search")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span className="text-xs font-medium">Find</span>
          </button>
          <button
            onClick={() => setPanel("top50")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          >
            <span className="text-xs font-medium">Top 50</span>
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
              className="flex shrink-0 items-center gap-3 border-b border-border/60 px-3 py-3"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
            >
              <button
                onClick={() => setPanel(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/40 hover:bg-secondary/80"
                aria-label="Close"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2} />
              </button>
              <h2 className="text-base font-semibold">
                {panel === "search" && "Find a player"}
                {panel === "top50" && (leagueName ? `${leagueName}'s Top 50` : "Top 50")}
                {panel === "recent" && "Recent picks"}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
              {panel === "search" && (
                <LookupSection
                  prices={adjustedPrices}
                  anchorMap={anchorMap}
                  events={events}
                  onPick={openDetails}
                />
              )}
              {panel === "top50" && (
                <Top100List
                  prices={adjustedPrices}
                  anchorMap={anchorMap}
                  events={events}
                  onPick={openDetails}
                />
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
        const sheet = detailFor ? prices.find((p) => norm(p.name) === key) : undefined;
        const anchor = key ? anchorMap[key] : undefined;
        let posRank: number | undefined;
        let totalAtPos: number | undefined;
        const pos = detailFor?.position ?? sheet?.position;
        if (pos) {
          const samePos = prices
            .filter((p) => p.position === pos && p.price > 0)
            .sort((a, b) => b.price - a.price);
          totalAtPos = samePos.length;
          const idx = samePos.findIndex((p) => norm(p.name) === key);
          if (idx >= 0) posRank = idx + 1;
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
// Lookup — search by name or "$X" → undrafted players at/under that price
// ─────────────────────────────────────────────────────────────────────────────
function LookupSection({
  prices,
  anchorMap,
  events,
  onPick,
}: {
  prices: PriceEstimate[];
  anchorMap: Record<string, import("@/lib/decision-engine").AnchorEntry>;
  events: ReturnType<typeof useDraftStore.getState>["events"];
  onPick: (name: string, position?: Position) => void;
}) {
  const [input, setInput] = useState("");
  const drafted = useMemo(
    () => new Set(events.map((e) => norm(e.player))),
    [events],
  );

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
      return pool.filter((p) => p.price > 0 && p.price <= target).sort((a, b) => b.price - a.price).slice(0, 30);
    }
    if (!isDollar && trimmed.length >= 2) {
      const q = norm(trimmed);
      return pool.filter((p) => norm(p.name).includes(q)).sort((a, b) => b.price - a.price).slice(0, 30);
    }
    return [];
  }, [pricedPool, drafted, target, trimmed, isDollar]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/50 bg-secondary/20 p-2.5 text-xs text-muted-foreground">
        Type a <span className="font-semibold text-foreground">player name</span> or a{" "}
        <span className="font-semibold text-foreground">dollar amount</span>. Tap a result to see details.
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. Bijan Robinson  or  25"
        className="h-9"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="space-y-1">
        {trimmed.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Search a player by name, or enter a $ amount.
          </p>
        )}
        {trimmed.length > 0 && matches.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            {isDollar ? `No undrafted players priced at or under $${target}.` : "No matches in your price sheet."}
          </p>
        )}
        {matches.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p.name, p.position)}
            className="flex w-full items-center gap-2 rounded border border-border/40 bg-secondary/20 px-2 py-1.5 text-left text-xs hover:bg-secondary/40"
          >
            {p.position && (
              <Badge variant="outline" className={`${POS_COLORS[p.position] ?? ""} text-[10px] px-1.5 py-0`}>
                {p.position}
              </Badge>
            )}
            <span className="flex-1 truncate font-medium">{p.name}</span>
            <span className="font-mono tabular-nums">${p.price}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
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
  anchorMap: Record<string, import("@/lib/decision-engine").AnchorEntry>;
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
    return Array.from(byName.values()).sort((a, b) => b.price - a.price).slice(0, 50);
  }, [prices, anchorMap]);

  if (top.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No price sheet loaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {top.map((p, i) => {
        const isPicked = drafted.has(norm(p.name));
        return (
          <button
            key={p.name}
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
            <span className="font-mono tabular-nums">${p.price}</span>
          </button>
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
