"use client";

import { useI18n } from "@/lib/i18n";

/**
 * The header puts a dozen controls before the page content, so a keyboard user would tab through all
 * of them on every navigation. This is the first thing Tab reaches and it jumps the focus to the page
 * heading. The header sits *inside* each page's <main>, so a layout-level anchor would not skip it;
 * every page has exactly one <h1>, which is the first thing worth reading.
 */
export default function SkipToContent() {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      data-skip-to-content
      onClick={(event) => {
        const target = document.querySelector<HTMLElement>("h1") ?? document.getElementById("main-content");
        if (!target) return;
        event.preventDefault();
        target.tabIndex = -1;
        target.focus();
      }}
      className="sr-only rounded-lg bg-accent px-4 py-2 text-xs font-bold text-accent-foreground focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[200]"
    >
      {t("actions.skipToContent")}
    </a>
  );
}
