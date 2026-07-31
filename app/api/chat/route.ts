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
import { searchChunks, SearchResult } from "@/lib/supabase";

// ── Augment the UIMessage type to include our custom `data-sources` part ──────
// This is the v7 pattern for typed custom data: declare a DATA_TYPES map,
// then pass it as a generic to useChat / UIMessage on both sides.
export type SourceDataTypes = {
  sources: SearchResult[];
};

export type AppUIMessage = UIMessage<unknown, SourceDataTypes>;

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  // v7: the hook sends UIMessage[] in the body
  const { messages }: { messages: AppUIMessage[] } = await req.json();

  // ── RAG STEP 4: Retrieval ────────────────────────────────────────────────
  const lastUserMessage = messages
    .filter((m) => m.role === "user")
    .pop();

  const queryText = lastUserMessage?.parts?.reduce((text, part) => {
    return text + (part.type === "text" ? part.text : "");
  }, "") || "Hello";

  const queryEmbedding = await embed(queryText);
  const relevantChunks = await searchChunks(queryEmbedding, 3);

  // ── RAG STEP 5: Prompt Injection ─────────────────────────────────────────
  const contextText = relevantChunks
    .map((chunk, i) => `[Source ${i + 1}]:\n${chunk.text}\n---`)
    .join("\n");

  const systemPrompt = `You are a helpful personal knowledge assistant.
Answer concisely and clearly.

Here is some context retrieved from the user's knowledge base that might be relevant:
<context>
${contextText}
</context>

If the answer is not in the context, you can still answer using your general knowledge, but prioritize the context if it applies.`;

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  // ── Multiplex sources + text into a single stream ─────────────────────────
  // createUIMessageStream gives us a writer we control.
  // We write the sources FIRST as a typed data chunk, then merge the LLM text.
  // The client's useChat hook reads both from the same byte stream and puts
  // them both into message.parts automatically.
  const stream = createUIMessageStream<AppUIMessage>({
    execute: async ({ writer }) => {
      // Step 1: Write source metadata chunk before any text arrives.
      // The `data-sources` type maps to SourceDataTypes["sources"].
      writer.write({
        type: "data-sources",
        data: relevantChunks,
      });

      // Step 2: Pipe LLM text tokens into the same stream.
      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
