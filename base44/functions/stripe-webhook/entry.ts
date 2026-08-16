import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getStripeClient, getStripeWebhookSecret } from '../../shared/stripeConfig.ts';
import { generatePackArt } from "../../shared/packArt.ts";
import { finalizePack } from "../../shared/packFinalize.ts";
import { createNotification } from "../../shared/notifications.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — webhook is authenticated by Stripe signature
    await base44.auth.me().catch(() => null);
    const stripe = getStripeClient();
    const signature = req.headers.get('stripe-signature');
    const rawBody = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      getStripeWebhookSecret()
    );
    console.log('stripe-webhook: received event', event.type, event.id);
    // Idempotency: Stripe retries events on timeout — skip if already processed
    const alreadyProcessed = await base44.asServiceRole.entities.StripeEvent.filter({ event_id: event.id });
    if (alreadyProcessed && alreadyProcessed.length > 0) {
      console.log('stripe-webhook: duplicate event, skipping', event.id);
      return Response.json({ received: true, duplicate: true });
    }
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.user_id;
      const type = session.metadata && session.metadata.type;
      const packId = session.metadata && session.metadata.pack_id;
      console.log('stripe-webhook: checkout session', { userId, type, packId, payment_status: session.payment_status });
      if (userId && type === 'pack') {
        const user = await base44.asServiceRole.entities.User.get(userId);
        const purchased = Array.isArray(user.purchased_packs) ? [...user.purchased_packs] : [];
        // Store the pack credit with the purchased tier so open-pack uses the
        // correct value range on redemption (prevents tier escalation).
        const packTier = (session.metadata && session.metadata.tier) || 'silver';
        purchased.push(packId + '|' + packTier);
        await base44.asServiceRole.entities.User.update(userId, {
          purchased_packs: purchased,
        });
        console.log('stripe-webhook: granted pack-specific credit for', packId, 'to', userId);
        if (packId) {
          try {
            await generatePackArt(base44, packId);
            await finalizePack(base44, packId, userId);
            console.log('stripe-webhook: pack fulfilled', packId);
          } catch (e) {
            console.error('stripe-webhook: pack fulfillment failed', packId, e);
          }
        }
      } else if (userId && type === 'listing') {
        const meta = session.metadata;
        const listingId = meta.listing_id;
        const sellerId = meta.seller_id;
        if (listingId && sellerId) {
          // Check listing is still active — prevents duplicate fulfillment if
          // a gem purchase (purchase-listing) completed while this cash checkout
          // was in progress. Without this, both buyers receive the card.
          const existingListing = await base44.asServiceRole.entities.Listing.get(listingId).catch(() => null);
          if (!existingListing || existingListing.status !== 'active') {
            // The listing was traded/sold/cancelled while this cash checkout was
            // in progress. The buyer paid real money but won't receive the card
            // — refund the Stripe payment so the buyer isn't charged for nothing.
            console.log('stripe-webhook: listing no longer active, refunding cash buyer', listingId);
            try {
              if (session.payment_intent) {
                await stripe.refunds.create({
                  payment_intent: session.payment_intent,
                  metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), reason: 'listing_unavailable', listing_id: listingId },
                });
                console.log('stripe-webhook: refunded buyer for unavailable listing', listingId);
              }
            } catch (refundErr) {
              console.error('stripe-webhook: refund failed for listing', listingId, refundErr.message);
            }
            try {
              await createNotification(base44, userId, {
                type: 'info',
                title: 'Purchase refunded',
                message: `${meta.card_name} was no longer available. Your payment has been refunded.`,
                link: '/wallet',
              });
            } catch (e) { console.error('stripe-webhook: refund notification failed', e.message); }
          } else {
          // Re-check listing is still active right before marking sold —
          // narrows the race window with a concurrent gem purchase
          // (purchase-listing) that could complete between the initial
          // active check above and this update. Without this, both buyers
          // receive the card.
          const currentListing2 = await base44.asServiceRole.entities.Listing.get(listingId).catch(() => null);
          if (!currentListing2 || currentListing2.status !== 'active') {
            console.log('stripe-webhook: listing no longer active on re-check, refunding cash buyer', listingId);
            try {
              if (session.payment_intent) {
                await stripe.refunds.create({
                  payment_intent: session.payment_intent,
                  metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), reason: 'listing_unavailable', listing_id: listingId },
                });
              }
            } catch (refundErr) {
              console.error('stripe-webhook: refund failed on re-check for listing', listingId, refundErr.message);
            }
            try {
              await createNotification(base44, userId, {
                type: 'info',
                title: 'Purchase refunded',
                message: `${meta.card_name} was no longer available. Your payment has been refunded.`,
                link: '/wallet',
              });
            } catch (e) { console.error('stripe-webhook: refund notification failed', e.message); }
          } else {
          const buyerUser = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
          // Mark the listing sold to this cash buyer
          await base44.asServiceRole.entities.Listing.update(listingId, {
            status: 'sold',
            buyer_id: userId,
            buyer_name: buyerUser?.full_name || 'Collector',
            sold_date: new Date().toISOString(),
          });
          // Grant the card to the buyer's collection (service role — no user token in webhook)
          await base44.asServiceRole.entities.Pull.create({
            created_by_id: userId,
            card_name: meta.card_name,
            category: meta.category,
            rarity: meta.rarity,
            value_gems: parseInt(meta.value_gems || '0', 10),
            pack_name: 'Marketplace',
            subset: meta.subset || '',
          });
          // Credit the seller's wallet: 95% of ask price in gems
          const PLATFORM_FEE = 0.05;
          const askGems = parseInt(meta.ask_price_gems || '0', 10);
          const sellerReceives = Math.round(askGems * (1 - PLATFORM_FEE));
          const seller = await base44.asServiceRole.entities.User.get(sellerId).catch(() => null);
          if (seller) {
            // Re-read fresh balance right before crediting — narrows the race
            // window where a concurrent gem change between the read and this
            // write would be overwritten, losing or duplicating gems.
            const freshSeller = await base44.asServiceRole.entities.User.get(sellerId);
            await base44.asServiceRole.entities.User.update(sellerId, {
              gems: (freshSeller.gems || 0) + sellerReceives,
            });
          }
          // Log transactions for both parties
          try {
            await base44.asServiceRole.entities.Transaction.create({
              user_id: userId,
              type: 'marketplace_purchase',
              amount_gems: askGems,
              amount_usd: askGems * 0.0035,
              description: `Bought ${meta.card_name} (cash)`,
              related_id: listingId,
              counterparty_name: seller?.full_name || 'Seller',
            });
            await base44.asServiceRole.entities.Transaction.create({
              user_id: sellerId,
              type: 'marketplace_sale',
              amount_gems: sellerReceives,
              amount_usd: sellerReceives * 0.0035,
              description: `Sold ${meta.card_name} (cash) — 95% after fee`,
              related_id: listingId,
              counterparty_name: buyerUser?.full_name || 'Buyer',
            });
          } catch (e) {
            console.error('stripe-webhook: listing transaction log failed', e.message);
          }
          // Notify the seller in-app
          await createNotification(base44, sellerId, {
            type: 'info',
            title: 'Your card sold!',
            message: `${meta.card_name} sold for cash. ${sellerReceives} gems added to your wallet (after 5% fee).`,
            link: '/wallet',
          });
          console.log('stripe-webhook: listing purchased via cash', listingId, 'buyer', userId, 'seller', sellerId);
          }
          }
        }
      } else if (userId && type === 'card') {
        const meta = session.metadata;
        const cardId = meta.card_id;
        const u = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
        if (cardId && u) {
          const arr = Array.isArray(u.purchased_cards) ? [...u.purchased_cards] : [];
          arr.push(cardId);
          await base44.asServiceRole.entities.User.update(userId, { purchased_cards: arr });
          console.log('stripe-webhook: granted direct card', cardId, 'to', userId);
        }
        try {
          await base44.asServiceRole.entities.PullFeedEvent.create({
            card_name: meta.card_name,
            category: meta.category,
            rarity: meta.rarity,
            pack_name: 'Direct Purchase',
            value_gems: parseInt(meta.value_gems || '0', 10),
            puller_name: u?.full_name || u?.email || 'a collector',
          });
        } catch (e) {
          console.error('stripe-webhook: card feed event failed', e);
        }
      } else if (userId) {
        const gems = parseInt((session.metadata && session.metadata.gems) || '0', 10);
        if (gems > 0) {
          // Re-read fresh balance right before crediting — narrows the race
          // window where a concurrent gem change between the read and this
          // write would be overwritten, losing or duplicating gems.
          const freshUser = await base44.asServiceRole.entities.User.get(userId);
          const newBalance = (freshUser.gems || 0) + gems;
          await base44.asServiceRole.entities.User.update(userId, { gems: newBalance });
          console.log('stripe-webhook: credited', gems, 'gems to', userId, '(new balance', newBalance + ')');
          try {
            await base44.asServiceRole.entities.Transaction.create({
              user_id: userId,
              type: 'gem_deposit',
              amount_gems: gems,
              amount_usd: gems * 0.0035,
              description: `Purchased ${gems.toLocaleString()} gems`,
            });
          } catch (e) {
            console.error('stripe-webhook: transaction log failed', e.message);
          }
        } else {
          console.log('stripe-webhook: no gems in metadata, skipping');
        }
      } else {
        // Guest checkout — no user_id. Store by email for later claiming
        // when the user creates an account (claim-guest-purchases function).
        const email = (session.customer_details?.email || session.customer_email || '').toLowerCase().trim();
        if (!email) {
          console.log('stripe-webhook: guest purchase has no email, skipping');
        } else {
          const meta = session.metadata || {};
          const purchaseType = type || (meta.gems ? 'gems' : 'unknown');
          const purchaseData = {
            email,
            type: purchaseType,
            stripe_session_id: session.id,
            status: 'pending',
          };
          if (type === 'pack') {
            purchaseData.pack_id = meta.pack_id || '';
            purchaseData.tier = meta.tier || 'silver';
          } else if (type === 'card') {
            purchaseData.card_id = meta.card_id || '';
            purchaseData.card_name = meta.card_name || '';
            purchaseData.category = meta.category || '';
            purchaseData.rarity = meta.rarity || '';
            purchaseData.value_gems = parseInt(meta.value_gems || '0', 10);
            purchaseData.subset = meta.subset || '';
          } else {
            purchaseData.gems = parseInt(meta.gems || '0', 10);
          }
          try {
            await base44.asServiceRole.entities.GuestPurchase.create(purchaseData);
            console.log('stripe-webhook: stored guest purchase for', email, 'type', purchaseType);
          } catch (e) {
            console.error('stripe-webhook: failed to store guest purchase', e.message);
          }
        }
      }
    } else if (event.type === 'payment_intent.succeeded') {
      // Apple Pay / Payment Request Button flow for gem purchases.
      // Pack, card, and listing purchases still use Checkout Sessions
      // (checkout.session.completed above).
      const pi = event.data.object;
      const type = pi.metadata && pi.metadata.type;
      if (type === 'gems') {
        const userId = pi.metadata && pi.metadata.user_id;
        const gems = parseInt((pi.metadata && pi.metadata.gems) || '0', 10);
        if (gems > 0) {
          if (userId) {
            // Logged-in user — credit gems directly
            const user = await base44.asServiceRole.entities.User.get(userId).catch(() => null);
            if (user) {
              // Re-read fresh balance right before crediting — narrows the race window.
              const freshUser = await base44.asServiceRole.entities.User.get(userId);
              await base44.asServiceRole.entities.User.update(userId, {
                gems: (freshUser.gems || 0) + gems,
              });
              try {
                await base44.asServiceRole.entities.Transaction.create({
                  user_id: userId,
                  type: 'gem_deposit',
                  amount_gems: gems,
                  amount_usd: gems * 0.0035,
                  description: `Purchased ${gems.toLocaleString()} gems (Apple Pay)`,
                });
              } catch (e) {
                console.error('stripe-webhook: apple pay transaction log failed', e.message);
              }
              console.log('stripe-webhook: credited', gems, 'gems to', userId, 'via payment_intent');
            }
          } else {
            // Guest purchase — store by email for later claiming
            let email = (pi.charges && pi.charges.data && pi.charges.data[0] && pi.charges.data[0].billing_details && pi.charges.data[0].billing_details.email || '').toLowerCase().trim();
            if (!email && pi.latest_charge) {
              try {
                const charge = await stripe.charges.retrieve(pi.latest_charge);
                email = (charge.billing_details && charge.billing_details.email || '').toLowerCase().trim();
              } catch (e) {
                console.error('stripe-webhook: charge retrieve for email failed', e.message);
              }
            }
            if (email) {
              try {
                await base44.asServiceRole.entities.GuestPurchase.create({
                  email,
                  type: 'gems',
                  gems,
                  stripe_session_id: pi.id,
                  status: 'pending',
                });
                console.log('stripe-webhook: stored guest Apple Pay gem purchase for', email);
              } catch (e) {
                console.error('stripe-webhook: guest apple pay purchase failed', e.message);
              }
            } else {
              console.log('stripe-webhook: guest Apple Pay gem purchase has no email, skipping');
            }
          }
        }
      }
    }
    await base44.asServiceRole.entities.StripeEvent.create({
      event_id: event.id,
      event_type: event.type,
    });
    console.log('stripe-webhook: recorded event', event.id);
    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook: error', error.message);
    return Response.json({ error: error.message }, { status: 400 });
  }
}