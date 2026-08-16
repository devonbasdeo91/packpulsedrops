import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Layers, CalendarDays, Search, CheckSquare, Square, X, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { RARITY_STYLES } from "@/components/TradingCard";
import VaultCard from "@/components/VaultCard";
import SellCardDialog from "@/components/SellCardDialog";
import BulkSellDialog from "@/components/BulkSellDialog";
import CardLightbox from "@/components/CardLightbox";
import PullToRefresh from "@/components/PullToRefresh";
import CategoryBackground from "@/components/CategoryBackground";
import RarityBreakdown from "@/components/RarityBreakdown";
import CollectionDashboard from "@/components/CollectionDashboard";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useCardArt } from "@/hooks/useCardArt";

const YUGIOH_RARITIES = ["Common", "Rare", "Super Rare", "Ultra Rare", "Secret Rare", "Ghost Rare"];
const BASEBALL_RARITIES = ["Base", "Short Print", "Refractor", "Auto", "Relic", "1/1"];
const RARITIES = ["Base", "Common", "Short Print", "Rare", "Refractor", "Super Rare", "Ultra Rare", "Auto", "Relic", "Secret Rare", "Ghost Rare", "1/1", "Diamond"];
const SORTS = [
  { k: "newest", l: "Newest" },
  { k: "oldest", l: "Oldest" },
  { k: "value_desc", l: "Highest" },
  { k: "value_asc", l: "Lowest" },
  { k: "name", l: "Name A-Z" },
  { k: "rarest", l: "Rarest" },
];

function weightedPick(pool, n) {
  const remaining = [...pool];
  const picked = [];
  for (let i = 0; i < n && remaining.length > 0; i++) {
    const total = remaining.reduce((s, c) => s + (RARITY_STYLES[c.rarity]?.weight ?? 1), 0);
    let roll = Math.random() * total;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      roll -= RARITY_STYLES[remaining[j].rarity]?.weight ?? 1;
      if (roll <= 0) { idx = j; break; }
    }
    picked.push(remaining.splice(idx, 1)[0]);
  }
  return picked;
}

