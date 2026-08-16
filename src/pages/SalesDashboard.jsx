import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Tag,
  ArrowUpRight,
  Store,
  Trophy,
  ArrowRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import { GEMS_PER_USD, formatUsd } from "@/lib/gemValue";
import { cn } from "@/lib/utils";
import DigitalDisclaimer from "@/components/DigitalDisclaimer";
import PullToRefresh from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";

const MARKETPLACE_FEE = 0.05; // 5% marketplace fee, sellers keep 95%
const CATEGORY_COLORS = ["#fbbf24", "#f97316", "#a78bfa", "#34d399", "#60a5fa", "#f472b6", "#facc15", "#fb923c"];

export default function SalesDashboard() {
  const { userId, loaded } = useWallet();
  const queryClient = useQueryClient();

  const { data: sold = [], isLoading: loadingSold } = useQuery({
    queryKey: ["sales-dashboard-sold", userId],
    queryFn: async () => {
      if (!userId) return [];
      const data = await base44.entities.Listing.filter(
        { status: "sold", seller_id: userId },
        "-sold_date",
        200
      );
      return data || [];
    },
    enabled: !!userId,
  });

  const { data: active = [], isLoading: loadingActive } = useQuery({
    queryKey: ["sales-dashboard-active", userId],
    queryFn: async () => {
      if (!userId) return [];
      const data = await base44.entities.Listing.filter(
        { status: "active", seller_id: userId },
        "-created_date",
        200
      );
      return data || [];
    },
    enabled: !!userId,
  });

  const loading = loadingSold || loadingActive;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard-sold", userId] }),
      queryClient.invalidateQueries({ queryKey: ["sales-dashboard-active", userId] }),
    ]);
  };

  const stats = useMemo(() => {
    const grossGems = sold.reduce((s, l) => s + (l.ask_price_gems || 0), 0);
    const netGems = Math.round(grossGems * (1 - MARKETPLACE_FEE));
    const grossUsd = grossGems * GEMS_PER_USD;
    const netUsd = netGems * GEMS_PER_USD;
    const feesUsd = grossUsd - netUsd;
    const count = sold.length;
    const avgGems = count ? Math.round(grossGems / count) : 0;
    const best = sold.reduce(
      (b, l) => (!b || (l.ask_price_gems || 0) > (b.ask_price_gems || 0) ? l : b),
      null
    );
    const activeCount = active.length;
    const activeGems = active.reduce((s, l) => s + (l.ask_price_gems || 0), 0);
    const activeUsd = activeGems * GEMS_PER_USD;
    return { grossGems, netGems, grossUsd, netUsd, feesUsd, count, avgGems, best, activeCount, activeGems, activeUsd };
  }, [sold, active]);

  // Daily sales for the last 30 days (gross gems per day).
  const chartData = useMemo(() => {
    const days = 30;
    const map = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { date: key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), gems: 0, usd: 0 });
    }
    for (const l of sold) {
      const raw = l.sold_date || l.updated_date || l.created_date;
      if (!raw) continue;
      const key = new Date(raw).toISOString().slice(0, 10);
      const bucket = map.get(key);
      if (bucket) {
        bucket.gems += l.ask_price_gems || 0;
        bucket.usd += (l.ask_price_gems || 0) * GEMS_PER_USD;
      }
    }
    return Array.from(map.values());
  }, [sold]);

  // Top-selling categories by USD volume.
  const categoryData = useMemo(() => {
    const map = new Map();
    for (const l of sold) {
      const cat = l.category || "unknown";
      const usd = (l.ask_price_gems || 0) * GEMS_PER_USD;
      const existing = map.get(cat) || { category: cat, usd: 0, count: 0 };
      existing.usd += usd;
      existing.count += 1;
      map.set(cat, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.usd - a.usd);
  }, [sold]);

  const recent = useMemo(
    () =>
      [...sold]
        .sort(
          (a, b) =>
            new Date(b.sold_date || b.updated_date || b.created_date || 0).getTime() -
            new Date(a.sold_date || a.updated_date || a.created_date || 0).getTime()
        )
        .slice(0, 8),
    [sold]
  );

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-amber-400" /> Sales Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track your marketplace earnings and sales performance. Sellers keep 95% of each sale.
          </p>
          <DigitalDisclaimer className="mt-3" />
        </div>

        {!loaded || loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-900/60" />
            ))}
          </div>
        ) : (
          <>
            {/* Top stat cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={DollarSign}
                label="Net earnings"
                value={formatUsd(stats.netGems)}
                sub={`${stats.grossGems.toLocaleString()} gems gross`}
                accent="text-emerald-300"
              />
              <StatCard
                icon={DollarSign}
                label="Avg sale value"
                value={stats.count ? formatUsd(stats.avgGems) : "—"}
                sub={`${stats.feesUsd.toFixed(2)} in fees`}
                accent="text-amber-300"
              />
              <StatCard
                icon={ShoppingBag}
                label="Sales completed"
                value={stats.count.toLocaleString()}
                sub={stats.count ? `Avg ${formatUsd(stats.avgGems)}` : "—"}
              />
              <StatCard
                icon={Tag}
                label="Active listings"
                value={stats.activeCount.toLocaleString()}
                sub={stats.activeCount ? `${formatUsd(stats.activeGems)} listed` : "—"}
                to="/marketplace"
                cta="View marketplace"
              />
            </div>

            {stats.count === 0 && stats.activeCount === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
                <Store className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-400">No marketplace activity yet.</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Rip packs to pull cards, then list your hits for other collectors to buy.
                </p>
                <Link
                  to="/collection"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
                >
                  Go to your vault <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                {/* Sales chart */}
                <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-heading text-lg font-bold text-white">Sales — last 30 days</h2>
                      <p className="text-xs text-zinc-500">Gross sales volume per day (USD)</p>
                    </div>
                    <span className="flex items-center gap-1 text-sm font-bold text-amber-300">
                      <DollarSign className="h-4 w-4" />
                      {chartData.reduce((s, d) => s + d.usd, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#a1a1aa", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.ceil(chartData.length / 6)}
                        />
                        <YAxis
                          tick={{ fill: "#a1a1aa", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          tickFormatter={(v) => `$${v.toFixed(0)}`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(251,191,36,0.08)" }}
                          contentStyle={{
                            background: "rgba(24,24,27,0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            fontSize: 12,
                            color: "#fff",
                          }}
                          labelStyle={{ color: "#a1a1aa" }}
                          formatter={(v) => [`$${v.toFixed(2)}`, "Gross"]}
                        />
                        <Bar dataKey="usd" fill="url(#salesGradient)" radius={[4, 4, 0, 0]} />
                        <defs>
                          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fbbf24" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* Top-selling categories */}
                {categoryData.length > 0 && (
                  <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
                    <div className="mb-4">
                      <h2 className="font-heading text-lg font-bold text-white">Top-selling categories</h2>
                      <p className="text-xs text-zinc-500">Sales volume by category (USD)</p>
                    </div>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                      <div className="h-56 w-full lg:w-1/2">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryData}
                              dataKey="usd"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={85}
                              paddingAngle={2}
                              stroke="none"
                            >
                              {categoryData.map((entry, i) => (
                                <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                background: "rgba(24,24,27,0.95)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 12,
                                fontSize: 12,
                                color: "#fff",
                              }}
                              formatter={(v, n) => [`$${v.toFixed(2)}`, n]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2">
                        {categoryData.slice(0, 6).map((c, i) => (
                          <div key={c.category} className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                            />
                            <span className="flex-1 truncate text-sm font-medium text-zinc-200 capitalize">{c.category}</span>
                            <span className="text-sm font-bold text-amber-300">${c.usd.toFixed(2)}</span>
                            <span className="text-xs text-zinc-500">{c.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                {/* Best sale + breakdown */}
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 lg:col-span-1">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Trophy className="h-4 w-4 text-amber-300" />
                      <span className="text-xs font-medium uppercase tracking-wider">Best sale</span>
                    </div>
                    {stats.best ? (
                      <div className="mt-3">
                        <p className="truncate text-lg font-bold text-white">{stats.best.card_name}</p>
                        <p className="text-xs text-zinc-500">{stats.best.rarity} · {stats.best.category}</p>
                        <p className="mt-2 flex items-center gap-1 text-2xl font-bold text-amber-300">
                          <DollarSign className="h-5 w-5" />
                          {formatUsd(stats.best.ask_price_gems)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-zinc-500">No sales yet.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 lg:col-span-2">
                    <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">Earnings breakdown</h3>
                    <div className="mt-3 space-y-2.5 text-sm">
                      <Row label="Gross sales" value={`$${stats.grossUsd.toFixed(2)}`} />
                      <Row label="Marketplace fee (5%)" value={`−$${stats.feesUsd.toFixed(2)}`} valueClass="text-rose-300" />
                      <div className="my-2 border-t border-white/10" />
                      <Row label="Net earnings" value={`$${stats.netUsd.toFixed(2)}`} valueClass="text-emerald-300 font-bold" />
                      <Row label="Active listings value" value={`$${stats.activeUsd.toFixed(2)}`} />
                    </div>
                  </div>
                </div>

                {/* Recent sales */}
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-heading text-xl font-bold text-white">Recent sales</h2>
                    <Link to="/wallet" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
                      Wallet →
                    </Link>
                  </div>
                  {recent.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-center text-sm text-zinc-400">
                      No sales recorded yet.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
                      {recent.map((t, i) => (
                        <SaleRow key={t.id} tx={t} last={i === recent.length - 1} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
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

function Row({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <span className={cn("font-semibold text-white", valueClass)}>{value}</span>
    </div>
  );
}

function SaleRow({ tx, last }) {
  const date = tx.sold_date || tx.updated_date || tx.created_date;
  const dateStr = date
    ? new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex items-center gap-4 px-4 py-3.5", !last && "border-b border-white/5")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
        <ArrowUpRight className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{tx.card_name}</p>
        <p className="truncate text-xs text-zinc-500">
          Sold to {tx.buyer_name || "collector"} · {tx.category}
        </p>
      </div>
      <div className="text-right">
        <p className="flex items-center justify-end gap-1 text-sm font-bold text-amber-300">
          <DollarSign className="h-3.5 w-3.5" /> {formatUsd(tx.ask_price_gems)}
        </p>
        <p className="text-xs text-zinc-500">{dateStr}</p>
      </div>
    </motion.div>
  );
}