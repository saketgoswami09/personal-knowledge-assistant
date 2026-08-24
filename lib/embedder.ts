/**
 * lib/embedder.ts
 *
 * Step 2 of the RAG pipeline: embeddings.
 *
 * An embedding converts text into a dense vector of numbers (384 numbers for
 * all-MiniLM-L6-v2). Texts with similar meaning land close together in that
 * 384-dimensional space — "cosine similarity" measures how close.
 *
 * This file contains:
 *   1. embed()           — call HuggingFace, get back a vector for one text
 *   2. embedBatch()      — embed many texts in one API call (cheaper/faster)
 *   3. dotProduct()      — raw dot product (A · B = Σ aᵢbᵢ)
 *   4. magnitude()       — vector length  (|v| = √(Σ vᵢ²))
 *   5. cosineSimilarity()— the angle-based similarity score ∈ [-1, 1]
 *   6. rankBysimilarity() — compare a query embedding to a corpus, return sorted
 *
 * NOTE: all-MiniLM-L6-v2 outputs L2-normalised vectors (magnitude ≈ 1),
 * so cosine similarity == dot product for this model. We implement the full
 * formula anyway so the code generalises to any model.
 */

import { HfInference } from "@huggingface/inference";
import { EmbeddingError, ValidationError } from "./errors";

// ---------------------------------------------------------------------------
// Client (singleton — reuse across requests)
// ---------------------------------------------------------------------------
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/** The model we'll use for embeddings throughout this project.
 *  384-dimensional output, fast, good quality, free on HF Inference API. */
export const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

// ---------------------------------------------------------------------------
// 1. Embed a single string → number[]
// ---------------------------------------------------------------------------
export async function embed(text: string): Promise<number[]> {
  try {
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: text,
    });
    // HF returns number[] for a single string input
    return result as number[];
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new EmbeddingError(
      `embed() failed — HuggingFace error: ${errorMsg}`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Embed multiple strings → number[][] (one vector per string)
//    One API round-trip instead of N — always prefer this for batches.
// ---------------------------------------------------------------------------
export async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: texts,
    });
    // HF returns number[][] for an array input
    return result as number[][];
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new EmbeddingError(
      `embedBatch() failed — HuggingFace error: ${errorMsg}`
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Dot product:  A · B = Σ(aᵢ × bᵢ)
//
//    For two 3D vectors:
//      [1, 2, 3] · [4, 5, 6] = (1×4) + (2×5) + (3×6) = 4 + 10 + 18 = 32
//
//    Geometrically: large when both vectors point in the same direction AND
//    are large. That "AND large" part is why we divide by magnitudes below —
//    we only want to measure direction, not length.
// ---------------------------------------------------------------------------
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new ValidationError(
      `dotProduct: vector length mismatch — ${a.length} vs ${b.length}`,
       "Internal vector dimension mismatch."
    );
  }
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

// ---------------------------------------------------------------------------
// 4. Magnitude (Euclidean length):  |v| = √(Σ vᵢ²)
//
//    Think of it as Pythagoras in N dimensions.
//    [3, 4] → √(9 + 16) = √25 = 5
// ---------------------------------------------------------------------------
export function magnitude(v: number[]): number {
     return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
}

// ---------------------------------------------------------------------------
// 5. Cosine similarity:  cos(θ) = (A · B) / (|A| × |B|)
//
//    Dividing by the magnitudes cancels out vector length — we're left with
//    a pure measure of the ANGLE between the two vectors:
//      1.0  → same direction (identical meaning)
//      0.0  → perpendicular (unrelated)
//     -1.0  → opposite directions (antonyms, rare with sentence models)
//
//    For all-MiniLM-L6-v2 (normalised output), |A| ≈ |B| ≈ 1, so
//    cosineSimilarity(A, B) ≈ dotProduct(A, B). But we keep the division for
//    correctness with any model.
// ---------------------------------------------------------------------------
export function cosineSimilarity(a: number[], b: number[]): number {
   const denom = magnitude(a) * magnitude(b);
    if (denom === 0) return 0; 
  return dotProduct(a, b) / denom;
}

// ---------------------------------------------------------------------------
// 6. rankBySimiliarity
//
//    Given a query embedding and an array of { text, embedding } objects,
//    return them sorted by cosine similarity (most similar first), with the
//    score attached.
// ---------------------------------------------------------------------------
export interface EmbeddedChunk {
  text: string;
  embedding: number[];
}

export interface RankedResult {
  text: string;
  score: number; // cosine similarity, higher = more relevant
  rank: number;  // 1-based rank
}

export function rankBySimilarity(
  queryEmbedding: number[],
  corpus: EmbeddedChunk[]
): RankedResult[] {
  return corpus
    .map((chunk) => ({
      text: chunk.text,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score) // descending — best first
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
