import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

const PLATFORM_FEE = 0.05;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const listingId = body.listing_id;
    if (!listingId) return Response.json({ error: 'listing_id required' }, { status: 400 });

    const listing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });
    if (listing.status !== 'sold') return Response.json({ skipped: true, reason: 'not_sold' });

    const seller = await base44.asServiceRole.entities.User.get(listing.seller_id).catch(() => null);
    if (!seller || !seller.email) return Response.json({ skipped: true, reason: 'no_seller_email' });

    const salePrice = listing.ask_price_gems || 0;
    const payout = Math.round(salePrice * (1 - PLATFORM_FEE));
    const fee = salePrice - payout;
    const buyer = listing.buyer_name || 'a buyer';

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: seller.email,
      subject: 'Your card sold on PackPulseDrops! 🎉',
      body: [
        `Hi ${seller.full_name || seller.email},`,
        '',
        'Your marketplace listing just sold!',
        '',
        `Card: ${listing.card_name}`,
        `Category: ${listing.category}`,
        `Rarity: ${listing.rarity}`,
        `Sale price: ${salePrice} gems`,
        `Platform fee (5%): ${fee} gems`,
        `You received: ${payout} gems`,
        '',
        `Buyer: ${buyer}`,
        '',
        'The gems have been credited to your wallet. Head to your collection to list more cards!',
        '',
        '— The PackPulseDrops Team',
      ].join('\n'),
    });

    return Response.json({ success: true, notified: true });
  } catch (error) {
    console.error('notify-seller-of-sale error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}