export default function Collection() {
  const { isAuthenticated } = useAuth();
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selling, setSelling] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkSelling, setBulkSelling] = useState(false);
  const queryClient = useQueryClient();

  const toggleSelect = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);

  const { data: pulls = [], isLoading: loading, refetch } = useQuery({
    queryKey: ["collection-pulls"],
    queryFn: async () => {
      const data = await base44.entities.Pull.list("-created_date", 200);
      return data || [];
    },
  });

  const load = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Redeem any pending direct purchases in the background; refresh if delivered.
  // Skip for unauthenticated users (guests browsing publicly).
  useEffect(() => {
    if (!isAuthenticated) return;
    base44.functions
      .invoke("redeem-purchased-cards", {})
      .then((redeem) => {
        if (redeem.data?.count > 0) {
          toast({ title: "Card added to your vault!", description: `${redeem.data.count} direct purchase${redeem.data.count > 1 ? "s" : ""} delivered.` });
          queryClient.invalidateQueries({ queryKey: ["collection-pulls"] });
        }
      })
      .catch(() => {});
  }, [queryClient, isAuthenticated]);

  const art = useCardArt(pulls.map((p) => ({ ...p, pull_id: p.id })));

  function noteArt(pull, url) {
    if (!pull || !url) return;
    queryClient.setQueryData(["collection-pulls"], (prev) =>
      (prev || []).map((p) => (p.id === pull.id ? { ...p, image_url: url } : p))
    );
  }

  const displayed = pulls.map((p) => ({
    ...p,
    image_url: art[`${p.card_name}|${p.category}`] || p.image_url,
  }));
  const filtered = displayed.filter((p) => {
    if (cat !== "all" && p.category !== cat) return false;
    if (rarity !== "all" && p.rarity !== rarity) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!(p.card_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest": return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      case "value_desc": return (b.value_gems || 0) - (a.value_gems || 0);
      case "value_asc": return (a.value_gems || 0) - (b.value_gems || 0);
      case "name": return (a.card_name || "").localeCompare(b.card_name || "");
      case "rarest": return (RARITY_STYLES[a.rarity]?.weight ?? 99) - (RARITY_STYLES[b.rarity]?.weight ?? 99);
      default: return new Date(b.created_date || 0) - new Date(a.created_date || 0);
    }
  });

  const selectedPulls = useMemo(
    () => sorted.filter((p) => selected.has(p.id)),
    [sorted, selected]
  );
  const selectedTotalUsd = selectedPulls.reduce(
    (s, p) => s + (p.value_gems || 0) * 0.0035 * 0.95,
    0
  );

  const stats = useMemo(() => {
    const count = pulls.length;
    const value = pulls.reduce((s, p) => s + (p.value_gems || 0), 0);
    const best = pulls.reduce((best, p) => (!best || (p.value_gems || 0) > (best.value_gems || 0) ? p : best), null);
    // Daily pull stats — pulls created today (synced from the user's own pull history)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPulls = pulls.filter((p) => (p.created_date || "").slice(0, 10) === todayStr);
    const todayCount = todayPulls.length;
    const todayValue = todayPulls.reduce((s, p) => s + (p.value_gems || 0), 0);
    return { count, value, best, todayCount, todayValue };
  }, [pulls]);

  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Your collection</h1>
          <p className="mt-1 text-sm text-zinc-400">Every card you've ripped lands here.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="text-zinc-400">Log in to view and manage your card collection.</p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black hover:scale-105 transition-transform"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={load}>
    <CategoryBackground category={cat !== "all" ? cat : null} />
    <div className="relative z-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Your collection</h1>
          <p className="mt-1 text-sm text-zinc-400">Every card you've ripped lands here.</p>
        </div>
        <div className="flex items-center gap-2">
          {pulls.length > 0 && (
            <button
              onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors",
                selectMode
                  ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                  : "border-white/15 text-zinc-200 hover:bg-white/5"
              )}
            >
              {selectMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              {selectMode ? "Done" : "Select"}
            </button>
          )}
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform"
          >
            Rip more
          </Link>
        </div>
      </div>

      {/* Search + rarity filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards by name..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/60 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-400/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {["all", ...RARITIES].map((r) => (
            <button
              key={r}
              onClick={() => setRarity(r)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                rarity === r ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5"
              )}
            >
              {r === "all" ? "All rarities" : r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <span className="shrink-0 text-xs font-semibold text-zinc-500">Sort:</span>
          {SORTS.map((s) => (
            <button
              key={s.k}
              onClick={() => setSort(s.k)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                sort === s.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5"
              )}
            >
              {s.l}
            </button>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[{ k: "all", l: "All" }, { k: "yugioh", l: "Yu-Gi-Oh" }, { k: "pokemon", l: "Pokémon" }, { k: "dragonball", l: "Dragon Ball Z" }, { k: "digimon", l: "Digimon" }, { k: "baseball", l: "Baseball" }, { k: "basketball", l: "Basketball" }, { k: "naruto", l: "Naruto" }, { k: "bleach", l: "Bleach" }, { k: "football", l: "Football" }, { k: "soccer", l: "Soccer" }, { k: "cricket", l: "Cricket" }, { k: "tennis", l: "Tennis" }, { k: "wnba", l: "WNBA" }, { k: "nhl", l: "NHL" }, { k: "golf", l: "Golf" }, { k: "badminton", l: "Badminton" }, { k: "tabletennis", l: "Table Tennis" }, { k: "swimming", l: "Swimming" }, { k: "trackfield", l: "Track & Field" }, { k: "f1", l: "Formula 1" }].map((t) => (
          <button
            key={t.k}
            onClick={() => setCat(t.k)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              cat === t.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2.5/3.5] animate-pulse rounded-xl bg-zinc-900" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
          <p className="text-zinc-400">{pulls.length === 0 ? "No cards here yet — rip your first pack to start your vault." : "No cards match your filters. Try clearing your search or rarity."}</p>
          {pulls.length === 0 && (
            <Link
              to="/shop"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" /> Go to shop
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {sorted.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <div className="relative">
                  <VaultCard
                    card={p}
                    onClick={() => selectMode ? toggleSelect(p.id) : setViewing(p)}
                  />
                  {selectMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelect(p.id); }}
                      className="absolute left-2 top-2 z-10"
                      aria-label={isSel ? "Deselect" : "Select"}
                    >
                      {isSel ? (
                        <CheckSquare className="h-7 w-7 text-amber-300 drop-shadow-lg" />
                      ) : (
                        <Square className="h-7 w-7 text-white/70 drop-shadow-lg" />
                      )}
                    </button>
                  )}
                  {selectMode && isSel && (
                    <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-400/60" />
                  )}
                </div>
                {!selectMode && (
                  <button
                    onClick={() => setSelling(p)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
                  >
                    Sell
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Total vault value — bold summary */}
      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 via-zinc-900/60 to-zinc-950 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
            <DollarSign className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total market value</p>
            <p className="font-heading text-4xl font-extrabold text-amber-300 sm:text-5xl">
              {loading ? "…" : `$${(stats.value * 0.0035).toFixed(2)}`}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{stats.count} card{stats.count === 1 ? "" : "s"} in your vault</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Layers} label="Cards pulled" value={loading ? "…" : stats.count.toString()} />
        <StatCard icon={DollarSign} label="Vault value" value={loading ? "…" : `$${(stats.value * 0.0035).toFixed(2)}`} accent="text-amber-300" />
        <StatCard
          icon={Trophy}
          label="Best pull"
          value={stats.best ? stats.best.name : "—"}
          sub={stats.best ? stats.best.rarity : ""}
        />
        <StatCard
          icon={CalendarDays}
          label="Pulled today"
          value={loading ? "…" : stats.todayCount.toString()}
          sub={stats.todayCount > 0 ? `+ $${(stats.todayValue * 0.0035).toFixed(2)}` : ""}
          accent="text-emerald-300"
        />
      </div>

      {/* Dashboard charts — vault value growth + rarity distribution */}
      {!loading && pulls.length > 0 && <CollectionDashboard pulls={pulls} />}

      {/* Rarity breakdown — respects the active category filter */}
      {!loading && filtered.length > 0 && <RarityBreakdown pulls={filtered} />}

      <SellCardDialog
        pull={selling}
        onClose={() => setSelling(null)}
        onSold={() => { setSelling(null); load(); }}
      />

      <BulkSellDialog
        pulls={bulkSelling ? selectedPulls : []}
        onClose={() => setBulkSelling(false)}
        onSold={() => { setBulkSelling(false); exitSelectMode(); load(); }}
      />

      <CardLightbox card={viewing} onClose={() => setViewing(null)} onGenerated={(url) => noteArt(viewing, url)} />
    </div>

    {/* Bulk sell action bar */}
    {selectMode && selected.size > 0 && (
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">{selected.size} selected</p>
            <p className="text-xs text-emerald-300">Receive ${selectedTotalUsd.toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selected.size === sorted.length) setSelected(new Set());
                else setSelected(new Set(sorted.map((p) => p.id)));
              }}
              className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
            >
              {selected.size === sorted.length && sorted.length > 0 ? "Deselect all" : "Select all"}
            </button>
            <button
              onClick={() => setBulkSelling(true)}
              className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform"
            >
              Sell selected
            </button>
          </div>
        </div>
      </div>
    )}
    </PullToRefresh>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("mt-2 truncate text-lg font-bold", accent || "text-white")}>{value}</p>
      {sub && <p className="truncate text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}