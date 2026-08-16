import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
    const users = await base44.asServiceRole.entities.User.list();
    const admins = users.filter((u) => u.role === 'admin' && u.email);

    for (const u of admins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: u.email,
        subject: 'Withdrawal request held — account not verified',
        body:
          `A new withdrawal request is being held for 24 hours because the user's connected bank account is not verified.\n\n` +
          `Amount: ${wr ? wr.amount_gems : '?'} gems ($${wr ? wr.amount_usd : '?'})\n` +
          `Request ID: ${requestId}\n\n` +
          `Review it in the PackPulseDrops admin dashboard.`,
      });
    }

    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    console.error('notify-admin-withdrawal error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}