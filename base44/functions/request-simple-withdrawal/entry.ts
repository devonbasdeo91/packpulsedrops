import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createNotification } from "../../shared/notifications.ts";

const GEM_TO_USD = 0.0035;
const MIN_WITHDRAWAL = 2857;

// Platform fee by withdrawal type: standard bank transfer = 5%, instant debit card = 10%.
const FEE_PERCENT = {
  standard: 5,
  instant: 10,
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));

    const amt = parseInt(body.amount_gems, 10);
    if (!amt || amt < MIN_WITHDRAWAL) {
      return Response.json({ error: 'Minimum withdrawal is $' + (MIN_WITHDRAWAL * GEM_TO_USD).toFixed(2) }, { status: 400 });
    }

    const withdrawalType = body.withdrawal_type === 'instant' ? 'instant' : 'standard';
    const feePercent = FEE_PERCENT[withdrawalType];

    // Validate destination details based on withdrawal type.
    const bankName = (body.bank_name || '').trim();
    const accountLast4 = (body.account_last4 || '').trim();
    const routingLast4 = (body.routing_last4 || '').trim();
    const cardLast4 = (body.card_last4 || '').trim();

    if (withdrawalType === 'standard') {
      if (!bankName) return Response.json({ error: 'Select your bank' }, { status: 400 });
      if (!/^\d{4}$/.test(accountLast4)) return Response.json({ error: 'Account number must end in 4 digits' }, { status: 400 });
      if (!/^\d{4}$/.test(routingLast4)) return Response.json({ error: 'Routing number must end in 4 digits' }, { status: 400 });
    } else {
      if (!/^\d{4}$/.test(cardLast4)) return Response.json({ error: 'Debit card number must end in 4 digits' }, { status: 400 });
    }

    // Read fresh balance from the DB (server is source of truth).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    if ((fresh.gems || 0) < amt) {
      return Response.json({ error: 'Not enough balance' }, { status: 400 });
    }

    const grossUsd = Math.round(amt * GEM_TO_USD * 100) / 100;
    const feeUsd = Math.round(grossUsd * feePercent) / 100;
    const netUsd = Math.round((grossUsd - feeUsd) * 100) / 100;

    // Re-read the fresh balance right before debiting — narrows the race
    // window where a concurrent gem change between the initial read and
    // this write would be overwritten, losing or duplicating gems.
    const freshDebit = await base44.asServiceRole.entities.User.get(user.id);
    if ((freshDebit.gems || 0) < amt) {
      return Response.json({ error: 'Not enough balance' }, { status: 400 });
    }
    const debitedGems = (freshDebit.gems || 0) - amt;
    await base44.asServiceRole.entities.User.update(user.id, { gems: debitedGems });

    // Build the withdrawal request record with fee breakdown.
    const withdrawalRecord = {
      amount_gems: amt,
      amount_usd: grossUsd,
      net_usd: netUsd,
      fee_percent: feePercent,
      withdrawal_type: withdrawalType,
      status: 'pending',
      description: body.description || (withdrawalType === 'instant'
        ? `Instant debit card withdrawal (••${cardLast4}) — 10% fee`
        : `Standard bank withdrawal to ${bankName} ••${accountLast4} — 5% fee`),
    };

    if (withdrawalType === 'standard') {
      withdrawalRecord.bank_name = bankName;
      withdrawalRecord.account_last4 = accountLast4;
      withdrawalRecord.routing_last4 = routingLast4;
    } else {
      withdrawalRecord.card_last4 = cardLast4;
    }

    const withdrawal = await base44.entities.WithdrawalRequest.create(withdrawalRecord);

    // Log the withdrawal hold as a transaction (service role — RLS blocks user creates)
    try {
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.id,
        type: 'withdrawal',
        amount_gems: -amt,
        amount_usd: grossUsd,
        description: withdrawalType === 'instant'
          ? `Instant withdrawal to debit card ••${cardLast4} (10% fee, net $${netUsd.toFixed(2)})`
          : `Withdrawal request to ${bankName} ••${accountLast4} (5% fee, net $${netUsd.toFixed(2)})`,
        related_id: withdrawal.id,
      });
    } catch (e) {
      console.error('request-simple-withdrawal: transaction log failed', e.message);
    }

    // Notify the user their request was submitted.
    const destLabel = withdrawalType === 'instant'
      ? `debit card ••${cardLast4}`
      : `${bankName} ••${accountLast4}`;
    const etaLabel = withdrawalType === 'instant'
      ? 'processed instantly'
      : 'processed in 3-5 business days';
    await createNotification(base44, user.id, {
      type: 'withdrawal_pending',
      title: 'Withdrawal submitted',
      message: `Your $${netUsd.toFixed(2)} cash-out to ${destLabel} is pending. ${withdrawalType === 'instant' ? 'Instant withdrawal — ' + etaLabel + '.' : 'Standard bank transfer — ' + etaLabel + '.'} (Gross $${grossUsd.toFixed(2)}, ${feePercent}% fee)`,
      link: '/wallet',
    });

    // Notify admins.
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = (allUsers || []).filter((u) => u.role === 'admin' && u.email);
      for (const a of admins) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: a.email,
          subject: withdrawalType === 'instant'
            ? '⚡ Instant withdrawal request pending approval'
            : 'New withdrawal request pending approval',
          body:
            'A user has submitted a ' + (withdrawalType === 'instant' ? 'INSTANT' : 'standard') + ' withdrawal request.\n\n' +
            'Gross amount: ' + amt + ' gems ($' + grossUsd.toFixed(2) + ')\n' +
            'Platform fee: ' + feePercent + '% ($' + feeUsd.toFixed(2) + ')\n' +
            'Net payout: $' + netUsd.toFixed(2) + '\n' +
            'User: ' + (user.email || user.id) + '\n' +
            (withdrawalType === 'instant'
              ? 'Debit card: ••' + cardLast4 + '\n'
              : 'Bank: ' + bankName + ' (acct ••' + accountLast4 + ', routing ••' + routingLast4 + ')\n') +
            '\nReview and approve it in the PackPulseDrops admin wallet dashboard.',
        });
      }
    } catch (notifyErr) {
      console.error('request-simple-withdrawal: failed to notify admins', notifyErr);
    }

    return Response.json({ success: true, new_balance: debitedGems, net_usd: netUsd, fee_usd: feeUsd });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}