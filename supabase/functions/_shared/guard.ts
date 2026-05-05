// Shared CORS + per-user rate limit for AI edge functions.
// In-memory limiter is best-effort (per warm instance) — sufficient to stop
// runaway client loops; not a hard security boundary.

const RAW_ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").trim();
const ALLOWED_ORIGINS: string[] = RAW_ALLOWED
  ? RAW_ALLOWED.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

const ALLOW_HEADERS =
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version";

export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // No allowlist configured → open (legacy behavior, useful in dev).
  if (ALLOWED_ORIGINS.length === 0) {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Headers": ALLOW_HEADERS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    };
  }
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Decode the JWT user id WITHOUT verifying the signature. The Supabase gateway
// already validates the JWT before we see the request, so we can trust `sub`
// for rate-limit keying. Falls back to the client IP when no JWT is present.
export function callerKey(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      const parts = m[1].split(".");
      if (parts.length >= 2) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        if (payload?.sub) return `u:${payload.sub}`;
      }
    } catch { /* ignore */ }
  }
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  return `ip:${ip}`;
}

interface Bucket { count: number; resetAt: number }
const BUCKETS = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const b = BUCKETS.get(key);
  if (!b || b.resetAt <= now) {
    BUCKETS.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  if (b.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

export function rateLimitResponse(req: Request, retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Slow down for a moment." }),
    {
      status: 429,
      headers: {
        ...corsFor(req),
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
