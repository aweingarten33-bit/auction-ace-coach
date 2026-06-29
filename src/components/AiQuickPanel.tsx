// Coach AI panel: persistent chat + planner-aware proposals.
// - Loads/saves messages in Lovable Cloud per signed-in user (RLS).
// - Parses <<<PLANNER_PROPOSAL>>>...<<<END>>> blocks from assistant text and
//   renders them as cards with a one-tap "Apply to planner" button.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, Send, Plus, Check, X, RotateCcw, Square, AlertTriangle, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CoachMessage from "@/components/CoachMessage";
import CoachMeta from "@/components/CoachMeta";
import QuickPromptsEditor from "@/components/QuickPromptsEditor";
import { ApiError, streamCoach, type CoachMeta as CoachMetaT } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDraftStore, type QuickPrompt } from "@/lib/draft-store";
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
  const quickPrompts = useDraftStore((s) => s.quickPrompts);
  const setQuickPrompts = useDraftStore((s) => s.setQuickPrompts);
  const resetQuickPrompts = useDraftStore((s) => s.resetQuickPrompts);

  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMeta, setStreamingMeta] = useState<CoachMetaT | null>(null);
  const [metaByMsgId, setMetaByMsgId] = useState<Record<string, CoachMetaT>>({});
  const [input, setInput] = useState("");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [lastError, setLastError] = useState<{ message: string; question: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const ANALYSIS_STEPS = [
    "Checking roster + needs…",
    "Running budget math…",
    "Scanning price sheet for value…",
    "Pulling fresh notes from the web…",
    "Drafting recommendation…",
  ];

  useEffect(() => {
    if (!streaming || streamingText) return;
    setStepIdx(0);
    const t = setInterval(() => {
      setStepIdx((i) => (i + 1) % ANALYSIS_STEPS.length);
    }, 1400);
    return () => clearInterval(t);
  }, [streaming, streamingText]);

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
      setLastError(null);
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
      persistMessage(userMsg).then((id) => {
        if (id) setHistory((h) => h.map((m) => (m === userMsg ? { ...m, id } : m)));
      });

      const controller = new AbortController();
      abortRef.current = controller;
      let gotFirstToken = false;
      // Stall timeout — 30s with zero output → auto-abort with retry.
      const stallTimer = setTimeout(() => {
        if (!gotFirstToken) controller.abort("stall");
      }, 30000);

      let acc = "";
      let capturedMeta: CoachMetaT | null = null;
      let aborted = false;
      let stalled = false;
      try {
        const ctx = coachContext();
        await streamCoach(
          {
            ...ctx,
            userQuestion: question,
            history: history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          },
          (chunk) => {
            if (!gotFirstToken) gotFirstToken = true;
            acc += chunk;
            setStreamingText(extractProposal(acc).clean);
            scrollRef.current?.scrollTo({ top: 1e9 });
          },
          (meta) => {
            capturedMeta = meta;
            setStreamingMeta(meta);
          },
          controller.signal,
        );
      } catch (e) {
        if (controller.signal.aborted) {
          aborted = true;
          stalled = (controller.signal.reason as string) === "stall" || !gotFirstToken;
        } else {
          const msg = e instanceof ApiError ? e.message : "Coach unavailable.";
          toast.error(msg);
          setLastError({ message: msg, question });
        }
      } finally {
        clearTimeout(stallTimer);
        abortRef.current = null;
        setStreaming(false);
        if (stalled && !acc) {
          setLastError({
            message: "Coach didn't respond within 30s. Network or AI gateway may be slow.",
            question,
          });
        } else if (aborted && !acc) {
          // user-stopped, no output — just clean up silently
        } else if (acc) {
          const tail = aborted ? "\n\n_Stopped._" : "";
          const { clean, proposal } = extractProposal(acc + tail);
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

  const stop = useCallback(() => {
    abortRef.current?.abort("user");
  }, []);

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
            <div className="coach-ai-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="coach-ai-mark-icon" size={16} strokeWidth={1.75} />
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
              <div className="coach-ai-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                <Sparkles className="coach-ai-mark-icon" size={16} strokeWidth={1.75} />
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
            <div className="coach-ai-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="coach-ai-mark-icon animate-pulse" size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                <span className="relative inline-flex h-1 w-16 overflow-hidden rounded-full bg-muted">
                  <span className="absolute inset-y-0 left-0 w-1/3 animate-pulse bg-primary" />
                </span>
                Writing answer…
              </div>
              <CoachMessage content={streamingText} />
              {streamingMeta && <CoachMeta meta={streamingMeta} />}
            </div>
          </div>
        )}
        {streaming && !streamingText && (
          <div className="flex gap-2">
            <div className="coach-ai-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
              <Sparkles className="coach-ai-mark-icon animate-pulse" size={16} strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[13px] font-medium text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:0.3s]" />
                  Coach is thinking
                </span>
              </div>
              <ul className="space-y-0.5 text-[12px]">
                {ANALYSIS_STEPS.map((step, i) => {
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <li
                      key={step}
                      className={cn(
                        "flex items-center gap-1.5 transition-opacity",
                        done && "text-muted-foreground opacity-70",
                        active && "text-foreground",
                        !done && !active && "text-muted-foreground/50",
                      )}
                    >
                      {done ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : active ? (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                      {step}
                    </li>
                  );
                })}
              </ul>
              {streamingMeta && <CoachMeta meta={streamingMeta} />}
            </div>
          </div>
        )}
        {lastError && !streaming && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-destructive/20">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5">
              <p className="text-[12px] font-medium text-foreground">{lastError.message}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Check your connection or try a simpler question.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => ask(lastError.question)}
                className="mt-2 h-7 gap-1 rounded-lg text-[11px]"
              >
                <RotateCcw className="h-3 w-3" /> Retry
              </Button>
            </div>
          </div>
        )}

      </div>

      <div className="border-t border-border/60 px-3 pb-3 pt-2">
        <div className="mb-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {quickPrompts.map((p: QuickPrompt) => (
            <Button
              key={p.id}
              size="sm"
              variant="outline"
              disabled={streaming}
              onClick={() => ask(p.prompt)}
              className="h-7 rounded-full px-2.5 text-[11px] font-normal"
            >
              {p.label}
            </Button>
          ))}
          <QuickPromptsEditor
            prompts={quickPrompts}
            onSave={setQuickPrompts}
            onReset={resetQuickPrompts}
          />
        </div>
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
          {streaming ? (
            <Button
              onClick={stop}
              size="sm"
              variant="destructive"
              className="h-8 w-8 shrink-0 rounded-full p-0"
              title="Stop Coach"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              onClick={() => ask(input)}
              disabled={!input.trim()}
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full border border-white/20 !bg-black p-0 !text-white hover:!bg-black/90"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
