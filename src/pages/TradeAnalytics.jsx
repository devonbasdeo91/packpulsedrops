import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { ArrowLeftRight, Loader2, RefreshCw, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const GEM_TO_USD = 0.0035;

const CATEGORY_LABELS = {
  yugioh: "Yu-Gi-Oh", pokemon: "Pokémon", dragonball: "Dragon Ball Z", digimon: "Digimon",
  baseball: "Baseball", basketball: "Basketball", naruto: "Naruto", bleach: "Bleach",
  football: "Football", soccer: "Soccer", cricket: "Cricket", tennis: "Tennis",
  wnba: "WNBA", nhl: "NHL", golf: "Golf", badminton: "Badminton",
  tabletennis: "Table Tennis", swimming: "Swimming", trackfield: "Track & Field", f1: "F1",
};

const CAT_COLORS = [
  "#fbbf24", "#f97316", "#a855f7", "#38bdf8", "#2dd4bf", "#f472b6",
  "#84cc16", "#06b6d4", "#ef4444", "#8b5cf6", "#10b981", "#eab308",
];

function shortDate(iso) {
  const [, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

export default function TradeAnalytics() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("get-trade-analytics", {});
      if (res.data?.error) throw new Error(res.data.error);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load trade analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") load();
  }, [user]);

  if (!user) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
        <p className="mt-3 text-zinc-300">Admin access required to view trade analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white flex items-center gap-3">
            <ArrowLeftRight className="h-7 w-7 text-amber-400" /> Trade Volume
          </h1>
          <p className="mt-1 text-sm text-zinc-400">Total trade activity over the last 30 days</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
        </div>
      ) : data ? (
        <>
          {/* Summary stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<ArrowLeftRight className="h-5 w-5" />}
              label="Total Trades"
              value={data.total_trades_30d?.toLocaleString() || "0"}
              accent="from-amber-400 to-orange-500"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Total Volume (Gems)"
              value={(data.total_value_gems_30d || 0).toLocaleString()}
              accent="from-violet-400 to-purple-500"
            />
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Total Volume (USD)"
              value={`$${(data.total_value_usd_30d || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              accent="from-emerald-400 to-teal-500"
            />
          </div>

          {/* Daily trade volume chart */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="mb-4 font-heading text-lg font-bold text-white">Daily Trade Volume</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tradeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke="#71717a" fontSize={11} tickMargin={8} />
                <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fafafa" }}
                  labelFormatter={(d) => `Date: ${d}`}
                  formatter={(value, name) => {
                    if (name === "Trades") return [value, "Trades"];
                    return [`$${Number(value).toFixed(2)}`, "Volume (USD)"];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="trades"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  fill="url(#tradeGradient)"
                  name="Trades"
                />
              </AreaChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-zinc-500">Hover over the chart to see trade counts per day. Peaks indicate the most active trading periods.</p>
          </div>

          {/* Daily USD volume bar chart */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
            <h2 className="mb-4 font-heading text-lg font-bold text-white">Daily Trade Value (USD)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tickFormatter={shortDate} stroke="#71717a" fontSize={11} tickMargin={8} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fafafa" }}
                  labelFormatter={(d) => `Date: ${d}`}
                  formatter={(v) => [`$${Number(v).toFixed(2)}`, "Volume"]}
                />
                <Bar dataKey="value_usd" radius={[4, 4, 0, 0]} name="Volume">
                  {data.daily.map((entry, i) => (
                    <Cell key={i} fill={entry.value_usd > 0 ? "#f97316" : "#3f3f46"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category breakdown */}
          {data.by_category && data.by_category.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
              <h2 className="mb-4 font-heading text-lg font-bold text-white">Trades by Category</h2>
              <div className="space-y-2">
                {data.by_category.map((c, i) => {
                  const maxTrades = data.by_category[0].trades || 1;
                  const pct = Math.round((c.trades / maxTrades) * 100);
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 truncate text-sm text-zinc-300">
                        {CATEGORY_LABELS[c.category] || c.category}
                      </span>
                      <div className="h-6 flex-1 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-sm font-semibold text-white">
                        {c.trades} {c.trades === 1 ? "trade" : "trades"}
                      </span>
                      <span className="w-20 shrink-0 text-right text-xs text-zinc-400">
                        ${c.value_usd.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon, label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5">
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-black", accent)}>
        {icon}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold text-white">{value}</p>
    </div>
  );
}