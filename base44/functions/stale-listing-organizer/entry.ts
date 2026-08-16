import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { ToolLoopAgent, tool, stepCountIs, hasToolCall } from "npm:ai@7.0.16";
import { createOpenAICompatible } from "npm:@ai-sdk/openai-compatible@3.0.5";
import { z } from "npm:zod@4.4.3";
import { isInternalCall } from "../../shared/internalAuth.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Verify identity when available — internal-only endpoint (workflow-triggered)
    await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    if (!(await isInternalCall(req, body))) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { baseURL, token } = base44.asServiceRole.aiGateway.connection();
    const base44Models = createOpenAICompatible({ name: "base44", baseURL, apiKey: token });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const agent = new ToolLoopAgent({
      model: base44Models("automatic"),
      instructions:
        "You are the PackPulseDrops Collection Organizer running the daily stale-listing review. " +
        "Call listStaleListings once to get active marketplace listings older than 7 days. " +
        "For each one, decide a fair price reduction (5-20% off the current asking price, never below 1 gem): " +
        "rarer cards (Secret Rare, Ghost Rare, 1/1, Diamond, Relic, Auto) get smaller cuts (5-10%); " +
        "commons, base, short print, and refractors can be cut more (10-20%). " +
        "Then call reduceListingAndNotify with the listing id and the new price to apply the cut and email the seller. " +
        "After every stale listing has been handled, call finishReview with the count reduced.",
      tools: {
        listStaleListings: tool({
          description: "Returns all active marketplace listings older than 7 days, with card details and current asking price.",
          inputSchema: z.object({}),
          execute: async () => {
            const listings = await base44.asServiceRole.entities.Listing.filter({ status: "active" });
            return listings
              .filter((l) => l.created_date && l.created_date < sevenDaysAgo)
              .map((l) => ({
                id: l.id,
                card_name: l.card_name,
                category: l.category,
                rarity: l.rarity,
                subset: l.subset,
                ask_price_gems: l.ask_price_gems,
                seller_id: l.seller_id,
                created_date: l.created_date,
              }));
          },
        }),
        reduceListingAndNotify: tool({
          description: "Reduce a listing's asking price to a lower gem amount and email the seller about the reduction.",
          inputSchema: z.object({
            listing_id: z.string(),
            new_price: z.number().int().min(1),
          }),
          execute: async ({ listing_id, new_price }) => {
            const listing = await base44.asServiceRole.entities.Listing.get(listing_id);
            if (!listing) return { error: "Listing not found" };
            const oldPrice = listing.ask_price_gems;
            if (new_price >= oldPrice) return { error: "New price must be lower than the current price" };
            await base44.asServiceRole.entities.Listing.update(listing_id, { ask_price_gems: new_price });
            let notified = false;
            if (listing.seller_id) {
              const seller = await base44.asServiceRole.entities.User.get(listing.seller_id).catch(() => null);
              if (seller && seller.email) {
                await base44.asServiceRole.integrations.Core.SendEmail({
                  to: seller.email,
                  subject: "Your listing price was reduced",
                  body:
                    `Your marketplace listing for "${listing.card_name}" had been active for over 7 days, so its price was reduced from ${oldPrice} to ${new_price} gems to help it sell.\n\n` +
                    `You can view or update it anytime in the PackPulseDrops marketplace.`,
                });
                notified = true;
              }
            }
            return { success: true, listing_id, old_price: oldPrice, new_price, notified };
          },
        }),
        finishReview: tool({
          description: "Call once after every stale listing has been reduced and its seller notified.",
          inputSchema: z.object({ reduced_count: z.number().int() }),
          execute: async ({ reduced_count }) => ({ done: true, reduced_count }),
        }),
      },
      stopWhen: [stepCountIs(40), hasToolCall("finishReview")],
    });

    const { text } = await agent.generate({ prompt: "Run today's stale listing review now." });
    return Response.json({ success: true, summary: text });
  } catch (error) {
    console.error("stale-listing-organizer error", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}