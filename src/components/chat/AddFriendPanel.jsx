import React, { useState } from "react";
import { Search, UserPlus, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "@/components/ui/use-toast";

export default function AddFriendPanel({ onClose, onSent }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState(new Set());

  async function search(q) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await base44.functions.invoke("search-users", { query: q });
      setResults(res.data?.users || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(user) {
    try {
      const me = await base44.auth.me();
      await base44.entities.Friendship.create({
        requester_id: me.id,
        requester_name: me.full_name || (me.email ? me.email.split("@")[0] : "User"),
        recipient_id: user.id,
        recipient_name: user.full_name,
        status: "pending",
      });
      setSentIds((prev) => new Set([...prev, user.id]));
      toast({ title: "Friend request sent!", description: `Sent to ${user.full_name}` });
      onSent?.();
    } catch (e) {
      toast({ title: "Could not send request", description: e.message, variant: "destructive" });
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Add a friend</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-xl border border-white/10 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400/50"
          autoFocus
        />
      </div>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
        {searching && <p className="py-4 text-center text-sm text-zinc-500">Searching…</p>}
        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-500">No users found.</p>
        )}
        {!searching && query.trim().length < 2 && (
          <p className="py-4 text-center text-sm text-zinc-500">Type at least 2 characters to search.</p>
        )}
        {results.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950/50 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{u.full_name}</p>
              <p className="truncate text-xs text-zinc-500">{u.email}</p>
            </div>
            {sentIds.has(u.id) ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <Check className="h-4 w-4" /> Sent
              </span>
            ) : (
              <button
                onClick={() => sendRequest(u)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/10"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}