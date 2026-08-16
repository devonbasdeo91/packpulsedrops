// Pack purchase tiers — fixed USD price points with escalating odds and
// per-tier card value ranges. Mirrored by src/lib/packTiers.js. Keep in sync.
export const GEMS_PER_USD = 0.0035;

// Platform-wide ceiling for any card's buy/sell value.
export const MAX_CARD_USD = 150;

export const PACK_TIERS = {
  silver: {
    label: 'Silver',
    price_usd: 1,
    min_usd: 0.01,
    max_usd: 1.50,
    blurb: 'Cards up to $1.50 · 5% chance of max pull',
    weights: {
      Common: 55, Base: 55, Rare: 25, 'Short Print': 12, 'Super Rare': 12,
      Refractor: 8, 'Ultra Rare': 6, Auto: 3, 'Secret Rare': 2, Relic: 2,
      'Ghost Rare': 1, '1/1': 1, Diamond: 0.5,
    },
  },
  gold: {
    label: 'Gold',
    price_usd: 2.5,
    min_usd: 0.05,
    max_usd: 3.75,
    blurb: 'Cards up to $3.75 · 5% chance of max pull',
    weights: {
      Common: 45, Base: 45, Rare: 28, 'Short Print': 15, 'Super Rare': 16,
      Refractor: 11, 'Ultra Rare': 9, Auto: 4, 'Secret Rare': 3, Relic: 3,
      'Ghost Rare': 1.5, '1/1': 1.2, Diamond: 0.8,
    },
  },
  crystal: {
    label: 'Crystal',
    price_usd: 5,
    min_usd: 0.10,
    max_usd: 7.50,
    blurb: 'Cards up to $7.50 · 5% chance of max pull',
    weights: {
      Common: 35, Base: 35, Rare: 30, 'Short Print': 18, 'Super Rare': 20,
      Refractor: 14, 'Ultra Rare': 12, Auto: 6, 'Secret Rare': 5, Relic: 5,
      'Ghost Rare': 2.5, '1/1': 2, Diamond: 1.5,
    },
  },
  ruby: {
    label: 'Ruby',
    price_usd: 10,
    min_usd: 0.25,
    max_usd: 15,
    blurb: 'Cards up to $15 · 5% chance of max pull',
    weights: {
      Common: 28, Base: 28, Rare: 28, 'Short Print': 19, 'Super Rare': 22,
      Refractor: 17, 'Ultra Rare': 15, Auto: 8, 'Secret Rare': 7, Relic: 7,
      'Ghost Rare': 3.5, '1/1': 3, Diamond: 2,
    },
  },
  sapphire: {
    label: 'Sapphire',
    price_usd: 25,
    min_usd: 0.50,
    max_usd: 37.50,
    blurb: 'Cards up to $37.50 · 5% chance of max pull',
    weights: {
      Common: 20, Base: 20, Rare: 26, 'Short Print': 20, 'Super Rare': 24,
      Refractor: 20, 'Ultra Rare': 18, Auto: 10, 'Secret Rare': 9, Relic: 9,
      'Ghost Rare': 5, '1/1': 4, Diamond: 3,
    },
  },
  emerald: {
    label: 'Emerald',
    price_usd: 50,
    min_usd: 1,
    max_usd: 75,
    blurb: 'Cards up to $75 · 5% chance of max pull',
    weights: {
      Common: 12, Base: 12, Rare: 24, 'Short Print': 20, 'Super Rare': 26,
      Refractor: 22, 'Ultra Rare': 20, Auto: 12, 'Secret Rare': 10, Relic: 10,
      'Ghost Rare': 6, '1/1': 5, Diamond: 4,
    },
  },
  diamond: {
    label: 'Diamond',
    price_usd: 100,
    min_usd: 2.50,
    max_usd: 150,
    blurb: 'Cards up to $150 · 5% chance of max pull',
    weights: {
      Common: 6, Base: 6, Rare: 20, 'Short Print': 18, 'Super Rare': 28,
      Refractor: 24, 'Ultra Rare': 22, Auto: 14, 'Secret Rare': 12, Relic: 12,
      'Ghost Rare': 8, '1/1': 7, Diamond: 6,
    },
  },
};

export function getTier(key) {
  return PACK_TIERS[key] || PACK_TIERS.silver;
}

// Roll a card's USD value for a given tier:
// 5% chance of the tier's max value, otherwise a heavily low-biased value in
// [min, max) (cubed roll) so the house keeps ~95% edge. Capped at MAX_CARD_USD.
export function rollTierValueUsd(tier) {
  const min = tier.min_usd;
  const max = Math.min(tier.max_usd, MAX_CARD_USD);
  if (max <= min) return max;
  if (Math.random() < 0.05) return max;
  const r = Math.random();
  const v = min + (max - min) * r * r * r;
  return Math.min(v, max - 0.01);
}

export function usdToGems(usd) {
  return Math.round(usd / GEMS_PER_USD);
}