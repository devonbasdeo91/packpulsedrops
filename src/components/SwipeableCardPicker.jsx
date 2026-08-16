import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useHaptics } from "@/hooks/useHaptics";
import { cn } from "@/lib/utils";

const SWIPE_OFFSET = 35;
const SWIPE_VELOCITY = 300;

/**
 * A mobile-first swipeable card carousel for selecting a card from a list.
 * Used in trade dialogs so users can swipe through their collection instead
 * of scrolling a grid. One card is shown at a time; swipe left/right to browse,
 * tap to select. Arrow buttons provided for desktop.
 */
export default function SwipeableCardPicker({ cards, selectedId, onSelect, emptyLabel = "No cards available." }) {
  const [index, setIndex] = useState(0);
  const dragX = useMotionValue(0);
  const rotate = useTransform(dragX, [-120, 120], [-6, 6]);
  const haptics = useHaptics();

  if (!cards || cards.length === 0) {
    return <p className="py-8 text-center text-xs text-zinc-500">{emptyLabel}</p>;
  }

  const current = cards[index];
  const isSelected = selectedId === (current?.id || current?._id);

  function go(nextIdx) {
    const clamped = Math.max(0, Math.min(cards.length - 1, nextIdx));
    if (clamped !== index) {
      setIndex(clamped);
      haptics.light();
    }
  }

  function handleDragEnd(_, info) {
    const flick = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
    const dragged = Math.abs(info.offset.x) > SWIPE_OFFSET;
    if (!flick && !dragged) return;
    if (info.offset.x < 0) go(index + 1);
    else go(index - 1);
  }

  function handleSelect() {
    haptics.medium();
    onSelect(current);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Card carousel */}
      <div className="relative flex h-56 w-full items-center justify-center">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-zinc-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-zinc-950 to-transparent" />

        <AnimatePresence mode="wait">
          <motion.div
            key={current?.id || current?._id || index}
            className="absolute flex h-56 w-40 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            style={{ x: dragX, rotate, zIndex: 20 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => haptics.light()}
            onDragEnd={handleDragEnd}
            onClick={handleSelect}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
          >
            <div
              className={cn(
                "relative flex h-full w-full flex-col gap-1 overflow-hidden rounded-2xl border-2 p-2 transition-colors",
                isSelected ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-zinc-900/60"
              )}
            >
              {isSelected && (
                <div className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black">
                  <Check className="h-4 w-4" />
                </div>
              )}
              <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
                {current?.image_url ? (
                  <Image src={current.image_url} alt={current.card_name} fittingType="fill" loading="eager" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">No art</div>
                )}
              </div>
              <p className="truncate text-xs font-bold text-white">{current?.card_name}</p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">{current?.rarity}</span>
                <span className="font-bold text-amber-300">${((current?.value_gems || 0) * 0.0035).toFixed(2)}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Counter + arrows */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="rounded-full border border-white/15 p-2 text-white transition-colors hover:bg-white/5 disabled:opacity-30"
          aria-label="Previous card"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-zinc-400 tabular-nums">
          {index + 1} / {cards.length}
        </span>
        <button
          onClick={() => go(index + 1)}
          disabled={index >= cards.length - 1}
          className="rounded-full border border-white/15 p-2 text-white transition-colors hover:bg-white/5 disabled:opacity-30"
          aria-label="Next card"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <button
        onClick={handleSelect}
        className={cn(
          "rounded-full px-6 py-2 text-sm font-bold transition-transform hover:scale-105",
          isSelected
            ? "bg-emerald-500 text-white"
            : "bg-gradient-to-r from-amber-300 to-orange-500 text-black"
        )}
      >
        {isSelected ? "✓ Selected" : "Tap to select"}
      </button>

      <p className="text-[11px] text-zinc-500">Swipe to browse · tap to select</p>
    </div>
  );
}