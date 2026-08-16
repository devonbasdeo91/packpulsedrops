import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, XCircle, ArrowRight, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function TradeAlertsBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("dismissedTradeAlerts") || "[]"));
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await base44.entities.Notification.list("-created_date", 30);
        if (!alive) return;
        const tradeAlerts = (all || []).filter(
          (n) => n.type === "trade_accepted" || n.type === "trade_declined"
        );
        setAlerts(tradeAlerts);
      } catch {
        setAlerts([]);
      }
    })();

    const unsub = base44.entities.Notification.subscribe((e) => {
      if (e.type === "create" && e.data && (e.data.type === "trade_accepted" || e.data.type === "trade_declined")) {
        setAlerts((prev) => [e.data, ...prev]);
      }
    });
    return () => {
      alive = false;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const visible = alerts.filter((a) => !dismissed.has(a.id)).slice(0, 4);

  const dismiss = (id) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissedTradeAlerts", JSON.stringify([...next]));
  };

  if (visible.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-white">Trade updates</h2>
        <Link to="/trades" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
          View all trades →
        </Link>
      </div>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((a) => {
            const accepted = a.type === "trade_accepted";
            return (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-4",
                  accepted
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    accepted ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  )}
                >
                  {accepted ? <PartyPopper className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-300">{a.message}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{timeAgo(a.created_date)}</p>
                </div>
                <Link
                  to={a.link || "/trades"}
                  className="hidden shrink-0 items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 sm:inline-flex"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={() => dismiss(a.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}