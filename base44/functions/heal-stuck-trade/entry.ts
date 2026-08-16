import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';

/**
 * Targeted heal: checks a single trade and auto-declines it if still
 * pending. Called by the "Stuck Trade Auto-Decline" workflow after a
 * 7-day durable wait — fires only when a trade is created, not on a
 * schedule.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tradeId = body.trade_id;
    if (!tradeId) return Response.json({ error: 'trade_id required' }, { status: 400 });

    const trade = await base44.asServiceRole.entities.Trade.get(tradeId).catch(() => null);
    if (!trade) return Response.json({ skipped: true, reason: 'trade not found' });

    if (trade.status !== 'pending') {
      return Response.json({ skipped: true, reason: `trade already ${trade.status}` });
    }

    await base44.asServiceRole.entities.Trade.update(tradeId, { status: 'declined' });

    for (const uid of [trade.requester_id, trade.recipient_id]) {
      if (!uid) continue;
      try {
        await base44.asServiceRole.entities.Notification.create({
          type: 'trade_declined',
          title: 'Trade Expired',
          message: 'A pending trade has been automatically declined after 7 days of inactivity.',
          read: false,
          metadata: JSON.stringify({ trade_id: tradeId, auto_heal: true }),
        });
      } catch {}
    }

    return Response.json({ fixed: true, trade_id: tradeId });
  } catch (error) {
    console.error('heal-stuck-trade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}