// Plan §12.2.3 rule 6: the upload form, the Worker and the pre-upload check all build a key from this
// one pure function, so no key is typed and none can drift from the tables in §12.2.2. Every shape is
// data: a bucket, the extensions it accepts, its size limit and the segments of the key.
import { isSafeAssetKey, type AssetBucketName } from "@/lib/asset-store";
import { cleanSvg, imageSize, sniffAssetType, type AssetFileType } from "@/lib/asset-file-type";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A user, order or design id: a UUID or a slug, never a name or a phone number (§12.2.3 rule 4). */
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export type AssetShape = {
  bucket: AssetBucketName;
  /** Accepted file extensions, in the order the form offers them. Empty for a fixed name (`meta.json`). */
  extensions: readonly string[];
  /** The largest file the shape accepts, in bytes. */
  maxBytes: number;
  /** The longest side an image may have, in pixels, where the plan sets one (a brush tip, a texture). */
  maxEdge?: number;
  /** Key segments; `{slug}` and `{id}` are filled in, `{file}` is the last segment plus `.{ext}`. */
  path: readonly string[];
};

const MAX_JSON = 20_000;

export const ASSET_SHAPES = {
  font: { bucket: "public", extensions: ["woff2"], maxBytes: 5_000_000, path: ["fonts", "{slug}", "{file}"] },
  "font-outline": { bucket: "public", extensions: ["ttf", "otf"], maxBytes: 5_000_000, path: ["fonts", "{slug}", "{file}"] },
  "font-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["fonts", "{slug}", "meta.json"] },
  design: { bucket: "public", extensions: ["svg"], maxBytes: 2_000_000, path: ["designs", "{slug}", "{file}"] },
  "design-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["designs", "{slug}", "meta.json"] },
  element: { bucket: "public", extensions: ["svg"], maxBytes: 200_000, path: ["elements", "{slug}", "{file}"] },
  "element-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["elements", "{slug}", "meta.json"] },
  brush: { bucket: "public", extensions: ["png", "svg"], maxBytes: 200_000, maxEdge: 512, path: ["brushes", "{slug}", "{file}"] },
  "brush-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["brushes", "{slug}", "meta.json"] },
  "text-style-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["text-styles", "{slug}", "meta.json"] },
  texture: { bucket: "public", extensions: ["png"], maxBytes: 1_000_000, maxEdge: 2048, path: ["textures", "{slug}", "{file}"] },
  "texture-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["textures", "{slug}", "meta.json"] },
  post: { bucket: "public", extensions: ["svg"], maxBytes: 2_000_000, path: ["posts", "{slug}.{ext}"] },
  mockup: { bucket: "public", extensions: ["webp", "png", "jpg"], maxBytes: 400_000, path: ["mockups", "{kind}", "{slug}", "{file}"] },
  "mockup-meta": { bucket: "public", extensions: [], maxBytes: MAX_JSON, path: ["mockups", "{kind}", "{slug}", "meta.json"] },
  model: { bucket: "public", extensions: ["glb"], maxBytes: 5_000_000, path: ["models", "{slug}.{ext}"] },
  "jersey-mockup": { bucket: "public", extensions: ["png"], maxBytes: 1_000_000, path: ["jersey-mockups", "{slug}", "worn_photo.png"] },
  "jersey-zones": { bucket: "public", extensions: [], maxBytes: 50_000, path: ["jersey-mockups", "{slug}", "mapping_zones.json"] },
  "site-category": { bucket: "public", extensions: ["webp"], maxBytes: 300_000, path: ["site", "categories", "{slug}.{ext}"] },
  "site-banner": { bucket: "public", extensions: ["webp"], maxBytes: 300_000, path: ["site", "banners", "{slug}.{ext}"] },
  snapshot: { bucket: "private", extensions: [], maxBytes: MAX_JSON, path: ["catalog", "{slug}.json"] },
  "upload-tmp": { bucket: "private", extensions: ["webp", "jpg", "png"], maxBytes: 6_000_000, path: ["uploads", "tmp", "{id}", "{file}"] },
  upload: { bucket: "private", extensions: ["webp", "jpg", "png"], maxBytes: 6_000_000, path: ["uploads", "{id}", "{file}"] },
  "saved-thumbnail": { bucket: "private", extensions: [], maxBytes: 100_000, path: ["saved", "{id}", "{design}", "thumbnail.webp"] },
  "order-file": { bucket: "private", extensions: ["html", "csv", "json", "svg"], maxBytes: 20_000_000, path: ["orders", "{id}", "{file}"] },
  licence: { bucket: "private", extensions: ["pdf"], maxBytes: 5_000_000, path: ["licences", "{slug}", "{file}"] },
} as const satisfies Record<string, AssetShape>;

