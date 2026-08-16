import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveCardArt } from '../../shared/cardArt.ts';

// Admin-only: generates and stamps artwork onto Card records that are missing
// it, so every card in the inventory displays art across the shop, marketplace,
// and pack contents — not only after a pull. Batched (default 10, max 25 per
// call) to stay within time/credit limits; call repeatedly until remaining = 0.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 25);
    const category = (body.category || '').toString().trim();

    const query = category ? { category } : {};
    const cards = await base44.asServiceRole.entities.Card.filter(query, 'created_date', 300);
    const allMissing = (cards || []).filter((c) => !c.image_url);
    const batch = allMissing.slice(0, limit);

    let synced = 0;
    for (const c of batch) {
      try {
        const url = await resolveCardArt(base44, { cardName: c.name, category: c.category, rarity: c.rarity, card: c });
        if (url) synced++;
      } catch (e) {
        console.error('sync-card-art card error', c.id, e);
      }
    }
    const remaining = Math.max(0, allMissing.length - synced);
    return Response.json({ synced, processed: batch.length, remaining });
  } catch (error) {
    console.error('sync-card-art error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}