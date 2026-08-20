"use client";

/**
 * components/chat/ChatInput.tsx
 *
 * Controlled input form at the bottom of the chat panel.
 */

import { Send } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled: boolean;
}

export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  return (
    <div className="bg-white border-t border-gray-200/60 p-4 sm:p-6 shrink-0">
      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={disabled ? "Waiting for response…" : "Ask a question…"}
          className="flex-1 bg-transparent px-4 py-3 min-h-[44px] outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex items-center justify-center h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50"
        >
          <Send className="w-5 h-5 ml-0.5" />
        </button>
      </form>
      <p className="text-center text-xs text-gray-400 mt-3 font-medium">
        AI can make mistakes. Consider verifying important information.
      </p>
    </div>
  );
}
