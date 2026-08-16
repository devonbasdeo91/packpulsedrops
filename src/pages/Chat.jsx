import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MessageBubble from "@/components/chat/MessageBubble";

function conversationId(a, b) {
  return [a, b].sort().join("_");
}

export default function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [friendName, setFriendName] = useState(location.state?.friendName || "Friend");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    base44.auth.me().then((u) => {
      if (!alive || !u) return;
      setMe(u);
      if (!location.state?.friendName) {
        base44.entities.Friendship.list("-created_date", 200).then((fs) => {
          if (!alive) return;
          const f = fs.find(
            (x) =>
              (x.requester_id === u.id && x.recipient_id === friendId) ||
              (x.recipient_id === u.id && x.requester_id === friendId)
          );
          if (f) setFriendName(f.requester_id === u.id ? f.recipient_name : f.requester_name);
        });
      }
    });
    return () => { alive = false; };
  }, [friendId]);

  const cid = me ? conversationId(me.id, friendId) : null;

  const loadMessages = useCallback(async () => {
    if (!cid) return;
    try {
      const data = await base44.entities.ChatMessage.filter({ conversation_id: cid }, "created_date", 200);
      setMessages(data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [cid]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!cid) return;
    const unsub = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.conversation_id !== cid) return;
      if (event.type === "create") {
        setMessages((prev) => (prev.some((m) => m.id === event.data.id) ? prev : [...prev, event.data]));
      } else {
        loadMessages();
      }
    });
    return unsub;
  }, [cid, loadMessages]);

  // Mark received messages as read
  useEffect(() => {
    if (!cid || !me) return;
    base44.entities.ChatMessage.updateMany(
      { conversation_id: cid, recipient_id: me.id, read: false },
      { $set: { read: true } }
    ).catch(() => {});
  }, [cid, me, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(e) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !me || !cid || sending) return;
    setSending(true);
    setInput("");
    // Optimistic: push a temporary pending message so it renders instantly
    const tempId = `temp_${Date.now()}`;
    const tempMsg = {
      id: tempId,
      conversation_id: cid,
      sender_id: me.id,
      sender_name: me.full_name || (me.email ? me.email.split("@")[0] : "You"),
      recipient_id: friendId,
      content,
      read: false,
      created_date: new Date().toISOString(),
      _pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    try {
      const created = await base44.entities.ChatMessage.create({
        conversation_id: cid,
        sender_id: me.id,
        sender_name: me.full_name || (me.email ? me.email.split("@")[0] : "You"),
        recipient_id: friendId,
        content,
        read: false,
      });
      // Swap the temp message for the real one (dedupe in case realtime already added it)
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        const real = created || { ...tempMsg, _pending: false };
        return withoutTemp.some((m) => m.id === real.id) ? withoutTemp : [...withoutTemp, real];
      });
    } catch {
      setInput(content);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  if (!me || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button onClick={() => navigate("/friends")} className="text-zinc-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-sm font-bold text-amber-300">
          {(friendName || "?")[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold text-white">{friendName}</h1>
          <p className="text-xs text-emerald-400">● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="text-sm text-zinc-500">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.sender_id === me.id} />)
        )}
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 pt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          maxLength={1000}
          className="flex-1 rounded-full border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-300 to-orange-500 text-black transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}