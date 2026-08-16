import React from "react";
import CategoryImage from "@/components/CategoryImage";

const CATEGORIES = [
  { key: "yugioh", label: "Yu-Gi-Oh!" },
  { key: "pokemon", label: "Pokémon" },
  { key: "baseball", label: "Baseball" },
  { key: "basketball", label: "Basketball" },
  { key: "dragonball", label: "Dragon Ball" },
  { key: "naruto", label: "Naruto" },
  { key: "bleach", label: "Bleach" },
  { key: "digimon", label: "Digimon" },
  { key: "football", label: "Football" },
  { key: "soccer", label: "Soccer" },
  { key: "cricket", label: "Cricket" },
  { key: "tennis", label: "Tennis" },
  { key: "golf", label: "Golf" },
  { key: "nhl", label: "NHL" },
  { key: "wnba", label: "WNBA" },
  { key: "f1", label: "F1" },
  { key: "badminton", label: "Badminton" },
  { key: "tabletennis", label: "Table Tennis" },
  { key: "swimming", label: "Swimming" },
  { key: "trackfield", label: "Track & Field" },
];

export default function CategoryScreenshotTemplate() {
  return (
    <div className="min-h-screen bg-black px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
          <h1 className="font-heading text-3xl font-bold text-white">Pack Categories</h1>
          <p className="mt-1 text-sm text-zinc-400">20 collectible categories — rip digital packs across CCG & sports.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div
              key={c.key}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60"
            >
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <CategoryImage category={c.key} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
              <div className="absolute inset-x-0 bottom-0 px-2 py-1.5">
                <p className="font-heading text-sm font-semibold text-white drop-shadow">{c.label}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          PackPulseDrops — Digital trading card platform
        </p>
      </div>
    </div>
  );
}