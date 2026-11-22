// The font library lives in R2 beside the mockups: `fonts/manifest.json` lists the fonts and each
// font's files sit under `fonts/<font-slug>/`. Until that manifest exists the editor keeps the
// eight system fonts it shipped with, so a missing or broken manifest changes nothing on screen.
//
// A layer stores the font's family name (`text.fontFamily`), which is what the picker shows and
// what every renderer passes to `font-family`. Manifest fonts therefore load as an `@font-face`
// whose family is the entry's `name`; no stored design has to be rewritten when fonts arrive.
export const FONT_MANIFEST_PATH = "fonts/manifest.json";

export const EDITOR_FONT_SHELVES = ["sans", "serif", "display", "script", "burmese"] as const;
export type EditorFontShelf = (typeof EDITOR_FONT_SHELVES)[number];

export const EDITOR_FONT_SHELF_LABELS: Record<EditorFontShelf, string> = {
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  script: "Script",
  burmese: "Burmese",
};

/** Scripts a font file may cover. A font with both splits its download by `unicode-range`. */
export type EditorFontScript = "latin" | "myanmar";

export const EDITOR_FONT_UNICODE_RANGES: Record<EditorFontScript, string> = {
  latin: "U+0000-00FF, U+0100-024F, U+1E00-1EFF, U+2000-206F, U+20A0-20CF",
  myanmar: "U+1000-109F, U+200C-200D, U+25CC, U+A9E0-A9FF, U+AA60-AA7F",
};

export type EditorFontFile = { weight: number; style: "normal" | "italic"; file: string };

export type EditorFontEntry = {
  slug: string;
  name: string;
  shelf: EditorFontShelf;
  scripts: EditorFontScript[];
  files: EditorFontFile[];
  licence: { name: string; url: string };
  enabled: boolean;
};

export type EditorFontManifest = {
  fonts: EditorFontEntry[];
  /** Why an entry was dropped. A bad entry is skipped, never fatal (the same rule as brushes.json). */
  skipped: { slug: string; reason: string }[];
};

/** What the editor paints with when no manifest is configured: the eight fonts it always had. */
export const EDITOR_SYSTEM_FONTS: readonly string[] = [
  "Inter",
  "Arial",
  "Georgia",
  "Impact",
  "Courier New",
  "Trebuchet MS",
  "Verdana",
  "Times New Roman",
];

const FONT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** A bucket-relative woff2 path. Anything that could escape the bucket is refused. */
function fontFilePath(value: unknown): string | null {
  const file = asString(value).replace(/^\/+/, "");
  if (!file || !/\.woff2$/i.test(file)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(file) || file.includes("..")) return null;
  return file;
}

function parseFontFile(raw: unknown): EditorFontFile | null {
  if (!isRecord(raw)) return null;
  const file = fontFilePath(raw.file);
  if (!file) return null;
  const weight = typeof raw.weight === "number" ? raw.weight : 400;
  if (!Number.isInteger(weight) || weight < 100 || weight > 900) return null;
  const style = raw.style === undefined ? "normal" : raw.style;
  if (style !== "normal" && style !== "italic") return null;
  return { weight, style, file };
}

function parseScripts(raw: unknown): EditorFontScript[] {
  if (!Array.isArray(raw)) return ["latin"];
  const scripts = raw.filter((script): script is EditorFontScript => script === "latin" || script === "myanmar");
  return scripts.length ? [...new Set(scripts)] : ["latin"];
}

/**
 * Read `fonts/manifest.json`. Entries are validated one by one: a font without a licence, with a
 * file outside the bucket, or with a shelf the editor cannot show is skipped and named in
 * `skipped`, so one bad entry never empties the library.
 */
