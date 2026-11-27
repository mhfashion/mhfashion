"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { normalizeSearchQuery } from "@/lib/search-text";

type Suggestion = { kind: "product" | "guide" | "design"; title: string; subtitle: string; href: string };

/** Plan §17 S6: suggestions appear after a 200 ms pause, at most five, and the count is announced. */
export const SUGGESTION_PAUSE_MS = 200;
const MIN_TERM = 2;

export default function HeaderSearchSuggestions({ query, onPick }: { query: string; onPick: () => void }) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const term = normalizeSearchQuery(query).slice(0, 60);

  useEffect(() => {
    if (term.length < MIN_TERM) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`suggest failed: ${response.status}`);
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setItems(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 5) : []);
      } catch {
        // An aborted request is the normal case: the next keystroke cancelled it.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SUGGESTION_PAUSE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  if (term.length < MIN_TERM) return null;

  return (
    <div
      data-header-suggestions
      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-border bg-bg-surface text-left shadow-xl"
    >
      <p aria-live="polite" className="sr-only">
        {loading ? "Searching" : `${items.length} suggestion${items.length === 1 ? "" : "s"}`}
      </p>
      {items.length ? (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={`${item.kind}-${item.href}-${item.title}`}>
              <Link
                href={item.href}
                onClick={onPick}
                data-header-suggestion={item.kind}
                className="flex items-center gap-2 px-3 py-2 text-[11px] hover:bg-bg"
              >
                <Search size={12} className="shrink-0 text-text-muted" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-bold">{item.title}</span>
                  <span className="block truncate text-[9px] text-text-muted">{item.kind} · {item.subtitle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2 text-[11px] text-text-muted">{loading ? "Searching…" : `Nothing matched “${term}” yet`}</p>
      )}
      <Link href={`/search?q=${encodeURIComponent(term)}`} onClick={onPick} className="block border-t border-border/60 px-3 py-2 text-[10px] font-bold text-accent">
        See every result
      </Link>
    </div>
  );
}

/** Focus and blur handling for a field that owns a suggestion panel. */
export function useSuggestionsFocus() {
  const [focused, setFocused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFocus = () => {
    if (timer.current) clearTimeout(timer.current);
    setFocused(true);
  };
  // A press on a suggestion blurs the field before the click lands, so the panel waits a moment.
  const onBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFocused(false), 150);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return { focused, onFocus, onBlur, close: () => setFocused(false) };
}
