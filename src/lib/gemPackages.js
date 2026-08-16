// Single source of truth for gem bundle pricing.
// Used by the Wallet (shop) and the home business-info banner so they always match.
export const GEM_PACKAGES = [
  { id: "starter", gems: 1000, usd: 5.0, label: "Starter" },
  { id: "popular", gems: 2500, usd: 9.99, label: "Popular", best: true },
  { id: "pro", gems: 5500, usd: 19.99, label: "Pro" },
  { id: "whale", gems: 12000, usd: 39.99, label: "Whale" },
];