// Single source of truth for backend endpoints.
// Centralizes URLs, auth headers, SSE parsing, and error handling.

import { useDraftStore } from "@/lib/draft-store";
import { getStrategySummary, type StrategyId } from "@/lib/planner-strategies";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const COACH_URL = `${SUPABASE_URL}/functions/v1/coach`;

const baseHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${PUBLISHABLE_KEY}`,
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function explain(status: number): string {
  if (status === 429) return "Rate limited. Try again shortly.";
  if (status === 402) return "AI credits exhausted. Add credits in workspace usage.";
  return "Service unavailable.";
}

export interface CoachInput {
  settings: unknown;
  budget: unknown;
  keepers: unknown;
  myRoster: unknown;
  rosterRequired: unknown;
  rosterFilled: unknown;
  events: unknown;
  prices: unknown;
  spendByPosition: unknown;
  recentRuns: unknown;
  latestEvent?: unknown;
  userQuestion?: string;
  vetriTakes?: unknown;
  history?: { role: "user" | "assistant"; content: string }[];
  draftedPlayers?: string[];
  showMath?: boolean;
  strategy?: { id: string; label: string; guidance: string };
  budgetBoard?: {
    totalBudget: number;
    slots: { id: string; label: string; group: string; dollars: number; target: string; locked: boolean }[];
  };
}

export interface WebSource {
  title: string;
  url: string;
  description: string;
}

export interface CoachConfidence {
  label: "high" | "medium" | "low";
  pdf: number;
  web: number;
  score: number;
  basis: string;
}

export interface CoachMeta {
  searched: boolean;
  searchReason: string;
  searchQuery: string;
  firecrawlCache: "hit" | "miss" | "skip" | "error";
  sources: WebSource[];
  confidence: CoachConfidence;
  debug: {
    undraftedPriceCount: number;
    draftedCount: number;
    historyTurns: number;
    systemPromptChars: number;
    userMessageChars: number;
    webSnippets: { idx: number; title: string; url: string; description: string }[];
  };
}

function withAuctionAceContext(body: CoachInput): CoachInput {
  try {
    const state = useDraftStore.getState();
    const strategyId = state.plannerStrategy as StrategyId;
    const summary = getStrategySummary(strategyId, state.prices);
    const locked = Object.entries(state.lockedSlots).filter(([, v]) => v).map(([id]) => id);
    const draftedSpend = locked.reduce((sum, id) => sum + Number(state.slotAllocations[id] ?? 0), 0);
    const bank = Math.max(0, state.settings.totalBudget - draftedSpend);

    const semantics = [
      "AUCTION ACE LIVE CONTEXT (treat this as authoritative app state):",
      "- Every number in the Price Sheet is a SINGLE EXPECTED SALE PRICE for this user's league. It is not a PDF value, blended value, fair value, or max bid.",
      "- Compare the user's ESPN-observed current bid to Expected Price, but do not confuse Expected Price with a recommendation to keep bidding regardless of roster construction.",
      `- Selected planner strategy: ${summary.label}. QB targets: ${summary.qbTargets}.`,
      summary.qbSpendLow != null && summary.qbSpendHigh != null
        ? `- Expected QB spend band for that strategy: $${summary.qbSpendLow}-$${summary.qbSpendHigh}.`
        : "- Manual strategy: use the user's current slot allocations as the plan.",
      `- Planner actual drafted spend: $${draftedSpend}. Real bank remaining: $${bank}.`,
      "- [LOCKED-DRAFTED] Budget Board rows are actual purchases at actual prices; unlocked rows are the recalibrated plan.",
      "- If the user tells you a live ESPN bid, lead with a direct BID / PASS / KEEP GOING TO $X answer using Expected Price + the current planner + legal budget math.",
    ].join("\n");

    return {
      ...body,
      strategy: {
        id: strategyId,
        label: summary.label,
        guidance: `${summary.qbTargets}. ${summary.description}`,
      },
      userQuestion: `${body.userQuestion ?? ""}\n\n${semantics}`.trim(),
    };
  } catch {
    return body;
  }
}

/** Streams the coach response token-by-token. */
export async function streamCoach(
  body: CoachInput,
  onChunk: (delta: string) => void,
  onMeta?: (meta: CoachMeta) => void,
  signal?: AbortSignal,
): Promise<void> {
  const outbound = withAuctionAceContext(body);
  const resp = await fetch(COACH_URL, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(outbound),
    signal,
  });

  if (!resp.ok || !resp.body) throw new ApiError(resp.status, explain(resp.status));

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
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
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        if (parsed?.meta && onMeta) {
          onMeta(parsed.meta as CoachMeta);
          continue;
        }
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onChunk(c);
      } catch {
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}
