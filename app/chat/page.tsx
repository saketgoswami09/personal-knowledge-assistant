"use client";

/**
 * app/chat/page.tsx
 *
 * Chat UI — refactored to use RTK Query for all REST data-fetching.
 *
 * Data-flow:
 *   • Sidebar conversation list  → useGetConversationsQuery   (RTK Query)
 *   • Load past messages         → useGetMessagesQuery        (RTK Query)
 *   • Create new conversation    → useCreateConversationMutation (RTK Query)
 *   • Streaming AI chat          → useChat (@ai-sdk/react)    — unchanged,
 *     the streaming protocol is bespoke and doesn't fit the RTK Query model.
 *
 * SOURCE CARDS
 * Each assistant UIMessage may carry a `data-sources` part injected by the
 * server before the text stream starts.  Parts shape:
 *   { type: 'data-sources', data: SearchResult[] }
 * where SearchResult = { id, text, similarity }
 */

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AppUIMessage } from "@/app/api/chat/route";
import Link from "next/link";
import { useEffect, useRef, useState, useMemo } from "react";
import { Sparkles, FileText, Menu } from "lucide-react";

import { useCreateConversationMutation, useGetMessagesQuery } from "@/lib/store/api";
import { ConversationSidebar } from "@/components/chat/ConversationSidebar";
import { MessageList } from "@/components/chat/MessageList";
import { ChatInput } from "@/components/chat/ChatInput";

// ── Welcome message shown in every fresh chat ─────────────────────────────────

const WELCOME_MESSAGE: AppUIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Hello! I'm your personal knowledge assistant. Ask me anything.",
    },
  ],
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [inputValue, setInputValue] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep a stable ref to activeId so the transport closure always reads
  // the latest value without triggering transport reconstruction.
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // ── RTK Query ──────────────────────────────────────────────────────────────

  const [createConversation] = useCreateConversationMutation();

  // Fetch persisted messages for the active conversation.
  // `skip: true` when no conversation is selected (new chat).
  const { data: persistedMessages } = useGetMessagesQuery(activeId!, {
    skip: !activeId,
  });

  // ── Vercel AI SDK transport ────────────────────────────────────────────────

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const currentId = activeIdRef.current;
          const finalUrl = currentId
            ? `${url}?conversationId=${currentId}`
            : url;
          return fetch(finalUrl, init);
        },
      }),
    []
  );

  const { messages, setMessages, sendMessage, status, error } =
    useChat<AppUIMessage>({
      id: activeId || "new",
      transport,
      messages: [WELCOME_MESSAGE],
    });

  // ── Sync persisted messages into the AI SDK when activeId changes ──────────

  useEffect(() => {
    if (!activeId || !persistedMessages) return;

    const uiMsgs: AppUIMessage[] = persistedMessages.map((m) => {
      const parts: AppUIMessage["parts"] = [];
      if (m.sources && m.sources.length > 0) {
        // Re-attach source data so SourcesPanel renders correctly.
        parts.push({ type: "data-sources", data: m.sources } as any);
      }
      parts.push({ type: "text", text: m.content });
      return { id: m.id, role: m.role, parts };
    });

    setMessages(uiMsgs);
  }, [activeId, persistedMessages, setMessages]);

  // Reset to welcome message when switching to a new (unsaved) chat.
  useEffect(() => {
    if (!activeId) {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [activeId, setMessages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const text = inputValue.trim();
    setInputValue("");

    let currentId = activeId;

    // Auto-create a conversation on the first message of a new chat.
    if (!currentId) {
      try {
        const title =
          text.slice(0, 40) + (text.length > 40 ? "…" : "");
        const convo = await createConversation({ title }).unwrap();
        currentId = convo.id;
        setActiveId(currentId);
        // Sync ref immediately so the in-flight fetch uses the new ID.
        activeIdRef.current = currentId;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    sendMessage({ text });
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
  };

  const handleNewChat = () => {
    setActiveId(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* ── Sidebar ── */}
      <ConversationSidebar
        activeId={activeId}
        sidebarOpen={sidebarOpen}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* ── Header ── */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/70 shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="md:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Avatar — matches sidebar branding gradient */}
            <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-md shadow-violet-500/20">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">
                Knowledge Assistant
              </h1>
              <p className="text-[11px] font-medium mt-0.5 hidden sm:block leading-none">
                <span className={[
                  status === "submitted" ? "text-violet-500" : "",
                  status === "streaming" ? "text-blue-500" : "",
                  status === "ready" ? "text-gray-400" : "",
                  status === "error" ? "text-red-500" : "",
                ].join(" ")}>
                  {status === "submitted" && "Thinking…"}
                  {status === "streaming" && "Streaming…"}
                  {status === "ready" && "Ready"}
                  {status === "error" && "Error"}
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all shrink-0"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Upload PDF</span>
          </Link>
        </header>

        {/* ── Message List ── */}
        <MessageList messages={messages} status={status} error={error} />

        {/* ── Input ── */}
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}