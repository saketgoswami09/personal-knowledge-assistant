/**
 * lib/handle-api-error.ts
 *
 * Single catch-block helper for all API route handlers.
 *
 * WHAT IT DOES
 * ────────────
 * 1. If the thrown value is one of our typed AppError subclasses:
 *      - Log the INTERNAL message (full detail) to the server console
 *      - Return the SAFE clientMessage + code + statusCode to the client
 *
 * 2. If the thrown value is anything else (plain Error, third-party exception,
 *    string throw, undefined, etc.):
 *      - Log the full unknown error to the server console
 *      - Return a generic 500 with a fixed, detail-free message
 *      → This is the "information firewall" — internals never leak
 *
 * RESPONSE SHAPE
 * ──────────────
 * All error responses share one consistent JSON envelope:
 *
 *   {
 *     "error": {
 *       "code":    "EMBEDDING_ERROR",          ← machine-readable, switchable
 *       "message": "The embedding service…"    ← human-readable, safe
 *     }
 *   }
 *
 * This means clients (RTK Query, fetch, tests) only need to handle ONE
 * error shape, not a different format per route.
 *
 * USAGE
 * ──────
 *   import { handleApiError } from "@/lib/handle-api-error";
 *
 *   export async function POST(req: Request) {
 *     try {
 *       // ... route logic
 *     } catch (err) {
 *       return handleApiError(err, "[MyRoute]");
 *     }
 *   }
 */

import { NextResponse } from "next/server";
import { AppError, RateLimitError } from "./errors";

/** The consistent JSON shape returned for every API error. */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Maps a thrown value to a NextResponse with the correct HTTP status and
 * a safe JSON error body. Call this in the catch block of every route handler.
 *
 * @param err     - The caught value (unknown type — TypeScript is correct here)
 * @param context - Optional prefix for server logs, e.g. "[ChatRoute]"
 */
export function handleApiError(err: unknown, context = "[API]"): NextResponse<ApiErrorResponse> {
  // ── Known, typed AppError ────────────────────────────────────────────────
  if (err instanceof AppError) {
    // Log the full internal detail (includes original cause message, class name)
    console.error(`${context} ${err.name} [${err.code}]:`, err.message);

    // For rate-limit errors, also emit the standard Retry-After header so
    // HTTP clients (browsers, fetch, etc.) can automatically back off.
    const headers: Record<string, string> =
      err instanceof RateLimitError
        ? { "Retry-After": String(err.retryAfterSeconds) }
        : {};

    return NextResponse.json(
      { error: { code: err.code, message: err.clientMessage } },
      { status: err.statusCode, headers }
    );
  }

  // ── Unrecognised error — could be anything ───────────────────────────────
  // Log everything we have, but send nothing internal to the client.
  if (err instanceof Error) {
    console.error(`${context} Unhandled Error [${err.name}]:`, err.message, err.stack);
  } else {
    console.error(`${context} Unknown throw:`, err);
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred. Please try again later.",
      },
    },
    { status: 500 }
  );
}
