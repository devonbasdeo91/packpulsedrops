import React, { useEffect, useRef } from "react";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "yugioh", label: "Yu-Gi-Oh" },
  { key: "pokemon", label: "Pokémon" },
  { key: "dragonball", label: "Dragon Ball Z" },
  { key: "digimon", label: "Digimon" },
  { key: "baseball", label: "Baseball" },
  { key: "basketball", label: "Basketball" },
  { key: "naruto", label: "Naruto" },
  { key: "bleach", label: "Bleach" },
  { key: "football", label: "Football" },
  { key: "soccer", label: "Soccer" },
  { key: "cricket", label: "Cricket" },
  { key: "tennis", label: "Tennis" },
  { key: "wnba", label: "WNBA" },
  { key: "nhl", label: "NHL" },
  { key: "golf", label: "Golf" },
  { key: "badminton", label: "Badminton" },
  { key: "tabletennis", label: "Table Tennis" },
  { key: "swimming", label: "Swimming" },
  { key: "trackfield", label: "Track & Field" },
  { key: "f1", label: "Formula 1" },
];

export default function CategoryNav({ active, onSelect, counts = {} }) {
  const scrollRef = useRef(null);
  const activeRef = useRef(null);

  // Auto-scroll the active pill into view on mobile when the category changes.
  useEffect(() => {
    const el = activeRef.current;
    const container = scrollRef.current;
    if (!el || !container) return;
    const left = el.offsetLeft - container.offsetLeft;
    const target = left - container.clientWidth / 2 + el.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-shrink-0 lg:block">
        <div className="sticky top-20 rounded-2xl border border-white/10 bg-zinc-900/40 p-3">
          <p className="flex items-center gap-2 px-2 pb-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <LayoutGrid className="h-3.5 w-3.5" /> Categories
          </p>
          <nav className="flex max-h-[70vh] flex-col gap-0.5 overflow-y-auto scrollbar-none">
            {CATEGORIES.map((c) => {
              const isActive = active === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => onSelect(c.key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-amber-400/15 text-amber-300"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile horizontal scroll with edge fades + snap */}
      <div className="relative lg:hidden">
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none"
          style={{ scrollSnapType: "x proximity", WebkitOverflowScrolling: "touch" }}
        >
          {CATEGORIES.map((c) => {
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                ref={isActive ? activeRef : null}
                onClick={() => onSelect(c.key)}
                style={{ scrollSnapAlign: "center" }}
                className={cn(
                  "flex h-11 flex-shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold backdrop-blur-sm transition-all",
                  isActive
                    ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                    : "border-white/10 text-zinc-400 active:bg-white/10"
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {/* Edge fade indicators */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>
    </>
  );
}