"use client";

/**
 * components/chat/FloatingInput.tsx
 *
 * Rounded floating input box – used both on the home screen and
 * in the chat layout. Accepts an optional placeholder override.
 */

import Link from "next/link";
import { ArrowUp, Paperclip } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function FloatingInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask anything…",
}: Props) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-3xl mx-auto"
    >
      <div
        className="
          relative flex flex-col
          bg-white
          border border-gray-200
          rounded-[28px]
          shadow-lg shadow-gray-200/60
          focus-within:border-gray-300
          focus-within:shadow-xl
          focus-within:shadow-gray-200/70
          transition-all duration-200
        "
      >
        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? "Waiting for response…" : placeholder}
          rows={1}
          className="
            w-full resize-none bg-transparent
            px-5 pt-4 pb-2
            text-[15px] text-gray-900 placeholder:text-gray-400
            outline-none leading-relaxed
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[52px] max-h-40
          "
          style={{ overflowY: "auto", scrollbarWidth: "none" }}
        />

        {/* Bottom action row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Attach / Upload */}
          <Link
            href="/upload"
            className="flex items-center justify-center w-9 h-9 rounded-full text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all"
            aria-label="Upload document to knowledge base"
            title="Upload document to knowledge base"
          >
            <Paperclip className="w-4 h-4" />
          </Link>

          {/* Send */}
          <button
            type="submit"
            disabled={!value.trim() || disabled}
            className="
              flex items-center justify-center
              w-9 h-9 rounded-full
              bg-gray-900 hover:bg-gray-700
              text-white
              transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-gray-900
              focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
            "
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-400 mt-3">
        AI can make mistakes. Verify important information.
      </p>
    </form>
  );
}
