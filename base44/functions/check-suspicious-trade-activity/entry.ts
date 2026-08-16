import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { analyzeSuspiciousActivity } from "../../shared/suspiciousTradeCheck.ts";

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
    if (!wr) return Response.json({ error: 'Not found' }, { status: 404 });

    // Bail out if another workflow (e.g. the verification-based review) already
    // processed this withdrawal — no point running a fraud check on a paid request.
    if (wr.status !== 'pending') {
      return Response.json({
        suspicious: false,
        risk_score: 0,
        reasons: [`Withdrawal already ${wr.status} — skipping fraud check`],
        skipped: true,
        request_id: requestId,
      });
    }

    const userId = wr.created_by_id;
    if (!userId) return Response.json({ error: 'No user on withdrawal request' }, { status: 400 });

    const result = await analyzeSuspiciousActivity(base44, userId);
    return Response.json({ ...result, request_id: requestId, user_id: userId });
  } catch (error) {
    console.error('check-suspicious-trade-activity error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}