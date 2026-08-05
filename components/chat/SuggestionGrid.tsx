"use client";

/**
 * components/chat/SuggestionGrid.tsx
 *
 * A grid of clickable suggestion cards. Clicking a card fills the input.
 */

import { FileText, StickyNote, Code2, BookOpen } from "lucide-react";

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <FileText className="w-4 h-4" />,
    title: "Analyze my PDF",
    prompt: "Analyze the PDF I've uploaded and give me a detailed summary.",
  },
  {
    icon: <StickyNote className="w-4 h-4" />,
    title: "Summarize notes",
    prompt: "Summarize all the notes from my uploaded documents.",
  },
  {
    icon: <Code2 className="w-4 h-4" />,
    title: "Generate API docs",
    prompt: "Generate clear API documentation for a REST endpoint.",
  },
  {
    icon: <BookOpen className="w-4 h-4" />,
    title: "Explain a concept",
    prompt: "Explain a concept from my uploaded documents in simple terms.",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestionGrid({ onSelect }: Props) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.title}
          onClick={() => onSelect(s.prompt)}
          className="
            flex items-center gap-2
            px-4 py-2.5
            rounded-xl
            border border-gray-200
            bg-white
            text-sm font-medium text-gray-700
            hover:bg-gray-50 hover:border-gray-300
            cursor-pointer
            transition-all duration-150
            shadow-sm
          "
        >
          <span className="text-gray-400">{s.icon}</span>
          {s.title}
        </button>
      ))}
    </div>
  );
}
