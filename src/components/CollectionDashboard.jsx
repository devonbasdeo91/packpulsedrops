import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DollarSign, PieChart as PieIcon } from "lucide-react";

const RARITY_COLORS = {
  Common: "#a1a1aa",
  Base: "#a1a1aa",
  Rare: "#38bdf8",
  "Short Print": "#38bdf8",
  "Super Rare": "#a78bfa",
  Refractor: "#2dd4bf",
  "Ultra Rare": "#fbbf24",
  Auto: "#fbbf24",
  "Secret Rare": "#f472b6",
  Relic: "#f472b6",
  "Ghost Rare": "#e4e4e7",
  "1/1": "#f8fafc",
  Diamond: "#67e8f9",
};

const RARITY_ORDER = [
  "Common", "Base", "Rare", "Short Print", "Super Rare", "Refractor",
  "Ultra Rare", "Auto", "Secret Rare", "Relic", "Ghost Rare", "1/1", "Diamond",
];

const GEM_TO_USD = 0.0035;

/**
 * Dashboard section for the Collection page: an area chart of cumulative vault
 * value over time and a donut chart of rarity distribution. Computed
 * client-side from the supplied pulls (already scoped to the user).
 */
export default function CollectionDashboard({ pulls }) {
  const valueSeries = useMemo(() => {
    const sorted = [...pulls].sort(
      (a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0)
    );
    let cum = 0;
    return sorted.map((p, i) => {
      cum += p.value_gems || 0;
      return { idx: i + 1, value: +(cum * GEM_TO_USD).toFixed(2) };
    });
  }, [pulls]);

  const rarityData = useMemo(() => {
    const counts = {};
    for (const p of pulls || []) {
      const r = p.rarity || "Unknown";
      counts[r] = (counts[r] || 0) + 1;
    }
    const ordered = RARITY_ORDER.filter((r) => counts[r] != null).map((r) => ({
      name: r,
      value: counts[r],
    }));
    for (const r of Object.keys(counts)) {
      if (!RARITY_ORDER.includes(r)) ordered.push({ name: r, value: counts[r] });
    }
    return ordered;
  }, [pulls]);

  const totalValue = useMemo(
    () => pulls.reduce((s, p) => s + (p.value_gems || 0), 0) * GEM_TO_USD,
    [pulls]
  );
  const totalCards = (pulls || []).length;

  if (!totalCards) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Vault value growth */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <DollarSign className="h-4 w-4 text-amber-300" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Vault value growth
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold text-amber-300">
          ${totalValue.toFixed(2)}
        </p>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={valueSeries}
              margin={{ top: 5, right: 8, bottom: 0, left: -24 }}
            >
              <defs>
                <linearGradient id="vaultGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="idx"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#a1a1aa" }}
                formatter={(v) => [`$${v}`, "Value"]}
                labelFormatter={(l) => `Pull #${l}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#fbbf24"
                strokeWidth={2}
                fill="url(#vaultGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rarity distribution donut */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <PieIcon className="h-4 w-4 text-violet-300" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Rarity distribution
          </span>
        </div>
        <div className="mt-2 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={rarityData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {rarityData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={RARITY_COLORS[entry.name] || "#52525b"}
                    stroke="#0a0a0a"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}