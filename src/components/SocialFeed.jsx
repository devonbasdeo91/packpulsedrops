import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Facebook, Instagram, Twitter, Users, Loader2, RefreshCw } from "lucide-react";
import RedditIcon from "@/components/RedditIcon";
import { cn } from "@/lib/utils";

const SHARE_EVENT = "socialpost:created";

const SOURCE_META = {
  facebook: { Icon: Facebook, color: "text-[#1877F2]", badge: "bg-[#1877F2]/20 text-[#1877F2]" },
  instagram: { Icon: Instagram, color: "text-[#FD1D1D]", badge: "bg-[#FD1D1D]/20 text-[#FD1D1D]" },
  x: { Icon: Twitter, color: "text-zinc-100", badge: "bg-white/10 text-zinc-200" },
  reddit: { Icon: RedditIcon, color: "text-[#FF4500]", badge: "bg-[#FF4500]/20 text-[#FF4500]" },
  community: { Icon: Users, color: "text-sky-300", badge: "bg-sky-500/15 text-sky-300" },
};

export default function SocialFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SocialPost.list("-created_date", 20);
      setPosts(data || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener(SHARE_EVENT, handler);
    return () => window.removeEventListener(SHARE_EVENT, handler);
  }, []);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-white">Community feed</h2>
        <button onClick={load} className="text-zinc-400 hover:text-white" aria-label="Refresh feed">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {loading ? (
        <div className="flex h-32 items-center justify-center text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-10 text-center text-sm text-zinc-500">
          No posts yet. Share your stats above to kick off the feed.
        </p>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {(() => {
                  const meta = SOURCE_META[p.source] || SOURCE_META.community;
                  const MetaIcon = meta.Icon;
                  return <MetaIcon className={cn("h-3.5 w-3.5", meta.color)} />;
                })()}
                <span className="font-semibold text-zinc-200">{p.author_name || "PackPulseDrops user"}</span>
                <span>
                  · {new Date(p.created_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    (SOURCE_META[p.source] || SOURCE_META.community).badge
                  )}
                >
                  {p.source}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{p.content}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}