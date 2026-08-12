/**
 * lib/errors.ts
 *
 * Custom error hierarchy for the Knowledge Assistant API.
 *
 * DESIGN RATIONALE
 * ────────────────
 * We need two separate "faces" for every server error:
 *
 *   1. Server face  — the full technical detail (original exception message,
 *      DB query, stack trace). Logged on the server, never sent to the client.
 *
 *   2. Client face  — a safe, human-readable message and a machine-readable
 *      `code` string. The HTTP status code lives here too.
 *
 * Standard `Error` gives us none of this structure. We extend it into a base
 * class `AppError` that carries both faces, then create named subclasses for
 * each failure domain so that route handlers can catch them by type.
 *
 * HIERARCHY
 * ─────────
 *
 *   AppError (abstract base — never thrown directly)
 *    ├── ValidationError   400  Client sent bad data (missing field, wrong type)
 *    ├── NotFoundError     404  Requested resource does not exist
 *    ├── RateLimitError    429  Request rate limit exceeded
 *    ├── EmbeddingError    502  Upstream HuggingFace API call failed
 *    ├── RetrievalError    502  pgvector / Supabase RPC search failed
 *    └── DatabaseError     503  Supabase insert / query failed
 *
 * WHY 502 FOR EMBEDDING / RETRIEVAL?
 * ────────────────────────────────────
 * 502 Bad Gateway means "our server got a bad response from an upstream service."
 * Both HuggingFace and Supabase are upstream services — if they fail it is NOT
 * a client error (4xx) and NOT an unclassified crash (500). 502 is semantically
 * correct and tells the caller exactly where the failure boundary is.
 *
 * WHY 503 FOR DATABASE?
 * ──────────────────────
 * A DB write failure (insertChunk, saveMessage) means the service is temporarily
 * unable to persist data — 503 Service Unavailable is the right signal.
 *
 * USAGE PATTERN
 * ─────────────
 *
 *   // In lib code — throw typed errors with internal detail:
 *   throw new EmbeddingError(
 *     "HuggingFace returned status 429",   // ← internal detail, logged server-side
 *     "The embedding service is busy."     // ← shown to client
 *   );
 *
 *   // In route handler catch block:
 *   catch (err) {
 *     return handleApiError(err);
 *   }
 */

// ── Base class ────────────────────────────────────────────────────────────────

export abstract class AppError extends Error {
  /** HTTP status code to send to the client. */
  readonly statusCode: number;

  /**
   * Machine-readable error code (SCREAMING_SNAKE_CASE).
   * Clients can switch on this without parsing the message string.
   */
  readonly code: string;

  /**
   * Safe, human-readable message that CAN be sent to the client.
   * Must never contain DB connection strings, stack traces, or other internals.
   *
   * Contrast with `this.message` (inherited from Error), which holds full
   * internal detail and is ONLY ever written to server logs.
   */
  readonly clientMessage: string;

  constructor(
    /** Internal detail — logged server-side, never forwarded to client. */
    internalMessage: string,
    /** Safe client-facing message. */
    clientMessage: string,
    statusCode: number,
    code: string
  ) {
    super(internalMessage); // sets this.message — internal only
    this.name = new.target.name; // e.g. "EmbeddingError"
    this.clientMessage = clientMessage;
    this.statusCode = statusCode;
    this.code = code;

    // Restore prototype chain — required when extending built-in classes in TS
    // targeting ES5. Safe to keep for ES2017+ too.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Concrete subclasses ───────────────────────────────────────────────────────

/**
 * The request body or parameters are invalid.
 * Throw this in route handlers before any lib calls.
 *
 * Example: missing required field, wrong file type, empty text body.
 */
export class ValidationError extends AppError {
  constructor(internalMessage: string, clientMessage = "Invalid request data.") {
    super(internalMessage, clientMessage, 400, "VALIDATION_ERROR");
  }
}

/**
 * The requested resource does not exist.
 *
 * Example: conversation ID not found in DB.
 */
export class NotFoundError extends AppError {
  constructor(internalMessage: string, clientMessage = "Resource not found.") {
    super(internalMessage, clientMessage, 404, "NOT_FOUND");
  }
}

/**
 * The HuggingFace embedding API call failed.
 * 502 because HuggingFace is an upstream service — their failure ≠ our bug.
 *
 * Throw from: lib/embedder.ts → embed(), embedBatch()
 */
export class EmbeddingError extends AppError {
  constructor(
    internalMessage: string,
    clientMessage = "The embedding service is temporarily unavailable. Please try again."
  ) {
    super(internalMessage, clientMessage, 502, "EMBEDDING_ERROR");
  }
}

/**
 * The pgvector similarity search (Supabase RPC) failed.
 * 502 because Supabase is an upstream service.
 *
 * Throw from: lib/supabase.ts → searchChunks()
 */
export class RetrievalError extends AppError {
  constructor(
    internalMessage: string,
    clientMessage = "Failed to search the knowledge base. Please try again."
  ) {
    super(internalMessage, clientMessage, 502, "RETRIEVAL_ERROR");
  }
}

/**
 * A Supabase database read or write operation failed.
 * 503 because this means the service cannot currently persist or fetch data.
 *
 * Throw from: lib/supabase.ts → insertChunk(), saveMessage(),
 *             createConversation(), getConversations(), getMessages()
 */
export class DatabaseError extends AppError {
  constructor(
    internalMessage: string,
    clientMessage = "A database error occurred. Please try again later."
  ) {
    super(internalMessage, clientMessage, 503, "DATABASE_ERROR");
  }
}

/**
 * The caller has exceeded the configured request rate limit.
 * 429 Too Many Requests — includes the window reset time so the client
 * can back off correctly.
 *
 * Throw from: lib/rate-limit.ts → checkRateLimit()
 */
export class RateLimitError extends AppError {
  /** Seconds the caller should wait before retrying. */
  readonly retryAfterSeconds: number;

  constructor(
    internalMessage: string,
    retryAfterSeconds: number,
    clientMessage = "Too many requests. Please slow down and try again shortly."
  ) {
    super(internalMessage, clientMessage, 429, "RATE_LIMIT_EXCEEDED");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
