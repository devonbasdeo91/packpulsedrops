import Stripe from 'npm:stripe';
import { secrets } from 'base44:runtime';

/**
 * Single switch for Stripe test vs live mode.
 * true  → test keys (automated tests can use 4242 test cards)
 * false → live keys (real payments, for production)
 *
 * Flip back to false before publishing.
 */
export const STRIPE_TEST_MODE = false;

export function getStripeClient(): Stripe {
  const key = STRIPE_TEST_MODE
    ? secrets.get('STRIPE_TEST_SECRET_KEY')
    : secrets.get('STRIPE_SECRET_KEY');
  return new Stripe(key);
}

export function getStripeWebhookSecret(): string {
  return STRIPE_TEST_MODE
    ? secrets.get('STRIPE_TEST_WEBHOOK_SECRET')
    : secrets.get('STRIPE_WEBHOOK_SECRET');
}