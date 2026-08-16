import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function PackRatingBadge({ packId, className }) {
  const [avg, setAvg] = useState(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    base44.entities.PackReview.filter({ pack_id: packId })
      .then((reviews) => {
        if (!alive || !reviews.length) return;
        const sum = reviews.reduce((s, r) => s + (r.rating || 0), 0);
        setAvg(sum / reviews.length);
        setCount(reviews.length);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [packId]);

  if (!avg || count === 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold text-amber-300", className)}>
      <Star className="h-3 w-3 fill-amber-300" />
      {avg.toFixed(1)}
      <span className="text-zinc-500">({count})</span>
    </span>
  );
}