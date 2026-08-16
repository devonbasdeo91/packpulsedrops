import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { approveWithdrawal } from "../../shared/withdrawalApproval.ts";
import { createNotification } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const requestId = body.request_id;
    const action = body.action;
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }
    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
    if (!wr) return Response.json({ error: 'Not found' }, { status: 404 });
    if (wr.status !== 'pending') {
      return Response.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'reject') {
      // Re-check status right before updating — narrows the race window with
      // a concurrent approve (auto-approve-withdrawal workflow). Without this,
      // both could pass the initial 'pending' check and the user would get
      // both the refund and the transfer.
      const current = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
      if (!current || current.status !== 'pending') {
        return Response.json({ error: 'Request already processed' }, { status: 400 });
      }
      await base44.asServiceRole.entities.WithdrawalRequest.update(requestId, {
        status: 'rejected',
        processed_date: new Date().toISOString(),
        admin_note: body.note || '',
      });
      // Re-read the owner's fresh balance right before refunding — the initial
      // read could be stale if a concurrent gem change landed between the
      // withdrawal status update and this write, which would overwrite that
      // change and lose or duplicate gems.
      const freshOwner = await base44.asServiceRole.entities.User.get(wr.created_by_id);
      await base44.asServiceRole.entities.User.update(wr.created_by_id, {
        gems: (freshOwner.gems || 0) + wr.amount_gems,
      });
      await createNotification(base44, wr.created_by_id, {
        type: 'withdrawal_rejected',
        title: 'Withdrawal declined',
        message: `Your $${wr.amount_usd} cash-out was declined. ${wr.amount_gems} gems returned to your wallet.${body.note ? ' Note: ' + body.note : ''}`,
        link: '/wallet',
      });
      return Response.json({ success: true });
    }

    // approve → automatic Stripe transfer to the user's connected account + instant payout
    const result = await approveWithdrawal(base44, requestId, body.note || '');
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('process-withdrawal error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}