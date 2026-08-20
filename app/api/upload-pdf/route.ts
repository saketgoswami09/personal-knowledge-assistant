/**
 * app/api/upload-pdf/route.ts
 *
 * HOW MULTIPART FILE UPLOADS WORK IN A NEXT.JS ROUTE HANDLER
 * ────────────────────────────────────────────────────────────
 * When a browser submits a <form encType="multipart/form-data"> (or a
 * `fetch` call with a `FormData` body), the request body is NOT JSON.
 * Instead, the browser encodes each field/file as a separate "part",
 * separated by a random "boundary" string. The Content-Type header looks
 * like:  `multipart/form-data; boundary=----WebKitFormBoundary7MA4...`
 *
 * In Next.js App Router route handlers you read this with:
 *   const formData = await req.formData()     ← web standard FormData
 *   const file     = formData.get("file")     ← returns a File (Blob subclass)
 *
 * WHY unpdf INSTEAD OF pdf-parse
 * ────────────────────────────────
 * pdf-parse v2 uses pdfjs-dist internally, which tries to spawn a web worker
 * (pdf.worker.mjs). Turbopack bundles route handlers as Node.js modules, not
 * browser bundles — so the worker file is never emitted and the require() fails
 * at runtime with "Cannot find module pdf.worker.mjs".
 *
 * unpdf solves this by shipping pdfjs-dist in a worker-free "fake worker"
 * configuration that runs entirely in the main thread. It's designed
 * specifically for server/edge environments (Next.js, Nuxt, Cloudflare Workers).
 * API: extractText(buffer) → Promise<{ totalPages, text }>
 *
 * PIPELINE (unchanged from /api/ingest):
 *   PDF bytes → unpdf.extractText → raw text string
 *   → chunkByFixedSizeWithOverlap (lib/chunker.ts)
 *   → embedBatch (lib/embedder.ts)
 *   → insertChunk × N (lib/supabase.ts)
 */

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { chunkByFixedSizeWithOverlap } from "@/lib/chunker";
import { embedBatch } from "@/lib/embedder";
import { insertChunk } from "@/lib/supabase";
import { ValidationError } from "@/lib/errors";
import { handleApiError } from "@/lib/handle-api-error";
import { checkRateLimit, LIMITS, MAX_PDF_SIZE_BYTES, MAX_CHUNKS_PER_REQUEST } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    // ── Rate limit — checked first, before expensive PDF I/O ────────────────
    checkRateLimit(req, LIMITS.uploadPdf);

    // ── 1. Parse the multipart body ──────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new ValidationError(
        "upload-pdf: no file in multipart body",
        "No file provided. Send the PDF as form field 'file'."
      );
    }

    if (file.type !== "application/pdf") {
      throw new ValidationError(
        `upload-pdf: wrong MIME type '${file.type}'`,
        `Expected a PDF file, received: ${file.type}`
      );
    }

    // ── RAG payload guard: file size ──────────────────────────────────────
    // Checked before arrayBuffer() to avoid reading a huge file into memory.
    if (file.size > MAX_PDF_SIZE_BYTES) {
      throw new ValidationError(
        `upload-pdf: file too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max ${MAX_PDF_SIZE_BYTES / 1024 / 1024} MB)`,
        `PDF too large. Maximum allowed size is ${MAX_PDF_SIZE_BYTES / 1024 / 1024} MB.`
      );
    }

    console.log(`[PDF Upload] Received: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // ── 2. Extract text from the PDF ─────────────────────────────────────────
    // unpdf uses pdfjs-dist in fake-worker (synchronous) mode — no worker file
    // needed, no bundler issues. We pass a Uint8Array (standard typed array).
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // getDocumentProxy loads the PDF into pdfjs-dist in-process.
    // extractText walks each page and concatenates all text content.
    const pdf = await getDocumentProxy(buffer);
    const { totalPages, text: rawText } = await extractText(pdf, { mergePages: true });

    const trimmed = (rawText as string).trim();

    if (!trimmed) {
      throw new ValidationError(
        `upload-pdf: extracted empty text from '${file.name}'`,
        "Could not extract any text from this PDF. It may be image-only or password-protected."
      );
    }

    console.log(`[PDF Upload] Extracted ${trimmed.length} characters from ${totalPages} pages.`);

    // ── 3. Chunk the text ────────────────────────────────────────────────────
    // Reusing the exact same chunker as /api/ingest — no changes needed there.
    const chunks = chunkByFixedSizeWithOverlap(trimmed, 500, 100);
    console.log(`[PDF Upload] Created ${chunks.length} chunks.`);

    // ── RAG payload guard: chunk count ─────────────────────────────────────
    // Prevents runaway embedding API costs on unusually dense PDFs.
    if (chunks.length > MAX_CHUNKS_PER_REQUEST) {
      throw new ValidationError(
        `upload-pdf: too many chunks: ${chunks.length} (max ${MAX_CHUNKS_PER_REQUEST})`,
        `Document is too large to process (${chunks.length} sections). Please split it into smaller files.`
      );
    }

    // ── 4. Embed all chunks in one batch ─────────────────────────────────────
    const chunkStrings = chunks.map((c) => c.text);
    console.log(`[PDF Upload] Embedding ${chunks.length} chunks...`);
    const embeddings = await embedBatch(chunkStrings);

    // ── 5. Save each chunk + embedding to Supabase ───────────────────────────
    console.log(`[PDF Upload] Saving to Supabase...`);
    const insertedRecords = [];
    for (let i = 0; i < chunks.length; i++) {
      const record = await insertChunk(chunks[i].text, embeddings[i]);
      insertedRecords.push(record);
    }

    console.log(`[PDF Upload] Done! Saved ${insertedRecords.length} chunks.`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      pages: totalPages,
      characters: trimmed.length,
      chunksCreated: chunks.length,
      message: `Successfully processed "${file.name}": ${chunks.length} chunks saved to your knowledge base.`,
    });
  } catch (err) {
    console.error("[PDF Upload] Error:", err);
    return handleApiError(err, "[POST /api/upload-pdf]");
  }
}
