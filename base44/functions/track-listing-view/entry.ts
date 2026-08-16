import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Public endpoint (no auth) that batch-increments the `views` counter for
 * a set of listing IDs. Called from the Marketplace page when listings are
 * displayed to a new visitor session (deduped via localStorage on the client).
 *
 * Inflating views only makes a listing LESS likely to be flagged for price
 * suggestions, so there's no abuse incentive. The function only increments
 * (never decrements) and caps at 100 IDs per call.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — marketplace is public, guests allowed
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const listingIds = Array.isArray(body.listing_ids) ? body.listing_ids : [];
    if (listingIds.length === 0) return Response.json({ success: true, tracked: 0 });

    const ids = listingIds.slice(0, 100);
    await base44.asServiceRole.entities.Listing.updateMany(
      { id: { $in: ids }, status: "active" },
      { $inc: { views: 1 } }
    );
    return Response.json({ success: true, tracked: ids.length });
  } catch (error) {
    console.error('track-listing-view error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}