import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { getRecentlyViewed } from "@/lib/recentlyViewed";
import PackRatingBadge from "@/components/PackRatingBadge";

export default function RecentlyViewedPacks() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getRecentlyViewed();
    if (!ids.length) { setLoading(false); return; }
    Promise.all(ids.map((id) => base44.entities.Pack.get(id).catch(() => null)))
      .then((results) => {
        const valid = results.filter(Boolean);
        // Preserve the order from localStorage (most recent first)
        const order = new Map(ids.map((id, i) => [id, i]));
        valid.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
        setPacks(valid);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || packs.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-300" />
        <h2 className="font-heading text-lg font-bold text-white">Recently viewed</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {packs.map((pack) => (
          <Link
            key={pack.id}
            to={`/rip/${pack.id}`}
            className="group flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50 transition-all hover:border-amber-400/30"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-b from-zinc-800 to-zinc-950">
              {pack.image_url ? (
                <Image src={pack.image_url} alt={pack.name} fittingType="fill" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center" />
              )}
            </div>
            <div className="flex flex-col gap-1 p-2">
              <p className="line-clamp-1 text-xs font-semibold text-white">{pack.name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">${pack.price_usd?.toFixed(2)}</span>
                <PackRatingBadge packId={pack.id} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}