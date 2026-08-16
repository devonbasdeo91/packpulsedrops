// Shared card-art resolution: returns a card's artwork URL, generating it on
// demand the first time and caching it on the Card + any referencing Pull/Listing
// so every future view (vault, marketplace, reveal) is instant with no tap.

const CATEGORY_THEME = {
  yugioh: 'Yu-Gi-Oh style monster, dramatic anime art',
  pokemon: 'Pokémon style creature, vibrant anime art',
  dragonball: 'Dragon Ball Z anime fighter, energy aura',
  digimon: 'Digimon digital monster, cyber art',
  basketball: 'basketball player action pose, dynamic sports card art',
  baseball: 'baseball player action pose, dynamic sports card art',
  naruto: 'Naruto anime ninja, jutsu effects',
  bleach: 'Bleach anime soul reaper, spiritual energy',
  football: 'football player action pose, dynamic sports card art',
  soccer: 'soccer player action pose, dynamic sports card art',
  cricket: 'cricket batsman action pose, dynamic sports card art',
  tennis: 'tennis player action pose, dynamic sports card art',
  wnba: 'WNBA basketball player action pose, dynamic sports card art',
  nhl: 'ice hockey player action pose, dynamic sports card art',
  golf: 'golfer mid-swing action pose, dynamic sports card art',
  badminton: 'badminton player mid-smash action pose, dynamic sports card art',
  tabletennis: 'table tennis player mid-loop action pose, dynamic sports card art',
  swimming: 'swimmer mid-stroke action pose, dynamic sports card art',
  trackfield: 'track and field sprinter mid-race action pose, dynamic sports card art',
  f1: 'Formula 1 race car speeding on a grand prix circuit, dramatic motorsport card art',
};

async function cacheOnReferences(base44, url, { card, pullId, listingId }) {
  try {
    if (card?.id) await base44.asServiceRole.entities.Card.update(card.id, { image_url: url });
    if (pullId) await base44.asServiceRole.entities.Pull.update(pullId, { image_url: url });
    if (listingId) await base44.asServiceRole.entities.Listing.update(listingId, { image_url: url });
  } catch (e) {
    console.error('cardArt cache error', e);
  }
}

/**
 * Resolve artwork for a card. Resolution order:
 *   1. A provided card entity that already has image_url.
 *   2. A matching Card (by name + category) that already has cached art.
 *   3. Generate via AI and cache on the Card + references.
 * The resolved URL is also stamped onto pullId/listingId so the vault/market
 * render it instantly next time with no network round-trip.
 */
export async function resolveCardArt(base44, { cardName, category, rarity, card, pullId, listingId }) {
  if (card?.image_url) {
    await cacheOnReferences(base44, card.image_url, { card: null, pullId, listingId });
    return card.image_url;
  }
  if (!card) {
    const cards = await base44.asServiceRole.entities.Card.filter({ name: cardName, category }, '-created_date', 10);
    card = cards && cards.length > 0 ? (cards.find((c) => c.image_url) || cards[0]) : null;
  }
  if (card?.image_url) {
    await cacheOnReferences(base44, card.image_url, { card: null, pullId, listingId });
    return card.image_url;
  }
  const theme = CATEGORY_THEME[category] || 'trading card character art';
  const rar = rarity || card?.rarity || 'Rare';
  const prompt = `Premium digital trading card artwork for "${cardName}", ${theme}, ${rar} rarity foil, dramatic lighting, highly detailed, centered composition, no text, no border, no watermark`;
  try {
    const result = await base44.asServiceRole.integrations.Core.GenerateImage({ prompt });
    if (!result?.url) return '';
    await cacheOnReferences(base44, result.url, { card, pullId, listingId });
    return result.url;
  } catch (e) {
    console.error('cardArt generate error', e);
    return '';
  }
}