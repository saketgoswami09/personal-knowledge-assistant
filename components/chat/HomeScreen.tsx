"use client";

/**
 * components/chat/HomeScreen.tsx
 *
 * The landing screen shown when no messages exist yet.
 * Contains the hero, feature pills, suggestion grid, and the floating input.
 */

import { SuggestionGrid } from "./SuggestionGrid";
import { FloatingInput } from "./FloatingInput";


interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}

export function HomeScreen({ value, onChange, onSubmit, disabled }: Props) {
  const handleSuggestionSelect = (prompt: string) => {
    onChange(prompt);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-0 px-6 pb-10 overflow-y-auto">
      {/* ── Hero ── */}
      <div className="flex flex-col items-center text-center" style={{ marginBottom: "30px", paddingTop: "80px" }}>
        {/* Logo mark */}
        <div className="relative flex items-center justify-center w-14 h-14 mb-6">
          {/* Moon */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 via-gray-600 to-gray-950 z-10 shadow-lg" />
          {/* Orbit ring */}
          <div className="absolute w-[3.5rem] h-[3.5rem] rounded-full border border-violet-400/25 animate-spin" style={{ animationDuration: "6s" }}>
            {/* Satellite dot */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-[3px] w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
          </div>
        </div>

        <h1
          className="text-4xl font-semibold text-gray-900 tracking-tight"
          style={{ marginBottom: "12px" }}
        >
          Your Knowledge Assistant
        </h1>

        <p
          className="text-lg text-gray-500 max-w-md leading-relaxed"
          style={{ marginBottom: "30px" }}
        >
          Upload documents. Ask questions. Get grounded answers.
        </p>

        {/* Suggestion cards */}
        <SuggestionGrid onSelect={handleSuggestionSelect} />
      </div>

      {/* ── Floating Input ── */}
      <div className="w-full max-w-3xl" style={{ marginTop: "60px" }}>
        <FloatingInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          disabled={disabled}
          placeholder="Ask anything…"
        />
      </div>
    </div>
  );
}
