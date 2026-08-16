import React from "react";
import { ArrowLeftRight } from "lucide-react";
import TradeHistory from "@/components/TradeHistory";

export default function TradeHistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 h-1 w-12 rounded-full bg-gradient-to-r from-amber-300 to-orange-500" />
        <h1 className="flex items-center gap-3 font-heading text-3xl font-bold text-white">
          <ArrowLeftRight className="h-7 w-7 text-amber-400" />
          Trade History
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          A complete record of your successful swaps and declined requests, most recent first.
        </p>
      </div>
      <TradeHistory />
    </div>
  );
}