import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Gem, Sparkles, Eye, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { isPromoActive, promoUsd } from "@/lib/promo";
import { base44 } from "@/api/base44Client";
import PackContentsDialog from "@/components/PackContentsDialog";

const categoryStyle = {
  yugioh: { ring: "ring-violet-500/40", chip: "bg-violet-500/15 text-violet-300", label: "Yu-Gi-Oh", glow: "shadow-violet-500/30" },
  baseball: { ring: "ring-emerald-500/40", chip: "bg-emerald-500/15 text-emerald-300", label: "Baseball", glow: "shadow-emerald-500/30" },
  pokemon: { ring: "ring-yellow-500/40", chip: "bg-yellow-500/15 text-yellow-300", label: "Pokémon", glow: "shadow-yellow-500/30" },
  dragonball: { ring: "ring-orange-500/40", chip: "bg-orange-500/15 text-orange-300", label: "Dragon Ball Z", glow: "shadow-orange-500/30" },
  digimon: { ring: "ring-cyan-500/40", chip: "bg-cyan-500/15 text-cyan-300", label: "Digimon", glow: "shadow-cyan-500/30" },
  basketball: { ring: "ring-orange-600/40", chip: "bg-orange-600/15 text-orange-400", label: "Basketball", glow: "shadow-orange-500/30" },
  naruto: { ring: "ring-amber-500/40", chip: "bg-amber-500/15 text-amber-300", label: "Naruto", glow: "shadow-amber-500/30" },
  bleach: { ring: "ring-sky-500/40", chip: "bg-sky-500/15 text-sky-300", label: "Bleach", glow: "shadow-sky-500/30" },
  football: { ring: "ring-amber-600/40", chip: "bg-amber-600/15 text-amber-400", label: "Football", glow: "shadow-amber-500/30" },
  soccer: { ring: "ring-green-500/40", chip: "bg-green-500/15 text-green-300", label: "Soccer", glow: "shadow-green-500/30" },
  cricket: { ring: "ring-green-600/40", chip: "bg-green-600/15 text-green-300", label: "Cricket", glow: "shadow-green-500/30" },
  tennis: { ring: "ring-lime-500/40", chip: "bg-lime-500/15 text-lime-300", label: "Tennis", glow: "shadow-lime-500/30" },
  wnba: { ring: "ring-orange-500/40", chip: "bg-orange-500/15 text-orange-300", label: "WNBA", glow: "shadow-orange-500/30" },
  nhl: { ring: "ring-sky-400/40", chip: "bg-sky-400/15 text-sky-300", label: "NHL", glow: "shadow-sky-400/30" },
  golf: { ring: "ring-emerald-600/40", chip: "bg-emerald-600/15 text-emerald-300", label: "Golf", glow: "shadow-emerald-500/30" },
  badminton: { ring: "ring-blue-500/40", chip: "bg-blue-500/15 text-blue-300", label: "Badminton", glow: "shadow-blue-500/30" },
  tabletennis: { ring: "ring-rose-500/40", chip: "bg-rose-500/15 text-rose-300", label: "Table Tennis", glow: "shadow-rose-500/30" },
  swimming: { ring: "ring-cyan-500/40", chip: "bg-cyan-500/15 text-cyan-300", label: "Swimming", glow: "shadow-cyan-500/30" },
  trackfield: { ring: "ring-amber-500/40", chip: "bg-amber-500/15 text-amber-300", label: "Track & Field", glow: "shadow-amber-500/30" },
  f1: { ring: "ring-red-500/40", chip: "bg-red-500/15 text-red-300", label: "Formula 1", glow: "shadow-red-500/30" },
};

