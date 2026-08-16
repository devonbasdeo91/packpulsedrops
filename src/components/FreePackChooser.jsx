import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { Image } from "@/components/ui/image";

export default function FreePackChooser({ open, onOpenChange, packs, loading, onPick }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-xl text-white">
            <Sparkles className="h-5 w-5 text-amber-300" />
            Choose your free pack
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Pick any booster to rip your free pack right now.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-zinc-900/60">
                <div className="aspect-[3/4] w-full rounded-xl bg-zinc-800" />
                <div className="space-y-1.5 p-2.5">
                  <div className="h-3 w-3/4 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : packs.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
            No packs are available right now. Check back soon!
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto scrollbar-none">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {packs.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onPick(p)}
                  className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 text-left transition-all hover:scale-[1.03] hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/10"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <Image src={p.image_url} alt={p.name} fittingType="fill" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-1 text-xs font-bold text-white">{p.name}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300">Rip free →</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}