export function parseEditorFontManifest(raw: unknown): EditorFontManifest {
  if (!isRecord(raw) || !Array.isArray(raw.fonts)) {
    return { fonts: [], skipped: [{ slug: "manifest", reason: "no fonts array" }] };
  }
  const fonts: EditorFontEntry[] = [];
  const skipped: { slug: string; reason: string }[] = [];
  const slugs = new Set<string>();
  const names = new Set<string>();
  for (const entry of raw.fonts) {
    if (!isRecord(entry)) {
      skipped.push({ slug: "", reason: "entry is not an object" });
      continue;
    }
    const slug = asString(entry.slug);
    const name = asString(entry.name);
    const label = slug || name || "(unnamed)";
    if (!FONT_SLUG_PATTERN.test(slug)) {
      skipped.push({ slug: label, reason: "slug must be lowercase words joined by -" });
      continue;
    }
    if (slugs.has(slug)) {
      skipped.push({ slug, reason: "duplicate slug" });
      continue;
    }
    if (!name || name.length > 60) {
      skipped.push({ slug, reason: "name is missing or too long" });
      continue;
    }
    if (names.has(name.toLowerCase())) {
      skipped.push({ slug, reason: `duplicate name ${name}` });
      continue;
    }
    if (!EDITOR_FONT_SHELVES.includes(entry.shelf as EditorFontShelf)) {
      skipped.push({ slug, reason: "shelf is not one the editor shows" });
      continue;
    }
    const files = Array.isArray(entry.files)
      ? entry.files.map(parseFontFile).filter((file): file is EditorFontFile => file !== null)
      : [];
    if (!files.length) {
      skipped.push({ slug, reason: "no woff2 file inside the bucket" });
      continue;
    }
    const licence = isRecord(entry.licence) ? entry.licence : null;
    const licenceName = asString(licence?.name);
    if (!licenceName) {
      skipped.push({ slug, reason: "no licence, so it must not ship" });
      continue;
    }
    slugs.add(slug);
    names.add(name.toLowerCase());
    fonts.push({
      slug,
      name,
      shelf: entry.shelf as EditorFontShelf,
      scripts: parseScripts(entry.scripts),
      files,
      licence: { name: licenceName, url: asString(licence?.url) },
      enabled: entry.enabled !== false,
    });
  }
  return { fonts, skipped };
}

/** Where a font file is fetched from. The bucket address is a setting, never hard-coded. */
export function fontFileUrl(base: string, file: string): string {
  const path = file.replace(/^\/+/, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const root = base.trim().replace(/\/+$/, "");
  return root ? `${root}/${path}` : path;
}

function cssFamilyName(name: string): string {
  return `'${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

/** `@font-face` rules for one font, split by script so a large Myanmar file downloads only when used. */
export function fontFaceCss(font: EditorFontEntry, base: string): string {
  const family = cssFamilyName(font.name);
  const unicodeRange = font.scripts.map((script) => EDITOR_FONT_UNICODE_RANGES[script]).join(", ");
  return font.files.map((file) => [
    "@font-face{",
    `font-family:${family};`,
    `font-weight:${file.weight};`,
    `font-style:${file.style};`,
    "font-display:swap;",
    `src:url('${fontFileUrl(base, file.file)}') format('woff2');`,
    `unicode-range:${unicodeRange};`,
    "}",
  ].join("")).join("\n");
}

/** The first family of a CSS stack: `'Padauk', sans-serif` → `Padauk`. */
export function fontFamilyName(family: string): string {
  const first = family.split(",")[0] ?? "";
  return first.trim().replace(/^['"]|['"]$/g, "").trim();
}

/**
 * The enabled fonts the artwork actually uses. A font switched off is deliberately left out: its
 * layers keep their stored family name and fall back to the stack, so old designs still render.
 */
export function fontsInUse(fonts: EditorFontEntry[], families: Iterable<string | null | undefined>): EditorFontEntry[] {
  const wanted = new Set<string>();
  for (const family of families) {
    if (!family) continue;
    const name = fontFamilyName(family);
    if (name) wanted.add(name.toLowerCase());
  }
  if (!wanted.size) return [];
  return fonts.filter((font) => font.enabled && wanted.has(font.name.toLowerCase()));
}

/** The picker's list: enabled fonts, shelf by shelf, in the order the shelves are shown. */
export function fontShelfGroups(fonts: EditorFontEntry[]): { shelf: EditorFontShelf; label: string; names: string[] }[] {
  return EDITOR_FONT_SHELVES
    .map((shelf) => ({
      shelf,
      label: EDITOR_FONT_SHELF_LABELS[shelf],
      names: fonts.filter((font) => font.enabled && font.shelf === shelf).map((font) => font.name),
    }))
    .filter((group) => group.names.length > 0);
}

export function editorFontNames(fonts: EditorFontEntry[]): string[] {
  return fontShelfGroups(fonts).flatMap((group) => group.names);
}
