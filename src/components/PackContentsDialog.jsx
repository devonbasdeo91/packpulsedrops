import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Image } from "@/components/ui/image";
import { RARITY_STYLES } from "@/components/TradingCard";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PackContentsDialog({ open, onOpenChange, pack, pool }) {
  const cards = pool || [];
  const [art, setArt] = useState({});

  useEffect(() => {
    if (!open) return;
    setArt({});
    cards.forEach((c) => {
      if (c.image_url) {
        setArt((p) => ({ ...p, [c.id]: c.image_url }));
        return;
      }
      base44.functions
        .invoke("ensure-card-art", { card_name: c.name, category: c.category, rarity: c.rarity })
        .then((res) => {
          if (res.data?.image_url) setArt((p) => ({ ...p, [c.id]: res.data.image_url }));
        })
        .catch(() => {});
    });
     
  }, [open, pack?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-white">
            {pack?.name ? `Inside ${pack.name}` : "Pack contents"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {cards.length} card{cards.length === 1 ? "" : "s"} in this pack. Pulls are random — odds shown on the page.
          </DialogDescription>
        </DialogHeader>

        {cards.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">No cards loaded for this pack yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {cards.map((c) => {
              const r = RARITY_STYLES[c.rarity] || RARITY_STYLES.Common;
              const url = art[c.id] || c.image_url;
              return (
                <div key={c.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/50">
                  <div className="aspect-[2.5/3.5] w-full overflow-hidden bg-black/30">
                    {url ? (
                      <Image src={url} alt={c.name} fittingType="fill" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-600">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-semibold text-white">{c.name}</p>
                    <p className={cn("text-[10px] font-semibold", r.text)}>{r.label}</p>
                    <p className="mt-0.5 text-[11px] font-bold text-emerald-300">
                      ${((c.value_gems || 0) * 0.0035).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}