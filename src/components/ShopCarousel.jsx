import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const AUTO_INTERVAL = 5000;

export default function ShopCarousel({ packs }) {
  const navigate = useNavigate();
  const slides = packs.slice(0, 8);
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(slides.length, 1));
  }, [slides.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + slides.length) % Math.max(slides.length, 1));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(t);
  }, [next, slides.length]);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  if (!slides.length) return null;
  const safeIndex = Math.min(index, slides.length - 1);
  const current = slides[safeIndex];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 shadow-2xl">
      <div className="relative aspect-[16/9] sm:aspect-[21/9]">
        <AnimatePresence mode="wait">
          <motion.div
          key={current.id + "-" + safeIndex}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={current.image_url}
              alt={current.name}
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Slide content */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div className="max-w-lg">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3 w-3" />
                Featured
              </span>
              <h2 className="mt-2 font-heading text-2xl font-bold text-white sm:text-3xl">{current.name}</h2>
              {current.description && (
                <p className="mt-1 line-clamp-2 text-sm text-zinc-300">{current.description}</p>
              )}
              <button
                onClick={() => navigate(`/rip/${current.id}`)}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
              >
                Rip now
              </button>
            </div>
          </div>
        </div>

        {/* Arrows */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/40 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-6 bg-amber-400" : "w-2 bg-white/30 hover:bg-white/50"
                )}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}