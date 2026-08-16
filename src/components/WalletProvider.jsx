import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { user, checkUserAuth } = useAuth();
  const [gems, setGems] = useState(0);
  const [lastFreePack, setLastFreePack] = useState("");
  const [referralCredits, setReferralCredits] = useState(0);
  const [referredBy, setReferredBy] = useState("");
  const [userId, setUserId] = useState("");
  const [packCredits, setPackCredits] = useState(0);
  const [purchasedPacks, setPurchasedPacks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [lastDailyReward, setLastDailyReward] = useState("");
  const [dailyStreak, setDailyStreak] = useState(0);
  const [welcomePackClaimed, setWelcomePackClaimed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const applyUser = useCallback((me) => {
    if (!me) return;
    if (typeof me.gems === "number") setGems(me.gems);
    setLastFreePack(me.last_free_pack || "");
    setReferralCredits(me.referral_credits || 0);
    setReferredBy(me.referred_by || "");
    setUserId(me.id || "");
    setPackCredits(me.pack_credits || 0);
    setPurchasedPacks(Array.isArray(me.purchased_packs) ? me.purchased_packs : []);
    setStreak(me.streak || 0);
    setLastDailyReward(me.last_daily_reward || "");
    setDailyStreak(me.daily_reward_streak || 0);
    setWelcomePackClaimed(!!me.welcome_pack_claimed);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      applyUser(me);
    } catch {
      /* not logged in — server is source of truth, no client fallback */
    } finally {
      setLoaded(true);
    }
  }, [applyUser]);

  // Use the AuthContext user for the initial load so we don't make a duplicate
  // auth.me() call that could fail independently.
  useEffect(() => {
    if (user) {
      applyUser(user);
      setLoaded(true);
    } else {
      // No user from AuthContext yet — try fetching directly.
      refresh();
    }
  }, [user, applyUser, refresh]);

  const todayStr = useCallback(() => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }, []);

  // Re-check shortly after load to pick up any async balance changes.
  useEffect(() => {
    const t = setTimeout(() => { refresh(); }, 4000);
    return () => clearTimeout(t);
  }, [refresh]);

  const canClaimFree = lastFreePack !== todayStr();

  const referralLink = userId
    ? `${window.location.origin}/register?ref=${userId}`
    : "";

  // Apply a pending referral code once after the user first logs in.
  useEffect(() => {
    if (!loaded || !userId) return;
    const pending = localStorage.getItem("pendingRef");
    if (!pending) return;
    if (referredBy) {
      localStorage.removeItem("pendingRef");
      return;
    }
    base44.functions
      .invoke("apply-referral", { referral_code: pending })
      .then((res) => {
        if (res.data?.success) {
          localStorage.removeItem("pendingRef");
          refresh();
        }
      })
      .catch((e) => {
        if (e.response?.status === 400) localStorage.removeItem("pendingRef");
      });
  }, [loaded, userId, referredBy, refresh]);

  // Real-time: when one of the user's marketplace listings sells, refresh the
  // wallet so the proceeds (gems = dollar value) are visible and usable at once.
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = base44.entities.Listing.subscribe((event) => {
      if (event.type === "update" && event.data) {
        const l = event.data;
        if (l.seller_id === userId && l.status === "sold") {
          const usd = ((l.ask_price_gems || 0) * 0.95 * 0.0035).toFixed(2);
          toast({ title: "Card sold!", description: `${l.card_name} sold — $${usd} added to your wallet.` });
          refresh();
        }
      }
    });
    return unsubscribe;
  }, [userId, refresh]);

  return (
    <WalletContext.Provider value={{ gems, refresh, loaded, canClaimFree, referralCredits, referralLink, userId, packCredits, purchasedPacks, streak, lastDailyReward, dailyStreak, welcomePackClaimed }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}