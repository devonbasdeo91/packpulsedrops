import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, Repeat, Sparkles, CheckCircle2, AlertTriangle, Volume2, VolumeX, Eye, DollarSign } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useWallet } from "@/components/WalletProvider";
import { Image } from "@/components/ui/image";
import SpinningCardReel from "@/components/SpinningCardReel";
import TradingCard from "@/components/TradingCard";
import PullShareButton from "@/components/PullShareButton";
import OddsTable from "@/components/OddsTable";
import PackContentsDialog from "@/components/PackContentsDialog";
import { PACK_TIERS, TIER_ORDER, GEMS_PER_USD } from "@/lib/packTiers";
import RecentPackPulls from "@/components/RecentPackPulls";
import CardCarousel from "@/components/CardCarousel";
import DigitalDisclaimer from "@/components/DigitalDisclaimer";
import PackBackgroundArt from "@/components/PackBackgroundArt";
import { cn } from "@/lib/utils";
import { isPromoActive, promoUsd } from "@/lib/promo";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import PackReviewForm from "@/components/PackReviewForm";
import PackRatingBadge from "@/components/PackRatingBadge";
import CardLightbox from "@/components/CardLightbox";
import { playTearSound, playRevealSound, isSoundMuted, setSoundMuted } from "@/lib/ripSounds";
import { toast } from "@/components/ui/use-toast";
import confetti from "canvas-confetti";

const CATEGORY_THEME = {
  yugioh: { glow: "rgba(139,92,246,0.15)", accent: "#8b5cf6" },
  pokemon: { glow: "rgba(245,158,11,0.15)", accent: "#f59e0b" },
  dragonball: { glow: "rgba(249,115,22,0.15)", accent: "#f97316" },
  digimon: { glow: "rgba(34,211,238,0.15)", accent: "#22d3ee" },
  baseball: { glow: "rgba(16,185,129,0.15)", accent: "#10b981" },
  basketball: { glow: "rgba(234,88,12,0.15)", accent: "#ea580c" },
  football: { glow: "rgba(180,83,9,0.15)", accent: "#b45309" },
  soccer: { glow: "rgba(34,197,94,0.15)", accent: "#22c55e" },
  cricket: { glow: "rgba(22,163,74,0.15)", accent: "#16a34a" },
  tennis: { glow: "rgba(234,179,8,0.15)", accent: "#eab308" },
  wnba: { glow: "rgba(249,115,22,0.15)", accent: "#f97316" },
  nhl: { glow: "rgba(56,189,248,0.15)", accent: "#38bdf8" },
  golf: { glow: "rgba(16,185,129,0.15)", accent: "#10b981" },
  badminton: { glow: "rgba(132,204,22,0.15)", accent: "#84cc16" },
  tabletennis: { glow: "rgba(244,63,94,0.15)", accent: "#f43f5e" },
  swimming: { glow: "rgba(6,182,212,0.15)", accent: "#06b6d4" },
  trackfield: { glow: "rgba(245,158,11,0.15)", accent: "#f59e0b" },
  naruto: { glow: "rgba(245,158,11,0.15)", accent: "#f59e0b" },
  bleach: { glow: "rgba(56,189,248,0.15)", accent: "#38bdf8" },
  f1: { glow: "rgba(239,68,68,0.15)", accent: "#ef4444" },
};

function fireConfetti(rarity) {
  const tier = {
    "Super Rare": { count: 25, spread: 50, colors: ["#a78bfa", "#7c3aed"] },
    Refractor: { count: 25, spread: 50, colors: ["#2dd4bf", "#0891b2"] },
    "Ultra Rare": { count: 70, spread: 70, colors: ["#fbbf24", "#f97316"] },
    Auto: { count: 70, spread: 70, colors: ["#fbbf24", "#f97316"] },
    "Secret Rare": { count: 90, spread: 80, colors: ["#f472b6", "#e11d48"] },
    Relic: { count: 90, spread: 80, colors: ["#f472b6", "#e11d48"] },
    "Ghost Rare": { count: 120, spread: 100, colors: ["#ffffff", "#e5e7eb"] },
    "1/1": { count: 150, spread: 100, colors: ["#ffffff", "#fbbf24"] },
    Diamond: { count: 200, spread: 120, colors: ["#67e8f9", "#ffffff", "#bae6fd"] },
  }[rarity];
  if (!tier) return;
  confetti({ particleCount: tier.count, spread: tier.spread, origin: { y: 0.6 }, colors: tier.colors });
}

