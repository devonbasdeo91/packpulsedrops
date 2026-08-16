import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Image } from "@/components/ui/image";
import { toast } from "@/components/ui/use-toast";
import { ArrowRight, Loader2, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import SwipeableCardPicker from "@/components/SwipeableCardPicker";

function MiniCard({ pull, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 rounded-xl border p-2 text-left transition-colors",
        selected ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-zinc-900/40 hover:bg-zinc-900/70"
      )}
    >
      <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
        {pull.image_url ? (
          <Image src={pull.image_url} alt={pull.card_name} fittingType="fill" loading="eager" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">No art</div>
        )}
      </div>
      <p className="truncate text-xs font-bold text-white">{pull.card_name}</p>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-zinc-500">{pull.rarity}</span>
        <span className="font-bold text-amber-300">${((pull.value_gems || 0) * 0.0035).toFixed(2)}</span>
      </div>
    </button>
  );
}

export default function ListingTradeDialog({ listing, onClose }) {
  const [myPulls, setMyPulls] = useState([]);
  const [offeredId, setOfferedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!listing) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const mine = await base44.entities.Pull.list("-created_date", 200);
        if (active) setMyPulls(mine || []);
      } catch {
        if (active) setMyPulls([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [listing]);

  async function submit() {
    if (!offeredId) return;
    setSending(true);
    try {
      const res = await base44.functions.invoke("create-trade", {
        offered_pull_id: offeredId,
        requested_listing_id: listing.id,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Trade proposed!", description: `Offer sent to ${listing.seller_name || "the seller"}.` });
      onClose();
    } catch (e) {
      toast({ title: "Trade failed", description: e.response?.data?.error || e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  if (!listing) return null;

  return (
    <Dialog open={!!listing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-white">Propose a trade for {listing.card_name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* The listing they want */}
          <div>
            <p className="mb-2 text-sm font-bold text-sky-300">Their listed card</p>
            <div className="flex flex-col gap-1 rounded-xl border border-sky-400/30 bg-sky-400/5 p-2">
              <div className="aspect-[2.5/3.5] w-full overflow-hidden rounded-lg border border-white/10 bg-black/30">
                {listing.image_url ? (
                  <Image src={listing.image_url} alt={listing.card_name} fittingType="fill" loading="eager" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">No art</div>
                )}
              </div>
              <p className="truncate text-xs font-bold text-white">{listing.card_name}</p>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">{listing.rarity}</span>
                <span className="flex items-center gap-0.5 font-bold text-amber-300">
                  <Gem className="h-3 w-3 fill-amber-300" /> {listing.ask_price_gems?.toLocaleString()}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Listed by {listing.seller_name || "Seller"}</p>
            </div>
          </div>

          {/* Your card to offer */}
          <div>
            <p className="mb-2 text-sm font-bold text-amber-300">Your card to offer</p>
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              </div>
            ) : (
              <SwipeableCardPicker
                cards={myPulls}
                selectedId={offeredId}
                onSelect={(c) => setOfferedId(c.id)}
                emptyLabel="You have no cards to offer."
              />
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-white/15 text-white hover:bg-white/5">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!offeredId || sending || loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-300 to-orange-500 text-black hover:opacity-90"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {sending ? "Sending…" : "Send trade offer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}