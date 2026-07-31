"use client";

/**
 * components/chat/ConversationSidebar.tsx
 *
 * Dark-themed left sidebar. Drop-in replacement.
 */

import { useState } from "react";
import { MessageSquare, Plus, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useGetConversationsQuery } from "@/lib/store/api";

interface Props {
  activeId: string | null;
  sidebarOpen: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}

export function ConversationSidebar({
  activeId,
  sidebarOpen,
  onSelect,
  onNew,
  onClose,
}: Props) {
  const { data: conversations = [], isLoading } = useGetConversationsQuery();
  const [collapsed, setCollapsed] = useState(false);

  const handleNew = () => {
    onNew();
    onClose();
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${collapsed ? "w-[4.5rem]" : "w-72"}`}
        style={{ backgroundColor: "#18181b" }} /* zinc-950 */
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">
                Chats
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex items-center justify-center w-10 h-10 rounded-lg bg-white/10">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden md:flex p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors ${collapsed ? "mx-auto mt-2" : ""
              }`}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onClose}
            className="md:hidden p-2 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── New Chat ── */}
        <div className={`px-3 pt-4 pb-2 ${collapsed ? "px-2" : ""}`}>
          <button
            onClick={handleNew}
            className={`flex items-center gap-2.5 w-full rounded-xl font-medium transition-all duration-200 ${collapsed
                ? "justify-center p-3 bg-white/5 hover:bg-white/10 text-zinc-300"
                : "px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/5 hover:border-white/10"
              }`}
            title={collapsed ? "New Chat" : undefined}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-sm">New Chat</span>}
          </button>
        </div>

        {/* ── Conversation list ── */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {isLoading && (
            <p className={`text-center text-xs text-zinc-600 mt-4 ${collapsed ? "px-1" : "px-4"}`}>
              {collapsed ? "…" : "Loading conversations…"}
            </p>
          )}

          {!isLoading &&
            conversations.map((c) => {
              const isActive = activeId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={`group relative flex items-center w-full rounded-xl transition-all duration-200 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"
                    } ${isActive
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                  title={collapsed ? c.title : undefined}
                >
                  {/* Active left-edge indicator */}
                  {isActive && (
                    <div
                      className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-white/90 rounded-r-full ${collapsed ? "opacity-0" : ""
                        }`}
                    />
                  )}

                  <MessageSquare
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-400"
                      }`}
                  />

                  {!collapsed && (
                    <>
                      <span className="text-sm font-medium truncate text-left flex-1">
                        {c.title}
                      </span>
                      {/* Optional unread badge — renders if c.unreadCount > 0 */}
                      {"unreadCount" in c && (c as any).unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-[10px] font-bold text-black bg-yellow-400 rounded-md">
                          {(c as any).unreadCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}

          {!isLoading && conversations.length === 0 && (
            <p className={`text-center text-xs text-zinc-600 mt-4 ${collapsed ? "px-1" : "px-4"}`}>
              {collapsed ? "∅" : "No past conversations."}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-white/5">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 truncate">User</p>
                <p className="text-xs text-zinc-600 truncate">Online</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-300">
                U
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}