"use client";

/**
 * components/chat/MessageList.tsx
 *
 * Renders the scrollable list of chat messages with rich Markdown rendering,
 * syntax-highlighted code blocks, typing indicator, error banner, and source panels.
 */

import { useRef, useEffect, useState, ComponentPropsWithoutRef } from "react";
import { Sparkles, User, AlertCircle, Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SourcesPanel } from "./SourceCard";
import type { AppUIMessage } from "@/app/api/chat/route";
import type { SearchResult } from "@/lib/supabase";

interface Props {
  messages: AppUIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
}

interface CodeProps extends ComponentPropsWithoutRef<"code"> {
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ className, children, ...props }: CodeProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const codeContent = String(children ?? "").replace(/\n$/, "");
  const isInline = !match && !codeContent.includes("\n");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy error
    }
  };

  if (isInline) {
    return (
      <code
        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] font-medium text-violet-700"
        {...props}
      >
        {children}
      </code>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-900 text-xs text-gray-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950/80 px-3.5 py-1.5 font-mono text-[11px] text-gray-400">
        <span className="font-semibold uppercase tracking-wider text-gray-300">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono leading-relaxed">
        <code {...props}>{codeContent}</code>
      </pre>
    </div>
  );
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
        {messages
          .filter((m) => m.id !== "welcome")
          .map((m) => {
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
                        (p as { type: "data-sources"; data: SearchResult[] })
                          .data
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
                <div className="flex flex-col max-w-[85%] sm:max-w-[75%] gap-2">
                  <div
                    className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm whitespace-pre-wrap"
                        : "bg-white text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm"
                    }`}
                  >
                    {m.role === "user" ? (
                      textContent
                    ) : (
                      <div className="space-y-2.5 prose-sm max-w-none text-gray-800">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock,
                            p: ({ children }) => (
                              <p className="leading-relaxed mb-2 last:mb-0">
                                {children}
                              </p>
                            ),
                            ul: ({ children }) => (
                              <ul className="list-disc pl-5 my-2 space-y-1">
                                {children}
                              </ul>
                            ),
                            ol: ({ children }) => (
                              <ol className="list-decimal pl-5 my-2 space-y-1">
                                {children}
                              </ol>
                            ),
                            li: ({ children }) => (
                              <li className="leading-relaxed">{children}</li>
                            ),
                            blockquote: ({ children }) => (
                              <blockquote className="border-l-4 border-violet-300 pl-3 my-2 text-gray-600 italic">
                                {children}
                              </blockquote>
                            ),
                            a: ({ href, children }) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                {children}
                              </a>
                            ),
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3 rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children }) => (
                              <th className="bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-3 py-2 border-t border-gray-100 text-gray-700">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {textContent}
                        </ReactMarkdown>
                      </div>
                    )}
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
