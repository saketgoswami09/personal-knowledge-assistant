/**
 * lib/__tests__/rate-limit.test.ts
 *
 * Unit tests for lib/rate-limit.ts
 *
 * Uses the Node.js built-in test runner (node:test + assert), which requires
 * no extra dependencies. Run with:
 *   node --experimental-strip-types --test lib/__tests__/rate-limit.test.ts
 *
 * Or add "test": "node --experimental-strip-types --test lib/__tests__/**" to
 * package.json scripts.
 */

import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal Request object with optional headers. */
function makeReq(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/chat", { headers });
}

/** Build a Request that looks like it came from a specific IP via a proxy. */
function makeIpReq(ip: string): Request {
  return makeReq({ "x-forwarded-for": ip });
}

/**
 * Build a RateLimitConfig with a very short window so tests don't need to
 * wait a real minute. Defaults: 3 req / 100 ms window, route "/test".
 */
function makeConfig(overrides: Partial<{ name: string; maxRequests: number; windowMs: number }> = {}) {
  return {
    name: overrides.name ?? "/test",
    maxRequests: overrides.maxRequests ?? 3,
    windowMs: overrides.windowMs ?? 100,
  };
}

// ── Import under test ─────────────────────────────────────────────────────────
//
// We import after the helpers so TypeScript is happy with the top-level imports.

import {
  checkRateLimit,
  getClientIp,
  LIMITS,
  MAX_CHAT_MESSAGE_CHARS,
  MAX_PDF_SIZE_BYTES,
  MAX_CHUNKS_PER_REQUEST,
} from "../rate-limit.ts";
import { RateLimitError } from "../errors.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("getClientIp", () => {
  it("reads the first IP from x-forwarded-for (comma-separated)", () => {
    const req = makeReq({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    assert.equal(getClientIp(req), "1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const req = makeReq({ "x-real-ip": "10.0.0.1" });
    assert.equal(getClientIp(req), "10.0.0.1");
  });

  it("returns 'unknown' when no IP header is present", () => {
    const req = makeReq();
    assert.equal(getClientIp(req), "unknown");
  });
});

describe("checkRateLimit — anonymous (IP-based)", () => {
  const cfg = makeConfig();

  it("1. allows requests under the limit", () => {
    const req = makeIpReq("100.0.0.1");
    // Should not throw for the first maxRequests calls.
    for (let i = 0; i < cfg.maxRequests; i++) {
      assert.doesNotThrow(() => checkRateLimit(req, cfg));
    }
  });

  it("2. throws RateLimitError (429) after exceeding the limit", () => {
    const req = makeIpReq("100.0.0.2");
    for (let i = 0; i < cfg.maxRequests; i++) {
      checkRateLimit(req, cfg);
    }
    assert.throws(
      () => checkRateLimit(req, cfg),
      (err: unknown) => {
        assert.ok(err instanceof RateLimitError, "should be RateLimitError");
        assert.equal((err as RateLimitError).statusCode, 429);
        assert.equal((err as RateLimitError).code, "RATE_LIMIT_EXCEEDED");
        return true;
      }
    );
  });

  it("5. two different anonymous IPs have separate buckets", () => {
    const cfg2 = makeConfig({ name: "/test-separate-ip" });
    const reqA = makeIpReq("200.0.0.1");
    const reqB = makeIpReq("200.0.0.2");

    // Exhaust IP A.
    for (let i = 0; i < cfg2.maxRequests; i++) checkRateLimit(reqA, cfg2);
    assert.throws(() => checkRateLimit(reqA, cfg2));

    // IP B should still be allowed.
    assert.doesNotThrow(() => checkRateLimit(reqB, cfg2));
  });
});

describe("checkRateLimit — authenticated (userId-based)", () => {
  it("3. authenticated user is limited by userId, not IP", () => {
    // Both requests come from the same IP but different userIds.
    const sameIpReq = makeIpReq("50.0.0.1");
    const cfg = makeConfig({ name: "/test-userid", maxRequests: 2 });

    // Exhaust userA's bucket.
    checkRateLimit(sameIpReq, cfg, "userA");
    checkRateLimit(sameIpReq, cfg, "userA");
    assert.throws(() => checkRateLimit(sameIpReq, cfg, "userA"));

    // userB shares the same IP but should still be allowed.
    assert.doesNotThrow(() => checkRateLimit(sameIpReq, cfg, "userB"),
      "userB on the same IP should not be affected by userA's limit");
  });

  it("4. two different authenticated users on the same IP have separate limits", () => {
    const req = makeIpReq("60.0.0.1");
    const cfg = makeConfig({ name: "/test-two-users", maxRequests: 1 });

    checkRateLimit(req, cfg, "alice");
    assert.throws(() => checkRateLimit(req, cfg, "alice"));

    // Bob is on the same IP but has a fresh bucket.
    assert.doesNotThrow(() => checkRateLimit(req, cfg, "bob"));
    assert.throws(() => checkRateLimit(req, cfg, "bob"));
  });
});

describe("checkRateLimit — route isolation", () => {
  it("6. different routes have separate buckets for the same identity", () => {
    const req = makeIpReq("70.0.0.1");
    const cfgA = makeConfig({ name: "/route-a", maxRequests: 1 });
    const cfgB = makeConfig({ name: "/route-b", maxRequests: 1 });

    // Exhaust route-a.
    checkRateLimit(req, cfgA);
    assert.throws(() => checkRateLimit(req, cfgA));

    // route-b is unaffected.
    assert.doesNotThrow(() => checkRateLimit(req, cfgB));
  });
});

describe("checkRateLimit — window expiry", () => {
  it("7. timestamps older than windowMs are evicted (window slides)", async () => {
    const req = makeIpReq("80.0.0.1");
    // Use a 50 ms window so we can test expiry without long sleeps.
    const cfg = makeConfig({ name: "/test-expiry", maxRequests: 2, windowMs: 50 });

    checkRateLimit(req, cfg);
    checkRateLimit(req, cfg);
    // Limit exhausted.
    assert.throws(() => checkRateLimit(req, cfg));

    // Wait for the window to expire.
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Old timestamps should have slid out — new requests should be allowed.
    assert.doesNotThrow(() => checkRateLimit(req, cfg),
      "requests should be allowed again after the window expires");
  });
});

describe("checkRateLimit — Retry-After", () => {
  it("8. retryAfterSeconds is positive and <= windowMs/1000", () => {
    const req = makeIpReq("90.0.0.1");
    const cfg = makeConfig({ name: "/test-retry-after", maxRequests: 1, windowMs: 5000 });

    checkRateLimit(req, cfg);
    try {
      checkRateLimit(req, cfg);
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err instanceof RateLimitError);
      assert.ok(err.retryAfterSeconds > 0, "retryAfterSeconds must be > 0");
      assert.ok(
        err.retryAfterSeconds <= cfg.windowMs / 1000,
        "retryAfterSeconds must not exceed the window"
      );
    }
  });
});

