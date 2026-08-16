import React from "react";
import { Link } from "react-router-dom";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-black">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l9-5 9 5-9 5-9-5z" />
                <path d="M3 8v8l9 5 9-5V8" />
              </svg>
            </span>
            <span className="font-heading text-lg font-bold tracking-tight text-white">Pack<span className="text-amber-400">Pulse</span></span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-zinc-400">
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
            <Link to="/" className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-4 py-1.5 font-bold text-black transition-transform hover:scale-105">Open app</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">{children}</main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-zinc-300">PackPulseDrops</p>
            <p className="mt-0.5">Digital trading card packs & peer-to-peer marketplace. Digital collectibles only.</p>
            <p className="mt-1">Support: <a href="mailto:pulpsepackdrops@gmail.com" className="text-amber-300 hover:underline">pulpsepackdrops@gmail.com</a></p>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/about" className="hover:text-zinc-300">About</Link>
            <Link to="/contact" className="hover:text-zinc-300">Contact</Link>
            <Link to="/terms" className="hover:text-zinc-300">Terms</Link>
            <Link to="/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link to="/refund" className="hover:text-zinc-300">Refunds</Link>
          </nav>
        </div>
        <p className="pb-4 text-center text-[11px] text-zinc-600">© {new Date().getFullYear()} PackPulseDrops. All rights reserved.</p>
      </footer>
    </div>
  );
}