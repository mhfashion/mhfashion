// Plan §12.2.9: an R2 event names the object that changed, and the Worker's `queue` handler rebuilds only
// that kind. The rules live here as data so the event rules in the dashboard, the queue handler and the
// tests all agree on which prefix belongs to which catalogue, and none of them overlap.
import type { AssetCatalogueKind } from "./asset-catalogue";

export type AssetSourceRule = { prefix: string; kind: AssetCatalogueKind };

/** One rule per source prefix, and no prefix is a prefix of another. */
export const ASSET_SOURCE_RULES: readonly AssetSourceRule[] = [
  { prefix: "fonts/", kind: "fonts" },
  { prefix: "designs/", kind: "designs" },
  { prefix: "elements/", kind: "elements" },
  { prefix: "brushes/", kind: "brushes" },
  { prefix: "text-styles/", kind: "text-styles" },
  { prefix: "mockups/", kind: "mockups" },
] as const;

/** Which catalogue a changed key belongs to. `null` means no catalogue reads it (an order, an upload). */
export function kindForAssetKey(key: string): AssetCatalogueKind | null {
  return ASSET_SOURCE_RULES.find((rule) => key.startsWith(rule.prefix))?.kind ?? null;
}

/**
 * The kinds one queue message changes. R2 sends a batch of keys; a key under a prefix no catalogue reads
 * is ignored, and the answer is sorted and de-duplicated so one rebuild serves the whole batch.
 */
export function kindsForAssetKeys(keys: Iterable<string>): AssetCatalogueKind[] {
  const kinds = new Set<AssetCatalogueKind>();
  for (const key of keys) {
    const kind = kindForAssetKey(key);
    if (kind) kinds.add(kind);
  }
  return [...kinds].sort();
}
