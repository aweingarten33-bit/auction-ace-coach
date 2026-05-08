// DraftRoom.tsx — research-only home page.
// Read-only by default. No bidding, no nominating, no "what to bid" logic.
// Surfaces: player search, top-100 board, market heat, opponent room,
// vetri takes, fantasy life feed, watchlist, AI coach Q&A.
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
  ListOrdered,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useDraftStore } from "@/lib/draft-store";
import { useAuth } from "@/hooks/useAuth";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { supabase } from "@/integrations/supabase/client";
import {
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
import MarketHeat from "@/components/MarketHeat";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";
import AiQuickPanel from "@/components/AiQuickPanel";
import FantasyLifeFeed from "@/components/FantasyLifeFeed";
import PlayerDetailsOverlay from "@/components/PlayerDetailsOverlay";

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
    pinPlayer,
    unpinPlayer,
  } = useDraftStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  type ToolId = "lookup" | "top100" | "market" | "fantasylife";
  const [toolPage, setToolPage] = useState<ToolId | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [detailFor, setDetailFor] = useState<{ name: string; position?: Position } | null>(null);
  const [leagueName, setLeagueName] = useState("");

  // Read-only live sync — no interaction, just shows live picks as they come in
  useEspnLiveSync({ expectingEvents: setupComplete });

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
      const found = rows.find((r) => r?.raw?.league?.name)?.raw?.league?.name as string | undefined;
      if (found) {
        setLeagueName(found);
        try { localStorage.setItem("league_name_cache", found); } catch { /* ignore */ }
      }
    })();
  }, []);

  // Anchor price map: league 3yr avg + ESPN auction value (research data)
  const { map: anchorMap } = useAnchorMap();

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
    setToolPage(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div
        className="origin-center"
        style={{
          transform: toolPage ? "scale(0.94) translateX(-18px)" : "none",
          transition: "transform 850ms cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        {/* ── LEAGUE TITLE ─────────────────────────────────────────── */}
        <div
          className="relative px-5 pt-10 pb-4 text-left"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)" }}
        >
          <h1 className="text-[34px] leading-[1.05] font-semibold tracking-tight text-foreground">
            {leagueName ? `The ${leagueName}` : "The Bro We're Senior Citizens"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Draft research dossier
          </p>
        </div>

        {/* ── ICON RAIL ─────────────────────────────────────────── */}
        <div className="relative px-5 pb-4">
          <div className="-mx-5 px-5 flex gap-7 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {[
              { id: "lookup" as const,      icon: Search,       label: "Find" },
              { id: "top100" as const,      icon: ListOrdered,  label: "Top 100" },
              { id: "market" as const,      icon: TrendingUp,   label: "Market" },
              { id: "fantasylife" as const, icon: ExternalLink, label: "News" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setToolPage(id)}
                className="flex flex-col items-center gap-2 shrink-0 text-foreground active:opacity-70 transition"
              >
                <Icon strokeWidth={1.25} className="size-9" />
                <span className="text-[13px] font-normal whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Hamburger drawer ─────────────────────────────────────── */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="fixed left-4 z-40 h-14 w-14 rounded-full border border-border/60 bg-background/85 backdrop-blur-md text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.45)] hover:bg-foreground/10 hover:text-foreground focus-visible:ring-foreground/30"
              style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
            >
              <Menu className="h-7 w-7" strokeWidth={2.5} />
            </Button>
          </SheetTrigger>
          <SettingsDrawer
            onClose={() => setDrawerOpen(false)}
            onSignOut={async () => {
              await signOut();
              navigate("/auth");
            }}
            onGoToSetup={() => navigate("/setup")}
            onGoToEspn={() => navigate("/espn")}
          />
        </Sheet>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <main className="mx-auto max-w-3xl space-y-3 px-3 pt-2 pb-24">
          {/* Recent picks (read-only live ticker) */}
          {events.length > 0 && (
            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent picks
              </p>
              <RecentPicksList events={events.slice(-8).reverse()} onPick={openDetails} />
            </section>
          )}

          {/* Roster snapshot */}
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
                    onClick={() => openDetails(it.player, it.position)}
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

          {/* Watchlist */}
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
                    onClick={() => openDetails(name)}
                    className="rounded-full border border-border bg-secondary/30 px-2.5 py-1 text-xs font-medium hover:bg-secondary/60"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {events.length === 0 && watchlist.length === 0 && myItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              <p className="mb-2 font-semibold text-foreground">Welcome to your draft research dossier.</p>
              <p>Tap <span className="font-semibold">Find</span> to look up any player, <span className="font-semibold">Top 100</span> for the value board, or <span className="font-semibold">Market</span> for room pulse.</p>
            </div>
          )}
        </main>

        {/* AI Tools FAB */}
        <Sheet open={aiOpen} onOpenChange={setAiOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Open AI tools"
              className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#1c1c1c]/95 backdrop-blur text-white shadow-[0_10px_30px_rgba(0,0,0,0.7)] active:scale-95 transition"
              style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            >
              <Sparkles className="h-6 w-6" strokeWidth={1.5} />
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
                prices,
                spendByPosition: spend,
                recentRuns: runs,
                draftedPlayers: events.map((e) => e.player),
                showMath: false,
              })}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* ── SLIDE-IN TOOL PANEL ───────────────────────────────────────── */}
      {toolPage && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-lg animate-fade-in"
            style={{ animationDuration: "0.7s" }}
            onClick={() => setToolPage(null)}
            aria-hidden
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-1/2 bg-background text-foreground shadow-[-20px_0_80px_rgba(0,0,0,0.85)] overflow-y-auto"
            style={{
              animation: "tool-panel-in 0.95s cubic-bezier(0.22, 1, 0.36, 1) both",
              transformOrigin: "right center",
            }}
          >
            <div className="px-5" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
              <button
                type="button"
                onClick={() => setToolPage(null)}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c1c] text-foreground active:scale-95 hover:bg-[#262626] transition"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2} />
              </button>
              <h1 className="mt-8 mb-2 text-[44px] leading-[1.02] font-semibold tracking-tight">
                {toolPage === "lookup" && "Find"}
                {toolPage === "top100" && "Top 100"}
                {toolPage === "market" && "Market"}
                {toolPage === "fantasylife" && "News"}
              </h1>
              <p className="mb-6 text-sm text-muted-foreground">
                {toolPage === "lookup" && "Search any player or dollar amount."}
                {toolPage === "top100" && "Best-value board, math-backed."}
                {toolPage === "market" && "Room pulse plus opponent scan."}
                {toolPage === "fantasylife" && "Latest from fantasylife.com."}
              </p>
            </div>

            <div className="px-3 pb-24">
              {toolPage === "lookup" && (
                <LookupSection
                  prices={prices}
                  anchorMap={anchorMap}
                  events={events}
                  onPick={openDetails}
                />
              )}
              {toolPage === "top100" && (
                <Top100List
                  prices={prices}
                  anchorMap={anchorMap}
                  events={events}
                  onPick={openDetails}
                />
              )}
              {toolPage === "market" && (
                <div className="space-y-3">
                  <MarketHeat
                    events={events}
                    prices={prices}
                    gaps={gaps}
                    maxBid={budget.maxBid}
                    remaining={budget.remaining}
                    pulseMultiplier={pulse.multiplier}
                  />
                  <OpponentHeatmap settings={settings} />
                </div>
              )}
              {toolPage === "fantasylife" && <FantasyLifeFeed />}
            </div>
          </div>
        </>
      )}

      {/* Player details modal */}
      <PlayerDetailsOverlay
        open={!!detailFor}
        onOpenChange={(o) => !o && setDetailFor(null)}
        name={detailFor?.name ?? ""}
        position={detailFor?.position}
      />

      {/* Pin/unpin chip strip when a detail is open */}
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
  // Floating quick-action strip beneath the modal — non-blocking.
  return (
    <div
      className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2"
      style={{ pointerEvents: "auto" }}
    >
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
        Type a <span className="font-semibold text-foreground">player name</span> or a <span className="font-semibold text-foreground">dollar amount</span>. Tap a result to see details and analyst takes.
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
    return Array.from(byName.values()).sort((a, b) => b.price - a.price).slice(0, 100);
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
