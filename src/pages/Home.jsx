import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Gift, Store, LifeBuoy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import PackCard from "@/components/PackCard";
import { Image } from "@/components/ui/image";
import ShareButtons from "@/components/ShareButtons";
import PromoBanner from "@/components/PromoBanner";
import BusinessInfoBanner from "@/components/BusinessInfoBanner";
import IntroVideo from "@/components/IntroVideo";
import LeaderboardWidget from "@/components/LeaderboardWidget";
import RecentTrades from "@/components/RecentTrades";
import CategoryImage from "@/components/CategoryImage";
import RecentlyViewedPacks from "@/components/RecentlyViewedPacks";
import FreePackChooser from "@/components/FreePackChooser";

export default function Home() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { welcomePackClaimed, userId, refresh, loaded } = useWallet();
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);
  const [freeChooserOpen, setFreeChooserOpen] = useState(false);

  const claimWelcome = async () => {
    if (loaded && !userId) {
      toast({ title: "Please log in to claim your free pack", description: "You need an account to receive packs." });
      navigate("/login");
      return;
    }
    setClaiming(true);
    try {
      const res = await base44.functions.invoke("claim-welcome-pack", {});
      if (res.data?.error) throw new Error(res.data.error);
      await refresh();
      if (res.data?.already_claimed) {
        toast({ title: "Welcome pack already claimed", description: "Pick any booster to rip your free pack." });
      } else {
        toast({ title: "Welcome pack claimed! 🎉", description: "Pick any booster to open it right now." });
      }
      setFreeChooserOpen(true);
    } catch {
      toast({ title: "Could not claim welcome pack", description: "Please try again or log in.", variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const pickFreePack = (p) => {
    setFreeChooserOpen(false);
    navigate(`/rip/${p.id}?auto=welcome`);
  };

  useEffect(() => {
    base44.entities.Pack.list("-created_date", 50)
      .then((data) => setPacks(data))
      .finally(() => setLoading(false));
  }, []);

  const allFeatured = packs.filter((p) => p.featured);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  const featured = allFeatured.slice(featuredOffset, featuredOffset + 8).concat(
    featuredOffset + 8 > allFeatured.length ? allFeatured.slice(0, (featuredOffset + 8) % allFeatured.length) : []
  );

  // Constantly rotate featured packs every 5 seconds
  useEffect(() => {
    if (allFeatured.length <= 8) return;
    const timer = setInterval(() => {
      setFeaturedOffset((prev) => (prev + 8) % allFeatured.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [allFeatured.length]);

  return (
    <div className="space-y-16">
      <IntroVideo />

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-6 py-16 sm:px-12 sm:py-24">
        <div className="pointer-events-none absolute inset-0">
          <Image src="https://media.base44.com/images/public/6a7815213ea6e3d52ada68aa/497740329_generated_image.png" alt="" fittingType="fill" className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-zinc-950/85 via-zinc-950/75 to-black/90" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-300 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5" /> Rip packs · Pull cards · Build your vault
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-5 font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl"
          >
            Tear open the chase.<br />
            <span className="bg-gradient-to-r from-amber-300 to-orange-500 bg-clip-text text-transparent">One pack at a time.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-5 max-w-lg text-base text-zinc-400 sm:text-lg"
          >
            Rip digital booster packs of Yu-Gi-Oh, Pokémon, Dragon Ball Z, Digimon, Naruto, Bleach, baseball, basketball, football, soccer, cricket, tennis, WNBA, NHL, golf, badminton, table tennis, swimming, track & field, and Formula 1 cards. Watch every hit reveal one by one — from commons to ghost rares and 1/1s.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
            >
              Browse packs <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/5"
            >
              View collection
            </Link>
          </motion.div>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">Share</span>
            <ShareButtons />
          </div>
        </div>
      </section>

      <PromoBanner />

      <RecentlyViewedPacks />

      {/* Categories */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CategoryCard to="/shop?cat=yugioh" category="yugioh" title="Yu-Gi-Oh" desc="Monsters, spells & the Egyptian Gods. Chase Blue-Eyes and Exodia." />
        <CategoryCard to="/shop?cat=pokemon" category="pokemon" title="Pokémon" desc="Catch 'em all. Charizard, Pikachu, and the chase for shining holos." />
        <CategoryCard to="/shop?cat=dragonball" category="dragonball" title="Dragon Ball Z" desc="Super Saiyans, energy auras, and God Rares from the Z era." />
        <CategoryCard to="/shop?cat=digimon" category="digimon" title="Digimon" desc="Digital monsters, digivolutions, and rare foil parallels." />
        <CategoryCard to="/shop?cat=baseball" category="baseball" title="Baseball" desc="MLB rookies, refractors, autos & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=basketball" category="basketball" title="Basketball" desc="NBA rookies, Prizm parallels, autos & rookie patch 1/1s." />
        <CategoryCard to="/shop?cat=naruto" category="naruto" title="Naruto" desc="Hidden Leaf ninjas, deadly jutsu, and the chase for the tailed beasts." />
        <CategoryCard to="/shop?cat=bleach" category="bleach" title="Bleach" desc="Soul Reapers, Bankai releases, and legendary zanpakuto." />
        <CategoryCard to="/shop?cat=football" category="football" title="Football" desc="NFL rookies, autos, jersey relics & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=soccer" category="soccer" title="Soccer" desc="Global stars, rookie refractors, autos & patch 1/1s." />
        <CategoryCard to="/shop?cat=cricket" category="cricket" title="Cricket" desc="International legends, cover drives, yorkers & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=tennis" category="tennis" title="Tennis" desc="Grand slam champions, aces, autos & 1/1 chase cards." />
        <CategoryCard to="/shop?cat=wnba" category="wnba" title="WNBA" desc="Women's hoops legends, rookies, autos & 1/1 patch cards." />
        <CategoryCard to="/shop?cat=nhl" category="nhl" title="NHL" desc="Hockey greats, rookies, autos, jersey relics & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=golf" category="golf" title="Golf" desc="Major champions, hole-in-one moments, autos & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=badminton" category="badminton" title="Badminton" desc="Smash kings, rally legends, autos & 1/1 chase cards." />
        <CategoryCard to="/shop?cat=tabletennis" category="tabletennis" title="Table Tennis" desc="Loop masters, paddle icons, autos & 1/1 patch cards." />
        <CategoryCard to="/shop?cat=swimming" category="swimming" title="Swimming" desc="Olympic pool champions, freestyle sprints, autos & 1/1 Superfractors." />
        <CategoryCard to="/shop?cat=trackfield" category="trackfield" title="Track & Field" desc="Sprint showdowns, world records, autos & 1/1 patch cards." />
        <CategoryCard to="/shop?cat=f1" category="f1" title="Formula 1" desc="Grand prix champions, podium moments, autos & 1/1 Superfractors." />
      </section>

      {/* Business information */}
      <BusinessInfoBanner />

      {/* Booster packs pricing */}
      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
            <h2 className="font-heading text-2xl font-bold text-white">Featured packs</h2>
            <p className="mt-1 text-sm text-zinc-400">Hand-picked releases dropping heat right now.</p>
          </div>
          <Link to="/shop" className="hidden text-sm font-semibold text-amber-300 hover:text-amber-200 sm:inline">
            See all →
          </Link>
        </div>
        {loading ? (
          <SkeletonGrid />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
              <PackCard key={p.id} pack={p} showCharacter />
            ))}
          </div>
        )}
      </section>

      {/* Marketplace */}
      <section>
        <Link
          to="/marketplace"
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-950 p-6 transition-all duration-300 hover:scale-[1.01] hover:border-amber-400/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Store className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Marketplace</h3>
              <p className="mt-1 text-sm text-zinc-400">Buy and sell cards with other collectors. All prices in USD.</p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2.5 text-sm font-bold text-black transition-transform group-hover:scale-105 sm:mt-0">
            Browse marketplace <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* Support */}
      <section>
        <Link
          to="/contact"
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-900 to-zinc-950 p-6 transition-all duration-300 hover:scale-[1.01] hover:border-sky-400/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
              <LifeBuoy className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Support</h3>
              <p className="mt-1 text-sm text-zinc-400">Questions, issues, or feedback? We're here to help.</p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-5 py-2.5 text-sm font-bold text-sky-300 transition-transform group-hover:scale-105 sm:mt-0">
            Contact us <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* Top collectors leaderboard */}
      <LeaderboardWidget />

      {/* Recent completed trades */}
      <RecentTrades />

      {/* Welcome pack */}
      {loaded && !welcomePackClaimed && (
        <section>
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/10 to-orange-500/5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
                <Gift className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-heading text-lg font-bold text-white">Welcome to PackPulseDrops! 🎉</h3>
                <p className="mt-1 text-sm text-zinc-400">Claim your free welcome pack and rip your first booster on the house.</p>
              </div>
            </div>
            <button
              onClick={claimWelcome}
              disabled={claiming}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {claiming ? "Claiming…" : "Claim free pack"}
            </button>
          </div>
        </section>
      )}

      <FreePackChooser open={freeChooserOpen} onOpenChange={setFreeChooserOpen} packs={packs} loading={loading} onPick={pickFreePack} />

    </div>
  );
}

function CategoryCard({ to, category, title, desc }) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-amber-500/10"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <CategoryImage category={category} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-heading text-lg font-bold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-zinc-400">{desc}</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
          <div className="aspect-[3/4] w-full rounded-xl bg-zinc-800" />
          <div className="mt-3 h-4 w-3/4 rounded bg-zinc-800" />
          <div className="mt-2 h-3 w-1/2 rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}