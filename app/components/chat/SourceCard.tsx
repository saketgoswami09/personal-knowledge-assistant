"use client";

/**
 * components/chat/SourceCard.tsx
 *
 * Expandable card that shows a single RAG source chunk.
 * Compact by default — collapsed, tight padding, 3-line body clamp.
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
  const [expanded, setExpanded] = useState(false);   // card header toggle
  const [showMore, setShowMore] = useState(false);    // body text clamp toggle
  const score = Math.round(source.similarity * 100);

  return (
    <div className="rounded-md border border-blue-100 bg-blue-50/50 text-xs overflow-hidden">
      {/* ── Header row (always visible) ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Database className="w-3 h-3 text-blue-400 shrink-0" />
          <span className="text-blue-700 font-medium truncate">
            Source {index + 1}
          </span>
          <span className="shrink-0 px-1 py-0.5 bg-blue-200/60 text-blue-600 rounded-full font-mono text-[10px]">
            {score}%
          </span>
        </div>
        <ChevronDown
          className={`w-3 h-3 text-blue-400 shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ── Body (shown when expanded) ── */}
      {expanded && (
        <div className="px-2.5 pb-2 pt-1 border-t border-blue-100">
          <p
            className={`text-xs text-gray-500 leading-relaxed whitespace-pre-wrap ${
              showMore ? "" : "line-clamp-3"
            }`}
          >
            {source.text}
          </p>
          {/* Show more / less toggle — only if text is long enough to clamp */}
          {source.text.length > 200 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMore(!showMore);
              }}
              className="mt-1 text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              {showMore ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SourcesPanel({ sources }: { sources: SearchResult[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-1.5">
      {/* ── Summary toggle line — muted, compact ── */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Database className="w-3 h-3" />
        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="mt-1.5 space-y-1">
          {sources.map((src, i) => (
            <SourceCard key={src.id} source={src} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
