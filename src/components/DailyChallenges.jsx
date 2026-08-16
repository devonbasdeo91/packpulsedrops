import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Target, Check, Gift, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function DailyChallenges() {
  const { userId, loaded, refresh } = useWallet();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState({});

  const load = useCallback(async () => {
    if (!loaded || !userId) return;
    try {
      const res = await base44.functions.invoke("get-daily-challenges", {});
      setChallenges(res.data?.challenges || []);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, [loaded, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const claim = async (type) => {
    setClaiming((c) => ({ ...c, [type]: true }));
    try {
      const res = await base44.functions.invoke("claim-daily-challenge", { challenge_type: type });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.already_claimed) {
        toast({ title: "Already claimed", description: "You've collected this bonus today." });
      } else {
        toast({
          title: "Bonus gems earned! 💎",
          description: `+${res.data?.gems_awarded} gems added to your wallet.`,
        });
        await refresh();
      }
      await load();
    } catch (e) {
      toast({ title: "Could not claim", description: e.message || "Try again later.", variant: "destructive" });
    } finally {
      setClaiming((c) => ({ ...c, [type]: false }));
    }
  };

  if (!loaded || !userId) return null;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" />
          <h2 className="font-heading text-2xl font-bold text-white">Daily challenges</h2>
          <p className="mt-1 text-sm text-zinc-400">Complete tasks to earn bonus gems. Resets every day.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/60" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {challenges.map((c, i) => {
            const pct = Math.min(100, Math.round((c.progress / c.target) * 100));
            return (
              <motion.div
                key={c.type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={cn(
                  "flex flex-col rounded-2xl border p-5",
                  c.claimed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : c.completed
                    ? "border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-orange-500/5"
                    : "border-white/10 bg-zinc-900/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", c.claimed ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-sky-300")}>
                    {c.claimed ? <Check className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                    <Gift className="h-3 w-3" /> {c.gems} gems
                  </span>
                </div>
                <h3 className="mt-4 font-heading text-base font-bold text-white">{c.label}</h3>
                <p className="mt-1 text-xs text-zinc-400">{c.desc}</p>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Progress</span>
                    <span className="font-semibold text-zinc-200">{c.progress}/{c.target}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn("h-full rounded-full transition-all", c.claimed ? "bg-emerald-400" : "bg-gradient-to-r from-sky-400 to-indigo-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => claim(c.type)}
                  disabled={c.claimed || !c.completed || claiming[c.type]}
                  className={cn(
                    "mt-4 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform",
                    c.claimed
                      ? "cursor-default border border-emerald-500/30 text-emerald-300"
                      : c.completed
                      ? "bg-gradient-to-r from-amber-300 to-orange-500 text-black hover:scale-105"
                      : "cursor-not-allowed border border-white/10 text-zinc-500"
                  )}
                >
                  {c.claimed ? (
                    <><Check className="h-4 w-4" /> Claimed</>
                  ) : claiming[c.type] ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Claiming…</>
                  ) : c.completed ? (
                    <><Gift className="h-4 w-4" /> Claim {c.gems} gems</>
                  ) : (
                    "In progress"
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}