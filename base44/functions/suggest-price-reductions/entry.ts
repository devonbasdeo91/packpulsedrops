import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';
import { issuePriceReductionToken } from "../../shared/priceReductionToken.ts";
import { GEM_TO_USD, MAX_LISTINGS_PER_RUN, gatherMarketContext, suggestPrices, isValidSuggestion, buildPriceSuggestionEmail } from "../../shared/priceSuggestion.ts";

export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Find active listings with 0 views older than 72 hours.
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const allActive = await base44.asServiceRole.entities.Listing.filter(
      { status: "active", views: 0 }, "created_date", 50
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
      "have had zero views in 72 hours — they're not attracting buyer interest at their current price."
    );

    // 3. Send an email to each seller with the suggestion and an apply button.
    let emailed = 0;
    let gmailToken;
    let senderEmail;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn?.accessToken;
      if (gmailToken) senderEmail = await resolveGmailSender(gmailToken);
    } catch (e) {
      console.error('suggest-price-reductions: Gmail not connected', e.message);
    }

    for (const suggestion of suggestions) {
      const listing = stale.find((l) => l.id === suggestion.listing_id);
      if (!listing) continue;
      const suggestedPrice = suggestion.suggested_price_gems;
      if (!isValidSuggestion(suggestedPrice, listing)) continue;

      const seller = await base44.asServiceRole.entities.User.get(listing.seller_id);
      if (!seller || !seller.email) continue;
      if (!gmailToken || !senderEmail) continue;

      const token = await issuePriceReductionToken(listing.id, suggestedPrice);
      const applyUrl = `${PRODUCTION_DOMAIN}/functions/apply-price-reduction?token=${token}`;

      const html = buildPriceSuggestionEmail(
        listing, suggestedPrice, suggestion.reason, applyUrl, 'Apply Price Reduction',
        'Your listing has been live for 72+ hours without any views. A price adjustment could help it sell faster.'
      );

      try {
        await sendGmail(gmailToken, senderEmail, seller.email, `Price suggestion for your ${listing.card_name} listing`, html);
        emailed++;
      } catch (e) {
        console.error('suggest-price-reductions: email failed for', listing.id, e.message);
      }
    }

    return Response.json({ success: true, checked: stale.length, suggestions: suggestions.length, emailed });
  } catch (error) {
    console.error('suggest-price-reductions error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}