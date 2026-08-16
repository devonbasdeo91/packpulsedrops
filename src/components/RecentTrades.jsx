import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const CAT_LABEL = {
  yugioh: "Yu-Gi-Oh", pokemon: "Pokémon", dragonball: "Dragon Ball", digimon: "Digimon",
  baseball: "Baseball", basketball: "Basketball", naruto: "Naruto", bleach: "Bleach",
  football: "Football", soccer: "Soccer", cricket: "Cricket", tennis: "Tennis",
  wnba: "WNBA", nhl: "NHL", golf: "Golf", badminton: "Badminton",
  tabletennis: "Table Tennis", swimming: "Swimming", trackfield: "Track & Field",
};

const CAT_COLOR = {
  yugioh: "text-violet-300", pokemon: "text-yellow-300", dragonball: "text-orange-300",
  digimon: "text-cyan-300", baseball: "text-emerald-300", basketball: "text-orange-300",
  naruto: "text-amber-300", bleach: "text-sky-300", football: "text-amber-300",
  soccer: "text-green-300", cricket: "text-green-300", tennis: "text-lime-300",
  wnba: "text-orange-300", nhl: "text-sky-300", golf: "text-emerald-300",
  badminton: "text-blue-300", tabletennis: "text-rose-300", swimming: "text-cyan-300",
  trackfield: "text-amber-300",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function RecentTrades() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("get-recent-trades", {});
      setTrades(res.data?.trades || []);
    } catch {
      setTrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Auto-refresh when a trade is accepted anywhere on the platform.
    const unsub = base44.entities.Trade.subscribe((e) => {
      if (e.type === "update" && e.data?.status === "accepted") load();
    });
    return unsub;
  }, [load]);

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
          <h2 className="font-heading text-2xl font-bold text-white">Recent trades</h2>
          <p className="mt-1 text-sm text-zinc-400">See what collectors are swapping right now.</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center">
          <ArrowLeftRight className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No completed trades yet. Be the first to swap!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900/80 to-zinc-950 p-4"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <ArrowLeftRight className="h-5 w-5" />
              </span>

              {/* Offered card */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{t.offered_card_name}</p>
                <p className={`text-xs ${CAT_COLOR[t.offered_category] || "text-zinc-400"}`}>
                  {CAT_LABEL[t.offered_category] || t.offered_category} · {t.offered_rarity}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  from <Link to={`/profile/${t.requester_id}`} className="text-zinc-400 hover:text-amber-300 hover:underline">{t.requester_name}</Link>
                </p>
              </div>

              <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" />

              {/* Requested card */}
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-bold text-white">{t.requested_card_name}</p>
                <p className={`text-xs ${CAT_COLOR[t.requested_category] || "text-zinc-400"}`}>
                  {CAT_LABEL[t.requested_category] || t.requested_category} · {t.requested_rarity}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-500">
                  to <Link to={`/profile/${t.recipient_id}`} className="text-zinc-400 hover:text-amber-300 hover:underline">{t.recipient_name}</Link>
                </p>
              </div>

              <span className="hidden shrink-0 text-[11px] text-zinc-600 sm:block">
                {timeAgo(t.created_date)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}