import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { createNotification } from "../../shared/notifications.ts";
import { analyzeSuspiciousActivity } from "../../shared/suspiciousTradeCheck.ts";

export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
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

    const owner = await base44.asServiceRole.entities.User.get(wr.created_by_id);
    const ownerName = owner?.full_name || (owner?.email ? owner.email.split('@')[0] : 'Unknown');

    // Re-run the analysis so the notification carries the actual signals —
    // avoids relying on workflow-to-function data passing for complex objects.
    const risk = await analyzeSuspiciousActivity(base44, wr.created_by_id);
    const reasonText = risk.reasons.length > 0
      ? risk.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')
      : 'No specific signals returned.';

    const users = await base44.asServiceRole.entities.User.list();
    const admins = (users || []).filter((u) => u.role === 'admin' && u.email);

    // 1. In-app notification for each admin — links to the Withdrawal Assistant
    //    page where the withdrawal_helper agent can walk them through the review.
    for (const admin of admins) {
      await createNotification(base44, admin.id, {
        type: 'withdrawal_pending',
        title: `⚠️ Large withdrawal flagged — $${wr.amount_usd}`,
        message: `${ownerName}'s $${wr.amount_usd} withdrawal was flagged by the fraud check (risk score ${risk.risk_score}, ${risk.reasons.length} signal(s)). Review with the Withdrawal Assistant.`,
        link: '/withdrawal-assistant',
        metadata: {
          withdrawal_id: requestId,
          risk_score: risk.risk_score,
          reasons: JSON.stringify(risk.reasons).slice(0, 800),
        },
      });
    }

    // 2. Email each admin with the full context for offline review.
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `⚠️ Large withdrawal flagged for manual review — $${wr.amount_usd}`,
          body:
            `A withdrawal over $500 was flagged by the automated fraud check and held for manual review.\n\n` +
            `Collector: ${ownerName}\n` +
            `Amount: ${wr.amount_gems} gems ($${wr.amount_usd})\n` +
            `Request ID: ${requestId}\n` +
            `Risk Score: ${risk.risk_score}\n` +
            `Recent trades (24h): ${risk.trade_count_24h} | (48h): ${risk.trade_count_48h}\n\n` +
            `Suspicious activity signals:\n${reasonText}\n\n` +
            `Review this withdrawal with the Withdrawal Assistant agent:\n` +
            `${PRODUCTION_DOMAIN}/withdrawal-assistant\n`,
        });
      } catch (e) {
        console.error('escalate email to', admin.email, e.message);
      }
    }

    return Response.json({ success: true, notified: admins.length, escalated: true, risk_score: risk.risk_score });
  } catch (error) {
    console.error('escalate-withdrawal-to-agent error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}