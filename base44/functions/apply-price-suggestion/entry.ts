import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyPriceReductionToken } from "../../shared/priceReductionToken.ts";
import { createNotification } from "../../shared/notifications.ts";

const GEM_TO_USD = 0.0035;

/**
 * In-app price suggestion endpoint. Called from the PriceReview page.
 *
 * Two modes:
 *  - Verify mode (no `apply` flag): verifies the token and returns the
 *    listing details + suggested price so the page can render the suggestion.
 *  - Apply mode (`apply: true`): verifies the token, confirms the caller
 *    owns the listing, applies the new price (either the caller's custom
 *    `price` or the suggested price from the token), and creates an
 *    in-app notification telling the seller the change is live.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, apply, price } = body;

    if (!token) return Response.json({ error: 'Token required' }, { status: 400 });

    const verified = await verifyPriceReductionToken(token);
    if (!verified.valid) return Response.json({ error: verified.reason || 'Invalid token' }, { status: 400 });

    const listing = await base44.asServiceRole.entities.Listing.get(verified.listing_id).catch(() => null);
    if (!listing) return Response.json({ error: 'Listing not found' }, { status: 404 });

    // Verify mode — return details for the page to render.
    if (!apply) {
      return Response.json({
        valid: true,
        listing: {
          id: listing.id,
          card_name: listing.card_name,
          category: listing.category,
          rarity: listing.rarity,
          current_price_gems: listing.ask_price_gems,
          current_price_usd: ((listing.ask_price_gems || 0) * GEM_TO_USD).toFixed(2),
          card_value_gems: listing.value_gems || 0,
          status: listing.status,
          image_url: listing.image_url,
        },
        suggested_price_gems: verified.suggested_price,
        suggested_price_usd: ((verified.suggested_price || 0) * GEM_TO_USD).toFixed(2),
      });
    }

    // Apply mode — must be authenticated and own the listing.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Login required to apply a price change' }, { status: 401 });
    if (listing.seller_id !== user.id) return Response.json({ error: 'You do not own this listing' }, { status: 403 });
    if (listing.status !== 'active') return Response.json({ error: 'Listing is no longer active' }, { status: 400 });

    // Use the custom price if provided and valid, otherwise the suggested price.
    let newPrice = typeof price === 'number' && price > 0 ? price : verified.suggested_price;
    if (typeof newPrice !== 'number' || newPrice <= 0) return Response.json({ error: 'Invalid price' }, { status: 400 });
    // Don't allow raising the price above the current ask.
    if (newPrice >= (listing.ask_price_gems || 0)) return Response.json({ error: 'New price must be lower than current price' }, { status: 400 });
    // Don't allow pricing below the card's base value.
    if (newPrice < (listing.value_gems || 0)) return Response.json({ error: 'Price cannot be below the card\'s base value' }, { status: 400 });

    const oldPrice = listing.ask_price_gems || 0;
    await base44.asServiceRole.entities.Listing.update(listing.id, { ask_price_gems: newPrice });

    // Notify the seller that the change is live.
    try {
      await createNotification(base44, user.id, {
        type: 'info',
        title: 'Listing Price Updated',
        message: `Your listing "${listing.card_name}" price was updated from ${oldPrice} to ${newPrice} gems. The new price is now live on the marketplace.`,
        link: '/marketplace',
        metadata: { listing_id: listing.id, old_price: oldPrice, new_price: newPrice },
      });
    } catch (e) {
      console.error('apply-price-suggestion: notification failed', e.message);
    }

    return Response.json({
      success: true,
      listing_id: listing.id,
      old_price_gems: oldPrice,
      new_price_gems: newPrice,
      new_price_usd: (newPrice * GEM_TO_USD).toFixed(2),
    });
  } catch (error) {
    console.error('apply-price-suggestion error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}