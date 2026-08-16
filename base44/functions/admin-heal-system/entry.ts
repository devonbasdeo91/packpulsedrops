import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSystemHeal } from '../../shared/systemHeal.ts';

/**
 * Admin-triggered on-demand system heal. Called from the Admin Dashboard
 * "Run System Fix" button. Runs the same 14 checks as the scheduled
 * auto-heal-system, but only when an admin explicitly requests it —
 * no recurring credit cost.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });
    const report = await runSystemHeal(base44);
    return Response.json(report);
  } catch (error) {
    console.error('admin-heal-system error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}