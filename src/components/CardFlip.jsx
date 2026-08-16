import React from "react";
import { motion } from "framer-motion";
import TradingCard, { RARITY_STYLES } from "@/components/TradingCard";
import { cn } from "@/lib/utils";

// Easing with a subtle settle — the card overshoots slightly then drops into place,
// mimicking the weight of a real card landing after being flipped.
const CARD_EASE = [0.34, 1.2, 0.64, 1];

export default function CardFlip({ card, revealed, delay = 0, size = "w-28 sm:w-36" }) {
  if (!card) return null;
  const r = RARITY_STYLES[card.rarity] || RARITY_STYLES.Common;
  return (
    <div className={cn("[perspective:1400px]", size)}>
      <motion.div
        initial={{ rotateY: 0, z: 0, scale: 1 }}
        animate={{
          rotateY: revealed ? 180 : 0,
          // Lift the card off the surface mid-flip, then settle back down —
          // simulates picking up a card to turn it over.
          z: revealed ? [0, 40, 0] : 0,
          // Slight scale bump at the midpoint of the flip gives the card
          // physical presence / weight as it rotates.
          scale: revealed ? [1, 1.04, 1] : 1,
        }}
        transition={{
          duration: 0.62,
          delay,
          ease: CARD_EASE,
          z: { duration: 0.62, times: [0, 0.5, 1], ease: "easeOut" },
          scale: { duration: 0.62, times: [0, 0.5, 1], ease: CARD_EASE },
        }}
        className="relative h-full w-full [transform-style:preserve-3d]"
        style={{ willChange: "transform" }}
      >
        {/* Back */}
        <div className="absolute inset-0 [backface-visibility:hidden]">
          <TradingCard card={card} flipped={false} />
        </div>
        {/* Front */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <TradingCard card={card} flipped={true} />
          <div className={cn("pointer-events-none absolute -inset-1 rounded-2xl opacity-0 blur-md transition-opacity duration-500", "bg-gradient-to-br", r.glow, revealed && "opacity-40")} />
        </div>
      </motion.div>
    </div>
  );
}