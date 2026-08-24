/**
 * app/api/embed/route.ts
 *
 * Development scratchpad for Step 2: Embeddings.
 *
 * Demonstrates the full raw mechanism:
 *   1. Embed a hardcoded corpus of 5 chunks (one batch API call)
 *   2. Embed a query string (one API call)
 *   3. Compute cosine similarity by hand for every corpus chunk
 *   4. Return ranked results — most semantically similar chunk first
 *
 * No vector DB. No abstraction. Just the math.
 *
 * POST /api/embed
 * Body: { query?: string }   (query defaults to a preset string if omitted)
 *
 * curl example:
 *   curl -X POST http://localhost:3000/api/embed \
 *     -H "Content-Type: application/json" \
 *     -d '{"query":"What are neural networks used for?"}'
 */

import {
  embed,
  embedBatch,
  rankBySimilarity,
  dotProduct,
  magnitude,
  EmbeddedChunk,
} from "@/lib/embedder";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Fixed corpus — 5 chunks with clearly distinct topics.
// In the real RAG pipeline these will come from your uploaded documents.
// ---------------------------------------------------------------------------
const CORPUS_TEXTS = [
  // Topic A — machine learning
  "Machine learning is a subset of AI where models learn patterns from data without being explicitly programmed.",
  "Neural networks are computing systems loosely inspired by biological brains, used widely in image and speech recognition.",

  // Topic B — cooking
  "Pasta carbonara is made with eggs, Pecorino Romano, guanciale, and black pepper — no cream needed.",
  "The Maillard reaction is why searing meat at high heat produces a rich, brown crust with complex flavour.",

  // Topic C — space
  "The James Webb Space Telescope observes the universe in infrared, revealing galaxies formed just 300 million years after the Big Bang.",
];

const DEFAULT_QUERY = "How do computers learn from examples?";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query: string = body.query ?? DEFAULT_QUERY;

  // ── Step 1: Embed all corpus chunks in a single API call ──────────────────
  const corpusEmbeddings = await embedBatch(CORPUS_TEXTS);

  const corpus: EmbeddedChunk[] = CORPUS_TEXTS.map((text, i) => ({
    text,
    embedding: corpusEmbeddings[i],
  }));

  // ── Step 2: Embed the query ───────────────────────────────────────────────
  const queryEmbedding = await embed(query);

  // ── Step 3: Rank by cosine similarity (hand-computed, no lib) ─────────────
  const ranked = rankBySimilarity(queryEmbedding, corpus);

  // ── Step 4: Return everything — including the raw numbers so you can inspect
  return NextResponse.json({
    query,
    queryEmbeddingDimensions: queryEmbedding.length,
    queryEmbeddingPreview: queryEmbedding.slice(0, 6), // first 6 of 384

    // Show the cosine similarity formula broken down for the top result
    topResultMath: (() => {
      const top = corpus.find((c) => c.text === ranked[0].text)!;
      const dp = dotProduct(queryEmbedding, top.embedding);
      const magQ = magnitude(queryEmbedding);
      const magT = magnitude(top.embedding);
      return {
        formula: "cosineSim = dotProduct(Q, T) / (|Q| × |T|)",
        dotProduct: +dp.toFixed(6),
        magnitudeQuery: +magQ.toFixed(6),
        magnitudeTop: +magT.toFixed(6),
        result: +(dp / (magQ * magT)).toFixed(6),
        note:
          "Because all-MiniLM-L6-v2 outputs normalised vectors, |Q| ≈ |T| ≈ 1, so cosineSim ≈ dotProduct",
      };
    })(),

    results: ranked.map((r) => ({
      rank: r.rank,
      score: +r.score.toFixed(4),
      text: r.text,
    })),
  });
}
