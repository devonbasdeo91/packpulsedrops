import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';

// Cash purchase of a collector marketplace listing. The buyer pays via Stripe;
// on payment the webhook marks the listing sold, grants the card to the buyer,
// and credits the seller's wallet with 95% of the ask price (5% platform fee).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const listingId = body.listing_id;
    if (!listingId) return Response.json({ error: 'Missing listing id' }, { status: 400 });
    const listing = await base44.asServiceRole.entities.Listing.get(listingId).catch(() => null);
    if (!listing || listing.status !== 'active') {
      return Response.json({ error: 'Listing no longer available' }, { status: 400 });
    }
    if (listing.seller_id === user.id) {
      return Response.json({ error: 'You cannot buy your own listing' }, { status: 400 });
    }
    const priceUsd = Math.max(0.99, (listing.ask_price_gems || 0) * 0.0035);
    const unitAmount = Math.round(priceUsd * 100);
    const stripe = getStripeClient();
    const origin = new URL(req.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: listing.card_name + ' — Marketplace Purchase' },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: origin + '/collection?status=success',
      cancel_url: origin + '/marketplace?status=cancel',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id: user.id,
        type: 'listing',
        listing_id: listingId,
        seller_id: listing.seller_id,
        card_name: listing.card_name,
        category: listing.category,
        rarity: listing.rarity || '',
        value_gems: String(listing.value_gems || 0),
        ask_price_gems: String(listing.ask_price_gems || 0),
        subset: listing.subset || '',
      },
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-listing-checkout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}