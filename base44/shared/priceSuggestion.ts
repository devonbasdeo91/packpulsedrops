import { esc } from "./gmailSend.ts";

export const GEM_TO_USD = 0.0035;
export const MAX_LISTINGS_PER_RUN = 50;

export const RARITY_PRICING_REFERENCE = `Reference gem values by rarity:
- Common/Base: ~50, Rare: ~100, Short Print: ~130, Super Rare: ~200, Refractor: ~250
- Ultra Rare: ~400, Auto: ~600, Secret Rare: ~800, Relic: ~800
- Ghost Rare: ~1500, 1/1: ~3000, Diamond: ~5000`;

/**
 * Gathers comparable active listings by category + rarity to give the LLM
 * current market pricing context.
 */
export async function gatherMarketContext(base44, listings) {
  const contextKeys = new Set(listings.map((l) => `${l.category}|${l.rarity}`));
  const marketContext = [];
  for (const key of contextKeys) {
    const [category, rarity] = key.split("|");
    const similar = await base44.asServiceRole.entities.Listing.filter(
      { status: "active", category, rarity }, "ask_price_gems", 15
    );
    if (similar && similar.length > 0) {
      marketContext.push({
        category,
        rarity,
        comparable_prices_gems: similar.map((s) => ({
          card_name: s.card_name,
          ask_price_gems: s.ask_price_gems,
          value_gems: s.value_gems || 0,
        })),
      });
    }
  }
  return marketContext;
}

/**
 * Calls the LLM to suggest reduced prices for stale listings based on
 * market trends and the platform's rarity pricing reference.
 * Returns an array of { listing_id, suggested_price_gems, reason }.
 */
export async function suggestPrices(base44, listings, marketContext, contextDescription) {
  const listingData = listings.map((l) => ({
    listing_id: l.id,
    card_name: l.card_name,
    category: l.category,
    rarity: l.rarity,
    current_ask_price_gems: l.ask_price_gems,
    card_value_gems: l.value_gems || 0,
    created_date: l.created_date,
  }));

  const prompt = `You are a trading card marketplace pricing assistant for PackPulseDrops. Your job is to suggest reduced prices for marketplace listings that ${contextDescription}

${RARITY_PRICING_REFERENCE}

Current market context (similar active listings):
${JSON.stringify(marketContext, null, 2)}

Listings needing price suggestions:
${JSON.stringify(listingData, null, 2)}

For each listing, suggest a new ask price in gems that:
1. Is below the current ask price (a reduction to attract buyers)
2. Is aligned with comparable active listings' prices
3. Is NOT below the card's base value (card_value_gems)
4. Is a reasonable round number

Return a JSON object with a "suggestions" array. Each suggestion must have:
- listing_id (string): the listing ID
- suggested_price_gems (integer): the new ask price in gems
- reason (string): a brief, buyer-friendly explanation for the reduction`;

  const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              listing_id: { type: "string" },
              suggested_price_gems: { type: "integer" },
              reason: { type: "string" },
            },
            required: ["listing_id", "suggested_price_gems"],
          },
        },
      },
      required: ["suggestions"],
    },
  });

  return Array.isArray(llmRes.suggestions) ? llmRes.suggestions : [];
}

/**
 * Validates a price suggestion: must be a positive number, below the current
 * ask price, and not below the card's base value.
 */
export function isValidSuggestion(suggestedPrice, listing) {
  if (typeof suggestedPrice !== "number" || suggestedPrice <= 0) return false;
  if (suggestedPrice >= (listing.ask_price_gems || 0)) return false;
  if (suggestedPrice < (listing.value_gems || 0)) return false;
  return true;
}

/**
 * Builds the HTML email body for a price suggestion email.
 * `actionUrl` is the button link (either an in-app page or a backend endpoint).
 * `actionLabel` is the button text.
 * `introText` is the opening paragraph.
 */
export function buildPriceSuggestionEmail(listing, suggestedPrice, reason, actionUrl, actionLabel, introText) {
  const currentUsd = ((listing.ask_price_gems || 0) * GEM_TO_USD).toFixed(2);
  const suggestedUsd = (suggestedPrice * GEM_TO_USD).toFixed(2);
  const reductionGems = (listing.ask_price_gems || 0) - suggestedPrice;
  const reductionUsd = (reductionGems * GEM_TO_USD).toFixed(2);

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  <h2 style="margin:0 0 8px">📉 Time to adjust your listing?</h2>
  <p style="color:#6b7280;margin:0 0 16px">${esc(introText)}</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Card</td><td style="text-align:right;font-weight:bold">${esc(listing.card_name)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Category / Rarity</td><td style="text-align:right">${esc(listing.category)} / ${esc(listing.rarity)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Current price</td><td style="text-align:right;font-weight:bold">$${currentUsd} <span style="color:#9ca3af;font-weight:normal">(${listing.ask_price_gems} gems)</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Suggested price</td><td style="text-align:right;font-weight:bold;color:#b45309">$${suggestedUsd} <span style="color:#9ca3af;font-weight:normal">(${suggestedPrice} gems)</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Savings</td><td style="text-align:right;color:#059669">-$${reductionUsd} (${reductionGems} gems off)</td></tr>
  </table>
  <p style="color:#6b7280;margin:0 0 16px"><strong>Why?</strong> ${esc(reason || 'Based on current market trends for similar listings.')}</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${esc(actionUrl)}" style="background:linear-gradient(to right,#fbbf24,#f97316);color:#000;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px">${esc(actionLabel)}</a>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin:0">This is just a suggestion — your listing will stay at its current price until you take action. The link expires in 7 days.</p>
</div>`;
}