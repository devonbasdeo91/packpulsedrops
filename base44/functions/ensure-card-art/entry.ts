import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveCardArt } from '../../shared/cardArt.ts';

// Generates card artwork on demand the first time a card with no image is
// viewed, then caches it on the Card + referencing Pull/Listing so every
// future view is instant. Logic lives in shared/cardArt.ts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const cardName = (body.card_name || '').toString().trim();
    const category = (body.category || '').toString().trim();
    const rarity = (body.rarity || '').toString().trim();
    const pullId = (body.pull_id || '').toString().trim();
    const listingId = (body.listing_id || '').toString().trim();
    if (!cardName || !category) return Response.json({ error: 'card_name and category required' }, { status: 400 });

    const url = await resolveCardArt(base44, { cardName, category, rarity, pullId, listingId });
    return Response.json({ image_url: url });
  } catch (error) {
    console.error('ensure-card-art error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}