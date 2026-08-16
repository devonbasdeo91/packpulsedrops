import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import {
  ArrowDownToLine, CheckCircle2, XCircle, Clock,
  AlertTriangle, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import WithdrawalSection from "@/components/WithdrawalSection";

const GEM_TO_USD = 0.0035;

const STATUS_STYLE = {
  pending: { icon: Clock, text: "text-zinc-300", label: "Pending" },
  approved: { icon: CheckCircle2, text: "text-sky-300", label: "Approved" },
  paid: { icon: CheckCircle2, text: "text-emerald-300", label: "Paid" },
  rejected: { icon: XCircle, text: "text-red-300", label: "Rejected" },
};

export default function Wallet() {
  const { gems, loaded, refresh } = useWallet();
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [pulls, setPulls] = useState([]);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    refresh();
    base44.entities.Pull.list("-created_date", 200).then(setPulls).catch(() => setPulls([]));
    const params = new URLSearchParams(window.location.search);
    const st = params.get("status");
    if (st === "success") setNotice("Payment successful! Your balance will update shortly.");
    if (st === "cancel") setError("Checkout was cancelled.");
  }, [refresh]);

  const collectionValue = pulls.reduce((s, p) => s + (p.value_gems || 0), 0) * GEM_TO_USD;
  const collectionCount = pulls.length;

  const loadTransactions = useCallback(async () => {
    try {
      const data = await base44.entities.Transaction.list("-created_date", 50);
      const mine = user ? data.filter((t) => t.user_id === user.id || t.created_by_id === user.id) : data;
      setTransactions(mine);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    if (user) loadTransactions();
  }, [user, loadTransactions]);

  const MIN_DEPOSIT = 5;
  const MAX_DEPOSIT = 5000;
  const [depositAmount, setDepositAmount] = useState("");

  async function depositFunds() {
    setError("");
    setNotice("");
    if (window.self !== window.top) {
      setError("Checkout only works from the published app. Open the app in a new tab to add funds.");
      return;
    }
    const usd = parseFloat(depositAmount);
    if (!Number.isFinite(usd) || usd < MIN_DEPOSIT || usd > MAX_DEPOSIT) {
      setError(`Deposit amount must be between $${MIN_DEPOSIT} and $${MAX_DEPOSIT}.`);
      return;
    }
    setBusy("deposit");
    try {
      const res = await base44.functions.invoke("create-gem-checkout", { amount_usd: usd });
      if (res.data?.error) throw new Error(res.data.error);
      if (res.data?.url) window.location.href = res.data.url;
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Checkout failed");
      setBusy(null);
    }
  }

  const balanceUsd = gems * GEM_TO_USD;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">Wallet</h1>
          <p className="mt-1 text-sm text-zinc-400">Add funds and track your purchases.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/5 px-5 py-3">
          <p className="text-2xl font-bold text-amber-300 tabular-nums">
            {loaded ? `$${balanceUsd.toFixed(2)}` : "…"}
          </p>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Collection value */}
      <Link to="/collection" className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 transition-colors hover:border-white/20">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <Layers className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-zinc-400">Collection value</p>
          <p className="text-2xl font-bold text-white tabular-nums">${collectionValue.toFixed(2)}</p>
          <p className="text-xs text-zinc-500">{collectionCount} card{collectionCount === 1 ? "" : "s"}</p>
        </div>
      </Link>

      {/* Add funds */}
      <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
        <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
          <ArrowDownToLine className="h-5 w-5 text-amber-400" /> Add funds
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Top up your balance with a credit or debit card via Stripe. Deposit any amount from ${MIN_DEPOSIT} to ${MAX_DEPOSIT.toLocaleString()}.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <Field label="Deposit amount (USD)">
              <input
                type="number"
                min={MIN_DEPOSIT}
                max={MAX_DEPOSIT}
                step="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={`$${MIN_DEPOSIT} – $${MAX_DEPOSIT.toLocaleString()}`}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 25, 50, 100].map((q) => (
                <button
                  key={q}
                  onClick={() => setDepositAmount(String(q))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    parseFloat(depositAmount) === q
                      ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                      : "border-white/10 text-zinc-400 hover:bg-white/5"
                  )}
                >
                  ${q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/30 p-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-zinc-400">You deposit</p>
              <p className="mt-1 text-3xl font-bold text-amber-300">
                ${parseFloat(depositAmount || 0).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Credited to your balance instantly after checkout.</p>
            </div>
            <button
              onClick={depositFunds}
              disabled={busy === "deposit"}
              className="mt-5 w-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 py-3 text-sm font-bold text-black hover:scale-105 transition-transform disabled:opacity-60"
            >
              {busy === "deposit" ? "Redirecting…" : "Deposit funds"}
            </button>
          </div>
        </div>
      </section>

      {/* Withdraw funds */}
      <WithdrawalSection />

      {/* Transaction history */}
      <section>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-6 text-center text-sm text-zinc-500">
              No transactions yet. When you deposit or buy, it'll appear here.
            </p>
          ) : (
            transactions.map((t) => {
              const isCredit = ["gem_deposit", "marketplace_sale"].includes(t.type);
              return (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {t.description || t.type?.replace(/_/g, " ")}
                    </p>
                    {t.counterparty_name && (
                      <p className="text-xs text-zinc-500">{t.counterparty_name}</p>
                    )}
                  </div>
                  <span className={cn("text-sm font-bold tabular-nums", isCredit ? "text-emerald-300" : "text-zinc-300")}>
                    {isCredit ? "+" : "-"}${(t.amount_usd || 0).toFixed(2)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}