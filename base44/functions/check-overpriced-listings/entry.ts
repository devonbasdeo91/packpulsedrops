import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isInternalCall } from "../../shared/internalAuth.ts";
import { esc, sendGmail, resolveGmailSender } from '../../shared/gmailSend.ts';

const GEM_TO_USD = 0.0035;
const OVERPRICE_THRESHOLD = 1.20; // 20% above market average = "significantly higher"
const MIN_COMPARABLES = 3; // need at least 3 similar listings to establish a market average
const DAY_MS = 86400000;
const RE_NOTIFY_DAYS = 14; // re-notify the same seller only after 14 days

export default async function(req) {
  const PRODUCTION_DOMAIN = new URL(req.url).origin;
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Fetch all active listings.
    const listings = await base44.asServiceRole.entities.Listing.filter(
      { status: "active" }, "-created_date", 500
    );

    // 2. Group by category + rarity to compute market averages per segment.
    const groups = {};
    for (const l of listings || []) {
      const key = `${l.category}|${l.rarity}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(l);
    }

    // 3. Find listings priced significantly above their segment average.
    const overpriced = [];
    for (const [key, groupListings] of Object.entries(groups)) {
      if (groupListings.length < MIN_COMPARABLES) continue;
      const sum = groupListings.reduce((s, l) => s + (l.ask_price_gems || 0), 0);
      const count = groupListings.length;

      for (const l of groupListings) {
        // Average excluding the listing being evaluated (so its own price
        // doesn't skew the benchmark).
        const avg = (sum - (l.ask_price_gems || 0)) / (count - 1);
        if (avg <= 0) continue;
        if ((l.ask_price_gems || 0) > avg * OVERPRICE_THRESHOLD) {
          overpriced.push({ listing: l, avgPrice: Math.round(avg), comparables: count - 1 });
        }
      }
    }

    if (overpriced.length === 0) {
      return Response.json({ success: true, checked: (listings || []).length, emailed: 0 });
    }

    // 4. Resolve the Gmail connection (failures are logged, not fatal).
    let gmailToken;
    let senderEmail;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('gmail');
      gmailToken = conn?.accessToken;
      if (gmailToken) senderEmail = await resolveGmailSender(gmailToken);
    } catch (e) {
      console.error('check-overpriced-listings: Gmail not connected', e.message);
    }

    // 5. Email each seller (skipping those notified within the last 14 days).
    let emailed = 0;
    for (const { listing: l, avgPrice, comparables } of overpriced) {
      const lastNotified = l.overpriced_notified_date ? new Date(l.overpriced_notified_date).getTime() : 0;
      if (lastNotified && Date.now() - lastNotified < RE_NOTIFY_DAYS * DAY_MS) continue;

      if (!gmailToken || !senderEmail) continue;

      const seller = await base44.asServiceRole.entities.User.get(l.seller_id);
      if (!seller || !seller.email) continue;

      const currentGems = l.ask_price_gems || 0;
      const currentUsd = (currentGems * GEM_TO_USD).toFixed(2);
      const avgUsd = (avgPrice * GEM_TO_USD).toFixed(2);
      const pctAbove = Math.round(((currentGems - avgPrice) / avgPrice) * 100);

      const subject = `Your "${l.card_name}" listing is priced ${pctAbove}% above the market average`;
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1f2937">
  <h2 style="margin:0 0 8px">📊 Your listing is priced above the current market average</h2>
  <p style="color:#6b7280;margin:0 0 16px">We noticed your listing is priced significantly higher than similar cards currently on the marketplace. Adjusting your price could help it sell faster.</p>
  <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Card</td><td style="text-align:right;font-weight:bold">${esc(l.card_name)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Category / Rarity</td><td style="text-align:right">${esc(l.category)} / ${esc(l.rarity)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Your asking price</td><td style="text-align:right;font-weight:bold">$${currentUsd} <span style="color:#9ca3af;font-weight:normal">(${currentGems} gems)</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">Market average (${comparables} similar listings)</td><td style="text-align:right;font-weight:bold;color:#059669">$${avgUsd} <span style="color:#9ca3af;font-weight:normal">(${avgPrice} gems)</span></td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#6b7280">You're priced</td><td style="text-align:right;font-weight:bold;color:#dc2626">${pctAbove}% above average</td></tr>
  </table>
  <p style="color:#6b7280;margin:0 0 16px">Listings priced closer to the market average tend to sell faster. Consider reducing your price to attract more buyers.</p>
  <div style="text-align:center;margin:24px 0">
    <a href="${PRODUCTION_DOMAIN}/marketplace" style="background:linear-gradient(to right,#fbbf24,#f97316);color:#000;padding:14px 32px;border-radius:9999px;text-decoration:none;font-weight:bold;display:inline-block;font-size:16px">Manage Your Listing</a>
  </div>
  <p style="color:#9ca3af;font-size:12px;margin:0">This is an automated suggestion based on current marketplace data. You'll only receive this notice once every 14 days per listing.</p>
</div>`;

      try {
        await sendGmail(gmailToken, senderEmail, seller.email, subject, html);
        await base44.asServiceRole.entities.Listing.update(l.id, {
          overpriced_notified_date: new Date().toISOString(),
        });
        emailed++;
      } catch (e) {
        console.error('check-overpriced-listings: email failed for', l.id, e.message);
      }
    }

    return Response.json({ success: true, checked: (listings || []).length, overpriced: overpriced.length, emailed });
  } catch (error) {
    console.error('check-overpriced-listings error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}