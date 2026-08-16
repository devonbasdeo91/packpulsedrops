import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { checkWithdrawalEligibility } from "../../shared/withdrawalApproval.ts";
import { createNotification } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const amt = parseInt(body.amount_gems, 10);
    // Read fresh balance from the DB (server is source of truth — auth.me() can
    // be stale, causing race conditions that overwrite concurrent balance changes).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    const elig = await checkWithdrawalEligibility(fresh, amt);
    if (!elig.ok) return Response.json({ error: elig.error }, { status: 400 });
    // Re-read the fresh balance right before debiting — narrows the race
    // window where a concurrent gem change between the initial read and
    // this write would be overwritten, losing or duplicating gems.
    const freshDebit = await base44.asServiceRole.entities.User.get(user.id);
    if ((freshDebit.gems || 0) < amt) {
      return Response.json({ error: 'Insufficient gems' }, { status: 400 });
    }
    await base44.asServiceRole.entities.User.update(user.id, { gems: (freshDebit.gems || 0) - amt });
    // Create the request as the user (owner)
    const withdrawal = await base44.entities.WithdrawalRequest.create({
      amount_gems: amt,
      amount_usd: elig.usd,
      status: 'pending',
      bank_name: elig.ext ? elig.ext.bank_name : 'Stripe',
      account_last4: elig.ext ? elig.ext.last4 : '',
      routing_last4: '',
      stripe_account_id: elig.accountId,
    });
    // Log the withdrawal hold as a transaction (service role — RLS blocks user creates)
    try {
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.id,
        type: 'withdrawal',
        amount_gems: -amt,
        amount_usd: elig.usd,
        description: `Withdrawal request to ${elig.ext ? elig.ext.bank_name : 'Stripe'} ••${elig.ext ? elig.ext.last4 : ''}`,
        related_id: withdrawal.id,
      });
    } catch (e) {
      console.error('request-withdrawal: transaction log failed', e.message);
    }
    // Notify the user their request was submitted.
    await createNotification(base44, user.id, {
      type: 'withdrawal_pending',
      title: 'Withdrawal submitted',
      message: `Your $${elig.usd.toFixed(2)} (${amt} gems) cash-out is pending review.`,
      link: '/wallet',
    });

    // Notify all admins about the new pending withdrawal request
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter((u) => u.role === 'admin' && u.email);
      for (const a of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: a.email,
          subject: 'New withdrawal request pending approval',
          body:
            `A user has submitted a new withdrawal request.\n\n` +
            `Amount: ${amt} gems ($${elig.usd.toFixed(2)})\n` +
            `User: ${user.email || user.id}\n\n` +
            `Review and approve it in the PackPulseDrops admin wallet dashboard.`,
        });
      }
    } catch (notifyErr) {
      console.error('request-withdrawal: failed to notify admins', notifyErr);
    }
    return Response.json({ success: true, new_balance: (fresh.gems || 0) - amt });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}