import React, { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StarRating({ value = 0, onChange, size = 16, className }) {
  const [hover, setHover] = useState(0);
  const interactive = typeof onChange === "function";
  const display = hover || value;
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange(n)}
          className={cn(interactive ? "cursor-pointer" : "cursor-default")}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= display ? "fill-amber-400 text-amber-400" : "fill-transparent text-zinc-600"}
          />
        </button>
      ))}
    </div>
  );
}