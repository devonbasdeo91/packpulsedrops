import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useWallet } from "@/components/WalletProvider";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowUpFromLine, Building2, CreditCard, Clock, Zap, Loader2, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

const GEM_TO_USD = 0.0035;
const MIN_WITHDRAWAL_USD = 10;

const METHODS = {
  standard: {
    label: "Bank transfer",
    icon: Building2,
    fee: 5,
    eta: "3-5 business days",
    accent: "from-sky-400 to-blue-600",
    chip: "bg-sky-400/15 text-sky-200",
    ring: "ring-sky-400/40",
  },
  instant: {
    label: "Instant debit",
    icon: Zap,
    fee: 10,
    eta: "Instant",
    accent: "from-amber-300 to-orange-500",
    chip: "bg-amber-400/15 text-amber-200",
    ring: "ring-amber-400/40",
  },
};

export default function WithdrawalSection() {
  const { gems, refresh } = useWallet();
  const { toast } = useToast();
  const [method, setMethod] = useState("standard");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountLast4, setAccountLast4] = useState("");
  const [routingLast4, setRoutingLast4] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [busy, setBusy] = useState(false);

  const balanceUsd = gems * GEM_TO_USD;
  const m = METHODS[method];
  const grossUsd = parseFloat(amount) || 0;
  const feeUsd = Math.round(grossUsd * m.fee) / 100;
  const netUsd = Math.round((grossUsd - feeUsd) * 100) / 100;
  const amountGems = Math.round(grossUsd / GEM_TO_USD);

  const canSubmit =
    grossUsd >= MIN_WITHDRAWAL_USD &&
    grossUsd <= balanceUsd &&
    (method === "standard"
      ? bankName.trim() && /^\d{4}$/.test(accountLast4) && /^\d{4}$/.test(routingLast4)
      : /^\d{4}$/.test(cardLast4));

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const payload = {
        amount_gems: amountGems,
        withdrawal_type: method,
      };
      if (method === "standard") {
        payload.bank_name = bankName.trim();
        payload.account_last4 = accountLast4;
        payload.routing_last4 = routingLast4;
      } else {
        payload.card_last4 = cardLast4;
      }
      const res = await base44.functions.invoke("request-simple-withdrawal", payload);
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "Withdrawal submitted!",
        description: `$${netUsd.toFixed(2)} ${method === "instant" ? "instant debit" : "bank transfer"} pending. ${method === "instant" ? "Processed instantly." : "3-5 business days."}`,
      });
      setAmount("");
      setBankName("");
      setAccountLast4("");
      setRoutingLast4("");
      setCardLast4("");
      refresh();
    } catch (e) {
      toast({
        title: "Withdrawal failed",
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <h2 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
        <ArrowUpFromLine className="h-5 w-5 text-emerald-400" /> Withdraw funds
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Cash out your balance. Choose a standard bank transfer or instant debit card payout.
      </p>

      {/* Method selector */}
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(METHODS).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const active = method === key;
          return (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                active
                  ? `border-transparent bg-gradient-to-r ${cfg.accent} bg-opacity-10 ring-2 ${cfg.ring}`
                  : "border-white/10 bg-black/20 hover:bg-white/5"
              )}
            >
              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", active ? "bg-black/20" : "bg-white/5")}>
                <Icon className={cn("h-5 w-5", active ? "text-white" : "text-zinc-400")} />
              </span>
              <div className="flex-1">
                <p className={cn("text-sm font-bold", active ? "text-white" : "text-zinc-300")}>{cfg.label}</p>
                <p className={cn("text-xs", active ? "text-white/80" : "text-zinc-500")}>
                  {cfg.eta} · {cfg.fee}% fee
                </p>
              </div>
              {active && (
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", cfg.chip)}>Selected</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <div className="mt-5 space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Withdrawal amount (USD)</label>
          <input
            type="number"
            min={MIN_WITHDRAWAL_USD}
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min $${MIN_WITHDRAWAL_USD}`}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
          />
          <p className="mt-1 text-xs text-zinc-500">Available: ${balanceUsd.toFixed(2)}</p>
        </div>

        {/* Conditional destination fields */}
        {method === "standard" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Bank name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Chase, Bank of America"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account last 4</label>
              <input
                type="text"
                maxLength={4}
                inputMode="numeric"
                value={accountLast4}
                onChange={(e) => setAccountLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Routing last 4</label>
              <input
                type="text"
                maxLength={4}
                inputMode="numeric"
                value={routingLast4}
                onChange={(e) => setRoutingLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Debit card last 4 digits</label>
            <input
              type="text"
              maxLength={4}
              inputMode="numeric"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none placeholder:text-zinc-600"
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
              <CreditCard className="h-3 w-3" /> Funds sent instantly to your linked debit card.
            </p>
          </div>
        )}
      </div>

      {/* Fee breakdown */}
      {grossUsd > 0 && (
        <div className="mt-4 space-y-1.5 rounded-xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Gross amount</span>
            <span className="font-semibold text-white tabular-nums">${grossUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Platform fee ({m.fee}%)</span>
            <span className="font-semibold text-red-300 tabular-nums">-${feeUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-sm">
            <span className="font-semibold text-zinc-300">You receive</span>
            <span className="font-bold text-emerald-300 tabular-nums">${netUsd.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5 pt-1 text-xs text-zinc-500">
            {method === "instant" ? <Zap className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
            <span>{method === "instant" ? "Instant payout to your debit card" : "Arrives in 3-5 business days"}</span>
          </div>
        </div>
      )}

      <button
        onClick={submit}
        disabled={!canSubmit || busy}
        className={cn(
          "mt-5 w-full rounded-full py-3 text-sm font-bold transition-transform disabled:opacity-50 disabled:cursor-not-allowed",
          method === "instant"
            ? "bg-gradient-to-r from-amber-300 to-orange-500 text-black hover:scale-105"
            : "bg-gradient-to-r from-sky-400 to-blue-600 text-white hover:scale-105"
        )}
      >
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </span>
        ) : method === "instant" ? (
          `Withdraw $${netUsd.toFixed(2)} instantly`
        ) : (
          `Withdraw $${netUsd.toFixed(2)} to bank`
        )}
      </button>

      <p className="mt-3 flex items-start gap-1.5 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Digital assets only — no physical items are shipped. Withdrawals are reviewed and processed by our team.</span>
      </p>
    </section>
  );
}