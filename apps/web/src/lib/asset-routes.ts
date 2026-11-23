// Plan §12.1 part 6 and 9: what a catalogue route answers. The shape lives here, away from the
// Next route, so a test can check the status, the headers and the 304 without a server or a bucket.
import {
  ASSET_CATALOGUE_KINDS,
  catalogueSnapshotKey,
  readAssetCatalogue,
  type AssetCatalogue,
  type AssetCatalogueIssue,
  type AssetCatalogueKind,
} from "@/lib/asset-catalogue";
import type { AssetStore } from "@/lib/asset-store";

/** JSON is cacheable for a minute and stays usable while the next copy is fetched. */
export const CATALOGUE_CACHE_CONTROL = "public, max-age=60, stale-while-revalidate=600";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type AssetRouteResult = {
  status: number;
  headers: Record<string, string>;
  body: string;
};

export function isAssetCatalogueKind(value: string): value is AssetCatalogueKind {
  return (ASSET_CATALOGUE_KINDS as readonly string[]).includes(value);
}

/** FNV-1a over the body: short, stable and synchronous, which is all an ETag needs here. */
export function bodyEtag(body: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < body.length; index += 1) {
    hash ^= body.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `"${hash.toString(16).padStart(8, "0")}"`;
}

/** `If-None-Match` may carry a list, a `W/` prefix or `*`. */
export function etagMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === "*") return true;
  const plain = (value: string) => value.trim().replace(/^W\//, "");
  return header.split(",").some((candidate) => plain(candidate) === plain(etag));
}

function jsonResult(status: number, payload: unknown, extra: Record<string, string> = {}): AssetRouteResult {
  const body = JSON.stringify(payload, null, 2);
  return {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CATALOGUE_CACHE_CONTROL,
      etag: bodyEtag(body),
      ...extra,
    },
    body,
  };
}

function emptyCatalogue<T>(kind: AssetCatalogueKind, reason: string, now: Date): AssetCatalogue<T> {
  return {
    version: 1,
    kind,
    generatedAt: now.toISOString(),
    items: [],
    issues: [{ key: catalogueSnapshotKey(kind), reason }],
  };
}

/** The editor reads `{ fonts, skipped }`, which is the shape `parseEditorFontManifest` already takes. */
function fontPayload(catalogue: AssetCatalogue<unknown>): { fonts: unknown[]; skipped: { slug: string; reason: string }[] } {
  return {
    fonts: catalogue.items,
    skipped: catalogue.issues.map((issue: AssetCatalogueIssue) => ({ slug: issue.key, reason: issue.reason })),
  };
}

export async function catalogueResponse(
  store: AssetStore | null,
  kind: AssetCatalogueKind,
  ifNoneMatch: string | null,
  now: Date = new Date(),
): Promise<AssetRouteResult> {
  const stored = store ? await readAssetCatalogue(store, kind) : null;
  const catalogue = stored ?? emptyCatalogue(
    kind,
    store ? "no snapshot has been built yet" : "the asset bucket is not bound in this environment",
    now,
  );
  const payload = kind === "fonts" ? fontPayload(catalogue) : catalogue;
  const result = jsonResult(200, payload);
  if (etagMatches(ifNoneMatch, result.headers.etag)) {
    return { status: 304, headers: result.headers, body: "" };
  }
  return result;
}

export async function mockupResponse(
  store: AssetStore | null,
  slug: string,
  ifNoneMatch: string | null,
): Promise<AssetRouteResult> {
  if (!SLUG_PATTERN.test(slug)) {
    return jsonResult(400, { error: "invalid_slug" }, { "cache-control": "no-store" });
  }
  const stored = store ? await readAssetCatalogue<{ slug: string; files: string[] }>(store, "mockups") : null;
  const mockup = stored?.items.find((item) => item.slug === slug);
  if (!mockup) {
    return jsonResult(404, { error: "no_mockups", slug }, { "cache-control": "no-store" });
  }
  const result = jsonResult(200, mockup);
  if (etagMatches(ifNoneMatch, result.headers.etag)) {
    return { status: 304, headers: result.headers, body: "" };
  }
  return result;
}
