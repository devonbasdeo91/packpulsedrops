import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { Gem, CheckCircle2 } from "lucide-react";
import TradingCard from "@/components/TradingCard";
import CardFlip from "@/components/CardFlip";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

const CARD_W = 130;
const CARD_H = 182;
const GAP = 8;
const STRIDE = CARD_W + GAP;
const REEL_LEN = 24;
const TARGET = 20;
const SPIN_MS = 2000;

const SWIPE_OFFSET = 50;
const SWIPE_VELOCITY = 250;

function CardBack() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 ring-1 ring-zinc-600/40">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-amber-400/20" />
        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest text-amber-300/50">PackPulseDrops</p>
      </div>
    </div>
  );
}

export default function SpinningCardReel({ cards, onReveal, onAllRevealed }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("spinning"); // spinning | revealed
  const [revealedList, setRevealedList] = useState([]);
  const [flying, setFlying] = useState(false);
  const dragX = useMotionValue(0);
  const haptics = useHaptics();

  // 3D transforms derived from drag — subtle tilt during drag, dramatic rotation during fly-away
  const rotateY = useTransform(dragX, [-500, -200, 0, 200, 500], [-45, -15, 0, 15, 45]);
  const rotate = useTransform(dragX, [-300, 0, 300], [-12, 0, 12]);
  const scale = useTransform(dragX, [-500, -150, 0, 150, 500], [0.5, 1.08, 1, 1.08, 0.5]);
  const opacity = useTransform(dragX, [-500, -200, -60, 0, 60, 200, 500], [0, 0.5, 0.98, 1, 0.98, 0.5, 0]);
  // Next card "rises up" as the current card is dragged away
  const nextScale = useTransform(dragX, [-150, 0, 150], [1, 0.92, 1]);
  const nextOpacity = useTransform(dragX, [-150, 0, 150], [0.7, 0.4, 0.7]);
  const nextY = useTransform(dragX, [-150, 0, 150], [0, 10, 0]);
  const shadow = useTransform(
    dragX,
    [-200, 0, 200],
    ["0 25px 70px rgba(0,0,0,0.7)", "0 12px 35px rgba(0,0,0,0.4)", "0 25px 70px rgba(0,0,0,0.7)"]
  );

  const current = cards[idx];
  const finalX = -(TARGET * STRIDE + CARD_W / 2);

  useEffect(() => {
    if (!current) return;
    setPhase("spinning");
    const t = setTimeout(() => {
      setPhase("revealed");
      onReveal?.(current);
      setRevealedList((prev) => [...prev, current]);
    }, SPIN_MS);
    return () => clearTimeout(t);
  }, [idx, current]);

  function nextCard() {
    if (idx + 1 >= cards.length) {
      onAllRevealed?.();
      return;
    }
    setIdx((i) => i + 1);
  }

  function prevCard() {
    if (idx > 0) setIdx((i) => i - 1);
  }

  function handleSwipeEnd(_, info) {
    if (phase !== "revealed" || flying) return;
    const flick = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    const dragged = Math.abs(info.offset.x) > SWIPE_OFFSET;
    if (!flick && !dragged) return;
    haptics.medium();
    const dir = info.offset.x < 0 ? -1 : 1;
    setFlying(true);
    // 3D fly-away: card rotates and fades out in 3D space
    animate(dragX, dir * 500, {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        dragX.set(0);
        setFlying(false);
        if (dir < 0) nextCard();
        else prevCard();
      },
    });
  }

  if (!cards || cards.length === 0) return null;

  return (
    <div className="relative flex flex-col items-center gap-5">
      {/* Progress dots — visual indicator instead of "1/15" text */}
      <div className="flex items-center gap-1.5">
        {cards.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === idx ? "w-6 bg-amber-400" : i < idx ? "w-1.5 bg-amber-400/40" : "w-1.5 bg-white/15"
            )}
          />
        ))}
      </div>

      {/* 3D perspective stage */}
      <div className="relative w-full" style={{ perspective: "1200px", height: CARD_H + 60 }}>
        {/* Spinning reel (slot machine) */}
        {phase === "spinning" ? (
          <>
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-amber-400/50 shadow-[0_0_30px_rgba(251,191,36,0.25)]"
              style={{ width: CARD_W + 8, height: CARD_H + 8 }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-zinc-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-zinc-950 to-transparent" />
            <motion.div
              key={`spin-${idx}`}
              className="absolute top-1/2 left-1/2 flex -translate-y-1/2"
              initial={{ x: 0 }}
              animate={{ x: finalX }}
              transition={{ duration: SPIN_MS / 1000, ease: [0.12, 0.83, 0.25, 1] }}
            >
              {Array.from({ length: REEL_LEN }, (_, i) => (
                <div key={i} className="shrink-0" style={{ width: CARD_W, height: CARD_H, marginRight: GAP }}>
                  <CardBack />
                </div>
              ))}
            </motion.div>
          </>
        ) : (
          <>
            {/* Card stack behind — depth layers (like a deck of cards) */}
            {cards[idx + 2] && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 0.84, opacity: 0.15, y: 20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <div style={{ width: CARD_W, height: CARD_H }}>
                  <CardBack />
                </div>
              </motion.div>
            )}
            {cards[idx + 1] && (
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ scale: nextScale, opacity: nextOpacity, y: nextY, willChange: "transform" }}
              >
                <div style={{ width: CARD_W, height: CARD_H }}>
                  <CardBack />
                </div>
              </motion.div>
            )}

            {/* Current card — 3D tilt + fly-away */}
            <div
              key={`reveal-${idx}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Entrance wrapper — card pops forward from behind */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0, rotateY: -180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Drag wrapper — 3D tilt during drag, fly-away on swipe */}
                <motion.div
                  className="cursor-grab touch-none select-none active:cursor-grabbing"
                  style={{ x: dragX, rotateY, rotate, scale, opacity, boxShadow: shadow, transformStyle: "preserve-3d", willChange: "transform" }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  dragMomentum={false}
                  onDragStart={() => haptics.light()}
                  onDragEnd={handleSwipeEnd}
                  whileTap={{ scale: 0.97 }}
                >
                  <CardFlip card={current} revealed={true} delay={0.15} size="w-[130px]" />
                </motion.div>
              </motion.div>
            </div>
          </>
        )}
      </div>

      {/* Card info */}
      <AnimatePresence mode="wait">
        {phase === "revealed" && (
          <motion.div
            key={`info-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="font-heading text-lg font-bold text-white">{current?.name || current?.card_name}</p>
            <p className="text-sm font-semibold text-amber-300">{current?.rarity}</p>
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-amber-300">
                <Gem className="h-4 w-4 fill-amber-300" />
                {current?.value_gems || 0} gems
              </span>
              <span className="text-sm font-bold text-emerald-300">
                ${((current?.value_gems || 0) * 0.0035).toFixed(2)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish button — only shown on the last card */}
      {phase === "revealed" && idx + 1 >= cards.length && (
        <button
          onClick={() => { haptics.medium(); onAllRevealed?.(); }}
          disabled={flying}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-3 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" /> Finish
        </button>
      )}

      {/* Swipe hint — only on the first card */}
      {phase === "revealed" && idx === 0 && cards.length > 1 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-medium text-zinc-500"
        >
          ← Swipe left to reveal the next card
        </motion.p>
      )}

      {/* Previously revealed cards */}
      {revealedList.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {revealedList.slice(0, -1).map((c, i) => (
            <div key={i} className="w-16 opacity-60">
              <TradingCard card={c} flipped />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}