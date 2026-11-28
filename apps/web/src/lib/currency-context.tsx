"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Currency = "Ks" | "USD";

// Kept only for figures that carry no USD price of their own (delivery quotes, older rows). Prices
// the owner set in the Price Table are never converted: each variant stores MMK and USD separately.
export const DEFAULT_EXCHANGE_RATE_KS_PER_USD = 4500;

export const formatKsText = (amountKs: number) => `${Math.round(amountKs).toLocaleString("en-US")} Ks`;
export const formatUsdText = (amountUsd: number) => `$${amountUsd.toFixed(2)}`;
export const PRICE_ON_REQUEST = "Price on request";

/**
 * The owner stores both currencies, so the shopper's toggle only chooses which one to read. A
 * missing currency shows the one that exists — it is never computed from the exchange rate.
 */
export function pickPrice(currency: Currency, priceKs: number | null, priceUsd: number | null): string {
  if (currency === "Ks") {
    if (priceKs !== null) return formatKsText(priceKs);
    return priceUsd !== null ? formatUsdText(priceUsd) : PRICE_ON_REQUEST;
  }
  if (priceUsd !== null) return formatUsdText(priceUsd);
  return priceKs !== null ? formatKsText(priceKs) : PRICE_ON_REQUEST;
}

export function pickPriceRange(
  currency: Currency,
  minKs: number | null,
  maxKs: number | null,
  minUsd: number | null,
  maxUsd: number | null,
): string {
  if (currency === "Ks" && minKs !== null && maxKs !== null) {
    return minKs === maxKs ? formatKsText(minKs) : `${formatKsText(minKs)} – ${formatKsText(maxKs)}`;
  }
  if (currency === "USD" && minUsd !== null && maxUsd !== null) {
    return minUsd === maxUsd ? formatUsdText(minUsd) : `${formatUsdText(minUsd)} – ${formatUsdText(maxUsd)}`;
  }
  return pickPrice(currency, minKs, minUsd);
}

const CurrencyContext = createContext<{
  currency: Currency;
  exchangeRate: number;
  toggleCurrency: () => void;
  formatKs: (amountKs: number) => string;
  formatRangeKs: (minKs: number, maxKs: number) => string;
  /** The price the owner stored, in the currency the shopper picked. Never a conversion. */
  formatPrice: (priceKs: number | null, priceUsd: number | null) => string;
  formatRangePrice: (minKs: number | null, maxKs: number | null, minUsd: number | null, maxUsd: number | null) => string;
}>({
  currency: "Ks",
  exchangeRate: DEFAULT_EXCHANGE_RATE_KS_PER_USD,
  toggleCurrency: () => {},
  formatKs: (amountKs) => formatKsText(amountKs),
  formatRangeKs: (min, max) => `${formatKsText(min)} – ${formatKsText(max)}`,
  formatPrice: (priceKs, priceUsd) => pickPrice("Ks", priceKs, priceUsd),
  formatRangePrice: (minKs, maxKs, minUsd, maxUsd) => pickPriceRange("Ks", minKs, maxKs, minUsd, maxUsd),
});

const STORAGE_KEY = "mh-fashion-currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("Ks");
  const exchangeRate = DEFAULT_EXCHANGE_RATE_KS_PER_USD;

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Currency | null;
    if (stored === "Ks" || stored === "USD") setCurrency(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const toggleCurrency = () =>
    setCurrency((c) => (c === "Ks" ? "USD" : "Ks"));

  const toDisplay = (amountKs: number): string => {
    if (currency === "Ks") return formatKsText(amountKs);
    return `$${(amountKs / exchangeRate).toFixed(2)}`;
  };

  const formatKs = (amountKs: number) => toDisplay(amountKs);

  const formatRangeKs = (minKs: number, maxKs: number) => {
    if (minKs === maxKs) return toDisplay(minKs);
    if (currency === "Ks") return `${formatKsText(minKs)} – ${formatKsText(maxKs)}`;
    return `$${(minKs / exchangeRate).toFixed(2)} – $${(maxKs / exchangeRate).toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        exchangeRate,
        toggleCurrency,
        formatKs,
        formatRangeKs,
        formatPrice: (priceKs, priceUsd) => pickPrice(currency, priceKs, priceUsd),
        formatRangePrice: (minKs, maxKs, minUsd, maxUsd) => pickPriceRange(currency, minKs, maxKs, minUsd, maxUsd),
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
