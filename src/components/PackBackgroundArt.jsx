import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";

const CACHE_KEY = "packBg_";

/**
 * Renders a category-themed background image behind the pack-opening reveal.
 * The image is generated once per category (server-side) and cached in
 * localStorage so repeat rips are instant and don't re-spend generation credits.
 */
export default function PackBackgroundArt({ category, className }) {
  const [url, setUrl] = useState(() => {
    try { return localStorage.getItem(CACHE_KEY + category) || ""; } catch { return ""; }
  });

  useEffect(() => {
    if (!category) return;
    let alive = true;
    const cached = (() => { try { return localStorage.getItem(CACHE_KEY + category) || ""; } catch { return ""; } })();
    if (cached) { setUrl(cached); return; }
    base44.functions
      .invoke("generate-pack-background", { category })
      .then((res) => {
        if (!alive) return;
        const u = res.data?.url;
        if (u) {
          try { localStorage.setItem(CACHE_KEY + category, u); } catch {}
          setUrl(u);
        }
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [category]);

  if (!url) return null;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <Image
        src={url}
        alt=""
        fittingType="fill"
        className="h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
    </div>
  );
}