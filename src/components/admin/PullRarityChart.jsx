import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Layers, Loader2, AlertCircle } from "lucide-react";

// Stable color per rarity for chart bars and table accents
const RARITY_COLORS = {
  Common: "#a1a1aa",
  Base: "#a1a1aa",
  "Short Print": "#fbbf24",
  Rare: "#60a5fa",
  Refractor: "#22d3ee",
  "Super Rare": "#a78bfa",
  "Ultra Rare": "#f472b6",
  Auto: "#fb7185",
  "Secret Rare": "#f59e0b",
  Relic: "#34d399",
  "Ghost Rare": "#c4b5fd",
  "1/1": "#fde047",
  Diamond: "#67e8f9",
};

function colorFor(rarity) {
  return RARITY_COLORS[rarity] || "#94a3b8";
}

export default function PullRarityChart() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("get-pull-rarity-stats", {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load rarity stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const rarities = data.rarities || [];
  const total = data.total || 0;
  const categories = data.categories || [];

  return (
    <div className="space-y-4">
      {/* Overall rarity distribution */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-300" />
            <h2 className="font-heading text-lg font-bold text-white">Pull rarity distribution</h2>
          </div>
          <span className="text-xs text-zinc-500">{total.toLocaleString()} total pulls</span>
        </div>
        {rarities.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">No pulls recorded yet.</p>
        ) : (
          <>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rarities} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="rarity" tick={{ fill: "#a1a1aa", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={(v, _name, props) => [`${v.toLocaleString()} pulls (${props.payload.pct}%)`, props.payload.rarity]}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {rarities.map((r) => (
                      <Cell key={r.rarity} fill={colorFor(r.rarity)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quick count summary for the key tiers the admin cares about */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {rarities.map((r) => (
                <div key={r.rarity} className="rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(r.rarity) }} />
                    <span className="truncate text-xs font-medium text-zinc-300">{r.rarity}</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-white">{r.count.toLocaleString()}</p>
                  <p className="text-[11px] text-zinc-500">{r.pct}% of pulls</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Per-category rarity breakdown table */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-bold text-white">Rarity counts by category</h2>
            <span className="text-xs text-zinc-500">{categories.length} categories</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 text-right font-semibold">Total pulls</th>
                  {rarities.map((r) => (
                    <th key={r.rarity} className="pb-2 text-right font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: colorFor(r.rarity) }} />
                        {r.rarity}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => {
                  const lookup = Object.fromEntries((c.breakdown || []).map((b) => [b.rarity, b.count]));
                  return (
                    <tr key={c.category} className="border-t border-white/5">
                      <td className="py-2.5 capitalize text-zinc-200">{c.category}</td>
                      <td className="py-2.5 text-right font-semibold text-white">{c.total.toLocaleString()}</td>
                      {rarities.map((r) => {
                        const n = lookup[r.rarity] || 0;
                        return (
                          <td key={r.rarity} className="py-2.5 text-right text-zinc-300">
                            {n > 0 ? n.toLocaleString() : <span className="text-zinc-600">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}