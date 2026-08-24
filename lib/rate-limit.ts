/**
 * lib/rate-limit.ts
 *
 * In-memory sliding-window rate limiter — zero external dependencies.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ALGORITHM: Sliding Window Log
 * ─────────────────────────────────────────────────────────────────────────────
 * For each (identity, route) pair we keep an ordered list of request
 * timestamps that fall inside the current window. On every call:
 *
 *   1. Drop timestamps older than `windowMs` (slide the window forward).
 *   2. If the remaining count >= `maxRequests` → throw RateLimitError.
 *   3. Otherwise push the current timestamp and allow the request.
 *
 * This avoids the "burst-at-boundary" problem of a fixed-window counter while
 * remaining simple enough to run without any external store.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IN-PROCESS ONLY — NOT GLOBALLY CONSISTENT ACROSS SERVERLESS INSTANCES
 * ─────────────────────────────────────────────────────────────────────────────
 * The store lives in Node.js module memory. It works correctly when the
 * application runs as a single long-running server process (e.g. `npm start`,
 * Docker container, a single Vercel region with enough traffic to keep one
 * instance warm).
 *
 * It is NOT globally consistent across multiple serverless instances:
 *   - Vercel cold-starts a new instance for each burst of traffic.
 *   - Each instance maintains its own independent window.
 *   - A user can bypass the limit by spreading requests across instances.
 *
 * For distributed / multi-instance production deployments, replace the store
 * with Upstash Redis + @upstash/ratelimit. The checkRateLimit signature and
 * throw contract remain unchanged — it is a one-file swap.
 *   @see https://github.com/upstash/ratelimit
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTITY PRIORITY
 * ─────────────────────────────────────────────────────────────────────────────
 * The limiter supports two identity modes, chosen by the caller:
 *
 *   1. Authenticated — caller passes a trusted `userId` string obtained from
 *      the server-side session (e.g. supabase.auth.getUser()). The key becomes:
 *        `user:<userId>::<route>`
 *      This gives every user their own independent bucket, regardless of IP.
 *
 *   2. Anonymous — no `userId` is available. The key becomes:
 *        `ip:<ip>::<route>`
 *      The IP is read from `x-forwarded-for` (comma-separated, first entry
 *      taken) or `x-real-ip`. These headers should only be trusted when the
 *      application is behind a trusted reverse proxy or CDN (Vercel, Nginx,
 *      Cloudflare). On direct connections they can be spoofed.
 *
 * NEVER derive the identity from a client-supplied header such as
 * `x-user-id` or a query parameter. Only pass `userId` if it was obtained
 * from a verified server-side session.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RATE LIMITS (by route)
 * ─────────────────────────────────────────────────────────────────────────────
 *   /api/chat        20 req / 60 s    — LLM + vector search per message
 *   /api/upload-pdf   5 req / 10 min  — PDF parse + batch embed + N DB writes
 *   /api/ingest      10 req / 60 s    — text embed + DB write
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RAG-SPECIFIC LIMITS (payload guards)
 * ─────────────────────────────────────────────────────────────────────────────
 * Beyond request-rate limits, the RAG pipeline is protected by payload guards
 * that prevent expensive operations on oversized input. These are enforced
 * in the route handlers using the exported constants below.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * USAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *   import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
 *
 *   // Anonymous (no auth):
 *   checkRateLimit(req, LIMITS.chat);
 *
 *   // Authenticated (userId from server-side session only):
 *   const { data: { user } } = await supabase.auth.getUser();
 *   checkRateLimit(req, LIMITS.chat, user?.id);
 */

import { RateLimitError } from "./errors.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Human-readable route name, used in log messages and as part of the key. */
  name: string;
  /** Maximum number of requests allowed inside the window. */
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

// ─────────────────────────────────────────────────────────────────────────────
// RAG payload guards
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum character length for a user chat message.
 * Long messages cause proportionally expensive embedding + LLM calls.
 * 4 000 chars ≈ ~1 000 tokens — a reasonable upper bound for a single prompt.
 */
export const MAX_CHAT_MESSAGE_CHARS = 4_000;

/**
 * Maximum PDF upload size in bytes (20 MB).
 * Larger files produce hundreds of chunks → many embedding API calls → slow
 * and expensive. Enforced before arrayBuffer() is read.
 */
export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Maximum number of text chunks that will be embedded + stored per request.
 * A 500-char chunk with 100-char overlap over 20 MB of text ≈ ~50 000 chunks.
 * This cap prevents runaway DB + embedding costs on unusually dense PDFs.
 */
