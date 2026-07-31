"use client";

/**
 * app/chat/page.tsx
 *
 * Chat UI — written for @ai-sdk/react v7 + ai v7.
 *
 * SOURCE CARDS
 * Each assistant UIMessage now has a `data-sources` part injected by the
 * server (before the text stream starts). We filter parts by type to get the
 * sources, then render expandable cards below the message bubble.
 *
 * The `data-sources` part shape on the client:
 *   { type: 'data-sources', data: SearchResult[] }
 * where SearchResult = { id, text, similarity }
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AppUIMessage, SourceDataTypes } from "@/app/api/chat/route";
import type { SearchResult } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { Send, Sparkles, User, AlertCircle, ChevronDown, Database, FileText, MessageSquare, Plus, Menu, X } from "lucide-react";

// ── Source Cards ──────────────────────────────────────────────────────────────

function SourceCard({ source, index }: { source: SearchResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const score = Math.round(source.similarity * 100);

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/60 text-xs overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-blue-100/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Database className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-blue-700 font-medium truncate">
            Source {index + 1}
          </span>
          <span className="shrink-0 px-1.5 py-0.5 bg-blue-200/70 text-blue-700 rounded-full font-mono">
            {score}% match
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-blue-400 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 text-gray-600 leading-relaxed border-t border-blue-100 whitespace-pre-wrap">
          {source.text}
        </div>
      )}
    </div>
  );
}

function SourcesPanel({ sources }: { sources: SearchResult[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
      >
        <Database className="w-3.5 h-3.5" />
        Sources ({sources.length})
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {sources.map((src, i) => (
            <SourceCard key={src.id} source={src} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeIdRef = useRef(activeId);

  // Keep a ref to the activeId so the custom fetch can always read the latest value
  // without needing to recreate the transport object and trigger re-renders.
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    fetch: async (url, init) => {
      const currentUrl = activeIdRef.current ? `${url}?conversationId=${activeIdRef.current}` : url;
      return fetch(currentUrl, init);
    }
  }), []);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    error,
  } = useChat<AppUIMessage>({
    id: activeId || "new",
    transport,
    messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: "Hello! I'm your personal knowledge assistant. Ask me anything." }],
      } satisfies AppUIMessage,
    ],
  });

  // Fetch conversations on mount
  useEffect(() => {
    fetch("/api/conversations")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch(console.error);
  }, []);

  // Load messages when activeId changes
  useEffect(() => {
    if (!activeId) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        parts: [{ type: "text", text: "Hello! I'm your personal knowledge assistant. Ask me anything." }],
      }]);
      return;
    }
    fetch(`/api/conversations/${activeId}/messages`)
      .then(res => res.json())
      .then((data: DbMessage[]) => {
        if (!Array.isArray(data)) return;
        const uiMsgs: AppUIMessage[] = data.map(m => {
          const parts: any[] = [];
          if (m.sources && m.sources.length > 0) parts.push({ type: "data-sources", data: m.sources });
          parts.push({ type: "text", text: m.content });
          return { id: m.id, role: m.role, parts };
        });
        setMessages(uiMsgs);
      })
      .catch(console.error);
  }, [activeId, setMessages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    const text = input.trim();
    setInput("");

    let currentId = activeId;
    if (!currentId) {
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.slice(0, 40) + (text.length > 40 ? "..." : "") })
        });
        const convo = await res.json();
        currentId = convo.id;
        setActiveId(currentId);
        setConversations(prev => [convo, ...prev]);
      } catch (err) {
        console.error("Failed to create conversation:", err);
      }
    }
    
    // Ensure the fetch wrapper uses the newly generated ID immediately
    if (currentId) activeIdRef.current = currentId;
    
    sendMessage({ text });
  };

  return (
    <div className="flex h-screen bg-gray-50/50 font-sans overflow-hidden">
      
      {/* ── Sidebar Mobile Overlay ── */}
      <div 
        className={`fixed inset-0 z-40 bg-gray-900/50 transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      {/* ── Sidebar ── */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200/60 flex flex-col transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-4 border-b border-gray-200/60 flex items-center justify-between">
          <button
            onClick={() => { setActiveId(null); setSidebarOpen(false); }}
            className="flex items-center gap-2 w-full px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4 shrink-0" />
            New Chat
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
              className={`w-full group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                activeId === c.id 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20' 
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
              }`}
            >
              {activeId === c.id && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-white rounded-r-full shadow-[1px_0_4px_rgba(255,255,255,0.5)]" />
              )}
              <MessageSquare className={`w-4 h-4 shrink-0 ${activeId === c.id ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="text-sm font-medium truncate text-left">{c.title}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-4 px-4">No past conversations.</p>
          )}
        </div>
      </aside>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        
        {/* ── Header ──────────────────────────────────────── */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                Knowledge Assistant
              </h1>
              <p className="text-xs font-medium text-gray-500 hidden sm:block">
                {status === "submitted" && "Thinking…"}
                {status === "streaming" && "Streaming…"}
                {status === "ready" && "Ready"}
                {status === "error" && "Error"}
              </p>
            </div>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0"
          >
            <FileText className="w-4 h-4" />
            Upload PDF
          </Link>
        </header>

        {/* ── Message List ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto space-y-6">

            {messages.map((m) => {
              // Extract text content from parts
              const textContent = m.parts
                .filter((p) => p.type === "text")
                .map((p) => p.text)
                .join("");

              // Extract sources from the data-sources part (assistant only)
              const sources: SearchResult[] =
                m.role === "assistant"
                  ? (m.parts
                    .filter((p) => p.type === "data-sources")
                    .flatMap((p) => (p as { type: "data-sources"; data: SearchResult[] }).data))
                  : [];

              return (
                <div
                  key={m.id}
                  className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
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
                      className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${m.role === "user"
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

                    {/* Source cards — only shown when streaming is done or sources are available */}
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

            {/* Error state */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Something went wrong. Check your API keys in <code className="font-mono text-xs">.env.local</code>.</span>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </main>

        {/* ── Input Area ───────────────────────────────────── */}
        <div className="bg-white border-t border-gray-200/60 p-4 sm:p-6 shrink-0">
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
    </div>
  );
}