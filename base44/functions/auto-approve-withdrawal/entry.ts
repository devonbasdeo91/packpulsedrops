import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { approveWithdrawal } from "../../shared/withdrawalApproval.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));

    // This function is invoked by the "Withdrawal Request Review" workflow,
    // which is the trusted caller. External HTTP callers can't reach it.
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const result = await approveWithdrawal(base44, requestId, 'Auto-approved: account verified');
    return Response.json({ success: true, ...result });
  } catch (error) {
    console.error('auto-approve-withdrawal error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}