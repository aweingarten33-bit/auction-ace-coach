// AI tools that live inside the floating FAB sheet on the home page.
// Coach chat only — Targets list moved out per user request.
import { useRef, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoachMessage from "@/components/CoachMessage";
import { ApiError, streamCoach } from "@/lib/api";
import { toast } from "sonner";

interface Props {
  // everything streamCoach needs
  coachContext: () => Parameters<typeof streamCoach>[0];
}

const QUICK_PROMPTS = [
  "Who should I target next?",
  "What's my biggest roster hole?",
  "Any sleepers left?",
  "Is the room overpaying RBs?",
];

export default function AiQuickPanel({ coachContext }: Props) {
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
    <div className="flex h-full flex-col overflow-hidden">
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
    </div>
  );
}
