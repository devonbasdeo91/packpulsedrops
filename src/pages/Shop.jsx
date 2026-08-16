import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import DigitalDisclaimer from "@/components/DigitalDisclaimer";
import PromoBanner from "@/components/PromoBanner";
import PullToRefresh from "@/components/PullToRefresh";
import CategoryBackground from "@/components/CategoryBackground";
import ShopCarousel from "@/components/ShopCarousel";
import CategoryNav from "@/components/CategoryNav";
import TierPackGrid from "@/components/TierPackGrid";
import CategoryImage from "@/components/CategoryImage";

const SHOP_CATEGORIES = [
  { key: "yugioh", label: "Yu-Gi-Oh", desc: "Monsters, spells & the Egyptian Gods." },
  { key: "pokemon", label: "Pokémon", desc: "Charizard, Pikachu & shining holos." },
  { key: "dragonball", label: "Dragon Ball Z", desc: "Super Saiyans & God Rares." },
  { key: "digimon", label: "Digimon", desc: "Digital monsters & rare foil parallels." },
  { key: "baseball", label: "Baseball", desc: "MLB rookies, refractors & autos." },
  { key: "basketball", label: "Basketball", desc: "NBA rookies, Prizm & patch 1/1s." },
  { key: "naruto", label: "Naruto", desc: "Hidden Leaf ninjas & tailed beasts." },
  { key: "bleach", label: "Bleach", desc: "Soul Reapers & legendary zanpakuto." },
  { key: "football", label: "Football", desc: "NFL rookies, autos & jersey relics." },
  { key: "soccer", label: "Soccer", desc: "Global stars, refractors & 1/1s." },
  { key: "cricket", label: "Cricket", desc: "International legends & 1/1 Superfractors." },
  { key: "tennis", label: "Tennis", desc: "Grand slam champions & 1/1 chase cards." },
  { key: "wnba", label: "WNBA", desc: "Women's hoops legends & autos." },
  { key: "nhl", label: "NHL", desc: "Hockey greats, autos & 1/1 Superfractors." },
  { key: "golf", label: "Golf", desc: "Major champions & 1/1 Superfractors." },
  { key: "badminton", label: "Badminton", desc: "Smash kings & 1/1 chase cards." },
  { key: "tabletennis", label: "Table Tennis", desc: "Loop masters & 1/1 patch cards." },
  { key: "swimming", label: "Swimming", desc: "Olympic pool champions & 1/1s." },
  { key: "trackfield", label: "Track & Field", desc: "Sprint showdowns & 1/1 patch cards." },
  { key: "f1", label: "Formula 1", desc: "Grand prix champions & 1/1 Superfractors." },
];

export default function Shop() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "all";
  const [active, setActive] = useState(initialCat);

  // Sync active category with URL param so home category links work
  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat && cat !== active) setActive(cat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectCategory = (key) => {
    setActive(key);
    if (key === "all") setSearchParams({});
    else setSearchParams({ cat: key });
  };

  async function load() {
    setLoading(true);
    try {
      const data = await base44.entities.Pack.list("-created_date", 50);
      setPacks(data);
    } catch {
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const c = { all: packs.length };
    for (const p of packs) c[p.category] = (c[p.category] || 0) + 1;
    return c;
  }, [packs]);

  const filtered = active === "all" ? packs : packs.filter((p) => p.category === active);

  return (
    <PullToRefresh onRefresh={load}>
    <CategoryBackground category={active !== "all" ? active : null} />
    <div className="relative z-10 space-y-6">
      <div>
        <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
        <h1 className="font-heading text-3xl font-bold text-white">Pack shop</h1>
        <p className="mt-1 text-sm text-zinc-400">Choose a pack, pay with card, and rip it open.</p>
        <DigitalDisclaimer className="mt-3" />
      </div>

      <PromoBanner />

      <div className="flex flex-col gap-6 lg:flex-row">
        <CategoryNav active={active} onSelect={selectCategory} counts={counts} />

        <div className="min-w-0 flex-1 space-y-6">
          {active === "all" && !loading ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-400">Browse by category</h3>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold tabular-nums text-zinc-500">{SHOP_CATEGORIES.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {SHOP_CATEGORIES.map((c) => {
                  const count = counts[c.key] || 0;
                  return (
                    <button
                      key={c.key}
                      onClick={() => selectCategory(c.key)}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-left transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-amber-500/10"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden">
                        <CategoryImage category={c.key} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                      </div>
                      <div className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <h3 className="font-heading text-base font-bold text-white">{c.label}</h3>
                          <p className="mt-0.5 text-xs text-zinc-400">{c.desc}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {!loading && packs.length > 0 && (() => {
                const featured = filtered.filter((p) => p.featured);
                return featured.length > 0 ? <ShopCarousel packs={featured} /> : null;
              })()}

              {loading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="animate-pulse rounded-xl border border-white/10 bg-zinc-900/60">
                      <div className="aspect-[3/4] w-full rounded-xl bg-zinc-800" />
                      <div className="space-y-1.5 p-2.5">
                        <div className="h-3 w-3/4 rounded bg-zinc-800" />
                        <div className="h-3 w-1/3 rounded bg-zinc-800" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <TierPackGrid category={active} packs={filtered} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </PullToRefresh>
  );
}