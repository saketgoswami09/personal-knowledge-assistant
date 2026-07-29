/**
 * app/api/chunk/route.ts
 *
 * Test endpoint for the chunker. Not part of the final RAG pipeline —
 * just a scratchpad to visualise chunking output during development.
 *
 * POST /api/chunk
 * Body: { text: string, strategy: "fixed" | "overlap" | "paragraph" | "sentence" }
 *
 * curl example:
 *   curl -X POST http://localhost:3000/api/chunk \
 *     -H "Content-Type: application/json" \
 *     -d '{"text":"Your text here...","strategy":"overlap"}'
 */

import {
  chunkByFixedSize,
  chunkByFixedSizeWithOverlap,
  chunkByParagraph,
  chunkBySentence,
} from "@/lib/chunker";
import { NextResponse } from "next/server";

// Sample text used when no `text` field is provided in the request body.
// A real excerpt from a Wikipedia article — good for testing chunking.
const SAMPLE_TEXT = `
Machine learning (ML) is a field of study in artificial intelligence concerned 
with the development and study of statistical algorithms that can learn from 
data and generalize to unseen data, and thus perform tasks without explicit 
instructions.

Recently, artificial neural networks have been able to surpass many previous 
approaches in performance. ML finds application in many fields, including 
natural language processing, computer vision, speech recognition, email 
filtering, agriculture, and medicine.

The mathematical foundations of ML are provided by mathematical optimization 
methods. Data mining is a related field of study, focusing on exploratory 
data analysis (EDA) via unsupervised learning.

From a theoretical viewpoint, probably approximately correct learning provides 
a framework for describing machine learning. Generative adversarial networks, 
diffusion models, recurrent neural networks, and transformer architectures 
are among the models used in modern ML.
`.trim();

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text: string = body.text ?? SAMPLE_TEXT;
  const strategy: string = body.strategy ?? "overlap";

  let chunks;
  let strategyInfo: Record<string, unknown>;

  switch (strategy) {
    case "fixed":
      chunks = chunkByFixedSize(text, body.chunkSize ?? 200);
      strategyInfo = {
        name: "Fixed Size (no overlap)",
        chunkSize: body.chunkSize ?? 200,
        warning: "May cut sentences mid-way",
      };
      break;

    case "overlap":
      chunks = chunkByFixedSizeWithOverlap(
        text,
        body.chunkSize ?? 200,
        body.overlap ?? 40
      );
      strategyInfo = {
        name: "Fixed Size with Overlap",
        chunkSize: body.chunkSize ?? 200,
        overlap: body.overlap ?? 40,
        tip: "Overlap = 20% of chunkSize is a safe default",
      };
      break;

    case "paragraph":
      chunks = chunkByParagraph(text);
      strategyInfo = {
        name: "Paragraph-based",
        note: "Splits on blank lines — respects author's natural breaks",
      };
      break;

    case "sentence":
      chunks = chunkBySentence(text, body.maxChunkSize ?? 300);
      strategyInfo = {
        name: "Sentence-based",
        maxChunkSize: body.maxChunkSize ?? 300,
        note: "Never cuts mid-sentence; groups sentences to fill maxChunkSize",
      };
      break;

    default:
      return NextResponse.json({ error: `Unknown strategy: ${strategy}` }, { status: 400 });
  }

  return NextResponse.json({
    strategy: strategyInfo,
    totalChunks: chunks.length,
    averageChunkLength: Math.round(
      chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length
    ),
    chunks,
  });
}
