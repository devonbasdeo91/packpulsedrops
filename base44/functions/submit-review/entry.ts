import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { listing_id, trade_id, rating, comment } = body;
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return Response.json({ error: 'Rating must be 1-5' }, { status: 400 });

    const reviewerName = user.full_name || user.username || (user.email ? user.email.split('@')[0] : 'Collector');
    const cleanComment = (comment || '').slice(0, 500);

    // --- P2P trade review ---
    if (trade_id) {
      const trade = await base44.entities.Trade.get(trade_id);
      if (!trade) return Response.json({ error: 'Trade not found' }, { status: 404 });
      if (trade.status !== 'accepted') return Response.json({ error: 'Can only review completed trades' }, { status: 400 });

      let revieweeId = null;
      let revieweeName = null;
      if (trade.requester_id === user.id) {
        revieweeId = trade.recipient_id;
        revieweeName = trade.recipient_name;
      } else if (trade.recipient_id === user.id) {
        revieweeId = trade.requester_id;
        revieweeName = trade.requester_name;
      } else {
        return Response.json({ error: 'You were not part of this trade' }, { status: 403 });
      }
      if (!revieweeId) return Response.json({ error: 'Counterparty not found' }, { status: 400 });

      const existing = await base44.entities.Review.filter({ trade_id, reviewer_id: user.id }, '-created_date', 1);
      if (existing && existing.length > 0) return Response.json({ error: 'You already reviewed this trade' }, { status: 400 });

      await base44.entities.Review.create({
        trade_id,
        card_name: trade.offered_card_name || '',
        reviewer_id: user.id,
        reviewer_name: reviewerName,
        reviewee_id: revieweeId,
        reviewee_name: revieweeName,
        reviewer_role: 'trader',
        rating: r,
        comment: cleanComment,
      });

      return Response.json({ success: true });
    }

    // --- Marketplace sale review ---
    if (!listing_id) return Response.json({ error: 'Missing listing or trade id' }, { status: 400 });

    const listing = await base44.entities.Listing.get(listing_id);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.status !== 'sold' && listing.status !== 'traded') return Response.json({ error: 'Can only review completed sales' }, { status: 400 });

    let role = null;
    let revieweeId = null;
    let revieweeName = null;
    if (listing.buyer_id === user.id) {
      role = 'buyer';
      revieweeId = listing.seller_id;
      revieweeName = listing.seller_name;
    } else if (listing.seller_id === user.id) {
      role = 'seller';
      revieweeId = listing.buyer_id;
      revieweeName = listing.buyer_name;
    } else {
      return Response.json({ error: 'You were not part of this transaction' }, { status: 403 });
    }
    if (!revieweeId) return Response.json({ error: 'Counterparty not found' }, { status: 400 });

    const existing = await base44.entities.Review.filter({ listing_id, reviewer_id: user.id }, '-created_date', 1);
    if (existing && existing.length > 0) return Response.json({ error: 'You already reviewed this transaction' }, { status: 400 });

    await base44.entities.Review.create({
      listing_id,
      card_name: listing.card_name,
      reviewer_id: user.id,
      reviewer_name: reviewerName,
      reviewee_id: revieweeId,
      reviewee_name: revieweeName,
      reviewer_role: role,
      rating: r,
      comment: cleanComment,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('submit-review error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}