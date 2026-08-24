"use client";

/**
 * components/chat/ConversationSidebar.tsx
 *
 * Clean light sidebar with subtle Conscious branding.
 * Existing routing, RTK Query, collapse and mobile logic preserved.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
} from "lucide-react";

import { useGetConversationsQuery, useDeleteConversationMutation } from "@/lib/store/api";
import { LineSidebar } from "@/app/components/ui/LineSidebar";

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
  const { data: conversations = [], isLoading } =
    useGetConversationsQuery();

  const [deleteConversationMutation] = useDeleteConversationMutation();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  const NAV_ITEMS = ["Chat", "Upload PDF"];

  const NAV_ROUTES: Record<string, string> = {
    Chat: "/chat",
    "Upload PDF": "/upload",
  };

  const handleNavItem = (_index: number, label: string) => {
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
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity md:hidden ${
          sidebarOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-[#FAFAFA] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:static ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        } ${collapsed ? "w-[4.5rem]" : "w-64"}`}
      >
        {/* ───────── Header ───────── */}
        <div
          className={`flex h-16 items-center border-b border-gray-100 ${
            collapsed
              ? "justify-center px-2"
              : "justify-between px-4"
          }`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              {/* Subtle brand mark */}
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#DDD1F7] via-[#EACCD5] to-[#F1C4AF]" />

              <h1 className="text-sm font-semibold tracking-tight text-gray-900">
                Conscious
              </h1>
            </div>
          )}

          {collapsed && (
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#DDD1F7] via-[#EACCD5] to-[#F1C4AF]" />
          )}

          {/* Desktop collapse */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 md:flex"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="absolute top-4 hidden rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 md:flex"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ───────── New Chat ───────── */}
        <div
          className={`border-b border-gray-100 ${
            collapsed ? "px-2 py-3" : "px-3 py-4"
          }`}
        >
          <button
            onClick={handleNew}
            title="New Chat"
            className={`flex w-full items-center rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-[#CBB9E8] hover:bg-[#FAF8FF] hover:text-gray-900 ${
              collapsed
                ? "h-10 justify-center"
                : "h-10 gap-2 px-3"
            }`}
          >
            <Plus className="h-4 w-4 text-[#8E79B8]" />

            {!collapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* ───────── Navigation ───────── */}
        {!collapsed && (
          <div className="border-b border-gray-100 px-3 py-4">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
              Navigate
            </p>

            <LineSidebar
              items={NAV_ITEMS}
              accentColor="#8E79B8"
              textColor="#6B7280"
              markerColor="transparent"
              showIndex={false}
              showMarker={false}
              proximityRadius={60}
              maxShift={4}
              falloff="smooth"
              markerLength={0}
              markerGap={0}
              tickScale={0}
              scaleTick={false}
              itemGap={8}
              fontSize={0.85}
              smoothing={100}
              onItemClick={handleNavItem}
            />
          </div>
        )}

        {/* ───────── Recent conversations ───────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {!collapsed && (
            <div className="px-4 pb-2 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                Recent
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {isLoading && (
              <p
                className={`mt-4 text-center text-xs text-gray-400 ${
                  collapsed ? "px-1" : "px-3"
                }`}
              >
                {collapsed ? "…" : "Loading conversations..."}
              </p>
            )}

            {!isLoading &&
              conversations.map((conversation) => {
                const isActive = activeId === conversation.id;

                return (
                  <div key={conversation.id} className="group relative mb-0.5 flex w-full items-center">
                    <button
                      onClick={() => handleSelect(conversation.id)}
                      title={collapsed ? conversation.title : undefined}
                      className={`flex w-full items-center rounded-lg transition-colors ${
                        collapsed
                          ? "h-10 justify-center w-full"
                          : "h-10 gap-2.5 pl-2.5 pr-10 w-full"
                      } ${
                        isActive
                          ? "bg-[#F3F0FA] text-gray-900 font-semibold"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <MessageSquare
                        className={`h-[15px] w-[15px] shrink-0 ${
                          isActive
                            ? "text-[#8E79B8]"
                            : "text-gray-400 group-hover:text-gray-600"
                        }`}
                      />

                      {!collapsed && (
                        <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium">
                          {conversation.title}
                        </span>
                      )}
                    </button>

                    {!collapsed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTargetId(conversation.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}

            {!isLoading && conversations.length === 0 && (
              <p
                className={`mt-4 text-center text-xs text-gray-400 ${
                  collapsed ? "px-1" : "px-3"
                }`}
              >
                {collapsed ? "∅" : "No conversations yet"}
              </p>
            )}
          </div>
        </div>

        {/* ───────── Footer ───────── */}
        <div className="border-t border-gray-100 p-3">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                C
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-700">
                  Conscious Assistant
                </p>

                <p className="truncate text-[10px] text-gray-400">
                  Personal edition
                </p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
                C
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ───────── Delete Confirmation Modal ───────── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-80 rounded-2xl bg-white p-5 shadow-xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Delete Conversation?</h3>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              Delete this conversation? This can't be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="rounded-lg border border-gray-200 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const idToDelete = deleteTargetId;
                  setDeleteTargetId(null);
                  try {
                    if (activeId === idToDelete) {
                      onNew();
                    }
                    await deleteConversationMutation(idToDelete).unwrap();
                  } catch (err) {
                    console.error("Failed to delete conversation:", err);
                  }
                }}
                className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}