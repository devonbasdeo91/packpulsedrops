import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import { useCardArt } from "@/hooks/useCardArt";
import { formatUsd } from "@/lib/gemValue";
import CardLightbox from "@/components/CardLightbox";

const RARE_TIERS = new Set([
  "Super Rare", "Refractor", "Ultra Rare", "Auto", "Secret Rare",
  "Relic", "Ghost Rare", "1/1", "Diamond",
]);

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function RecentPullsTicker({ limit = 14 }) {
  const [events, setEvents] = useState([]);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    let alive = true;
    base44.entities.PullFeedEvent.list("-created_date", limit)
      .then((data) => { if (alive) setEvents(data || []); })
      .catch(() => {});
    const unsub = base44.entities.PullFeedEvent.subscribe((event) => {
      if (event.type === "create" && event.data) {
        setEvents((prev) => [event.data, ...prev].slice(0, limit));
      }
    });
    return () => { alive = false; if (unsub) unsub(); };
  }, [limit]);

  const items = events.map((e) => ({ key: e.id, card_name: e.card_name, category: e.category, rarity: e.rarity }));
  const art = useCardArt(items);

  if (events.length === 0) return null;

  const viewingCard = viewing ? { ...viewing, image_url: art[viewing.id] || viewing.image_url } : null;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 text-amber-300">
        <Flame className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Live pulls</span>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        <AnimatePresence initial={false}>
          {events.map((e) => {
            const rare = RARE_TIERS.has(e.rarity);
            const url = art[e.id];
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewing(e)}
                className={cn(
                  "shrink-0 w-36 cursor-pointer overflow-hidden rounded-xl border transition-transform hover:scale-105",
                  rare ? "border-amber-400/40 bg-amber-400/5" : "border-white/10 bg-black/20"
                )}
              >
                <div className="aspect-[2.5/3.5] w-full bg-black/30">
                  {url ? (
                    <Image src={url} alt={e.card_name} fittingType="fill" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-600">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="truncate text-xs font-semibold text-white">{e.card_name}</p>
                  <p className="truncate text-[10px] text-zinc-400">{e.rarity}</p>
                  <p className="text-[10px] font-bold text-emerald-300">{formatUsd(e.value_gems)}</p>
                  <p className="truncate text-[9px] text-zinc-500">
                    {e.puller_name ? `@${e.puller_name}` : "a collector"} · {timeAgo(e.created_date)}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <CardLightbox card={viewingCard} onClose={() => setViewing(null)} />
    </div>
  );
}