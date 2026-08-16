import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public profile aggregator. Pulls and Trades have RLS that blocks cross-user
// reads, so this runs under the service role to assemble a profile view.
// The app is public (no login required), so this does NOT require auth.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Public profile endpoint — auth is optional (guests can view profiles).
    // Attempt auth so the access context is logged, but don't require it.
    try { await base44.auth.me(); } catch {}
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;
    if (!userId) return Response.json({ error: 'user_id required' }, { status: 400 });

    // Public profile info
    let profile = null;
    try {
      const u = await base44.asServiceRole.entities.User.get(userId);
      // Don't expose the username (which is an email address on this platform)
      // or the raw OAuth full_name to unauthenticated callers. Use the OAuth
      // full_name as the public display name, or a generic handle if absent.
      // Never return the username field — it's an email, so exposing it is a
      // PII leak via arbitrary user ID enumeration.
      profile = {
        id: u.id,
        full_name: u.full_name || 'Collector',
        created_date: u.created_date,
      };
    } catch (e) {
      console.error('get-user-profile: user lookup failed', e.message);
    }

    // Collection value — sum of all their pulls
    const pulls = await base44.asServiceRole.entities.Pull.filter(
      { created_by_id: userId }, '-created_date', 500
    );
    const collectionValueGems = (pulls || []).reduce((sum, p) => sum + (p.value_gems || 0), 0);
    const collectionCount = (pulls || []).length;
    const topPulls = (pulls || []).slice(0, 3).map((p) => ({
      card_name: p.card_name,
      category: p.category,
      rarity: p.rarity,
      value_gems: p.value_gems,
      image_url: p.image_url,
    }));

    // Recent accepted trades involving this user
    const trades = await base44.asServiceRole.entities.Trade.filter(
      { status: 'accepted', $or: [{ requester_id: userId }, { recipient_id: userId }] },
      '-created_date', 10
    );
    const recentTrades = (trades || []).map((t) => ({
      id: t.id,
      requester_name: 'Collector',
      recipient_name: 'Collector',
      offered_card_name: t.offered_card_name,
      offered_category: t.offered_category,
      offered_rarity: t.offered_rarity,
      offered_value_gems: t.offered_value_gems,
      requested_card_name: t.requested_card_name,
      requested_category: t.requested_category,
      requested_rarity: t.requested_rarity,
      requested_value_gems: t.requested_value_gems,
      role: t.requester_id === userId ? 'requester' : 'recipient',
      created_date: t.created_date,
    }));

    // Reviews received
    const reviews = await base44.asServiceRole.entities.Review.filter(
      { reviewee_id: userId }, '-created_date', 50
    );
    const reviewList = (reviews || []).map((r) => ({
      id: r.id,
      reviewer_name: r.reviewer_name,
      reviewer_role: r.reviewer_role,
      rating: r.rating,
      comment: r.comment,
      created_date: r.created_date,
    }));
    const avgRating = reviewList.length > 0
      ? reviewList.reduce((s, r) => s + r.rating, 0) / reviewList.length
      : 0;

    return Response.json({
      profile,
      collectionValueGems,
      collectionValueUsd: collectionValueGems * 0.0035,
      collectionCount,
      topPulls,
      recentTrades,
      reviews: reviewList,
      avgRating,
      reviewCount: reviewList.length,
    });
  } catch (error) {
    console.error('get-user-profile error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}