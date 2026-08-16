import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { checkWithdrawalEligibility, PLATFORM_FEE } from "../../shared/withdrawalApproval.ts";

const MAX_PER_REQUEST = 50;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    // Deduplicate listing IDs to prevent arbitrary withdrawal inflation via
    // repeated copies of the same sold listing in a single bulk payout request.
    const ids = Array.from(new Set(Array.isArray(body.listing_ids) ? body.listing_ids.filter(Boolean) : []));
    if (ids.length === 0) return Response.json({ error: 'Select at least one sold listing' }, { status: 400 });
    if (ids.length > MAX_PER_REQUEST) return Response.json({ error: 'Max ' + MAX_PER_REQUEST + ' listings per bulk payout' }, { status: 400 });

    const listings = [];
    for (const id of ids) {
      const l = await base44.asServiceRole.entities.Listing.get(id);
      if (!l) return Response.json({ error: 'Listing not found' }, { status: 400 });
      if (l.seller_id !== user.id) return Response.json({ error: 'You can only pay out your own sales' }, { status: 403 });
      if (l.status !== 'sold') return Response.json({ error: 'Only sold listings can be paid out' }, { status: 400 });
      if (l.withdrawal_request_id) return Response.json({ error: 'A selected sale is already part of a payout' }, { status: 400 });
      listings.push(l);
    }

    const totalGems = listings.reduce((s, l) => s + Math.round(l.ask_price_gems * (1 - PLATFORM_FEE)), 0);
    if (totalGems <= 0) return Response.json({ error: 'Nothing to pay out' }, { status: 400 });

    // Read fresh balance from the DB (server is source of truth — auth.me() can
    // be stale, causing race conditions that overwrite concurrent balance changes).
    const fresh = await base44.asServiceRole.entities.User.get(user.id);
    const elig = await checkWithdrawalEligibility(fresh, totalGems);
    if (!elig.ok) return Response.json({ error: elig.error }, { status: 400 });

    // Re-read the fresh balance right before debiting — narrows the race
    // window where a concurrent gem change between the initial read and
    // this write would be overwritten, losing or duplicating gems.
    const freshDebit = await base44.asServiceRole.entities.User.get(user.id);
    if ((freshDebit.gems || 0) < totalGems) {
      return Response.json({ error: 'Insufficient gems' }, { status: 400 });
    }
    await base44.asServiceRole.entities.User.update(user.id, { gems: (freshDebit.gems || 0) - totalGems });

    // Create a single WithdrawalRequest bundling these sales
    const cardSummary = listings.map((l) => l.card_name).slice(0, 5).join(', ');
    const wr = await base44.entities.WithdrawalRequest.create({
      amount_gems: totalGems,
      amount_usd: elig.usd,
      status: 'pending',
      bank_name: elig.ext ? elig.ext.bank_name : 'Stripe',
      account_last4: elig.ext ? elig.ext.last4 : '',
      routing_last4: '',
      stripe_account_id: elig.accountId,
      description: 'Bulk payout for ' + listings.length + ' sale' + (listings.length > 1 ? 's' : '') + ': ' + cardSummary + (listings.length > 5 ? '…' : ''),
    });

    // Mark each listing as part of this payout so it can't be double-paid
    await base44.asServiceRole.entities.Listing.bulkUpdate(
      listings.map((l) => ({ id: l.id, withdrawal_request_id: wr.id }))
    );

    // Log the bulk withdrawal hold as a transaction (service role — RLS blocks user creates)
    try {
      await base44.asServiceRole.entities.Transaction.create({
        user_id: user.id,
        type: 'withdrawal',
        amount_gems: -totalGems,
        amount_usd: elig.usd,
        description: `Bulk payout for ${listings.length} sale${listings.length > 1 ? 's' : ''}`,
        related_id: wr.id,
      });
    } catch (e) {
      console.error('request-bulk-payout: transaction log failed', e.message);
    }

    return Response.json({
      success: true,
      request_id: wr.id,
      count: listings.length,
      amount_gems: totalGems,
      amount_usd: elig.usd,
      new_balance: (freshDebit.gems || 0) - totalGems,
    });
  } catch (error) {
    console.error('request-bulk-payout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}