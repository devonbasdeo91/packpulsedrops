// Tab history/stack preservation: stores the last accessed sub-path for each
// bottom-tab root so switching tabs returns the user to where they left off.

const TAB_ROOTS = ["/", "/dashboard", "/shop", "/marketplace", "/collection", "/wallet"];

// Sub-path prefixes mapped to their parent tab root.
const PREFIX_TO_TAB = {
  "/rip/": "/shop",
  "/cashout": "/wallet",
  "/transactions": "/wallet",
  "/trade-history": "/wallet",
  "/profile/": "/collection",
};

const STORAGE_KEY = "pp_tab_history";

function readStore() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeStore(map) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

// Returns the tab root that owns the given pathname, or null if it doesn't
// belong to any tab.
export function resolveTab(pathname) {
  if (TAB_ROOTS.includes(pathname)) return pathname;
  for (const [prefix, tab] of Object.entries(PREFIX_TO_TAB)) {
    if (pathname.startsWith(prefix)) return tab;
  }
  return null;
}

// Returns the saved sub-path for a tab, or the tab root if none is stored.
export function getLastPath(tab) {
  const map = readStore();
  return map[tab] || tab;
}

// Records the current pathname under its parent tab. Visiting the tab root
// clears any previously stored sub-path (user explicitly returned to root).
export function recordPath(pathname) {
  const tab = resolveTab(pathname);
  if (!tab) return;
  const map = readStore();
  if (pathname === tab) {
    delete map[tab];
  } else {
    map[tab] = pathname;
  }
  writeStore(map);
}

// Clears the stored sub-path for a tab (used when resetting to root).
export function clearTab(tab) {
  const map = readStore();
  delete map[tab];
  writeStore(map);
}