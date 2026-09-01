export function formatPriceKs(amountKs: number): string {
  return `${amountKs.toLocaleString("en-US")} Ks`;
}

export function formatPriceRange(minKs: number, maxKs: number): string {
  if (minKs === maxKs) return formatPriceKs(minKs);
  return `${minKs.toLocaleString("en-US")} – ${maxKs.toLocaleString("en-US")} Ks`;
}

// Ks -> USD, using the admin-set fixed exchange rate (platform_settings.exchange_rate_ks_per_usd).
export function ksToUsd(amountKs: number, exchangeRate: number): string {
  const usd = amountKs / exchangeRate;
  return `$${usd.toFixed(2)}`;
}
