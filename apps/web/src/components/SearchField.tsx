"use client";

import Link from "next/link";
import { useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** The search page's own field: Esc clears it instead of submitting the old term (Plan §17 S7). */
export default function SearchField({ initial }: { initial: string }) {
  const { t } = useI18n();
  const [value, setValue] = useState(initial);

  return (
    <>
      <SearchIcon size={16} className="shrink-0 text-text-secondary" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          setValue("");
        }}
        aria-label={t("search.inputLabel")}
        placeholder={t("search.placeholder")}
        autoFocus
        className="w-full bg-transparent py-1.5 text-xs outline-none placeholder:text-text-faint"
      />
      {value ? (
        <Link href="/search" aria-label={t("search.clear")} className="text-text-muted hover:text-accent">
          <X size={15} />
        </Link>
      ) : null}
      <button type="submit" className="min-h-9 shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-bold text-accent-foreground">
        {t("search.submit")}
      </button>
    </>
  );
}