export default function Rip() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, navigateToLogin } = useAuth();
  const { gems, loaded, canClaimFree, referralCredits, purchasedPacks, packCredits, refresh, userId } = useWallet();

  const [pack, setPack] = useState(null);
  const [pool, setPool] = useState([]);
  const [allPacks, setAllPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState("ready"); // ready | choosing | tearing | revealing | done
  const [pulled, setPulled] = useState([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingMethod, setPendingMethod] = useState(null);
  const [shareBonusDone, setShareBonusDone] = useState(false);
  const [shareBonusBusy, setShareBonusBusy] = useState(false);
  const [muted, setMuted] = useState(isSoundMuted());
  const [tier, setTier] = useState("silver");
  const [showContents, setShowContents] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [viewing, setViewing] = useState(null);
  const timers = useRef([]);
  const autoRipped = useRef(false);

  // Pre-select tier from ?tier= URL param (set by TierPackGrid on the Shop page)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier");
    if (tierParam && TIER_ORDER.includes(tierParam)) {
      setTier(tierParam);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    base44.entities.Pack.get(id)
      .then((p) => {
        if (!alive) return;
        setPack(p);
        if (p) addRecentlyViewed(id);
        return Promise.all([
          base44.entities.Card.filter({ pack_id: id }, "-created_date", 50),
          base44.entities.Pack.list("-created_date", 50),
        ]);
      })
      .then((result) => {
        if (!alive) return;
        const [cards, packs] = result || [];
        setPool(cards || []);
        setAllPacks(packs || []);
      })
      .catch(() => alive && setPack(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
    };
  }, [id]);

  // Auto-start a free rip when the user arrives from the free-pack chooser
  useEffect(() => {
    if (autoRipped.current) return;
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("auto");
    if (!auto || !pack || !loaded || busy || phase !== "ready") return;
    if (auto === "welcome" && packCredits > 0) {
      autoRipped.current = true;
      initiateRip("welcome");
    } else if (auto === "daily" && canClaimFree) {
      autoRipped.current = true;
      initiateRip("daily");
    }
  }, [pack, loaded, packCredits, canClaimFree, busy, phase]);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPulled([]);
    setRevealedCount(0);
    setError("");
    setShareBonusDone(false);
    setPendingMethod(null);
    setPhase("ready");
  }

  async function buyCash() {
    setError("");
    if (window.self !== window.top) {
      setError("Checkout only works from the published app. Open the app in a new tab.");
      return;
    }
    setBusy(true);
    try {
      const res = await base44.functions.invoke("create-pack-checkout", { pack_id: pack.id, tier });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Checkout failed");
      setBusy(false);
    }
  }

  async function claimShareBonus() {
    setShareBonusBusy(true);
    try {
      // 1. Request a signed, single-use token from the server — this proves
      //    the user initiated a share action rather than calling the claim
      //    endpoint directly via API.
      const issueRes = await base44.functions.invoke("issue-share-token", {});
      if (issueRes.data?.already) {
        toast({ title: "Share bonus already claimed today — come back tomorrow!" });
        setShareBonusDone(true);
        return;
      }
      if (issueRes.data?.error || !issueRes.data?.token) {
        throw new Error(issueRes.data?.error || "Could not start share claim");
      }
      // 2. Claim the bonus with the issued token.
      const res = await base44.functions.invoke("claim-share-bonus", { token: issueRes.data.token });
      if (res.data?.already) {
        toast({ title: "Share bonus already claimed today — come back tomorrow!" });
      } else if (res.data?.error) {
        throw new Error(res.data.error);
      } else {
        await refresh();
        toast({ title: "Share bonus claimed! 🎁" });
      }
      setShareBonusDone(true);
    } catch (e) {
      toast({ title: "Could not claim bonus", description: e.message, variant: "destructive" });
    } finally {
      setShareBonusBusy(false);
    }
  }

  function initiateRip(freeType = null) {
    if (!pack) return;
    setError("");
    // Free/welcome/referral/credit rips require an authenticated session.
    if (freeType && !isAuthed) {
      navigateToLogin();
      return;
    }
    const costUsd = promoUsd(PACK_TIERS[tier]?.price_usd || 1);
    if (!freeType && loaded && isAuthed && gems * GEMS_PER_USD < costUsd) {
      setError("Insufficient funds for this pack.");
      return;
    }
    const method = freeType === "daily" ? "free" : freeType === "referral" ? "referral" : freeType === "purchased" ? "credit" : freeType === "welcome" ? "welcome" : "gems";
    setPendingMethod(method);
    setPhase(method === "gems" ? "confirm" : "choosing");
  }

  async function confirmRipSelection() {
    if (!pendingMethod) return;
    setBusy(true);
    let picks;
    let bonusTriggered = false;
    try {
      const res = await base44.functions.invoke("open-pack", { pack_id: pack.id, method: pendingMethod, tier });
      if (res.data?.error) throw new Error(res.data.error);
      picks = res.data.picks;
      bonusTriggered = !!res.data.bonus_triggered;
      await refresh();
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message || "Rip failed";
      // 401 = session expired. Redirect to login so the user can re-authenticate
      // and then retry the rip — instead of leaving them stuck with an error.
      if (status === 401 || /unauthor|auth|token/i.test(msg)) {
        navigateToLogin();
        return;
      }
      setError(msg);
      setBusy(false);
      setPhase("ready");
      return;
    }
    try {
      // Ensure every pulled card has artwork before the reveal
      if (!picks || !Array.isArray(picks) || picks.length === 0) {
        setError("No cards were pulled. Please try again.");
        setBusy(false);
        setPhase("ready");
        return;
      }
      setPreparing(true);
      picks = await Promise.all(picks.map(async (c) => {
        if (c.image_url) return c;
        try {
          const r = await base44.functions.invoke("ensure-card-art", { card_name: c.name, category: c.category, rarity: c.rarity });
          if (r.data?.image_url) return { ...c, image_url: r.data.image_url };
        } catch { /* reveal without art if generation fails */ }
        return c;
      }));
      setPreparing(false);
      setBusy(false);
      setPulled(picks);
      setRevealedCount(0);
      // Auto-log the pull to the user's Google Sheet (fire-and-forget; skipped if not connected)
      const bonus = bonusTriggered;
      base44.functions
        .invoke("log-pull-to-sheets", {
          pulls: picks.map((c, i) => ({
            pack_name: pack.name,
            name: c.name,
            category: c.category,
            rarity: c.rarity,
            subset: c.subset,
            value_gems: c.value_gems,
            bonus: bonus && picks.length > 1 && i === picks.length - 1,
          })),
        })
        .catch(() => {});
      setPhase("tearing");
      playTearSound();

      const tearDone = setTimeout(() => {
        setPhase("swiping");
      }, 600);
      timers.current.push(tearDone);
    } catch (e) {
      console.error("confirmRipSelection error", e);
      setError(e.message || "Something went wrong during the rip. Please try again.");
      setPreparing(false);
      setBusy(false);
      setPhase("ready");
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        <p className="text-zinc-300">Pack not found.</p>
        <Link to="/shop" className="mt-4 inline-flex items-center gap-2 text-amber-300">
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>
      </div>
    );
  }

  const tierPrice = PACK_TIERS[tier]?.price_usd || 1;
  const promoOn = isPromoActive();
  const discountedPrice = promoUsd(tierPrice);
  const balanceUsd = gems * GEMS_PER_USD;
  const insufficient = loaded && balanceUsd < discountedPrice;
  const theme = CATEGORY_THEME[pack.category] || CATEGORY_THEME.pokemon;
  const isAuthed = !!user || !!userId;
  const freeAvailable = isAuthed && (canClaimFree || referralCredits > 0 || packCredits > 0);
  const bestPull = pulled.reduce(
    (best, c) => (!best || (c.value_gems || 0) > (best.value_gems || 0) ? c : best),
    null
  );

  return (
    <div className="space-y-8">
      <button onClick={() => navigate("/shop")} className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Shop
      </button>

      {/* Pack header */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <div className="relative h-48 w-36 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-800 to-zinc-950">
          <Image src={pack.image_url} alt={pack.name} fittingType="fill" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-3xl font-bold text-white">{pack.name}</h1>
            <PackRatingBadge packId={pack.id} className="text-sm" />
          </div>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">{pack.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300">
              <DollarSign className="h-4 w-4 text-amber-300" />
              {promoOn ? (
                <>
                  <span className="text-zinc-500 line-through">${tierPrice.toFixed(2)}</span>
                  <span>${discountedPrice.toFixed(2)}</span>
                </>
              ) : (
                <span>${tierPrice.toFixed(2)}</span>
              )}
            </span>
            <span className="text-xs text-zinc-500">{pack.bonus_card_chance > 0 ? "1-2 cards per pack" : "1 card per pack"}</span>
          </div>
          <DigitalDisclaimer className="mt-3 max-w-md" />
          <button
            onClick={() => setShowContents(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <Eye className="h-4 w-4" /> See what's inside
          </button>
        </div>
      </div>

      {/* Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black px-4 py-12 shadow-2xl sm:px-8">
        <button
          onClick={() => { const m = !muted; setMuted(m); setSoundMuted(m); }}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-zinc-300 backdrop-blur-sm transition-colors hover:text-white"
          title={muted ? "Unmute rip sounds" : "Mute rip sounds"}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle at 50% 0%, ${theme.glow}, transparent 55%)` }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.03),transparent_50%)]" />

        {phase === "ready" && (
          <div className="relative flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative"
            >
              <motion.div
                animate={{ y: [0, -10, 0], rotate: [-1, 1, -1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="h-56 w-44 overflow-hidden rounded-2xl border-2 shadow-2xl"
                style={{ borderColor: theme.accent, boxShadow: `0 0 50px ${theme.glow}` }}
              >
                <Image src={pack.image_url} alt={pack.name} fittingType="fill" className="h-full w-full object-cover" />
              </motion.div>
            </motion.div>

            {error && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4" /> {error}
              </p>
            )}

            <div className="mt-6 w-full max-w-md">
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-zinc-400">Choose your pack</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {TIER_ORDER.map((key) => {
                  const t = PACK_TIERS[key];
                  const activeTier = tier === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setTier(key)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-left transition-colors",
                        activeTier ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      )}
                    >
                      <p className={cn("text-xs font-bold", activeTier ? "text-amber-300" : "text-white")}>{t.label}</p>
                      {promoOn ? (
                        <p className="text-[10px]">
                          <span className="text-zinc-600 line-through">${t.price_usd.toFixed(2)}</span>{" "}
                          <span className="text-zinc-300">${promoUsd(t.price_usd).toFixed(2)}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500">${t.price_usd.toFixed(2)}</p>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">{PACK_TIERS[tier].blurb}</p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              {!isAuthed && loaded && (
                <button
                  onClick={() => navigateToLogin()}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-4 text-base font-bold text-black transition-transform hover:scale-105"
                >
                  <Sparkles className="h-5 w-5" />
                  Login to rip packs
                </button>
              )}

              {isAuthed && purchasedPacks.filter((pid) => pid === pack.id || (typeof pid === "string" && pid.startsWith(pack.id + "|"))).length > 0 && (
                <button
                  onClick={() => initiateRip("purchased")}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-8 py-4 text-base font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
                >
                  <Sparkles className="h-5 w-5" />
                  Open purchased pack ({purchasedPacks.filter((pid) => pid === pack.id || (typeof pid === "string" && pid.startsWith(pack.id + "|"))).length} left)
                </button>
              )}

              {isAuthed && packCredits > 0 && (
                <button
                  onClick={() => initiateRip("welcome")}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-8 py-4 text-base font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
                >
                  <Sparkles className="h-5 w-5" />
                  Rip free — welcome pack ({packCredits} left)
                </button>
              )}

              {freeAvailable && (
                <button
                  onClick={() => initiateRip(canClaimFree ? "daily" : "referral")}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 px-8 py-4 text-base font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
                >
                  <Sparkles className="h-5 w-5" />
                  {canClaimFree ? "Rip free — daily bonus" : `Rip free — referral (${referralCredits} left)`}
                </button>
              )}

              {isAuthed && (
                <button
                  onClick={() => initiateRip(null)}
                  disabled={insufficient || busy}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-bold transition-transform",
                    insufficient || busy
                      ? "cursor-not-allowed bg-zinc-800 text-zinc-500"
                      : "bg-gradient-to-r from-amber-300 to-orange-500 text-black hover:scale-105"
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                  {insufficient ? "Insufficient funds" : (
                    <span className="flex items-center gap-1.5">
                      Rip for {promoOn ? (
                        <>
                          <span className="text-zinc-300 line-through opacity-60">${tierPrice.toFixed(2)}</span>
                          <span>${discountedPrice.toFixed(2)}</span>
                        </>
                      ) : (
                        <span>${tierPrice.toFixed(2)}</span>
                      )}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={buyCash}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 px-8 py-3 text-sm font-bold text-amber-300 transition-transform hover:scale-105 disabled:opacity-60"
              >
                Unlock for ${tierPrice.toFixed(2)}
              </button>

              {isAuthed && insufficient && (
                <div className="mt-4 flex w-full max-w-md flex-col items-center gap-3">
                  <p className="text-xs text-zinc-500">
                    You have ${balanceUsd.toFixed(2)} — this pack costs ${discountedPrice.toFixed(2)}. Add funds to rip it.
                  </p>
                  <Link
                    to="/wallet"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2 text-sm font-bold text-black transition-transform hover:scale-105"
                  >
                    <DollarSign className="h-4 w-4" /> Add funds
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "confirm" && (
          <div className="relative flex flex-col items-center text-center">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
              <div className="h-40 w-28 overflow-hidden rounded-xl border border-white/10">
                <Image src={pack.image_url} alt={pack.name} fittingType="fill" className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-bold text-white">Confirm purchase</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Rip the <span className="font-semibold text-white">{PACK_TIERS[tier].label} Pack</span> for{" "}
                {promoOn ? (
                  <span className="font-bold text-amber-300">
                    <span className="text-zinc-500 line-through">${tierPrice.toFixed(2)}</span> ${discountedPrice.toFixed(2)}
                  </span>
                ) : (
                  <span className="font-bold text-amber-300">${tierPrice.toFixed(2)}</span>
                )}?
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Balance after: ${(balanceUsd - discountedPrice).toFixed(2)}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => { setPendingMethod(null); setPhase("ready"); }}
                  className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setPhase("choosing")}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-8 py-2.5 text-sm font-bold text-black hover:scale-105 transition-transform"
                >
                  <DollarSign className="h-4 w-4" /> Confirm & rip
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {phase === "choosing" && (
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => { setPendingMethod(null); setPhase("ready"); }}
              disabled={busy}
              aria-label="Cancel"
              className="absolute left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              <X className="h-5 w-5" />
            </button>
            <CardCarousel onSelect={confirmRipSelection} accent={theme.accent} />
            {preparing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 rounded-3xl bg-black/70 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-700 border-t-amber-400" />
                <p className="text-sm font-semibold text-amber-300">Generating card art…</p>
              </div>
            )}
          </div>
        )}

        {(phase === "tearing" || phase === "swiping" || phase === "done") && (
          <PackBackgroundArt category={pack.category} />
        )}

        {phase === "tearing" && (
          <div className="relative flex flex-col items-center">
            <motion.div
              initial={{ scale: 1 }}
              animate={{ x: [0, -10, 10, -8, 8, -5, 5, 0], rotate: [0, -4, 4, -3, 3, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="h-56 w-44 overflow-hidden rounded-2xl border-2 shadow-2xl"
              style={{ borderColor: theme.accent, boxShadow: `0 0 70px ${theme.glow}` }}
            >
              <Image src={pack.image_url} alt={pack.name} fittingType="fill" className="h-full w-full object-cover" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-sm font-bold uppercase tracking-widest text-amber-300"
            >
              Tearing open…
            </motion.p>
          </div>
        )}

        {phase === "swiping" && (
          <div className="relative">
            <SpinningCardReel
              cards={pulled}
              onReveal={(c) => { if (!c) return; fireConfetti(c.rarity); playRevealSound(c.rarity); }}
              onAllRevealed={() => setPhase("done")}
            />
          </div>
        )}

        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex flex-col items-center gap-4 text-center"
          >
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Pack ripped!</span>
            </div>

            {bestPull && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-400">Best pull</p>
                <button
                  onClick={() => setViewing(bestPull)}
                  className="mt-2 w-28 sm:w-36 text-center transition-transform hover:scale-105"
                >
                  <TradingCard card={bestPull} />
                  <p className="mt-1 text-xs font-semibold text-emerald-300">${((bestPull.value_gems || 0) * GEMS_PER_USD).toFixed(2)}</p>
                  <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">Tap to enlarge</p>
                </button>
              </div>
            )}

            {bestPull && (
              <ValueContext valueUsd={(bestPull.value_gems || 0) * GEMS_PER_USD} costUsd={discountedPrice} />
            )}

            <PullShareButton pull={bestPull} packName={pack.name} packId={pack.id} />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5"
              >
                <Repeat className="h-4 w-4" /> Rip again
              </button>
              <Link
                to="/collection"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black hover:scale-105 transition-transform"
              >
                Go to Vault
              </Link>
            </div>

            <PackReviewForm packId={pack.id} packName={pack.name} />
          </motion.div>
        )}
      </div>

      <RecentPackPulls packName={pack.name} pool={pool} />

      <OddsTable pool={pool} tier={tier} />

      <PackContentsDialog open={showContents} onOpenChange={setShowContents} pack={pack} pool={pool} />

      <CardLightbox card={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function ValueContext({ valueUsd, costUsd }) {
  let msg, tone;
  if (valueUsd <= 0) {
    msg = "No cash value this time — chase the next one!";
    tone = "text-zinc-400";
  } else {
    const ratio = valueUsd / costUsd;
    if (ratio >= 3) {
      msg = `🔥 Huge hit! $${valueUsd.toFixed(2)} — ${ratio.toFixed(1)}× your spend!`;
      tone = "text-amber-300";
    } else if (ratio >= 1) {
      msg = `Nice! $${valueUsd.toFixed(2)} — ${ratio.toFixed(1)}× your spend.`;
      tone = "text-emerald-300";
    } else {
      msg = `Pulled $${valueUsd.toFixed(2)} — under pack cost.`;
      tone = "text-zinc-300";
    }
  }
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <p className={cn("text-sm font-semibold", tone)}>{msg}</p>
      <p className="mt-0.5 text-xs text-zinc-500">Card value ≈ ${valueUsd.toFixed(2)}</p>
    </div>
  );
}