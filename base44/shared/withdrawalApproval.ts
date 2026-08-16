import { getStripeClient } from './stripeConfig.ts';
import { esc, sendGmail, resolveGmailSender } from './gmailSend.ts';
import { createNotification } from './notifications.ts';

/**
 * Sends a Gmail notification to all admins when a withdrawal is paid out,
 * so outgoing payments can be tracked. Fails silently (logged) so a Gmail
 * error never blocks the payout itself.
 */
async function notifyWithdrawalProcessed(base44, wr, transferId) {
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) { console.error('withdrawal notify: Gmail not connected'); return; }
    let senderEmail;
    try { senderEmail = await resolveGmailSender(accessToken); } catch (e) { console.error('withdrawal notify sender', e.message); return; }

    const users = await base44.asServiceRole.entities.User.list();
    const recipients = (users || []).filter((u) => u.role === 'admin' && u.email).map((u) => u.email);
    if (!recipients.length) recipients.push(senderEmail);

    const owner = await base44.asServiceRole.entities.User.get(wr.created_by_id);
    const ownerName = owner?.full_name || (owner?.email ? owner.email.split('@')[0] : 'Unknown');
    const ownerEmail = owner?.email || 'Unknown';
    const processed = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });

    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  <h2 style="margin:0 0 8px">💸 Withdrawal Processed</h2>
  <p style="color:#6b7280;margin:0 0 16px">A payout has been sent to a collector's connected bank account.</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Collector</td><td style="text-align:right;font-weight:bold">${esc(ownerName)}<br><span style="color:#6b7280;font-size:13px">${esc(ownerEmail)}</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Amount</td><td style="text-align:right;font-weight:bold;color:#b45309">$${wr.amount_usd} <span style="color:#9ca3af;font-weight:normal">(${wr.amount_gems} gems)</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Stripe Transfer</td><td style="text-align:right;font-family:monospace;font-size:12px">${esc(transferId)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Destination Account</td><td style="text-align:right;font-family:monospace;font-size:12px">${esc(wr.stripe_account_id || '')}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280">Processed</td><td style="text-align:right">${processed} (ET)</td></tr>
  </table>
  <p style="color:#9ca3af;font-size:12px">Track this transfer in your Stripe dashboard.</p>
</div>`;

    const subject = `PackPulseDrops withdrawal processed — $${wr.amount_usd} to ${ownerName}`;
    for (const to of recipients) {
      try { await sendGmail(accessToken, senderEmail, to, subject, html); }
      catch (e) { console.error('withdrawal notify send to', to, e.message); }
    }
  } catch (e) {
    console.error('withdrawal notify failed', e.message);
  }
}

/**
 * Core withdrawal approval: transfers funds to the seller's connected Stripe
 * account, attempts an instant payout, and marks the WithdrawalRequest paid.
 * Shared by the admin-facing process-withdrawal and the workflow-facing
 * auto-approve-withdrawal so the logic lives in one place.
 */
export async function approveWithdrawal(base44, requestId, note = '') {
  const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
  if (!wr) throw new Error('Not found');
  if (wr.status !== 'pending') throw new Error('Request already processed');

  // Immediately mark as 'approved' — this narrows the race window with a
  // concurrent reject (process-withdrawal). After this update, the reject
  // path's status re-check will see 'approved' and bail out, preventing a
  // double-spend where the user gets both the refund and the transfer.
  await base44.asServiceRole.entities.WithdrawalRequest.update(requestId, {
    status: 'approved',
    processed_date: new Date().toISOString(),
  });

  const accountId = wr.stripe_account_id;

  // Manual bank withdrawal (no Stripe connected account): the admin handles
  // the actual bank transfer out-of-band, so we just mark the request paid.
  if (!accountId) {
    await base44.asServiceRole.entities.WithdrawalRequest.update(requestId, {
      status: 'paid',
      processed_date: new Date().toISOString(),
      admin_note: note || 'Manual bank transfer — approved by admin',
    });
    await notifyWithdrawalProcessed(base44, wr, 'manual');
    await createNotification(base44, wr.created_by_id, {
      type: 'withdrawal_paid',
      title: 'Withdrawal processed! 💸',
      message: `$${wr.amount_usd} (${wr.amount_gems} gems) has been sent to your bank account.`,
      link: '/wallet',
      metadata: { withdrawal_id: requestId },
    });
    return { transfer_id: 'manual', payout_id: '' };
  }

  const stripe = getStripeClient();
  const cents = Math.round(wr.amount_usd * 100);
  const transfer = await stripe.transfers.create({
    amount: cents,
    currency: 'usd',
    destination: accountId,
    metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), withdrawal_id: requestId },
  });

  let payoutId = '';
  try {
    const payout = await stripe.payouts.create({ amount: cents, currency: 'usd' }, { stripeAccount: accountId });
    payoutId = payout.id;
  } catch (e) {
    // Instant payout may fail if the connected balance isn't settled yet; the transfer still succeeded.
    console.error('payout create failed', e);
  }

  await base44.asServiceRole.entities.WithdrawalRequest.update(requestId, {
    status: 'paid',
    processed_date: new Date().toISOString(),
    admin_note: note,
    stripe_transfer_id: transfer.id,
  });

  await notifyWithdrawalProcessed(base44, wr, transfer.id);

  await createNotification(base44, wr.created_by_id, {
    type: 'withdrawal_paid',
    title: 'Withdrawal processed! 💸',
    message: `$${wr.amount_usd} (${wr.amount_gems} gems) has been sent to your bank account.`,
    link: '/wallet',
    metadata: { transfer_id: transfer.id, withdrawal_id: requestId },
  });

  return { transfer_id: transfer.id, payout_id: payoutId };
}

export const GEM_TO_USD = 0.0035;
export const MIN_WITHDRAWAL = 2857;
export const PLATFORM_FEE = 0.05;

/**
 * Shared eligibility check for gem withdrawals: validates the amount, the
 * seller's gem balance, and their connected Stripe account's payout readiness.
 * Returns { ok, error } on failure or { ok, usd, ext, accountId } on success.
 */
export async function checkWithdrawalEligibility(user, amountGems) {
  if (!amountGems || amountGems < MIN_WITHDRAWAL) {
    return { ok: false, error: 'Minimum withdrawal is ' + MIN_WITHDRAWAL + ' gems' };
  }
  if ((user.gems || 0) < amountGems) {
    return { ok: false, error: 'Not enough gems' };
  }
  const accountId = user.stripe_account_id;
  if (!accountId) return { ok: false, error: 'Connect your bank account first' };
  const stripe = getStripeClient();
  const acct = await stripe.accounts.retrieve(accountId);
  if (!acct.payouts_enabled) return { ok: false, error: 'Your bank account is not verified yet' };
  const ext = ((acct.external_accounts && acct.external_accounts.data) || []).find((a) => a.default_for_currency);
  const usd = Math.round(amountGems * GEM_TO_USD * 100) / 100;
  return { ok: true, usd, ext, accountId };
}