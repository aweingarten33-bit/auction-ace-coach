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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ListChecks,
  Plus,
  Send,
  Sparkles,
  Undo2,
  User,
  Users,
} from "lucide-react";
import { useDraftStore } from "@/lib/draft-store";
import { computeBudget, countByPosition, recentRuns, spendByPosition } from "@/lib/draft-math";
import { DraftEvent, Position } from "@/lib/draft-types";
import { POSITIONS, POS_COLORS } from "@/lib/positions";
import PlayerAutocomplete from "@/components/PlayerAutocomplete";
import AnimatedNumber from "@/components/AnimatedNumber";
import { computeMarketPulse, valueFor as computeValueFor } from "@/lib/value";
import { projectRemainingBuild } from "@/lib/simulator";
import RemainingBuildPanel from "@/components/RemainingBuildPanel";
import ValueVerdict from "@/components/ValueVerdict";
import TierBreakAlerts from "@/components/TierBreakAlerts";
import DecisionCard from "@/components/DecisionCard";
import NominationCard from "@/components/NominationCard";
import { decide } from "@/lib/decision-engine";
import { computeDrain, computeGet } from "@/lib/nomination";

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`;

type Tab = "log" | "roster" | "coach";

/**
 * Mobile-first manual draft mode. Designed for one-handed iPhone use:
 *  - Sticky budget bar at top
 *  - Sticky big "Log Pick" button at bottom (above thumb zone)
 *  - Tab switcher (Log / Roster / Coach)
 *  - All inputs use proper inputMode for iOS keyboards
 *  - No dependency on ESPN sync — pure manual entry that always works
 */
export default function MobileDraft() {
  const navigate = useNavigate();
  const {
    settings, keepers, prices, events, setupComplete,
    addEvent, undoEvent,
  } = useDraftStore();

  useEffect(() => {
    if (!setupComplete) navigate("/");
  }, [setupComplete, navigate]);

  const [tab, setTab] = useState<Tab>("log");
  const [drafter, setDrafter] = useState<"me" | "other">("other");
  const [playerName, setPlayerName] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [position, setPosition] = useState<Position | "">("");
  const [manualOpen, setManualOpen] = useState(false);

  const [coachText, setCoachText] = useState("Tap **Ask assistant** below for a recommendation.");
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);

  const budget = useMemo(() => computeBudget(settings, keepers, events), [settings, keepers, events]);
  const myItems = useMemo(() => [
    ...keepers.map((k) => ({ player: k.player, position: k.position, price: k.cost, source: "keeper" as const })),
    ...events.filter((e) => e.drafter === "me").map((e) => ({ player: e.player, position: e.position, price: e.price, source: "draft" as const })),
  ], [keepers, events]);
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

  const submitPick = () => {
    const name = playerName.trim();
    const price = parseInt(priceInput, 10);
    if (!name) return toast.error("Enter player");
    if (!Number.isFinite(price) || price <= 0) return toast.error("Enter price");
    if (drafter === "me" && price > budget.maxBid) {
      return toast.error(`Over max bid ($${budget.maxBid})`);
    }
    const ev: DraftEvent = {
      id: crypto.randomUUID(),
      player: name, price, position: (position as Position) || undefined,
      drafter, ts: Date.now(),
    };
    addEvent(ev);
    setPlayerName(""); setPriceInput(""); setPosition("");
    toast.success(`${name} → $${price}`);
    // Coach is opt-in (Sparkles button) — don't auto-burn credits on every pick.
  };

  const askCoach = async (latestEvent?: DraftEvent, userQuestion?: string) => {
    setTab("coach");
    setStreaming(true);
    setCoachText("");
    try {
      const resp = await fetch(COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          settings, budget, keepers, myRoster: myItems,
          rosterRequired: requiredCount, rosterFilled: myCount,
          events, prices, spendByPosition: spend, recentRuns: runs,
          latestEvent, userQuestion,
          draftedPlayers: events.map((e) => e.player),
        }),
      });
      if (!resp.ok || !resp.body) {
        toast.error(resp.status === 429 ? "Rate limited" : resp.status === 402 ? "AI credits exhausted" : "Assistant unavailable");
        setCoachText("⚠️ Assistant unavailable.");
        return;
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", acc = "", done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              acc += c; setCoachText(acc);
              coachRef.current?.scrollTo({ top: 1e9 });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      toast.error("Assistant error");
    } finally {
      setStreaming(false);
    }
  };

  const slotPct = budget.totalBudget ? (budget.spent / budget.totalBudget) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-[calc(env(safe-area-inset-bottom)+88px)]">
      {/* Sticky top: budget + nav */}
      <header
        className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-3 pt-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Mobile Draft</span>
          <span className="ml-auto text-[10px] text-muted-foreground">manual mode</span>
        </div>

        {/* Big budget readout */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 text-center">
          <BudgetCell label="Left" value={budget.remaining} accent />
          <BudgetCell label="Max bid" value={budget.maxBid} />
          <div>
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Slots</p>
            <p className="text-lg font-bold tabular-nums">
              <AnimatedNumber value={budget.slotsLeft} />
              <span className="text-xs text-muted-foreground">/{budget.slotsTotal}</span>
            </p>
          </div>
        </div>
        <Progress value={slotPct} className="h-1 rounded-none" />

        {/* Tab switcher */}
        <div className="grid grid-cols-3 border-t border-border/60 bg-secondary/30">
          {(["log", "roster", "coach"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 text-xs font-semibold uppercase tracking-wide transition ${
                tab === t ? "bg-background text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {t === "log" ? "Log" : t === "roster" ? "Roster" : "Assistant"}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 px-3 py-3">
        {tab === "log" && (
          <LogTab
            events={events} drafter={drafter} setDrafter={setDrafter}
            playerName={playerName} setPlayerName={setPlayerName}
            priceInput={priceInput} setPriceInput={setPriceInput}
            position={position} setPosition={setPosition}
            onUndo={() => { undoEvent(); toast("Undone"); }}
            settings={settings} keepers={keepers} prices={prices}
            pulse={pulse} myCount={myCount} requiredCount={requiredCount}
            manualOpen={manualOpen} setManualOpen={setManualOpen}
          />
        )}
        {tab === "roster" && (
          <RosterTab
            myItems={myItems} myCount={myCount} requiredCount={requiredCount} budget={budget}
          />
        )}
        {tab === "coach" && (
          <CoachTab
            text={coachText} streaming={streaming} coachRef={coachRef}
            followUp={followUp} setFollowUp={setFollowUp}
            onAsk={(q) => askCoach(undefined, q)}
          />
        )}
      </main>

      {/* Sticky bottom action bar — thumb zone. Manual log only when fallback toggled on. */}
      {tab === "log" && manualOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 px-3 py-2 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <div className="flex gap-2">
            <Button
              size="lg"
              className="h-12 flex-1 bg-gradient-primary text-base font-semibold text-primary-foreground"
              onClick={submitPick}
            >
              <Send className="mr-2 h-4 w-4" /> Log {drafter === "me" ? "MY pick" : "pick"}
            </Button>
            <Button
              size="lg" variant="outline" className="h-12 w-12 p-0"
              onClick={() => askCoach()}
              disabled={streaming}
              title="Ask assistant"
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>
      )}
      {tab === "log" && !manualOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 px-3 py-2 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 8px)" }}
        >
          <Button
            size="lg" variant="outline"
            className="h-12 w-full text-sm font-semibold"
            onClick={() => askCoach()}
            disabled={streaming}
          >
            <Sparkles className="mr-2 h-5 w-5 text-primary" /> Ask assistant
          </Button>
        </div>
      )}
    </div>
  );
}

function BudgetCell({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <AnimatedNumber
        value={value} prefix="$"
        className={`block text-lg font-bold tabular-nums ${accent ? "text-primary" : ""}`}
      />
    </div>
  );
}

function LogTab(props: {
  events: DraftEvent[];
  drafter: "me" | "other"; setDrafter: (d: "me" | "other") => void;
  playerName: string; setPlayerName: (s: string) => void;
  priceInput: string; setPriceInput: (s: string) => void;
  position: Position | ""; setPosition: (p: Position | "") => void;
  onUndo: () => void;
  settings: any; keepers: any[]; prices: any[];
  pulse: any; myCount: any; requiredCount: any;
  manualOpen: boolean; setManualOpen: (v: boolean) => void;
}) {
  const {
    events, drafter, setDrafter, playerName, setPlayerName,
    priceInput, setPriceInput, position, setPosition, onUndo,
    settings, keepers, prices, pulse, myCount, requiredCount,
    manualOpen, setManualOpen,
  } = props;

  const priceNum = parseInt(priceInput, 10);
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const verdict = validPrice && playerName
    ? computeValueFor(playerName, priceNum, prices, pulse)
    : null;
  const decision = playerName
    ? decide({
        settings, keepers, events, prices,
        player: playerName,
        position: (position as Position) || undefined,
        currentPrice: validPrice ? priceNum : 0,
      })
    : null;
  const drain = computeDrain({ settings, keepers, events, prices });
  const getPlan = computeGet({ settings, keepers, events, prices });

  // Open positions strip
  const posRows = (["QB", "RB", "WR", "TE", "K", "DST"] as Position[])
    .filter((p) => requiredCount[p] > 0)
    .map((p) => {
      const have = myCount[p];
      const need = requiredCount[p];
      const short = Math.max(0, need - have);
      const tone = short >= 2 ? "border-destructive/60 bg-destructive/10 text-destructive"
        : short === 1 ? "border-warning/50 bg-warning/10 text-warning"
        : "border-success/40 bg-success/10 text-success";
      return { p, have, need, tone };
    });

  return (
    <div className="space-y-3">
      {/* THE DECISION — one card, five seconds */}
      {decision && <DecisionCard d={decision} />}

      {/* NOMINATION — drain + get */}
      <NominationCard drain={drain} get={getPlan} />

      {/* Open positions chip strip */}
      <div className="grid grid-cols-6 gap-1">
        {posRows.map(({ p, have, need, tone }) => (
          <div key={p} className={`rounded-md border px-1 py-1 text-center ${tone}`}>
            <div className="text-[9px] font-bold leading-none">{p}</div>
            <div className="font-mono text-[10px] tabular-nums leading-tight">{have}/{need}</div>
          </div>
        ))}
      </div>

      <TierBreakAlerts prices={prices} events={events} keepers={keepers} />

      {/* ESPN sync is primary. Manual entry is a fallback — collapsed by default. */}
      <button
        type="button"
        onClick={() => setManualOpen(!manualOpen)}
        className="flex w-full items-center justify-between rounded-md border border-dashed border-border/60 bg-secondary/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary/50"
      >
        <span>{manualOpen ? "Hide manual fallback" : "Manual fallback (if ESPN drops)"}</span>
        <ChevronDown className={`h-4 w-4 transition ${manualOpen ? "rotate-180" : ""}`} />
      </button>

      {manualOpen && (
      <Card className="bg-gradient-card p-3">
        <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-secondary/50 p-1">
          <button
            onClick={() => setDrafter("me")}
            className={`rounded-md py-2.5 text-sm font-semibold transition ${
              drafter === "me" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
            }`}
          >
            <User className="mr-1.5 -mt-0.5 inline h-4 w-4" /> My Pick
          </button>
          <button
            onClick={() => setDrafter("other")}
            className={`rounded-md py-2.5 text-sm font-semibold transition ${
              drafter === "other" ? "bg-accent text-accent-foreground shadow" : "text-muted-foreground"
            }`}
          >
            <Users className="mr-1.5 -mt-0.5 inline h-4 w-4" /> Other
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <PlayerAutocomplete
            value={playerName}
            onChange={setPlayerName}
            onSelect={(p) => p.position && POSITIONS.includes(p.position as Position) && setPosition(p.position as Position)}
          />

          {/* Big price display + live verdict */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Price</span>
              {verdict && verdict.hasRef && <ValueVerdict value={verdict} />}
            </div>
            <span className="font-mono text-2xl font-bold tabular-nums text-primary">
              ${priceInput || "0"}
            </span>
          </div>


          {/* Quick increments */}
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 5, 10, 25, 50].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => {
                  const cur = parseInt(priceInput, 10) || 0;
                  setPriceInput(String(cur + n));
                }}
                className="rounded-md border border-border/60 bg-card py-2 text-xs font-semibold tabular-nums hover:bg-secondary active:scale-95 transition"
              >
                +{n}
              </button>
            ))}
          </div>

          {/* Numeric keypad — no iOS keyboard needed */}
          <div className="grid grid-cols-3 gap-1.5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  // prevent leading zero / runaway length
                  const next = (priceInput === "0" ? "" : priceInput) + d;
                  if (next.length <= 4) setPriceInput(next);
                }}
                className="rounded-lg border border-border/60 bg-card py-3 text-xl font-bold tabular-nums hover:bg-secondary active:scale-95 transition"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPriceInput("")}
              className="rounded-lg border border-border/60 bg-card py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-secondary active:scale-95 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const next = (priceInput === "" ? "" : priceInput) + "0";
                if (priceInput && next.length <= 4) setPriceInput(next);
              }}
              className="rounded-lg border border-border/60 bg-card py-3 text-xl font-bold tabular-nums hover:bg-secondary active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPriceInput(priceInput.slice(0, -1))}
              className="rounded-lg border border-border/60 bg-card py-3 text-base font-bold hover:bg-secondary active:scale-95 transition"
              aria-label="Backspace"
            >
              ⌫
            </button>
          </div>

          {/* Position chips — one tap, no dropdown */}
          <div className="grid grid-cols-6 gap-1">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPosition(position === p ? "" : p)}
                className={`rounded-md border py-2 text-[11px] font-bold tracking-wide transition active:scale-95 ${
                  position === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={onUndo} disabled={!events.length}>
            <Undo2 className="mr-1 h-4 w-4" /> Undo last
          </Button>
        </div>
      </Card>
      )}

      <Card className="bg-gradient-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Draft Log ({events.length})
          </h2>
        </div>
        <div className="max-h-[50vh] space-y-1 overflow-auto">
          {[...events].reverse().slice(0, 50).map((e) => (
            <div
              key={e.id}
              className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm ${
                e.drafter === "me" ? "border-primary/30 bg-primary/5" : "border-border/60 bg-secondary/30"
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                {e.position && (
                  <Badge variant="outline" className={`${POS_COLORS[e.position]} px-1 py-0 text-[9px]`}>
                    {e.position}
                  </Badge>
                )}
                <span className="truncate">{e.player}</span>
                {e.drafter === "me" && (
                  <Badge variant="outline" className="border-primary/40 px-1 py-0 text-[9px] text-primary">YOU</Badge>
                )}
              </div>
              <span className="font-mono font-bold text-primary">${e.price}</span>
            </div>
          ))}
          {!events.length && (
            <p className="py-6 text-center text-xs text-muted-foreground">No picks yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function RosterTab({ myItems, myCount, requiredCount, budget }: any) {
  const rows = (["QB", "RB", "WR", "TE", "K", "DST"] as const).filter((p) => requiredCount[p] > 0);
  return (
    <div className="space-y-3">
      <Card className="bg-gradient-card p-3">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Needs
        </h2>
        <div className="space-y-1.5">
          {rows.map((p) => {
            const have = myCount[p];
            const need = requiredCount[p];
            const short = Math.max(0, need - have);
            const tone = short >= 2 ? "border-destructive/60 bg-destructive/10"
              : short === 1 ? "border-warning/50 bg-warning/10"
              : "border-success/40 bg-success/10";
            return (
              <div key={p} className={`flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm ${tone}`}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${POS_COLORS[p]} px-1.5 py-0 text-[10px]`}>{p}</Badge>
                  <span className="font-mono text-xs">{have}/{need}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {short >= 2 ? "Critical" : short === 1 ? "Need" : "Done"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="bg-gradient-card p-3">
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          My Roster ({myItems.length})
        </h2>
        <div className="space-y-1">
          {myItems.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No picks logged for "me" yet.</p>
          )}
          {myItems.map((it: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/30 px-2.5 py-1.5 text-sm">
              <div className="flex min-w-0 items-center gap-1.5">
                {it.position && (
                  <Badge variant="outline" className={`${POS_COLORS[it.position as Position]} px-1 py-0 text-[9px]`}>
                    {it.position}
                  </Badge>
                )}
                <span className="truncate">{it.player}</span>
                {it.source === "keeper" && (
                  <Badge variant="outline" className="px-1 py-0 text-[9px]">K</Badge>
                )}
              </div>
              <span className="font-mono font-bold text-primary">${it.price}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Spent ${budget.spent} · Avg ${budget.avgPerSlot.toFixed(1)}/slot
        </p>
      </Card>
    </div>
  );
}

function CoachTab({ text, streaming, coachRef, followUp, setFollowUp, onAsk }: any) {
  const presets = [
    "What's my realistic max bid for the next pick I should target?",
    "Which position should I target next and why?",
    "Should I pivot? If yes, to what?",
    "Give me 3 sleeper/value picks right now.",
    "Who should I nominate to drain budgets?",
  ];
  return (
    <div className="space-y-3">
      <Card className="bg-gradient-card p-3 shadow-glow">
        <h2 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3 w-3" /> AI Assistant {streaming && <span className="text-muted-foreground">· thinking…</span>}
        </h2>
        <div ref={coachRef} className="coach-md max-h-[55vh] overflow-auto text-sm leading-relaxed">
          <ReactMarkdown>{text || "_..._"}</ReactMarkdown>
        </div>
      </Card>

      <Card className="bg-gradient-card p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Quick asks</p>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((q) => (
            <Button key={q} size="sm" variant="secondary" disabled={streaming} onClick={() => onAsk(q)} className="h-8 text-xs">
              {q.split(" ").slice(0, 3).join(" ")}…
            </Button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Ask anything…"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && followUp.trim()) {
                onAsk(followUp.trim()); setFollowUp("");
              }
            }}
            disabled={streaming}
            className="h-11 text-base"
          />
          <Button
            disabled={streaming || !followUp.trim()}
            onClick={() => { onAsk(followUp.trim()); setFollowUp(""); }}
          >
            Ask
          </Button>
        </div>
      </Card>
    </div>
  );
}
