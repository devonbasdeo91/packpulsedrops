import React from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign } from "lucide-react";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { isPromoActive, promoUsd } from "@/lib/promo";
import PackRatingBadge from "@/components/PackRatingBadge";

const categoryStyle = {
  yugioh: { chip: "bg-violet-500/15 text-violet-300", label: "Yu-Gi-Oh" },
  baseball: { chip: "bg-emerald-500/15 text-emerald-300", label: "Baseball" },
  pokemon: { chip: "bg-yellow-500/15 text-yellow-300", label: "Pokémon" },
  dragonball: { chip: "bg-orange-500/15 text-orange-300", label: "Dragon Ball Z" },
  digimon: { chip: "bg-cyan-500/15 text-cyan-300", label: "Digimon" },
  basketball: { chip: "bg-orange-600/15 text-orange-400", label: "Basketball" },
  naruto: { chip: "bg-amber-500/15 text-amber-300", label: "Naruto" },
  bleach: { chip: "bg-sky-500/15 text-sky-300", label: "Bleach" },
  football: { chip: "bg-amber-600/15 text-amber-400", label: "Football" },
  soccer: { chip: "bg-green-500/15 text-green-300", label: "Soccer" },
  cricket: { chip: "bg-green-600/15 text-green-300", label: "Cricket" },
  tennis: { chip: "bg-lime-500/15 text-lime-300", label: "Tennis" },
  wnba: { chip: "bg-orange-500/15 text-orange-300", label: "WNBA" },
  nhl: { chip: "bg-sky-400/15 text-sky-300", label: "NHL" },
  golf: { chip: "bg-emerald-600/15 text-emerald-300", label: "Golf" },
  badminton: { chip: "bg-blue-500/15 text-blue-300", label: "Badminton" },
  tabletennis: { chip: "bg-rose-500/15 text-rose-300", label: "Table Tennis" },
  swimming: { chip: "bg-cyan-500/15 text-cyan-300", label: "Swimming" },
  trackfield: { chip: "bg-amber-500/15 text-amber-300", label: "Track & Field" },
  f1: { chip: "bg-red-500/15 text-red-300", label: "Formula 1" },
};

export default function PackPriceGrid({ packs }) {
  const navigate = useNavigate();
  if (!packs.length) return null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-400">All packs</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular-nums text-zinc-500">{packs.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {packs.map((pack) => {
          const s = categoryStyle[pack.category] || { chip: "bg-white/10 text-zinc-300", label: pack.category ? pack.category.charAt(0).toUpperCase() + pack.category.slice(1) : "Pack" };
          return (
            <button
              key={pack.id}
              onClick={() => navigate(`/rip/${pack.id}`)}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 text-left transition-all hover:border-amber-400/30 hover:bg-zinc-900/80"
            >
              <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950">
                {pack.image_url ? (
                  <Image src={pack.image_url} alt={pack.name} fittingType="fill" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800/50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className={cn("absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider", s.chip)}>
                  {s.label}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-2.5">
                <p className="line-clamp-1 text-xs font-semibold text-white">{pack.name}</p>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-300">
                    <DollarSign className="h-3 w-3 text-amber-300" />
                    {isPromoActive() ? (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 line-through">${pack.price_usd.toFixed(2)}</span>
                        <span>${promoUsd(pack.price_usd).toFixed(2)}</span>
                      </span>
                    ) : (
                      <span>${pack.price_usd.toFixed(2)}</span>
                    )}
                  </span>
                  <PackRatingBadge packId={pack.id} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}