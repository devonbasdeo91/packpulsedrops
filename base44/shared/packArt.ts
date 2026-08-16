// Shared logic for generating artwork for every card in a pack.
// Used by the generate-pack-art function and the Stripe webhook fulfillment path.

export async function generatePackArt(base44, packId) {
  const cards = await base44.asServiceRole.entities.Card.filter({ pack_id: packId });
  let generated = 0;
  let skipped = 0;
  for (const card of cards) {
    // Skip cards that already have artwork — makes this idempotent when both
    // the Stripe webhook and the Pack Checkout Fulfillment workflow call it.
    if (card.image_url) { skipped++; continue; }
    const prompt = [
      card.name,
      card.category,
      card.rarity,
      card.subset,
      card.description,
      'trading card artwork, vibrant, detailed, premium foil texture',
    ].filter(Boolean).join(', ');
    try {
      const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
      await base44.asServiceRole.entities.Card.update(card.id, { image_url: result.url });
      generated++;
    } catch (e) {
      console.error('generate art failed for card', card.id, e);
    }
  }
  return { generated, skipped, total: cards.length };
}