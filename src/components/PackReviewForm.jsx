import React, { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function PackReviewForm({ packId, packName }) {
  const { user } = useAuth();
  const [existing, setExisting] = useState(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !packId) { setLoading(false); return; }
    let alive = true;
    base44.entities.PackReview.filter({ pack_id: packId, created_by_id: user.id })
      .then((reviews) => {
        if (!alive) return;
        if (reviews.length > 0) {
          setExisting(reviews[0]);
          setRating(reviews[0].rating || 0);
          setComment(reviews[0].comment || "");
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user, packId]);

  const submit = async () => {
    if (rating < 1) {
      toast({ title: "Please select a star rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      if (existing) {
        const updated = await base44.entities.PackReview.update(existing.id, { rating, comment: comment.trim() });
        setExisting(updated);
        toast({ title: "Review updated!" });
      } else {
        const created = await base44.entities.PackReview.create({
          pack_id: packId,
          pack_name: packName,
          reviewer_id: user.id,
          reviewer_name: user.full_name || user.email || "",
          rating,
          comment: comment.trim(),
        });
        setExisting(created);
        toast({ title: "Review submitted!" });
      }
    } catch (e) {
      toast({ title: "Could not submit review", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;
  if (loading) return null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/50 p-5">
      <h3 className="font-heading text-sm font-bold text-white">Rate this pack</h3>
      <p className="mt-0.5 text-xs text-zinc-400">
        {existing ? "Update your rating" : "How was your rip?"}
      </p>
      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className="p-1"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-zinc-600"
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        maxLength={500}
        className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
        rows={2}
      />
      <button
        onClick={submit}
        disabled={submitting || rating < 1}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-2 text-sm font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 fill-black" />}
        {existing ? "Update" : "Submit"}
      </button>
    </div>
  );
}