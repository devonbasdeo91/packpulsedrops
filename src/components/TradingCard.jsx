import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/image";

export const RARITY_STYLES = {
  Common: { label: "Common", glow: "from-zinc-600 to-zinc-800", text: "text-zinc-300", ring: "ring-zinc-500/40", weight: 55, holo: false },
  Base: { label: "Base", glow: "from-zinc-600 to-zinc-800", text: "text-zinc-300", ring: "ring-zinc-500/40", weight: 55, holo: false },
  Rare: { label: "Rare", glow: "from-sky-500 to-blue-700", text: "text-sky-300", ring: "ring-sky-500/50", weight: 25, holo: false },
  "Short Print": { label: "Short Print", glow: "from-sky-500 to-blue-700", text: "text-sky-300", ring: "ring-sky-500/50", weight: 12, holo: false },
  "Super Rare": { label: "Super Rare", glow: "from-violet-500 to-fuchsia-700", text: "text-violet-300", ring: "ring-violet-500/50", weight: 12, holo: true },
  Refractor: { label: "Refractor", glow: "from-teal-400 to-cyan-600", text: "text-teal-300", ring: "ring-teal-400/50", weight: 8, holo: true },
  "Ultra Rare": { label: "Ultra Rare", glow: "from-amber-400 to-orange-600", text: "text-amber-300", ring: "ring-amber-400/60", weight: 6, holo: true },
  Auto: { label: "Auto", glow: "from-amber-400 to-orange-600", text: "text-amber-300", ring: "ring-amber-400/60", weight: 3, holo: true },
  "Secret Rare": { label: "Secret Rare", glow: "from-pink-400 to-rose-600", text: "text-pink-300", ring: "ring-pink-400/60", weight: 2, holo: true },
  Relic: { label: "Relic", glow: "from-pink-400 to-rose-600", text: "text-pink-300", ring: "ring-pink-400/60", weight: 2, holo: true },
  "Ghost Rare": { label: "Ghost Rare", glow: "from-white to-zinc-300", text: "text-white", ring: "ring-white/60", weight: 1, holo: true },
  "1/1": { label: "1/1", glow: "from-white to-zinc-300", text: "text-white", ring: "ring-white/70", weight: 1, holo: true },
  Diamond: { label: "Diamond", glow: "from-cyan-300 to-sky-500", text: "text-cyan-200", ring: "ring-cyan-300/70", weight: 0.5, holo: true },
};

function initials(name) {
  if (!name || typeof name !== "string") return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const MAX_TILT = 10; // degrees

export default function TradingCard({ card, flipped = true, className }) {
  const r = RARITY_STYLES[card.rarity] || RARITY_STYLES.Common;
  const name = card.name || card.card_name || "";
  const rootRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function handleMove(e) {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 2 * MAX_TILT;
    const rx = -(py - 0.5) * 2 * MAX_TILT;
    setTilt({ rx, ry });
  }

  function handleLeave() {
    setTilt({ rx: 0, ry: 0 });
  }

  return (
    <div
      ref={rootRef}
      onMouseMove={flipped ? handleMove : undefined}
      onMouseLeave={flipped ? handleLeave : undefined}
      style={{ perspective: "900px" }}
      className={cn("relative aspect-[2.5/3.5] w-full select-none", className)}
    >
      {flipped ? (
        <div
          className={cn("relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br ring-1 holo-sweep", r.glow, r.ring)}
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: "transform 130ms ease-out",
            transformStyle: "preserve-3d",
          }}
        >
          {r.holo && <div className="pointer-events-none absolute inset-0 holo-foil" />}
          {card.image_url ? (
            <Image src={card.image_url} alt={name} fittingType="fill" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-3xl font-bold text-white/90">
              {initials(name)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />
          <div className="relative flex h-full flex-col justify-between p-2.5 text-center">
            <span className={cn("self-center rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest backdrop-blur-sm", r.text)}>
              {r.label}
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-white drop-shadow">{name}</p>
              {card.subset && <p className="mt-0.5 text-[10px] text-white/70">{card.subset}</p>}
              <span className="mt-1 inline-block text-[10px] font-semibold text-amber-300">${((card.value_gems || 0) * 0.0035).toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br ring-1", r.glow, r.ring)}>
          <div className="text-center">
            <div className={cn("mx-auto h-12 w-12 rounded-full bg-white/20")} />
            <p className={cn("mt-2 text-[10px] font-bold uppercase tracking-widest", r.text)}>PackPulseDrops</p>
          </div>
        </div>
      )}
    </div>
  );
}