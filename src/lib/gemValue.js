// Single source of truth for gem -> USD conversion across the app.
export const GEMS_PER_USD = 0.0035;

export const formatUsd = (gems) =>
  `$${((Number(gems) || 0) * GEMS_PER_USD).toFixed(2)}`;