// Plan §12.1 parts 3 and 4: turn what is in the asset bucket into one JSON catalogue per kind.
// The builders are pure (a store in, a catalogue out) so a test can drive them with an in-memory
// bucket, and so the Worker route only has to fetch the snapshot this writes.
import { assertSafeAssetKey, isSafeAssetKey, type AssetStore } from "./asset-store";
import { parseEditorFontManifest, type EditorFontEntry } from "./editor-fonts";

export const ASSET_CATALOGUE_KINDS = [
  "fonts",
  "designs",
  "elements",
  "photos",
  "patterns",
  "brushes",
  "text-styles",
  "mockups",
] as const;
export type AssetCatalogueKind = (typeof ASSET_CATALOGUE_KINDS)[number];

export const ASSET_FOLDER_BY_KIND: Record<AssetCatalogueKind, string> = {
  fonts: "fonts/",
  designs: "designs/",
  elements: "elements/",
  photos: "photos/",
  patterns: "patterns/",
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

/** One look of a product or garment: the file (or files) painted for that attribute combination. */
export type CatalogueMockupLook = { look: string; files: string[] };

/**
 * A product or garment that has mockups, grouped as `mockups/<kind>/<slug>/<look>.<ext>`
 * (Plan §12.2.12 item 4). `kind` is `product`, `editor` or `3d`; older flat keys
 * (`mockups/<slug>/<look>.<ext>`) are still read and count as `product`.
 */
export type CatalogueMockup = {
  slug: string;
  kind: string;
  looks: CatalogueMockupLook[];
  /** Every file of every look, sorted, so a caller that only wants the keys keeps working. */
  files: string[];
};

/** The licence a library photo must carry before the shop may offer it (Plan §12.2.2). */
export type CataloguePhotoLicence = {
  name: string;
  source: string;
  /** The one field that decides whether the photo may be printed and sold. */
  commercialPrintAllowed: boolean;
  credit: string;
};

/** One licensed photo: `photos/<slug>/photo.<ext>` plus `thumb.webp` and `meta.json`. */
export type CataloguePhoto = {
  slug: string;
  name: string;
  /** The Myanmar name; empty when the shop has not written one yet. */
  nameMy: string;
  /** The picture itself. */
  file: string;
  /** The grid thumbnail, `photos/<slug>/thumb.webp`. */
  thumb: string;
  files: string[];
  width: number;
  height: number;
  transparent: boolean;
  tags: string[];
  aliases: string[];
  licence: CataloguePhotoLicence;
};

export const PATTERN_INKS = ["dark", "light", "color"] as const;
export type PatternInk = (typeof PATTERN_INKS)[number];

/** One pattern: `patterns/<slug>/pattern.svg`, authored for the 1000 x 1200 artwork space. */
export type CataloguePattern = {
  slug: string;
  name: string;
  nameMy: string;
  /** What the card behind the thumbnail is, so a light pattern is not lost on a light card. */
  ink: PatternInk;
  file: string;
  files: string[];
  tags: string[];
};

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
 * A design (or any folder kind) saved as one file directly under the prefix uses the retired layout.
 * The folder form — `designs/<slug>/design.svg` plus `meta.json` — is the target (Plan §12.2.12 item 5),
 * so the file is listed here for the shop to move instead of being silently ignored.
 */
function reportSingleFileLayout(
  keys: string[],
  prefix: string,
  kind: AssetCatalogueKind,
  issues: AssetCatalogueIssue[],
): void {
  for (const key of keys) {
    if (!isSafeAssetKey(key)) continue;
    const rest = key.slice(prefix.length);
    if (rest.includes("/")) continue;
    issues.push({
      key,
      reason: `single-file ${kind} asset; move it to ${prefix}<slug>/ plus a meta.json`,
    });
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
    // D14: an outline file that is not in the bucket costs the bend only. The font still displays, so it
    // stays in the list and the issue says what to upload.
    for (const file of font.files) {
      if (!file.outline || keys.includes(file.outline)) continue;
      issues.push({ key: item.key, reason: `outline file ${file.outline} is not in the bucket` });
      delete file.outline;
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

  reportSingleFileLayout(keys, prefix, kind, issues);
  reportMissingMeta(keys, prefix, issues);
  return {
    version: 1,
    kind,
    generatedAt: now.toISOString(),
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

function asNumber(value: unknown): number {
  const number = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(number) ? number : 0;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asString).filter(Boolean) : [];
}

/** The licence object of a photo's meta.json, or the reason it cannot be offered. */
function readPhotoLicence(value: unknown): { licence: CataloguePhotoLicence } | { reason: string } {
  if (!isRecord(value)) return { reason: "licence is missing" };
  const name = asString(value.name);
  const source = asString(value.source);
  if (!name) return { reason: "licence.name is missing" };
  if (!source) return { reason: "licence.source is missing" };
  if (value.commercialPrintAllowed !== true) {
    return { reason: "licence.commercialPrintAllowed must be true before the photo can be sold" };
  }
  return {
    licence: {
      name,
      source,
      commercialPrintAllowed: true,
      credit: asString(value.credit) || name,
    },
  };
}

export type PhotoCatalogueOptions = {
  /** The private bucket, so a photo without its licence document is reported instead of offered. */
  licences?: AssetStore;
};

/**
 * The shop's Photos library (Plan §12.2.2). A photo is offered only when it is complete: the picture,
 * the grid thumbnail, a name, its pixel size, a licence that allows commercial printing, and the licence
 * document under `licences/photos/<slug>/`. Anything less is an issue with the key the shop must fix.
 */
export async function buildPhotoCatalogue(
  store: AssetStore,
  now: Date = new Date(),
  options: PhotoCatalogueOptions = {},
): Promise<AssetCatalogue<CataloguePhoto>> {
  const prefix = ASSET_FOLDER_BY_KIND.photos;
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const items: CataloguePhoto[] = [];
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
    const licence = readPhotoLicence(read.meta.licence);
    if ("reason" in licence) {
      issues.push({ key, reason: licence.reason });
      continue;
    }
    const file = keys.find((other) => other.startsWith(`${prefix}${folder}/photo.`));
    if (!file) {
      issues.push({ key, reason: "photo.<webp|png|jpg> is missing" });
      continue;
    }
    const thumb = `${prefix}${folder}/thumb.webp`;
    if (!keys.includes(thumb)) {
      issues.push({ key, reason: "thumb.webp is missing" });
      continue;
    }
    const width = asNumber(read.meta.width);
    const height = asNumber(read.meta.height);
    if (width <= 0 || height <= 0) {
      issues.push({ key, reason: "width and height must be the photo's pixel size" });
      continue;
    }
    if (options.licences) {
      const documents = await listAllKeys(options.licences, `licences/photos/${slug}/`);
      if (!documents.some((document) => document.endsWith(".pdf"))) {
        issues.push({ key, reason: `licence document is missing at licences/photos/${slug}/` });
        continue;
      }
    }
    seen.add(slug);
    items.push({
      slug,
      name,
      nameMy: asString(read.meta.nameMy),
      file,
      thumb,
      files: [file, thumb],
      width,
      height,
      transparent: read.meta.transparent === true,
      tags: stringList(read.meta.tags),
      aliases: stringList(read.meta.aliases),
      licence: licence.licence,
    });
  }

  reportSingleFileLayout(keys, prefix, "photos", issues);
  reportMissingMeta(keys, prefix, issues);
  return {
    version: 1,
    kind: "photos",
    generatedAt: now.toISOString(),
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

/**
 * The Patterns library (Plan §12.2.2): one SVG per folder, authored to cover the 1000 x 1200 artwork
 * space. The nine built-in patterns live in code and are shown before these, so this list may be empty.
 */
export async function buildPatternCatalogue(
  store: AssetStore,
  now: Date = new Date(),
): Promise<AssetCatalogue<CataloguePattern>> {
  const prefix = ASSET_FOLDER_BY_KIND.patterns;
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const items: CataloguePattern[] = [];
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
    const ink = asString(read.meta.ink) || "dark";
    if (!(PATTERN_INKS as readonly string[]).includes(ink)) {
      issues.push({ key, reason: `ink must be ${PATTERN_INKS.join(", ")}` });
      continue;
    }
    const file = `${prefix}${folder}/pattern.svg`;
    if (!keys.includes(file)) {
      issues.push({ key, reason: "pattern.svg is missing" });
      continue;
    }
    seen.add(slug);
    items.push({
      slug,
      name,
      nameMy: asString(read.meta.nameMy),
      ink: ink as PatternInk,
      file,
      files: [file],
      tags: stringList(read.meta.tags),
    });
  }

  reportSingleFileLayout(keys, prefix, "patterns", issues);
  reportMissingMeta(keys, prefix, issues);
  return {
    version: 1,
    kind: "patterns",
    generatedAt: now.toISOString(),
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    issues,
  };
}

/**
 * The looks that exist for each product or garment, so a page picks one instead of probing.
 *
 * The folder layout is `mockups/<kind>/<slug>/<look>.<ext>`: the kind comes first so `product`,
 * `editor` and `3d` are never mistaken for slugs. A key that still uses the older flat
 * `mockups/<slug>/<look>.<ext>` form is read as a `product` look until the shop moves it, so an
 * existing bucket keeps working.
 */
export async function buildMockupCatalogue(
  store: AssetStore,
  now: Date = new Date(),
): Promise<AssetCatalogue<CatalogueMockup>> {
  const prefix = ASSET_FOLDER_BY_KIND.mockups;
  const keys = await listAllKeys(store, prefix);
  const issues: AssetCatalogueIssue[] = [];
  const items = new Map<string, { slug: string; kind: string; looks: Map<string, string[]> }>();

  for (const key of keys) {
    if (!assertKeyOk(key, issues)) continue;
    const parts = key.slice(prefix.length).split("/");
    let kind: string;
    let slug: string;
    let file: string;
    if (parts.length === 2) {
      kind = "product";
      [slug, file] = parts;
      issues.push({ key, reason: "flat mockup key; move it to mockups/<kind>/<slug>/<look>.<ext>" });
    } else if (parts.length === 3) {
      [kind, slug, file] = parts;
    } else {
      issues.push({ key, reason: "a mockup file must sit in mockups/<kind>/<slug>/<look>.<ext>" });
      continue;
    }
    if (!SLUG_PATTERN.test(kind) || !SLUG_PATTERN.test(slug)) {
      issues.push({ key, reason: "the kind and the slug must be lowercase words joined by -" });
      continue;
    }
    if (file === "meta.json") continue;
    const look = file.replace(/\.[a-z0-9]+$/i, "");
    if (!look) {
      issues.push({ key, reason: "the look needs a name before its extension" });
      continue;
    }
    const id = `${kind}/${slug}`;
    const entry = items.get(id) ?? { slug, kind, looks: new Map<string, string[]>() };
    entry.looks.set(look, [...(entry.looks.get(look) ?? []), key]);
    items.set(id, entry);
  }

  const built = [...items.values()]
    .map((entry) => {
      const looks = [...entry.looks.entries()]
        .map(([look, files]) => ({ look, files: files.sort() }))
        .sort((a, b) => a.look.localeCompare(b.look));
      return {
        slug: entry.slug,
        kind: entry.kind,
        looks,
        files: looks.flatMap((look) => look.files).sort(),
      };
    })
    .sort((a, b) => (a.kind === b.kind ? a.slug.localeCompare(b.slug) : a.kind.localeCompare(b.kind)));

  return { version: 1, kind: "mockups", generatedAt: now.toISOString(), items: built, issues };
}

type AnyCatalogue = AssetCatalogue<EditorFontEntry | CatalogueAsset | CatalogueMockup | CataloguePhoto | CataloguePattern>;

function buildAnyCatalogue(
  store: AssetStore,
  kind: AssetCatalogueKind,
  now: Date,
  /** The private bucket, for the licence documents a photo catalogue checks. */
  licences?: AssetStore,
): Promise<AnyCatalogue> {
  if (kind === "fonts") return buildFontCatalogue(store, now);
  if (kind === "mockups") return buildMockupCatalogue(store, now);
  if (kind === "photos") return buildPhotoCatalogue(store, now, { licences });
  if (kind === "patterns") return buildPatternCatalogue(store, now);
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
  kind: "photos",
  now?: Date,
): Promise<AssetCatalogue<CataloguePhoto>>;
export function buildAssetCatalogue(
  store: AssetStore,
  kind: "patterns",
  now?: Date,
): Promise<AssetCatalogue<CataloguePattern>>;
export function buildAssetCatalogue(
  store: AssetStore,
  kind: Exclude<AssetCatalogueKind, "fonts" | "mockups" | "photos" | "patterns">,
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
  snapshots: AssetStore,
  kind: AssetCatalogueKind,
): Promise<AssetCatalogue<T> | null> {
  const raw = await snapshots.get(catalogueSnapshotKey(kind));
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
 * Build one catalogue from the public bucket and store the snapshot in the private one (Plan §12.2.12
 * item 2): the snapshot carries the `issues` list, which names what is broken and must never be
 * published. A rebuild that changes nothing writes nothing, so a scheduled run does not churn the
 * object or its cache.
 */
export async function writeAssetCatalogue<T>(
  source: AssetStore,
  snapshots: AssetStore,
  kind: AssetCatalogueKind,
  now: Date = new Date(),
): Promise<{ written: boolean; catalogue: AssetCatalogue<T> }> {
  const catalogue = (await buildAnyCatalogue(source, kind, now, snapshots)) as AssetCatalogue<T>;
  const previous = await readAssetCatalogue<T>(snapshots, kind);
  if (previous && fingerprint(previous as AssetCatalogue<unknown>) === fingerprint(catalogue as AssetCatalogue<unknown>)) {
    return { written: false, catalogue: previous };
  }
  await snapshots.put(catalogueSnapshotKey(kind), JSON.stringify(catalogue, null, 2));
  return { written: true, catalogue };
}
