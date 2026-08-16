import React, { useEffect, useMemo, useState } from "react";
import { Trophy, Gem, Crown, Layers, Sparkles, RefreshCw, Flame, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PullToRefresh from "@/components/PullToRefresh";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const [rankings, setRankings] = useState([]);
  const [dailyRankings, setDailyRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("vault"); // vault | daily | sets

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (tab === "daily") {
        const res = await base44.functions.invoke("get-daily-leaderboard", {});
        if (res.data?.error) throw new Error(res.data.error);
        setDailyRankings(res.data?.rankings || []);
      } else {
        const res = await base44.functions.invoke("get-collector-leaderboard", {});
        if (res.data?.error) throw new Error(res.data.error);
        setRankings(res.data?.rankings || []);
      }
    } catch (e) {
      setError(e.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  const sorted = useMemo(() => {
    if (tab === "daily") return dailyRankings;
    const copy = [...rankings];
    if (tab === "sets") {
      copy.sort((a, b) => b.completed_sets - a.completed_sets || b.vault_value - a.vault_value);
    } else {
      copy.sort((a, b) => b.vault_value - a.vault_value || b.completed_sets - a.completed_sets);
    }
    return copy;
  }, [rankings, dailyRankings, tab]);

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3, 50);

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Collector Leaderboard</h1>
          <p className="mt-1 text-sm text-zinc-400">
            The top collectors on PackPulseDrops, ranked by total vault value and completed sets. Chase the crown.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="shrink-0 rounded-full border border-white/10 p-2.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { k: "daily", l: "Daily Gems", icon: Flame },
          { k: "vault", l: "Vault Value", icon: Gem },
          { k: "sets", l: "Completed Sets", icon: Layers },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.k
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.l}
          </button>
        ))}
      </div>

      {tab === "daily" && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-xs text-orange-300">
          <Clock className="h-3.5 w-3.5" />
          Resets at midnight UTC — earn gems from pack rips and marketplace sales to climb today's board.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
          <Trophy className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No collectors ranked yet. Rip some packs to claim the throne!</p>
        </div>
      ) : (
        <>
          {/* Podium — top 3 */}
          {podium.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {podium.map((r, i) => (
                <PodiumCard key={r.user_id} rank={i} collector={r} metric={tab} />
              ))}
            </div>
          )}

          {/* Rest of the board */}
          {rest.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
              {rest.map((r, i) => (
                <div
                  key={r.user_id}
                  className={cn("flex items-center gap-4 px-4 py-3.5", i !== rest.length - 1 && "border-b border-white/5")}
                >
                  <span className="w-8 shrink-0 text-center text-sm font-bold text-zinc-500">{i + 4}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{r.name}</p>
                    <p className="truncate text-xs text-zinc-500">
                      {tab === "daily"
                        ? `${r.pulls_today || 0} pulls · ${r.unique_cards} unique today`
                        : `${r.unique_cards} unique cards · ${r.completed_sets} ${r.completed_sets === 1 ? "set" : "sets"}`}
                    </p>
                  </div>
                  {tab === "daily" ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-orange-300">
                      <Flame className="h-3.5 w-3.5" /> {(r.gems_today || 0).toLocaleString()}
                    </span>
                  ) : tab === "vault" ? (
                    <span className="flex items-center gap-1 text-sm font-bold text-amber-300">
                      <Gem className="h-3.5 w-3.5 fill-amber-300" /> {(r.vault_value || 0).toLocaleString()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm font-bold text-sky-300">
                      <Layers className="h-3.5 w-3.5" /> {r.completed_sets}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </PullToRefresh>
  );
}

function PodiumCard({ rank, collector, metric }) {
  const styles = [
    { ring: "ring-amber-400/40", bg: "from-amber-400/15 to-amber-600/5", text: "text-amber-300", label: "1st", icon: Crown },
    { ring: "ring-zinc-300/30", bg: "from-zinc-300/10 to-zinc-500/5", text: "text-zinc-200", label: "2nd", icon: Trophy },
    { ring: "ring-orange-600/30", bg: "from-orange-600/10 to-orange-800/5", text: "text-orange-300", label: "3rd", icon: Trophy },
  ];
  const s = styles[rank] || styles[2];
  const Icon = s.icon;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b p-5 ring-1", s.bg, s.ring)}>
      <div className="flex items-center justify-between">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest", s.text)}>
          <Icon className="h-4 w-4" /> {s.label}
        </span>
        <Sparkles className={cn("h-4 w-4", s.text)} />
      </div>
      <p className="mt-4 truncate text-lg font-bold text-white">{collector.name}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className={cn("flex items-center gap-1 text-2xl font-bold", s.text)}>
            {metric === "daily" ? (
              <><Flame className="h-5 w-5 fill-current" /> {(collector.gems_today || 0).toLocaleString()}</>
            ) : metric === "vault" ? (
              <><Gem className="h-5 w-5 fill-current" /> {(collector.vault_value || 0).toLocaleString()}</>
            ) : (
              <><Layers className="h-5 w-5" /> {collector.completed_sets}</>
            )}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {metric === "daily" ? "gems today" : metric === "vault" ? "vault value" : "completed sets"}
          </p>
        </div>
        <div className="text-right">
          {metric === "daily" ? (
            <>
              <p className="text-sm font-semibold text-zinc-300">{collector.pulls_today || 0}</p>
              <p className="text-xs text-zinc-500">pulls today</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-300">{collector.unique_cards}</p>
              <p className="text-xs text-zinc-500">unique cards</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}