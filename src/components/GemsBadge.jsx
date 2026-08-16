import React from "react";
import { Link } from "react-router-dom";
import { useWallet } from "@/components/WalletProvider";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export default function GemsBadge({ className }) {
  const { gems, loaded } = useWallet();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className={cn(
          "flex items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-400/20",
          className
        )}
      >
        Log In
      </Link>
    );
  }

  return (
    <Link
      to="/wallet"
      className={cn(
        "flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-3 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/10",
        className
      )}
      title="View wallet"
    >
      <span className="tabular-nums">{loaded ? `$${(gems * 0.0035).toFixed(2)}` : "…"}</span>
    </Link>
  );
}