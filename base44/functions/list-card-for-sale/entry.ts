import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const pullId = body.pull_id;
    const askPrice = parseInt(body.ask_price_gems, 10);
    if (!pullId) return Response.json({ error: 'Missing pull id' }, { status: 400 });
    if (!askPrice || askPrice < 1) return Response.json({ error: 'Invalid price' }, { status: 400 });

    // Fetch the pull as service role so we can read it regardless of RLS,
    // then verify the caller actually owns it (or is admin / legacy seed).
    let pull;
    try {
      pull = await base44.asServiceRole.entities.Pull.get(pullId);
    } catch (e) {
      return Response.json({ error: 'Pull not found' }, { status: 404 });
    }
    if (!pull) return Response.json({ error: 'Pull not found' }, { status: 404 });
    // A card can only be sold for ≤ its value — never above the purchase value.
    if (askPrice > (pull.value_gems || 0)) {
      return Response.json({ error: 'Sell price cannot exceed the card value' }, { status: 400 });
    }
    const isOwner = pull.created_by_id === user.id;
    const isAdmin = user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'You do not own this card' }, { status: 403 });
    }

    // Delete the pull FIRST — atomic lock prevents double-listing. If a
    // concurrent request already deleted it (sold/listed), this throws 404.
    try {
      await base44.asServiceRole.entities.Pull.delete(pullId);
    } catch (e) {
      return Response.json({ error: 'Card already sold or no longer available' }, { status: 400 });
    }

    // Create the listing as the user so created_by_id is set correctly (RLS).
    await base44.entities.Listing.create({
      card_name: pull.card_name,
      category: pull.category,
      rarity: pull.rarity,
      subset: pull.subset || '',
      value_gems: pull.value_gems || 0,
      ask_price_gems: askPrice,
      seller_id: user.id,
      seller_name: user.full_name || 'Collector',
      status: 'active',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('list-card-for-sale error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}