import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const listingId = body.listing_id;
    if (!listingId) return Response.json({ error: 'Missing listing id' }, { status: 400 });
    const listing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!listing || listing.status !== 'active') {
      return Response.json({ error: 'Listing no longer available' }, { status: 400 });
    }
    if (listing.seller_id === user.id) {
      return Response.json({ error: 'You cannot buy your own listing' }, { status: 400 });
    }
    // Re-check listing status right before debiting — narrows the race window
    // for two buyers purchasing the same listing concurrently. The initial
    // status check at the top can pass for both, but this re-check catches a
    // concurrent purchase that completed between the first check and now.
    const currentListing = await base44.asServiceRole.entities.Listing.get(listingId);
    if (!currentListing || currentListing.status !== 'active') {
      return Response.json({ error: 'Listing was just purchased by someone else' }, { status: 400 });
    }
    // Read fresh buyer balance from the DB (server is source of truth — never
    // trust the potentially-stale value from auth.me, which causes race
    // conditions that overwrite deposits/rewards credited between read and write).
    const freshBuyer = await base44.asServiceRole.entities.User.get(user.id);
    const buyerGems = freshBuyer.gems || 0;
    if (buyerGems < listing.ask_price_gems) {
      return Response.json({ error: 'Not enough gems' }, { status: 400 });
    }
    // Mark listing sold IMMEDIATELY — narrows the race window for concurrent
    // buyers. After this update, the status re-check above will fail for any
    // concurrent buyer who hasn't yet reached this point.
    await base44.asServiceRole.entities.Listing.update(listingId, {
      status: 'sold',
      buyer_id: user.id,
      buyer_name: user.full_name || (user.email ? user.email.split('@')[0] : 'Collector'),
      sold_date: new Date().toISOString(),
    });
    // Debit buyer, credit seller minus a 5% platform fee
    const PLATFORM_FEE = 0.05;
    const sellerReceives = Math.round(listing.ask_price_gems * (1 - PLATFORM_FEE));
    // Re-read the fresh buyer balance right before debiting — narrows the
    // race window where a concurrent gem change between the initial read
    // and this write would be overwritten, losing or duplicating gems.
    const freshBuyerDebit = await base44.asServiceRole.entities.User.get(user.id);
    const debitedGems = (freshBuyerDebit.gems || 0) - listing.ask_price_gems;
    await base44.asServiceRole.entities.User.update(user.id, { gems: debitedGems });
    // Re-read the seller's fresh balance right before crediting — the initial
    // read could be stale if a concurrent gem change (another sale, daily
    // reward, pack purchase) landed between that read and this write, which
    // would overwrite that change and lose the seller's gems.
    const freshSeller = await base44.asServiceRole.entities.User.get(listing.seller_id);
    await base44.asServiceRole.entities.User.update(listing.seller_id, {
      gems: (freshSeller.gems || 0) + sellerReceives,
    });
    // Add card to buyer's collection (user-scoped -> created_by_id = buyer)
    await base44.entities.Pull.create({
      card_name: listing.card_name,
      category: listing.category,
      rarity: listing.rarity,
      value_gems: listing.value_gems,
      pack_name: 'Marketplace',
      subset: listing.subset,
    });
    // Log transactions for both parties (service role — RLS blocks user creates)
    try {
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.id,
        type: 'marketplace_purchase',
        amount_gems: listing.ask_price_gems,
        amount_usd: listing.ask_price_gems * 0.0035,
        description: `Bought ${listing.card_name} (gems)`,
        related_id: listingId,
        counterparty_name: seller?.full_name || 'Seller',
      });
      await base44.asServiceRole.entities.Transaction.create({
        user_id: listing.seller_id,
        type: 'marketplace_sale',
        amount_gems: sellerReceives,
        amount_usd: sellerReceives * 0.0035,
        description: `Sold ${listing.card_name} (gems) — 95% after fee`,
        related_id: listingId,
        counterparty_name: user.full_name || 'Buyer',
      });
    } catch (e) {
      console.error('purchase-listing: transaction log failed', e.message);
    }
    return Response.json({ success: true, new_balance: debitedGems, fee_gems: listing.ask_price_gems - sellerReceives, seller_receives: sellerReceives });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}