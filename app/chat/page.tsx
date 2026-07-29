"use client";

/**
 * app/chat/page.tsx
 *
 * Chat UI — written for @ai-sdk/react v7 + ai v7.
 *
 * KEY v7 API CHANGES (vs. older SDK versions / ai-sdk v6):
 *
 * 1. Import: `from '@ai-sdk/react'` — NOT 'ai/react' or 'ai'.
 *
 * 2. Transport: useChat now takes `transport: new DefaultChatTransport({ api })`
 *    instead of just `api: '/api/chat'`.
 *
 * 3. Input state: The hook NO LONGER manages input internally.
 *    We manage `input` with a plain useState ourselves.
 *
 * 4. Sending: `sendMessage({ text: input })` — NOT `handleSubmit(e)`.
 *
 * 5. Status: The hook returns `status` with 4 values:
 *    'ready' | 'submitted' | 'streaming' | 'error'
 *    instead of a boolean `isLoading`.
 *
 * 6. Message content: `message.parts` (array) — NOT `message.content` (string).
 *    Text parts: { type: 'text', text: string }
 *    We filter for part.type === 'text' and render part.text.
 *
 * STREAMING FLOW (same fundamental mechanism, new API shape):
 *   sendMessage() → POST /api/chat with UIMessage[] body
 *   → Server streams SSE chunks back
 *   → useChat reads the ReadableStream, appends text deltas to the
 *     last assistant message's parts[0].text on every chunk
 *   → React re-renders that bubble token-by-token
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, User, AlertCircle } from "lucide-react";

export default function ChatPage() {
  // v7: input is managed by us, not the hook
  const [input, setInput] = useState("");

  const {
    messages,    // UIMessage[] — each message has a `parts` array
    sendMessage, // (content, options?) => void — triggers the POST + stream
    status,      // 'ready' | 'submitted' | 'streaming' | 'error'
    error,       // Error | undefined
  } = useChat({
    // v7: transport object wraps the API config
    transport: new DefaultChatTransport({ api: "/api/chat" }),

    // Seed the conversation with a welcome message.
    // v7: property is `messages`, NOT `initialMessages` (that was the v6 name).
    // UIMessage shape: { id, role, parts: [{ type: 'text', text: string }] }
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "Hello! I'm your personal knowledge assistant. Ask me anything.",
          },
        ],
      } satisfies UIMessage,
    ],
  });

  // Auto-scroll to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // v7: sendMessage takes the text content directly
    sendMessage({ text: input.trim() });
    setInput("");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 font-sans">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Knowledge Assistant
            </h1>
            <p className="text-xs font-medium text-gray-500">
              {status === "submitted" && "Thinking…"}
              {status === "streaming" && "Streaming…"}
              {status === "ready" && "Ready"}
              {status === "error" && "Error"}
            </p>
          </div>
        </div>
      </header>

      {/* ── Message List ─────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {messages.map((m) => {
            // v7: extract the text from the parts array
            const textContent = m.parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("");

            return (
              <div
                key={m.id}
                className={`flex gap-4 ${
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 mt-1">
                  {m.role === "assistant" ? (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Message bubble.
                    During streaming, `textContent` grows token-by-token as
                    useChat appends each delta to parts[0].text.
                    React re-renders this div on every chunk — zero extra code. */}
                <div
                  className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm max-w-[80%] sm:max-w-[70%] ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {textContent}

                  {/* Blinking cursor on the actively-streaming message */}
                  {isStreaming &&
                    m.id === messages[messages.length - 1]?.id &&
                    m.role === "assistant" && (
                      <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                    )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator — shown while submitted but first chunk hasn't arrived */}
          {status === "submitted" && (
            <div className="flex gap-4 flex-row">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="px-5 py-4 bg-white border border-gray-200/60 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>
                Something went wrong. Check your{" "}
                <code className="font-mono text-xs">OPENAI_API_KEY</code> in{" "}
                <code className="font-mono text-xs">.env.local</code>.
              </span>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* ── Input Area ───────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200/60 p-4 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isStreaming}
            placeholder={isStreaming ? "Waiting for response…" : "Ask a question…"}
            className="flex-1 bg-transparent px-4 py-3 min-h-[44px] outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="flex items-center justify-center h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-3 font-medium">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>

    </div>
  );
}