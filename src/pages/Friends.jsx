import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, MessageCircle, Check, X, Clock, ArrowLeftRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import AddFriendPanel from "@/components/chat/AddFriendPanel";
import TradeDialog from "@/components/TradeDialog";
import { cn } from "@/lib/utils";

export default function Friends() {
  const { userId, loaded } = useWallet();
  const navigate = useNavigate();
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [tradeTarget, setTradeTarget] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await base44.entities.Friendship.list("-created_date", 200);
      setFriendships(data || []);
    } catch {
      /* RLS filters to mine */
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const unsub = base44.entities.Friendship.subscribe(() => load());
    return unsub;
  }, [load]);

  const accepted = friendships.filter((f) => f.status === "accepted");
  const pendingReceived = friendships.filter((f) => f.status === "pending" && f.recipient_id === userId);
  const pendingSent = friendships.filter((f) => f.status === "pending" && f.requester_id === userId);

  async function respond(friendshipId, status) {
    try {
      await base44.entities.Friendship.update(friendshipId, { status });
      load();
    } catch {
      /* ignore */
    }
  }

  async function removeFriend(friendshipId) {
    try {
      await base44.entities.Friendship.delete(friendshipId);
      load();
    } catch {
      /* ignore */
    }
  }

  function friendName(f) {
    return f.requester_id === userId ? f.recipient_name : f.requester_name;
  }
  function friendId(f) {
    return f.requester_id === userId ? f.recipient_id : f.requester_id;
  }

  if (!loaded || loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-900/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Friends</h1>
          <p className="mt-1 text-sm text-zinc-400">Chat with collectors in real time.</p>
        </div>
        <button
          onClick={() => setShowAdd((s) => !s)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform hover:scale-105",
            showAdd ? "border border-white/15 text-white" : "bg-gradient-to-r from-amber-300 to-orange-500 text-black"
          )}
        >
          <UserPlus className="h-4 w-4" />
          {showAdd ? "Close" : "Add Friend"}
        </button>
      </div>

      {showAdd && <AddFriendPanel onClose={() => setShowAdd(false)} onSent={load} />}

      {/* Pending requests received */}
      {pendingReceived.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <Clock className="h-4 w-4" /> Friend Requests ({pendingReceived.length})
          </h2>
          <div className="space-y-2">
            {pendingReceived.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-sm font-bold text-amber-300">
                    {(friendName(f) || "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{friendName(f)}</p>
                    <p className="text-xs text-zinc-500">wants to be your friend</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(f.id, "accepted")}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => respond(f.id, "declined")}
                    className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-400 transition-colors hover:bg-zinc-700"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending requests sent */}
      {pendingSent.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
            <Clock className="h-4 w-4" /> Sent Requests ({pendingSent.length})
          </h2>
          <div className="space-y-2">
            {pendingSent.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-400">
                    {(friendName(f) || "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{friendName(f)}</p>
                    <p className="text-xs text-zinc-500">Pending response</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFriend(f.id)}
                  className="text-xs font-semibold text-zinc-500 hover:text-red-400"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-zinc-400">
          <Users className="h-4 w-4" /> Your Friends ({accepted.length})
        </h2>
        {accepted.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">No friends yet. Add someone to start chatting!</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              <UserPlus className="h-4 w-4" /> Add a friend
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {accepted.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-4 transition-colors hover:bg-zinc-900/60">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 text-sm font-bold text-amber-300">
                    {(friendName(f) || "?")[0]?.toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-white">{friendName(f)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTradeTarget({ id: friendId(f), name: friendName(f) })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2 text-xs font-bold text-black transition-transform hover:scale-105"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Trade
                  </button>
                  <button
                    onClick={() => navigate(`/chat/${friendId(f)}`, { state: { friendName: friendName(f) } })}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-4 py-2 text-xs font-bold text-black transition-transform hover:scale-105"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Chat
                  </button>
                  <button
                    onClick={() => removeFriend(f.id)}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {tradeTarget && (
        <TradeDialog
          friendId={tradeTarget.id}
          friendName={tradeTarget.name}
          onClose={() => setTradeTarget(null)}
        />
      )}
    </div>
  );
}