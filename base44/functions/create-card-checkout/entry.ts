import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';
import { MAX_CARD_USD } from '../../shared/packTiers.ts';

// Direct card purchase: the platform sells any card (including rare ones) for
// real money. Revenue goes to the platform owner, not another user. On payment
// the webhook grants the card to the buyer; redeem-purchased-cards delivers it.
// Guest checkout: auth is optional — guests pay by email and claim later.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const cardId = body.card_id;
    if (!cardId) return Response.json({ error: 'Missing card' }, { status: 400 });
    const card = await base44.asServiceRole.entities.Card.get(cardId).catch(() => null);
    if (!card) return Response.json({ error: 'Card not found' }, { status: 404 });
    const priceUsd = Math.min(MAX_CARD_USD, Math.max(0.99, (card.value_gems || 0) * 0.0035));
    const unitAmount = Math.round(priceUsd * 100);
    const stripe = getStripeClient();
    const origin = new URL(req.url).origin;
    const isGuest = !user;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: card.name + ' — Direct Purchase' },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: isGuest
        ? origin + '/register?from=checkout&email={CHECKOUT_EMAIL}'
        : origin + '/collection?status=success',
      cancel_url: origin + '/marketplace?status=cancel',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        type: 'card',
        card_id: cardId,
        card_name: card.name,
        category: card.category,
        rarity: card.rarity || '',
        value_gems: String(card.value_gems || 0),
        subset: card.subset || '',
        ...(user ? { user_id: user.id } : {}),
      },
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-card-checkout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}