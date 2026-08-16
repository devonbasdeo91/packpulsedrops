import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";

const CARD_COUNT = 15;
const VISIBLE_RANGE = 3;
const SPIN_INTERVAL = 180;

export default function CardCarousel({ onSelect, accent = "#f59e0b" }) {
  const [index, setIndex] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const haptics = useHaptics();

  useEffect(() => {
    if (!spinning) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % CARD_COUNT);
    }, SPIN_INTERVAL);
    return () => clearInterval(interval);
  }, [spinning]);

  const stopSpin = () => setSpinning(false);

  const next = () => { stopSpin(); setIndex((i) => (i + 1) % CARD_COUNT); };
  const prev = () => { stopSpin(); setIndex((i) => (i - 1 + CARD_COUNT) % CARD_COUNT); };

  const handleSelect = () => {
    stopSpin();
    setSelecting(true);
    onSelect();
  };

  const cards = [];
  for (let off = -VISIBLE_RANGE; off <= VISIBLE_RANGE; off++) {
    const cardIdx = (index + off + CARD_COUNT * 2) % CARD_COUNT;
    cards.push({ key: `${cardIdx}-${off}`, cardIdx, offset: off });
  }

  return (
    <div className="relative flex flex-col items-center gap-6">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-bold uppercase tracking-widest text-amber-300"
      >
        {spinning ? "Cards are rotating — tap choose to stop!" : "Pick a card — swipe to browse"}
      </motion.p>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={(_, info) => {
          stopSpin();
          const flick = Math.abs(info.velocity.x) > 300;
          const dragged = Math.abs(info.offset.x) > 25;
          if (!flick && !dragged) return;
          haptics.medium();
          if (info.offset.x < 0) next();
          else prev();
        }}
        className="relative flex h-72 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        {cards.map(({ key, cardIdx, offset }) => {
          const absOff = Math.abs(offset);
          const isActive = offset === 0;
          return (
            <motion.div
              key={key}
              initial={false}
              animate={{
                x: offset * 80,
                scale: isActive ? 1.25 : Math.max(0.6, 1 - absOff * 0.15),
                opacity: absOff > VISIBLE_RANGE ? 0 : Math.max(0.2, 1 - absOff * 0.22),
                zIndex: 20 - absOff,
                rotateY: offset * -12,
              }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              className="absolute flex h-56 w-40 items-center justify-center"
              style={{ transformStyle: "preserve-3d" }}
            >
              <div
                className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-2xl"
                style={{
                  borderColor: isActive ? accent : "rgba(255,255,255,0.08)",
                  boxShadow: isActive ? `0 0 60px ${accent}55, 0 0 120px ${accent}30` : "0 10px 30px rgba(0,0,0,0.5)",
                }}
              >
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 opacity-20" style={{ background: `linear-gradient(115deg, transparent 30%, ${accent} 50%, transparent 70%)`, backgroundSize: "200% 200%", animation: "holo-shimmer 4s ease-in-out infinite" }} />
                )}
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: `${accent}30` }}
                >
                  <Sparkles className="h-4 w-4" style={{ color: accent }} />
                </div>
                <p className="mt-3 font-heading text-3xl font-bold text-zinc-700">?</p>
                <div className="mt-2 h-1 w-12 rounded-full" style={{ background: `${accent}40` }} />
                <p className="mt-3 text-[10px] uppercase tracking-widest text-zinc-700">
                  {cardIdx + 1}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          className="rounded-full border border-white/15 p-3 text-white transition-colors hover:bg-white/5"
          aria-label="Previous card"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={handleSelect}
          disabled={selecting}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-3.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
        >
          {selecting ? "Opening…" : spinning ? "Stop & choose" : "Choose this card"}
        </button>
        <button
          onClick={next}
          className="rounded-full border border-white/15 p-3 text-white transition-colors hover:bg-white/5"
          aria-label="Next card"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        The card you get is random — your pick adds the thrill of the chase.
      </p>
    </div>
  );
}