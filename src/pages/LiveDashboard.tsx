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
import { Undo2, Trophy, RotateCcw, Send, Sparkles, Settings2, User, Users } from "lucide-react";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import UpNextQueue, { QueueTarget } from "@/components/UpNextQueue";
import MarketHeat from "@/components/MarketHeat";
import Watchlist from "@/components/Watchlist";
import AnimatedNumber from "@/components/AnimatedNumber";
import EspnSyncStatus from "@/components/EspnSyncStatus";
import LiveBidStrip from "@/components/LiveBidStrip";
import LiveSyncPanel from "@/components/LiveSyncPanel";
import OpponentHeatmap from "@/components/OpponentHeatmap";
import DraftIntelTicker from "@/components/DraftIntelTicker";
import NominationForecast, { NominationPrediction } from "@/components/NominationForecast";
import VetriTierSheet from "@/components/VetriTierSheet";
import RosterHero, { SlotRow, BestTarget } from "@/components/RosterHero";
import { useEspnLiveSync } from "@/hooks/useEspnLiveSync";
import { computeMarketPulse, valueFor as computeValueFor, whatIfPick } from "@/lib/value";

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`;
const UPNEXT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/up-next`;
const NOMINATIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nominations-next`;

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
    "Welcome, coach. Enter your first draft pick above to get live recommendations."
  );
  const [coachHistory, setCoachHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<QueueTarget[]>([]);
  const [openMan, setOpenMan] = useState<string | undefined>(undefined);
  const [queueLoading, setQueueLoading] = useState(false);
  const [nominations, setNominations] = useState<NominationPrediction[]>([]);
  const [roomRead, setRoomRead] = useState<string | undefined>(undefined);
  const [nominationsLoading, setNominationsLoading] = useState(false);
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
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limited. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in workspace usage.");
        else toast.error("Coach unavailable. Try again.");
        setCoachText("⚠️ Coach unavailable.");
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
      toast.error("Coach error");
    } finally {
      setStreaming(false);
      // Persist final assistant message into thread (use the accumulator from above via setCoachText callback)
      setCoachText((finalText) => {
        if (finalText && finalText !== "⚠️ Coach unavailable.") {
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

  const refreshNominations = async () => {
    setNominationsLoading(true);
    try {
      const resp = await fetch(NOMINATIONS_URL, {
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
          watchlist,
        }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limited.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("Forecast unavailable.");
        return;
      }
      const data = await resp.json();
      if (Array.isArray(data?.nominations)) {
        setNominations(data.nominations);
        setRoomRead(data.roomRead);
      }
    } catch (e) {
      console.error(e);
      toast.error("Forecast error");
    } finally {
      setNominationsLoading(false);
    }
  };

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
    askCoach(ev);
    refreshQueue();
    refreshNominations();
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

  return (
    <div className="min-h-screen bg-background">
      <DraftIntelTicker
        remaining={budget.remaining}
        maxBid={budget.maxBid}
        slotsLeft={budget.slotsLeft}
        avgPerSlot={budget.avgPerSlot}
        events={events}
        prices={prices}
        pulse={pulse}
        gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity, starterShort: g.starterShort }))}
        spendByPosition={spend}
        recentRuns={runs}
        topTarget={queue[0] ? { name: queue[0].name, position: queue[0].position, maxBid: queue[0].maxBid } : null}
        lastPickVerdict={(() => {
          const last = events[events.length - 1];
          if (!last) return null;
          return { player: last.player, bid: last.price, call: valueFor(last.player, last.price) };
        })()}
      />
      <header className="sticky top-0 z-20 border-b border-border/60 bg-card/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-gradient-primary shadow-glow" style={{ clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)" }}>
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0 leading-none">
              <h1 className="font-chyron truncate text-[18px] font-extrabold italic uppercase tracking-tight text-foreground neon-text">
                The Auction Room
              </h1>
              <p className="font-lower-third mt-0.5 truncate text-[8px] text-accent">
                ESPN-Style · Fantasy Focus × Vetri
              </p>
            </div>
          </div>
          {/* Compact live budget — Awwwards single-accent emphasis on remaining */}
          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums text-muted-foreground">
            <span><AnimatedNumber value={budget.remaining} prefix="$" className="font-bold text-primary" /> <span className="opacity-70">left</span></span>
            <span className="hidden xs:inline opacity-40">·</span>
            <span><AnimatedNumber value={budget.maxBid} prefix="$" className="font-bold text-foreground" /> <span className="opacity-70">max</span></span>
            <span className="hidden xs:inline opacity-40">·</span>
            <span><AnimatedNumber value={budget.slotsLeft} className="font-bold text-foreground" /><span className="opacity-70"> slots</span></span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="sm" onClick={() => navigate("/m")} className="h-8 px-2 text-[10px] font-semibold lg:hidden" title="Mobile draft mode">
              📱
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/espn")} className="h-8 px-2 text-[10px] font-semibold" title="ESPN connection & live sync">
              ESPN
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

      <main className="mx-auto grid max-w-7xl gap-3 p-3 md:gap-4 md:p-4 lg:grid-cols-2">
        {/* LEFT: Input + activity */}
        <section className="space-y-4">
          <LiveBidStrip bid={espnSync.liveBid} recommendedMax={budget.maxBid} />
          <LiveSyncPanel status={espnSync.status} lastEventAt={espnSync.lastEventAt} compact />
          <Card className="bg-gradient-card p-4">
            <div className="space-y-3">
              {/* Sync status — tells user if ESPN auto-log is on, or manual fallback is active */}
              <div className="flex items-center justify-between">
                <div className="leading-tight">
                  <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Log a Pick
                  </span>
                  <span className="block font-mono text-[8px] uppercase tracking-[0.2em] text-primary/80">— Drop the Hammer</span>
                </div>
                <EspnSyncStatus status={espnSync.status} lastEventAt={espnSync.lastEventAt} />
              </div>
              {/* Drafter toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/40 p-1">
                <button
                  onClick={() => setDrafter("me")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    drafter === "me"
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="inline h-4 w-4 mr-1.5 -mt-0.5" /> My Pick
                </button>
                <button
                  onClick={() => setDrafter("other")}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                    drafter === "other"
                      ? "bg-accent text-accent-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" /> Other Team
                </button>
              </div>

              {/* Player — full width so autocomplete has room */}
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Player
                </label>
                <PlayerAutocomplete
                  value={playerName}
                  onChange={setPlayerName}
                  onSelect={(p) => {
                    if (p.position && POSITIONS.includes(p.position as Position)) {
                      setPosition(p.position as Position);
                    }
                  }}
                  onEnter={submitPick}
                  autoFocus
                />
              </div>

              {/* Price + position side-by-side */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Price
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitPick()}
                      className="pl-6 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Position
                  </label>
                  <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                    <SelectTrigger><SelectValue placeholder="Pos" /></SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={submitPick}
                  disabled={streaming}
                  size="lg"
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4 mr-2" /> Log Pick
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => { undoEvent(); toast("Last entry undone"); }}
                  disabled={!events.length}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="bg-gradient-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Draft Log <span className="text-foreground/60">({events.length})</span>
              <span className="ml-2 font-mono text-[9px] tracking-[0.2em] text-primary/80">— THE TAPE</span>
            </h2>
            <div className="max-h-80 space-y-1.5 overflow-auto">
              {[...events].reverse().map((e, idx) => (
                <div
                  key={e.id}
                  style={{ animationDelay: `${Math.min(idx, 6) * 30}ms` }}
                  className={`flex animate-fade-in-up items-center justify-between rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    e.drafter === "me" ? "border-primary/30 bg-primary/5" : "border-border/70 bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {e.position && (
                      <Badge variant="outline" className={`${POS_COLORS[e.position]} text-[10px] px-1.5 py-0`}>
                        {e.position}
                      </Badge>
                    )}
                    <span className="truncate font-medium">{e.player}</span>
                    {e.drafter === "me" && (
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">YOU</Badge>
                    )}
                  </div>
                  <span className="font-bold text-primary">${e.price}</span>
                </div>
              ))}
              {!events.length && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No picks yet. Log one above.
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
          <NominationForecast
            predictions={nominations}
            roomRead={roomRead}
            loading={nominationsLoading}
            onRefresh={refreshNominations}
            onPick={(name, position) => {
              setPlayerName(name);
              setPosition(position);
              setDrafter("other");
              toast(`${name} loaded — ready to log when nominated`);
            }}
          />
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
          <MarketHeat
            events={events}
            prices={prices}
            gaps={gaps.map((g) => ({ pos: g.pos, severity: g.severity }))}
            maxBid={budget.maxBid}
            remaining={budget.remaining}
            pulseMultiplier={pulse.multiplier}
          />
          <Watchlist
            watchlist={watchlist}
            onUnpin={handleUnpin}
            onLoad={handleLoadFromWatchlist}
            valueFor={valueFor}
            maxBid={budget.maxBid}
          />
          <OpponentHeatmap settings={settings} />
          <VetriTierSheet />
          {/* Budget */}
          <Card className="bg-gradient-card p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
                <AnimatedNumber value={budget.remaining} prefix="$" className="block text-2xl font-bold text-primary" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max Bid</p>
                <AnimatedNumber value={budget.maxBid} prefix="$" className="block text-2xl font-bold" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Slots Left</p>
                <p className="text-2xl font-bold tabular-nums">
                  <AnimatedNumber value={budget.slotsLeft} /><span className="text-sm text-muted-foreground">/{budget.slotsTotal}</span>
                </p>
              </div>
            </div>
            <Progress
              value={budget.totalBudget ? (budget.spent / budget.totalBudget) * 100 : 0}
              className="mt-3 h-1.5 transition-all duration-500 ease-out-expo"
            />
            <p className="mt-1 text-[10px] text-muted-foreground text-center">
              ${budget.spent} spent · ${budget.avgPerSlot.toFixed(1)}/slot avg
            </p>
          </Card>

          {/* Roster */}
          <Card className="bg-gradient-card p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Roster Needs
                <span className="ml-2 font-mono text-[9px] tracking-[0.2em] text-primary/80">— THE BUILD</span>
              </h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                Starters {startersFilled}/{startersTotal} · Bench {benchFilled}/{requiredCount.BENCH}
              </p>
            </div>

            <div className="space-y-1.5">
              {gaps.map((g) => {
                const willFill = previewPos === g.pos && drafter === "me" && g.starterShort > 0;
                const tone =
                  g.severity === "critical"
                    ? "border-destructive/60 bg-destructive/10"
                    : g.severity === "need"
                    ? "border-warning/50 bg-warning/10"
                    : g.severity === "depth"
                    ? "border-border bg-secondary/40"
                    : "border-success/40 bg-success/10";
                const label =
                  g.severity === "critical"
                    ? "CRITICAL"
                    : g.severity === "need"
                    ? "NEED"
                    : g.severity === "depth"
                    ? "DEPTH"
                    : "DONE";
                return (
                  <div
                    key={g.pos}
                    className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs transition ${tone} ${
                      willFill ? "ring-2 ring-primary shadow-glow" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${POS_COLORS[g.pos]} text-[10px] px-1.5 py-0`}>
                        {g.pos}
                      </Badge>
                      <span className="font-mono text-[11px]">
                        {g.starterHave}/{g.starterNeed} starters
                      </span>
                      {willFill && (
                        <span className="font-mono text-[11px] text-primary">
                          → {g.starterHave + 1}/{g.starterNeed} ✓
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold tracking-wider ${
                        g.severity === "critical"
                          ? "text-destructive"
                          : g.severity === "need"
                          ? "text-warning"
                          : g.severity === "done"
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}

              {flexNeed > 0 && (
                <div
                  className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs ${
                    flexShort > 0 ? "border-warning/50 bg-warning/10" : "border-success/40 bg-success/10"
                  } ${previewPos && ["RB", "WR", "TE"].includes(previewPos) && drafter === "me" && flexShort > 0 ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px] px-1.5 py-0">
                      FLEX
                    </Badge>
                    <span className="font-mono text-[11px]">
                      {flexHave}/{flexNeed} (RB/WR/TE overflow)
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider ${flexShort > 0 ? "text-warning" : "text-success"}`}>
                    {flexShort > 0 ? "OPEN" : "DONE"}
                  </span>
                </div>
              )}

              {requiredCount.BENCH > 0 && (
                <div
                  className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-xs ${
                    benchFilled >= requiredCount.BENCH
                      ? "border-success/40 bg-success/10"
                      : "border-border bg-secondary/40"
                  } ${previewPos && drafter === "me" && previewSlotImpact === "bench slot" ? "ring-2 ring-primary" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-muted text-foreground border-border text-[10px] px-1.5 py-0">
                      BENCH
                    </Badge>
                    <span className="font-mono text-[11px]">
                      {benchFilled}/{requiredCount.BENCH} filled
                    </span>
                  </div>
                  <span className={`text-[9px] font-bold tracking-wider ${
                    benchFilled >= requiredCount.BENCH ? "text-success" : "text-muted-foreground"
                  }`}>
                    {benchFilled >= requiredCount.BENCH ? "DONE" : "DEPTH"}
                  </span>
                </div>
              )}
            </div>

            {previewPos && drafter === "me" && (
              <p className="mt-3 text-[11px] text-primary">
                Logging this {previewPos} pick will fill a {previewSlotImpact}.
              </p>
            )}

            {runs.window > 1 && (
              <p className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">
                Last {runs.window} picks:{" "}
                {Object.entries(runs.counts).map(([k, v]) => `${k}×${v}`).join(" · ")}
              </p>
            )}
          </Card>

          {/* Coach */}
          <Card className="bg-gradient-card p-4 shadow-glow">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" /> AI Coach
              <span className="font-mono text-[9px] tracking-[0.2em] text-primary/70">— THE TAKE</span>
              {streaming && <span className="text-muted-foreground">· thinking...</span>}
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
                      {isUser ? "You" : "Coach"}
                    </p>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {isLastAssistant && null}
                  </div>
                );
              })}
              {streaming && coachText && (
                <div className="rounded-md border border-border/60 bg-secondary/30 px-2.5 py-2">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Coach · typing</p>
                  <ReactMarkdown>{coachText}</ReactMarkdown>
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { label: "Max bid?", q: "What's my realistic max bid for the next pick I should target, and on whom?" },
                { label: "Next position", q: "Which position should I target next and why?" },
                { label: "Should I pivot?", q: "Should I pivot my strategy given how the draft is unfolding? If yes, to what?" },
                { label: "Sleepers", q: "Give me 3 sleeper/value picks I should target right now with reasoning." },
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
                placeholder="Ask the coach a question..."
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
