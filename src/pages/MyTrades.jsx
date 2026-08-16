import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import TradingCard from "@/components/TradingCard";
import StarRating from "@/components/StarRating";
import SellerRatingBadge from "@/components/SellerRatingBadge";
import ReviewDialog from "@/components/ReviewDialog";
import TradeRequests from "@/components/TradeRequests";
import { Gem, ArrowLeftRight, MessageSquare, CheckCircle2, Banknote } from "lucide-react";
import { useCardArt } from "@/hooks/useCardArt";
import { formatUsd } from "@/lib/gemValue";
import { toast } from "@/components/ui/use-toast";

const PLATFORM_FEE = 0.05;

export default function MyTrades() {
  const { userId, loaded, refresh } = useWallet();
  const [bought, setBought] = useState([]);
  const [sold, setSold] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [paying, setPaying] = useState(false);

  const artItems = [...bought, ...sold].map((l) => ({ key: l.id, card_name: l.card_name, category: l.category, rarity: l.rarity, listing_id: l.id, image_url: l.image_url }));
  const art = useCardArt(artItems);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const [b, s, r] = await Promise.all([
        base44.entities.Listing.filter({ buyer_id: userId, status: "sold" }, "-sold_date", 100),
        base44.entities.Listing.filter({ seller_id: userId, status: "sold" }, "-sold_date", 100),
        base44.entities.Review.list("-created_date", 200),
      ]);
      setBought(b || []);
      setSold(s || []);
      setReviews(r || []);
    } catch {
      setBought([]);
      setSold([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (loaded) load();
  }, [loaded, userId]);

  const myReviewFor = (listingId) =>
    reviews.find((rv) => rv.listing_id === listingId && rv.reviewer_id === userId);

  const statsFor = (uid) => {
    const list = reviews.filter((rv) => rv.reviewee_id === uid);
    if (!list.length) return { avg: 0, count: 0 };
    return { avg: list.reduce((s, r) => s + r.rating, 0) / list.length, count: list.length };
  };

  const payableSold = sold.filter((l) => !l.withdrawal_request_id);
  const selectedTotal = payableSold
    .filter((l) => selected.has(l.id))
    .reduce((s, l) => s + Math.round(l.ask_price_gems * (1 - PLATFORM_FEE)), 0);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () => {
    if (selected.size === payableSold.length) setSelected(new Set());
    else setSelected(new Set(payableSold.map((l) => l.id)));
  };

  const requestBulkPayout = async () => {
    if (selected.size === 0) return;
    setPaying(true);
    try {
      const res = await base44.functions.invoke("request-bulk-payout", { listing_ids: [...selected] });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "Bulk payout requested",
        description: `${res.data.count} sale${res.data.count > 1 ? "s" : ""} · ${res.data.amount_gems.toLocaleString()} gems → $${res.data.amount_usd.toFixed(2)}`,
      });
      setSelected(new Set());
      await refresh();
      await load();
    } catch (e) {
      toast({
        title: "Payout failed",
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  function TradeRow({ listing, role, selectable, selected, onToggle }) {
    const myReview = myReviewFor(listing.id);
    const counterpartyName = role === "buyer" ? listing.seller_name : listing.buyer_name;
    const counterpartyLabel = role === "buyer" ? "Seller" : "Buyer";
    const counterpartyId = role === "buyer" ? listing.seller_id : listing.buyer_id;
    const cp = statsFor(counterpartyId);
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-4 sm:flex-row sm:items-center">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(listing.id)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-white/20 bg-white/5 accent-amber-400 sm:mt-0"
          />
        )}
        <div className="w-24 shrink-0">
          <TradingCard card={{ ...listing, name: listing.card_name }} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white">{listing.card_name}</h3>
          <p className="text-xs text-zinc-500">{listing.category} · {listing.rarity}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <span>{counterpartyLabel}:</span>
            <span className="text-zinc-200">{counterpartyName || "Unknown"}</span>
            <SellerRatingBadge avg={cp.avg} count={cp.count} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-amber-300">
            <span className="flex items-center gap-1">
              <Gem className="h-3.5 w-3.5 fill-amber-300" /> {listing.ask_price_gems.toLocaleString()} gems
            </span>
            <span className="text-[11px] font-bold text-emerald-300">Card value {formatUsd(listing.value_gems)}</span>
            {role === "seller" && listing.withdrawal_request_id && (
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                Payout requested
              </span>
            )}
          </div>
        </div>
        <div className="sm:w-48">
          {myReview ? (
            <div className="text-sm">
              <div className="flex items-center gap-1 text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> Reviewed
              </div>
              <div className="mt-1">
                <StarRating value={myReview.rating} size={14} />
              </div>
              {myReview.comment && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{myReview.comment}</p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setReviewTarget({ listing, role })}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              <MessageSquare className="h-4 w-4" /> Rate {counterpartyLabel.toLowerCase()}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!loaded || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white flex items-center gap-3">
          <ArrowLeftRight className="h-7 w-7 text-amber-400" /> My Trades
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Rate your counterparties and request bulk payouts for your completed sales.
        </p>
      </div>

      <TradeRequests />

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-white">Purchases</h2>
        {bought.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-8 text-center text-sm text-zinc-400">
            No purchases yet. <Link to="/marketplace" className="text-amber-300">Browse the marketplace</Link>.
          </p>
        ) : (
          <div className="space-y-3">
            {bought.map((l) => (
              <TradeRow key={l.id} listing={{ ...l, image_url: l.image_url || art[l.id] }} role="buyer" />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-bold text-white">Sales</h2>
          {payableSold.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-2">
              <button onClick={selectAll} className="text-xs font-semibold text-zinc-300 hover:text-white">
                {selected.size === payableSold.length ? "Clear all" : "Select all"}
              </button>
              <span className="text-sm text-zinc-300">
                {selected.size > 0
                  ? `${selected.size} selected · ${selectedTotal.toLocaleString()} gems`
                  : `${payableSold.length} available for payout`}
              </span>
              <button
                onClick={requestBulkPayout}
                disabled={selected.size === 0 || paying}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Banknote className="h-4 w-4" />
                {paying ? "Requesting…" : "Request bulk payout"}
              </button>
            </div>
          )}
        </div>
        {sold.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-8 text-center text-sm text-zinc-400">
            No sales yet. List cards from your collection to start selling.
          </p>
        ) : (
          <div className="space-y-3">
            {sold.map((l) => (
              <TradeRow
                key={l.id}
                listing={{ ...l, image_url: l.image_url || art[l.id] }}
                role="seller"
                selectable={!l.withdrawal_request_id}
                selected={selected.has(l.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </section>

      <ReviewDialog
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        listing={reviewTarget?.listing}
        role={reviewTarget?.role}
        onSubmitted={load}
      />
    </div>
  );
}