export type AssetShapeId = keyof typeof ASSET_SHAPES;

export type AssetKeyVars = Record<string, string | undefined> & { file?: string; ext?: string };

function fill(value: string, vars: AssetKeyVars, shape: AssetShapeId): string {
  return value.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const replacement = vars[name];
    if (!replacement) throw new Error(`${shape} needs ${name}`);
    const pattern = name === "id" || name === "design" ? ID : SLUG;
    if (!pattern.test(replacement)) throw new Error(`${shape} refused ${name} "${replacement}"`);
    return replacement;
  });
}

function checkedExt(shape: AssetShapeId, vars: AssetKeyVars): string {
  const spec: AssetShape = ASSET_SHAPES[shape];
  const ext = vars.ext ?? "";
  if (!spec.extensions.includes(ext)) {
    throw new Error(`${shape} accepts ${spec.extensions.join(", ") || "no extension"}`);
  }
  return ext;
}

/**
 * The one function that builds a key. `vars.file` names the file and `vars.ext` its extension; a shape
 * whose path ends in `{file}` gets `.ext` appended. Throws instead of returning an unusable key.
 */
export function buildAssetKey(shape: AssetShapeId, vars: AssetKeyVars): string {
  const spec: AssetShape = ASSET_SHAPES[shape];
  const segments = spec.path.map((segment) => {
    if (segment === "{file}") {
      if (!vars.file) throw new Error(`${shape} needs file`);
      return `${fill(vars.file, vars, shape)}.${checkedExt(shape, vars)}`;
    }
    if (segment.endsWith(".{ext}")) {
      return `${fill(segment.slice(0, -".{ext}".length), vars, shape)}.${checkedExt(shape, vars)}`;
    }
    return fill(segment, vars, shape);
  });
  const key = segments.join("/");
  if (!isSafeAssetKey(key, spec.bucket)) throw new Error(`refused asset key: ${key}`);
  return key;
}

export type IdentifiedAssetKey = { shape: AssetShapeId; vars: Record<string, string>; ext: string };

