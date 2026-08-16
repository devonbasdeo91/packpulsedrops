import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

const CACHE_KEY = "packBg_";

/**
 * Renders a subtle, category-themed background image behind a page's content.
 * Reuses the same per-category generation + localStorage cache as the pack
 * reveal background, so categories are generated once and reused instantly.
 * Pass `category={null}` (e.g. when "All" is selected) to render nothing.
 */
export default function CategoryBackground({ category }) {
  const [url, setUrl] = useState(() => {
    if (!category) return "";
    try { return localStorage.getItem(CACHE_KEY + category) || ""; } catch { return ""; }
  });

  useEffect(() => {
    if (!category) { setUrl(""); return; }
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
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <Image src={url} alt="" fittingType="fill" className="h-full w-full object-cover opacity-15" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/85 via-zinc-950/75 to-zinc-950/90" />
    </div>
  );
}