import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';
import { issuePriceReductionToken } from "../../shared/priceReductionToken.ts";
import { createNotification } from "../../shared/notifications.ts";
import { GEM_TO_USD, MAX_LISTINGS_PER_RUN, gatherMarketContext, suggestPrices, isValidSuggestion, buildPriceSuggestionEmail } from "../../shared/priceSuggestion.ts";

export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Find all active listings older than 7 days.
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const allActive = await base44.asServiceRole.entities.Listing.filter(
      { status: "active" }, "created_date", 200
    );
    const stale = (allActive || [])
      .filter((l) => l.created_date && l.created_date < cutoff)
      .slice(0, MAX_LISTINGS_PER_RUN);

    if (stale.length === 0) {
      return Response.json({ success: true, checked: 0, emailed: 0 });
    }

    // 2. Gather market context + LLM suggestions.
    const marketContext = await gatherMarketContext(base44, stale);
    const suggestions = await suggestPrices(
      base44, stale, marketContext,
      "have been active for over 7 days — they may be priced too high to attract buyers."
    );

    // 3. Send email + in-app notification to each seller.
    let emailed = 0;
    let notified = 0;
    let gmailToken;
    let senderEmail;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn?.accessToken;
      if (gmailToken) senderEmail = await resolveGmailSender(gmailToken);
    } catch (e) {
      console.error('weekly-price-review: Gmail not connected', e.message);
    }

    for (const suggestion of suggestions) {
      const listing = stale.find((l) => l.id === suggestion.listing_id);
      if (!listing) continue;
      const suggestedPrice = suggestion.suggested_price_gems;
      if (!isValidSuggestion(suggestedPrice, listing)) continue;

      const seller = await base44.asServiceRole.entities.User.get(listing.seller_id).catch(() => null);
      if (!seller) continue;

      const token = await issuePriceReductionToken(listing.id, suggestedPrice);
      const reviewUrl = `${PRODUCTION_DOMAIN}/price-review?token=${token}`;

      // Create in-app notification so the seller sees it even without email.
      try {
        await createNotification(base44, seller.id, {
          type: 'info',
          title: 'Price Suggestion for Your Listing',
          message: `Your listing "${listing.card_name}" has been active for 7+ days. We suggest lowering the price from ${listing.ask_price_gems} to ${suggestedPrice} gems. Tap to review and apply.`,
          link: `/price-review?token=${token}`,
          metadata: { listing_id: listing.id, suggested_price: suggestedPrice, token },
        });
        notified++;
      } catch (e) {
        console.error('weekly-price-review: notification failed for', listing.id, e.message);
      }

      if (!seller.email || !gmailToken || !senderEmail) continue;

      const html = buildPriceSuggestionEmail(
        listing, suggestedPrice, suggestion.reason, reviewUrl, 'Review in App',
        'Your listing has been live for over 7 days. A price adjustment could help it sell faster.'
      );

      try {
        await sendGmail(gmailToken, senderEmail, seller.email, `Price suggestion for your ${listing.card_name} listing`, html);
        emailed++;
      } catch (e) {
        console.error('weekly-price-review: email failed for', listing.id, e.message);
      }
    }

    return Response.json({ success: true, checked: stale.length, suggestions: suggestions.length, emailed, notified });
  } catch (error) {
    console.error('weekly-price-review error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}