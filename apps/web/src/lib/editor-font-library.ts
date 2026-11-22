"use client";

import { useEffect, useMemo, useState } from "react";

import {
  EDITOR_SYSTEM_FONTS,
  FONT_MANIFEST_PATH,
  editorFontNames,
  embeddedFontFaceCss,
  fontFaceCss,
  fontFileUrl,
  fontShelfGroups,
  fontsInUse,
  parseEditorFontManifest,
  previewFontFile,
  type EditorFontEntry,
  type EditorFontShelf,
} from "@/lib/editor-fonts";
import { R2_MOCKUP_BASE } from "@/lib/product-mockup";

const FONT_STYLE_ID = "editor-font-faces";

/** The fonts bucket is the mockup bucket, so a move to S3 changes one setting. */
export function fontLibraryBase(): string {
  return R2_MOCKUP_BASE;
}

let manifestPromise: Promise<EditorFontEntry[]> | null = null;

/**
 * Read the manifest once per page. No bucket address, a missing manifest or a broken one all end
 * as an empty list, which leaves the editor on the eight system fonts it always had.
 */
export function loadEditorFontLibrary(): Promise<EditorFontEntry[]> {
  if (manifestPromise) return manifestPromise;
  const base = fontLibraryBase();
  manifestPromise = (async () => {
    if (!base) return [];
    try {
      const response = await fetch(`${base}/${FONT_MANIFEST_PATH}`);
      if (!response.ok) return [];
      return parseEditorFontManifest(await response.json()).fonts;
    } catch {
      return [];
    }
  })();
  return manifestPromise;
}

const appliedKeys = new Set<string>();

/** One `<style>` for every face the page has asked for; each font is added once. */
function injectFontCss(key: string, css: string): void {
  if (!css || appliedKeys.has(key) || typeof document === "undefined") return;
  let style = document.getElementById(FONT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = FONT_STYLE_ID;
    document.head.append(style);
  }
  style.append(document.createTextNode(`${css}\n`));
  appliedKeys.add(key);
}

/** Only fonts the artwork uses are fetched; repeat calls add nothing, so every caller may ask. */
export function applyEditorFontFaces(fonts: EditorFontEntry[], families: Iterable<string | null | undefined>): void {
  for (const font of fontsInUse(fonts, families)) {
    injectFontCss(font.slug, fontFaceCss(font, fontLibraryBase()));
  }
}

/**
 * The picker paints each font's name in that font, so the list needs one file per font while it is
 * open. Only the regular file is loaded, and only once.
 */
export function applyEditorFontPreviews(fonts: EditorFontEntry[]): void {
  for (const font of fonts) {
    if (!font.enabled) continue;
    const file = previewFontFile(font);
    if (file) injectFontCss(`${font.slug}#preview`, fontFaceCss(font, fontLibraryBase(), [file]));
  }
}

async function fontFileDataUrl(file: string): Promise<string | null> {
  try {
    const response = await fetch(fontFileUrl(fontLibraryBase(), file));
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return `data:font/woff2;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/**
 * The `@font-face` rules for a download, with each file inlined. A PNG is rasterised through an
 * `<img>`, which fetches nothing, so the font has to travel inside the document or the customer's
 * file would paint in a fallback. No manifest, no used fonts, or a failed download all return "".
 */
export async function designExportFontCss(families: string[]): Promise<string> {
  const fonts = await loadEditorFontLibrary();
  const used = fontsInUse(fonts, families);
  if (!used.length) return "";
  const files = new Map<string, string | null>();
  for (const font of used) {
    for (const file of font.files) {
      if (!files.has(file.file)) files.set(file.file, await fontFileDataUrl(file.file));
    }
  }
  return used
    .map((font) => embeddedFontFaceCss(font, (file) => files.get(file) ?? null))
    .filter(Boolean)
    .join("\n");
}

/**
 * The picker's fonts, shelf by shelf, plus the faces the given artwork needs. `preview` also loads
 * one file per font, so an open picker can paint every name in its own face.
 */
export function useEditorFontLibrary(families: string[], { preview = false }: { preview?: boolean } = {}): {
  names: string[];
  shelves: { shelf: EditorFontShelf; label: string; names: string[] }[];
  fromManifest: boolean;
} {
  const [fonts, setFonts] = useState<EditorFontEntry[]>([]);
  useEffect(() => {
    let live = true;
    loadEditorFontLibrary().then((entries) => {
      if (live) setFonts(entries);
    });
    return () => { live = false; };
  }, []);
  const familyKey = families.join("|");
  useEffect(() => {
    if (!fonts.length) return;
    applyEditorFontFaces(fonts, familyKey ? familyKey.split("|") : []);
    if (preview) applyEditorFontPreviews(fonts);
  }, [fonts, familyKey, preview]);
  const names = useMemo(() => (fonts.length ? editorFontNames(fonts) : [...EDITOR_SYSTEM_FONTS]), [fonts]);
  const shelves = useMemo(() => fontShelfGroups(fonts), [fonts]);
  return { names, shelves, fromManifest: fonts.length > 0 };
}
