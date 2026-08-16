import React, { useEffect, useState, useRef, useCallback } from "react";
import { Plus, Send, MessageSquare, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/agent/MessageBubble";
import { cn } from "@/lib/utils";

/**
 * Reusable in-app agent chat. Renders a conversation list + chat panel for any
 * agent config, gated by adminOnly when requested.
 */
export default function AgentChat({
  agentName,
  title,
  subtitle,
  icon,
  adminOnly = false,
  conversationLabel = "Conversation",
  newButtonLabel = "New conversation",
}) {
  const [authorized, setAuthorized] = useState(!adminOnly);
  const [checking, setChecking] = useState(adminOnly);
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!adminOnly) return;
    base44.auth.me()
      .then((u) => setAuthorized(u?.role === "admin"))
      .catch(() => setAuthorized(false))
      .finally(() => setChecking(false));
  }, [adminOnly]);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await base44.agents.listConversations({ agent_name: agentName });
      setConversations(list || []);
    } catch { /* ignore */ }
    setLoadingList(false);
  }, [agentName]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    setMessages([]);
    base44.agents.getConversation(activeId).then((c) => setMessages(c.messages || [])).catch(() => {});
    const unsub = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    return () => unsub();
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function newConversation() {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { name: `${conversationLabel} · ${new Date().toLocaleDateString()}`, description: subtitle },
      });
      await loadConversations();
      setActiveId(conv.id);
    } catch { /* ignore */ }
  }

  async function send() {
    const text = input.trim();
    if (!text || !activeId || sending) return;
    setInput("");
    setSending(true);
    try {
      const conv = await base44.agents.getConversation(activeId);
      await base44.agents.addMessage(conv, { role: "user", content: text });
    } catch {
      setSending(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        {icon}
        <h2 className="mt-4 font-heading text-xl font-bold text-white">Admins only</h2>
        <p className="mt-2 text-sm text-zinc-400">This assistant is restricted to admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">{title}</h1>
          <p className="text-sm text-zinc-400">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2">
          <button
            onClick={newConversation}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> {newButtonLabel}
          </button>
          <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: "60vh" }}>
            {loadingList ? (
              <p className="px-2 py-4 text-xs text-zinc-500">Loading…</p>
            ) : conversations.length === 0 ? (
              <p className="px-2 py-4 text-xs text-zinc-500">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                    activeId === c.id ? "border-amber-400/40 bg-amber-400/10 text-white" : "border-white/10 text-zinc-300 hover:bg-white/5"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
                  <span className="truncate">{c.metadata?.name || "Conversation"}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border border-white/10 bg-zinc-900/40" style={{ height: "70vh" }}>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {!activeId ? (
              <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                <p className="text-sm">Start a new conversation to begin.</p>
              </div>
            ) : messages.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-zinc-500">Say hello to get started…</p>
            ) : (
              messages.map((m, i) => <MessageBubble key={i} message={m} />)
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-white/10 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                disabled={!activeId}
                placeholder={activeId ? "Type your message…" : "Start a new conversation first"}
                className="max-h-32 flex-1 resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-400/40 disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!activeId || !input.trim() || sending}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-amber-300 to-orange-500 text-black transition-transform hover:scale-105 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}