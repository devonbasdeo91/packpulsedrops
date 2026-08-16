import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowLeftRight, Gem, Star, Package, MessageSquare, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import StarRating from "@/components/StarRating";
import TraderCard from "@/components/TraderCard";
import { cn } from "@/lib/utils";

const CAT_LABEL = {
  yugioh: "Yu-Gi-Oh", pokemon: "Pokémon", dragonball: "Dragon Ball", digimon: "Digimon",
  baseball: "Baseball", basketball: "Basketball", naruto: "Naruto", bleach: "Bleach",
  football: "Football", soccer: "Soccer", cricket: "Cricket", tennis: "Tennis",
  wnba: "WNBA", nhl: "NHL", golf: "Golf", badminton: "Badminton",
  tabletennis: "Table Tennis", swimming: "Swimming", trackfield: "Track & Field",
};

const RARITY_COLOR = {
  "Common": "text-zinc-400", "Rare": "text-blue-300", "Super Rare": "text-violet-300",
  "Ultra Rare": "text-amber-300", "Secret Rare": "text-pink-300", "Ghost Rare": "text-cyan-200",
  "1/1": "text-rose-300", "Diamond": "text-cyan-200", "Auto": "text-amber-300",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "today";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
      <div className="flex items-center gap-2 text-zinc-500">
        <Icon className={cn("h-4 w-4", accent)} />
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-heading text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function Profile() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.functions
      .invoke("get-user-profile", { user_id: userId })
      .then((res) => {
        if (!alive) return;
        if (res.data?.error) { setError(true); }
        else { setData(res.data); }
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        <p className="text-zinc-400">This collector's profile isn't available.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-amber-300 hover:underline">Back home</Link>
      </div>
    );
  }

  const { profile, collectionValueGems, collectionValueUsd, collectionCount, topPulls, recentTrades, reviews, avgRating, reviewCount } = data;
  const displayName = profile.username || profile.full_name || "Collector";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link to={-1} className="mb-4 inline-flex rounded-lg border border-white/10 p-2 text-zinc-300 hover:bg-white/5" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <TraderCard
          username={displayName}
          avgRating={avgRating}
          reviewCount={reviewCount}
          completedTrades={recentTrades.length}
          joinedDate={profile.created_date}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Gem} label="Collection Value" value={`$${collectionValueUsd.toFixed(2)}`} sub={`${collectionValueGems.toLocaleString()} gems`} accent="text-amber-300" />
        <StatCard icon={Package} label="Cards Owned" value={collectionCount} sub="digital collectibles" accent="text-violet-300" />
        <StatCard icon={ArrowLeftRight} label="Trades Done" value={recentTrades.length} sub="completed swaps" accent="text-emerald-300" />
        <StatCard icon={Star} label="Rating" value={reviewCount > 0 ? avgRating.toFixed(1) : "—"} sub={`${reviewCount} review${reviewCount === 1 ? "" : "s"}`} accent="text-yellow-300" />
      </div>

      {/* Top pulls preview */}
      {topPulls?.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-300" />
            <h2 className="font-heading text-xl font-bold text-white">Top pulls</h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {topPulls.map((p, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
                <div className="aspect-[3/4] w-full bg-zinc-800">
                  {p.image_url && <Image src={p.image_url} alt={p.card_name} fittingType="fill" className="h-full w-full object-cover" />}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold text-white">{p.card_name}</p>
                  <p className={cn("text-xs", RARITY_COLOR[p.rarity] || "text-zinc-400")}>{p.rarity}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-300">
                    <Gem className="h-3 w-3 fill-amber-300" />{(p.value_gems || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent trades */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-emerald-300" />
          <h2 className="font-heading text-xl font-bold text-white">Recent trades</h2>
        </div>
        {recentTrades.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
            No completed trades yet.
          </div>
        ) : (
          <div className="space-y-3">
            {recentTrades.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <ArrowLeftRight className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{t.offered_card_name}</p>
                  <p className="text-xs text-zinc-500">{CAT_LABEL[t.offered_category] || t.offered_category} · {t.offered_rarity}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1 text-right">
                  <p className="truncate text-sm font-bold text-white">{t.requested_card_name}</p>
                  <p className="text-xs text-zinc-500">{CAT_LABEL[t.requested_category] || t.requested_category} · {t.requested_rarity}</p>
                </div>
                <span className="hidden shrink-0 text-[11px] text-zinc-600 sm:block">{timeAgo(t.created_date)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-sky-300" />
          <h2 className="font-heading text-xl font-bold text-white">Reviews</h2>
          {reviewCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-400/15 px-2 py-0.5 text-xs font-bold text-yellow-300">
              <Star className="h-3 w-3 fill-yellow-300" />{avgRating.toFixed(1)} · {reviewCount}
            </span>
          )}
        </div>
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 text-center text-sm text-zinc-500">
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-300">
                      {(r.reviewer_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{r.reviewer_name || "Anonymous"}</p>
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">{r.reviewer_role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("h-3.5 w-3.5", i < r.rating ? "fill-yellow-300 text-yellow-300" : "text-zinc-700")} />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="mt-3 text-sm text-zinc-300 select-text" data-selectable="true">{r.comment}</p>}
                <p className="mt-2 text-[11px] text-zinc-600">{timeAgo(r.created_date)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}