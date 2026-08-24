/**
 * app/api/ingest/route.ts
 *
 * Step 1, 2, and 3 combined!
 * This endpoint takes a raw document, chunks it, embeds each chunk,
 * and saves it all to your Supabase vector database.
 *
 * POST /api/ingest
 * Body: { text: string }
 *
 * curl example:
 *   curl -X POST http://localhost:3000/api/ingest \
 *     -H "Content-Type: application/json" \
 *     -d '{"text":"The quick brown fox jumps over the lazy dog. It was a very lazy dog."}'
 */

import { NextResponse } from "next/server";
import { chunkByFixedSizeWithOverlap } from "@/lib/chunker";
import { embedBatch } from "@/lib/embedder";
import { insertChunksBatch } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/handle-api-error";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    // ── Rate limit — checked first, before any I/O ──────────────────────────
    checkRateLimit(req, LIMITS.ingest);

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const text = body.text;

    if (!text || typeof text !== "string") {
      throw new ValidationError(
        "POST /api/ingest: missing or non-string 'text' field",
        "Please provide a non-empty 'text' string in the request body."
      );
    }

    console.log(`[Ingest] Processing document of ${text.length} characters...`);

    // ── Step 1: Chunk the text ──────────────────────────────────────────────
    // Using the recommended overlapping strategy
    const chunks = chunkByFixedSizeWithOverlap(text, 500, 100);
    console.log(`[Ingest] Created ${chunks.length} chunks.`);

    // ── Step 2: Embed all chunks ────────────────────────────────────────────
    // We extract just the strings for the embedder
    const chunkStrings = chunks.map((c) => c.text);
    console.log(`[Ingest] Fetching embeddings from Hugging Face...`);
    const embeddings = await embedBatch(chunkStrings);

    // ── Step 3: Save to Supabase Vector Store in batch ──────────────────────
    console.log(`[Ingest] Saving ${chunks.length} chunks to Supabase in batch for user ${userId}...`);
    const chunksWithEmbeddings = chunks.map((c, i) => ({
      text: c.text,
      embedding: embeddings[i],
    }));
    const insertedRecords = await insertChunksBatch(chunksWithEmbeddings, userId);

    console.log(`[Ingest] Success! Saved ${insertedRecords.length} chunks.`);

    return NextResponse.json({
      success: true,
      message: `Successfully embedded and saved ${chunks.length} chunks.`,
      chunks: insertedRecords.map((r) => ({ id: r.id, textPreview: r.text.slice(0, 50) + "..." })),
    });
  } catch (err) {
    console.error("[Ingest] Error:", err);
    return handleApiError(err, "[POST /api/ingest]");
  }
}
