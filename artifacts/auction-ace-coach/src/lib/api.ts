// Single source of truth for backend endpoints.
// Centralizes URLs, auth headers, SSE parsing, and error handling.

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
  showMath?: boolean;
  strategy?: { id: string; label: string; guidance: string };
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
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}
