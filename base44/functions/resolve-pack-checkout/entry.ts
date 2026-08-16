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
    const txId = body.transaction_id;
    if (!txId) return Response.json({ error: 'transaction_id required' }, { status: 400 });

    const stripe = getStripeClient();
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(txId);
    } catch {
      // provider_transaction_id may be a payment intent id — resolve the session from it
      const sessions = await stripe.checkout.sessions.list({ payment_intent: txId, limit: 1 });
      session = sessions.data[0];
    }

    if (!session || !session.metadata) return Response.json({ is_pack: false });
    const meta = session.metadata;
    if (meta.type !== 'pack' || !meta.pack_id) return Response.json({ is_pack: false });
    return Response.json({ is_pack: true, pack_id: meta.pack_id, user_id: meta.user_id || '' });
  } catch (error) {
    console.error('resolve-pack-checkout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}