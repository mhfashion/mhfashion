"use client";

import { useI18n } from "@/lib/i18n";

/**
 * A translated label inside a server-rendered page. The server cannot know the visitor's language — it is
 * kept in the browser — so the English text is rendered first and the chosen language takes over on mount,
 * exactly as the header's labels do.
 */
export default function T({ k, values }: { k: string; values?: Record<string, string | number> }) {
  const { t } = useI18n();
  let text = t(k);
  for (const [name, value] of Object.entries(values ?? {})) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return <>{text}</>;
}
