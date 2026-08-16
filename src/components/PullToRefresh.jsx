import React from "react";
import { Loader2 } from "lucide-react";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

// Wrap any scrollable page content to enable native-style pull-to-refresh.
// onRefresh should reload that page's data (returning a promise is ideal).
export default function PullToRefresh({ onRefresh, children, className }) {
  const { pull, refreshing } = usePullToRefresh(onRefresh);
  const height = refreshing ? 44 : Math.min(pull, 80);
  return (
    <div className={className}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
        style={{ height }}
      >
        {(pull > 0 || refreshing) && (
          <Loader2
            className={cn(
              "h-5 w-5 text-amber-400 transition-opacity",
              refreshing || pull > 20 ? "animate-spin opacity-100" : "opacity-50"
            )}
          />
        )}
      </div>
      {children}
    </div>
  );
}