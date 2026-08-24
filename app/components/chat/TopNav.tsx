"use client";

/**
 * components/chat/TopNav.tsx
 *
 * Minimal top navigation bar shown above the home screen / chat area.
 */

import Link from "next/link";
import { FileText, Menu } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface Props {
  onMenuOpen: () => void;
  status?: "submitted" | "streaming" | "ready" | "error";
  chatMode?: boolean;
}

export function TopNav({ onMenuOpen, status, chatMode }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-4 shrink-0">
      {/* Left – mobile hamburger */}
      <button
        onClick={onMenuOpen}
        aria-label="Open sidebar"
        className="md:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Center – logo (hidden on mobile if hamburger is shown, always visible on md+) */}
      <span className="hidden md:block text-sm font-semibold text-gray-800 tracking-tight">
        Knowledge Assistant
        {chatMode && status && (
          <span
            className={[
              "ml-2 text-xs font-normal",
              status === "submitted" ? "text-violet-500" : "",
              status === "streaming" ? "text-blue-500" : "",
              status === "ready" ? "text-gray-400" : "",
              status === "error" ? "text-red-500" : "",
            ].join(" ")}
          >
            {status === "submitted" && "Thinking…"}
            {status === "streaming" && "Streaming…"}
            {status === "ready" && ""}
            {status === "error" && "Error"}
          </span>
        )}
      </span>

      {/* Right – nav links */}
      <nav className="flex items-center gap-1">
        <Link
          href="/upload"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-violet-600 hover:bg-violet-50 transition-all"
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Upload</span>
        </Link>

        <div className="ml-1 flex items-center justify-center">
          <UserButton />
        </div>
      </nav>
    </header>
  );
}
