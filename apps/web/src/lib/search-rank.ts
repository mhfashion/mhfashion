// Plan §17 S2: matching and ranking. A record ranks by how well its name answers the query — the exact name
// first, then a name that starts with the query, then a name that contains it, then a match somewhere else
// (Myanmar name, tags, aliases, type). Ties break by popularity, then by name, so the same query always
// answers in the same order.
import { matchesSearchQuery, normalizeSearchText, searchWords } from "./search-text";

export type SearchRankable = {
  /** The name the ranking looks at first. */
  name: string;
  /** Everything else that may match: the Myanmar name, tags, aliases, type, slug. */
  text?: string;
  /** Ties break by this, highest first; a shop can pass a sales count or `isNew ? 1 : 0`. */
  popularity?: number;
};

export const SEARCH_RANK_EXACT = 0;
export const SEARCH_RANK_PREFIX = 1;
export const SEARCH_RANK_NAME = 2;
export const SEARCH_RANK_OTHER = 3;
/** A row the trigram search offered that no rank rule claims (a typo match). It answers last. */
export const SEARCH_RANK_APPROXIMATE = 4;

/**
 * How well `item` answers `query`, or `null` when it does not answer it at all. Every query word must
 * appear (the same rule `matchesSearchQuery` applies), so a two-word query ranks on the whole query.
 */
export function searchRankOf(item: SearchRankable, query: string): number | null {
  if (!matchesSearchQuery(`${item.name} ${item.text ?? ""}`, query)) return null;
  const needle = normalizeSearchText(query);
  if (!needle) return SEARCH_RANK_EXACT;
  const name = normalizeSearchText(item.name);
  if (name === needle) return SEARCH_RANK_EXACT;
  if (name.startsWith(needle)) return SEARCH_RANK_PREFIX;
  if (name.includes(needle)) return SEARCH_RANK_NAME;
  // A Myanmar query has no spaces, so a multi-word name is ranked on its first word too.
  const firstWord = searchWords(name)[0] ?? "";
  if (needle && firstWord.startsWith(needle)) return SEARCH_RANK_PREFIX;
  return SEARCH_RANK_OTHER;
}

/**
 * The items that answer `query`, best first, cut to `limit`. `keepUnmatched` keeps rows that no rank rule
 * claims — the typo search returns those, and dropping them would throw the answer away.
 */
export function rankSearchResults<T extends SearchRankable>(
  items: T[],
  query: string,
  limit = items.length,
  options: { keepUnmatched?: boolean } = {}
): T[] {
  const ranked: { item: T; rank: number; order: number }[] = [];
  items.forEach((item, order) => {
    const rank = searchRankOf(item, query);
    if (rank !== null) ranked.push({ item, rank, order });
    else if (options.keepUnmatched) ranked.push({ item, rank: SEARCH_RANK_APPROXIMATE, order });
  });
  ranked.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    const popularity = (b.item.popularity ?? 0) - (a.item.popularity ?? 0);
    if (popularity !== 0) return popularity;
    const byName = normalizeSearchText(a.item.name).localeCompare(normalizeSearchText(b.item.name));
    if (byName !== 0) return byName;
    return a.order - b.order;
  });
  return ranked.slice(0, Math.max(0, limit)).map((entry) => entry.item);
}
