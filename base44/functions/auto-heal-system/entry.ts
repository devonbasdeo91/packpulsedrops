import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from '../../shared/internalAuth.ts';
import { runSystemHeal } from '../../shared/systemHeal.ts';

/**
 * Internal/workflow-triggered system heal. Called by entity-triggered
 * workflows (e.g. stuck-trade auto-decline, stuck-withdrawal escalation).
 * The shared runSystemHeal logic is also used by admin-heal-system.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const report = await runSystemHeal(base44);
    return Response.json(report);
  } catch (error) {
    console.error('auto-heal-system error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}