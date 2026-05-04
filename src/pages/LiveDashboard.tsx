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
import { Position } from "@/lib/draft-types";
import { POSITIONS, POS_COLORS } from "@/lib/positions";
import { Undo2, Trophy, RotateCcw, Send, Sparkles, Settings2, User, Users } from "lucide-react";

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coach`;

export default function LiveDashboard() {
  const navigate = useNavigate();
  const {
    settings,
    keepers,
    prices,
    events,
    setupComplete,
    addEvent,
    undoEvent,
    resetAll,
  } = useDraftStore();

  const [input, setInput] = useState("");
  const [drafter, setDrafter] = useState<"me" | "other">("other");
  const [position, setPosition] = useState<Position | "">("");
  const [coachText, setCoachText] = useState<string>(
    "Welcome, coach. Enter your first draft pick above to get live recommendations."
  );
  const [streaming, setStreaming] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const coachRef = useRef<HTMLDivElement>(null);

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

  const askCoach = async (latestEvent?: any, userQuestion?: string) => {
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
          settings: {
            totalBudget: settings.totalBudget,
            numTeams: settings.numTeams,
            scoring: settings.scoring,
            leagueType: settings.leagueType,
            keeperIncrease: settings.keeperIncrease,
            context: settings.context,
          },
          budget,
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
    }
  };

  const submitPick = () => {
    const parsed = parsePlayerLine(input);
    if (!parsed) {
      toast.error("Format: Player Name - Price");
      return;
    }
    if (drafter === "me" && parsed.price > budget.maxBid) {
      toast.error(`Over max bid. You can only spend $${budget.maxBid} on this slot.`);
      return;
    }
    const ev = {
      id: crypto.randomUUID(),
      player: parsed.name,
      price: parsed.price,
      position: position || undefined,
      drafter,
      ts: Date.now(),
    };
    addEvent(ev);
    setInput("");
    setPosition("");
    askCoach(ev);
  };

  const handleFollowUp = () => {
    if (!followUp.trim()) return;
    const q = followUp.trim();
    setFollowUp("");
    askCoach(undefined, q);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary">
              <Trophy className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight">Auction Draft AI Coach</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">
                ${budget.remaining} left · {budget.slotsLeft} slots · max ${budget.maxBid}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <Settings2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm"><RotateCcw className="h-4 w-4" /></Button>
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

      <main className="mx-auto grid max-w-7xl gap-4 p-3 md:p-4 lg:grid-cols-2">
        {/* LEFT: Input + activity */}
        <section className="space-y-4">
          <Card className="bg-gradient-card p-4">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setDrafter("me")}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition ${
                    drafter === "me"
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  <User className="inline h-3 w-3 mr-1" /> Drafted by ME
                </button>
                <button
                  onClick={() => setDrafter("other")}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs font-semibold transition ${
                    drafter === "other"
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  <Users className="inline h-3 w-3 mr-1" /> Other team
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Player Name - Price"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitPick()}
                  className="font-medium"
                  autoFocus
                />
                <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                  <SelectTrigger className="w-20"><SelectValue placeholder="Pos" /></SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={submitPick}
                  disabled={streaming}
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                >
                  <Send className="h-4 w-4 mr-2" /> Log Pick
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { undoEvent(); toast("Last entry undone"); }}
                  disabled={!events.length}
                >
                  <Undo2 className="h-4 w-4 mr-1" /> Undo
                </Button>
              </div>
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="bg-gradient-card p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Draft Log ({events.length})
            </h2>
            <div className="max-h-80 space-y-1.5 overflow-auto">
              {[...events].reverse().map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                    e.drafter === "me" ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/50"
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
          {/* Budget */}
          <Card className="bg-gradient-card p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-primary">${budget.remaining}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max Bid</p>
                <p className="text-2xl font-bold">${budget.maxBid}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Slots Left</p>
                <p className="text-2xl font-bold">{budget.slotsLeft}<span className="text-sm text-muted-foreground">/{budget.slotsTotal}</span></p>
              </div>
            </div>
            <Progress
              value={budget.totalBudget ? (budget.spent / budget.totalBudget) * 100 : 0}
              className="mt-3 h-1.5"
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
              </h2>
              <p className="text-[10px] text-muted-foreground">
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
              <Sparkles className="h-3.5 w-3.5" /> AI Coach {streaming && <span className="text-muted-foreground">· thinking...</span>}
            </h2>
            <div ref={coachRef} className="coach-md max-h-96 overflow-auto text-sm leading-relaxed">
              <ReactMarkdown>{coachText || "_..._"}</ReactMarkdown>
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
