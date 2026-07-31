"use client";

/**
 * components/chat/SourceCard.tsx
 *
 * Expandable card that shows a single RAG source chunk.
 */

import { useState } from "react";
import { ChevronDown, Database } from "lucide-react";
import type { SearchResult } from "@/lib/supabase";

export function SourceCard({
  source,
  index,
}: {
  source: SearchResult;
  index: number;
}) {
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
          className={`w-3.5 h-3.5 text-blue-400 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
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

export function SourcesPanel({ sources }: { sources: SearchResult[] }) {
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
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
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
