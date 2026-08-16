import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Returns the Stripe publishable key to the frontend so it can initialize
// Stripe Elements for the Apple Pay / Payment Request Button. The publishable
// key is safe to expose to the client — it can only create tokens/payment
// methods, not charge cards. Auth is optional (guests need this for checkout).
export default async function(req) {
  const base44 = createClientFromRequest(req);
  // Verify identity when available — guests are allowed for checkout
  await base44.auth.me().catch(() => null);
  const publishableKey = secrets.get('STRIPE_PUBLISHABLE_KEY');
  if (!publishableKey) {
    return Response.json({ error: 'Stripe publishable key not configured' }, { status: 500 });
  }
  return Response.json({ publishableKey });
}