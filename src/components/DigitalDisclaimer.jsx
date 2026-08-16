import React from "react";
import { Info } from "lucide-react";

export default function DigitalDisclaimer({ className = "" }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-sky-400/30 bg-sky-500/5 px-4 py-3 text-xs text-sky-200/90 ${className}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
      <p>
        <span className="font-semibold text-sky-200">Digital collectible.</span> All cards on PackPulseDrops are digital assets — no physical cards are printed, mailed, or shipped.
      </p>
    </div>
  );
}