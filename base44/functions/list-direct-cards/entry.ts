import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { MAX_CARD_USD, GEMS_PER_USD } from "../../shared/packTiers.ts";

// Returns the full direct-purchase catalog (up to 5000 cards) sorted by gem
// value ascending. Only the fields the market grid needs are returned to keep
// the payload small (5000 cards ≈ 600KB vs 2.6MB full objects). Card values are
// capped at the platform-wide $125 ceiling.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Public catalog endpoint — auth is optional (guests can browse the
    // marketplace). Attempt auth so the access context is logged, but
    // don't require it since the Card entity has public read access.
    try { await base44.auth.me(); } catch {}
    const all = await base44.asServiceRole.entities.Card.filter({}, 'value_gems', 5000);
    const capGems = Math.round(MAX_CARD_USD / GEMS_PER_USD);
    const cards = all.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      rarity: c.rarity,
      value_gems: Math.min(c.value_gems || 0, capGems),
      subset: c.subset || '',
      image_url: c.image_url || '',
      pack_id: c.pack_id || '',
    }));
    return Response.json({ count: cards.length, cards });
  } catch (error) {
    console.error('list-direct-cards error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}