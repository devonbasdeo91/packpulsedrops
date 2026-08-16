import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';

const GEM_TO_USD = 0.0035;

/**
 * Targeted heal: checks a single withdrawal request and escalates to
 * admins if still pending after 48h. Called by the "Stuck Withdrawal
 * Escalation" workflow after a 48-hour durable wait.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId).catch(() => null);
    if (!wr) return Response.json({ skipped: true, reason: 'withdrawal not found' });

    if (wr.status !== 'pending') {
      return Response.json({ skipped: true, reason: `withdrawal already ${wr.status}` });
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, '-created_date', 10);
    for (const admin of admins) {
      try {
        await base44.asServiceRole.entities.Notification.create({
          type: 'withdrawal_pending',
          title: 'Withdrawal Stuck >48h',
          message: `Withdrawal ${wr.id} for ${(wr.amount_gems || 0).toLocaleString()} gems ($${((wr.amount_gems || 0) * GEM_TO_USD).toFixed(2)}) has been pending for over 48 hours. Manual review required.`,
          read: false,
          link: '/cashout',
          metadata: JSON.stringify({ withdrawal_id: wr.id, auto_heal: true }),
        });
      } catch {}
    }

    return Response.json({ fixed: true, request_id: requestId, admins_notified: admins.length });
  } catch (error) {
    console.error('heal-stuck-withdrawal error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}