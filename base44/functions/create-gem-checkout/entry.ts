import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';
import { GEMS_PER_USD } from '../../shared/packTiers.ts';

const MIN_USD = 5;
const MAX_USD = 5000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Guest checkout: auth is optional.
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const amountUsd = Number(body.amount_usd);
    if (!Number.isFinite(amountUsd) || amountUsd < MIN_USD || amountUsd > MAX_USD) {
      return Response.json({ error: `Amount must be between $${MIN_USD} and $${MAX_USD}` }, { status: 400 });
    }
    // Use the exact gem count from the package so users get what the UI
    // advertises. Validate it's in a sane range relative to the USD paid to
    // prevent abuse (e.g. claiming 1,000,000 gems for $5).
    const requestedGems = parseInt(body.gems, 10);
    const expectedGems = Math.round(amountUsd / GEMS_PER_USD);
    const gems = Number.isFinite(requestedGems) && requestedGems > 0 && requestedGems <= expectedGems * 2
      ? requestedGems
      : expectedGems;
    const unitAmount = Math.round(amountUsd * 100);
    const stripe = getStripeClient();
    const origin = new URL(req.url).origin;
    const isGuest = !user;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: gems.toLocaleString() + ' Gems' },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      success_url: isGuest
        ? origin + '/register?from=checkout&email={CHECKOUT_EMAIL}'
        : origin + '/wallet?status=success',
      cancel_url: origin + '/wallet?status=cancel',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        type: 'gems',
        gems: String(gems),
        ...(user ? { user_id: user.id } : {}),
      },
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-gem-checkout error', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}