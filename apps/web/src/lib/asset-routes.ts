// Plan §12.1 part 6 and 9: what a catalogue route answers. The shape lives here, away from the
// Next route, so a test can check the status, the headers and the 304 without a server or a bucket.
import {
  ASSET_CATALOGUE_KINDS,
  catalogueSnapshotKey,
  readAssetCatalogue,
  type AssetCatalogue,
  type AssetCatalogueIssue,
  type AssetCatalogueKind,
} from "./asset-catalogue";
import type { AssetStore } from "./asset-store";

/** The snapshot store: the private bucket, or null when it is not bound in this environment. */
export type AssetSnapshotSource = AssetStore | null;

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
  store: AssetSnapshotSource,
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

export type AssetIssuesKindReport = {
  kind: AssetCatalogueKind;
  /** How many usable items the last snapshot holds. */
  items: number;
  builtAt: string | null;
  issues: AssetCatalogueIssue[];
};

/**
 * No timestamp of its own: each kind already carries when its snapshot was built, and a body that
 * changes on every request could never answer 304.
 */
export type AssetIssuesReport = {
  version: 1;
  kinds: AssetIssuesKindReport[];
  summary: { kinds: number; items: number; issues: number };
};

/**
 * Plan §12.1 part 10: what the shop could not use, read from the snapshots the rebuild already wrote.
 * Nothing is listed here that the catalogue does not already know, so this view cannot drift from what
 * the editor is served.
 */
export async function issuesResponse(
  store: AssetSnapshotSource,
  ifNoneMatch: string | null,
): Promise<AssetRouteResult> {
  const kinds: AssetIssuesKindReport[] = [];
  for (const kind of ASSET_CATALOGUE_KINDS) {
    const stored = store ? await readAssetCatalogue(store, kind) : null;
    if (stored) {
      kinds.push({ kind, items: stored.items.length, builtAt: stored.generatedAt, issues: stored.issues });
    } else {
      kinds.push({
        kind,
        items: 0,
        builtAt: null,
        issues: [{
          key: catalogueSnapshotKey(kind),
          reason: store ? "no snapshot has been built yet" : "the asset bucket is not bound in this environment",
        }],
      });
    }
  }
  const report: AssetIssuesReport = {
    version: 1,
    kinds,
    summary: {
      kinds: kinds.length,
      items: kinds.reduce((total, entry) => total + entry.items, 0),
      issues: kinds.reduce((total, entry) => total + entry.issues.length, 0),
    },
  };
  const result = jsonResult(200, report);
  if (etagMatches(ifNoneMatch, result.headers.etag)) {
    return { status: 304, headers: result.headers, body: "" };
  }
  return result;
}

export async function mockupResponse(
  store: AssetSnapshotSource,
  slug: string,
  ifNoneMatch: string | null,
  kind: string | null = null,
): Promise<AssetRouteResult> {
  if (!SLUG_PATTERN.test(slug)) {
    return jsonResult(400, { error: "invalid_slug" }, { "cache-control": "no-store" });
  }
  const stored = store
    ? await readAssetCatalogue<{ slug: string; kind: string; looks: { look: string; files: string[] }[]; files: string[] }>(store, "mockups")
    : null;
  const mockup = stored?.items.find((item) => item.slug === slug && (!kind || item.kind === kind));
  if (!mockup) {
    return jsonResult(404, { error: "no_mockups", slug }, { "cache-control": "no-store" });
  }
  const result = jsonResult(200, mockup);
  if (etagMatches(ifNoneMatch, result.headers.etag)) {
    return { status: 304, headers: result.headers, body: "" };
  }
  return result;
}
