"use client";

/**
 * app/chat/page.tsx
 *
 * Chat UI — ChatGPT-style home screen → chat layout transition.
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
import { useEffect, useRef, useState, useMemo } from "react";

import {
  useCreateConversationMutation,
  useGetMessagesQuery,
} from "@/lib/store/api";
import { ConversationSidebar } from "@/app/components/chat/ConversationSidebar";
import { HomeScreen } from "@/app/components/chat/HomeScreen";
import { ChatLayout } from "@/app/components/chat/ChatLayout";
import { TopNav } from "@/app/components/chat/TopNav";

// ── Welcome sentinel (never shown in UI, just marks "new chat" state) ─────────

const WELCOME_MESSAGE: AppUIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [{ type: "text", text: "" }],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when the user hasn't sent any message yet (only the sentinel exists). */
const isHomeState = (messages: AppUIMessage[]) =>
  messages.length === 1 && messages[0].id === "welcome";

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
  const { data: persistedMessages, isFetching } = useGetMessagesQuery(
    activeId!,
    {
      skip: !activeId,
    },
  );

  // ── Vercel AI SDK transport ────────────────────────────────────────────────

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const currentId = activeId;
          const finalUrl = currentId
            ? `${url}?conversationId=${currentId}`
            : url;
          return fetch(finalUrl, init);
        },
      }),
    [activeId],
  );

  const { messages, setMessages, sendMessage, status, error } =
    useChat<AppUIMessage>({
      id: activeId || "new",
      transport,
      messages: [WELCOME_MESSAGE],
    });

  // ── Sync persisted messages into the AI SDK when activeId changes ──────────

  useEffect(() => {
    // Prevent syncing stale cached messages from a previously active conversation while fetching the new one.
    if (!activeId || !persistedMessages || isFetching) return;

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
  }, [activeId, persistedMessages, isFetching, setMessages]);

  // Reset to welcome sentinel when switching to a new (unsaved) chat.
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
        const title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
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
    setInputValue("");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const showHome = isHomeState(messages);

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

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* ── Top Nav ── */}
        <TopNav
          onMenuOpen={() => setSidebarOpen(true)}
          status={status}
          chatMode={!showHome}
        />

        {/* ── Content: Home or Chat ── */}
        {showHome ? (
          <HomeScreen
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            disabled={isStreaming}
          />
        ) : (
          <ChatLayout
            messages={messages}
            status={status}
            error={error}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  );
}
