/**
 * lib/chunker.ts
 *
 * Step 1 of the RAG pipeline: chunking.
 *
 * A "chunk" is a small piece of text that will later be:
 *   1. Embedded into a vector (Step 2)
 *   2. Stored in a vector DB (Step 3)
 *   3. Retrieved when relevant to a user query (Step 4)
 *   4. Injected into the LLM prompt as context (Step 5)
 *
 * Chunking strategy matters a lot — too large and retrieval is noisy,
 * too small and you lose context. See the README/artifact for trade-offs.
 */

export interface Chunk {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

// ---------------------------------------------------------------------------
// Strategy 1: Fixed Size (no overlap)
// ---------------------------------------------------------------------------
// The simplest approach. Split text every N characters.
// PRO: Fast, predictable, zero config.
// CON: Cuts sentences mid-way, losing meaning at boundaries.
// WHEN TO USE: Quick prototypes, or when text is uniform (e.g., logs).
// ---------------------------------------------------------------------------
export function chunkByFixedSize(text: string, chunkSize = 500): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  let index = 0;

  while (i < text.length) {
    const slice = text.slice(i, i + chunkSize);
    const trimmed = slice.trim();

    if (trimmed.length > 0) {
      // How many whitespace chars did trimStart() remove from the left?
      // That delta shifts charStart forward by the same amount in the original string.
      const leadingWS = slice.length - slice.trimStart().length;
      const charStart = i + leadingWS;
      // charEnd is simply charStart + length of the trimmed text.
      // Invariant: text.slice(charStart, charEnd) === trimmed  ✓
      const charEnd = charStart + trimmed.length;
      chunks.push({ index: index++, text: trimmed, charStart, charEnd });
    }

    i += chunkSize;
  }

  // Empty chunks are already excluded above (trimmed.length > 0 guard).
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy 2: Fixed Size WITH Overlap
// ---------------------------------------------------------------------------
// Same as Strategy 1, but consecutive chunks share `overlap` characters.
// PRO: Context at chunk boundaries is preserved — a sentence split across
//      two chunks will appear (partially) in both, so retrieval is more
//      likely to catch it.
// CON: Stores more data; overlap size needs careful tuning.
// WHEN TO USE: Most RAG systems. A 10-20% overlap is a good default.
//
// Example with chunkSize=100, overlap=20:
//   Chunk 0: chars   0 → 100
//   Chunk 1: chars  80 → 180  ← 20-char overlap with chunk 0
//   Chunk 2: chars 160 → 260  ← 20-char overlap with chunk 1
// ---------------------------------------------------------------------------
export function chunkByFixedSizeWithOverlap(
  text: string,
  chunkSize = 500,
  overlap = 100
): Chunk[] {
  if (overlap >= chunkSize) {
    throw new Error("overlap must be smaller than chunkSize");
  }

  const chunks: Chunk[] = [];
  const step = chunkSize - overlap;
  let i = 0;
  let index = 0;

  while (i < text.length) {
    const slice = text.slice(i, i + chunkSize);
    const trimmed = slice.trim();

    if (trimmed.length > 0) {
      // Same fix as chunkByFixedSize:
      // leadingWS = chars removed from the left by trim → shifts charStart right.
      const leadingWS = slice.length - slice.trimStart().length;
      const charStart = i + leadingWS;
      // Invariant: text.slice(charStart, charEnd) === trimmed  ✓
      const charEnd = charStart + trimmed.length;
      chunks.push({ index: index++, text: trimmed, charStart, charEnd });
    }

    i += step;
  }

  // Empty chunks are already excluded above (trimmed.length > 0 guard).
  return chunks;
}

// ---------------------------------------------------------------------------
// Strategy 3: Paragraph-based (semantic-light)
// ---------------------------------------------------------------------------
// Split on blank lines (double newline). Paragraphs are natural semantic
// units — the author already decided where one idea ends and another begins.
// PRO: Preserves natural context; no arbitrary cuts mid-sentence.
// CON: Paragraph sizes vary wildly; one para could be 20 words or 2000.
//      Long paragraphs may exceed your embedding model's token limit.
// WHEN TO USE: Articles, blog posts, documentation, book chapters.
// ---------------------------------------------------------------------------
export function chunkByParagraph(text: string): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/) // split on one or more blank lines
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  let charCursor = 0;
  return paragraphs.map((p, index) => {
    const charStart = text.indexOf(p, charCursor);
    const charEnd = charStart + p.length;
    charCursor = charEnd;
    return { index, text: p, charStart, charEnd };
  });
}

// ---------------------------------------------------------------------------
// Strategy 4: Sentence-based (semantic-light)
// ---------------------------------------------------------------------------
// Split on sentence boundaries (., !, ?). Groups sentences into chunks
// until the chunk reaches ~maxChunkSize characters, then starts a new one.
// PRO: Never cuts mid-sentence. Good balance of size + meaning.
// CON: Regex sentence detection is imperfect (e.g., "Dr. Smith" gets split).
//      Use an NLP library (compromise, nlp.js) for production.
// WHEN TO USE: Dense prose, academic papers, support docs.
// ---------------------------------------------------------------------------
export function chunkBySentence(
  text: string,
  maxChunkSize = 500
): Chunk[] {
  // Simple sentence splitter — splits on '. ', '! ', '? '
  // Keeps the punctuation attached to the sentence that ends with it.
  const sentences = text.match(/[^.!?]+[.!?]+["']?\s*/g) ?? [text];

  const chunks: Chunk[] = [];
  let current = "";
  let charStart = 0;
  let index = 0;
  let cursor = 0;

  for (const sentence of sentences) {
    if (current.length + sentence.length > maxChunkSize && current.length > 0) {
      chunks.push({
        index: index++,
        text: current.trim(),
        charStart,
        charEnd: charStart + current.length,
      });
      charStart = cursor;
      current = "";
    }
    current += sentence;
    cursor += sentence.length;
  }

  // Don't forget the last chunk
  if (current.trim().length > 0) {
    chunks.push({
      index: index++,
      text: current.trim(),
      charStart,
      charEnd: charStart + current.length,
    });
  }

  return chunks;
}
