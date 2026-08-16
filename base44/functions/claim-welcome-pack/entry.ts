import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Free rewards disabled — gems/packs can only be earned by buying or selling.
    return Response.json({ error: 'Welcome packs have been disabled. Gems can only be earned by buying or selling.' }, { status: 403 });

    let fresh;
    try {
      fresh = await base44.asServiceRole.entities.User.get(user.id);
    } catch {
      fresh = user;
    }
    if (fresh.welcome_pack_claimed) {
      return Response.json({ success: false, already_claimed: true });
    }

    // Re-read fresh state right before writing — narrows the race window
    // where a concurrent pack_credits change (e.g. open-pack decrementing
    // a credit) between the initial read and this write would be overwritten.
    let freshCredit = fresh;
    try { freshCredit = await base44.asServiceRole.entities.User.get(user.id); } catch { /* fall back */ }
    const newCredits = (freshCredit.pack_credits || 0) + 1;
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        welcome_pack_claimed: true,
        pack_credits: newCredits,
      });
    } catch {
      await base44.auth.updateMe({
        welcome_pack_claimed: true,
        pack_credits: newCredits,
      });
    }

    return Response.json({ success: true, pack_credits: newCredits });
  } catch (error) {
    console.error('claim-welcome-pack error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}