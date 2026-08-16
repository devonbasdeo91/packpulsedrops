import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Delivers cards bought directly with cash to the buyer's vault. Runs in the
// user's own session so each Pull is attributed to them (created_by_id = buyer),
// then clears the pending list. Called from the Collection page on load.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Read fresh state from the DB (server is source of truth — auth.me() can
    // be stale, and using it for redemption causes double-redemption races).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    const pending = Array.isArray(fresh.purchased_cards) ? [...fresh.purchased_cards] : [];
    if (pending.length === 0) return Response.json({ count: 0, cards: [] });
    // Clear the pending list FIRST — this is the atomic "lock" that prevents
    // double-redemption. If a concurrent call already cleared it, the fresh
    // read above would have returned an empty array.
    await base44.asServiceRole.entities.User.update(user.id, { purchased_cards: [] });
    const redeemed = [];
    for (const cardId of pending) {
      const card = await base44.asServiceRole.entities.Card.get(cardId).catch(() => null);
      if (!card) continue;
      await base44.entities.Pull.create({
        card_name: card.name,
        category: card.category,
        rarity: card.rarity,
        value_gems: card.value_gems || 0,
        pack_name: 'Direct Purchase',
        subset: card.subset || '',
      });
      redeemed.push(card.name);
    }
    return Response.json({ count: redeemed.length, cards: redeemed });
  } catch (error) {
    console.error('redeem-purchased-cards error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}