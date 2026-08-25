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
import { NextResponse } from "next/server";
import { embed } from "@/lib/embedder";
import {
  searchChunks,
  SearchResult,
  saveMessage,
  countUserChunks,
} from "@/lib/supabase";
import { handleApiError } from "@/lib/handle-api-error";
import {
  checkRateLimit,
  LIMITS,
  MAX_CHAT_MESSAGE_CHARS,
} from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";
import { auth } from "@clerk/nextjs/server";

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

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    // v7: the hook sends UIMessage[] in the body
    const { messages }: { messages: AppUIMessage[] } = await req.json();

    // ── RAG STEP 4: Retrieval ────────────────────────────────────────────────
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();

    const queryText =
      lastUserMessage?.parts?.reduce((text, part) => {
        return text + (part.type === "text" ? part.text : "");
      }, "") || "Hello";

    // ── RAG payload guard: message length ───────────────────────────────────
    // Reject before embed/LLM if the message is unreasonably long.
    // Long inputs cause proportionally expensive embedding + LLM token costs.
    if (queryText.length > MAX_CHAT_MESSAGE_CHARS) {
      throw new ValidationError(
        `[ChatRoute] User message too long: ${queryText.length} chars (max ${MAX_CHAT_MESSAGE_CHARS})`,
        `Message too long. Please keep your message under ${MAX_CHAT_MESSAGE_CHARS} characters.`,
      );
    }

    // ── Check empty knowledge base ───────────────────────────────────────────
    const chunkCount = await countUserChunks(userId);
    if (chunkCount === 0) {
      // ── Playful local assistant responses ─────────────────────────────────
      const WITTY_RESPONSES = [
        "I can talk, but psychic abilities aren't enabled yet. [Feed me a file 📎](/upload)",
        "I'd love to answer that — I'm just drawing a total blank. Literally no documents yet. [Feed me a file 📎](/upload)",
        "My brain is currently empty. Very peaceful. Very useless. 😭 [Feed me a file 📎](/upload)",
        "No documents, no secrets. Feed me something juicy. [Feed me a file 📎](/upload)",
        "Your knowledge vault is looking suspiciously empty. [Feed me a file 📎](/upload)",
      ];
      const responseText =
        WITTY_RESPONSES[Math.floor(Math.random() * WITTY_RESPONSES.length)];

      // Save user message (fire-and-forget)
      if (conversationId && lastUserMessage) {
        saveMessage(
          {
            id: lastUserMessage.id,
            conversation_id: conversationId,
            role: "user",
            content: queryText,
          },
          userId,
        ).catch((err) =>
          console.error("[ChatRoute] Failed to save user message:", err),
        );
      }

      // Save assistant response (fire-and-forget)
      if (conversationId) {
        saveMessage(
          {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: "assistant",
            content: responseText,
            sources: null,
          },
          userId,
        ).catch((err) =>
          console.error("[ChatRoute] Failed to save assistant message:", err),
        );
      }

      // Stream it back word-by-word with a 60ms delay
      const words = responseText.split(" ");
      const stream = createUIMessageStream<AppUIMessage>({
        execute: async ({ writer }) => {
          const partId = crypto.randomUUID();
          writer.write({
            type: "text-start",
            id: partId,
          });
          for (let i = 0; i < words.length; i++) {
            writer.write({
              type: "text-delta",
              id: partId,
              delta: words[i] + (i < words.length - 1 ? " " : ""),
            });
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    // embed() throws EmbeddingError → handleApiError maps it to 502
    const queryEmbedding = await embed(queryText);
    // searchChunks() throws RetrievalError → handleApiError maps it to 502
    const relevantChunks = await searchChunks(queryEmbedding, userId, 3);

    // ── RAG STEP 4.5: Save user message ──────────────────────────────────────
    // Fire-and-forget — persistence failure must not break the chat response.
    // DatabaseError from saveMessage is caught and logged here, not propagated.
    if (conversationId && lastUserMessage) {
      saveMessage(
        {
          id: lastUserMessage.id,
          conversation_id: conversationId,
          role: "user",
          content: queryText,
        },
        userId,
      ).catch((err) =>
        console.error("[ChatRoute] Failed to save user message:", err),
      );
    }

    // ── RAG STEP 5: Relevance gate + Prompt Injection ───────────────────────
    const topScore = relevantChunks[0]?.similarity ?? 0;
    const hasRelevantContext = topScore >= RELEVANCE_THRESHOLD;

    if (!hasRelevantContext) {
      const responseText = `I couldn't find any relevant information about that in the uploaded documents. Please make sure the documents containing this information are uploaded and try again.`;

      // Save assistant response (fire-and-forget)
      if (conversationId) {
        saveMessage(
          {
            id: crypto.randomUUID(),
            conversation_id: conversationId,
            role: "assistant",
            content: responseText,
            sources: null,
          },
          userId,
        ).catch((err) =>
          console.error("[ChatRoute] Failed to save assistant message:", err),
        );
      }

      // Stream it back word-by-word with a 60ms delay
      const words = responseText.split(" ");
      const stream = createUIMessageStream<AppUIMessage>({
        execute: async ({ writer }) => {
          const partId = crypto.randomUUID();
          writer.write({
            type: "text-start",
            id: partId,
          });
          for (let i = 0; i < words.length; i++) {
            writer.write({
              type: "text-delta",
              id: partId,
              delta: words[i] + (i < words.length - 1 ? " " : ""),
            });
            await new Promise((resolve) => setTimeout(resolve, 60));
          }
        },
      });

      return createUIMessageStreamResponse({ stream });
    }

    const sourcesToUse = relevantChunks.filter(
      (c) => c.similarity >= RELEVANCE_THRESHOLD,
    );

    const systemPrompt = `You are a strict personal knowledge assistant. Your main task is to answer the user's question using ONLY the retrieved context below.

<context>
${sourcesToUse.map((chunk, i) => `[Source ${i + 1}]:\n${chunk.text}\n---`).join("\n")}
</context>

CRITICAL RULES FOR GROUNDING AND ACCURACY:
1. You must answer the user's question ONLY using the factual information explicitly present in the provided retrieved context.
2. If the retrieved context does not contain the answer, or if the requested information is missing, incomplete, or ambiguous, you must state: "I couldn't find information about [topic/question] in the uploaded documents." Do not try to guess, extrapolate, or use outside knowledge.
3. NEVER make assumptions, infer, or fabricate any:
   - Date of birth or age
   - Phone numbers, email addresses, or physical addresses
   - Education details (degrees, universities, dates)
   - Work experience (employers, roles, dates)
   - Skills, projects, or accomplishments
   - Any other factual or personal detail not explicitly written in the context.
4. Do not use any pre-existing or external general knowledge to answer questions about people or their documents. The provided context is your entire universe of facts.
5. If the context does not explicitly mention the answer to the question, confidently and clearly say that the information was not found. Do not apologize, and do not say "based on my general knowledge...". Just report the fact.
6. Every fact in your answer must be traceable directly to the provided sources. Do not invent any fact under any circumstance.`;

    const result = streamText({
      model: groq("openai/gpt-oss-20b"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      temperature: 0.1,
      onFinish: async ({ text }) => {
        // ── Save assistant message when streaming completes ──────────────────
        if (conversationId) {
          await saveMessage(
            {
              id: crypto.randomUUID(),
              conversation_id: conversationId,
              role: "assistant",
              content: text,
              sources: sourcesToUse.length > 0 ? sourcesToUse : null,
            },
            userId,
          ).catch((err) =>
            console.error("[ChatRoute] Failed to save assistant message:", err),
          );
        }
      },
    });

    // ── Multiplex (optional) sources + text into a single stream ──────────────
    const stream = createUIMessageStream<AppUIMessage>({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-sources",
          data: sourcesToUse,
        });

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
