"use client";

/**
 * components/chat/SuggestionGrid.tsx
 *
 * A grid of clickable suggestion cards. Clicking a card fills the input.
 */

import { User2, Award, Briefcase, FileSearch } from "lucide-react";

interface Suggestion {
  icon: React.ReactNode;
  title: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: <User2 className="w-4.5 h-4.5 text-violet-500" />,
    title: "Who am I?",
    prompt: "Who am I according to my uploaded documents and profile? Give me a concise overview.",
  },
  {
    icon: <Award className="w-4.5 h-4.5 text-emerald-500" />,
    title: "What skills do I have?",
    prompt: "What skills, technologies, and core expertises are highlighted across my uploaded files?",
  },
  {
    icon: <FileSearch className="w-4.5 h-4.5 text-blue-500" />,
    title: "Summarize my knowledge",
    prompt: "Summarize the key knowledge areas and documents in my uploaded files.",
  },
  {
    icon: <Briefcase className="w-4.5 h-4.5 text-amber-500" />,
    title: "What projects have I worked on?",
    prompt: "What projects, contributions, and case studies did I work on according to my knowledge base?",
  },
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function SuggestionGrid({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl mt-4">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.title}
          onClick={() => onSelect(s.prompt)}
          className="
            flex items-start gap-3.5
            p-4.5
            rounded-2xl
            border border-gray-100/80
            bg-white/80
            backdrop-blur-sm
            text-left
            hover:bg-gradient-to-br hover:from-white hover:to-violet-50/10 hover:border-violet-200/60 hover:shadow-md
            cursor-pointer
            transition-all duration-300 ease-out
            shadow-sm
            group
          "
        >
          <div className="
            flex items-center justify-center 
            w-9 h-9 rounded-xl 
            bg-gray-50 group-hover:bg-violet-50 
            transition-colors duration-300
            shrink-0
          ">
            {s.icon}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-gray-800 group-hover:text-violet-900 transition-colors">
              {s.title}
            </span>
            <span className="text-xs text-gray-500 line-clamp-1">
              {s.prompt}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
