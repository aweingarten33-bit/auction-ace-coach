import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import { useDraftStore } from "@/lib/draft-store";
import {
  computeBudget,
  countByPosition,
  parsePlayerLine,
  recentRuns,
  spendByPosition,
} from "@/lib/draft-math";
import { DraftEvent, Position, PriceEstimate } from "@/lib/draft-types";
import { POSITIONS, POS_COLORS } from "@/lib/positions";
import { Undo2, Trophy, RotateCcw, Send, Sparkles, Settings2, User, Users, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import UpNextQueue, { QueueTarget } from "@/components/UpNextQueue";
import MarketHeat from "@/components/MarketHeat";
import Watchlist from "@/components/Watchlist";
import AnimatedNumber from "@/components/AnimatedNumber";
import EspnSyncStatus from "@/components/EspnSyncStatus";
import LiveBidStrip from "@/components/LiveBidStrip";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import RosterHero, { SlotRow, BestTarget } from "@/components/RosterHero";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { computeMarketPulse, valueFor as computeValueFor, whatIfPick } from "@/lib/value";
import { projectRemainingBuild } from "@/lib/simulator";
import RemainingBuildPanel from "@/components/RemainingBuildPanel";
import ValueVerdict from "@/components/ValueVerdict";
import TierBreakAlerts from "@/components/TierBreakAlerts";
import DecisionCard from "@/components/DecisionCard";
import NominationCard from "@/components/NominationCard";
import { decide } from "@/lib/decision-engine";
import { computeDrain, computeGet } from "@/lib/nomination";

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`;
const UPNEXT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/up-next`;
const NOMINATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nominate-suggest`;

export default function LiveDashboard() {
  const navigate = useNavigate();
  const {
    settings,
    keepers,
    prices,
    events,
    setupComplete,
    watchlist,
    dismissed,
    addEvent,
    undoEvent,
    resetAll,
    pinPlayer,
    unpinPlayer,
    dismissPlayer,
    clearDismissed,
  } = useDraftStore();

  const [playerName, setPlayerName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [drafter, setDrafter] = useState<"me" | "other">("other");
  const [position, setPosition] = useState<Position | "">("");
  const [coachText, setCoachText] = useState<string>(
    "Welcome. Enter your first draft pick above to get live recommendations."
  );
  const [coachHistory, setCoachHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<QueueTarget[]>([]);
  const [openMan, setOpenMan] = useState<string | undefined>(undefined);
  const [queueLoading, setQueueLoading] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [aiNoms, setAiNoms] = useState<import("@/components/NominationCard").AiNomination[]>([]);
  const [aiNomsLoading, setAiNomsLoading] = useState(false);
  
  const espnSync = useEspnLiveSync({ expectingEvents: setupComplete });

  useEffect(() => {
    if (!setupComplete) navigate("/");
  }, [setupComplete, navigate]);

  const budget = useMemo(
    () => computeBudget(settings, keepers, events),
    [settings, keepers, events]
  );

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

  // Roster gap analysis
  const flexNeed = requiredCount.FLEX;
  const flexHave = Math.max(
    0,
    (myCount.RB - requiredCount.RB) +
      (myCount.WR - requiredCount.WR) +
      (myCount.TE - requiredCount.TE)
  );
  const flexShort = Math.max(0, flexNeed - flexHave);

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

  // Preview the impact of currently-typed pick
  const previewPos = position || undefined;
  const previewSlotImpact = (() => {
    if (!previewPos) return "";
    const need = requiredCount[previewPos];
    if (myCount[previewPos] < need) return `starter slot (${previewPos})`;
    if (["RB", "WR", "TE"].includes(previewPos) && flexShort > 0) return "FLEX slot";
    return "bench slot";
  })();

  const whatIfFor = (pos: Position, bid: number) =>
    whatIfPick(settings, keepers, events, myCount, requiredCount, pos, bid);

  // ---- Roster Hero: per-slot max bids + single best next target ----
  const heroRows: SlotRow[] = useMemo(() => {
    const sevWeight = { critical: 2.6, need: 1.9, depth: 1.05, done: 0.4 } as const;
    const cap = budget.maxBid;
    const avg = budget.avgPerSlot;
    const rows: SlotRow[] = gaps.map((g) => {
      const recommended = Math.max(1, Math.min(cap, Math.round(avg * sevWeight[g.severity])));
      return {
        pos: g.pos as Position,
        have: g.starterHave,
        need: g.starterNeed,
        short: g.starterShort,
        maxBid: recommended,
        severity: g.severity,
      };
    });
    if (flexNeed > 0) {
      const sev: SlotRow["severity"] = flexShort > 0 ? "need" : "done";
      rows.push({
        pos: "FLEX",
        have: flexHave,
        need: flexNeed,
        short: flexShort,
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevWeight[sev]))),
        severity: sev,
      });
    }
    if (requiredCount.BENCH > 0) {
      const sev: SlotRow["severity"] = benchFilled >= requiredCount.BENCH ? "done" : "depth";
      rows.push({
        pos: "BENCH",
        have: benchFilled,
        need: requiredCount.BENCH,
        short: Math.max(0, requiredCount.BENCH - benchFilled),
        maxBid: Math.max(1, Math.min(cap, Math.round(avg * sevWeight[sev]))),
        severity: sev,
      });
    }
    return rows;
  }, [gaps, flexNeed, flexShort, flexHave, requiredCount.BENCH, benchFilled, budget.maxBid, budget.avgPerSlot]);

  const bestTarget: BestTarget | null = useMemo(() => {
    if (budget.slotsLeft <= 0 || budget.maxBid <= 0) return null;
    const draftedKeys = new Set<string>([
      ...events.map((e) => e.player.toLowerCase().replace(/[^a-z0-9]/g, "")),
      ...keepers.map((k) => k.player.toLowerCase().replace(/[^a-z0-9]/g, "")),
    ]);
    // Prefer the most severe open slot first
    const priority = heroRows
      .filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX" && r.short > 0)
      .sort((a, b) => {
        const order = { critical: 0, need: 1, depth: 2, done: 3 } as const;
        return order[a.severity] - order[b.severity];
      });
    const fallback = heroRows.filter((r) => r.pos !== "BENCH" && r.pos !== "FLEX");
    const ordered = priority.length ? priority : fallback;
    for (const row of ordered) {
      const pos = row.pos as Position;
      const candidates = prices
        .filter((p: PriceEstimate) => {
          const k = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (draftedKeys.has(k)) return false;
          // position match: rely on Vetri-tagged position when available
          if ((p as any).position && (p as any).position !== pos) return false;
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
          name: top.name,
          position: pos,
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
    setPlayerName(name);
    setDrafter("me");
    toast(`${name} loaded`);
  };


  const askCoach = async (latestEvent?: DraftEvent, userQuestion?: string) => {
    setStreaming(true);
    setCoachText("");
    // Capture user message immediately so it shows in the thread while streaming
    if (userQuestion) {
      setCoachHistory((h) => [...h, { role: "user", content: userQuestion }]);
    } else if (latestEvent) {
      setCoachHistory((h) => [
        ...h,
        { role: "user", content: `📌 Logged: ${latestEvent.drafter === "me" ? "[ME]" : "[OTHER]"} ${latestEvent.player} — $${latestEvent.price}` },
      ]);
    }
    try {
      const resp = await fetch(COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          settings: {
            totalBudget: settings.totalBudget,
            numTeams: settings.numTeams,
            scoring: settings.scoring,
            leagueType: settings.leagueType,
            format: settings.format,
            keeperIncrease: settings.keeperIncrease,
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
          latestEvent,
          userQuestion,
          vetriTakes: [],
          history: coachHistory.slice(-6),
          draftedPlayers: events.map((e) => e.player),
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limited. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in workspace usage.");
        else toast.error("Assistant unavailable. Try again.");
        setCoachText("⚠️ Assistant unavailable.");
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setCoachText(acc);
              coachRef.current?.scrollTo({ top: 1e9 });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Assistant error");
    } finally {
      setStreaming(false);
      // Persist final assistant message into thread (use the accumulator from above via setCoachText callback)
      setCoachText((finalText) => {
        if (finalText && finalText !== "⚠️ Assistant unavailable.") {
          setCoachHistory((h) => [...h, { role: "assistant", content: finalText }]);
        }
        return finalText;
      });
    }
  };

  const refreshQueue = async () => {
    setQueueLoading(true);
    try {
      const resp = await fetch(UPNEXT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
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
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Queue unavailable.");
        return;
      }
      const data = await resp.json();
      if (data?.targets) {
        const filtered = (data.targets as QueueTarget[]).filter((t) => !dismissed.includes(t.name));
        setQueue(filtered);
        setOpenMan(data.openMan);
      }
    } catch (e) {
      console.error(e);
      toast.error("Queue error");
    } finally {
      setQueueLoading(false);
    }
  };

  const fetchAiNominations = async () => {
    setAiNomsLoading(true);
    try {
      const resp = await fetch(NOMINATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          budget,
          gaps: gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort })),
          myRoster: myItems,
          events,
          prices,
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Suggestions unavailable.");
        return;
      }
      const data = await resp.json();
      if (Array.isArray(data?.suggestions)) setAiNoms(data.suggestions);
    } catch (e) {
      console.error(e);
      toast.error("Suggestion error");
    } finally {
      setAiNomsLoading(false);
    }
  };

  // (Nomination forecast removed — TierBreakAlerts replaces it deterministically.)

  const submitPick = () => {
    const name = playerName.trim();
    const price = parseInt(priceInput, 10);
    if (!name) {
      toast.error("Enter a player name");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (drafter === "me" && price > budget.maxBid) {
      toast.error(`Over max bid. You can only spend $${budget.maxBid} on this slot.`);
      return;
    }
    const ev = {
      id: crypto.randomUUID(),
      player: name,
      price,
      position: position || undefined,
      drafter,
      ts: Date.now(),
    };
    addEvent(ev);
    setPlayerName("");
    setPriceInput("");
    setPosition("");
    // Coach no longer auto-fires — opt-in only via Ask buttons.
    refreshQueue();
  };

  const handlePickFromQueue = (t: QueueTarget) => {
    setPlayerName(t.name);
    setPosition(t.position);
    setDrafter("me");
    toast(`${t.name} loaded · max bid $${t.maxBid}`);
  };

  const handleFollowUp = () => {
    if (!followUp.trim()) return;
    const q = followUp.trim();
    setFollowUp("");
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
      ...events.map((e) => [
        new Date(e.ts).toISOString(),
        e.drafter,
        e.player,
        e.position ?? "",
        e.price,
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `draft-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${events.length} picks`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-primary shadow-glow" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}>
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 leading-none">
              <h1 className="truncate text-[18px] font-bold tracking-tight text-foreground">
                Auction Assistant
              </h1>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                Live draft helper
              </p>
            </div>
          </div>
          {/* Budget strip moved into the Decision Card — header stays clean */}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" onClick={() => navigate("/m")} className="h-8 px-2 text-[10px] font-semibold lg:hidden" title="Mobile draft mode">
              📱
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/espn")} className="h-8 px-2 text-[10px] font-semibold" title="ESPN connection & live sync">
              ESPN
            </Button>
            <Button variant="ghost" size="sm" onClick={exportCsv} className="h-8 w-8 p-0" title="Export draft as CSV" disabled={!events.length}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/?step=league-basics")} className="h-8 w-8 p-0" title="Setup wizard — Budget">
              <Settings2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><RotateCcw className="h-4 w-4" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears all settings, keepers, prices, and the draft log.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => { resetAll(); navigate("/"); }}>
                    Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* LEFT: Input + activity */}
        <section className="space-y-4">
          <LiveBidStrip bid={espnSync.liveBid} recommendedMax={budget.maxBid} />
          {/* Manual entry — collapsed when ESPN is auto-syncing. Expand only as a fallback. */}
          {(() => {
            const espnLive = espnSync.status === "live" || espnSync.status === "idle";
            const showForm = !espnLive || manualOpen;
            return (
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
            {showForm && (<>

            <div className="flex items-center gap-1.5 mb-2">
              <div className="inline-flex rounded-full bg-secondary/50 p-0.5 text-[10px] font-semibold">
                <button
                  onClick={() => setDrafter("other")}
                  className={`rounded-full px-2.5 py-1 transition ${
                    drafter === "other" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Users className="inline h-3 w-3 mr-1 -mt-0.5" />OTHER
                </button>
                <button
                  onClick={() => setDrafter("me")}
                  className={`rounded-full px-2.5 py-1 transition ${
                    drafter === "me" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <User className="inline h-3 w-3 mr-1 -mt-0.5" />ME
                </button>
              </div>
              {(() => {
                const priceNum = parseInt(priceInput, 10);
                if (!Number.isFinite(priceNum) || priceNum <= 0 || !playerName) return null;
                const v = valueFor(playerName, priceNum);
                return v.hasRef ? <ValueVerdict value={v} /> : null;
              })()}
            </div>

            <div className="flex items-stretch gap-1.5">
              <div className="flex-1 min-w-0">
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
                  className="pl-5 pr-1 h-9 text-sm font-semibold"
                  title="↑/↓ to adjust ($1) · Shift+↑/↓ ($5) · Enter to log"
                />
              </div>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger className="w-[68px] shrink-0 h-9 text-xs"><SelectValue placeholder="Pos" /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={submitPick}
                disabled={streaming}
                size="sm"
                className="h-9 px-3 bg-gradient-primary text-primary-foreground"
                title="Log pick"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2"
                onClick={() => { undoEvent(); toast("Last entry undone"); }}
                disabled={!events.length}
                title="Undo"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>

            {/* THE DECISION — replaces scattered panels with one answer */}
            {playerName && (() => {
              const priceNum = parseInt(priceInput, 10);
              const d = decide({
                settings, keepers, events, prices,
                player: playerName,
                position: (position as Position) || undefined,
                currentPrice: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 0,
              });
              return <div className="mt-2"><DecisionCard d={d} /></div>;
            })()}
            </>)}
          </Card>
            );
          })()}

          {/* Draft Log — clean timeline, no calculator vibes */}
          <Card className="bg-gradient-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Draft Log <span className="text-foreground/50 font-normal normal-case">· {events.length} pick{events.length === 1 ? "" : "s"}</span>
              </h2>
            </div>
            <div className="max-h-80 overflow-auto">
              {events.length ? (
                <ul className="space-y-0">
                  {[...events].reverse().map((e, idx) => (
                    <li
                      key={e.id}
                      style={{ animationDelay: `${Math.min(idx, 6) * 30}ms` }}
                      className="flex animate-fade-in-up items-baseline gap-2 py-1.5 border-b border-border/30 last:border-b-0"
                    >
                      <span
                        className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                          e.drafter === "me" ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="flex-1 min-w-0 truncate text-sm">
                        <span className={`font-medium ${e.drafter === "me" ? "text-primary" : "text-foreground"}`}>
                          {e.player}
                        </span>
                        {e.position && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {e.position}
                          </span>
                        )}
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        ${e.price}
                      </span>
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

        {/* RIGHT: State + coach */}
        <section className="space-y-4">
          <RosterHero
            remaining={budget.remaining}
            slotsLeft={budget.slotsLeft}
            slotsTotal={budget.slotsTotal}
            maxBid={budget.maxBid}
            rows={heroRows}
            bestTarget={bestTarget}
            onLoadTarget={(name, pos) => {
              setPlayerName(name);
              setPosition(pos);
              setDrafter("me");
              toast(`${name} loaded — best next target`);
            }}
          />
          <NominationCard
            drain={computeDrain({ settings, keepers, events, prices })}
            get={computeGet({ settings, keepers, events, prices })}
            aiSuggestions={aiNoms}
            aiLoading={aiNomsLoading}
            onAskAi={fetchAiNominations}
            onPickAi={(s) => {
              setPlayerName(s.name);
              setPosition(s.position);
              setDrafter("other");
              setPriceInput(String(s.price));
              setManualOpen(true);
              toast(`${s.name} loaded — ${s.strategy}`);
            }}
          />
          <TierBreakAlerts prices={prices} events={events} keepers={keepers} />
          <Tabs defaultValue="targets" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="targets" className="text-[11px]">Targets</TabsTrigger>
              <TabsTrigger value="market" className="text-[11px]">Market</TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="mt-3 space-y-4">
              <UpNextQueue
                targets={queue}
                openMan={openMan}
                loading={queueLoading}
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
                events={events}
                prices={prices}
                gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
                maxBid={budget.maxBid}
                remaining={budget.remaining}
                pulseMultiplier={pulse.multiplier}
              />
              <OpponentHeatmap settings={settings} />
            </TabsContent>
          </Tabs>
        </section>

        {/* COACH COLUMN — its own column at xl, stacks below at lg */}
        <section className="space-y-4 lg:col-span-2 xl:col-span-1">
          {/* Coach */}
          <Card className="bg-gradient-card p-4 shadow-glow">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI Assistant
              
              {streaming && <span className="text-muted-foreground">· thinking...</span>}
              {(coachHistory.length > 0 || coachText) && !streaming && (
                <button
                  onClick={() => { setCoachHistory([]); setCoachText(""); }}
                  className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-destructive"
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
            </h2>
            <div ref={coachRef} className="coach-md max-h-96 space-y-3 overflow-auto text-sm leading-relaxed">
              {coachHistory.length === 0 && !streaming && (
                <ReactMarkdown>{coachText || "_..._"}</ReactMarkdown>
              )}
              {coachHistory.map((m, i) => {
                const isUser = m.role === "user";
                const isLastAssistant = !isUser && i === coachHistory.length - 1 && !streaming;
                return (
                  <div
                    key={i}
                    className={`rounded-md border px-2.5 py-2 ${
                      isUser
                        ? "border-primary/30 bg-primary/5"
                        : "border-border/60 bg-secondary/30"
                    }`}
                  >
                    <p className={`mb-1 text-[9px] font-bold uppercase tracking-wider ${isUser ? "text-primary" : "text-muted-foreground"}`}>
                      {isUser ? "You" : "Assistant"}
                    </p>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {isLastAssistant && null}
                  </div>
                );
              })}
              {streaming && coachText && (
                <div className="rounded-md border border-border/60 bg-secondary/30 px-2.5 py-2">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Assistant · typing</p>
                  <ReactMarkdown>{coachText}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: "Should I pivot?", q: "Should I pivot my strategy given how the draft is unfolding? If yes, to what?" },
                { label: "Nominate who?", q: "Who should I nominate next to drain other teams' budgets without overcommitting myself?" },
              ].map((b) => (
                <Button
                  key={b.label}
                  size="sm"
                  variant="secondary"
                  disabled={streaming}
                  onClick={() => askCoach(undefined, b.q)}
                  className="h-7 text-xs"
                >
                  {b.label}
                </Button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Ask the assistant a question..."
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFollowUp()}
                disabled={streaming}
              />
              <Button onClick={handleFollowUp} disabled={streaming || !followUp.trim()} variant="outline">
                Ask
              </Button>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
