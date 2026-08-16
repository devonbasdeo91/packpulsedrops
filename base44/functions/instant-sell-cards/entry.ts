import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    // Deduplicate pull IDs to prevent processing the same card twice in one call.
    const pullIds: string[] = Array.from(new Set(Array.isArray(body.pull_ids) ? body.pull_ids.filter(Boolean) : []));
    if (pullIds.length === 0) return Response.json({ error: 'No cards selected' }, { status: 400 });

    const PLATFORM_FEE = 0.05;
    let totalReceives = 0;
    const sold: { id: string; card_name: string; received_gems: number }[] = [];
    const errors: { id: string; error: string }[] = [];

    // Read fresh balance once from the DB (server is source of truth).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    let currentGems = fresh.gems || 0;
    let newBalance = currentGems;

    for (const pullId of pullIds) {
      try {
        const pull = await base44.asServiceRole.entities.Pull.get(pullId);
        if (!pull) { errors.push({ id: pullId, error: 'Pull not found' }); continue; }

        const isOwner = pull.created_by_id === user.id;
        const isAdmin = user.role === 'admin';
        if (!isOwner && !isAdmin) {
          errors.push({ id: pullId, error: 'You do not own this card' });
          continue;
        }

        // Delete FIRST — atomic lock prevents double-selling. If a
        // concurrent request already deleted it, this throws 404 and
        // we skip crediting gems for this card.
        try {
          await base44.asServiceRole.entities.Pull.delete(pullId);
        } catch (e) {
          errors.push({ id: pullId, error: 'Already sold' });
          continue;
        }

        const cardValue = pull.value_gems || 0;
        const receives = Math.round(cardValue * (1 - PLATFORM_FEE));
        totalReceives += receives;
        currentGems += receives;
        sold.push({ id: pullId, card_name: pull.card_name || 'Unknown', received_gems: receives });
      } catch (e) {
        errors.push({ id: pullId, error: e.message || 'Failed to sell' });
      }
    }

    // Credit the accumulated gems in a single write. Re-read the fresh
    // balance right before writing — the initial read at the top of the
    // loop can be stale if a concurrent deposit (daily reward, marketplace
    // sale, gem purchase) landed between the read and this write, which
    // would overwrite that deposit and lose the user's gems.
    if (totalReceives > 0) {
      const freshBalance = await base44.asServiceRole.entities.User.get(user.id);
      newBalance = (freshBalance.gems || 0) + totalReceives;
      await base44.asServiceRole.entities.User.update(user.id, {
        gems: newBalance,
      });
    } else {
      newBalance = currentGems;
    }

    return Response.json({
      success: true,
      sold_count: sold.length,
      total_received_gems: totalReceives,
      new_balance: newBalance,
      errors,
    });
  } catch (error) {
    console.error('instant-sell-cards error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}