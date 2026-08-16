import React from "react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { RARITY_STYLES } from "@/components/TradingCard";

// A flat, art-forward card for the vault grid: the artwork fills the card and
// the dollar value + rarity are overlaid so everything is visible at a glance
// without tapping or tilting. Holographic foil is kept for rare cards only.
export default function VaultCard({ card, onClick }) {
  const r = RARITY_STYLES[card.rarity] || RARITY_STYLES.Common;
  const name = card.name || card.card_name || "";
  const value = ((card.value_gems || 0) * 0.0035).toFixed(2);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative block w-full aspect-[2.5/3.5] overflow-hidden rounded-xl text-left ring-1 transition-transform duration-300 hover:scale-[1.03]",
        r.glow,
        r.ring
      )}
    >
      {card.image_url ? (
        <Image
          src={card.image_url}
          alt={name}
          fittingType="fill"
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-2xl font-bold text-white/70">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Dark gradient so overlaid text stays legible */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

      {/* Holographic foil for rare cards only */}
      {r.holo && <div className="pointer-events-none absolute inset-0 holo-foil opacity-60" />}

      {/* Rarity badge */}
      <span className={cn("absolute left-1.5 top-1.5 rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest", r.text)}>
        {r.label}
      </span>

      {/* Name + dollar value */}
      <div className="absolute inset-x-0 bottom-0 p-2">
        <p className="truncate text-xs font-bold leading-tight text-white drop-shadow">{name}</p>
        <p className="mt-0.5 text-sm font-extrabold text-emerald-300 drop-shadow">${value}</p>
      </div>
    </button>
  );
}