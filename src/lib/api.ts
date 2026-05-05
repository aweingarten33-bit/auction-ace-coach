// Single source of truth for backend endpoints.
// Centralizes URLs, auth headers, SSE parsing, and error handling.
import type { QueueTarget } from "@/components/UpNextQueue";
import type { AiNomination } from "@/components/NominationCard";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const COACH_URL = `${SUPABASE_URL}/functions/v1/coach`;
const UPNEXT_URL = `${SUPABASE_URL}/functions/v1/up-next`;
const NOMINATE_URL = `${SUPABASE_URL}/functions/v1/nominate-suggest`;

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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new ApiError(resp.status, explain(resp.status));
  return resp.json() as Promise<T>;
}

// ---------- coach (streaming) ----------

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
}

/**
 * Streams the coach response token-by-token.
 * Throws ApiError on HTTP failure (caller can branch on .status).
 */
export async function streamCoach(
  body: CoachInput,
  onChunk: (delta: string) => void
): Promise<void> {
  const resp = await fetch(COACH_URL, {
    method: "POST",
    headers: baseHeaders,
    body: JSON.stringify(body),
  });

  if (!resp.ok || !resp.body) {
    throw new ApiError(resp.status, explain(resp.status));
  }

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
        const c = JSON.parse(json).choices?.[0]?.delta?.content as string | undefined;
        if (c) onChunk(c);
      } catch {
        // Partial JSON across chunks — restore and wait for more.
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}

// ---------- targets / queue ----------

export interface TargetsInput {
  settings: unknown;
  budget: unknown;
  myRoster: unknown;
  rosterRequired: unknown;
  rosterFilled: unknown;
  gaps: unknown;
  events: unknown;
  prices: unknown;
  spendByPosition: unknown;
  recentRuns: unknown;
  dismissed: string[];
  watchlist: string[];
}

export async function fetchTargets(
  body: TargetsInput
): Promise<{ targets: QueueTarget[]; openMan?: string }> {
  const data = await postJson<{ targets?: QueueTarget[]; openMan?: string }>(UPNEXT_URL, body);
  return { targets: data.targets ?? [], openMan: data.openMan };
}

// ---------- nomination suggestions ----------

export interface NominationsInput {
  budget: unknown;
  gaps: unknown;
  myRoster: unknown;
  events: unknown;
  prices: unknown;
}

export async function fetchNominations(
  body: NominationsInput
): Promise<AiNomination[]> {
  const data = await postJson<{ suggestions?: AiNomination[] }>(NOMINATE_URL, body);
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}
