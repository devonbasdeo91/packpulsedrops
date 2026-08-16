import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';

const GEMS_PER_USD = 0.0035;
const DAYS_WINDOW = 30;

function usd(gems) {
  return ((gems || 0) * GEMS_PER_USD).toFixed(2);
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function buildHtml(since, soldListings, withdrawals) {
  const salesCount = soldListings.length;
  const salesVolumeGems = soldListings.reduce((s, l) => s + (l.ask_price_gems || 0), 0);
  const salesVolumeUsd = (salesVolumeGems * GEMS_PER_USD).toFixed(2);
  const feeUsd = (salesVolumeGems * GEMS_PER_USD * 0.05).toFixed(2);
  const netUsd = (salesVolumeGems * GEMS_PER_USD * 0.95).toFixed(2);

  const wdCount = withdrawals.length;
  const wdAmountUsd = withdrawals.reduce((s, w) => s + (w.amount_usd || 0), 0);
  const wdPaid = withdrawals.filter((w) => w.status === 'paid');
  const wdPending = withdrawals.filter((w) => w.status === 'pending' || w.status === 'approved');
  const wdRejected = withdrawals.filter((w) => w.status === 'rejected');

  let body = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1f2937">`;
  body += `<h2 style="margin:0 0 8px">📊 PackPulseDrops Monthly Report</h2>`;
  body += `<p style="color:#6b7280;margin:0 0 24px">${esc(fmtDate(since))} – ${esc(fmtDate(new Date()))}</p>`;

  // --- Sales ---
  body += `<h3 style="margin:0 0 10px">🃏 Card Sales</h3>`;
  body += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px">`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Total sales</td><td style="text-align:right;font-weight:bold">${salesCount}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Gross volume</td><td style="text-align:right;font-weight:bold;color:#b45309">$${esc(salesVolumeUsd)}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Marketplace fee (5%)</td><td style="text-align:right;color:#059669">$${esc(feeUsd)}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Net to sellers</td><td style="text-align:right;font-weight:bold">$${esc(netUsd)}</td></tr>`;
  body += `</table>`;

  if (salesCount) {
    body += `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">`;
    for (const l of soldListings) {
      body += `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(l.card_name)}</b><br><span style="color:#6b7280;font-size:13px">${esc(l.rarity || '')}${l.seller_name ? ' · ' + esc(l.seller_name) : ''}</span></td><td style="text-align:right;white-space:nowrap;font-weight:bold;color:#b45309">$${esc(usd(l.ask_price_gems))}</td></tr>`;
    }
    body += `</table>`;
  } else {
    body += `<p style="color:#6b7280;margin:0 0 24px">No card sales in this period.</p>`;
  }

  // --- Withdrawals ---
  body += `<h3 style="margin:0 0 10px">💸 Withdrawals</h3>`;
  body += `<table style="width:100%;border-collapse:collapse;margin-bottom:8px">`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Total requests</td><td style="text-align:right;font-weight:bold">${wdCount}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Total amount</td><td style="text-align:right;font-weight:bold;color:#b45309">$${esc(wdAmountUsd.toFixed(2))}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Paid</td><td style="text-align:right">${wdPaid.length}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Pending / approved</td><td style="text-align:right">${wdPending.length}</td></tr>`;
  body += `<tr><td style="padding:6px 0;color:#6b7280">Rejected</td><td style="text-align:right">${wdRejected.length}</td></tr>`;
  body += `</table>`;

  if (wdCount) {
    body += `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">`;
    for (const w of withdrawals) {
      const statusColor = w.status === 'paid' ? '#059669' : w.status === 'rejected' ? '#dc2626' : '#6b7280';
      body += `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>$${esc((w.amount_usd || 0).toFixed(2))}</b><br><span style="color:#6b7280;font-size:13px">${esc(w.bank_name || 'Bank')} ·•${esc(w.account_last4 || '')}</span></td><td style="text-align:right;white-space:nowrap"><span style="color:${statusColor};font-weight:bold;text-transform:capitalize">${esc(w.status)}</span></td></tr>`;
    }
    body += `</table>`;
  } else {
    body += `<p style="color:#6b7280;margin:0 0 24px">No withdrawal requests in this period.</p>`;
  }

  body += `<hr style="border:none;border-top:1px solid #eee;margin:24px 0"><p style="color:#9ca3af;font-size:12px">Automated monthly report from PackPulseDrops.</p></div>`;
  return body;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail not connected' }, { status: 500 });

    let senderEmail;
    try {
      senderEmail = await resolveGmailSender(accessToken);
    } catch (e) {
      console.error('gmail sender error', e.message);
      return Response.json({ error: e.message }, { status: 500 });
    }

    const since = new Date(Date.now() - DAYS_WINDOW * 24 * 60 * 60 * 1000);

    // Sold listings within the window
    const sold = await base44.asServiceRole.entities.Listing.filter({ status: 'sold' }, '-sold_date', 1000);
    const soldListings = (sold || []).filter((l) => {
      const d = l.sold_date ? new Date(l.sold_date) : null;
      return d && d >= since;
    });

    // Withdrawal requests within the window
    const withdrawalsAll = await base44.asServiceRole.entities.WithdrawalRequest.list('-created_date', 1000);
    const withdrawals = (withdrawalsAll || []).filter((w) => {
      const d = w.created_date ? new Date(w.created_date) : null;
      return d && d >= since;
    });

    const subject = `PackPulseDrops Monthly Report — ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    const html = buildHtml(since, soldListings, withdrawals);

    await sendGmail(accessToken, senderEmail, senderEmail, subject, html);

    return Response.json({
      sent: true,
      to: senderEmail,
      sales_count: soldListings.length,
      withdrawal_count: withdrawals.length,
    });
  } catch (error) {
    console.error('send-monthly-sales-report error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}