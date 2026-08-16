import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Aggregates a unified transaction history from multiple data sources:
// - Transaction entity → gem deposits (logged going forward via stripe-webhook)
// - Pull entity → pack purchases (each pull from a pack, excluding Marketplace)
// - Listing entity → marketplace purchases, sales, and platform fees
// - Trade entity → accepted P2P trades
// All queries are user-scoped; RLS automatically filters to the caller's data.

const GEM_TO_USD = 0.0035;
const PLATFORM_FEE = 0.05;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    const transactions = [];

    // 1. Gem deposits + instant sells + withdrawals (Transaction entity — RLS
    // filters to user_id === user.id). Marketplace purchase/sale transactions
    // are reconstructed from Listing entities below, so they're excluded here
    // to avoid duplicates.
    const txRecords = await base44.entities.Transaction.filter(
      { type: { $in: ['gem_deposit', 'instant_sell', 'withdrawal'] } }, '-created_date', 200
    );
    for (const d of txRecords || []) {
      transactions.push({
        id: d.id,
        type: d.type,
        description: d.description || d.type,
        amount_gems: d.amount_gems || 0,
        amount_usd: d.amount_usd || 0,
        date: d.created_date,
        counterparty_name: d.counterparty_name,
      });
    }

    // 2. Pack purchases (Pull entity — RLS filters to created_by_id === user.id)
    const pulls = await base44.entities.Pull.filter({}, '-created_date', 500);
    for (const p of pulls || []) {
      if (p.pack_name === 'Marketplace') continue; // marketplace purchases tracked via Listings
      transactions.push({
        id: `pull_${p.id}`,
        type: 'pack_purchase',
        description: `${p.pack_name || 'Pack'} — ${p.card_name}`,
        amount_gems: p.value_gems || 0,
        amount_usd: (p.value_gems || 0) * GEM_TO_USD,
        date: p.created_date,
      });
    }

    // 3. Marketplace purchases (Listing entity — read is public, filter by buyer_id)
    const bought = await base44.entities.Listing.filter(
      { buyer_id: userId, status: 'sold' }, '-sold_date', 500
    );
    for (const l of bought || []) {
      transactions.push({
        id: `buy_${l.id}`,
        type: 'marketplace_purchase',
        description: `Bought ${l.card_name}`,
        amount_gems: -(l.ask_price_gems || 0),
        amount_usd: -(l.ask_price_gems || 0) * GEM_TO_USD,
        date: l.sold_date || l.updated_date || l.created_date,
        counterparty_name: l.seller_name,
      });
    }

    // 4. Marketplace sales + fees (Listing entity — filter by seller_id)
    const sold = await base44.entities.Listing.filter(
      { seller_id: userId, status: 'sold' }, '-sold_date', 500
    );
    for (const l of sold || []) {
      const fee = Math.round((l.ask_price_gems || 0) * PLATFORM_FEE);
      const receives = (l.ask_price_gems || 0) - fee;
      const date = l.sold_date || l.updated_date || l.created_date;
      transactions.push({
        id: `sale_${l.id}`,
        type: 'marketplace_sale',
        description: `Sold ${l.card_name}`,
        amount_gems: receives,
        amount_usd: receives * GEM_TO_USD,
        date,
        counterparty_name: l.buyer_name,
      });
      if (fee > 0) {
        transactions.push({
          id: `fee_${l.id}`,
          type: 'marketplace_fee',
          description: `Platform fee (5%) — ${l.card_name}`,
          amount_gems: -fee,
          amount_usd: -(fee * GEM_TO_USD),
          date,
        });
      }
    }

    // 5. P2P trades (Trade entity — RLS filters to user's trades)
    const trades = await base44.entities.Trade.filter(
      { status: 'accepted' }, '-created_date', 200
    );
    for (const t of trades || []) {
      const isRequester = t.requester_id === userId;
      const gave = isRequester ? t.offered_card_name : t.requested_card_name;
      const got = isRequester ? t.requested_card_name : t.offered_card_name;
      transactions.push({
        id: `trade_${t.id}`,
        type: 'trade',
        description: `Traded ${gave} for ${got}`,
        amount_gems: 0,
        amount_usd: 0,
        date: t.created_date,
        counterparty_name: isRequester ? t.recipient_name : t.requester_name,
      });
    }

    // Sort all by date descending
    transactions.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    return Response.json({ transactions });
  } catch (error) {
    console.error('get-transactions error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}