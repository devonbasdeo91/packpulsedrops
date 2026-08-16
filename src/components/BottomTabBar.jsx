import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  LayoutDashboard,
  ShoppingBag,
  Store,
  LayoutGrid,
  Wallet as WalletIcon,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveTab, getLastPath, clearTab } from "@/lib/tabHistory";
import { useAuth } from "@/lib/AuthContext";

const authedTabs = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/marketplace", label: "Market", icon: Store },
  { to: "/collection", label: "Vault", icon: LayoutGrid },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
];

const guestTabs = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/marketplace", label: "Market", icon: Store },
  { to: "/login", label: "Log In", icon: LogIn },
];

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const tabs = isAuthenticated ? authedTabs : guestTabs;

  const currentTab = resolveTab(location.pathname);

  function handleTap(to) {
    if (currentTab === to) {
      // Already on this tab: reset to root (clears any saved sub-path).
      clearTab(to);
      if (location.pathname !== to) {
        navigate(to);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      // Switch to the tab's last saved sub-path, or its root if none stored.
      navigate(getLastPath(to));
    }
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around border-t border-white/10 bg-zinc-950/90 backdrop-blur md:hidden"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
      aria-label="Primary"
    >
      {tabs.map(({ to, label, icon: Icon }) => {
        const isActive = currentTab === to;
        return (
          <button
            key={to}
            type="button"
            onClick={() => handleTap(to)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-amber-300" : "text-zinc-400 hover:text-white"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_6px_rgba(251,191,36,0.45)]")} />
            <span className="max-w-[64px] truncate">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}