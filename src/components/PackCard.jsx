import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Eye, Loader2, DollarSign } from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { isPromoActive, promoUsd } from "@/lib/promo";
import { PACK_TIERS, TIER_ORDER } from "@/lib/packTiers";
import { base44 } from "@/api/base44Client";

const MIN_TIER_PRICE = Math.min(...TIER_ORDER.map((t) => PACK_TIERS[t].price_usd));
import PackContentsDialog from "@/components/PackContentsDialog";
import PackCharacterAvatar from "@/components/PackCharacterAvatar";
import PackRatingBadge from "@/components/PackRatingBadge";

const categoryStyle = {
  yugioh: { ring: "ring-violet-500/40", chip: "bg-violet-500/15 text-violet-300", label: "Yu-Gi-Oh" },
  baseball: { ring: "ring-emerald-500/40", chip: "bg-emerald-500/15 text-emerald-300", label: "Baseball" },
  pokemon: { ring: "ring-yellow-500/40", chip: "bg-yellow-500/15 text-yellow-300", label: "Pokémon" },
  dragonball: { ring: "ring-orange-500/40", chip: "bg-orange-500/15 text-orange-300", label: "Dragon Ball Z" },
  digimon: { ring: "ring-cyan-500/40", chip: "bg-cyan-500/15 text-cyan-300", label: "Digimon" },
  basketball: { ring: "ring-orange-600/40", chip: "bg-orange-600/15 text-orange-400", label: "Basketball" },
  naruto: { ring: "ring-amber-500/40", chip: "bg-amber-500/15 text-amber-300", label: "Naruto" },
  bleach: { ring: "ring-sky-500/40", chip: "bg-sky-500/15 text-sky-300", label: "Bleach" },
  football: { ring: "ring-amber-600/40", chip: "bg-amber-600/15 text-amber-400", label: "Football" },
  soccer: { ring: "ring-green-500/40", chip: "bg-green-500/15 text-green-300", label: "Soccer" },
  cricket: { ring: "ring-green-600/40", chip: "bg-green-600/15 text-green-300", label: "Cricket" },
  tennis: { ring: "ring-lime-500/40", chip: "bg-lime-500/15 text-lime-300", label: "Tennis" },
  wnba: { ring: "ring-orange-500/40", chip: "bg-orange-500/15 text-orange-300", label: "WNBA" },
  nhl: { ring: "ring-sky-400/40", chip: "bg-sky-400/15 text-sky-300", label: "NHL" },
  golf: { ring: "ring-emerald-600/40", chip: "bg-emerald-600/15 text-emerald-300", label: "Golf" },
  badminton: { ring: "ring-blue-500/40", chip: "bg-blue-500/15 text-blue-300", label: "Badminton" },
  tabletennis: { ring: "ring-rose-500/40", chip: "bg-rose-500/15 text-rose-300", label: "Table Tennis" },
  swimming: { ring: "ring-cyan-500/40", chip: "bg-cyan-500/15 text-cyan-300", label: "Swimming" },
  trackfield: { ring: "ring-amber-500/40", chip: "bg-amber-500/15 text-amber-300", label: "Track & Field" },
  f1: { ring: "ring-red-500/40", chip: "bg-red-500/15 text-red-300", label: "Formula 1" },
};

export default function PackCard({ pack, showCharacter = false }) {
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pool, setPool] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);
  const s = categoryStyle[pack.category] || { ring: "ring-white/10", chip: "bg-white/10 text-zinc-300", label: pack.category ? pack.category.charAt(0).toUpperCase() + pack.category.slice(1) : "Pack" };

  async function handlePreview(e) {
    e.stopPropagation();
    setPreviewOpen(true);
    if (pool.length > 0 || loadingPool) return;
    setLoadingPool(true);
    try {
      const cards = await base44.entities.Card.filter({ pack_id: pack.id });
      setPool(cards);
    } catch {
      setPool([]);
    } finally {
      setLoadingPool(false);
    }
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60 ring-1 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-amber-500/20",
          s.ring
        )}
      >
        <button onClick={() => navigate(`/rip/${pack.id}`)} className="flex flex-1 flex-col text-left">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950">
            {pack.image_url ? (
              <Image src={pack.image_url} alt={pack.name} fittingType="fill" loading="eager" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Sparkles className="h-10 w-10 text-amber-400/40" />
              </div>
            )}
            {pack.featured && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                Featured
              </span>
            )}
            <span className={cn("absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", s.chip)}>
              {s.label}
            </span>
            {showCharacter && <PackCharacterAvatar packId={pack.id} category={pack.category} />}
          </div>

          <div className="mt-3 flex flex-1 flex-col px-4">
            <h3 className="font-heading text-base font-semibold text-white">{pack.name}</h3>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{pack.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                <DollarSign className="h-4 w-4 text-amber-300" />
                {isPromoActive() ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-zinc-500 line-through">${MIN_TIER_PRICE.toFixed(2)}</span>
                    <span>${promoUsd(MIN_TIER_PRICE).toFixed(2)}</span>
                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">-20%</span>
                  </span>
                ) : (
                  <>From ${MIN_TIER_PRICE.toFixed(2)}</>
                )}
              </span>
              <PackRatingBadge packId={pack.id} />
            </div>
          </div>
        </button>

        <button
          onClick={handlePreview}
          className="flex items-center justify-center gap-1.5 border-t border-white/10 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/5 hover:text-amber-300"
        >
          {loadingPool ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          See inside
        </button>
      </motion.div>

      <PackContentsDialog open={previewOpen} onOpenChange={setPreviewOpen} pack={pack} pool={pool} />
    </>
  );
}