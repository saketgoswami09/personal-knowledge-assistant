"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";

// Types for our local state
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your personal knowledge assistant. Ask me anything about your data.",
    },
  ]);

  // Ref to handle auto-scrolling to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Trigger scroll whenever messages change or typing state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // 2. Simulate Assistant Response
    setTimeout(() => {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm just a shell UI right now, but I'm ready to be connected to a real AI model!",
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1200); // Slightly longer delay to show off the typing animation
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50/50 font-sans">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">
              Knowledge Assistant
            </h1>
            <p className="text-xs font-medium text-gray-500">Local UI Shell</p>
          </div>
        </div>
      </header>

      {/* ── Message List Area ───────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-4 ${m.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 mt-1">
                {m.role === "assistant" ? (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm max-w-[80%] sm:max-w-[70%] ${m.role === "user"
                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                    : "bg-white text-gray-800 border border-gray-200/60 rounded-2xl rounded-tl-sm"
                  }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-4 flex-row animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="px-5 py-4 bg-white border border-gray-200/60 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}

          {/* Invisible div to anchor the auto-scroll */}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* ── Input Area ──────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200/60 p-4 sm:p-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-3xl p-1.5 shadow-sm focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-300 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            placeholder={isTyping ? "Assistant is typing..." : "Ask a question..."}
            className="flex-1 bg-transparent px-4 py-3 min-h-[44px] outline-none text-gray-900 placeholder:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex items-center justify-center h-11 w-11 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-3 font-medium">
          AI can make mistakes. Consider verifying important information.
        </p>
      </div>

    </div>
  );
}