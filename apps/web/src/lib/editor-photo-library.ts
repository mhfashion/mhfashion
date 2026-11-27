"use client";

// Photos section of the Editor Sidebar.
//
// The shop's licensed photos live in R2 under `photos/<slug>/` and are listed by the asset service at
// `/api/assets/photos` (Plan §12.2.2). Until the first licensed photo is uploaded the panel shows the
// Lorem Picsum placeholders below, marked `placeholder`, so the section is never empty and nothing is
// sold on a picture the shop has no right to print. One catalogue answer with a photo retires them.
import { useEffect, useState } from "react";

import { publicAssetUrl } from "@/lib/asset-public-url";
import { R2_MOCKUP_BASE } from "@/lib/product-mockup";

export const PHOTO_SERVICE_PATH = "/api/assets/photos";
export const PHOTO_LIBRARY_STATUS = "placeholder-stock";

export type PhotoLibraryEntry = {
  id: string;
  name: string;
  /** Where the full picture is fetched from, when it is added to the canvas. */
  url: string;
  /** The small picture for the grid, so the panel does not download every full photo. */
  thumbUrl?: string;
  /** The photo's own pixel size, used to fit it onto the print canvas. */
  width: number;
  height: number;
  credit: string;
  /** True while the entry is a placeholder rather than a licensed photograph. */
  placeholder: boolean;
  /** The Myanmar name, tags and aliases, so the search finds a photo by any of them. */
  keywords?: string;
};

function picsum(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

export const MH_PHOTO_LIBRARY: PhotoLibraryEntry[] = [
  { id: "photo-tee-flatlay", name: "Tee flat lay", url: picsum("mh-tee-flatlay", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-street-portrait", name: "Street portrait", url: picsum("mh-street-portrait", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-studio-model", name: "Studio model", url: picsum("mh-studio-model", 1200, 1600), width: 1200, height: 1600, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-fabric-closeup", name: "Fabric close-up", url: picsum("mh-fabric-closeup", 1400, 1400), width: 1400, height: 1400, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-yangon-street", name: "Yangon street", url: picsum("mh-yangon-street", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-hoodie-hang", name: "Hoodie on a hanger", url: picsum("mh-hoodie-hang", 1200, 1500), width: 1200, height: 1500, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-team-jersey", name: "Team jersey", url: picsum("mh-team-jersey", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-print-detail", name: "Print detail", url: picsum("mh-print-detail", 1400, 1400), width: 1400, height: 1400, credit: "Lorem Picsum", placeholder: true },
  { id: "photo-cotton-texture", name: "Cotton texture", url: picsum("mh-cotton-texture", 1600, 1200), width: 1600, height: 1200, credit: "Lorem Picsum", placeholder: true },
];

/** One item of the `photos` catalogue, as the service answers it. */
export type PhotoCatalogueEntry = {
  slug: string;
  name: string;
  nameMy?: string;
  file: string;
  thumb: string;
  width: number;
  height: number;
  transparent?: boolean;
  tags?: string[];
  aliases?: string[];
  licence: { name: string; source: string; commercialPrintAllowed: boolean; credit: string };
};

function isPhotoCatalogueEntry(value: unknown): value is PhotoCatalogueEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<PhotoCatalogueEntry>;
  return typeof entry.slug === "string" && typeof entry.file === "string" && typeof entry.name === "string"
    && typeof entry.width === "number" && typeof entry.height === "number"
    && typeof entry.licence === "object" && entry.licence !== null;
}

/** A catalogue photo as the sidebar and the canvas read it. */
export function photoFromCatalogue(entry: PhotoCatalogueEntry, base: string = R2_MOCKUP_BASE): PhotoLibraryEntry {
  const keywords = [entry.nameMy, ...(entry.tags ?? []), ...(entry.aliases ?? [])].filter(Boolean).join(" ");
  return {
    id: `photo-${entry.slug}`,
    name: entry.name,
    url: publicAssetUrl(base, entry.file),
    thumbUrl: publicAssetUrl(base, entry.thumb),
    width: entry.width,
    height: entry.height,
    credit: entry.licence.credit || entry.licence.name,
    placeholder: false,
    keywords,
  };
}

/** The photos of one catalogue answer; an answer with no usable item is simply empty. */
export function photosFromCatalogue(payload: unknown, base: string = R2_MOCKUP_BASE): PhotoLibraryEntry[] {
  const items = (payload as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items.filter(isPhotoCatalogueEntry).map((entry) => photoFromCatalogue(entry, base));
}

/** The licensed photos the shop has uploaded. An empty list keeps the placeholders on screen. */
export async function loadPhotoLibrary(
  load: (url: string) => Promise<unknown>,
  base: string = R2_MOCKUP_BASE,
): Promise<PhotoLibraryEntry[]> {
  try {
    return photosFromCatalogue(await load(PHOTO_SERVICE_PATH), base);
  } catch {
    return [];
  }
}

/**
 * The photos the panel shows: the shop's own library once it has one, the placeholders until then.
 * `fromCatalogue` says which, so the panel only warns about placeholders while they are in use.
 */
export function useEditorPhotoLibrary(): { photos: PhotoLibraryEntry[]; fromCatalogue: boolean } {
  const [photos, setPhotos] = useState<PhotoLibraryEntry[]>(MH_PHOTO_LIBRARY);
  useEffect(() => {
    let live = true;
    loadPhotoLibrary(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return response.json();
    }).then((entries) => {
      if (live && entries.length) setPhotos(entries);
    });
    return () => { live = false; };
  }, []);
  return { photos, fromCatalogue: photos.length > 0 && !photos[0].placeholder };
}
