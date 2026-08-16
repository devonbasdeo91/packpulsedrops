import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Gem, X, AlertTriangle, Wallet, Landmark, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useWallet } from "@/components/WalletProvider";

export default function SellCardDialog({ pull, onClose, onSold }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sold, setSold] = useState(false);
  const { refresh } = useWallet();
  const navigate = useNavigate();

  useEffect(() => {
    if (pull) {
      setError("");
      setSold(false);
    }
  }, [pull]);

  if (!pull) return null;

  const cardValueUsd = (pull.value_gems || 0) * 0.0035;
  const receivesUsd = cardValueUsd * 0.95;

  const handleConfirm = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await base44.functions.invoke("instant-sell-card", {
        pull_id: pull.id,
      });
      if (!res) throw new Error("No response from server");
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "Card sold!",
        description: `${pull.card_name} sold — $${receivesUsd.toFixed(2)} added to your wallet.`,
      });
      // Brief delay so the server write is committed before we re-read auth.me()
      await new Promise((r) => setTimeout(r, 400));
      try { await refresh(); } catch { /* wallet will re-sync on next visit */ }
      setSold(true);
      onSold();
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to sell card");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-white">Sell card</h2>
            <p className="mt-1 text-sm text-zinc-400">{pull.card_name} · {pull.rarity}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sold ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-5 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-sm font-semibold text-white">${receivesUsd.toFixed(2)} added to your wallet</p>
              <p className="text-xs text-zinc-400">The card has been removed from your vault.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">What's next?</p>
              <button
                onClick={() => { onClose(); navigate("/wallet"); }}
                className="flex w-full items-center justify-between rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-left transition-colors hover:bg-amber-400/10"
              >
                <span className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-amber-300" />
                  <span>
                    <span className="block text-sm font-semibold text-white">Cash out to bank</span>
                    <span className="block text-xs text-zinc-400">Withdraw your balance to your bank account</span>
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-amber-300" />
              </button>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10"
              >
                Keep in wallet
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-sm text-zinc-400">Card value</span>
                <span className="flex items-center gap-1 font-bold text-white">
                  <Gem className="h-4 w-4 fill-amber-300 text-amber-300" /> ${cardValueUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <span className="text-sm text-emerald-300/80">You receive (5% fee)</span>
                <span className="flex items-center gap-1 font-bold text-emerald-300">
                  <Wallet className="h-4 w-4" /> ${receivesUsd.toFixed(2)}
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-300/80">
                <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>The sale amount is added to your wallet instantly. The card is removed from your vault.</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2 text-sm font-bold text-black hover:scale-105 transition-transform disabled:opacity-60"
              >
                {busy ? "Selling…" : `Sell for $${receivesUsd.toFixed(2)}`}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}