export const MAX_CHUNKS_PER_REQUEST = 500;

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-key entry: the ordered timestamp log plus the configured window so the
 * cleanup interval can evict entries correctly without a hard-coded TTL.
 */
interface StoreEntry {
  /** Ordered array of request timestamps (ms since epoch) inside the window. */
  timestamps: number[];
  /**
   * The windowMs of the config that created this entry.
   * Used during cleanup: an entry is expired when its newest timestamp is
   * older than this window.
   */
  windowMs: number;
}

/** Map key: `user:<userId>::<route>` or `ip:<ip>::<route>` */
const store = new Map<string, StoreEntry>();

/**
 * Evict entries whose entire window has expired.
 * Runs every 5 minutes. Uses each entry's own windowMs so no config value
 * is hard-coded here — a future route with a 2-hour window will still be
 * cleaned up correctly.
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    const newestTimestamp = entry.timestamps[entry.timestamps.length - 1] ?? 0;
    if (now - newestTimestamp > entry.windowMs) {
      store.delete(key);
    }
  }
}, 5 * 60_000);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract the best available client IP from request headers.
 *
 * `x-forwarded-for` is a comma-separated list of IPs appended by each proxy
 * the request passed through. We take the first entry, which is the original
 * client IP (assuming the proxy chain is trustworthy).
 *
 * ⚠ TRUST WARNING: These headers can be spoofed on direct connections.
 * Only trust them when the application is behind a known, controlled reverse
 * proxy or CDN (e.g. Vercel Edge Network, Nginx, Cloudflare). If the
 * application is exposed directly to the internet, prefer a different identity
 * source (e.g. authenticated userId).
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }

  const xri = req.headers.get("x-real-ip");
  if (xri?.trim()) return xri.trim();

  return "unknown";
}

/**
 * Build the rate-limit store key from a trusted identity.
 *
 * @param req    - The incoming request (used for IP fallback).
 * @param config - The route's rate-limit configuration.
 * @param userId - Trusted user ID from a server-side session. When provided,
 *                 user-based limiting is used regardless of IP. When absent,
 *                 falls back to IP-based limiting.
 *
 * Key format:
 *   Authenticated → `user:<userId>::<routeName>`
 *   Anonymous     → `ip:<ip>::<routeName>`
 */
function buildKey(req: Request, config: RateLimitConfig, userId?: string): string {
  if (userId) {
    return `user:${userId}::${config.name}`;
  }
  const ip = getClientIp(req);
  return `ip:${ip}::${config.name}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforces the sliding-window rate limit for the given request.
 *
 * This function is SYNCHRONOUS. Call it at the very top of a route handler,
 * before any async work, so that over-limit requests are rejected cheaply.
 *
 * @param req    - The incoming Next.js/Web API request.
 * @param config - The route's rate-limit config (use a value from `LIMITS`).
 * @param userId - Optional trusted user ID from a verified server-side session.
 *                 MUST NOT come from a client-supplied header or query param.
 *                 When omitted, falls back to IP-based identity.
 *
 * @throws {RateLimitError} when the limit is exceeded, with `retryAfterSeconds`
 *   set to the number of seconds until the oldest in-window request expires.
 *
 * @example — anonymous (no auth yet):
 *   checkRateLimit(req, LIMITS.chat);
 *
 * @example — authenticated (once Supabase Auth is integrated):
 *   const { data: { user } } = await supabase.auth.getUser(accessToken);
 *   checkRateLimit(req, LIMITS.chat, user?.id ?? undefined);
 */
export function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  userId?: string
): void {
  const key = buildKey(req, config, userId);
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Retrieve the existing entry or create a fresh one.
  const entry = store.get(key) ?? { timestamps: [], windowMs: config.windowMs };

  // Slide the window: drop timestamps older than the cutoff.
  const timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (timestamps.length >= config.maxRequests) {
    // Oldest timestamp is [0] because the array is chronologically ordered.
    const oldest = timestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    const identity = userId ? `userId=${userId}` : `ip=${getClientIp(req)}`;
    throw new RateLimitError(
      `Rate limit exceeded for ${identity} on ${config.name} ` +
        `(${timestamps.length}/${config.maxRequests} req in ${config.windowMs / 1000}s window). ` +
        `Retry-After: ${retryAfterSeconds}s`,
      retryAfterSeconds
    );
  }

  // Request is allowed — record it and persist the updated entry.
  timestamps.push(now);
  store.set(key, { timestamps, windowMs: config.windowMs });
}
