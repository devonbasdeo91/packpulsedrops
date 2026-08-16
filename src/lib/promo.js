export const PROMO_END_ISO = "2026-08-16T23:59:59-04:00";
export const PROMO_DISCOUNT = 0.2;

export function isPromoActive() {
  // Launch promo disabled — re-enable once Stripe approval is finalized.
  return false;
}

export function promoPrice(gems) {
  if (!isPromoActive()) return gems;
  return Math.ceil(gems * (1 - PROMO_DISCOUNT));
}

// Discounted USD-equivalent of a gem-ripped pack during the launch promo.
export function promoUsd(usd) {
  if (!isPromoActive()) return usd;
  return usd * (1 - PROMO_DISCOUNT);
}