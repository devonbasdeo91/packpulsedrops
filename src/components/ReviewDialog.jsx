import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import StarRating from "@/components/StarRating";

export default function ReviewDialog({ open, onClose, listing, role, trade, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const isTrade = !!trade;
  const counterpartyName = isTrade
    ? trade.counterpartyName
    : role === "buyer" ? listing?.seller_name : listing?.buyer_name;
  const counterpartyLabel = isTrade ? "Trader" : (role === "buyer" ? "Seller" : "Buyer");
  const cardLabel = isTrade
    ? `${trade.offered_card_name} ↔ ${trade.requested_card_name}`
    : listing?.card_name;

  async function submit() {
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = isTrade
        ? { trade_id: trade.id, rating, comment }
        : { listing_id: listing.id, rating, comment };
      const res = await base44.functions.invoke("submit-review", payload);
      if (res.data?.error) throw new Error(res.data.error);
      setRating(0);
      setComment("");
      onSubmitted();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-white">
                {isTrade ? "Rate this trade" : "Rate this purchase"}
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                {counterpartyLabel}: <span className="text-zinc-200">{counterpartyName || "Unknown"}</span>
              </p>
              <p className="text-xs text-zinc-500">
                {isTrade ? "Cards: " : "Card: "}{cardLabel}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-zinc-300">Your rating</label>
            <div className="mt-2">
              <StarRating value={rating} onChange={setRating} size={28} />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold text-zinc-300">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Share your experience with this trader…"
              className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-amber-400/50"
            />
          </div>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit review
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}