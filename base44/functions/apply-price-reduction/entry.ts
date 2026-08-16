import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { verifyPriceReductionToken } from "../../shared/priceReductionToken.ts";

const GEM_TO_USD = 0.0035;

function htmlPage(title, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;background:#0a0a0a;color:#fafafa;margin:0;padding:40px 20px;text-align:center}
  .card{max-width:480px;margin:0 auto;background:#18181b;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px}
  h1{font-size:22px;margin:0 0 12px}
  p{color:#a1a1aa;font-size:15px;line-height:1.5;margin:8px 0}
  .price{font-size:28px;font-weight:bold;color:#fbbf24;margin:16px 0}
  .btn{display:inline-block;margin:24px 0 0;padding:12px 28px;border-radius:9999px;background:linear-gradient(to right,#fbbf24,#f97316);color:#000;text-decoration:none;font-weight:bold}
  .err{color:#f87171}
</style></head>
<body><div class="card">${bodyHtml}</div></body></html>`;
}

/**
 * Public endpoint linked from price-reduction emails. Verifies the signed
 * token from the query string, applies the suggested price to the listing,
 * and returns an HTML success/error page (so the email button works as a
 * simple link click — no login or frontend page required).
 */
export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — public endpoint (token-authenticated via email link)
    await base44.auth.me().catch(() => null);
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(htmlPage('Invalid Link', '<h1>Invalid Link</h1><p class="err">No token was provided in the link.</p>'), { headers: { 'Content-Type': 'text/html' } });
    }

    const verified = await verifyPriceReductionToken(token);
    if (!verified.valid) {
      return new Response(htmlPage('Link Expired', `<h1>Link Expired or Invalid</h1><p class="err">${verified.reason || 'The link is no longer valid.'}</p><p>Price reduction links expire after 7 days. If you still want to adjust your price, you can do so from the marketplace.</p><a class="btn" href="${PRODUCTION_DOMAIN}/marketplace">Go to Marketplace</a>`), { headers: { 'Content-Type': 'text/html' } });
    }

    const listing = await base44.asServiceRole.entities.Listing.get(verified.listing_id);
    if (!listing) {
      return new Response(htmlPage('Not Found', `<h1>Listing Not Found</h1><p class="err">This listing no longer exists.</p><a class="btn" href="${PRODUCTION_DOMAIN}/marketplace">Go to Marketplace</a>`), { headers: { 'Content-Type': 'text/html' } });
    }
    if (listing.status !== 'active') {
      return new Response(htmlPage('Already Resolved', `<h1>Listing No Longer Active</h1><p>This listing has been ${esc(listing.status)} — no price change is needed.</p><a class="btn" href="${PRODUCTION_DOMAIN}/marketplace">Go to Marketplace</a>`), { headers: { 'Content-Type': 'text/html' } });
    }

    const oldPrice = listing.ask_price_gems || 0;
    const newPrice = verified.suggested_price;

    // Apply the price reduction.
    await base44.asServiceRole.entities.Listing.update(verified.listing_id, {
      ask_price_gems: newPrice,
    });

    const oldUsd = (oldPrice * GEM_TO_USD).toFixed(2);
    const newUsd = (newPrice * GEM_TO_USD).toFixed(2);

    return new Response(htmlPage('Price Updated!', `
      <h1>✅ Price Updated!</h1>
      <p>Your listing for <strong>${esc(listing.card_name)}</strong> has been repriced.</p>
      <div class="price">$${newUsd}</div>
      <p><span style="color:#a1a1aa;text-decoration:line-through">$${oldUsd}</span> → <span style="color:#fbbf24;font-weight:bold">$${newUsd}</span> (${newPrice} gems)</p>
      <a class="btn" href="${PRODUCTION_DOMAIN}/marketplace">View on Marketplace</a>
    `), { headers: { 'Content-Type': 'text/html' } });
  } catch (error) {
    console.error('apply-price-reduction error', error);
    return new Response(htmlPage('Error', `<h1>Something Went Wrong</h1><p class="err">${esc(error.message)}</p><a class="btn" href="${PRODUCTION_DOMAIN}/marketplace">Go to Marketplace</a>`), { headers: { 'Content-Type': 'text/html' } });
  }
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}