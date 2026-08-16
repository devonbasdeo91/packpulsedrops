import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { PACK_TIERS } from "@/lib/packTiers";

const RARITY_ORDER = [
  "Common", "Base", "Rare", "Short Print", "Super Rare", "Refractor",
  "Ultra Rare", "Auto", "Secret Rare", "Relic", "Ghost Rare", "1/1", "Diamond",
];

const TIER_COLOR = {
  Common: "text-zinc-400", Base: "text-zinc-400", Rare: "text-sky-300",
  "Short Print": "text-sky-300", "Super Rare": "text-violet-300",
  Refractor: "text-cyan-300", "Ultra Rare": "text-amber-300", Auto: "text-amber-300",
  "Secret Rare": "text-rose-300", Relic: "text-rose-300", "Ghost Rare": "text-white",
  "1/1": "text-emerald-300", Diamond: "text-cyan-200",
};

export default function OddsTable({ pool, tier = "silver" }) {
  const weights = (PACK_TIERS[tier] || PACK_TIERS.silver).weights;
  const isEstimate = !pool || pool.length === 0;
  const rows = useMemo(() => {
    const present = !pool || pool.length === 0 ? null : new Set(pool.map((c) => c.rarity));
    const entries = RARITY_ORDER
      .filter((r) => !present || present.has(r))
      .map((r) => ({ rarity: r, weight: weights[r] ?? 1 }));
    const total = entries.reduce((s, e) => s + e.weight, 0) || 1;
    return entries.map((e) => ({ ...e, pct: (e.weight / total) * 100 }));
  }, [pool, weights]);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
      <h3 className="font-heading text-sm font-bold uppercase tracking-widest text-zinc-300">
        Pull odds · {(PACK_TIERS[tier] || PACK_TIERS.silver).label}
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        {isEstimate
          ? "Standard drop rates for this pack style. Actual pulls depend on the cards available."
          : "Approximate per-card drop rates based on this pack's card pool."}
      </p>
      <div className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <div key={r.rarity} className="flex items-center gap-3">
            <span className={cn("w-28 shrink-0 text-sm font-semibold", TIER_COLOR[r.rarity] || "text-zinc-300")}>
              {r.rarity}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500"
                style={{ width: `${Math.max(r.pct, 1)}%` }}
              />
            </div>
            <span className="w-14 shrink-0 text-right text-xs font-medium text-zinc-400">
              {r.pct < 0.1 ? "<0.1%" : `${r.pct.toFixed(1)}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}