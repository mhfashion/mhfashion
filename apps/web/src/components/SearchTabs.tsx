"use client";

import Link from "next/link";
import { BookOpen, Shapes, Shirt } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { searchHref, type SearchType } from "@/lib/search-caps";

const TABS: { type: SearchType; icon: typeof Shirt }[] = [
  { type: "products", icon: Shirt },
  { type: "guides", icon: BookOpen },
  { type: "designs", icon: Shapes },
];

export default function SearchTabs({ term, type, counts }: { term: string; type: SearchType; counts: Record<SearchType, number> }) {
  const { t } = useI18n();

  return (
    <div role="tablist" aria-label={t("search.tablist")} className="flex flex-wrap gap-1.5 pb-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.type === type;
        return (
          <Link
            key={tab.type}
            href={searchHref(term, tab.type)}
            role="tab"
            aria-selected={active}
            data-search-tab={tab.type}
            data-search-tab-count={counts[tab.type]}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold ${active ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent hover:text-accent"}`}
          >
            <Icon size={14} aria-hidden="true" /> {t(`search.tab.${tab.type}`)} <span className="text-text-muted">{counts[tab.type]}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** A group that answered nothing, saying which group it was. */
export function SearchGroupEmpty({ group, term }: { group: SearchType; term: string }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-8 text-center" data-search-group-empty={group}>
      <p className="text-sm font-black">
        {t("search.groupEmpty").split("{group}").join(t(`search.group.${group.replace(/s$/, "")}`)).split("{term}").join(term)}
      </p>
      <p className="mt-1 text-xs text-text-muted">{t("search.groupEmptyHelp")}</p>
    </div>
  );
}
