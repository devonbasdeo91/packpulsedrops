import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const REWARD_GEMS = 250;

function dayStr(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

// User-callable daily gem reward. Idempotent per calendar day: once granted
// (by this call or by the login-triggered workflow), further calls the same
// day return already_claimed and never double-grant. This makes the daily
// reward reliable and instant instead of depending on the async workflow.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Free gem rewards disabled — gems can only be earned by buying or selling.
    return Response.json({ error: 'Daily rewards have been disabled. Gems can only be earned by buying or selling.' }, { status: 403 });
  } catch (error) {
    console.error('claim-daily-reward error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}