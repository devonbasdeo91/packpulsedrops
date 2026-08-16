import React, { useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import TradingCard from "@/components/TradingCard";
import StarRating from "@/components/StarRating";
import ReviewDialog from "@/components/ReviewDialog";
import { useHaptics } from "@/hooks/useHaptics";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeftRight, Check, X, Clock, Loader2, MessageSquare, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function TradeCard({ trade, incoming, onRespond, busy, myReview, onRate }) {
  const haptics = useHaptics();
  const dragX = useMotionValue(0);
  const tint = useTransform(
    dragX,
    [-120, -1, 0, 1, 120],
    ["rgba(239,68,68,0.2)", "rgba(239,68,68,0.05)", "rgba(0,0,0,0)", "rgba(16,185,129,0.05)", "rgba(16,185,129,0.2)"]
  );
  const offered = {
    name: trade.offered_card_name,
    category: trade.offered_category,
    rarity: trade.offered_rarity,
    value_gems: trade.offered_value_gems,
    image_url: trade.offered_image_url,
  };
  const requested = {
    name: trade.requested_card_name,
    category: trade.requested_category,
    rarity: trade.requested_rarity,
    value_gems: trade.requested_value_gems,
    image_url: trade.requested_image_url,
  };

  const statusColor =
    trade.status === "accepted" ? "text-emerald-300 bg-emerald-400/10" :
    trade.status === "declined" ? "text-red-300 bg-red-400/10" :
    "text-amber-300 bg-amber-400/10";

  const counterpartyName = incoming ? trade.requester_name : trade.recipient_name;

  const canSwipe = incoming && trade.status === "pending" && busy !== trade.id;

  function handleTradeDragEnd(_, info) {
    if (!canSwipe) return;
    if (info.offset.x > 80) {
      haptics.success();
      onRespond(trade.id, "accept");
    } else if (info.offset.x < -80) {
      haptics.heavy();
      onRespond(trade.id, "decline");
    }
  }

  return (
    <motion.div
      drag={canSwipe ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragStart={() => canSwipe && haptics.light()}
      onDragEnd={handleTradeDragEnd}
      style={{ x: dragX }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40 p-4 touch-none"
    >
      {canSwipe && (
        <motion.div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: tint }} />
      )}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-400">
          {incoming ? `From ${trade.requester_name}` : `To ${trade.recipient_name}`}
        </p>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold capitalize", statusColor)}>
          {trade.status}
        </span>
      </div>
      <div className="relative z-10 mt-3 flex items-center gap-3">
        <div className="w-24 shrink-0">
          <TradingCard card={offered} />
        </div>
        <div className="flex flex-1 flex-col items-center text-zinc-500">
          <ArrowLeftRight className="h-5 w-5 text-amber-400" />
          <span className="mt-1 text-[10px] uppercase tracking-widest">{incoming ? "offers you" : "you want"}</span>
        </div>
        <div className="w-24 shrink-0">
          <TradingCard card={requested} />
        </div>
      </div>
      {incoming && trade.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onRespond(trade.id, "accept")}
            disabled={busy === trade.id}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {busy === trade.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept
          </button>
          <button
            onClick={() => onRespond(trade.id, "decline")}
            disabled={busy === trade.id}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Decline
          </button>
        </div>
      )}
      {canSwipe && (
        <p className="relative z-10 mt-2 text-center text-[10px] text-zinc-500">Swipe right to accept · left to decline</p>
      )}
      {trade.status === "accepted" && (
        <div className="relative z-10 mt-3 border-t border-white/10 pt-3">
          {myReview ? (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span className="text-emerald-300">Reviewed</span>
              <StarRating value={myReview.rating} size={14} />
            </div>
          ) : (
            <button
              onClick={() => onRate(trade, counterpartyName)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-[1.02] sm:w-auto"
            >
              <MessageSquare className="h-4 w-4" /> Rate {counterpartyName ? counterpartyName : "trader"}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function TradeRequests() {
  const { userId, loaded } = useWallet();
  const [trades, setTrades] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [t, r] = await Promise.all([
        base44.entities.Trade.list("-created_date", 100),
        base44.entities.Review.filter({ reviewer_id: userId }, "-created_date", 200),
      ]);
      setTrades(t || []);
      setReviews(r || []);
    } catch {
      setTrades([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (loaded) load();
    const unsub = base44.entities.Trade.subscribe(() => load());
    return unsub;
  }, [loaded, load]);

  async function respond(tradeId, action) {
    setBusy(tradeId);
    try {
      const res = await base44.functions.invoke("respond-to-trade", { trade_id: tradeId, action });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: action === "accept" ? "Trade accepted!" : "Trade declined",
        description: action === "accept" ? "Cards have been swapped." : undefined,
      });
      await load();
    } catch (e) {
      toast({ title: "Failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  const myReviewForTrade = (tradeId) =>
    reviews.find((rv) => rv.trade_id === tradeId && rv.reviewer_id === userId);

  if (!loaded || loading) return null;

  const incoming = trades.filter((t) => t.recipient_id === userId);
  const outgoing = trades.filter((t) => t.requester_id === userId);
  const incomingPending = incoming.filter((t) => t.status === "pending");

  if (trades.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold text-white">
        <ArrowLeftRight className="h-5 w-5 text-amber-400" /> Trade Requests
      </h2>

      {incomingPending.length > 0 && (
        <div className="mb-4 space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-300">
            <Clock className="h-3.5 w-3.5" /> Pending ({incomingPending.length})
          </p>
          {incomingPending.map((t) => (
            <TradeCard key={t.id} trade={t} incoming onRespond={respond} busy={busy} />
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Incoming</p>
          {incoming.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-6 text-center text-xs text-zinc-500">No incoming trades.</p>
          ) : (
            <div className="space-y-3">
              {incoming.map((t) => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  incoming
                  onRespond={respond}
                  busy={busy}
                  myReview={myReviewForTrade(t.id)}
                  onRate={(trade, cpName) => setReviewTarget({ trade: { ...trade, counterpartyName: cpName } })}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Outgoing</p>
          {outgoing.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-6 text-center text-xs text-zinc-500">No outgoing trades.</p>
          ) : (
            <div className="space-y-3">
              {outgoing.map((t) => (
                <TradeCard
                  key={t.id}
                  trade={t}
                  incoming={false}
                  busy={busy}
                  myReview={myReviewForTrade(t.id)}
                  onRate={(trade, cpName) => setReviewTarget({ trade: { ...trade, counterpartyName: cpName } })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ReviewDialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        trade={reviewTarget?.trade}
        onSubmitted={load}
      />
    </section>
  );
}