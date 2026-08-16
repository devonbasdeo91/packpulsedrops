import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SellerRatingBadge({ avg = 0, count = 0, className }) {
  if (!count) {
    return <span className={cn("text-xs text-zinc-500", className)}>No ratings yet</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-amber-300", className)}>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      <span className="font-semibold">{avg.toFixed(1)}</span>
      <span className="text-zinc-500">({count})</span>
    </span>
  );
}