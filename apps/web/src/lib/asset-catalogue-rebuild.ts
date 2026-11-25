// Plan §12.1 parts 4, 5 and 12, §12.2.9: one rebuild pass over every kind, so a scheduled trigger, a
// queue message, an admin rescan and a test all run the same code. Sources are read from the public
// bucket; snapshots are written to the private one. The logging line per kind is the observability part.
import { ASSET_CATALOGUE_KINDS, writeAssetCatalogue, type AssetCatalogueKind } from "./asset-catalogue";
import type { AssetBuckets } from "./asset-store";

export type CatalogueRebuild = {
  kind: AssetCatalogueKind;
  /** False when the bucket changed nothing, so the snapshot object was left alone. */
  written: boolean;
  items: number;
  issues: number;
};

export type CatalogueRebuildSummary = {
  kinds: CatalogueRebuild[];
  written: number;
  issues: number;
};

export async function rebuildAssetCatalogues(
  buckets: AssetBuckets,
  now: Date = new Date(),
  log: (message: string) => void = (message) => console.log(message),
  /** The kinds a queue message touched; the whole set when a schedule or a rescan runs. */
  only: readonly AssetCatalogueKind[] = ASSET_CATALOGUE_KINDS,
): Promise<CatalogueRebuildSummary> {
  const kinds: CatalogueRebuild[] = [];
  for (const kind of only) {
    const { written, catalogue } = await writeAssetCatalogue(buckets.public, buckets.private, kind, now);
    const entry = { kind, written, items: catalogue.items.length, issues: catalogue.issues.length };
    kinds.push(entry);
    log(
      `assets: ${kind} ${written ? "rebuilt" : "unchanged"}, ${entry.items} ${entry.items === 1 ? "item" : "items"}, ${entry.issues} ${entry.issues === 1 ? "issue" : "issues"}`,
    );
  }
  return {
    kinds,
    written: kinds.filter((entry) => entry.written).length,
    issues: kinds.reduce((total, entry) => total + entry.issues, 0),
  };
}
