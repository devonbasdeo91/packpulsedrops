import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { isPromoActive, PROMO_END_ISO } from "@/lib/promo";

function getTimeLeft() {
  const diff = new Date(PROMO_END_ISO).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

export default function PromoBanner({ className }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!isPromoActive() || !timeLeft) return null;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <div className={`flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-orange-500/10 to-amber-400/5 p-4 sm:flex-row sm:justify-between ${className || ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <p className="font-heading text-sm font-bold text-white">🚀 Launch Week — 20% off all packs!</p>
          <p className="text-xs text-zinc-400">Every pack ripped with gems is 20% off. Limited time only.</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">Ends in</span>
        <div className="flex items-center gap-1.5">
          {[
            { v: timeLeft.days, l: "d" },
            { v: timeLeft.hours, l: "h" },
            { v: timeLeft.mins, l: "m" },
            { v: timeLeft.secs, l: "s" },
          ].map((u, i) => (
            <span key={i} className="flex min-w-[2.25rem] flex-col items-center rounded-lg bg-black/40 px-2 py-1">
              <span className="text-base font-bold tabular-nums text-amber-300">{pad(u.v)}</span>
              <span className="text-[9px] uppercase text-zinc-500">{u.l}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}