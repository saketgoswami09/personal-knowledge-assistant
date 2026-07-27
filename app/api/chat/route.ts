/**
 * app/api/chat/route.ts
 *
 * Streaming chat Route Handler — written for Vercel AI SDK v7.
 *
 * v7 KEY CHANGES FROM v3/v4:
 * - The request body now contains UIMessage[] (not CoreMessage[]).
 *   UIMessage is the client-side message type that includes `parts`.
 * - We must call `convertToModelMessages` to convert UIMessages into
 *   the CoreMessage format that `streamText` expects.
 * - The response is built with `createUIMessageStreamResponse` +
 *   `toUIMessageStream` instead of the old `result.toDataStreamResponse()`.
 *
 * STREAMING FLOW:
 *  Browser POST { messages: UIMessage[] }
 *    → convertToModelMessages (UIMessage → CoreMessage)
 *    → streamText calls OpenAI, returns a lazy async stream
 *    → toUIMessageStream wraps it in the v7 UI stream format
 *    → createUIMessageStreamResponse wraps that in an HTTP Response
 *    → Browser's ReadableStream reads chunks token-by-token
 *    → @ai-sdk/react's useChat hook updates React state per chunk
 */

import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  UIMessage,
} from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request): Promise<Response> {
  // v7: the hook sends UIMessage[] in the body
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: groq("llama-3.3-70b-versatile"),
    system:
      "You are a helpful personal knowledge assistant. " +
      "Answer concisely and clearly.",
    // convertToModelMessages translates UIMessage (with parts[]) → CoreMessage
    messages: await convertToModelMessages(messages),
    temperature: 0.7,
  });

  // createUIMessageStreamResponse + toUIMessageStream is the v7 equivalent
  // of the old result.toDataStreamResponse()
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
