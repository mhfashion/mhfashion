"use client";

import { useEffect, useState } from "react";

import { publicAssetUrl } from "@/lib/asset-public-url";
import type { DesignLibraryLayer, DesignLibraryLayerKind } from "@/lib/editor-design-library";
import type { EditorShapePath } from "@/lib/editor-layers";
import { svgShapePaths } from "@/lib/editor-svg-shapes";
import { R2_MOCKUP_BASE } from "@/lib/product-mockup";

// Patterns section of the Editor Sidebar.
//
// A pattern is a shape layer whose paths already tile the whole 1000 x 1200 artwork space, so
// adding one gives the customer a full-canvas texture they can move, scale and rotate with the
// tools they already have. The paths are generated here rather than stored as SVG files: no
// network, no bucket listing, and the tiles stay in step with the artwork space if it changes.

const ARTWORK_WIDTH = 1000;
const ARTWORK_HEIGHT = 1200;

export type PatternLibraryEntry = {
  id: string;
  name: string;
  /** Painted geometry, in artwork units, already covering the canvas. */
  paths: EditorShapePath[];
  /** The Myanmar name and the tags, so the search finds a pattern by any of them. */
  keywords?: string;
};

function dotTile(step: number, radius: number, color: string): EditorShapePath[] {
  const dots: string[] = [];
  for (let y = step / 2; y < ARTWORK_HEIGHT; y += step) {
    for (let x = step / 2; x < ARTWORK_WIDTH; x += step) {
      dots.push(
        `M ${x - radius} ${y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`,
      );
    }
  }
  return [{ d: dots.join(" "), fill: color, stroke: "none" }];
}

/**
 * 45-degree bars, each trimmed to the artwork rectangle. Drawing them as unclipped
 * parallelograms works visually but doubles the layer's bounds (the transform box then
 * hangs a canvas-width off each side), so the segment is solved against the rect instead.
 */
function stripeTile(gap: number, width: number, color: string): EditorShapePath[] {
  const bars: string[] = [];
  for (let offset = 0; offset <= ARTWORK_WIDTH + ARTWORK_HEIGHT; offset += gap) {
    // The bar runs down-left: x = offset - y.
    const startY = Math.max(0, offset - ARTWORK_WIDTH);
    const endY = Math.min(ARTWORK_HEIGHT, offset);
    if (endY <= startY) continue;
    bars.push(`M ${offset - startY} ${startY} L ${offset - endY} ${endY}`);
  }
  return [{ d: bars.join(" "), stroke: color, strokeWidth: width, fill: "none" }];
}

function lineTile(step: number, width: number, color: string): EditorShapePath[] {
  const bars: string[] = [];
  for (let y = step / 2; y < ARTWORK_HEIGHT; y += step) {
    bars.push(`M 0 ${y} H ${ARTWORK_WIDTH} V ${y + width} H 0 Z`);
  }
  return [{ d: bars.join(" "), fill: color, stroke: "none" }];
}

function gridTile(step: number, width: number, color: string): EditorShapePath[] {
  const lines: string[] = [];
  for (let y = 0; y <= ARTWORK_HEIGHT; y += step) lines.push(`M 0 ${y} H ${ARTWORK_WIDTH}`);
  for (let x = 0; x <= ARTWORK_WIDTH; x += step) lines.push(`M ${x} 0 V ${ARTWORK_HEIGHT}`);
  return [{ d: lines.join(" "), stroke: color, strokeWidth: width, fill: "none" }];
}

function waveTile(step: number, width: number, color: string): EditorShapePath[] {
  const waves: string[] = [];
  const amplitude = step / 4;
  const segment = step / 2;
  const segments = Math.ceil(ARTWORK_WIDTH / segment) + 1;
  for (let y = step / 2; y < ARTWORK_HEIGHT; y += step) {
    const row = [`M 0 ${y} q ${segment / 2} -${amplitude} ${segment} 0`];
    for (let index = 1; index < segments; index += 1) row.push(`t ${segment} 0`);
    waves.push(row.join(" "));
  }
  return [{ d: waves.join(" "), stroke: color, strokeWidth: width, fill: "none" }];
}

function checkerTile(size: number, color: string): EditorShapePath[] {
  const squares: string[] = [];
  for (let row = 0; row * size < ARTWORK_HEIGHT; row += 1) {
    for (let column = 0; column * size < ARTWORK_WIDTH; column += 1) {
      if ((row + column) % 2 === 0) continue;
      squares.push(`M ${column * size} ${row * size} h ${size} v ${size} h -${size} Z`);
    }
  }
  return [{ d: squares.join(" "), fill: color, stroke: "none" }];
}

function crossTile(step: number, size: number, width: number, color: string): EditorShapePath[] {
  const crosses: string[] = [];
  for (let y = step / 2; y < ARTWORK_HEIGHT; y += step) {
    for (let x = step / 2; x < ARTWORK_WIDTH; x += step) {
      crosses.push(`M ${x - size} ${y} H ${x + size}`, `M ${x} ${y - size} V ${y + size}`);
    }
  }
  return [{ d: crosses.join(" "), stroke: color, strokeWidth: width, fill: "none" }];
}

function terrazzoTile(step: number, color: string): EditorShapePath[] {
  const chips: string[] = [];
  let seed = 7;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let y = step / 2; y < ARTWORK_HEIGHT; y += step) {
    for (let x = step / 2; x < ARTWORK_WIDTH; x += step) {
      const radius = step * (0.08 + next() * 0.1);
      const drift = step * (next() - 0.5) * 0.4;
      chips.push(
        `M ${x - radius} ${y + drift} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0`,
      );
    }
  }
  return [{ d: chips.join(" "), fill: color, stroke: "none" }];
}

