import React from "react";
import { Star, ArrowLeftRight, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A collectible-card-style "trader card" that showcases a user's reputation:
 * username, average review rating, and total completed trades.
 *
 * @param {object} props
 * @param {string} props.username       Display name for the trader.
 * @param {number} props.avgRating       Average review rating (0–5).
 * @param {number} props.reviewCount    Total number of reviews received.
 * @param {number} props.completedTrades Total completed trades.
 * @param {string} [props.joinedDate]   ISO date string for "since" label.
 * @param {string} [props.className]    Extra classes for the wrapper.
 */
export default function TraderCard({
  username = "Collector",
  avgRating = 0,
  reviewCount = 0,
  completedTrades = 0,
  joinedDate,
  className = "",
}) {
  const initial = (username || "C").charAt(0).toUpperCase();
  const roundedRating = Math.round(avgRating);
  const isElite = avgRating >= 4.5 && reviewCount >= 5;
  const isVerified = avgRating > 0 && reviewCount > 0;

  const joinedLabel = joinedDate
    ? new Date(joinedDate).toLocaleDateString(undefined, { year: "numeric", month: "short" })
    : "—";

  return (
    <div className={cn("relative mx-auto w-full max-w-sm", className)}>
      {/* Outer frame */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-[1.5px] shadow-2xl transition-transform duration-300",
          isElite
            ? "border-amber-300/40 shadow-amber-500/10"
            : "border-white/15 shadow-black/40"
        )}
      >
        {/* Inner card */}
        <div className="relative overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-zinc-900/95 to-black px-6 pb-6 pt-7">
          {/* Holographic shimmer for elite traders */}
          {isElite && (
            <div className="pointer-events-none absolute inset-0 holo-foil opacity-30" />
          )}

          {/* Top bar — brand + tier badge */}
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
              <Sparkles className="h-3 w-3" />
              PackPulseDrops
            </div>
            {isElite ? (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 to-yellow-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                <Award className="h-3 w-3" /> Elite Trader
              </span>
            ) : isVerified ? (
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Verified
              </span>
            ) : (
              <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                New Trader
              </span>
            )}
          </div>

          {/* Avatar + username */}
          <div className="relative mt-5 flex flex-col items-center text-center">
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl text-3xl font-extrabold text-black shadow-lg",
                isElite
                  ? "bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 shadow-amber-500/30"
                  : "bg-gradient-to-br from-zinc-200 to-zinc-400 shadow-black/30"
              )}
            >
              {initial}
            </div>
            <h2 className="mt-3 font-heading text-xl font-bold text-white">{username}</h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">
              Trader since {joinedLabel}
            </p>
          </div>

          {/* Rating display */}
          <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Reputation
              </span>
              <span className="font-heading text-lg font-bold text-amber-300">
                {reviewCount > 0 ? avgRating.toFixed(1) : "—"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-5 w-5 transition-colors",
                    i < roundedRating
                      ? "fill-amber-300 text-amber-300"
                      : "text-zinc-700"
                  )}
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[11px] text-zinc-500">
              {reviewCount > 0
                ? `Based on ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
                : "No reviews yet"}
            </p>
          </div>

          {/* Completed trades stat */}
          <div className="relative mt-3 flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <ArrowLeftRight className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Completed Trades
                </p>
                <p className="font-heading text-lg font-bold text-white">
                  {completedTrades}
                </p>
              </div>
            </div>
            <p className="text-right text-[11px] text-zinc-500">
              {completedTrades === 0
                ? "No swaps yet"
                : completedTrades === 1
                ? "1 successful swap"
                : "Successful swaps"}
            </p>
          </div>

          {/* Bottom foil strip */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 h-1",
              isElite
                ? "bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300"
                : "bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700"
            )}
          />
        </div>
      </div>
    </div>
  );
}