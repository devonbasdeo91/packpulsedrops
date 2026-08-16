import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";

const YOUNG_ACCOUNT_DAYS = 30;

/**
 * Lightweight account-age check used by the existing withdrawal workflows to
 * skip young accounts — those are handled exclusively by the Young Account
 * Withdrawal Review workflow, which runs the full AI agent verification.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const requestId = body.request_id;
    if (!requestId) return Response.json({ error: 'request_id required' }, { status: 400 });

    const wr = await base44.asServiceRole.entities.WithdrawalRequest.get(requestId);
    if (!wr) return Response.json({ error: 'Not found' }, { status: 404 });

    const user = await base44.asServiceRole.entities.User.get(wr.created_by_id).catch(() => null);
    if (!user) return Response.json({ young_account: false });

    const accountAgeDays = (Date.now() - new Date(user.created_date).getTime()) / (1000 * 60 * 60 * 24);
    return Response.json({
      young_account: accountAgeDays < YOUNG_ACCOUNT_DAYS,
      account_age_days: Math.round(accountAgeDays),
    });
  } catch (error) {
    console.error('check-withdrawal-account-age error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}