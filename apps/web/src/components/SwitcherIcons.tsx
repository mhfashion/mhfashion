import { Banknote, CircleDollarSign } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export type CurrencyCode = "Ks" | "USD";

/**
 * 14x10 flag glyphs. The header switchers are icon-only, so each state has to look different:
 * a Union-Jack English flag and the Myanmar tricolour, not one generic globe for both.
 */
export function FlagIcon({ locale, className = "" }: { locale: Locale; className?: string }) {
  if (locale === "my") {
    return (
      <svg viewBox="0 0 14 10" width="14" height="10" className={`rounded-[2px] ${className}`} aria-hidden="true">
        <rect width="14" height="3.34" fill="#fecb00" />
        <rect y="3.33" width="14" height="3.34" fill="#34b231" />
        <rect y="6.66" width="14" height="3.34" fill="#ea2833" />
        <polygon
          points="7,1.8 7.76,4.06 10.04,4.13 8.21,5.5 8.86,7.7 7,6.4 5.14,7.7 5.79,5.5 3.96,4.13 6.24,4.06"
          fill="#fff"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 14 10" width="14" height="10" className={`rounded-[2px] ${className}`} aria-hidden="true">
      <rect width="14" height="10" fill="#012169" />
      <path d="M0 0 14 10 M14 0 0 10" stroke="#fff" strokeWidth="2" />
      <path d="M0 0 14 10 M14 0 0 10" stroke="#c8102e" strokeWidth="0.9" />
      <path d="M7 0V10 M0 5H14" stroke="#fff" strokeWidth="3" />
      <path d="M7 0V10 M0 5H14" stroke="#c8102e" strokeWidth="1.6" />
    </svg>
  );
}

/** The currency icon carries the state too: notes for Kyat, a dollar coin for USD. */
export function CurrencyIcon({ currency, size = 15 }: { currency: CurrencyCode; size?: number }) {
  return currency === "Ks" ? <Banknote size={size} aria-hidden="true" /> : <CircleDollarSign size={size} aria-hidden="true" />;
}

export const LANGUAGE_LABEL: Record<Locale, string> = { en: "English", my: "မြန်မာ" };
export const CURRENCY_LABEL: Record<CurrencyCode, string> = { Ks: "Kyat (Ks)", USD: "US dollar ($)" };
