/**
 * lib/rate-limit.ts
 *
 * In-memory sliding-window rate limiter — zero external dependencies.
 *
 * ALGORITHM: Sliding Window
 * ─────────────────────────
 * For each (identifier, route) pair we keep a list of timestamps for all
 * requests made in the current window. On each call we:
 *   1. Drop timestamps older than `windowMs` (slide the window).
 *   2. If the remaining count >= `maxRequests` → throw RateLimitError.
 *   3. Otherwise push the current timestamp and allow the request.
 *
 * This avoids the "burst at boundary" problem of a fixed window while staying
 * simple enough that it doesn't need Redis.
 *
 * CAVEAT — In-process only
 * ────────────────────────
 * This store lives in Node.js module memory. If you run multiple Next.js
 * server instances (horizontal scaling, serverless cold starts that don't
 * share memory) each instance tracks its own window independently.
 * For production multi-instance deployments, swap the store for Upstash Redis:
 *   @see https://github.com/upstash/ratelimit
 *
 * For a single-server or personal deployment this is perfectly sufficient.
 *
 * IDENTITY
 * ────────
 * Without authentication we fall back to the client IP address, read from
 * the `x-forwarded-for` header (set by Vercel / Nginx) or the `x-real-ip`
 * header, or finally the literal string "unknown" as a last resort.
 *
 * RATE LIMITS (by route)
 * ──────────────────────
 *   /api/chat        20 req / 60 s   — normal chat cadence, LLM is expensive
 *   /api/upload-pdf   5 req / 10 min — heavy: PDF parse + embed + DB writes
 *   /api/ingest      10 req / 60 s   — moderate: text embed + DB write
 *
 * USAGE
 * ──────
 *   import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
 *
 *   // At the very top of a route handler, before any async work:
 *   checkRateLimit(req, LIMITS.chat);
 */

import { RateLimitError } from "./errors";

// ── Configuration ─────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Human-readable route name, used in log messages. */
  name: string;
  /** Maximum number of requests allowed in the window. */
  maxRequests: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Pre-defined limits for each protected route. */
export const LIMITS = {
  chat: {
    name: "/api/chat",
    maxRequests: 20,
    windowMs: 60_000, // 1 minute
  },
  uploadPdf: {
    name: "/api/upload-pdf",
    maxRequests: 5,
    windowMs: 10 * 60_000, // 10 minutes
  },
  ingest: {
    name: "/api/ingest",
    maxRequests: 10,
    windowMs: 60_000, // 1 minute
  },
} satisfies Record<string, RateLimitConfig>;

// ── In-memory store ───────────────────────────────────────────────────────────

/**
 * Map key: `${ip}::${routeName}`
 * Value:   array of request timestamps (ms since epoch) within the window.
 */
const store = new Map<string, number[]>();

/**
 * Periodically evict fully-expired entries so the Map doesn't grow unboundedly
 * in long-lived server processes. Runs every 5 minutes.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    // We don't know the windowMs per key here, so use a generous 15-minute TTL.
    // Any live window will be refreshed long before this fires.
    const stillActive = timestamps.some((ts) => now - ts < 15 * 60_000);
    if (!stillActive) store.delete(key);
  }
}, 5 * 60_000);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the best available client IP from the request headers.
 * `x-forwarded-for` may be a comma-separated list; we take the first entry
 * (the original client) and ignore any intermediate proxies.
 */
function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }

  const xri = req.headers.get("x-real-ip");
  if (xri?.trim()) return xri.trim();

  return "unknown";
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enforces the rate limit for the given request and config.
 *
 * Call this **synchronously at the top of a route handler** before any
 * async work so that limited requests are rejected as cheaply as possible.
 *
 * @throws {RateLimitError} when the limit is exceeded.
 */
export function checkRateLimit(req: Request, config: RateLimitConfig): void {
  const ip = getClientIp(req);
  const key = `${ip}::${config.name}`;
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Slide the window: drop timestamps older than the window.
  const timestamps = (store.get(key) ?? []).filter((ts) => ts > cutoff);

  if (timestamps.length >= config.maxRequests) {
    // Calculate how many seconds until the oldest timestamp falls out of the window.
    const oldest = timestamps[0]; // array is chronologically ordered
    const retryAfterMs = oldest + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    throw new RateLimitError(
      `Rate limit exceeded for IP=${ip} on ${config.name} ` +
        `(${timestamps.length}/${config.maxRequests} req in ${config.windowMs / 1000}s window). ` +
        `Retry-After: ${retryAfterSeconds}s`,
      retryAfterSeconds
    );
  }

  // Request is allowed — record it.
  timestamps.push(now);
  store.set(key, timestamps);
}
