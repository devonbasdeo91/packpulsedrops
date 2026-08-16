import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns the last 5 accepted P2P trades for the public homepage feed.
// Trade RLS only lets participants read their own trades, so this runs under
// the service role to surface a platform-wide activity feed.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — public feed endpoint, guests allowed
    await base44.auth.me().catch(() => null);
    const trades = await base44.asServiceRole.entities.Trade.filter(
      { status: 'accepted' },
      '-created_date',
      5
    );
    const feed = (trades || []).map((t) => ({
      id: t.id,
      requester_name: 'Collector',
      recipient_name: 'Collector',
      offered_card_name: t.offered_card_name,
      offered_category: t.offered_category,
      offered_rarity: t.offered_rarity,
      offered_value_gems: t.offered_value_gems,
      requested_card_name: t.requested_card_name,
      requested_category: t.requested_category,
      requested_rarity: t.requested_rarity,
      requested_value_gems: t.requested_value_gems,
      created_date: t.created_date,
    }));
    return Response.json({ trades: feed });
  } catch (error) {
    console.error('get-recent-trades error', error);
    return Response.json({ trades: [] });
  }
}