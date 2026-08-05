"use client";

/**
 * components/chat/ConversationSidebar.tsx
 *
 * Dark-themed left sidebar. Drop-in replacement.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useGetConversationsQuery } from "@/lib/store/api";
import { LineSidebar } from "@/components/ui/LineSidebar";

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
  const router = useRouter();

  /** Routes to the page corresponding to the clicked LineSidebar item. */
  const NAV_ITEMS = ["Chat", "Upload PDF"];
  const NAV_ROUTES: Record<string, string> = {
    Chat: "/chat",
    "Upload PDF": "/upload",
  };

  const handleNavItem = (index: number, label: string) => {
    router.push(NAV_ROUTES[label] ?? "/");
    onClose();
  };

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
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r border-gray-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } ${collapsed ? "w-[4.5rem]" : "w-64"}`}
        style={{ backgroundColor: "#FAFAFA" }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-900">
                <MessageSquare className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900 tracking-tight">
                Knowledge Assistant
              </span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex items-center justify-center w-9 h-9 rounded-lg bg-gray-900">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ${collapsed ? "mx-auto mt-2" : ""
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
            className="md:hidden p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── New Chat ── */}
        <div className={`px-3 pt-4 pb-2 ${collapsed ? "px-2" : ""}`}>
          <button
            onClick={handleNew}
            className={`flex items-center gap-2.5 w-full rounded-xl font-medium transition-all duration-200 ${collapsed
              ? "justify-center p-3 text-gray-600 hover:bg-gray-100"
              : "px-3 py-2.5 text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            title={collapsed ? "New Chat" : undefined}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="text-sm">New Chat</span>}
          </button>
        </div>

        {/* ── Section Nav (LineSidebar) ── */}
        {!collapsed && (
          <div className="px-3 pb-1 border-b border-gray-100">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-1">
              Navigate
            </p>
            <LineSidebar
              items={NAV_ITEMS}
              accentColor="#A855F7"
              textColor="#71717a"
              markerColor="#e5e7eb"
              showIndex={false}
              showMarker
              proximityRadius={80}
              maxShift={12}
              falloff="smooth"
              markerLength={24}
              markerGap={6}
              tickScale={0.5}
              scaleTick
              itemGap={4}
              fontSize={0.8}
              smoothing={80}
              onItemClick={handleNavItem}
            />
          </div>
        )}

        {/* ── Conversation list ── */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {isLoading && (
            <p className={`text-center text-xs text-gray-400 mt-4 ${collapsed ? "px-1" : "px-4"}`}>
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
                  className={`group relative flex items-center w-full rounded-xl transition-all duration-150 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2"
                    } ${isActive
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  title={collapsed ? c.title : undefined}
                >
                  <MessageSquare
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-gray-700" : "text-gray-400 group-hover:text-gray-600"
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
            <p className={`text-center text-xs text-gray-400 mt-4 ${collapsed ? "px-1" : "px-4"}`}>
              {collapsed ? "∅" : "No past conversations."}
            </p>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-3 border-t border-gray-100">
          {!collapsed ? (
            <div className="px-3 py-2 rounded-xl">
              <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
                Knowledge Assistant
              </p>
              <p className="text-[11px] text-gray-300 mt-0.5">v0.1 · Personal edition</p>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">K</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}