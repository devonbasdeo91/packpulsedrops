import React from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, Layers, Sparkles } from "lucide-react";
import { PACK_TIERS, TIER_ORDER } from "@/lib/packTiers";
import { isPromoActive, promoUsd } from "@/lib/promo";
import CategoryImage from "@/components/CategoryImage";
import { cn } from "@/lib/utils";

const TIER_STYLE = {
  silver: { grad: "from-slate-400 to-slate-600", chip: "bg-slate-400/20 text-slate-200", ring: "ring-slate-400/30" },
  gold: { grad: "from-amber-300 to-yellow-600", chip: "bg-amber-400/20 text-amber-200", ring: "ring-amber-400/30" },
  crystal: { grad: "from-cyan-300 to-blue-500", chip: "bg-cyan-400/20 text-cyan-200", ring: "ring-cyan-400/30" },
  ruby: { grad: "from-rose-400 to-red-600", chip: "bg-rose-400/20 text-rose-200", ring: "ring-rose-400/30" },
  sapphire: { grad: "from-blue-400 to-indigo-600", chip: "bg-blue-400/20 text-blue-200", ring: "ring-blue-400/30" },
  emerald: { grad: "from-emerald-400 to-green-600", chip: "bg-emerald-400/20 text-emerald-200", ring: "ring-emerald-400/30" },
  diamond: { grad: "from-cyan-200 via-white to-violet-300", chip: "bg-white/20 text-white", ring: "ring-white/40" },
};

/**
 * Displays all 7 fixed-price tier packs for a category. Each tier card links
 * to the Rip page with the tier pre-selected via ?tier= so the user lands on
 * the correct price point. Uses the first available pack for the category as
 * the card pool; the tier determines pricing and odds.
 */
export default function TierPackGrid({ category, packs }) {
  const navigate = useNavigate();
  const firstPack = packs.length > 0 ? packs[0] : null;
  const promoOn = isPromoActive();

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-400">Pack tiers</h3>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular-nums text-zinc-500">{TIER_ORDER.length}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {TIER_ORDER.map((key) => {
          const t = PACK_TIERS[key];
          const s = TIER_STYLE[key] || TIER_STYLE.silver;
          const price = promoOn ? promoUsd(t.price_usd) : t.price_usd;
          return (
            <button
              key={key}
              onClick={() => firstPack && navigate(`/rip/${firstPack.id}?tier=${key}`)}
              disabled={!firstPack}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 text-left transition-all hover:scale-[1.03] hover:border-amber-400/30 hover:shadow-2xl hover:shadow-amber-500/10 disabled:opacity-50 disabled:hover:scale-100",
                s.ring && `ring-1 ${s.ring}`
              )}
            >
              {/* Category image background */}
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                {category ? (
                  <CategoryImage category={category} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-b from-zinc-800 to-zinc-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                {/* Tier gradient bar */}
                <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", s.grad)} />

                {/* Tier name badge */}
                <span className={cn("absolute right-1.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider", s.chip)}>
                  {t.label}
                </span>

                {/* Inventory badge */}
                <span className="absolute left-1.5 top-2.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-bold tabular-nums text-zinc-300 backdrop-blur-sm">
                  <Layers className="h-2.5 w-2.5" /> 1000+
                </span>

                {/* Price + odds at bottom */}
                <div className="absolute inset-x-0 bottom-0 p-2">
                  <p className="flex items-center gap-0.5 text-lg font-bold text-white">
                    <DollarSign className="h-3.5 w-3.5 text-amber-300" />
                    {promoOn ? (
                      <span className="flex items-center gap-1">
                        <span className="text-[10px] text-zinc-500 line-through">${t.price_usd.toFixed(2)}</span>
                        <span>${price.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span>${t.price_usd.toFixed(2)}</span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[8px] text-zinc-400">{t.blurb}</p>
                </div>
              </div>

              {/* Bonus chance footer */}
              <div className="flex items-center justify-center gap-1 border-t border-white/10 py-1.5">
                <Sparkles className="h-2.5 w-2.5 text-amber-400/60" />
                <span className="text-[8px] font-medium text-zinc-400">1/15 bonus card</span>
              </div>
            </button>
          );
        })}
      </div>

      {!firstPack && (
        <p className="mt-4 rounded-xl border border-white/10 bg-zinc-900/40 p-4 text-center text-sm text-zinc-400">
          Packs for this category are coming soon.
        </p>
      )}
    </div>
  );
}