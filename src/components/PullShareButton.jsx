import React, { useState } from "react";
import { Share2, Copy, Check, Instagram } from "lucide-react";
import ShareButtons from "@/components/ShareButtons";

const RARE = new Set([
  "Super Rare",
  "Refractor",
  "Ultra Rare",
  "Auto",
  "Secret Rare",
  "Relic",
  "Ghost Rare",
  "1/1",
  "Diamond",
]);

export default function PullShareButton({ pull, packName, packId }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [igCopied, setIgCopied] = useState(false);
  if (!pull) return null;

  const isRare = RARE.has(pull.rarity);
  const shareUrl = packId ? `${window.location.origin}/rip/${packId}` : window.location.origin;
  const shareText = isRare
    ? `🔥 I just pulled a ${pull.rarity} "${pull.name}"${packName ? ` from ${packName}` : ""} on PackPulseDrops!`
    : `Just ripped a pack on PackPulseDrops and pulled "${pull.name}".`;

  const rarityDetails = [
    `${pull.name} · ${pull.rarity}`,
    packName ? `Pack: ${packName}` : "",
    pull.subset ? `Subset: ${pull.subset}` : "",
    pull.value_gems ? `Value: ${pull.value_gems.toLocaleString()} gems` : "",
    `Pulled on PackPulseDrops — ${shareUrl}`,
  ].filter(Boolean).join("\n");

  const copyCard = async () => {
    const text = rarityDetails;
    let ok = false;
    try {
      const res = await fetch(pull.image_url, { mode: "cors" });
      if (res.ok) {
        let blob = await res.blob();
        if (blob.type !== "image/png") {
          const bmp = await window.createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = bmp.width;
          canvas.height = bmp.height;
          canvas.getContext("2d").drawImage(bmp, 0, 0);
          blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
        }
        if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
              "text/plain": new Blob([text], { type: "text/plain" }),
            }),
          ]);
          ok = true;
        }
      }
    } catch {
      /* image copy unavailable — fall back to text */
    }
    if (!ok) {
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch {
        /* clipboard unavailable */
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "PackPulseDrops pull", text: shareText, url: shareUrl });
        return;
      } catch {
        /* cancelled — fall through to link fallback */
      }
    }
    setOpen((v) => !v);
  };

  const shareInstagram = async () => {
    try {
      await navigator.clipboard?.writeText(`${shareText} ${shareUrl}`);
    } catch {
      /* clipboard unavailable */
    }
    setIgCopied(true);
    setTimeout(() => setIgCopied(false), 1500);
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={copyCard}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied to clipboard!" : "Copy card to clipboard"}
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/10"
        >
          <Share2 className="h-4 w-4" /> Share link
        </button>
        <button
          onClick={shareInstagram}
          className="inline-flex items-center gap-2 rounded-full border border-pink-400/40 bg-pink-500/10 px-5 py-2.5 text-xs font-semibold text-pink-200 transition-colors hover:bg-pink-500/20"
        >
          <Instagram className="h-4 w-4" /> {igCopied ? "Copied — paste in IG!" : "Instagram"}
        </button>
      </div>
      {open && <ShareButtons url={shareUrl} text={shareText} />}
    </div>
  );
}