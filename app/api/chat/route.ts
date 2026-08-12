/**
 * app/api/chat/route.ts
 *
 * Streaming chat Route Handler — written for Vercel AI SDK v7.
 *
 * HOW WE ATTACH SOURCE METADATA TO A STREAMING RESPONSE
 * ───────────────────────────────────────────────────────
 * A streaming response is a single long-lived HTTP connection, not a JSON
 * object. You can't just add a field to it. Instead, the AI SDK v7 uses a
 * multiplexed stream protocol where the server can write multiple *typed chunks*
 * into the same byte stream before, during, or after the text tokens.
 *
 * We use `createUIMessageStream` + a `writer` to do this:
 *  1. writer.write({ type: 'data-sources', data: [...] })
 *     → This gets serialised as a typed line in the stream BEFORE the LLM text.
 *     → The useChat hook on the client deserialises it and puts it into
 *       message.parts as { type: 'data-sources', data: [...] }
 *  2. writer.merge(result.toUIMessageStream())
 *     → This pipes all the LLM text-delta tokens into the same stream.
 *
 * The client sees ONE message that has BOTH the data part AND the text parts.
 * No second HTTP call needed. No polling. No WebSocket.
 *
 * The type prefix `data-` is the SDK convention for custom typed data parts.
 * You can define as many `data-*` types as you want via the UIMessage generic.
 */

import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  UIMessage,
} from "ai";
import { embed } from "@/lib/embedder";
import { searchChunks, SearchResult, saveMessage } from "@/lib/supabase";
import { handleApiError } from "@/lib/handle-api-error";
import { checkRateLimit, LIMITS } from "@/lib/rate-limit";

// ── Augment the UIMessage type to include our custom `data-sources` part ──────
// This is the v7 pattern for typed custom data: declare a DATA_TYPES map,
// then pass it as a generic to useChat / UIMessage on both sides.
export type SourceDataTypes = {
  sources: SearchResult[];
};

export type AppUIMessage = UIMessage<unknown, SourceDataTypes>;

// ── Relevance gate ───────────────────────────────────────────────────────────
// Only inject retrieved context when the top chunk's cosine similarity is at
// or above this value. Tune it up to reduce noise, down to cast a wider net.
// Cosine similarity from pgvector <=> is in [0, 1]; 0.3 is a conservative
// default that filters clearly unrelated results while keeping weak matches.
const RELEVANCE_THRESHOLD = 0.3;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  try {
    // ── Rate limit — checked first, before any I/O ──────────────────────────
    checkRateLimit(req, LIMITS.chat);

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    // v7: the hook sends UIMessage[] in the body
    const { messages }: { messages: AppUIMessage[] } = await req.json();

    // ── RAG STEP 4: Retrieval ────────────────────────────────────────────────
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop();

    const queryText = lastUserMessage?.parts?.reduce((text, part) => {
      return text + (part.type === "text" ? part.text : "");
    }, "") || "Hello";

    // embed() throws EmbeddingError → handleApiError maps it to 502
    const queryEmbedding = await embed(queryText);
    // searchChunks() throws RetrievalError → handleApiError maps it to 502
    const relevantChunks = await searchChunks(queryEmbedding, 3);

    // ── RAG STEP 4.5: Save user message ──────────────────────────────────────
    // Fire-and-forget — persistence failure must not break the chat response.
    // DatabaseError from saveMessage is caught and logged here, not propagated.
    if (conversationId && lastUserMessage) {
      saveMessage({
        id: lastUserMessage.id,
        conversation_id: conversationId,
        role: "user",
        content: queryText,
      }).catch((err) => console.error("[ChatRoute] Failed to save user message:", err));
    }

    // ── RAG STEP 5: Relevance gate + Prompt Injection ───────────────────────
    const topScore = relevantChunks[0]?.similarity ?? 0;
    const hasRelevantContext = topScore >= RELEVANCE_THRESHOLD;

    const sourcesToUse = hasRelevantContext
      ? relevantChunks.filter((c) => c.similarity >= RELEVANCE_THRESHOLD)
      : [];

    const systemPrompt = hasRelevantContext
      ? `You are a helpful personal knowledge assistant.
Answer concisely and clearly.

Here is some context retrieved from the user's knowledge base that is relevant to their question:
<context>
${sourcesToUse.map((chunk, i) => `[Source ${i + 1}]:\n${chunk.text}\n---`).join("\n")}
</context>

Base your answer on this context. If the context does not fully cover the question, supplement with your general knowledge and say so.`
      : `You are a helpful personal knowledge assistant.
Answer concisely and clearly using your general knowledge.
No specific context has been retrieved from the knowledge base for this question.`;

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: 0.7,
      onFinish: async ({ text }) => {
        // ── Save assistant message when streaming completes ──────────────────
        if (conversationId) {
          await saveMessage({
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: "assistant",
            content: text,
            sources: sourcesToUse.length > 0 ? sourcesToUse : null,
          }).catch((err) => console.error("[ChatRoute] Failed to save assistant message:", err));
        }
      },
    });

    // ── Multiplex (optional) sources + text into a single stream ──────────────
    const stream = createUIMessageStream<AppUIMessage>({
      execute: async ({ writer }) => {
        if (hasRelevantContext) {
          writer.write({
            type: "data-sources",
            data: sourcesToUse,
          });
        }

        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    // Catches EmbeddingError, RetrievalError, and any unexpected errors
    // before the stream has been opened. Once streaming starts, errors
    // inside the stream are handled by the AI SDK's stream error protocol.
    return handleApiError(err, "[POST /api/chat]");
  }
}

