// Coach AI panel: persistent chat + planner-aware proposals.
// - Loads/saves messages in Lovable Cloud per signed-in user (RLS).
// - Parses <<<PLANNER_PROPOSAL>>>...<<<END>>> blocks from assistant text and
//   renders them as cards with a one-tap "Apply to planner" button.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Plus, Check, X, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoachMessage from "@/components/CoachMessage";
import CoachMeta from "@/components/CoachMeta";
import { ApiError, streamCoach, type CoachMeta as CoachMetaT } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDraftStore } from "@/lib/draft-store";
import { cn } from "@/lib/utils";

interface Props {
  coachContext: () => Parameters<typeof streamCoach>[0];
}

interface ProposalSlot {
  id: string;
  dollars: number;
  target?: string;
}

interface PlannerProposal {
  kind: "full" | "patch";
  slots: ProposalSlot[];
  total?: number;
  note?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  proposal: PlannerProposal | null;
}

const QUICK_PROMPTS = [
  "Does my current build fit $225?",
  "Find me a cheap backup QB",
  "Where am I weakest?",
  "Build me a $225 plan",
  "Best QB value left?",
  "Best RB value left?",
  "Best WR value left?",
  "Best TE value left?",
  "What's running dry at each position?",
  "How much should I spend on RB1?",
  "Stars-and-scrubs or balanced build?",
];

const PROPOSAL_OPEN = "<<<PLANNER_PROPOSAL>>>";
const PROPOSAL_CLOSE = "<<<END>>>";

function extractProposal(text: string): { clean: string; proposal: PlannerProposal | null } {
  const start = text.indexOf(PROPOSAL_OPEN);
  if (start === -1) return { clean: text, proposal: null };
  const end = text.indexOf(PROPOSAL_CLOSE, start);
  if (end === -1) {
    // Streaming partial — strip the opener so it doesn't render as text.
    return { clean: text.slice(0, start).trimEnd(), proposal: null };
  }
  const json = text.slice(start + PROPOSAL_OPEN.length, end).trim();
  const clean = (text.slice(0, start) + text.slice(end + PROPOSAL_CLOSE.length)).trim();
  try {
    const parsed = JSON.parse(json) as PlannerProposal;
    if (Array.isArray(parsed.slots) && (parsed.kind === "full" || parsed.kind === "patch")) {
      const slots = parsed.slots
        .filter((s) => s && typeof s.id === "string" && Number.isFinite(s.dollars))
        .map((s) => ({ id: s.id, dollars: Math.max(0, Math.round(s.dollars)), target: s.target ?? "" }));
      return { clean, proposal: { kind: parsed.kind, slots, total: parsed.total, note: parsed.note } };
    }
  } catch {
    /* fall through */
  }
  return { clean, proposal: null };
}

