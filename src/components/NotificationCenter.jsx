import React, { useEffect, useState, useRef, useCallback } from "react";
import { Bell, Check, Wallet, XCircle, Clock, ArrowLeftRight, PartyPopper } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ICONS = {
  withdrawal_pending: { icon: Clock, color: "text-amber-300", bg: "bg-amber-400/15" },
  withdrawal_paid: { icon: Wallet, color: "text-emerald-300", bg: "bg-emerald-500/15" },
  withdrawal_rejected: { icon: XCircle, color: "text-rose-300", bg: "bg-rose-500/15" },
  trade_accepted: { icon: PartyPopper, color: "text-emerald-300", bg: "bg-emerald-500/15" },
  trade_declined: { icon: XCircle, color: "text-rose-300", bg: "bg-rose-500/15" },
  trade_request: { icon: ArrowLeftRight, color: "text-amber-300", bg: "bg-amber-400/15" },
  info: { icon: Bell, color: "text-sky-300", bg: "bg-sky-500/15" },
};

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

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.Notification.list("-created_date", 30);
      setItems(data);
      setUnread(data.filter((n) => !n.read).length);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe((e) => {
      if (e.type === "create") load();
      else if (e.type === "update") load();
    });
    return unsub;
  }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    const unreadItems = items.filter((n) => !n.read);
    if (!unreadItems.length) return;
    try {
      await base44.entities.Notification.bulkUpdate(
        unreadItems.map((n) => ({ id: n.id, read: true }))
      );
      load();
    } catch {}
  };

  const handleClick = async (item) => {
    if (!item.read) {
      try {
        await base44.entities.Notification.update(item.id, { read: true });
        load();
      } catch {}
    }
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-white/10 p-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h3 className="font-heading text-sm font-bold text-white">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-zinc-600" />
                <p className="mt-2 text-sm text-zinc-500">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => {
                const cfg = ICONS[n.type] || ICONS.info;
                const Icon = cfg.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors hover:bg-white/5",
                      !n.read && "bg-amber-400/5"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", cfg.bg, cfg.color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">{n.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{n.message}</p>
                      <p className="mt-1 text-[10px] text-zinc-600">{timeAgo(n.created_date)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}