import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { Package, Gem, DollarSign, TrendingUp, Loader2, RefreshCw, AlertCircle, ArrowLeftRight, Wrench, CheckCircle2 } from "lucide-react";
import PullRarityChart from "@/components/admin/PullRarityChart";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [gaData, setGaData] = useState(null);
  const [gaLoading, setGaLoading] = useState(false);
  const [gaError, setGaError] = useState("");
  const [tradeData, setTradeData] = useState(null);
  const [tradeLoading, setTradeLoading] = useState(false);
  const [healLoading, setHealLoading] = useState(false);
  const [healReport, setHealReport] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("get-platform-analytics", {});
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
    setGaLoading(true);
    try {
      const r = await base44.functions.invoke("get-ga-analytics", {});
      setGaData(r.data);
      setGaError("");
    } catch (e) {
      setGaData(null);
      setGaError("Google Analytics not connected");
    } finally {
      setGaLoading(false);
    }
    setTradeLoading(true);
    try {
      const r = await base44.functions.invoke("get-trade-analytics", {});
      setTradeData(r.data);
    } catch (e) {
      setTradeData(null);
    } finally {
      setTradeLoading(false);
    }
  };

  const runHeal = async () => {
    setHealLoading(true);
    setHealReport(null);
    try {
      const res = await base44.functions.invoke("admin-heal-system", {});
      setHealReport(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "System fix failed");
    } finally {
      setHealLoading(false);
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

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Analytics</h1>
          <p className="mt-1 text-sm text-zinc-400">Platform-wide pack rips, gem spend, and revenue.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={runHeal}
            disabled={healLoading}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
          >
            {healLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
            Run System Fix
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/5 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      {healReport && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h2 className="font-heading text-lg font-bold text-white">System Fix Report</h2>
            <span className="ml-auto text-sm text-emerald-300">
              {healReport.total_issues_fixed} issue{healReport.total_issues_fixed === 1 ? "" : "s"} fixed
            </span>
          </div>
          <div className="space-y-1.5">
            {healReport.checks?.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2 text-sm">
                <span className="text-zinc-300">{c.name}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">{c.checked} checked</span>
                  <span className={`font-bold ${c.fixed > 0 ? "text-emerald-300" : "text-zinc-500"}`}>
                    {c.fixed} fixed
                  </span>
                </span>
              </div>
            ))}
          </div>
          {healReport.checks?.some((c) => c.details?.length > 0) && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300">Show details</summary>
              <div className="mt-2 space-y-2">
                {healReport.checks?.filter((c) => c.details?.length > 0).map((c, i) => (
                  <div key={i} className="rounded-lg border border-white/5 bg-black/20 p-2 text-xs text-zinc-400">
                    <p className="mb-1 font-semibold text-zinc-300">{c.name}</p>
                    {c.details.map((d, j) => <p key={j} className="font-mono">{d}</p>)}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Package} label="Packs opened today" value={data.today_packs_opened.toLocaleString()} accent="from-amber-500/20 to-orange-600/10" ring="text-amber-300" />
            <StatCard icon={TrendingUp} label="Total packs opened" value={data.total_packs_opened.toLocaleString()} accent="from-violet-500/20 to-fuchsia-600/10" ring="text-violet-300" />
            <StatCard icon={Gem} label="Total gems spent" value={data.total_gems_spent.toLocaleString()} accent="from-cyan-500/20 to-blue-600/10" ring="text-cyan-300" />
            <StatCard icon={DollarSign} label="Platform revenue" value={"$" + data.revenue_usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sub={`${data.transaction_count} payments`} accent="from-emerald-500/20 to-teal-600/10" ring="text-emerald-300" />
          </div>

          {tradeLoading && !tradeData ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-72 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <div className="h-full w-full animate-pulse rounded-xl bg-white/5" />
              </div>
              <div className="h-72 rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <div className="h-full w-full animate-pulse rounded-xl bg-white/5" />
              </div>
            </div>
          ) : tradeData ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <StatCard icon={ArrowLeftRight} label="Trades completed · 30 days" value={tradeData.total_trades_30d.toLocaleString()} accent="from-sky-500/20 to-indigo-600/10" ring="text-sky-300" />
                <StatCard icon={Gem} label="Card value exchanged · 30 days" value={tradeData.total_value_gems_30d.toLocaleString() + " gems"} sub={"$" + tradeData.total_value_usd_30d.toFixed(2) + " value"} accent="from-fuchsia-500/20 to-pink-600/10" ring="text-fuchsia-300" />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-lg font-bold text-white">Trade volume · last 30 days</h2>
                    <span className="text-xs text-zinc-500">{tradeData.total_trades_30d.toLocaleString()} completed swaps</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tradeData.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.04)" }}
                          contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                          formatter={(v) => [v + " trades", "Completed"]}
                          labelStyle={{ color: "#a1a1aa" }}
                        />
                        <Bar dataKey="trades" fill="url(#tradeGrad)" radius={[6, 6, 0, 0]} />
                        <defs>
                          <linearGradient id="tradeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-lg font-bold text-white">Card value exchanged · last 30 days</h2>
                    <span className="text-xs text-zinc-500">${tradeData.total_value_usd_30d.toFixed(2)} total</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tradeData.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                          <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e879f9" stopOpacity={0.5} />
                            <stop offset="100%" stopColor="#e879f9" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                        <Tooltip
                          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
                          contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                          formatter={(v) => ["$" + Number(v).toFixed(2), "Value exchanged"]}
                          labelStyle={{ color: "#a1a1aa" }}
                        />
                        <Area type="monotone" dataKey="value_usd" stroke="#e879f9" strokeWidth={2} fill="url(#valueGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {tradeData.by_category && tradeData.by_category.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-heading text-lg font-bold text-white">Card set volume by category · last 30 days</h2>
                    <span className="text-xs text-zinc-500">{tradeData.by_category.length} categories · sorted by volume</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-zinc-500">
                          <th className="pb-2 font-semibold">Rank</th>
                          <th className="pb-2 font-semibold">Category</th>
                          <th className="pb-2 text-right font-semibold">Trades</th>
                          <th className="pb-2 text-right font-semibold">Volume (gems)</th>
                          <th className="pb-2 text-right font-semibold">Volume (USD)</th>
                          <th className="pb-2 text-right font-semibold">% of volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...tradeData.by_category]
                          .sort((a, b) => b.value_gems - a.value_gems)
                          .map((c, i) => {
                            const pct = tradeData.total_value_gems_30d > 0 ? Math.round((c.value_gems / tradeData.total_value_gems_30d) * 100) : 0;
                            return (
                              <tr key={c.category} className="border-t border-white/5">
                                <td className="py-2.5 text-zinc-500">
                                  <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${i === 0 ? "bg-amber-400/20 text-amber-300" : i < 3 ? "bg-white/10 text-zinc-200" : "text-zinc-500"}`}>
                                    {i + 1}
                                  </span>
                                </td>
                                <td className="py-2.5 capitalize font-medium text-zinc-200">{c.category}</td>
                                <td className="py-2.5 text-right text-zinc-300">{c.trades.toLocaleString()}</td>
                                <td className="py-2.5 text-right font-semibold text-cyan-300">{c.value_gems.toLocaleString()}</td>
                                <td className="py-2.5 text-right text-emerald-300">${c.value_usd.toFixed(2)}</td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-9 text-right text-xs text-zinc-400">{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <PullRarityChart />

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-white">Packs opened · last 14 days</h2>
              <span className="text-xs text-zinc-500">Today: {data.today_packs_opened.toLocaleString()} · {data.today_gems_spent.toLocaleString()} gems</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                    formatter={(v) => [v + " packs", "Opened"]}
                    labelStyle={{ color: "#a1a1aa" }}
                  />
                  <Bar dataKey="packs" fill="url(#packGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="packGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-lg font-bold text-white">New signups · last 14 days</h2>
                <span className="text-xs text-zinc-500">{data.total_users.toLocaleString()} total users</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.signups_daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                      formatter={(v) => [v + " signups", "New users"]}
                      labelStyle={{ color: "#a1a1aa" }}
                    />
                    <Bar dataKey="signups" fill="url(#signupGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
              <h2 className="font-heading text-lg font-bold text-white">Most popular packs</h2>
              {data.popular_packs.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500">No packs opened yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {data.popular_packs.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-xs font-bold text-amber-300">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-zinc-500 capitalize">{p.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white">{p.pulls.toLocaleString()}</p>
                        <p className="text-xs text-zinc-500">pulls</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {gaData ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-heading text-lg font-bold text-white">Google Analytics · sessions</h2>
                  <span className="text-xs text-zinc-500">{gaData.property || ""}</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gaData.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickFormatter={(d) => (d || "").slice(5)} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
                        formatter={(v) => [v + " sessions", "GA"]}
                        labelStyle={{ color: "#a1a1aa" }}
                      />
                      <Bar dataKey="sessions" fill="url(#gaGrad)" radius={[6, 6, 0, 0]} />
                      <defs>
                        <linearGradient id="gaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
                <h2 className="font-heading text-lg font-bold text-white">Top traffic sources</h2>
                {gaData.sources.length === 0 ? (
                  <p className="mt-4 text-sm text-zinc-500">No source data yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {gaData.sources.map((s) => (
                      <div key={s.source} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5">
                        <span className="text-sm font-medium text-white">{s.source}</span>
                        <span className="text-sm text-zinc-300">{s.sessions.toLocaleString()} sessions · {s.new_users.toLocaleString()} new</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : !gaLoading ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6 text-sm text-zinc-500">
              {gaError || "Google Analytics data unavailable."}
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
            <h2 className="font-heading text-lg font-bold text-white">Recent payments</h2>
            {data.recent.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">No payments recorded yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-zinc-500">
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Description</th>
                      <th className="pb-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((t) => (
                      <tr key={t.id} className="border-t border-white/5">
                        <td className="py-2.5 text-zinc-400">{new Date(t.created).toLocaleString()}</td>
                        <td className="py-2.5 text-zinc-300">{t.description}</td>
                        <td className="py-2.5 text-right font-semibold text-emerald-300">${t.amount_usd.toFixed(2)}</td>
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

function StatCard({ icon: Icon, label, value, sub, accent, ring }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5`}>
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ${ring}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}