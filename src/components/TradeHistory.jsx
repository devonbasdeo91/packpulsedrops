import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import { ArrowLeftRight, Check, X, Loader2, Star, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import StarRating from "@/components/StarRating";

const GEM_TO_USD = 0.0035;

function usd(gems) {
  return `$${((gems || 0) * GEM_TO_USD).toFixed(2)}`;
}

function formatDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function TradeHistory() {
  const { userId, loaded } = useWallet();
  const [trades, setTrades] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loaded || !userId) return;
    let active = true;
    (async () => {
      try {
        const [tradeData, reviewData] = await Promise.all([
          base44.entities.Trade.list("-updated_date", 100),
          base44.entities.Review.filter({ reviewee_id: userId }, "-created_date", 50),
        ]);
        if (active) {
          setTrades(tradeData || []);
          setReviews(reviewData || []);
        }
      } catch {
        if (active) {
          setTrades([]);
          setReviews([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loaded, userId]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
    : 0;

  // Only completed trades (accepted or declined), most recent first
  const history = trades.filter((t) => t.status === "accepted" || t.status === "declined");

  return (
    <div className="space-y-6">
      {/* Reviews summary */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <MessageSquareQuote className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Reviews received</h2>
            <p className="text-xs text-zinc-400">What other collectors said after trading with you.</p>
          </div>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold text-amber-300">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-zinc-400">· {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-8 text-center">
            <p className="text-sm text-zinc-500">No reviews yet. Complete a trade and ask your partner to rate you!</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating || 0} size={14} />
                    <span className="text-xs font-semibold text-amber-300">{r.reviewer_role || "trader"}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{formatDate(r.created_date)}</span>
                </div>
                <p className="mt-2 text-sm text-white">
                  <b className="text-zinc-300">{r.reviewer_name || "A collector"}</b>
                  {r.card_name ? <> on <b className="text-sky-300">{r.card_name}</b></> : null}
                </p>
                {r.comment && <p className="mt-1 text-sm text-zinc-400 italic">"{r.comment}"</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Completed trades */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Trade history</h2>
            <p className="text-xs text-zinc-400">Your completed card trades and their outcomes.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-8 text-center">
            <p className="text-sm text-zinc-500">No completed trades yet. When you accept or a friend accepts a trade, it'll show up here.</p>
          </div>
        ) : (
          <ol className="space-y-3">
            {history.map((t) => {
              const incoming = t.recipient_id === userId;
              const accepted = t.status === "accepted";
              const partnerName = incoming ? t.requester_name : t.recipient_name;
              return (
                <li key={t.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-4">
                  <div className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    accepted ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
                  )}>
                    {accepted ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">
                      {accepted ? (
                        incoming
                          ? <>Traded <b className="text-amber-300">{t.requested_card_name}</b> for <b className="text-sky-300">{t.offered_card_name}</b> with {partnerName}</>
                          : <>Traded <b className="text-amber-300">{t.offered_card_name}</b> for <b className="text-sky-300">{t.requested_card_name}</b> with {partnerName}</>
                      ) : (
                        incoming
                          ? <>Declined <b>{partnerName}</b>'s offer of <b className="text-sky-300">{t.offered_card_name}</b> for your <b className="text-amber-300">{t.requested_card_name}</b></>
                          : <>Your offer of <b className="text-amber-300">{t.offered_card_name}</b> for <b className="text-sky-300">{t.requested_card_name}</b> was declined by {partnerName}</>
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        accepted ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
                      )}>
                        {t.status}
                      </span>
                      <span>·</span>
                      <span>{formatDate(t.updated_date || t.created_date)}</span>
                      <span>·</span>
                      <span>{usd(t.offered_value_gems)} ↔ {usd(t.requested_value_gems)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}