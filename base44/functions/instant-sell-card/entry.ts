import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const pullId = body.pull_id;
    if (!pullId) return Response.json({ error: 'Missing pull id' }, { status: 400 });

    // Fetch the pull as service role so we can read it regardless of RLS,
    // then verify the caller actually owns it (or is admin / legacy seed).
    let pull;
    try {
      pull = await base44.asServiceRole.entities.Pull.get(pullId);
    } catch (e) {
      return Response.json({ error: 'Pull not found' }, { status: 404 });
    }
    if (!pull) return Response.json({ error: 'Pull not found' }, { status: 404 });
    const isOwner = pull.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'You do not own this card' }, { status: 403 });
    }

    // Instant sell: credit 95% of the card's value to the wallet (5% platform fee).
    const PLATFORM_FEE = 0.05;
    const cardValue = pull.value_gems || 0;
    const receives = Math.round(cardValue * (1 - PLATFORM_FEE));

    // Delete the pull FIRST — this is the atomic "lock" that prevents
    // double-selling. If a concurrent request already deleted it, this
    // throws 404 and we return without crediting gems.
    try {
      await base44.asServiceRole.entities.Pull.delete(pullId);
    } catch (e) {
      return Response.json({ error: 'Card already sold or no longer available' }, { status: 400 });
    }

    // Read fresh balance from the DB (server is source of truth — never trust
    // the potentially-stale value from auth.me, which causes race conditions
    // that overwrite deposits/rewards credited between the read and the write).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    const currentGems = fresh.gems || 0;
    await base44.asServiceRole.entities.User.update(user.id, {
      gems: currentGems + receives,
    });

    // Log the instant sell transaction (service role — RLS blocks user creates)
    try {
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.id,
        type: 'instant_sell',
        amount_gems: receives,
        amount_usd: receives * 0.0035,
        description: `Instant-sold ${pull.card_name} — 95% after fee`,
        related_id: pullId,
      });
    } catch (e) {
      console.error('instant-sell-card: transaction log failed', e.message);
    }

    return Response.json({
      success: true,
      received_gems: receives,
      new_balance: currentGems + receives,
    });
  } catch (error) {
    console.error('instant-sell-card error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}