export const MH_PATTERN_LIBRARY: PatternLibraryEntry[] = [
  { id: "pattern-dots", name: "Dots", paths: dotTile(90, 12, "#111827") },
  { id: "pattern-micro-dots", name: "Micro dots", paths: dotTile(40, 3.5, "#4c9d16") },
  { id: "pattern-stripes", name: "Diagonal stripes", paths: stripeTile(120, 34, "#111827") },
  { id: "pattern-hairlines", name: "Hairlines", paths: lineTile(36, 6, "#1f2937") },
  { id: "pattern-grid", name: "Grid", paths: gridTile(100, 4, "#1f2937") },
  { id: "pattern-waves", name: "Waves", paths: waveTile(120, 8, "#111827") },
  { id: "pattern-checker", name: "Checker", paths: checkerTile(100, "#111827") },
  { id: "pattern-crosses", name: "Crosses", paths: crossTile(120, 18, 6, "#4c9d16") },
  { id: "pattern-terrazzo", name: "Terrazzo", paths: terrazzoTile(150, "#1f2937") },
];

/** A pattern enters the canvas through the same element path the Elements section uses. */
export function patternToDesignLayer(pattern: PatternLibraryEntry): DesignLibraryLayer {
  const kind: DesignLibraryLayerKind = "shape";
  return {
    id: pattern.id,
    designId: "patterns",
    designName: "Patterns",
    name: pattern.name,
    kind,
    paths: pattern.paths,
    text: null,
  };
}

export const MH_PATTERN_LAYERS: DesignLibraryLayer[] = MH_PATTERN_LIBRARY.map(patternToDesignLayer);

// Patterns the shop adds later live in R2 under `patterns/<slug>/pattern.svg` and are listed by the asset
// service at `/api/assets/patterns` (Plan §12.2.2). The nine above stay in code and are shown first, so
// the section works with no bucket at all; a catalogue pattern is read into the same shape paths.
export const PATTERN_SERVICE_PATH = "/api/assets/patterns";

/** What a card's background should be, so a light pattern is not painted on a white card. */
export type PatternInk = "dark" | "light" | "color";

export type PatternCatalogueEntry = {
  slug: string;
  name: string;
  nameMy?: string;
  ink: PatternInk;
  file: string;
  tags?: string[];
};

function isPatternCatalogueEntry(value: unknown): value is PatternCatalogueEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<PatternCatalogueEntry>;
  return typeof entry.slug === "string" && typeof entry.name === "string" && typeof entry.file === "string";
}

/** One catalogue pattern, painted from its SVG. A file with nothing a shape can carry is dropped. */
export function patternFromCatalogue(entry: PatternCatalogueEntry, svg: string): PatternLibraryEntry | null {
  const { paths } = svgShapePaths(svg);
  if (!paths.length) return null;
  const keywords = [entry.nameMy, ...(entry.tags ?? [])].filter(Boolean).join(" ");
  return { id: `pattern-${entry.slug}`, name: entry.name, paths, keywords };
}

export type CataloguePatternLayer = { layer: DesignLibraryLayer; ink: PatternInk; keywords: string };

/**
 * The shop's own patterns, after the nine built-in ones. A pattern whose SVG cannot be read is skipped
 * rather than shown as an empty card, and the catalogue's issue list already says why it was refused.
 */
export async function loadCataloguePatterns(
  load: (url: string) => Promise<unknown>,
  loadSvg: (url: string) => Promise<string>,
  base: string = R2_MOCKUP_BASE,
): Promise<CataloguePatternLayer[]> {
  let payload: unknown;
  try {
    payload = await load(PATTERN_SERVICE_PATH);
  } catch {
    return [];
  }
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  const loaded: CataloguePatternLayer[] = [];
  for (const item of items.filter(isPatternCatalogueEntry)) {
    try {
      const pattern = patternFromCatalogue(item, await loadSvg(publicAssetUrl(base, item.file)));
      if (pattern) {
        loaded.push({ layer: patternToDesignLayer(pattern), ink: item.ink ?? "dark", keywords: pattern.keywords ?? "" });
      }
    } catch {
      // A file that cannot be fetched leaves the built-ins alone.
    }
  }
  return loaded;
}

/** The nine built-in patterns first, then the shop's own; `inkByLayerId` colours their cards. */
export function useEditorPatternLibrary(): {
  layers: DesignLibraryLayer[];
  inkByLayerId: Record<string, PatternInk>;
  /** The Myanmar name and tags of a catalogue pattern, so the search can reach them. */
  keywordsByLayerId: Record<string, string>;
  fromCatalogue: boolean;
} {
  const [added, setAdded] = useState<CataloguePatternLayer[]>([]);
  useEffect(() => {
    let live = true;
    loadCataloguePatterns(
      async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} answered ${response.status}`);
        return response.json();
      },
      async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} answered ${response.status}`);
        return response.text();
      },
    ).then((patterns) => {
      if (live) setAdded(patterns);
    });
    return () => { live = false; };
  }, []);
  const inkByLayerId: Record<string, PatternInk> = {};
  const keywordsByLayerId: Record<string, string> = {};
  for (const entry of added) {
    inkByLayerId[entry.layer.id] = entry.ink;
    keywordsByLayerId[entry.layer.id] = entry.keywords ?? "";
  }
  return {
    layers: added.length ? [...MH_PATTERN_LAYERS, ...added.map((entry) => entry.layer)] : MH_PATTERN_LAYERS,
    inkByLayerId,
    keywordsByLayerId,
    fromCatalogue: added.length > 0,
  };
}
