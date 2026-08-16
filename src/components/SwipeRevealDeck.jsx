import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import TradingCard from "@/components/TradingCard";

const SWIPE_THRESHOLD = 90;

export default function SwipeRevealDeck({ cards, accent, onReveal, onAllRevealed }) {
  const [index, setIndex] = useState(0);
  const [fly, setFly] = useState(null);
  const [dragging, setDragging] = useState(false);

  // Live drag offset — used to drive a natural tilt and lift as the user pulls.
  const dragX = useMotionValue(0);
  // Tilt follows the drag direction (wrist rotation), capped for realism.
  const rotateZ = useTransform(dragX, [-200, 200], [-9, 9]);
  // The further you pull, the more the card resists (subtle scale-down = tension).
  const dragScale = useTransform(dragX, [-200, 0, 200], [0.97, 1, 0.97]);
  // Shadow grows as the card lifts off the deck.
  const liftShadow = useTransform(dragX, [-200, 0, 200], ["0 18px 40px -8px rgba(0,0,0,0.65)", "0 6px 14px -6px rgba(0,0,0,0.45)", "0 18px 40px -8px rgba(0,0,0,0.65)"]);

  function revealCurrent(dir) {
    if (fly || index >= cards.length) return;
    const card = cards[index];
    setFly({ dir });
    onReveal?.(card);
    window.setTimeout(() => {
      setFly(null);
      setIndex((i) => {
        const next = i + 1;
        if (next >= cards.length) onAllRevealed?.();
        return next;
      });
    }, 1050);
  }

  function handleDragEnd(_, info) {
    setDragging(false);
    if (fly) return;
    const dir = info.offset.x < -SWIPE_THRESHOLD ? -1 : info.offset.x > SWIPE_THRESHOLD ? 1 : 0;
    if (dir !== 0) revealCurrent(dir);
  }

  function handleTap() {
    if (fly || index >= cards.length) return;
    revealCurrent(1);
  }

  const current = cards[index];
  const nextCard = cards[index + 1];
  const allRevealed = index >= cards.length;

  return (
    <div className="relative flex flex-col items-center gap-8">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-bold uppercase tracking-widest text-amber-300"
      >
        {allRevealed ? "All cards revealed" : `Swipe to reveal · ${index} of ${cards.length}`}
      </motion.p>

      <div className="relative flex h-80 w-full items-center justify-center">
        {/* Next card (depth) */}
        {nextCard && (
          <motion.div
            key={`bg-${index}`}
            initial={{ scale: 0.9, y: 16, opacity: 0.5 }}
            animate={{ scale: 0.92, y: 18, opacity: 0.45 }}
            className="absolute h-64 w-44"
          >
            <TradingCard card={nextCard} flipped={false} />
          </motion.div>
        )}

        {/* Current swipeable card */}
        {current && (
          <motion.div
            key={`cur-${index}`}
            drag={!fly ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            // Lower elastic = more resistance; the card fights back like a real card.
            dragElastic={0.12}
            onDragStart={() => setDragging(true)}
            onDragEnd={handleDragEnd}
            onClick={handleTap}
            style={{
              x: fly ? undefined : dragX,
              rotateZ: fly ? undefined : rotateZ,
              scale: fly ? undefined : dragScale,
              boxShadow: fly ? undefined : liftShadow,
              zIndex: 10,
            }}
            initial={{ x: 0, rotateY: 0, rotateZ: 0, opacity: 1, scale: 1 }}
            animate={
              fly
                ? { x: fly.dir * 60, y: -16, rotateY: 720, rotateZ: fly.dir * 8, scale: 1.15, opacity: [1, 1, 0] }
                : { x: 0, y: 0, rotateY: 0, rotateZ: 0, scale: dragging ? 0.98 : 1, opacity: 1 }
            }
            transition={
              fly
                ? { duration: 1.0, ease: [0.22, 1, 0.36, 1], opacity: { times: [0, 0.72, 1], ease: "easeIn" } }
                : { type: "spring", stiffness: 260, damping: 28, mass: 1.1 }
            }
            whileTap={{ scale: 0.97 }}
            className="absolute h-72 w-48 cursor-grab touch-none active:cursor-grabbing [transform-style:preserve-3d]"
          >
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <TradingCard card={current} flipped={false} />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <TradingCard card={current} flipped />
            </div>
          </motion.div>
        )}
      </div>

      {/* Revealed cards */}
      {index > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {cards.slice(0, index).map((c, i) => (
            <div key={i} className="w-24 sm:w-28 text-center">
              <TradingCard card={c} flipped />
              <p className="mt-1 text-[11px] font-semibold text-emerald-300">${((c.value_gems || 0) * 0.0035).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {!allRevealed && (
        <p className="text-xs text-zinc-500">Drag the card left or right to rip it — or tap to reveal.</p>
      )}
    </div>
  );
}