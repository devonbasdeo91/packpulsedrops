import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import { useAuth } from "@/lib/AuthContext";
import TradingCard from "@/components/TradingCard";
import PackPriceGrid from "@/components/PackPriceGrid";
import { DollarSign, Store, AlertTriangle, Store as StoreIcon, Loader2, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SellerRatingBadge from "@/components/SellerRatingBadge";
import DigitalDisclaimer from "@/components/DigitalDisclaimer";
import PullToRefresh from "@/components/PullToRefresh";
import CategoryBackground from "@/components/CategoryBackground";
import { useCardArt } from "@/hooks/useCardArt";
import SelectField from "@/components/admin/SelectField";
import { toast } from "@/components/ui/use-toast";
import PurchaseConfirmDialog from "@/components/PurchaseConfirmDialog";
import ListingTradeDialog from "@/components/ListingTradeDialog";

const RARITIES = [
  { k: "all", l: "All rarities" },
  { k: "Common", l: "Common" },
  { k: "Rare", l: "Rare" },
  { k: "Super Rare", l: "Super Rare" },
  { k: "Ultra Rare", l: "Ultra Rare" },
  { k: "Secret Rare", l: "Secret Rare" },
  { k: "Ghost Rare", l: "Ghost Rare" },
  { k: "Base", l: "Base" },
  { k: "Short Print", l: "Short Print" },
  { k: "Refractor", l: "Refractor" },
  { k: "Auto", l: "Autograph" },
  { k: "Relic", l: "Relic" },
  { k: "1/1", l: "1/1" },
  { k: "Diamond", l: "Diamond" },
];

const CATS = [
  { k: "all", l: "All" },
  { k: "yugioh", l: "Yu-Gi-Oh" },
  { k: "pokemon", l: "Pokémon" },
  { k: "dragonball", l: "Dragon Ball Z" },
  { k: "digimon", l: "Digimon" },
  { k: "baseball", l: "Baseball" },
  { k: "basketball", l: "Basketball" },
  { k: "naruto", l: "Naruto" },
  { k: "bleach", l: "Bleach" },
  { k: "football", l: "Football" },
  { k: "soccer", l: "Soccer" },
  { k: "cricket", l: "Cricket" },
  { k: "tennis", l: "Tennis" },
  { k: "wnba", l: "WNBA" },
  { k: "nhl", l: "NHL" },
  { k: "golf", l: "Golf" },
  { k: "badminton", l: "Badminton" },
  { k: "tabletennis", l: "Table Tennis" },
  { k: "swimming", l: "Swimming" },
  { k: "trackfield", l: "Track & Field" },
];

export default function Marketplace() {
  const [cat, setCat] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [busy, setBusy] = useState(null);
  const [cashBusy, setCashBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [view, setView] = useState("listings");
  const [directBusy, setDirectBusy] = useState(null);
  const [sort, setSort] = useState("asc");
  const [visibleCount, setVisibleCount] = useState(60);
  const [purchased, setPurchased] = useState(null);
  const [tradeListing, setTradeListing] = useState(null);
  const { refresh } = useWallet();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rawListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ["marketplace-listings"],
    queryFn: async () => {
      const data = await base44.entities.Listing.filter({ status: "active" }, "-created_date", 100);
      return data || [];
    },
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ["marketplace-reviews"],
    queryFn: async () => {
      const data = await base44.entities.Review.list("-created_date", 500);
      return data || [];
    },
  });

  const { data: cards = [], isLoading: loadingDirect } = useQuery({
    queryKey: ["direct-cards"],
    queryFn: async () => {
      const res = await base44.functions.invoke("list-direct-cards", {});
      return res.data?.cards || [];
    },
  });

  const { data: packs = [], isLoading: loadingPacks } = useQuery({
    queryKey: ["marketplace-packs"],
    queryFn: async () => {
      const data = await base44.entities.Pack.list("-created_date", 50);
      return data || [];
    },
  });

  const loading = loadingListings || loadingReviews || loadingDirect || loadingPacks;

  // Enrich listings with direct-card artwork where missing.
  const listings = useMemo(() => {
    const imgByKey = new Map();
    for (const c of cards) {
      if (c.image_url) imgByKey.set(`${c.name}|${c.category}`, c.image_url);
    }
    return rawListings.map((l) =>
      l.image_url ? l : { ...l, image_url: imgByKey.get(`${l.card_name}|${l.category}`) || "" }
    );
  }, [rawListings, cards]);

  const load = useCallback(async () => {
    setVisibleCount(60);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] }),
      queryClient.invalidateQueries({ queryKey: ["marketplace-reviews"] }),
      queryClient.invalidateQueries({ queryKey: ["direct-cards"] }),
      queryClient.invalidateQueries({ queryKey: ["marketplace-packs"] }),
    ]);
  }, [queryClient]);

  const listingArt = useCardArt(listings.map((l) => ({ ...l, listing_id: l.id })));

  const directSorted = [...cards]
    .filter((c) => (cat === "all" || c.category === cat) && (rarity === "all" || c.rarity === rarity))
    .sort((a, b) => {
      const d = sort === "desc" ? (b.value_gems || 0) - (a.value_gems || 0) : (a.value_gems || 0) - (b.value_gems || 0);
      return d !== 0 ? d : (a.name || "").localeCompare(b.name || "");
    });
  const directVisible = directSorted.slice(0, visibleCount);
  const directArt = useCardArt(directVisible);

  const requireAuth = () => {
    if (!isAuthenticated) {
      toast({ title: "Please log in to purchase", description: "You need an account to buy cards." });
      navigate("/login");
      return false;
    }
    return true;
  };

  async function buy(l) {
    if (!requireAuth()) return;
    setError("");
    setNotice("");
    setBusy(l.id);
    try {
      const res = await base44.functions.invoke("purchase-listing", { listing_id: l.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: "Purchase complete!", description: `${l.card_name} is now in your collection.` });
      setPurchased(l);
      await refresh();
      await load();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Purchase failed";
      setError(msg);
      toast({ title: "Purchase failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function buyListingCash(l) {
    if (!requireAuth()) return;
    if (window.self !== window.top) {
      setError("Checkout only works from the published app. Open the app in a new tab.");
      return;
    }
    setError("");
    setNotice("");
    setCashBusy(l.id);
    try {
      const res = await base44.functions.invoke("create-listing-checkout", { listing_id: l.id });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Checkout failed";
      setError(msg);
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
      setCashBusy(null);
    }
  }

  async function buyDirect(card) {
    if (window.self !== window.top) {
      setError("Checkout only works from the published app. Open the app in a new tab.");
      return;
    }
    setError("");
    setNotice("");
    setDirectBusy(card.id);
    try {
      const res = await base44.functions.invoke("create-card-checkout", { card_id: card.id });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      const msg = e.response?.data?.error || e.message || "Checkout failed";
      setError(msg);
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
      setDirectBusy(null);
    }
  }

  const withListingArt = (l) => ({ ...l, image_url: listingArt[`${l.card_name}|${l.category}`] || l.image_url });
  const filtered = listings
    .filter((l) => (cat === "all" || l.category === cat) && (rarity === "all" || l.rarity === rarity))
    .map(withListingArt)
    .sort((a, b) => {
      const d = sort === "desc" ? (b.ask_price_gems || 0) - (a.ask_price_gems || 0) : (a.ask_price_gems || 0) - (b.ask_price_gems || 0);
      return d !== 0 ? d : (a.card_name || "").localeCompare(b.card_name || "");
    });
  const directCards = directVisible.map((c) => ({ ...c, image_url: directArt[`${c.name}|${c.category}`] || c.image_url }));

  const sellerStats = {};
  for (const r of reviews) {
    if (!sellerStats[r.reviewee_id]) sellerStats[r.reviewee_id] = { sum: 0, count: 0 };
    sellerStats[r.reviewee_id].sum += r.rating;
    sellerStats[r.reviewee_id].count += 1;
  }
  const statFor = (id) => {
    const s = sellerStats[id];
    return s ? { avg: s.sum / s.count, count: s.count } : { avg: 0, count: 0 };
  };

  // Track unique visitor views for each listing (once per browser session)
  // so the "Zero View Price Suggestion" workflow can identify listings with
  // no interest after 72 hours. Deduped via localStorage.
  useEffect(() => {
    if (view !== "listings" || filtered.length === 0) return;
    try {
      const viewedKey = "pp_viewed_listings";
      const viewed = JSON.parse(localStorage.getItem(viewedKey) || "[]");
      const viewedSet = new Set(viewed);
      const newIds = filtered.map((l) => l.id).filter((id) => !viewedSet.has(id));
      if (newIds.length === 0) return;
      base44.functions.invoke("track-listing-view", { listing_ids: newIds }).catch(() => {});
      const updated = [...viewed, ...newIds].slice(-500);
      localStorage.setItem(viewedKey, JSON.stringify(updated));
    } catch { /* localStorage may be unavailable */ }
  }, [view, filtered]);

  return (
    <PullToRefresh onRefresh={load}>
    <CategoryBackground category={cat !== "all" ? cat : null} />
    <div className="relative z-10 space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white flex items-center gap-3">
          <Store className="h-7 w-7 text-amber-400" /> Marketplace
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Buy and sell cards with other collectors. All prices are in USD. Sellers keep 95% (5% marketplace fee).
        </p>
        <DigitalDisclaimer className="mt-3" />
      </div>

      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {[
          { k: "listings", l: "Collector listings" },
          { k: "direct", l: "Buy direct from PackPulseDrops" },
          { k: "packs", l: "Packs" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={cn(
              "w-full rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto",
              view === t.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {CATS.map((t) => (
          <button
            key={t.k}
            onClick={() => { setCat(t.k); setVisibleCount(60); }}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              cat === t.k
                ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                : "border-white/10 text-zinc-400 hover:bg-white/5"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Rarity filter + sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Rarity</span>
          <SelectField
            value={rarity}
            onValueChange={(v) => { setRarity(v); setVisibleCount(60); }}
            options={RARITIES.map((r) => ({ value: r.k, label: r.l }))}
            placeholder="All rarities"
            className="w-auto min-w-[140px] rounded-full border-white/15 bg-zinc-900 px-4 py-1.5 font-semibold"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Sort</span>
          {[
            { k: "asc", l: "Lowest value" },
            { k: "desc", l: "Highest value" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setSort(t.k)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                sort === t.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              )}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {view === "packs" ? (
        loadingPacks ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-zinc-900/60">
                <div className="aspect-[3/4] w-full rounded-xl bg-zinc-800" />
                <div className="space-y-1.5 p-2.5">
                  <div className="h-3 w-3/4 rounded bg-zinc-800" />
                  <div className="h-3 w-1/3 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        ) : packs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <StoreIcon className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-zinc-400">No packs available right now.</p>
            <Link
              to="/shop"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform"
            >
              Browse all packs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              <span className="font-bold text-white">{packs.length}</span> packs available — tap a pack to rip it open.
            </p>
            <PackPriceGrid packs={packs.filter((p) => cat === "all" || p.category === cat)} />
          </div>
        )
      ) : view === "direct" ? (
        loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : directCards.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <StoreIcon className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-zinc-400">No cards available in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-400">
                Showing <span className="font-bold text-white">{directCards.length}</span> of{" "}
                <span className="font-bold text-white">{directSorted.length.toLocaleString()}</span> cards
              </p>
              <div className="flex w-full gap-2 sm:w-auto">
                {[
                  { k: "asc", l: "Lowest value" },
                  { k: "desc", l: "Highest value" },
                ].map((t) => (
                  <button
                    key={t.k}
                    onClick={() => { setSort(t.k); setVisibleCount(60); }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                      sort === t.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {directCards.map((c) => {
                const price = Math.max(0.99, (c.value_gems || 0) * 0.0035);
                return (
                  <div key={c.id} className="flex flex-col space-y-2 rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
                    <TradingCard card={c} />
                    <p className="text-center text-xs font-bold text-emerald-300">Card value ${price.toFixed(2)}</p>
                    <p className="text-center text-[11px] text-zinc-500">Direct from PackPulseDrops — instant delivery</p>
                    <button
                      onClick={() => buyDirect(c)}
                      disabled={directBusy === c.id}
                      className="w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
                    >
                      {directBusy === c.id ? "…" : `Buy for $${price.toFixed(2)}`}
                    </button>
                  </div>
                );
              })}
            </div>
            {visibleCount < directSorted.length && (
              <div className="flex justify-center">
                <button
                  onClick={() => setVisibleCount((v) => v + 60)}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Load more cards
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-2xl bg-zinc-900" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <StoreIcon className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-zinc-400">No cards match your filters.</p>
            <p className="mt-1 text-sm text-zinc-500">Try a different rarity or category, or list your own hits for other collectors.</p>
            <Link
              to="/shop"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform"
            >
              Browse packs
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-zinc-400">
              Showing <span className="font-bold text-white">{filtered.length}</span> listing{filtered.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((l) => (
              <div key={l.id} className="flex flex-col space-y-2 rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
                <TradingCard card={{ ...l, name: l.card_name }} />
                <p className="text-center text-xs font-bold text-emerald-300">Card value ${((l.value_gems || 0) * 0.0035).toFixed(2)}</p>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-zinc-400">{l.seller_name || "Seller"}</span>
                  <span className="shrink-0 text-zinc-500">{l.rarity}</span>
                </div>
                <SellerRatingBadge avg={statFor(l.seller_id).avg} count={statFor(l.seller_id).count} />
                <span className="flex items-center justify-center gap-1 pt-1 font-bold text-amber-300">
                  <DollarSign className="h-4 w-4 shrink-0 text-amber-300" /> {((l.ask_price_gems || 0) * 0.0035).toFixed(2)}
                </span>
                {l.seller_id === user?.id ? (
                  <p className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-center text-sm font-bold text-amber-300">
                    Your listing
                  </p>
                ) : (
                  <>
                    <button
                      onClick={() => buy(l)}
                      disabled={busy === l.id}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
                    >
                      {busy === l.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {busy === l.id ? "Processing…" : "Buy with balance"}
                    </button>
                    <button
                      onClick={() => buyListingCash(l)}
                      disabled={cashBusy === l.id}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-300 transition-transform hover:scale-105 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {cashBusy === l.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      {cashBusy === l.id ? "Processing…" : `Buy with cash $${((l.ask_price_gems || 0) * 0.0035).toFixed(2)}`}
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={() => setTradeListing(l)}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-200 transition-transform hover:scale-105 hover:bg-white/10"
                      >
                        <ArrowLeftRight className="h-4 w-4" /> Propose trade
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            </div>
          </div>
        )
      )}
    </div>

    <PurchaseConfirmDialog
      purchase={purchased}
      onClose={() => setPurchased(null)}
    />

    <ListingTradeDialog
      listing={tradeListing}
      onClose={() => setTradeListing(null)}
    />
    </PullToRefresh>
  );
}