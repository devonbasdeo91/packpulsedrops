import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, X, ArrowRight, Layers } from "lucide-react";
import TradingCard from "@/components/TradingCard";

export default function PurchaseConfirmDialog({ purchase, onClose }) {
  const navigate = useNavigate();
  if (!purchase) return null;

  const { card_name, category, rarity, value_gems, ask_price_gems, image_url, subset } = purchase;
  const paidUsd = ((ask_price_gems || value_gems || 0) * 0.0035).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border border-white/10 bg-zinc-950 p-6"
      >
        <div className="flex items-start justify-between">
          <h2 className="font-heading text-xl font-bold text-white">Purchase complete!</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
          >
            <CheckCircle2 className="h-14 w-14 text-emerald-400" />
          </motion.div>

          <div className="w-40">
            <TradingCard
              card={{ name: card_name, category, rarity, value_gems, image_url, subset }}
              flipped={false}
            />
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-zinc-400">Card</span>
              <span className="text-sm font-semibold text-white">{card_name}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-zinc-400">Rarity</span>
              <span className="text-sm font-semibold text-white">{rarity}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
              <span className="text-sm text-emerald-300/80">Price paid</span>
              <span className="text-sm font-bold text-emerald-300">${paidUsd}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => { onClose(); navigate("/collection"); }}
            className="flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-left transition-colors hover:bg-amber-400/10"
          >
            <span className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-amber-300" />
              <span>
                <span className="block text-sm font-semibold text-white">View in collection</span>
                <span className="block text-xs text-zinc-400">See your new card in the vault</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-amber-300" />
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
          >
            Keep browsing
          </button>
        </div>
      </motion.div>
    </div>
  );
}