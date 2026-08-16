import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';

function buildRequestHtml(trade) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">
    <h2 style="margin:0 0 8px">🃏 New trade request!</h2>
    <p style="color:#6b7280;margin:0 0 20px"><b>${esc(trade.requester_name)}</b> wants to trade with you.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>Their offer:</b><br>${esc(trade.offered_card_name)}<br><span style="color:#6b7280;font-size:13px">${esc(trade.offered_rarity || '')} · $${((trade.offered_value_gems || 0) * 0.0035).toFixed(2)}</span></td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>For your:</b><br>${esc(trade.requested_card_name)}<br><span style="color:#6b7280;font-size:13px">${esc(trade.requested_rarity || '')} · $${((trade.requested_value_gems || 0) * 0.0035).toFixed(2)}</span></td></tr>
    </table>
    <p style="color:#6b7280">Open PackPulseDrops and go to <b>My Trades</b> to accept or decline.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#9ca3af;font-size:12px">Automated notification from PackPulseDrops.</p></div>`;
}

function buildResponseHtml(trade) {
  const accepted = trade.status === 'accepted';
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">
    <h2 style="margin:0 0 8px">${accepted ? '✅ Trade accepted!' : '❌ Trade declined'}</h2>
    <p style="color:#6b7280;margin:0 0 20px"><b>${esc(trade.recipient_name)}</b> ${accepted ? 'accepted' : 'declined'} your trade request.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>You offered:</b><br>${esc(trade.offered_card_name)}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><b>For their:</b><br>${esc(trade.requested_card_name)}</td></tr>
    </table>
    ${accepted ? '<p style="color:#059669">The cards have been swapped — check your collection!</p>' : '<p style="color:#6b7280">Your card remains in your collection.</p>'}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="color:#9ca3af;font-size:12px">Automated notification from PackPulseDrops.</p></div>`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const tradeId = body.trade_id;
    if (!tradeId) return Response.json({ error: 'trade_id required' }, { status: 400 });

    const trade = await base44.asServiceRole.entities.Trade.get(tradeId);
    if (!trade) return Response.json({ error: 'Trade not found' }, { status: 404 });

    // Pending → notify the recipient (new request); accepted/declined → notify the requester
    const notifyUserId = trade.status === 'pending' ? trade.recipient_id : trade.requester_id;
    const subject = trade.status === 'pending'
      ? `New trade request from ${trade.requester_name}`
      : trade.status === 'accepted'
        ? 'Your trade request was accepted!'
        : 'Your trade request was declined';
    const html = trade.status === 'pending' ? buildRequestHtml(trade) : buildResponseHtml(trade);

    const notifyUser = await base44.asServiceRole.entities.User.get(notifyUserId);
    if (!notifyUser?.email) return Response.json({ skipped: 'no email on user' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) return Response.json({ error: 'Gmail not connected' }, { status: 500 });

    const senderEmail = await resolveGmailSender(accessToken);
    await sendGmail(accessToken, senderEmail, notifyUser.email, subject, html);

    return Response.json({ sent: true, status: trade.status });
  } catch (error) {
    console.error('notify-trade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}