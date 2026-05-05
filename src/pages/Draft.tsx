// Single responsive draft page. Same layout on phone and desktop.
// Three vertical zones (input → decision → context) on mobile,
// two-column grid on md+, with the coach accessible from a Sheet (FAB).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import CoachMessage from "@/components/CoachMessage";
import { parseBidQuery } from "@/lib/bid-query";
import coachBotImg from "@/assets/coach-bot.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { ApiError, fetchNominations, fetchTargets, streamCoach } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useDraftStore } from "@/lib/draft-store";
import {
  computeBudget,
  countByPosition,
  recentRuns,
  spendByPosition,
} from "@/lib/draft-math";
import { DraftEvent, Position, PriceEstimate } from "@/lib/draft-types";
import { POSITIONS } from "@/lib/positions";
import {
  Undo2, Trophy, RotateCcw, Send, Sparkles, Settings2,
  User, Users, Download, MoreVertical, ChevronLeft,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import UpNextQueue, { QueueTarget } from "@/components/UpNextQueue";
import MarketHeat from "@/components/MarketHeat";
import Watchlist from "@/components/Watchlist";
import EspnSyncStatus from "@/components/EspnSyncStatus";
import LiveBidStrip from "@/components/LiveBidStrip";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import RosterHero, { SlotRow, BestTarget } from "@/components/RosterHero";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { computeMarketPulse, valueFor as computeValueFor, whatIfPick } from "@/lib/value";
import ValueVerdict from "@/components/ValueVerdict";
import TierBreakAlerts from "@/components/TierBreakAlerts";
import DecisionCard from "@/components/DecisionCard";
import NominationCard from "@/components/NominationCard";
import VetriTakesForPlayer from "@/components/VetriTakesForPlayer";
import VetriVideoList from "@/components/VetriVideoList";
import QuickPromptsEditor from "@/components/QuickPromptsEditor";
import VetriPlayerSummary from "@/components/VetriPlayerSummary";
import DraftPlanCard from "@/components/DraftPlanCard";
import { decide } from "@/lib/decision-engine";
import { computeDrain, computeGet } from "@/lib/nomination";


export default function Draft() {
  const navigate = useNavigate();
  const {
    settings, keepers, prices, events, setupComplete, watchlist, dismissed,
    addEvent, undoEvent, resetAll, pinPlayer, unpinPlayer, dismissPlayer,
    quickPrompts, setQuickPrompts, resetQuickPrompts,
    showMath, setShowMath, setDraftPlan,
  } = useDraftStore();
  const [planGenerating, setPlanGenerating] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [takesQuery, setTakesQuery] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [drafter, setDrafter] = useState<"me" | "other">("other");
  const [position, setPosition] = useState<Position | "">("");
  const [coachText, setCoachText] = useState<string>(
    "**Hey — I'm your fantasy football guy.** Think of me as your Matthew Berry / Fantasy Focus voice in your ear during the draft.\n\nAsk me anything: *should I bid on Bijan?* — *who's a sleeper RB?* — *is Kupp worth $40?* — *how do I handle a QB run?* I'll give you a straight take, fast.\n\nI also see your live draft state (budget, roster, who's been picked) so my advice fits *your* draft, not generic rankings.\n\nWhat's on your mind?"
  );
  const [coachHistory, setCoachHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [coachOpen, setCoachOpen] = useState(false);
  const coachRef = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<QueueTarget[]>([]);
  const [openMan, setOpenMan] = useState<string | undefined>(undefined);
  const [manualOpen, setManualOpen] = useState(false);
  const [aiNoms, setAiNoms] = useState<import("@/components/NominationCard").AiNomination[]>([]);

  const espnSync = useEspnLiveSync({ expectingEvents: setupComplete });

  useEffect(() => {
    if (!setupComplete) navigate("/");
  }, [setupComplete, navigate]);

  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);

  const myItems = useMemo(
    () => [
      ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
      ...events.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
    ],
    [keepers, events]
  );

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
    RB: settings.roster.RB,
    WR: settings.roster.WR,
    TE: settings.roster.TE,
    K: settings.roster.K,
    DST: settings.roster.DST,
    FLEX: settings.roster.FLEX,
    BENCH: settings.roster.BENCH,
  };

  const flexNeed = requiredCount.FLEX;
  const flexHave = Math.max(
    0,
    (myCount.RB - requiredCount.RB) + (myCount.WR - requiredCount.WR) + (myCount.TE - requiredCount.TE)
  );
  const flexShort = Math.max(0, flexNeed - flexHave);

  const gaps = (["QB", "RB", "WR", "TE", "DST", "K"] as const)
    .filter((p) => requiredCount[p] > 0)
    .map((pos) => {
      const starterHave = Math.min(myCount[pos], requiredCount[pos]);
      const starterNeed = requiredCount[pos];
      const starterShort = Math.max(0, starterNeed - starterHave);
      const severity: "critical" | "need" | "depth" | "done" =
        starterShort >= 2 ? "critical"
          : starterShort === 1 ? "need"
          : myCount[pos] < starterNeed + 1 && (pos === "RB" || pos === "WR") ? "depth"
          : "done";
      return { pos, starterHave, starterNeed, starterShort, severity };
    })
    .sort((a, b) => {
      const order = { critical: 0, need: 1, depth: 2, done: 3 };
      return order[a.severity] - order[b.severity];
    });

  const startersTotal =
    requiredCount.QB + requiredCount.RB + requiredCount.WR + requiredCount.TE +
    requiredCount.K + requiredCount.DST + requiredCount.FLEX;
  const startersFilled = Math.min(
    startersTotal,
    Math.min(myCount.QB, requiredCount.QB) +
      Math.min(myCount.RB, requiredCount.RB) +
      Math.min(myCount.WR, requiredCount.WR) +
      Math.min(myCount.TE, requiredCount.TE) +
      Math.min(myCount.K, requiredCount.K) +
      Math.min(myCount.DST, requiredCount.DST) +
      Math.min(flexHave, flexNeed)
  );
  const benchFilled = Math.max(0, myItems.length - startersFilled);

  const whatIfFor = (pos: Position, bid: number) =>
    whatIfPick(settings, keepers, events, myCount, requiredCount, pos, bid);

  const heroRows: SlotRow[] = useMemo(() => {
    const sevWeight = { critical: 2.6, need: 1.9, depth: 1.05, done: 0.4 } as const;
    const cap = budget.maxBid;
    const avg = budget.avgPerSlot;
    const rows: SlotRow[] = gaps.map((g) => ({
      pos: g.pos as Position,
      have: g.starterHave,
      need: g.starterNeed,
      short: g.starterShort,
      maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevWeight[g.severity]))),
      severity: g.severity,
    }));
    if (flexNeed > 0) {
      const sev: SlotRow["severity"] = flexShort > 0 ? "need" : "done";
      rows.push({
        pos: "FLEX", have: flexHave, need: flexNeed, short: flexShort,
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevWeight[sev]))),
        severity: sev,
      });
    }
    if (requiredCount.BENCH > 0) {
      const sev: SlotRow["severity"] = benchFilled >= requiredCount.BENCH ? "done" : "depth";
      rows.push({
        pos: "BENCH", have: benchFilled, need: requiredCount.BENCH,
        short: Math.max(0, requiredCount.BENCH - benchFilled),
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevWeight[sev]))),
        severity: sev,
      });
    }
    return rows;
  }, [gaps, flexNeed, flexShort, flexHave, requiredCount.BENCH, benchFilled, budget.maxBid, budget.avgPerSlot]);

  const bestTarget: BestTarget | null = useMemo(() => {
    if (budget.slotsLeft <= 0 || budget.maxBid <= 0) return null;
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const draftedKeys = new Set<string>([
      ...events.map((e) => norm(e.player)),
      ...keepers.map((k) => norm(k.player)),
    ]);
    const priority = heroRows.filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX" && r.short > 0);
    const fallback = heroRows.filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX");
    const ordered = priority.length ? priority : fallback;
    for (const row of ordered) {
      const pos = row.pos as Position;
      const candidates = prices
        .filter((p: PriceEstimate) => {
          if (draftedKeys.has(norm(p.name))) return false;
          if ((p as { position?: Position }).position && (p as { position?: Position }).position !== pos) return false;
          return p.price > 0 && p.price <= Math.max(row.maxBid, budget.maxBid);
        })
        .sort((a, b) => b.price - a.price);
      const top = candidates[0];
      if (top) {
        const v = valueFor(top.name, Math.min(top.price, row.maxBid));
        const reasonBits: string[] = [];
        if (row.severity === "critical") reasonBits.push(`Plugs critical ${pos} hole`);
        else if (row.severity === "need") reasonBits.push(`Fills open ${pos} starter`);
        else reasonBits.push(`Best ${pos} value left`);
        if (v?.verdict && v.verdict !== "unknown") reasonBits.push(v.verdict);
        reasonBits.push(`market $${top.price}`);
        return {
          name: top.name, position: pos,
          maxBid: Math.min(row.maxBid, budget.maxBid),
          reason: reasonBits.join(" · "),
        };
      }
    }
    return null;
  }, [heroRows, prices, events, keepers, budget.slotsLeft, budget.maxBid, valueFor]);

  const handlePin = (name: string) => { pinPlayer(name); toast(`Pinned ${name}`); };
  const handleUnpin = (name: string) => { unpinPlayer(name); };
  const handleDismiss = (name: string) => {
    dismissPlayer(name);
    setQueue((q) => q.filter((t) => t.name !== name));
    toast(`Dismissed ${name}`);
  };
  const handleLoadFromWatchlist = (name: string) => {
    setPlayerName(name); setDrafter("me"); toast(`${name} loaded`);
  };

  const askCoach = async (latestEvent?: DraftEvent, userQuestion?: string) => {
    setCoachOpen(true);
    setStreaming(true);
    setCoachText("");
    if (userQuestion) {
      setCoachHistory((h) => [...h, { role: "user", content: userQuestion }]);
    } else if (latestEvent) {
      setCoachHistory((h) => [
        ...h,
        { role: "user", content: `📌 Logged: ${latestEvent.drafter === "me" ? "[ME]" : "[OTHER]"} ${latestEvent.player} — $${latestEvent.price}` },
      ]);
    }
    let acc = "";
    try {
      await streamCoach(
        {
          settings: {
            totalBudget: settings.totalBudget, numTeams: settings.numTeams,
            scoring: settings.scoring, leagueType: settings.leagueType,
            format: settings.format, keeperIncrease: settings.keeperIncrease,
            context: settings.context,
          },
          budget, keepers, myRoster: myItems,
          rosterRequired: requiredCount, rosterFilled: myCount,
          events, prices, spendByPosition: spend, recentRuns: runs,
          latestEvent, userQuestion,
          vetriTakes: [],
          history: coachHistory.slice(-6),
          draftedPlayers: events.map((e) => e.player),
          showMath: true,
        },
        (chunk) => {
          acc += chunk;
          setCoachText(acc);
          coachRef.current?.scrollTo({ top: 1e9 });
        }
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Assistant error";
      toast.error(msg);
      setCoachText("⚠️ Assistant unavailable.");
      setStreaming(false);
      return;
    } finally {
      setStreaming(false);
    }
    if (acc) setCoachHistory((h) => [...h, { role: "assistant", content: acc }]);
  };

  const generateDraftPlan = async () => {
    setPlanGenerating(true);
    let acc = "";
    try {
      const planPrompt = `Generate my SAVED DRAFT PLAN. This is a sticky reference I'll re-read between picks during long gaps, so make it scannable and decisive.

Format EXACTLY like this (markdown, no preamble):

**Strategy:** <2-3 sentences max — what shape is this team taking, what's the core approach from here based on budget left, roster gaps, and how the room is bidding>

**Top targets (by priority):**
- <Player> (POS) — up to $X — <one short reason>
- <Player> (POS) — up to $X — <one short reason>
- <Player> (POS) — up to $X — <one short reason>
- <Player> (POS) — up to $X — <one short reason>
- <Player> (POS) — up to $X — <one short reason>

**Avoid / let others overpay:** <2-3 names, comma-separated, one short reason each>

**Budget plan:** <one line — how to allocate remaining $$ across remaining slots>

Keep it tight. No fluff, no closing line.`;
      await streamCoach(
        {
          settings: {
            totalBudget: settings.totalBudget, numTeams: settings.numTeams,
            scoring: settings.scoring, leagueType: settings.leagueType,
            format: settings.format, keeperIncrease: settings.keeperIncrease,
            context: settings.context,
          },
          budget, keepers, myRoster: myItems,
          rosterRequired: requiredCount, rosterFilled: myCount,
          events, prices, spendByPosition: spend, recentRuns: runs,
          userQuestion: planPrompt,
          vetriTakes: [],
          history: [],
          draftedPlayers: events.map((e) => e.player),
          showMath: false,
        },
        (chunk) => { acc += chunk; }
      );
      if (acc.trim()) {
        setDraftPlan(acc.trim(), events.length);
        toast.success("Draft plan saved");
      } else {
        toast.error("Couldn't generate plan — try again");
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Plan generation failed";
      toast.error(msg);
    } finally {
      setPlanGenerating(false);
    }
  };

  const targetsMutation = useMutation({
    mutationFn: () => fetchTargets({
      settings: {
        totalBudget: settings.totalBudget, numTeams: settings.numTeams,
        scoring: settings.scoring, leagueType: settings.leagueType,
        format: settings.format, context: settings.context,
      },
      budget, myRoster: myItems,
      rosterRequired: requiredCount, rosterFilled: myCount,
      gaps: gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort })),
      events, prices, spendByPosition: spend, recentRuns: runs,
      dismissed, watchlist,
    }),
    onSuccess: ({ targets, openMan }) => {
      setQueue(targets.filter((t) => !dismissed.includes(t.name)));
      setOpenMan(openMan);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Queue unavailable."),
  });
  const refreshQueue = () => targetsMutation.mutate();

  const nominationsMutation = useMutation({
    mutationFn: () => fetchNominations({
      budget,
      gaps: gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort })),
      myRoster: myItems, events, prices,
    }),
    onSuccess: (suggestions) => setAiNoms(suggestions),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Suggestions unavailable."),
  });
  const fetchAiNominations = () => nominationsMutation.mutate();


  const submitPick = () => {
    const name = playerName.trim();
    const price = parseInt(priceInput, 10);
    if (!name) { toast.error("Enter a player name"); return; }
    if (!Number.isFinite(price) || price <= 0) { toast.error("Enter a valid price"); return; }
    if (drafter === "me" && price > budget.maxBid) {
      toast.error(`Over max bid ($${budget.maxBid})`); return;
    }
    addEvent({
      id: crypto.randomUUID(),
      player: name, price,
      position: (position as Position) || undefined,
      drafter, ts: Date.now(),
    });
    setPlayerName(""); setPriceInput(""); setPosition("");
    refreshQueue();
  };

  const handlePickFromQueue = (t: QueueTarget) => {
    setPlayerName(t.name); setPosition(t.position); setDrafter("me");
    toast(`${t.name} loaded · max bid $${t.maxBid}`);
  };

  const handleFollowUp = () => {
    if (!followUp.trim()) return;
    const q = followUp.trim(); setFollowUp("");
    askCoach(undefined, q);
  };

  const exportCsv = () => {
    if (!events.length) { toast("No picks to export yet"); return; }
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      ["timestamp", "drafter", "player", "position", "price"],
      ...events.map((e) => [new Date(e.ts).toISOString(), e.drafter, e.player, e.position ?? "", e.price]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `draft-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${events.length} picks`);
  };

  const espnLive = espnSync.status === "live" || espnSync.status === "idle";
  const showForm = !espnLive || manualOpen;

  const priceNum = parseInt(priceInput, 10);
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const liveValue = validPrice && playerName ? valueFor(playerName, priceNum) : null;
  const decision = playerName
    ? decide({
        settings, keepers, events, prices,
        player: playerName,
        position: (position as Position) || undefined,
        currentPrice: validPrice ? priceNum : 0,
      })
    : null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 ring-1 ring-primary/30">
              <img src={coachBotImg} alt="Matthew Berry" className="h-full w-full object-cover" />
            </div>
            <h1 className="truncate text-[16px] font-semibold tracking-tight text-foreground">Draft</h1>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost" size="sm"
              onClick={() => navigate("/espn")}
              className="h-8 px-2 text-[10px] font-semibold"
              title="ESPN connection & live sync"
            >
              ESPN
            </Button>
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="More">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={exportCsv} disabled={!events.length}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/?step=league-basics")}>
                    <Settings2 className="mr-2 h-4 w-4" /> Setup wizard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                      <RotateCcw className="mr-2 h-4 w-4" /> Reset draft…
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears all settings, keepers, prices, and the draft log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { resetAll(); navigate("/"); }}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-2">
        {/* LEFT: Input → Decision → Log */}
        <section className="space-y-4">
          <LiveBidStrip bid={espnSync.liveBid} recommendedMax={budget.maxBid} />

          <Card className="bg-card/60 p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {espnLive ? "ESPN auto-logging picks" : "Log a pick"}
              </span>
              <div className="flex items-center gap-2">
                <EspnSyncStatus status={espnSync.status} lastEventAt={espnSync.lastEventAt} />
                {espnLive && (
                  <button
                    onClick={() => setManualOpen(!manualOpen)}
                    className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary"
                  >
                    {manualOpen ? "Hide" : "Manual"}
                  </button>
                )}
              </div>
            </div>

            {showForm && (
              <>
                <div className="mb-2 flex items-center gap-1.5">
                  <div className="inline-flex rounded-full bg-secondary/50 p-0.5 text-[10px] font-semibold">
                    <button
                      onClick={() => setDrafter("other")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        drafter === "other" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <Users className="-mt-0.5 mr-1 inline h-3 w-3" />OTHER
                    </button>
                    <button
                      onClick={() => setDrafter("me")}
                      className={`rounded-full px-2.5 py-1 transition ${
                        drafter === "me" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      <User className="-mt-0.5 mr-1 inline h-3 w-3" />ME
                    </button>
                  </div>
                  {liveValue && liveValue.hasRef && <ValueVerdict value={liveValue} />}
                </div>

                <div className="flex items-stretch gap-1.5">
                  <div className="min-w-0 flex-1">
                    <PlayerAutocomplete
                      value={playerName}
                      onChange={setPlayerName}
                      onSelect={(p) => {
                        if (p.position && POSITIONS.includes(p.position as Position)) {
                          setPosition(p.position as Position);
                        }
                      }}
                      onEnter={submitPick}
                    />
                  </div>
                  <div className="relative w-16 shrink-0">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); submitPick(); return; }
                        const cur = parseInt(priceInput, 10);
                        const base = Number.isFinite(cur) ? cur : 0;
                        const step = e.shiftKey ? 5 : 1;
                        if (e.key === "ArrowUp") { e.preventDefault(); setPriceInput(String(Math.max(0, base + step))); }
                        else if (e.key === "ArrowDown") { e.preventDefault(); setPriceInput(String(Math.max(0, base - step))); }
                      }}
                      className="h-9 pl-5 pr-1 text-sm font-semibold"
                      title="↑/↓ to adjust ($1) · Shift+↑/↓ ($5) · Enter to log"
                    />
                  </div>
                  <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                    <SelectTrigger className="h-9 w-[68px] shrink-0 text-xs"><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={submitPick}
                    disabled={streaming}
                    size="sm"
                    className="h-9 bg-gradient-primary px-3 text-primary-foreground"
                    title="Log pick"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="sm"
                    className="h-9 px-2"
                    onClick={() => { undoEvent(); toast("Last entry undone"); }}
                    disabled={!events.length}
                    title="Undo"
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* THE DECISION — always visible, dominant */}
          {decision && <DecisionCard d={decision} />}

          {/* Draft Log */}
          <Card className="bg-gradient-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Draft Log{" "}
                <span className="font-normal normal-case text-foreground/50">
                  · {events.length} pick{events.length === 1 ? "" : "s"}
                </span>
              </h2>
            </div>
            <div className="max-h-80 overflow-auto">
              {events.length ? (
                <ul className="space-y-0">
                  {[...events].reverse().map((e, idx) => (
                    <li
                      key={e.id}
                      style={{ animationDelay: `${Math.min(idx, 6) * 30}ms` }}
                      className="flex animate-fade-in-up items-baseline gap-2 border-b border-border/30 py-1.5 last:border-b-0"
                    >
                      <span
                        className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                          e.drafter === "me" ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className={`font-medium ${e.drafter === "me" ? "text-primary" : "text-foreground"}`}>
                          {e.player}
                        </span>
                        {e.position && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {e.position}
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">${e.price}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Picks will land here as they happen.
                </p>
              )}
            </div>
          </Card>
        </section>

        {/* RIGHT: State + targets */}
        <section className="space-y-4">
          <RosterHero
            remaining={budget.remaining}
            slotsLeft={budget.slotsLeft}
            slotsTotal={budget.slotsTotal}
            maxBid={budget.maxBid}
            rows={heroRows}
            bestTarget={bestTarget}
            onLoadTarget={(name, pos) => {
              setPlayerName(name); setPosition(pos); setDrafter("me");
              toast(`${name} loaded — best next target`);
            }}
          />
          <NominationCard
            drain={computeDrain({ settings, keepers, events, prices })}
            get={computeGet({ settings, keepers, events, prices })}
            aiSuggestions={aiNoms}
            aiLoading={nominationsMutation.isPending}
            onAskAi={fetchAiNominations}
            onPickAi={(s) => {
              setPlayerName(s.name); setPosition(s.position); setDrafter("other");
              setPriceInput(String(s.price)); setManualOpen(true);
              toast(`${s.name} loaded — ${s.strategy}`);
            }}
          />
          <TierBreakAlerts prices={prices} events={events} keepers={keepers} />
          <Tabs defaultValue="targets" className="w-full">
            <TabsList className="grid h-9 w-full grid-cols-3">
              <TabsTrigger value="targets" className="text-[11px]">Targets</TabsTrigger>
              <TabsTrigger value="market" className="text-[11px]">Market</TabsTrigger>
              <TabsTrigger value="vetri" className="text-[11px]">Analyst</TabsTrigger>
            </TabsList>
            <TabsContent value="targets" className="mt-3 space-y-4">
              <UpNextQueue
                targets={queue}
                openMan={openMan}
                loading={targetsMutation.isPending}
                empty={!queue.length}
                pulseMultiplier={pulse.multiplier}
                pulseConfident={pulse.confident}
                watchlist={watchlist}
                onRefresh={refreshQueue}
                onPick={handlePickFromQueue}
                onPin={handlePin}
                onUnpin={handleUnpin}
                onDismiss={handleDismiss}
                valueFor={valueFor}
                whatIfFor={whatIfFor}
              />
              <Watchlist
                watchlist={watchlist}
                onUnpin={handleUnpin}
                onLoad={handleLoadFromWatchlist}
                valueFor={valueFor}
                maxBid={budget.maxBid}
              />
            </TabsContent>
            <TabsContent value="market" className="mt-3 space-y-4">
              <MarketHeat
                events={events} prices={prices}
                gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
                maxBid={budget.maxBid} remaining={budget.remaining}
                pulseMultiplier={pulse.multiplier}
              />
              <OpponentHeatmap settings={settings} />
            </TabsContent>
            <TabsContent value="vetri" className="mt-3 space-y-3 min-w-0 overflow-hidden">
              <Card className="min-w-0 overflow-hidden p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Analyst players · projected $
                  </span>
                </div>
                <div className="h-[320px] overflow-y-auto overflow-x-hidden pr-1 [&_*]:min-w-0 [overflow-wrap:anywhere]">
                  <VetriPlayerSummary />
                </div>
              </Card>
              <Card className="min-w-0 overflow-hidden p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Takes on this player
                  </span>
                  {(takesQuery || playerName || bestTarget?.name) && (
                    <span className="min-w-0 truncate text-[10px] text-foreground/80">
                      {takesQuery || playerName || bestTarget?.name}
                    </span>
                  )}
                </div>
                <div className="mb-2">
                  <PlayerAutocomplete
                    value={takesQuery}
                    onChange={setTakesQuery}
                    placeholder="Search a player for analyst takes…"
                  />
                </div>
                <div className="h-[280px] overflow-y-auto overflow-x-hidden pr-1 [&_*]:min-w-0 [overflow-wrap:anywhere]">
                  {(takesQuery || playerName || bestTarget?.name) ? (
                    <VetriTakesForPlayer
                      player={takesQuery || playerName || bestTarget!.name}
                      emptyText="No analyst takes on this player yet."
                    />
                  ) : (
                    <p className="text-[11px] italic text-muted-foreground">
                      Start typing a player name above to see analyst takes.
                    </p>
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      {/* Coach as a Sheet — same on phone and desktop. FAB to open. */}
      <Sheet open={coachOpen} onOpenChange={setCoachOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-4 right-4 z-30 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full p-0 shadow-glow ring-2 ring-primary/40"
            style={{ marginBottom: "env(safe-area-inset-bottom)" }}
            title="Ask Matthew Berry"
          >
            <img src={coachBotImg} alt="Ask Matthew Berry" className="h-full w-full object-cover" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCoachOpen(false)}
                className="-ml-2 h-8 gap-1 px-2 text-xs"
                title="Back to draft"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to draft
              </Button>
              <img src={coachBotImg} alt="" className="h-6 w-6 rounded-full object-cover" />
              Ask Matthew Berry
              <span className="ml-auto mr-6 text-[10px] font-normal text-muted-foreground">
                {streaming ? "typing…" : "online"}
              </span>
            </SheetTitle>
          </SheetHeader>

          {/* Compact "Current draft state" panel */}
          <div className="border-b border-border/60 bg-secondary/20 px-3 py-2 text-[11px] leading-tight">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wide text-muted-foreground">Draft state</span>
              <span className="tabular-nums text-muted-foreground">
                pick {events.length + 1} · {events.length} drafted
              </span>
            </div>

            <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 tabular-nums">
              <span><span className="text-muted-foreground">Bank</span> <span className="font-semibold text-foreground">${budget.remaining}</span></span>
              <span><span className="text-muted-foreground">Max bid</span> <span className="font-semibold text-foreground">${budget.maxBid}</span></span>
              <span><span className="text-muted-foreground">Slots</span> <span className="font-semibold text-foreground">{budget.slotsLeft}</span></span>
              <span><span className="text-muted-foreground">$/slot</span> <span className="font-semibold text-foreground">${budget.avgPerSlot}</span></span>
            </div>

            <div className="flex flex-wrap gap-1">
              {gaps.map((g) => {
                const cls =
                  g.severity === "critical" ? "bg-destructive/20 text-destructive border-destructive/40"
                  : g.severity === "need" ? "bg-primary/15 text-foreground border-primary/40"
                  : g.severity === "depth" ? "bg-secondary text-muted-foreground border-border"
                  : "bg-transparent text-muted-foreground/70 border-border/50";
                return (
                  <span key={g.pos} className={`rounded border px-1.5 py-0.5 tabular-nums ${cls}`}>
                    {g.pos} {g.starterHave}/{g.starterNeed}
                  </span>
                );
              })}
              {flexShort > 0 && (
                <span className="rounded border border-primary/40 bg-primary/15 px-1.5 py-0.5 tabular-nums text-foreground">
                  FLEX need {flexShort}
                </span>
              )}
            </div>

            {events.length > 0 && (
              <div className="mt-1.5 truncate text-muted-foreground">
                <span className="uppercase tracking-wide">Last:</span>{" "}
                {events.slice(-3).reverse().map((e, i) => (
                  <span key={i} className="tabular-nums">
                    {i > 0 && " · "}
                    <span className={e.drafter === "me" ? "text-foreground font-medium" : ""}>
                      {e.player}
                    </span>{" "}
                    ${e.price}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-b border-border/60 bg-secondary/10 px-3 py-3">
            <DraftPlanCard onGenerate={generateDraftPlan} generating={planGenerating} />
          </div>

          <div ref={coachRef} className="coach-md flex flex-1 flex-col gap-4 overflow-auto px-4 py-4 text-sm leading-relaxed">
            {coachHistory.length === 0 && !streaming && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <CoachMessage content={coachText || "How can I help you with your draft?"} />
                </div>
              </div>
            )}
            {coachHistory.map((m, i) => {
              const isUser = m.role === "user";
              return isUser ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CoachMessage content={m.content} />
                  </div>
                </div>
              );
            })}
            {streaming && coachText && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <CoachMessage content={coachText} />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 bg-secondary/20 px-3 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {quickPrompts.map((b) => (
                <Button
                  key={b.id} size="sm" variant="outline" disabled={streaming}
                  onClick={() => askCoach(undefined, b.prompt)}
                  className="h-7 rounded-full text-xs"
                >
                  {b.label}
                </Button>
              ))}
              <QuickPromptsEditor
                prompts={quickPrompts}
                onSave={setQuickPrompts}
                onReset={resetQuickPrompts}
              />
              {(coachHistory.length > 0 || coachText) && !streaming && (
                <Button
                  size="sm" variant="ghost"
                  onClick={() => { setCoachHistory([]); setCoachText(""); }}
                  className="ml-auto h-7 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-end gap-2 rounded-3xl border border-border bg-background px-3 py-2 shadow-sm focus-within:border-primary">
              <Input
                placeholder='Ask Matthew Berry… e.g. "Should I bid on Bijan?"'
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                disabled={streaming}
                className="h-8 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                onClick={handleFollowUp}
                disabled={streaming || !followUp.trim()}
                size="sm"
                className="h-8 w-8 shrink-0 rounded-full p-0"
              >
                ↑
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
