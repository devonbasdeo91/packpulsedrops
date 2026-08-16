import React, { useState, useMemo, useEffect } from "react";
import { NavLink, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {   Home as HomeIcon, ShoppingBag, LayoutGrid, Menu, X, Store, Wallet as WalletIcon, Wand2, BarChart3, Sparkles, ArrowLeftRight, Plug, LayoutDashboard, Layers, Settings, Trophy, Users, UserCircle, ArrowLeft, TrendingUp, Receipt, History } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import GemsBadge from "@/components/GemsBadge";
import BottomTabBar from "@/components/BottomTabBar";
import SettingsDialog from "@/components/SettingsDialog";
import { cn } from "@/lib/utils";
import KeepAliveOutlet from "@/components/KeepAliveOutlet";
import NotificationCenter from "@/components/NotificationCenter";
import BrandLogo from "@/components/BrandLogo";
import { recordPath } from "@/lib/tabHistory";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon, end: true },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/marketplace", label: "Market", icon: Store },
  { to: "/sales-dashboard", label: "Sales Dashboard", icon: TrendingUp },
  { to: "/collection", label: "Vault", icon: LayoutGrid },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/trades", label: "My Trades", icon: ArrowLeftRight },
  { to: "/trade-history", label: "Trade History", icon: History },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/friends", label: "Friends", icon: Users },
  { to: "/connect", label: "Connect AI", icon: Plug },
  { to: "/account", label: "Account", icon: UserCircle },
];

// Routes already accessible via the mobile bottom tab bar — hidden in the mobile drawer.
const TAB_ROUTES = new Set(["/", "/dashboard", "/shop", "/marketplace", "/collection", "/wallet"]);

function NavLinks({ onNavigate, isAdmin, hideTabItems = false }) {
  const items = hideTabItems ? navItems.filter((n) => !TAB_ROUTES.has(n.to)) : navItems;
  return (
    <>
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-amber-400/10 text-amber-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
      {isAdmin && (
        <NavLink
          to="/admin/analytics"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-emerald-400/10 text-emerald-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <BarChart3 className="h-4 w-4" />
          Analytics
        </NavLink>
      )}
      {isAdmin && (
        <NavLink
          to="/admin/pull-analytics"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-sky-400/10 text-sky-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Layers className="h-4 w-4" />
          Pull Analytics
        </NavLink>
      )}
      {isAdmin && (
        <NavLink
          to="/admin/trade-analytics"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-amber-400/10 text-amber-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <ArrowLeftRight className="h-4 w-4" />
          Trade Analytics
        </NavLink>
      )}
      {isAdmin && (
        <NavLink
          to="/admin/cards"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-violet-400/10 text-violet-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Wand2 className="h-4 w-4" />
          Card Studio
        </NavLink>
      )}
      {isAdmin && (
        <NavLink
          to="/admin/assistant"
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-amber-400/10 text-amber-300" : "text-zinc-400 hover:bg-white/5 hover:text-white"
            )
          }
        >
          <Sparkles className="h-4 w-4" />
          Organizer
        </NavLink>
      )}
    </>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  // Record the current path under its parent tab for tab history preservation.
  useEffect(() => {
    recordPath(location.pathname);
  }, [location.pathname]);

  // Child routes show a back button + contextual title instead of the brand/menu
  const childHeader = useMemo(() => {
    const path = location.pathname;
    if (path.startsWith("/rip/")) return { title: "Rip Pack" };
    if (path.startsWith("/chat/")) return { title: "Chat" };
    if (path.startsWith("/profile/")) return { title: "Profile" };
    if (path === "/account") return { title: "Account" };
    if (path === "/trade-history") return { title: "Trade History" };
    if (path === "/connect") return { title: "Connect AI" };
    if (path === "/friends") return { title: "Friends" };
    if (path === "/sales-dashboard") return { title: "Sales Dashboard" };
    if (path === "/trades") return { title: "My Trades" };
    if (path === "/leaderboard") return { title: "Leaderboard" };
    if (path === "/admin/cards") return { title: "Card Studio" };
    if (path === "/admin/analytics") return { title: "Analytics" };
    if (path === "/admin/pull-analytics") return { title: "Pull Analytics" };
    if (path === "/admin/assistant") return { title: "Organizer" };
    return null;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{ paddingBottom: "var(--safe-area-bottom)" }}>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur lg:flex">
        <Brand onClick={() => navigate("/")} />
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          <NavLinks isAdmin={isAdmin} />
        </nav>
        <div className="px-4 py-4">
          {user ? (
            <GemsBadge className="w-full justify-center" />
          ) : (
            <Link
              to="/login"
              className="flex w-full items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-400/20"
            >
              Log In
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-zinc-950/80 px-4 py-3 backdrop-blur lg:hidden"
        style={{ paddingTop: "var(--safe-area-top)" }}
      >
        {childHeader ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-zinc-300"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-heading text-base font-bold text-white">{childHeader.title}</h1>
          </div>
        ) : (
          <Brand onClick={() => navigate("/")} />
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <GemsBadge />
              <NotificationCenter />
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-zinc-300"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex h-11 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-bold text-amber-300"
            >
              Log In
            </Link>
          )}
          {!childHeader && (
            <button
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-zinc-300"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
        )}
        {open && (
          <motion.aside
            key="drawer"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/10 bg-zinc-950 lg:hidden"
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Brand onClick={() => { setOpen(false); navigate("/"); }} />
              <button onClick={() => setOpen(false)} className="text-zinc-400" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 px-3 py-4" onClick={() => setOpen(false)}>
              <NavLinks onNavigate={() => setOpen(false)} isAdmin={isAdmin} hideTabItems />
            </nav>
            <div className="border-t border-white/10 p-3">
              <button
                onClick={() => { setOpen(false); setSettingsOpen(true); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="pb-20 md:pb-0 lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <KeepAliveOutlet />
        </div>
        <footer className="border-t border-white/10 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 text-xs text-zinc-500 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-zinc-300">PackPulseDrops</p>
              <p className="mt-0.5 max-w-md">Digital trading card packs & peer-to-peer marketplace. Digital collectibles only — no physical items are shipped.</p>
              <p className="mt-1">Support: <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 hover:underline">pulpsepackdrops@gmail.com</a></p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/about" className="hover:text-zinc-300">About</Link>
              <Link to="/contact" className="hover:text-zinc-300">Contact</Link>
              <Link to="/terms" className="hover:text-zinc-300">Terms</Link>
              <Link to="/privacy" className="hover:text-zinc-300">Privacy</Link>
              <Link to="/refund" className="hover:text-zinc-300">Refunds</Link>
            </nav>
          </div>
          <p className="mx-auto mt-4 max-w-7xl text-center text-[11px] text-zinc-600">© {new Date().getFullYear()} PackPulseDrops. All rights reserved.</p>
        </footer>
      </main>

      {/* Desktop top-right balance + notifications — always visible across all pages */}
      <div className="pointer-events-none fixed right-4 top-4 z-40 hidden items-center gap-2 lg:flex">
        {user ? (
          <>
            <GemsBadge className="pointer-events-auto shadow-lg shadow-black/30" />
            <div className="pointer-events-auto">
              <NotificationCenter />
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="pointer-events-auto flex items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300"
          >
            Log In
          </Link>
        )}
      </div>

      <BottomTabBar />
      {user && <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} user={user} />}
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 px-4 py-5 text-left">
      <BrandLogo size={36} />
      <span className="font-heading text-lg font-bold tracking-tight text-white">
        Pack<span className="text-amber-400">Pulse</span>Drops
      </span>
    </button>
  );
}