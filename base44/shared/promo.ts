// Shared promo logic — mirrors src/lib/promo.js. Keep in sync.
export const PROMO_END_ISO = "2026-08-16T23:59:59-04:00";
export const PROMO_DISCOUNT = 0.2;

export function isPromoActive() {
  return new Date() < new Date(PROMO_END_ISO);
}

// 20% off the gem cost of a gem-ripped pack during the launch promo.
export function promoGems(gems) {
  return isPromoActive() ? Math.ceil(gems * (1 - PROMO_DISCOUNT)) : gems;
}