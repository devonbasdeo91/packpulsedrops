import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet as WalletIcon, Layers, ArrowRight, Gift } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import SocialContentCard from "@/components/SocialContentCard";
import SocialFeed from "@/components/SocialFeed";
import TradeAlertsBanner from "@/components/TradeAlertsBanner";
import RecentPullsTicker from "@/components/RecentPullsTicker";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { gems, loaded, canClaimFree, referralLink, streak } = useWallet();
  const [pulls, setPulls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await base44.entities.Pull.list("-created_date", 200);
        if (!alive) return;
        setPulls(p || []);
      } catch {
        if (!alive) return;
        setPulls([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const collection = useMemo(() => {
    const count = pulls.length;
    const value = pulls.reduce((s, p) => s + (p.value_gems || 0), 0);
    const best = pulls.reduce((best, p) => (!best || (p.value_gems || 0) > (best.value_gems || 0) ? p : best), null);
    return { count, value, best };
  }, [pulls]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Your daily pack, live pulls, and collection overview.</p>
      </div>

      {/* Daily free pack */}
      <section>
        <div className={`flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between ${canClaimFree ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-zinc-900/40"}`}>
          <div className="flex items-center gap-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${canClaimFree ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-zinc-400"}`}>
              <Gift className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Daily free pack</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {canClaimFree ? "Your free rip is ready — claim it on any pack." : "You've claimed today's free pack. Come back tomorrow!"}
                {streak > 0 && <span className="ml-1 font-semibold text-amber-300">🔥 {streak}-day streak</span>}
              </p>
            </div>
          </div>
          <Link
            to="/shop"
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-transform hover:scale-105 ${canClaimFree ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-black" : "border border-white/15 text-white hover:bg-white/5"}`}
          >
            {canClaimFree ? "Claim now" : "Browse packs"} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <RecentPullsTicker />

      <TradeAlertsBanner />

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={WalletIcon}
          label="Best pull"
          value={loading ? "…" : collection.best ? collection.best.name : "—"}
          sub={collection.best ? collection.best.rarity : ""}
          to="/collection"
          cta="View collection"
        />
        <StatCard
          icon={Layers}
          label="Collection size"
          value={loading ? "…" : `${collection.count} card${collection.count === 1 ? "" : "s"}`}
          to="/collection"
          cta="View collection"
        />
      </div>

      <SocialContentCard
        stats={{
          gems,
          collectionValue: collection.value,
          collectionCount: collection.count,
          bestPullName: collection.best?.name,
          bestPullRarity: collection.best?.rarity,
        }}
      />

      <SocialFeed />

      {/* Invite friends */}
      <section>
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Gift className="h-6 w-6" />
            </span>
            <div>
              <h3 className="font-heading text-lg font-bold text-white">Invite friends, get a free pack</h3>
              <p className="mt-1 text-sm text-zinc-400">
                Share your link — each signup earns you a <span className="text-white">free pack</span> as a thank-you.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={referralLink}
              onClick={(e) => e.target.select()}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-zinc-300 outline-none"
            />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(referralLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white transition-transform hover:scale-105"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, accent, to, cta }) {
  const inner = (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-zinc-900/60 p-5 transition-colors hover:border-white/20">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("mt-3 truncate text-2xl font-bold", accent || "text-white")}>{value}</p>
      {sub && <p className="truncate text-xs text-zinc-500">{sub}</p>}
      {cta && (
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
          {cta} <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </div>
  );
  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}