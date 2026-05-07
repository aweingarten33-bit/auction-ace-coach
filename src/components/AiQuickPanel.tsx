// AI tools that live inside the floating FAB sheet on the home page.
// Two tabs: AI target recommendations + Matthew Berry-style coach chat.
import { useRef, useState } from "react";
import { Sparkles, RefreshCw, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoachMessage from "@/components/CoachMessage";
import { POS_COLORS } from "@/lib/positions";
import { ApiError, streamCoach } from "@/lib/api";
import type { QueueTarget } from "@/components/UpNextQueue";
import { toast } from "sonner";

interface Props {
  targets: QueueTarget[];
  targetsLoading: boolean;
  onRefreshTargets: () => void;
  onPickTarget: (name: string) => void;
  // everything streamCoach needs
  coachContext: () => Parameters<typeof streamCoach>[0];
}

const QUICK_PROMPTS = [
  "Who should I target next?",
  "What's my biggest roster hole?",
  "Any sleepers left?",
  "Is the room overpaying RBs?",
];

export default function AiQuickPanel({
  targets, targetsLoading, onRefreshTargets, onPickTarget, coachContext,
}: Props) {
  const [tab, setTab] = useState<"targets" | "coach">("targets");

  // ── Coach chat state ────────────────────────────────────────────
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (question: string) => {
    if (!question.trim() || streaming) return;
    setHistory((h) => [...h, { role: "user", content: question }]);
    setInput("");
    setStreaming(true);
    setStreamingText("");
    let acc = "";
    try {
      const ctx = coachContext();
      await streamCoach(
        { ...ctx, userQuestion: question, history: history.slice(-6) },
        (chunk) => {
          acc += chunk;
          setStreamingText(acc);
          scrollRef.current?.scrollTo({ top: 1e9 });
        },
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Coach unavailable.";
      toast.error(msg);
      acc = acc || "⚠️ Coach unavailable — try again.";
    } finally {
      setStreaming(false);
      if (acc) setHistory((h) => [...h, { role: "assistant", content: acc }]);
      setStreamingText("");
    }
  };

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "targets" | "coach")} className="flex h-full flex-col">
      <TabsList className="mx-3 mt-2 grid grid-cols-2">
        <TabsTrigger value="targets" className="text-xs">
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Targets
        </TabsTrigger>
        <TabsTrigger value="coach" className="text-xs">
          Coach AI
        </TabsTrigger>
      </TabsList>

      {/* ── Targets tab ───────────────────────────────────────────── */}
      <TabsContent value="targets" className="flex min-h-0 flex-1 flex-col p-0 data-[state=inactive]:hidden">
        <div className="px-4 pt-3 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Top 10 to draft next
          </p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground/80">
            $ values are AI estimates of where these players will go. To get the math-based max bid for any player, use Find in the menu.
          </p>
        </div>
        <div className="flex-1 px-3 pb-3">
          {targets.length === 0 && targetsLoading && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">Thinking…</p>
          )}
          {targets.length === 0 && !targetsLoading && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No targets yet.</p>
          )}
          <ol className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
            {targets.slice(0, 10).map((t, i) => (
              <li
                key={t.name}
                className="flex items-center gap-2 px-2.5 py-1.5"
              >
                <span className="w-4 shrink-0 text-center font-mono text-[10px] text-muted-foreground">
                  {i + 1}
                </span>
                <Badge variant="outline" className={`${POS_COLORS[t.position] ?? ""} shrink-0 px-1 text-[9px]`}>
                  {t.position}
                </Badge>
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">{t.name}</p>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-primary">
                  ${t.maxBid}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </TabsContent>

      {/* ── Coach chat tab ────────────────────────────────────────── */}
      <TabsContent value="coach" className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 data-[state=inactive]:hidden">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
          {history.length === 0 && !streaming && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="text-[12px] text-muted-foreground">
                Ask anything — like talking to Matthew Berry mid-draft. "Should I take Bijan at $45?" "Who's the best WR2 left?"
              </div>
            </div>
          )}
          {history.map((m, i) => m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3 py-1.5 text-[13px]">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CoachMessage content={m.content} />
              </div>
            </div>
          ))}
          {streaming && streamingText && (
            <div className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CoachMessage content={streamingText} />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          {history.length === 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((p) => (
                <Button
                  key={p}
                  size="sm" variant="outline"
                  disabled={streaming}
                  onClick={() => ask(p)}
                  className="h-7 rounded-full px-2.5 text-[11px] font-normal"
                >
                  {p}
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border-2 border-primary/40 bg-background px-3 py-1.5 focus-within:border-primary">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="Ask Coach AI…"
              disabled={streaming}
              className="h-9 flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <Button
              onClick={() => ask(input)}
              disabled={streaming || !input.trim()}
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full p-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
