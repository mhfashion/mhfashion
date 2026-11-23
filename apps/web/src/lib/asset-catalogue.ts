// Plan §12.1 parts 3 and 4: turn what is in the asset bucket into one JSON catalogue per kind.
// The builders are pure (a store in, a catalogue out) so a test can drive them with an in-memory
// bucket, and so the Worker route only has to fetch the snapshot this writes.
import { assertSafeAssetKey, isSafeAssetKey, type AssetStore } from "@/lib/asset-store";
import { parseEditorFontManifest, type EditorFontEntry } from "@/lib/editor-fonts";

export const ASSET_CATALOGUE_KINDS = ["fonts", "designs", "elements", "brushes", "text-styles", "mockups"] as const;
export type AssetCatalogueKind = (typeof ASSET_CATALOGUE_KINDS)[number];

export const ASSET_FOLDER_BY_KIND: Record<AssetCatalogueKind, string> = {
  fonts: "fonts/",
  designs: "designs/",
  elements: "elements/",
  brushes: "brushes/",
  "text-styles": "text-styles/",
  mockups: "mockups/",
};

/** A design, element, brush or text style. Fonts use the editor's own entry shape instead. */
export type CatalogueAsset = {
  slug: string;
  name: string;
  /** Bucket-relative files that belong to this asset. */
  files: string[];
  /** The rest of `meta.json`, so a kind can add fields without changing this builder. */
  meta: Record<string, unknown>;
};

/** A look that really exists for a product, so a page never has to probe for one. */
export type CatalogueMockup = { slug: string; files: string[] };

export type AssetCatalogueIssue = { key: string; reason: string };

export type AssetCatalogue<T> = {
  version: 1;
  kind: AssetCatalogueKind;
  generatedAt: string;
  items: T[];
  /** Every entry that was skipped, with the key and the reason the shop needs to fix it. */
  issues: AssetCatalogueIssue[];
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Every key under a prefix, following the cursor until the listing ends. */
export async function listAllKeys(store: AssetStore, prefix: string): Promise<string[]> {
  const keys = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await store.list(prefix, cursor);
    for (const key of page.keys) keys.add(key);
    cursor = page.cursor;
  } while (cursor);
  return [...keys].sort();
}

/** `fonts/padauk/meta.json` → `fonts/padauk`. A key that is not exactly `<prefix><slug>/meta.json` is refused. */
function folderOf(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix) || !key.endsWith("/meta.json")) return null;
  const rest = key.slice(prefix.length, -"/meta.json".length);
  if (!rest || rest.includes("/")) return null;
  return rest;
}

async function readMeta(
  store: AssetStore,
  key: string,
): Promise<{ meta: Record<string, unknown> } | { reason: string }> {
  const raw = await store.get(key);
  if (raw === null) return { reason: "meta.json is listed but cannot be read" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { reason: "meta.json is not an object" };
    return { meta: parsed };
  } catch (error) {
    return { reason: `meta.json is not valid JSON: ${(error as Error).message}` };
  }
}

/** A folder with files but no meta.json cannot be described, so it is named in the issues list. */
function reportMissingMeta(
  keys: string[],
  prefix: string,
  issues: AssetCatalogueIssue[],
): void {
  const reported = new Set<string>();
  for (const key of keys) {
    // An unsafe key is already in the issues list; it must not also mark its folder as incomplete.
    if (!isSafeAssetKey(key)) continue;
    const [folder, ...tail] = key.slice(prefix.length).split("/");
    if (!tail.length || !folder) continue;
    if (tail.length === 1 && tail[0] === "meta.json") continue;
    if (keys.includes(`${prefix}${folder}/meta.json`) || reported.has(folder)) continue;
    reported.add(folder);
    issues.push({ key: `${prefix}${folder}/`, reason: "meta.json is missing" });
  }
}

/**
 * Fonts are validated by the parser the editor already trusts, so the bucket, the check script and
 * the picker cannot disagree about what a usable font is.
 */
