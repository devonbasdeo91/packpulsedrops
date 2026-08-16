import React, { useState } from "react";
import { Share2, MessageCircle, Link2, Check, Instagram } from "lucide-react";

export default function ShareButtons({ url, text, className }) {
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  const shareUrl = url || window.location.origin;
  const shareText = text || "Rip digital trading card packs on PackPulseDrops!";
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const x = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  const copy = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const btn =
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className || ""}`}>
      <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className={btn}>
        <Share2 className="h-4 w-4" /> Facebook
      </a>
      <a href={x} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className={btn}>
        <MessageCircle className="h-4 w-4" /> X
      </a>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
          setIgCopied(true);
          setTimeout(() => setIgCopied(false), 1500);
          window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
        }}
        aria-label="Share on Instagram"
        className={btn}
      >
        <Instagram className="h-4 w-4" />
        {igCopied ? "Copied!" : "Instagram"}
      </button>
      <button onClick={copy} aria-label="Copy link" className={btn}>
        {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Link2 className="h-4 w-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}