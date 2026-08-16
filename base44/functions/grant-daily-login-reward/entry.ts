import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil, secrets } from 'base44:runtime';
import { isInternalCall } from "../../shared/internalAuth.ts";

const REWARD_GEMS = 250;

function dayStr(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    // Internal-only: the Daily Login Reward workflow passes the user_id (from the
    // trusted app_user_auth trigger) plus the internal secret. External callers
    // can't supply the secret, so they can't credit arbitrary users.
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ disabled: true, reason: 'Daily login rewards have been disabled.' });
  } catch (error) {
    console.error('grant-daily-login-reward error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}