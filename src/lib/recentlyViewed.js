const KEY = "recentlyViewedPacks";
const MAX = 12;

export function addRecentlyViewed(packId) {
  if (!packId) return;
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    const filtered = list.filter((id) => id !== packId);
    filtered.unshift(packId);
    localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, MAX)));
  } catch {}
}

export function getRecentlyViewed() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}