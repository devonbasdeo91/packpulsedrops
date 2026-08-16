import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { getStripeClient } from '../../shared/stripeConfig.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
    if (!wr) return Response.json({ error: 'Not found' }, { status: 404 });

    const accountId = wr.stripe_account_id;
    if (!accountId) {
      return Response.json({ verified: false, request_id: requestId, reason: 'no_connected_account' });
    }

    const stripe = getStripeClient();
    const acct = await stripe.accounts.retrieve(accountId);
    const verified = !!acct.payouts_enabled;
    return Response.json({ verified, request_id: requestId, payouts_enabled: verified });
  } catch (error) {
    console.error('check-withdrawal-verification error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}