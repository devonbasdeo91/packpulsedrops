import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.is_verified) {
      return Response.json({ error: 'Please verify your email address to initiate trades.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { recipient_id, offered_pull_id, requested_pull_id, requested_listing_id } = body;
    if (!offered_pull_id) {
      return Response.json({ error: 'Missing offered card' }, { status: 400 });
    }

    // Two trade modes:
    //  1. Listing trade  — offered_pull_id + requested_listing_id (no friendship needed)
    //  2. Friend trade   — offered_pull_id + requested_pull_id + recipient_id (friendship required)
    const isListingTrade = !!requested_listing_id;

    if (!isListingTrade && (!recipient_id || !requested_pull_id)) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch offered pull — must belong to the requester
    const offeredPull = await base44.asServiceRole.entities.Pull.get(offered_pull_id);
    if (!offeredPull || offeredPull.created_by_id !== user.id) {
      return Response.json({ error: 'You do not own the offered card' }, { status: 403 });
    }

    let resolvedRecipientId: string;
    let resolvedRecipientName: string;
    let requestedCardName: string;
    let requestedCategory: string;
    let requestedRarity: string;
    let requestedValueGems: number;
    let requestedImageUrl: string;

    if (isListingTrade) {
      // --- Listing trade: the recipient is the listing's seller ---
      const listing = await base44.asServiceRole.entities.Listing.get(requested_listing_id);
      if (!listing || listing.status !== 'active') {
        return Response.json({ error: 'This listing is no longer available' }, { status: 400 });
      }
      if (listing.seller_id === user.id) {
        return Response.json({ error: 'Cannot trade for your own listing' }, { status: 400 });
      }
      resolvedRecipientId = listing.seller_id;
      resolvedRecipientName = listing.seller_name || 'Collector';
      requestedCardName = listing.card_name;
      requestedCategory = listing.category;
      requestedRarity = listing.rarity;
      requestedValueGems = listing.value_gems || 0;
      requestedImageUrl = listing.image_url || '';
    } else {
      // --- Friend trade: validate friendship and pull ownership ---
      if (recipient_id === user.id) {
        return Response.json({ error: 'Cannot trade with yourself' }, { status: 400 });
      }

      const friendships = await base44.asServiceRole.entities.Friendship.filter(
        { $or: [{ requester_id: user.id }, { recipient_id: user.id }] },
        '-created_date', 200
      );
      const isFriend = (friendships || []).some(
        (f) => f.status === 'accepted' &&
          ((f.requester_id === user.id && f.recipient_id === recipient_id) ||
           (f.recipient_id === user.id && f.requester_id === recipient_id))
      );
      if (!isFriend) return Response.json({ error: 'Not friends with this user' }, { status: 403 });

      const requestedPull = await base44.asServiceRole.entities.Pull.get(requested_pull_id);
      if (!requestedPull || requestedPull.created_by_id !== recipient_id) {
        return Response.json({ error: 'Recipient does not own the requested card' }, { status: 403 });
      }

      resolvedRecipientId = recipient_id;
      const recipient = await base44.asServiceRole.entities.User.get(recipient_id);
      resolvedRecipientName = recipient?.full_name || 'Collector';
      requestedCardName = requestedPull.card_name;
      requestedCategory = requestedPull.category;
      requestedRarity = requestedPull.rarity;
      requestedValueGems = requestedPull.value_gems || 0;
      requestedImageUrl = requestedPull.image_url || '';
    }

    const requesterName = user.full_name || 'Collector';

    const trade = await base44.entities.Trade.create({
      requester_id: user.id,
      requester_name: requesterName,
      recipient_id: resolvedRecipientId,
      recipient_name: resolvedRecipientName,
      offered_pull_id,
      offered_card_name: offeredPull.card_name,
      offered_category: offeredPull.category,
      offered_rarity: offeredPull.rarity,
      offered_value_gems: offeredPull.value_gems || 0,
      offered_image_url: offeredPull.image_url || '',
      requested_pull_id: isListingTrade ? '' : requested_pull_id,
      requested_listing_id: isListingTrade ? requested_listing_id : '',
      requested_card_name: requestedCardName,
      requested_category: requestedCategory,
      requested_rarity: requestedRarity,
      requested_value_gems: requestedValueGems,
      requested_image_url: requestedImageUrl,
      status: 'pending',
    });

    return Response.json({ trade });
  } catch (error) {
    console.error('create-trade error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}