export async function buildFontCatalogue(
  store: AssetStore,
  now: Date = new Date(),
): Promise<AssetCatalogue<EditorFontEntry>> {
  const prefix = ASSET_FOLDER_BY_KIND.fonts;
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const entries: { key: string; entry: Record<string, unknown> }[] = [];

  for (const key of keys) {
    if (!assertKeyOk(key, issues)) continue;
    const slug = folderOf(key, prefix);
    if (!slug) continue;
    const read = await readMeta(store, key);
    if ("reason" in read) {
      issues.push({ key, reason: read.reason });
      continue;
    }
    entries.push({ key, entry: { ...read.meta, slug: asString(read.meta.slug) || slug } });
  }

  reportMissingMeta(keys, prefix, issues);
  const manifest = parseEditorFontManifest({ fonts: entries.map((item) => item.entry) });
  const accepted = new Map(manifest.fonts.map((font) => [font.slug, font]));
  for (const item of entries) {
    const slug = asString(item.entry.slug);
    if (!accepted.has(slug)) continue;
    const font = accepted.get(slug)!;
    const missing = font.files.map((file) => file.file).filter((file) => !keys.includes(file));
    if (missing.length) {
      issues.push({ key: item.key, reason: `file ${missing[0]} is not in the bucket` });
      accepted.delete(slug);
    }
  }
  for (const skip of manifest.skipped) {
    const owner = entries.find((item) => asString(item.entry.slug) === skip.slug || folderOf(item.key, prefix) === skip.slug);
    issues.push({ key: owner?.key ?? `${prefix}${skip.slug || "?"}/meta.json`, reason: skip.reason });
  }

  return {
    version: 1,
    kind: "fonts",
    generatedAt: now.toISOString(),
    items: [...accepted.values()].sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

/** A key that the service would not serve is reported, never turned into an item. */
function assertKeyOk(key: string, issues: AssetCatalogueIssue[]): boolean {
  try {
    assertSafeAssetKey(key);
    return true;
  } catch {
    issues.push({ key, reason: "unsafe key" });
    return false;
  }
}

/** Designs, elements, brushes and text styles share one shape: a folder, a meta.json and its files. */
export async function buildFolderCatalogue(
  store: AssetStore,
  kind: Exclude<AssetCatalogueKind, "fonts" | "mockups">,
  now: Date = new Date(),
): Promise<AssetCatalogue<CatalogueAsset>> {
  const prefix = ASSET_FOLDER_BY_KIND[kind];
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const items: CatalogueAsset[] = [];
  const seen = new Set<string>();

  for (const key of keys) {
    if (!assertKeyOk(key, issues)) continue;
    const folder = folderOf(key, prefix);
    if (!folder) continue;
    const read = await readMeta(store, key);
    if ("reason" in read) {
      issues.push({ key, reason: read.reason });
      continue;
    }
    const slug = asString(read.meta.slug) || folder;
    if (!SLUG_PATTERN.test(slug)) {
      issues.push({ key, reason: "slug must be lowercase words joined by -" });
      continue;
    }
    if (seen.has(slug)) {
      issues.push({ key, reason: "duplicate slug" });
      continue;
    }
    const name = asString(read.meta.name);
    if (!name) {
      issues.push({ key, reason: "name is missing" });
      continue;
    }
    const declared = Array.isArray(read.meta.files) ? read.meta.files.map(asString).filter(Boolean) : [];
    const siblings = keys.filter((other) => other.startsWith(`${prefix}${folder}/`) && other !== key);
    const files = declared.length ? declared : siblings;
    const missing = files.filter((file) => !keys.includes(file));
    if (missing.length) {
      issues.push({ key, reason: `file ${missing[0]} is not in the bucket` });
      continue;
    }
    const rest: Record<string, unknown> = { ...read.meta };
    delete rest.slug;
    delete rest.name;
    delete rest.files;
    seen.add(slug);
    items.push({ slug, name, files, meta: rest });
  }

  reportMissingMeta(keys, prefix, issues);
  return {
    version: 1,
    kind,
    generatedAt: now.toISOString(),
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

/** The looks that exist for each product, so the product page picks one instead of probing. */
export async function buildMockupCatalogue(
  store: AssetStore,
  now: Date = new Date(),
): Promise<AssetCatalogue<CatalogueMockup>> {
  const prefix = ASSET_FOLDER_BY_KIND.mockups;
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const folders = new Map<string, string[]>();

  for (const key of keys) {
    if (!assertKeyOk(key, issues)) continue;
    const rest = key.slice(prefix.length);
    const [slug, ...tail] = rest.split("/");
    if (!tail.length || !SLUG_PATTERN.test(slug)) {
      issues.push({ key, reason: "a mockup file must sit in mockups/<product-slug>/" });
      continue;
    }
    if (tail.length === 1 && tail[0] === "meta.json") continue;
    folders.set(slug, [...(folders.get(slug) ?? []), key]);
  }

  return {
    version: 1,
    kind: "mockups",
    generatedAt: now.toISOString(),
    items: [...folders.entries()]
      .map(([slug, files]) => ({ slug, files: files.sort() }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
    issues,
  };
}

type AnyCatalogue = AssetCatalogue<EditorFontEntry | CatalogueAsset | CatalogueMockup>;

function buildAnyCatalogue(store: AssetStore, kind: AssetCatalogueKind, now: Date): Promise<AnyCatalogue> {
  if (kind === "fonts") return buildFontCatalogue(store, now);
  if (kind === "mockups") return buildMockupCatalogue(store, now);
  return buildFolderCatalogue(store, kind, now);
}

export function buildAssetCatalogue(
  store: AssetStore,
  kind: "fonts",
  now?: Date,
): Promise<AssetCatalogue<EditorFontEntry>>;
export function buildAssetCatalogue(
  store: AssetStore,
  kind: "mockups",
  now?: Date,
): Promise<AssetCatalogue<CatalogueMockup>>;
export function buildAssetCatalogue(
  store: AssetStore,
  kind: Exclude<AssetCatalogueKind, "fonts" | "mockups">,
  now?: Date,
): Promise<AssetCatalogue<CatalogueAsset>>;
export function buildAssetCatalogue(
  store: AssetStore,
  kind: AssetCatalogueKind,
  now: Date = new Date(),
): Promise<AnyCatalogue> {
  return buildAnyCatalogue(store, kind, now);
}

export function catalogueSnapshotKey(kind: AssetCatalogueKind): string {
  return `catalog/${kind}.json`;
}

/** What a rebuild compares: everything except `generatedAt`, so a quiet folder is not rewritten. */
function fingerprint(catalogue: AssetCatalogue<unknown>): string {
  return JSON.stringify({ version: catalogue.version, kind: catalogue.kind, items: catalogue.items, issues: catalogue.issues });
}

export async function readAssetCatalogue<T>(
  store: AssetStore,
  kind: AssetCatalogueKind,
): Promise<AssetCatalogue<T> | null> {
  const raw = await store.get(catalogueSnapshotKey(kind));
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.items)) return null;
    return parsed as AssetCatalogue<T>;
  } catch {
    return null;
  }
}

/**
 * Build one catalogue and store it as the snapshot the read routes serve. A rebuild that changes
 * nothing writes nothing, so a scheduled run does not churn the object or its cache.
 */
export async function writeAssetCatalogue<T>(
  store: AssetStore,
  kind: AssetCatalogueKind,
  now: Date = new Date(),
): Promise<{ written: boolean; catalogue: AssetCatalogue<T> }> {
  const catalogue = (await buildAnyCatalogue(store, kind, now)) as AssetCatalogue<T>;
  const previous = await readAssetCatalogue<T>(store, kind);
  if (previous && fingerprint(previous as AssetCatalogue<unknown>) === fingerprint(catalogue as AssetCatalogue<unknown>)) {
    return { written: false, catalogue: previous };
  }
  await store.put(catalogueSnapshotKey(kind), JSON.stringify(catalogue, null, 2));
  return { written: true, catalogue };
}
