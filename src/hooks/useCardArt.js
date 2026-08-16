import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// Module-level cache so art generated for a card in one surface is reused
// instantly everywhere else (and never re-generated in the same session).
const urlCache = new Map();
const inflight = new Map();
const CHUNK = 6;

const artKey = (it) => it.key || `${it.card_name || it.name}|${it.category}`;

function ensureArt(item) {
  const key = artKey(item);
  if (urlCache.has(key)) return Promise.resolve();
  if (item.image_url) {
    urlCache.set(key, item.image_url);
    return Promise.resolve();
  }
  if (inflight.has(key)) return inflight.get(key);
  const p = base44.functions
    .invoke("ensure-card-art", {
      card_name: item.card_name || item.name,
      category: item.category,
      rarity: item.rarity,
      pull_id: item.pull_id,
      listing_id: item.listing_id,
    })
    .then((res) => {
      if (res.data?.image_url) urlCache.set(key, res.data.image_url);
    })
    .catch(() => {})
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * Given a list of card-like items ({ key?, card_name?, name?, category, rarity,
 * image_url?, pull_id?, listing_id? }), returns a map of key -> image URL.
 * Missing art is generated on demand via ensure-card-art (deduped by card,
 * batched to avoid rate limits, cached on the entity for next load) so every
 * card displays its image immediately without being tapped.
 */
export function useCardArt(items) {
  const [map, setMap] = useState({});
  const dep = JSON.stringify(
    (items || []).map((it) => `${artKey(it)}|${it.image_url || ""}`)
  );

  useEffect(() => {
    let alive = true;
    let cancelled = false;
    for (const it of items || []) {
      if (it.image_url) urlCache.set(artKey(it), it.image_url);
    }
    const missing = (items || []).filter((it) => !urlCache.has(artKey(it)));
    const flush = () => {
      if (!alive) return;
      const next = {};
      for (const it of items || []) {
        const url = urlCache.get(artKey(it));
        if (url) next[artKey(it)] = url;
      }
      setMap(next);
    };
    // Show any already-cached art immediately, then generate the rest in batches.
    flush();
    if (missing.length === 0) return;
    (async () => {
      for (let i = 0; i < missing.length; i += CHUNK) {
        if (cancelled) return;
        await Promise.all(missing.slice(i, i + CHUNK).map(ensureArt));
        flush();
      }
    })();
    return () => {
      alive = false;
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);

  return map;
}