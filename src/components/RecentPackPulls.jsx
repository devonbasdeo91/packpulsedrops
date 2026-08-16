import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Sparkles, Loader2 } from "lucide-react";
import { useCardArt } from "@/hooks/useCardArt";
import { formatUsd } from "@/lib/gemValue";

export default function RecentPackPulls({ packName, pool }) {
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!packName) return;
    base44.entities.PullFeedEvent.filter({ pack_name: packName }, "-created_date", 12)
      .then((data) => setPulls(data || []))
      .catch(() => setPulls([]))
      .finally(() => setLoading(false));
  }, [packName]);

  const items = pulls.map((p) => ({ key: p.id, card_name: p.card_name, category: p.category, rarity: p.rarity }));
  const art = useCardArt(items);

  if (loading || pulls.length === 0) return null;

  const poolMap = {};
  (pool || []).forEach((c) => {
    if (c.name && c.image_url) poolMap[c.name] = c.image_url;
  });

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-300" />
        <h3 className="font-heading text-lg font-bold text-white">Recently opened from this pack</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {pulls.map((p, i) => {
          const img = art[p.id] || poolMap[p.card_name];
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60">
              <div className="aspect-[3/4] w-full">
                {img ? (
                  <Image src={img} alt={p.card_name} fittingType="fill" className="h-full w-full" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-semibold text-white">{p.card_name}</p>
                <p className="text-[10px] text-amber-300">{p.rarity}</p>
                <p className="text-[10px] font-bold text-emerald-300">{formatUsd(p.value_gems)}</p>
                {p.puller_name && <p className="truncate text-[10px] text-zinc-500">by {p.puller_name}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}