export default function AiQuickPanel({ coachContext }: Props) {
  const { user } = useAuth();
  const isAuthed = !!user && !user.is_anonymous;

  const setSlotAllocation = useDraftStore((s) => s.setSlotAllocation);
  const setSlotNote = useDraftStore((s) => s.setSlotNote);
  const slotAllocations = useDraftStore((s) => s.slotAllocations);
  const slotNotes = useDraftStore((s) => s.slotNotes);
  const lockedSlots = useDraftStore((s) => s.lockedSlots);

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMeta, setStreamingMeta] = useState<CoachMetaT | null>(null);
  const [metaByMsgId, setMetaByMsgId] = useState<Record<string, CoachMetaT>>({});
  const [input, setInput] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved messages once when an authed user is available.
  useEffect(() => {
    if (!isAuthed) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("coach_messages")
        .select("id, role, content, proposal")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.warn("coach_messages load failed", error);
      } else if (data) {
        setHistory(
          data.map((row) => ({
            id: row.id as string,
            role: row.role as "user" | "assistant",
            content: row.content as string,
            proposal: (row.proposal as unknown as PlannerProposal | null) ?? null,
          })),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

  const persistMessage = useCallback(
    async (msg: { role: "user" | "assistant"; content: string; proposal: PlannerProposal | null }) => {
      if (!isAuthed || !user) return null;
      const { data, error } = await supabase
        .from("coach_messages")
        .insert({ user_id: user.id, role: msg.role, content: msg.content, proposal: msg.proposal as unknown as never })
        .select("id")
        .single();
      if (error) {
        console.warn("coach_messages insert failed", error);
        return null;
      }
      return data?.id as string | undefined;
    },
    [isAuthed, user],
  );

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || streaming) return;
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}-u`,
        role: "user",
        content: question,
        proposal: null,
      };
      setHistory((h) => [...h, userMsg]);
      setInput("");
      setStreaming(true);
      setStreamingText("");
      setStreamingMeta(null);
      // Fire-and-forget persistence.
      persistMessage(userMsg).then((id) => {
        if (id) setHistory((h) => h.map((m) => (m === userMsg ? { ...m, id } : m)));
      });

      let acc = "";
      let capturedMeta: CoachMetaT | null = null;
      try {
        const ctx = coachContext();
        await streamCoach(
          {
            ...ctx,
            userQuestion: question,
            history: history
              .slice(-6)
              .map((m) => ({ role: m.role, content: m.content })),
          },
          (chunk) => {
            acc += chunk;
            setStreamingText(extractProposal(acc).clean);
            scrollRef.current?.scrollTo({ top: 1e9 });
          },
          (meta) => {
            capturedMeta = meta;
            setStreamingMeta(meta);
          },
        );
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Coach unavailable.";
        toast.error(msg);
        acc = acc || "⚠️ Coach unavailable — try again.";
      } finally {
        setStreaming(false);
        if (acc) {
          const { clean, proposal } = extractProposal(acc);
          const assistantMsg: ChatMessage = {
            id: `local-${Date.now()}-a`,
            role: "assistant",
            content: clean,
            proposal,
          };
          setHistory((h) => [...h, assistantMsg]);
          if (capturedMeta) {
            setMetaByMsgId((m) => ({ ...m, [assistantMsg.id]: capturedMeta! }));
          }
          persistMessage({ role: "assistant", content: clean, proposal }).then((id) => {
            if (id) {
              setHistory((h) => h.map((m) => (m === assistantMsg ? { ...m, id } : m)));
              if (capturedMeta) {
                setMetaByMsgId((m) => {
                  const next = { ...m };
                  delete next[assistantMsg.id];
                  next[id] = capturedMeta!;
                  return next;
                });
              }
            }
          });
        }
        setStreamingText("");
        setStreamingMeta(null);
        inputRef.current?.focus();
      }
    },

    [coachContext, history, persistMessage, streaming],
  );

  const newChat = useCallback(async () => {
    if (streaming) return;
    if (history.length > 0 && !confirm("Start a new chat? Your saved messages will be deleted.")) return;
    setHistory([]);
    setDismissed(new Set());
    if (isAuthed && user) {
      const { error } = await supabase.from("coach_messages").delete().eq("user_id", user.id);
      if (error) toast.error("Couldn't clear saved chat — try again.");
    }
  }, [history.length, isAuthed, streaming, user]);

  const applyProposal = useCallback(
    (proposal: PlannerProposal, messageId: string) => {
      // Snapshot previous values for undo.
      const prevAlloc: Record<string, number | undefined> = {};
      const prevNote: Record<string, string | undefined> = {};
      let applied = 0;
      let skipped = 0;
      for (const slot of proposal.slots) {
        if (lockedSlots[slot.id]) {
          skipped += 1;
          continue;
        }
        prevAlloc[slot.id] = slotAllocations[slot.id];
        prevNote[slot.id] = slotNotes[slot.id];
        setSlotAllocation(slot.id, slot.dollars);
        setSlotNote(slot.id, slot.target ?? "");
        applied += 1;
      }
      setDismissed((d) => new Set(d).add(messageId));
      toast.success(
        `Applied to planner — ${applied} slot${applied === 1 ? "" : "s"}${skipped ? ` (${skipped} locked, skipped)` : ""}`,
        {
          action: {
            label: "Undo",
            onClick: () => {
              for (const id of Object.keys(prevAlloc)) {
                setSlotAllocation(id, prevAlloc[id] ?? 0);
                setSlotNote(id, prevNote[id] ?? "");
              }
              setDismissed((d) => {
                const next = new Set(d);
                next.delete(messageId);
                return next;
              });
            },
          },
          duration: 6000,
        },
      );
    },
    [lockedSlots, setSlotAllocation, setSlotNote, slotAllocations, slotNotes],
  );

  const renderProposal = useCallback(
    (proposal: PlannerProposal, messageId: string) => {
      const isDismissed = dismissed.has(messageId);
      return (
        <div
          className={cn(
            "mt-2 rounded-xl border-2 p-3 text-[12px] transition-opacity",
            isDismissed ? "border-border bg-secondary/40 opacity-60" : "border-primary/50 bg-primary/5",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {proposal.kind === "full" ? "Proposed full build" : "Proposed change"}
            </span>
            {proposal.total != null && (
              <span className="font-mono text-[11px] font-semibold">${proposal.total}</span>
            )}
          </div>
          <div className="mb-2 max-h-44 overflow-y-auto rounded-md bg-background/60 px-2 py-1.5">
            {proposal.slots.map((slot) => {
              const locked = !!lockedSlots[slot.id];
              return (
                <div
                  key={slot.id}
                  className={cn(
                    "flex items-center gap-2 py-0.5",
                    locked && "text-muted-foreground line-through",
                  )}
                >
                  <span className="w-12 shrink-0 font-mono text-[10px] font-semibold text-muted-foreground">
                    {slot.id.replace("-", " ")}
                  </span>
                  <span className="flex-1 truncate">{slot.target || "—"}</span>
                  <span className="font-mono font-semibold">${slot.dollars}</span>
                </div>
              );
            })}
          </div>
          {proposal.note && <p className="mb-2 text-[11px] text-muted-foreground">{proposal.note}</p>}
          {!isDismissed && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-7 flex-1 gap-1 rounded-lg text-[11px]"
                onClick={() => applyProposal(proposal, messageId)}
              >
                <Check className="h-3 w-3" /> Apply to planner
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-lg text-[11px]"
                onClick={() => setDismissed((d) => new Set(d).add(messageId))}
              >
                <X className="h-3 w-3" /> Dismiss
              </Button>
            </div>
          )}
          {isDismissed && (
            <p className="text-[11px] italic text-muted-foreground">Dismissed.</p>
          )}
        </div>
      );
    },
    [applyProposal, dismissed, lockedSlots],
  );

  const hasMessages = history.length > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Loading your chat…
          </div>
        )}
        {!loading && !hasMessages && !streaming && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-[12px] text-muted-foreground">
              I can see your budget board. Ask me to build a plan, swap a player, or sanity-check your $225 — I'll show you the math and offer to update the planner with one tap.
            </div>
          </div>
        )}
        {history.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-3 py-1.5 text-[13px]">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <CoachMessage content={m.content} />
                {m.proposal && renderProposal(m.proposal, m.id)}
                {metaByMsgId[m.id] && <CoachMeta meta={metaByMsgId[m.id]} />}
              </div>
            </div>
          ),
        )}
        {streaming && streamingText && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CoachMessage content={streamingText} />
              {streamingMeta && <CoachMeta meta={streamingMeta} />}
            </div>
          </div>
        )}
        {streaming && !streamingText && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0.3s]" />
                  Coach is thinking
                </span>
              </div>
              {streamingMeta && <CoachMeta meta={streamingMeta} />}
            </div>
          </div>
        )}

      </div>

      <div className="border-t border-border/60 px-3 pb-3 pt-2">
        {!hasMessages && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant="outline"
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
            ref={inputRef}
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
