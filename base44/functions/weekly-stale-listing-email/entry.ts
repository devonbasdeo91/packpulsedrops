import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';
import { issuePriceReductionToken } from "../../shared/priceReductionToken.ts";
import {
  GEM_TO_USD,
  MAX_LISTINGS_PER_RUN,
  gatherMarketContext,
  suggestPrices,
  isValidSuggestion,
  buildPriceSuggestionEmail,
} from "../../shared/priceSuggestion.ts";

/**
 * Weekly stale-listing emailer (workflow-triggered, internal-only).
 *
 * Finds active marketplace listings older than 7 days, generates an AI price
 * suggestion for each, and emails the seller asking if they'd like to lower
 * their price. The email links to the in-app Price Review page
 * (/price-review?token=...) where the seller can accept the suggestion or
 * set a custom price. Applying the change there updates the listing and
 * sends the seller an in-app notification — that flow already exists in
 * apply-price-suggestion.
 */
export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
  try {
    const base44 = createClientFromRequest(req);
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Find active listings older than 7 days (oldest first).
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const allActive = await base44.asServiceRole.entities.Listing.filter(
      { status: "active" }, "created_date", 100
    );
    const stale = (allActive || [])
      .filter((l) => l.created_date && l.created_date < cutoff)
      .slice(0, MAX_LISTINGS_PER_RUN);

    if (stale.length === 0) {
      return Response.json({ success: true, checked: 0, emailed: 0 });
    }

    // 2. Gather market context + LLM price suggestions.
    const marketContext = await gatherMarketContext(base44, stale);
    const suggestions = await suggestPrices(
      base44, stale, marketContext,
      "have been active for over 7 days without selling — a price adjustment could help them sell faster."
    );

    // 3. Resolve Gmail sender for HTML emails (falls back to SendEmail plain text).
    let gmailToken;
    let senderEmail;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn?.accessToken;
      if (gmailToken) senderEmail = await resolveGmailSender(gmailToken);
    } catch (e) {
      console.error('weekly-stale-listing-email: Gmail not connected', e.message);
    }

    // 4. Email each seller with a link to the in-app Price Review page.
    let emailed = 0;
    let skipped = 0;
    for (const suggestion of suggestions) {
      const listing = stale.find((l) => l.id === suggestion.listing_id);
      if (!listing) continue;
      const suggestedPrice = suggestion.suggested_price_gems;
      if (!isValidSuggestion(suggestedPrice, listing)) { skipped++; continue; }

      const seller = await base44.asServiceRole.entities.User.get(listing.seller_id).catch(() => null);
      if (!seller || !seller.email) { skipped++; continue; }

      const token = await issuePriceReductionToken(listing.id, suggestedPrice);
      const reviewUrl = `${PRODUCTION_DOMAIN}/price-review?token=${token}`;
      const introText = `Your listing for "${listing.card_name}" has been active for over 7 days. Would you like to lower the price to help it sell faster?`;
      const subject = `Time to adjust your ${listing.card_name} listing?`;

      try {
        if (gmailToken && senderEmail) {
          // Rich HTML email via Gmail connector.
          const html = buildPriceSuggestionEmail(
            listing, suggestedPrice, suggestion.reason, reviewUrl, 'Review Price in App', introText
          );
          await sendGmail(gmailToken, senderEmail, seller.email, subject, html);
        } else {
          // Plain-text fallback via SendEmail (reaches registered app users).
          const currentUsd = ((listing.ask_price_gems || 0) * GEM_TO_USD).toFixed(2);
          const suggestedUsd = (suggestedPrice * GEM_TO_USD).toFixed(2);
          const plainText = `${introText}

Current price: ${listing.ask_price_gems} gems ($${currentUsd})
Suggested price: ${suggestedPrice} gems ($${suggestedUsd})

Why? ${suggestion.reason || 'Based on current market trends for similar listings.'}

Review and choose a new price in the app:
${reviewUrl}

This is just a suggestion — your listing will stay at its current price until you take action. The link expires in 7 days.`;
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: seller.email,
            subject,
            body: plainText,
          });
        }
        emailed++;
      } catch (e) {
        console.error('weekly-stale-listing-email: email failed for', listing.id, e.message);
        skipped++;
      }
    }

    return Response.json({
      success: true,
      checked: stale.length,
      suggestions: suggestions.length,
      emailed,
      skipped,
    });
  } catch (error) {
    console.error('weekly-stale-listing-email error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}