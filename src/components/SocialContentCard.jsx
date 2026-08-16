import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Share2, Copy, Check, Instagram, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const HASHTAGS = "#PackPulseDrops #PackRip #TradingCards";
const SHARE_EVENT = "socialpost:created";

export default function SocialContentCard({ stats }) {
  const { gems, collectionValue, collectionCount, bestPullName, bestPullRarity } = stats;
  const captions = useMemo(() => buildCaptions(stats), [stats]);
  const [selected, setSelected] = useState(0);
  const [me, setMe] = useState(null);
  const [copied, setCopied] = useState(false);
  const [postingIg, setPostingIg] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setMe).catch(() => {});
  }, []);

  const text = captions[selected] || "";
  const author = me?.full_name || me?.email || "PackPulseDrops user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "PackPulseDrops", text });
        return;
      } catch {
        /* cancelled — fall back to copy */
      }
    }
    copy();
  };

  const shareToFeed = async () => {
    setSharing(true);
    try {
      await base44.entities.SocialPost.create({
        content: text,
        author_name: author,
        source: "community",
        stats_snapshot: text,
      });
      toast({ title: "Posted to the community feed!" });
      window.dispatchEvent(new Event(SHARE_EVENT));
    } catch (e) {
      toast({ title: "Share failed", description: e.message, variant: "destructive" });
    } finally {
      setSharing(false);
    }
  };

  const sendTo = async (fnName, label, setBusy) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke(fnName, { content: text, stats_snapshot: text });
      if (res.data?.error) throw new Error(res.data.error);
      toast({ title: `Posted to ${label}!` });
      window.dispatchEvent(new Event(SHARE_EVENT));
    } catch (e) {
      toast({
        title: `${label} post failed`,
        description: e.response?.data?.error || e.message,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const postToInstagram = () => sendTo("post-to-instagram", "Instagram", setPostingIg);

  const platforms = [
    {
      key: "instagram",
      label: "Instagram",
      icon: Instagram,
      color: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCB045]",
      action: postToInstagram,
      busy: postingIg,
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        <h2 className="font-heading text-lg font-bold text-white">Share your stats</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Turn your vault into social content. Pick a caption, then copy, share, or post it.
      </p>

      <div className="mt-4 space-y-2">
        {captions.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className={cn(
              "w-full rounded-xl border p-3 text-left text-sm transition-colors",
              selected === i
                ? "border-amber-400/50 bg-amber-400/10 text-white"
                : "border-white/10 bg-black/20 text-zinc-300 hover:bg-white/5"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
        <button
          onClick={shareToFeed}
          disabled={sharing}
          className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-60"
        >
          {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Share to feed
        </button>
        {platforms.map(({ key, label, icon: Icon, color, action, busy }) => (
          <button
            key={key}
            onClick={action}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60",
              color
            )}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function buildCaptions(stats) {
  const { gems, collectionValue, collectionCount, bestPullName, bestPullRarity } = stats;
  const usd = (n) => `$${((n ?? 0) * 0.0035).toFixed(2)}`;
  const out = [];
  if (bestPullName) {
    out.push(
      `Just built my PackPulseDrops vault to ${usd(collectionValue)} 💎 — best pull so far: ${bestPullName} (${bestPullRarity}). Who's got a rarer hit? ${HASHTAGS}`
    );
  }
  out.push(
    `Sitting on ${usd(gems)} in my wallet and a ${usd(collectionValue)} collection 📦 ${collectionCount} card${collectionCount === 1 ? "" : "s"} deep. Pack-ripping season is open. ${HASHTAGS}`
  );
  if (bestPullName) {
    out.push(
      `The chase is real 🏆 Pulled a ${bestPullRarity} ${bestPullName} on PackPulseDrops. Vault value: ${usd(collectionValue)} and climbing. ${HASHTAGS}`
    );
  } else {
    out.push(
      `New to PackPulseDrops and already holding ${usd(gems)} in my wallet. Time to rip some packs and build the vault. ${HASHTAGS}`
    );
  }
  return out;
}