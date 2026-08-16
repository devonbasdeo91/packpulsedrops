import React, { useMemo } from "react";
import { RARITY_STYLES } from "@/components/TradingCard";
import { cn } from "@/lib/utils";

const RARITY_ORDER = [
  "Common", "Base", "Rare", "Short Print", "Super Rare", "Refractor",
  "Ultra Rare", "Auto", "Secret Rare", "Relic", "Ghost Rare", "1/1", "Diamond",
];

/**
 * Shows a horizontal breakdown of the user's collection by rarity.
 * Computed client-side from the supplied pulls (already scoped to the user).
 */
export default function RarityBreakdown({ pulls }) {
  const rows = useMemo(() => {
    const counts = {};
    for (const p of pulls || []) {
      const r = p.rarity || "Unknown";
      counts[r] = (counts[r] || 0) + 1;
    }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const ordered = RARITY_ORDER.filter((r) => counts[r] != null)
      .map((r) => ({ rarity: r, count: counts[r], pct: total ? (100 * counts[r]) / total : 0 }));
    for (const r of Object.keys(counts)) {
      if (!RARITY_ORDER.includes(r)) ordered.push({ rarity: r, count: counts[r], pct: total ? (100 * counts[r]) / total : 0 });
    }
    return { ordered, total };
  }, [pulls]);

  if (rows.total === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Rarity breakdown</p>
      <div className="mt-3 space-y-2.5">
        {rows.ordered.map((row) => {
          const style = RARITY_STYLES[row.rarity] || RARITY_STYLES.Common;
          return (
            <div key={row.rarity} className="flex items-center gap-3">
              <span className={cn("w-24 shrink-0 text-xs font-semibold", style.text)}>{style.label}</span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className={cn("absolute inset-y-0 left-0 rounded-full bg-gradient-to-r", style.glow)}
                  style={{ width: `${Math.max(row.pct, 2)}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-zinc-400">
                {row.count} · {row.pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}