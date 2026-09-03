"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Currency = "Ks" | "USD";

// Admin-set fixed exchange rate (platform_settings.exchange_rate_ks_per_usd
// once that table/UI exists). Hardcoded default for now.
export const DEFAULT_EXCHANGE_RATE_KS_PER_USD = 4500;

const CurrencyContext = createContext<{
  currency: Currency;
  exchangeRate: number;
  toggleCurrency: () => void;
  formatKs: (amountKs: number) => string;
  formatRangeKs: (minKs: number, maxKs: number) => string;
}>({
  currency: "Ks",
  exchangeRate: DEFAULT_EXCHANGE_RATE_KS_PER_USD,
  toggleCurrency: () => {},
  formatKs: (amountKs) => `${amountKs.toLocaleString("en-US")} Ks`,
  formatRangeKs: (min, max) => `${min.toLocaleString("en-US")} – ${max.toLocaleString("en-US")} Ks`,
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
    if (currency === "Ks") return `${amountKs.toLocaleString("en-US")} Ks`;
    return `$${(amountKs / exchangeRate).toFixed(2)}`;
  };

  const formatKs = (amountKs: number) => toDisplay(amountKs);

  const formatRangeKs = (minKs: number, maxKs: number) => {
    if (minKs === maxKs) return toDisplay(minKs);
    if (currency === "Ks") {
      return `${minKs.toLocaleString("en-US")} – ${maxKs.toLocaleString("en-US")} Ks`;
    }
    return `$${(minKs / exchangeRate).toFixed(2)} – $${(maxKs / exchangeRate).toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, exchangeRate, toggleCurrency, formatKs, formatRangeKs }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
