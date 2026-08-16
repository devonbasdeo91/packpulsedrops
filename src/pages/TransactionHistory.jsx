import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft, ArrowUpRight, Package, ArrowLeftRight,
  ArrowRight, Filter, Store, DollarSign, Receipt, Percent,
  Banknote, Zap,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import DigitalDisclaimer from "@/components/DigitalDisclaimer";

const GEM_TO_USD = 0.0035;

const TYPE_CONFIG = {
  gem_deposit: { icon: ArrowDownLeft, label: "Deposit", color: "text-emerald-300", bg: "bg-emerald-500/10" },
  pack_purchase: { icon: Package, label: "Pack Purchase", color: "text-amber-300", bg: "bg-amber-500/10" },
  marketplace_purchase: { icon: Store, label: "Marketplace Purchase", color: "text-rose-300", bg: "bg-rose-500/10" },
  marketplace_sale: { icon: ArrowUpRight, label: "Marketplace Sale", color: "text-emerald-300", bg: "bg-emerald-500/10" },
  marketplace_fee: { icon: Percent, label: "Platform Fee", color: "text-red-300", bg: "bg-red-500/10" },
  trade: { icon: ArrowLeftRight, label: "P2P Trade", color: "text-sky-300", bg: "bg-sky-500/10" },
  instant_sell: { icon: Zap, label: "Instant Sell", color: "text-violet-300", bg: "bg-violet-500/10" },
  withdrawal: { icon: Banknote, label: "Withdrawal", color: "text-orange-300", bg: "bg-orange-500/10" },
};

const FILTERS = [
  { k: "all", l: "All" },
  { k: "gem_deposit", l: "Deposits" },
  { k: "pack_purchase", l: "Packs" },
  { k: "marketplace", l: "Marketplace" },
  { k: "trade", l: "Trades" },
  { k: "instant_sell", l: "Instant Sells" },
  { k: "withdrawal", l: "Withdrawals" },
  { k: "fee", l: "Fees" },
];

export default function TransactionHistory() {
  const [filter, setFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await base44.functions.invoke("get-transactions", {});
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.transactions || [];
    },
  });

  const txs = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    if (filter === "marketplace") return data.filter((t) => t.type === "marketplace_purchase" || t.type === "marketplace_sale" || t.type === "instant_sell");
    if (filter === "fee") return data.filter((t) => t.type === "marketplace_fee");
    return data.filter((t) => t.type === filter);
  }, [data, filter]);

  // Group filtered transactions by month (e.g. "August 2026"), newest first.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of txs) {
      const d = t.date ? new Date(t.date) : null;
      if (!d || isNaN(d)) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, { label: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }), items: [] });
      map.get(key).items.push(t);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([, v]) => v);
  }, [txs]);

  const stats = useMemo(() => {
    if (!data) return { deposits: 0, packs: 0, fees: 0, spent: 0 };
    let deposits = 0, packs = 0, fees = 0, spent = 0;
    for (const t of data) {
      if (t.type === "gem_deposit") deposits += t.amount_gems || 0;
      if (t.type === "pack_purchase") packs += 1;
      if (t.type === "marketplace_fee") fees += Math.abs(t.amount_gems || 0);
      if (t.type === "marketplace_purchase") spent += Math.abs(t.amount_gems || 0);
    }
    return { deposits, packs, fees, spent };
  }, [data]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl font-bold text-white">Transaction history</h1>
        <p className="mt-1 text-sm text-zinc-400">
          A complete log of your wallet deposits, pack purchases, marketplace activity, and trade fees.
        </p>
        <DigitalDisclaimer className="mt-3" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={DollarSign} label="Deposits" value={`$${(stats.deposits * GEM_TO_USD).toFixed(2)}`} accent="text-emerald-300" />
        <SummaryCard icon={Package} label="Packs Opened" value={stats.packs} accent="text-amber-300" />
        <SummaryCard icon={Store} label="Spent on Cards" value={`$${(stats.spent * GEM_TO_USD).toFixed(2)}`} accent="text-rose-300" />
        <SummaryCard icon={Percent} label="Fees Paid" value={`$${(stats.fees * GEM_TO_USD).toFixed(2)}`} accent="text-red-300" />
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-500" />
        {FILTERS.map((t) => (
          <button
            key={t.k}
            onClick={() => setFilter(t.k)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              filter === t.k ? "border-amber-400/50 bg-amber-400/10 text-amber-300" : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* Log */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-900/60" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
          <Receipt className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No transactions yet.</p>
          <Link
            to="/shop"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
          >
            Browse the shop <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="mb-2 flex items-center gap-3 px-1">
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-zinc-400">{group.label}</h2>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-500">{group.items.length}</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/40">
                {group.items.map((t, i) => (
                  <TxRow key={t.id} tx={t} last={i === group.items.length - 1} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <Icon className={cn("h-4 w-4", accent)} />
        <p className="text-xs font-medium uppercase tracking-wider">{label}</p>
      </div>
      <p className={cn("mt-2 text-2xl font-bold", accent)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function TxRow({ tx, last }) {
  const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.trade;
  const Icon = config.icon;
  const date = tx.date ? new Date(tx.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
  const isNegative = (tx.amount_gems || 0) < 0;
  const gems = Math.abs(tx.amount_gems || 0);
  const usdVal = tx.amount_usd || (tx.amount_gems || 0) * GEM_TO_USD;
  const usd = Math.abs(usdVal).toFixed(2);
  const showAmount = tx.type !== "trade" && (tx.amount_gems !== 0 || tx.amount_usd !== 0);

  return (
    <div className={cn("flex items-center gap-4 px-4 py-3.5", !last && "border-b border-white/5")}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", config.bg, config.color)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{tx.description}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", config.bg, config.color)}>
            {config.label}
          </span>
          {tx.counterparty_name && (
            <span className="truncate text-xs text-zinc-500">· {tx.counterparty_name}</span>
          )}
          <span className="text-xs text-zinc-500">· {date}</span>
        </div>
      </div>
      <div className="text-right">
        {showAmount ? (
          <>
            <p className={cn("flex items-center justify-end gap-1 text-sm font-bold", isNegative ? "text-red-300" : "text-amber-300")}>
              {isNegative ? "-" : "+"}${usd}
            </p>
            <p className="text-xs text-zinc-400">{gems.toLocaleString()} units</p>
          </>
        ) : (
          <p className="text-xs text-zinc-400">—</p>
        )}
      </div>
    </div>
  );
}