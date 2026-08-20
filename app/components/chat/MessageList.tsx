"use client";

/**
 * components/chat/MessageList.tsx
 *
 * Renders the scrollable list of chat messages, typing indicator,
 * error banner, and source panels.
 */

import { useRef, useEffect } from "react";
import { Sparkles, User, AlertCircle } from "lucide-react";
import { SourcesPanel } from "./SourceCard";
import type { AppUIMessage } from "@/app/api/chat/route";
import type { SearchResult } from "@/lib/supabase";

interface Props {
  messages: AppUIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
}

export function MessageList({ messages, status, error }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.filter((m) => m.id !== "welcome").map((m) => {
          const textContent = m.parts
            .filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("");

          const sources: SearchResult[] =
            m.role === "assistant"
              ? m.parts
                  .filter((p) => p.type === "data-sources")
                  .flatMap(
                    (p) =>
                      (p as { type: "data-sources"; data: SearchResult[] }).data
                  )
              : [];

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

              {/* Bubble + Sources */}
              <div className="flex flex-col max-w-[80%] sm:max-w-[70%] gap-2">
                <div
                  className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm"
                  }`}
                >
                  {textContent}
                  {isStreaming &&
                    m.id === messages[messages.length - 1]?.id &&
                    m.role === "assistant" && (
                      <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                    )}
                </div>

                {m.role === "assistant" && sources.length > 0 && (
                  <SourcesPanel sources={sources} />
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
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

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Something went wrong. Check your API keys in{" "}
              <code className="font-mono text-xs">.env.local</code>.
            </span>
          </div>
        )}

        <div ref={endRef} className="h-4" />
      </div>
    </main>
  );
}
