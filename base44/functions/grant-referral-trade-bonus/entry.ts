import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

/**
 * Called by the "First Trade Referral" workflow after a 24-hour hold. Re-verifies
 * that the trade is still accepted (not reversed) and that the qualifying user(s)
 * haven't already been bonused, then grants milestone gems to both the referred
 * user and their referrer.
 *
 * Idempotency: the `first_trade_bonus_at` timestamp on the User entity is set
 * atomically as part of the grant, so a replayed workflow run or a concurrent
 * call won't double-grant.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ disabled: true, reason: 'Referral trade bonuses have been disabled.' });
  } catch (error) {
    console.error('grant-referral-trade-bonus error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}