function placeholderPattern(segment: string): string {
  return segment
    .split(/(\{\w+\})/)
    .map((part) => {
      const placeholder = /^\{(\w+)\}$/.exec(part);
      if (placeholder) return `(?<${placeholder[1]}>[a-z0-9-]+)`;
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("");
}

function shapePattern(shape: AssetShapeId): RegExp {
  const spec: AssetShape = ASSET_SHAPES[shape];
  const parts = spec.path.map((segment) => {
    if (segment === "{file}") return "(?<file>[a-z0-9-]+(?:\\.[a-z0-9-]+)*)\\.(?<ext>[a-z0-9]+)";
    if (segment.endsWith(".{ext}")) return `${placeholderPattern(segment.slice(0, -".{ext}".length))}\\.(?<ext>[a-z0-9]+)`;
    return placeholderPattern(segment);
  });
  return new RegExp(`^${parts.join("/")}$`);
}

/**
 * The reverse of `buildAssetKey`: which shape a key belongs to, so the pre-upload check can say what
 * a file is meant to be. `null` means no shape describes it and the key must not be uploaded.
 */
export function identifyAssetKey(key: string): IdentifiedAssetKey | null {
  for (const shape of Object.keys(ASSET_SHAPES) as AssetShapeId[]) {
    const spec: AssetShape = ASSET_SHAPES[shape];
    const match = shapePattern(shape).exec(key);
    if (!match?.groups) continue;
    // A fixed-name shape (`worn_photo.png`) carries its extension in the literal, not a placeholder.
    const ext = match.groups.ext ?? (key.includes(".") ? key.slice(key.lastIndexOf(".") + 1) : "");
    if (spec.extensions.length && !spec.extensions.includes(ext)) continue;
    const vars = { ...match.groups } as Record<string, string>;
    delete vars.ext;
    return { shape, vars, ext };
  }
  return null;
}

export type AssetFileCheck = { ok: true; shape: AssetShapeId } | { ok: false; reason: string };

const TYPE_BY_EXTENSION: Record<string, AssetFileType> = {
  webp: "webp",
  png: "png",
  jpg: "jpg",
  svg: "svg",
  woff2: "woff2",
  ttf: "ttf",
  otf: "otf",
  glb: "glb",
  json: "json",
  pdf: "pdf",
  csv: "csv",
  html: "html",
};

export type AssetContentCheck =
  | { ok: true; shape: AssetShapeId; type: AssetFileType; notes: string[]; cleaned?: string }
  | { ok: false; reason: string };

/**
 * The whole check for one file: the key, the size, the bytes (not the name), the pixel size where the
 * plan sets one, and the SVG cleaning of Plan §12.2.5. A note is a change the Worker would make and
 * keep; a reason is a refusal.
 */
export function checkAssetContent(key: string, data: Uint8Array): AssetContentCheck {
  const identified = identifyAssetKey(key);
  if (!identified) return { ok: false, reason: "no shape describes this key" };
  const spec: AssetShape = ASSET_SHAPES[identified.shape];
  const size = checkAssetFile(key, data.byteLength);
  if (!size.ok) return size;

  const type = sniffAssetType(data);
  if (!type) return { ok: false, reason: "the bytes are not a file type the shop accepts" };
  const ext = identified.ext || key.slice(key.lastIndexOf(".") + 1);
  const expected = TYPE_BY_EXTENSION[ext];
  if (expected && expected !== type) {
    return { ok: false, reason: `the name says .${ext} but the bytes are ${type}` };
  }

  if (spec.maxEdge) {
    const pixels = imageSize(data, type);
    if (!pixels) return { ok: false, reason: `could not read the pixel size of this ${type}` };
    if (pixels.width > spec.maxEdge || pixels.height > spec.maxEdge) {
      return { ok: false, reason: `${pixels.width}x${pixels.height} is larger than ${spec.maxEdge}x${spec.maxEdge}` };
    }
  }

  if (type === "svg") {
    const cleaned = cleanSvg(new TextDecoder().decode(data));
    return { ok: true, shape: identified.shape, type, notes: cleaned.removed, cleaned: cleaned.svg };
  }
  return { ok: true, shape: identified.shape, type, notes: [] };
}



/** Key shape, extension and size for one file the shop wants to upload (§12.2.11). */
export function checkAssetFile(key: string, bytes: number): AssetFileCheck {
  const identified = identifyAssetKey(key);
  if (!identified) return { ok: false, reason: "no shape describes this key" };
  const spec: AssetShape = ASSET_SHAPES[identified.shape];
  if (spec.extensions.length && !spec.extensions.includes(identified.ext)) {
    return { ok: false, reason: `${identified.shape} accepts ${spec.extensions.join(", ")}` };
  }
  if (bytes > spec.maxBytes) {
    return { ok: false, reason: `${identified.shape} is limited to ${Math.round(spec.maxBytes / 1000)} KB` };
  }
  return { ok: true, shape: identified.shape };
}
