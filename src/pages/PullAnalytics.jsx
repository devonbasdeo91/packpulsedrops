import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Layers, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const RARITY_COLOR = {
  Common: "#a1a1aa",
  Base: "#a1a1aa",
  Rare: "#38bdf8",
  "Short Print": "#38bdf8",
  "Super Rare": "#a855f7",
  Refractor: "#2dd4bf",
  "Ultra Rare": "#f59e0b",
  Auto: "#f59e0b",
  "Secret Rare": "#f472b6",
  Relic: "#f472b6",
  "Ghost Rare": "#e5e7eb",
  "1/1": "#ffffff",
  Diamond: "#67e8f9",
};

const CATEGORY_LABELS = {
  yugioh: "Yu-Gi-Oh", pokemon: "Pokémon", dragonball: "Dragon Ball Z", digimon: "Digimon",
  baseball: "Baseball", basketball: "Basketball", naruto: "Naruto", bleach: "Bleach",
  football: "Football", soccer: "Soccer",
};

export default function PullAnalytics() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("get-pull-rarity-stats", {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load pull analytics");
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
        <p className="text-zinc-300">Admins only.</p>
      </div>
    );
  }

  const activeCat = cat === "all" ? null : data?.categories.find((c) => c.category === cat);
  const rows = cat === "all" ? data?.rarities : activeCat?.breakdown || [];
  const total = cat === "all" ? data?.total : activeCat?.total || 0;
  const chartData = [...(rows || [])].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Pull Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Rarity-tier distribution across every pull — use it to tune drop rates.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-amber-400" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-indigo-600/10 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky-300">
                <Layers className="h-5 w-5" />
              </span>
              <p className="mt-4 text-2xl font-bold text-white">{total.toLocaleString()}</p>
              <p className="text-xs text-zinc-400">{cat === "all" ? "Total cards pulled" : `${CATEGORY_LABELS[cat] || cat} pulls`}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:col-span-2">
              <p className="text-xs uppercase tracking-wider text-zinc-500">Filter by category</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <FilterChip active={cat === "all"} onClick={() => setCat("all")} label={`All · ${data.total.toLocaleString()}`} />
                {data.categories.map((c) => (
                  <FilterChip
                    key={c.category}
                    active={cat === c.category}
                    onClick={() => setCat(c.category)}
                    label={`${CATEGORY_LABELS[c.category] || c.category} · ${c.total.toLocaleString()}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
            <h2 className="font-heading text-lg font-bold text-white">Pulls by rarity tier</h2>
            <p className="text-xs text-zinc-500">Horizontal bars show how often each rarity has been pulled{cat !== "all" ? ` in ${CATEGORY_LABELS[cat] || cat}` : ""}.</p>
            {chartData.length === 0 ? (
              <p className="mt-8 text-sm text-zinc-500">No pulls recorded yet.</p>
            ) : (
              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="rarity" tick={{ fill: "#a1a1aa", fontSize: 11 }} width={92} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                      formatter={(v, _n, p) => [`${v.toLocaleString()} pulls · ${p.payload.pct}%`, p.payload.rarity]}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.rarity} fill={RARITY_COLOR[entry.rarity] || "#71717a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
            <h2 className="font-heading text-lg font-bold text-white">Rarity breakdown</h2>
            {chartData.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No pulls recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 font-semibold">Rarity</th>
                      <th className="pb-2 text-right font-semibold">Pulls</th>
                      <th className="pb-2 text-right font-semibold">Share</th>
                      <th className="pb-2 pl-4 font-semibold">Distribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((r) => (
                      <tr key={r.rarity} className="border-t border-white/5">
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ background: RARITY_COLOR[r.rarity] || "#71717a" }} />
                            <span className="font-medium text-white">{r.rarity}</span>
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-white">{r.count.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-zinc-300">{r.pct}%</td>
                        <td className="py-2.5 pl-4">
                          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: RARITY_COLOR[r.rarity] || "#71717a" }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
        active ? "border-sky-400/50 bg-sky-400/10 text-sky-300" : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
      )}
    >
      {label}
    </button>
  );
}