import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Trophy, Crown, Gem, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

const MEDALS = [
  { ring: "ring-amber-400/40", text: "text-amber-300", bg: "from-amber-400/15 to-amber-600/5" },
  { ring: "ring-zinc-300/30", text: "text-zinc-200", bg: "from-zinc-300/10 to-zinc-500/5" },
  { ring: "ring-orange-600/30", text: "text-orange-300", bg: "from-orange-600/10 to-orange-800/5" },
];

export default function LeaderboardWidget() {
  const [rankings, setRankings] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("get-gem-leaderboard", {});
      if (res.data?.error) return;
      setRankings(res.data?.rankings || []);
      setMyRank(res.data?.myRank || null);
    } catch {
      /* ignore — widget is non-critical */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh when anyone rips a pack (Pull create) or completes a trade
  // (Trade update — accepted trades move gems between users).
  useEffect(() => {
    const trigger = () => {
      setPulse(true);
      load().finally(() => setTimeout(() => setPulse(false), 800));
    };
    const unsubPull = base44.entities.Pull.subscribe((e) => {
      if (e.type === "create") trigger();
    });
    const unsubTrade = base44.entities.Trade.subscribe((e) => {
      if (e.type === "update" && e.data?.status === "accepted") trigger();
    });
    return () => { unsubPull(); unsubTrade(); };
  }, [load]);

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-white">Top Collectors</h2>
            <p className="text-xs text-zinc-500">Ranked by total gems · live</p>
          </div>
        </div>
        <Link to="/leaderboard" className="text-xs font-semibold text-amber-300 hover:text-amber-200">
          View all →
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
          ))
        ) : rankings.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-zinc-500">
            No collectors yet. Rip a pack to claim the top spot!
          </p>
        ) : (
          rankings.map((r, i) => {
            const m = MEDALS[i] || null;
            return (
              <div
                key={r.user_id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                  pulse && "animate-pulse",
                  m
                    ? cn("border-white/10 bg-gradient-to-r ring-1", m.bg, m.ring)
                    : "border-white/5 bg-white/5"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/30 text-xs font-bold tabular-nums">
                  {i === 0 ? <Crown className={cn("h-4 w-4", m?.text)} /> : i + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                  {r.name}
                </p>
                <span className="flex items-center gap-1 text-sm font-bold tabular-nums text-amber-300">
                  <Gem className="h-3.5 w-3.5 fill-amber-300" />
                  {r.gems.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Current user's rank if outside top 5 */}
      {myRank && myRank.rank > 5 && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-xs font-bold tabular-nums text-amber-300">
            {myRank.rank}
          </span>
          <p className="text-sm font-semibold text-zinc-300">You</p>
          <span className="ml-auto flex items-center gap-1 text-sm font-bold tabular-nums text-amber-300">
            <Gem className="h-3.5 w-3.5 fill-amber-300" />
            {myRank.gems.toLocaleString()}
          </span>
        </div>
      )}
    </section>
  );
}