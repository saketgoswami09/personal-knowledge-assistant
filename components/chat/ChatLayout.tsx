"use client";

/**
 * components/chat/ChatLayout.tsx
 *
 * The layout rendered once the user has sent their first message.
 * Shows MessageList + FloatingInput with no hero.
 */

import { MessageList } from "./MessageList";
import { FloatingInput } from "./FloatingInput";
import type { AppUIMessage } from "@/app/api/chat/route";

interface Props {
  messages: AppUIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  error: Error | undefined;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ChatLayout({
  messages,
  status,
  error,
  value,
  onChange,
  onSubmit,
}: Props) {
  const isStreaming = status === "submitted" || status === "streaming";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Scrollable messages */}
      <MessageList messages={messages} status={status} error={error} />

      {/* Floating input anchored at the bottom */}
      <div className="px-6 pb-6 pt-3 shrink-0 bg-white/80 backdrop-blur-sm border-t border-gray-100">
        <FloatingInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          disabled={isStreaming}
        />
      </div>
    </div>
  );
}