// Shortest circular offset between item i and the current index.
function getOffset(i, index, length) {
  if (length <= 1) return 0;
  let offset = i - index;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

export default function PackCoverflow({ packs }) {
  const [index, setIndex] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pool, setPool] = useState([]);
  const [poolPackId, setPoolPackId] = useState(null);
  const [loadingPool, setLoadingPool] = useState(false);
  const navigate = useNavigate();
  const startX = useRef(0);
  const startY = useRef(0);
  const moved = useRef(false);

  // Reset carousel when the pack list changes (e.g. category filter switch)
  const packIds = packs.map((p) => p.id).join(",");
  useEffect(() => {
    setIndex(0);
    setPool([]);
    setPoolPackId(null);
  }, [packIds]);

  // Clear cached pool when switching to a different pack in the carousel
  useEffect(() => {
    setPool([]);
    setPoolPackId(null);
  }, [index]);

  const next = useCallback(() => {
    if (packs.length <= 1) return;
    setIndex((i) => (i + 1) % packs.length);
  }, [packs.length]);

  const prev = useCallback(() => {
    if (packs.length <= 1) return;
    setIndex((i) => (i - 1 + packs.length) % packs.length);
  }, [packs.length]);

  if (!packs.length) return null;
  const current = packs[index];
  const s = categoryStyle[current.category] || { ring: "ring-white/10", chip: "bg-white/10 text-zinc-300", label: current.category ? current.category.charAt(0).toUpperCase() + current.category.slice(1) : "Pack", glow: "shadow-amber-500/20" };

  async function handlePreview() {
    setPreviewOpen(true);
    if (poolPackId === current.id || loadingPool) return;
    setLoadingPool(true);
    try {
      const cards = await base44.entities.Card.filter({ pack_id: current.id });
      setPool(cards);
      setPoolPackId(current.id);
    } catch {
      setPool([]);
    } finally {
      setLoadingPool(false);
    }
  }

  function handlePointerDown(e) {
    startX.current = e.clientX;
    startY.current = e.clientY;
    moved.current = false;
  }

  function handlePointerMove(e) {
    if (Math.abs(e.clientX - startX.current) > 10 || Math.abs(e.clientY - startY.current) > 10) {
      moved.current = true;
    }
  }

  function handlePointerEnd(e) {
    if (!moved.current) return;
    const diff = e.clientX - startX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev();
      else next();
    }
  }

  return (
    <div className="relative">
      {/* 3D Coverflow carousel */}
      <div className="relative">
        <div
          className="relative flex items-center justify-center overflow-hidden py-10"
          style={{ perspective: "1200px", minHeight: "300px", touchAction: "pan-y" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
        >
          {/* Floor gradient for depth */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          {packs.map((pack, i) => {
            const offset = getOffset(i, index, packs.length);
            const absOffset = Math.abs(offset);
            if (absOffset > 3) return null;

            const isActive = offset === 0;
            const cs = categoryStyle[pack.category] || { ring: "ring-white/10", chip: "bg-white/10 text-zinc-300", label: pack.category ? pack.category.charAt(0).toUpperCase() + pack.category.slice(1) : "Pack", glow: "shadow-amber-500/20" };

            return (
              <motion.div
                key={pack.id}
                animate={{
                  x: offset * 170,
                  scale: 1 - absOffset * 0.18,
                  rotateY: offset * -35,
                  opacity: absOffset > 2 ? 0 : 1 - absOffset * 0.2,
                  zIndex: 20 - absOffset,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                style={{ transformStyle: "preserve-3d" }}
                className="absolute cursor-pointer"
                onClick={() => {
                  if (moved.current) return;
                  if (isActive) navigate(`/rip/${pack.id}`);
                  else setIndex(i);
                }}
              >
                <div
                  className={cn(
                    "relative w-40 overflow-hidden rounded-2xl border bg-zinc-900/80 ring-1 backdrop-blur-sm transition-shadow sm:w-48",
                    isActive ? cn("border-amber-400/40 shadow-2xl", cs.glow) : "border-white/10",
                    cs.ring
                  )}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-950">
                    {pack.image_url ? (
                      <Image src={pack.image_url} alt={pack.name} fittingType="fill" loading="eager" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Sparkles className="h-10 w-10 text-amber-400/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {pack.featured && (
                      <span className="absolute left-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                        Featured
                      </span>
                    )}
                    <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", cs.chip)}>
                      {cs.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Navigation arrows */}
        {packs.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-1 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Previous pack"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-1 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              aria-label="Next pack"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Info panel for center pack */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-md px-4 text-center"
        >
          <h2 className="font-heading text-xl font-bold text-white sm:text-2xl">{current.name}</h2>
          {current.description && (
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-zinc-400">{current.description}</p>
          )}
          <div className="mt-3 flex items-center justify-center gap-1.5 font-semibold text-amber-300">
            <Gem className="h-4 w-4 fill-amber-300" />
            {isPromoActive() ? (
              <span className="flex items-center gap-1.5">
                <span className="text-zinc-500 line-through">${current.price_usd.toFixed(2)}</span>
                <span>${promoUsd(current.price_usd).toFixed(2)}</span>
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">-20%</span>
              </span>
            ) : (
              <>From ${current.price_usd.toFixed(2)}</>
            )}
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate(`/rip/${current.id}`)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              Rip now
            </button>
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-amber-300"
            >
              {loadingPool ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              See inside
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      {packs.length > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {packs.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-6 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"
              )}
              aria-label={`Pack ${i + 1}`}
            />
          ))}
        </div>
      )}

      <PackContentsDialog open={previewOpen} onOpenChange={setPreviewOpen} pack={current} pool={pool} />
    </div>
  );
}