describe("checkRateLimit — synchronous contract", () => {
  it("9. checkRateLimit returns void synchronously (no Promise)", () => {
    const req = makeIpReq("110.0.0.1");
    const cfg = makeConfig({ name: "/test-sync" });
    const result = checkRateLimit(req, cfg);
    // If the function returns a Promise, the test would need to await it.
    assert.equal(result, undefined, "checkRateLimit must be synchronous (return void)");
  });
});

describe("checkRateLimit — identity trust", () => {
  it("10. client-supplied userId header is NOT used by the limiter", () => {
    // This test verifies that a spoofed header can never elevate privileges.
    // The limiter only uses the userId passed explicitly by the route handler
    // from its server-side session — it never reads a header itself.
    const spoofedReq = makeReq({
      "x-forwarded-for": "1.2.3.4",
      // A malicious client tries to supply their own userId header.
      "x-user-id": "admin-or-other-user",
    });

    const cfg = makeConfig({ name: "/test-trust", maxRequests: 1 });

    // When the route passes NO userId to checkRateLimit, the limiter uses IP,
    // not the spoofed header. The spoofed header must have zero effect.
    checkRateLimit(spoofedReq, cfg); // allowed — IP "1.2.3.4" first request

    // Exhaust the IP bucket.
    assert.throws(() => checkRateLimit(spoofedReq, cfg));

    // Verify: if the "x-user-id" header were naively trusted, a second IP
    // could bypass by spoofing a different user. Here we confirm the IP limit
    // still applies regardless of what the x-user-id header says.
    const anotherReqSameHeader = makeReq({
      "x-forwarded-for": "1.2.3.4", // same IP
      "x-user-id": "different-spoofed-id",
    });
    assert.throws(
      () => checkRateLimit(anotherReqSameHeader, cfg),
      "same IP should still be limited regardless of any client-supplied user header"
    );
  });
});

describe("LIMITS — configuration sanity", () => {
  it("LIMITS.chat has expected shape", () => {
    assert.ok(LIMITS.chat.maxRequests > 0);
    assert.ok(LIMITS.chat.windowMs > 0);
    assert.equal(typeof LIMITS.chat.name, "string");
  });

  it("LIMITS.uploadPdf has a longer window than LIMITS.chat", () => {
    assert.ok(LIMITS.uploadPdf.windowMs > LIMITS.chat.windowMs,
      "upload-pdf window should be longer than chat window");
  });
});

describe("RAG payload guard constants", () => {
  it("MAX_CHAT_MESSAGE_CHARS is a positive number", () => {
    assert.ok(typeof MAX_CHAT_MESSAGE_CHARS === "number" && MAX_CHAT_MESSAGE_CHARS > 0);
  });

  it("MAX_PDF_SIZE_BYTES is a positive number", () => {
    assert.ok(typeof MAX_PDF_SIZE_BYTES === "number" && MAX_PDF_SIZE_BYTES > 0);
  });

  it("MAX_CHUNKS_PER_REQUEST is a positive number", () => {
    assert.ok(typeof MAX_CHUNKS_PER_REQUEST === "number" && MAX_CHUNKS_PER_REQUEST > 0);
  });
});
