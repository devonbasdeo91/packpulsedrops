import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient } from '../../shared/stripeConfig.ts';
import { getTier, PACK_TIERS } from '../../shared/packTiers.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Guest checkout: auth is optional. If logged in, credit the user directly;
    // if not, the webhook stores the purchase by email for later claiming.
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const packId = body.pack_id;
    const tierKey = body.tier || 'silver';
    if (!packId) return Response.json({ error: 'Missing pack' }, { status: 400 });
    // Validate the tier against the allowed set — prevents an invalid tier
    // from silently falling back to silver in the payment metadata.
    if (!Object.prototype.hasOwnProperty.call(PACK_TIERS, tierKey)) {
      return Response.json({ error: 'Invalid tier' }, { status: 400 });
    }
    const pack = await base44.asServiceRole.entities.Pack.get(packId).catch(() => null);
    if (!pack) return Response.json({ error: 'Pack not found' }, { status: 404 });
    const tier = getTier(tierKey);
    const unitAmount = Math.round((tier.price_usd || 1) * 100);
    if (unitAmount < 50) return Response.json({ error: 'Invalid pack price' }, { status: 400 });
    const stripe = getStripeClient();
    const origin = new URL(req.url).origin;
    const isGuest = !user;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${tier.label} Pack — ${pack.name}` },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      // Guests are redirected to register after payment; {CHECKOUT_EMAIL} is
      // replaced by Stripe with the customer's email so the form is pre-filled.
      success_url: isGuest
        ? origin + '/register?from=checkout&email={CHECKOUT_EMAIL}'
        : origin + '/wallet?status=success',
      cancel_url: origin + '/shop?status=cancel',
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        type: 'pack',
        pack_id: packId,
        tier: tierKey,
        ...(user ? { user_id: user.id } : {}),
      },
    });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-pack-checkout error', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}