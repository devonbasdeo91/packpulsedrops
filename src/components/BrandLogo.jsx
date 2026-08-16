import React, { useState, useEffect } from "react";
import { Image } from "@/components/ui/image";

// One representative pack image per category — the logo cycles through
// these with a crossfade + gentle pan so every category gets a turn.
const CATEGORY_THUMBS = [
  "https://images.unsplash.com/photo-1620336655071-6b2ea4272b15?w=200&h=200&fit=crop&q=80", // yugioh
  "https://images.unsplash.com/photo-1647892591880-58c55fd726d8?w=200&h=200&fit=crop&q=80", // pokemon
  "https://images.unsplash.com/photo-1706076463257-20b41d9519f0?w=200&h=200&fit=crop&q=80", // dragonball
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&h=200&fit=crop&q=80", // digimon
  "https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=200&h=200&fit=crop&q=80", // baseball
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=200&h=200&fit=crop&q=80", // basketball
  "https://images.unsplash.com/photo-1668293750324-bd77c1f08ca9?w=200&h=200&fit=crop&q=80", // naruto
  "https://images.unsplash.com/photo-1742919062100-6b37306ad0fb?w=200&h=200&fit=crop&q=80", // bleach
  "https://images.unsplash.com/photo-1566579090262-51cde5ebe92e?w=200&h=200&fit=crop&q=80", // football
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=200&h=200&fit=crop&q=80", // soccer
  "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=200&h=200&fit=crop&q=80", // cricket
  "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=200&h=200&fit=crop&q=80", // tennis
  "https://images.unsplash.com/photo-1545471977-94cac22e71ed?w=200&h=200&fit=crop&q=80", // nhl
  "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=200&h=200&fit=crop&q=80", // golf
  "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=200&h=200&fit=crop&q=80", // swimming
  "https://images.unsplash.com/photo-1549896869-ca27eeffe4fb?w=200&h=200&fit=crop&q=80", // trackfield
  "https://images.unsplash.com/photo-1614949194403-9602bdc14a3a?w=200&h=200&fit=crop&q=80", // f1
];

const ROTATE_INTERVAL = 2200;

export default function BrandLogo({ size = 36 }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % CATEGORY_THUMBS.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400/30 shadow-lg shadow-amber-500/20"
      style={{ width: size, height: size }}
    >
      {CATEGORY_THUMBS.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={src}
            alt=""
            fittingType="fill"
            loading="lazy"
            className="animate-ken-burns h-full w-full"
          />
        </div>
      ))}
      {/* Subtle amber tint to tie it to the brand */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent" />
    </span>
  );
}