import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil, secrets } from 'base44:runtime';
import { createNotification } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.is_verified) {
      return Response.json({ error: 'Please verify your email address to accept trades.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { trade_id, action } = body;
    if (!trade_id || !['accept', 'decline'].includes(action)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const trade = await base44.asServiceRole.entities.Trade.get(trade_id);
    if (!trade) return Response.json({ error: 'Trade not found' }, { status: 404 });
    if (trade.recipient_id !== user.id) {
      return Response.json({ error: 'Only the recipient can respond' }, { status: 403 });
    }
    if (trade.status !== 'pending') {
      return Response.json({ error: 'Trade already resolved' }, { status: 400 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    if (action === 'accept') {
      // Verify offered pull still belongs to the requester
      const offeredPull = await base44.asServiceRole.entities.Pull.get(trade.offered_pull_id);
      if (!offeredPull || offeredPull.created_by_id !== trade.requester_id) {
        return Response.json({ error: 'Offered card no longer available' }, { status: 400 });
      }

      // Re-check offered pull still belongs to the requester right before
      // the transfer — narrows the race window where a concurrent trade
      // acceptance or instant-sell could have transferred the pull between
      // the initial check above and this point.
      const currentOffered = await base44.asServiceRole.entities.Pull.get(trade.offered_pull_id);
      if (!currentOffered || currentOffered.created_by_id !== trade.requester_id) {
        return Response.json({ error: 'Offered card was just traded or sold' }, { status: 400 });
      }

      if (trade.requested_listing_id) {
        // --- Listing trade ---
        // The requested card is a marketplace listing, not a pull. Cancel the
        // listing, mint a new pull for the requester, and transfer the offered
        // pull to the seller.
        const listing = await base44.asServiceRole.entities.Listing.get(trade.requested_listing_id);
        if (!listing || listing.status !== 'active') {
          return Response.json({ error: 'Requested listing is no longer available' }, { status: 400 });
        }
        await base44.asServiceRole.entities.Listing.update(trade.requested_listing_id, {
          status: 'traded',
          buyer_id: trade.requester_id,
          buyer_name: trade.requester_name,
          sold_date: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.Pull.create({
          card_name: trade.requested_card_name,
          category: trade.requested_category,
          rarity: trade.requested_rarity,
          value_gems: trade.requested_value_gems || 0,
          image_url: trade.requested_image_url || '',
          pack_name: 'Marketplace trade',
          subset: '',
          description: '',
          created_by_id: trade.requester_id,
        });
        await base44.asServiceRole.entities.Pull.update(trade.offered_pull_id, { created_by_id: trade.recipient_id });
      } else {
        // --- Friend trade: swap pull ownership ---
        const requestedPull = await base44.asServiceRole.entities.Pull.get(trade.requested_pull_id);
        if (!requestedPull || requestedPull.created_by_id !== trade.recipient_id) {
          return Response.json({ error: 'Requested card no longer available' }, { status: 400 });
        }
        await base44.asServiceRole.entities.Pull.update(trade.offered_pull_id, { created_by_id: trade.recipient_id });
        await base44.asServiceRole.entities.Pull.update(trade.requested_pull_id, { created_by_id: trade.requester_id });
      }
    }

    // Log accepted trades as transactions for both parties (service role)
    if (action === 'accept') {
      try {
        await base44.asServiceRole.entities.Transaction.create({
          user_id: trade.requester_id,
          type: 'trade',
          amount_gems: trade.requested_value_gems || 0,
          description: `Trade: sent ${trade.offered_card_name}, received ${trade.requested_card_name}`,
          related_id: trade_id,
          counterparty_name: trade.recipient_name,
        });
        await base44.asServiceRole.entities.Transaction.create({
          user_id: trade.recipient_id,
          type: 'trade',
          amount_gems: trade.offered_value_gems || 0,
          description: `Trade: sent ${trade.requested_card_name}, received ${trade.offered_card_name}`,
          related_id: trade_id,
          counterparty_name: trade.requester_name,
        });
      } catch (e) {
        console.error('respond-to-trade: transaction log failed', e.message);
      }
    }

    // Update trade status (user-scoped: RLS allows recipient to update)
    await base44.entities.Trade.update(trade_id, { status: newStatus });

    // Notify the requester that their trade was accepted or declined.
    const accepted = action === 'accept';
    await createNotification(base44, trade.requester_id, {
      type: accepted ? 'trade_accepted' : 'trade_declined',
      title: accepted ? 'Trade accepted! 🎉' : 'Trade declined',
      message: accepted
        ? `${trade.recipient_name} accepted your trade — ${trade.offered_card_name} for ${trade.requested_card_name}. Check your vault!`
        : `${trade.recipient_name} declined your trade for ${trade.requested_card_name}.`,
      link: '/trades',
      metadata: { trade_id },
    });

    // The "Trade Status Tracker" workflow sends the email notification to the
    // requester via the notify-trade function — no duplicate Gmail send here.

    // Also surface the outcome in the chat thread between the two traders.
    try {
      const cid = [trade.requester_id, trade.recipient_id].sort().join('_');
      await base44.asServiceRole.entities.ChatMessage.create({
        conversation_id: cid,
        sender_id: trade.recipient_id,
        sender_name: trade.recipient_name,
        recipient_id: trade.requester_id,
        content: accepted
          ? `✅ I accepted your trade! ${trade.offered_card_name} for ${trade.requested_card_name} — the cards have been swapped.`
          : `❌ I had to decline your trade for ${trade.requested_card_name}. No worries, we can try again!`,
        read: false,
      });
    } catch (e) {
      console.error('respond-to-trade: chat message failed', e.message);
    }

    // Log accepted trades to the owner's Google Sheet (non-blocking, fails open)
    if (action === 'accept') {
      // Resolve both participants' usernames for the trade log.
      let requesterUsername = '';
      let recipientUsername = user.username || '';
      try {
        const requesterUser = await base44.asServiceRole.entities.User.get(trade.requester_id);
        requesterUsername = requesterUser?.username || '';
      } catch (e) {
        console.error('respond-to-trade: requester username lookup failed', e.message);
      }
      waitUntil(
        base44.functions.invoke('log-trade-to-sheets', {
          internal_secret: secrets.get("Internal_Auth_Secret"),
          trade: {
            id: trade_id,
            requester_name: trade.requester_name,
            recipient_name: trade.recipient_name,
            requester_username: requesterUsername,
            recipient_username: recipientUsername,
            offered_card_name: trade.offered_card_name,
            offered_category: trade.offered_category,
            offered_rarity: trade.offered_rarity,
            offered_value_gems: trade.offered_value_gems,
            requested_card_name: trade.requested_card_name,
            requested_category: trade.requested_category,
            requested_rarity: trade.requested_rarity,
            requested_value_gems: trade.requested_value_gems,
            status: newStatus,
          },
        }).catch((e) => console.error('log-trade-to-sheets invoke failed', e))
      );
    }

    return Response.json({ status: newStatus });
  } catch (error) {
    console.error('respond-to-trade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}