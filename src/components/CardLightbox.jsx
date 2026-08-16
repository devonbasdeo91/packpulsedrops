import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { RARITY_STYLES } from "@/components/TradingCard";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/gemValue";

function initials(name) {
  if (!name || typeof name !== "string") return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function CardLightbox({ card, onClose, onGenerated }) {
  const [genUrl, setGenUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const onGenRef = useRef(onGenerated);
  onGenRef.current = onGenerated;

  useEffect(() => {
    setGenUrl("");
    if (!card || card.image_url) return;
    let cancelled = false;
    setGenerating(true);
    base44.functions
      .invoke("ensure-card-art", { card_name: card.card_name, category: card.category, rarity: card.rarity, pull_id: card.id })
      .then((res) => {
        if (cancelled) return;
        if (res.data?.image_url) {
          setGenUrl(res.data.image_url);
          onGenRef.current?.(res.data.image_url);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [card]);

  if (!card) return null;
  const r = RARITY_STYLES[card.rarity] || RARITY_STYLES.Common;
  const name = card.name || card.card_name || "";
  const imgSrc = card.image_url || genUrl;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="relative w-full max-w-md cursor-pointer"
      >
        <button
          onClick={onClose}
          className="absolute -right-2 -top-2 z-10 rounded-full border border-white/15 bg-zinc-900 p-2 text-zinc-300 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br ring-1 holo-sweep", r.glow, r.ring)}>
          {r.holo && <div className="pointer-events-none absolute inset-0 holo-foil" />}
          <div className="relative aspect-[2.5/3.5] w-full">
            {imgSrc ? (
              <Image src={imgSrc} alt={name} fittingType="fill" className="h-full w-full object-cover" />
            ) : generating ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-xs font-medium">Generating card art…</p>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-white/80">
                {initials(name)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-center">
          <p className="font-heading text-xl font-bold text-white">{name}</p>
          <p className={cn("text-sm font-semibold", r.text)}>{r.label}</p>
          {card.subset && <p className="text-xs text-zinc-400">{card.subset}</p>}
          <p className="text-xs font-bold text-emerald-300">{formatUsd(card.value_gems)}</p>
          {card.pack_name && <p className="mt-1 text-xs text-zinc-500">from {card.pack_name}</p>}
          <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Tap to close</p>
        </div>
      </motion.div>
    </motion.div>
  );
}