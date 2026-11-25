// Plan §12.1 and §12.2: the asset service. One Worker, one file. It exports `fetch` (the read routes and
// the admin and private routes), `queue` (the rebuild an R2 event asks for) and `scheduled` (the hourly
// safety net). Every rule it applies is imported from the app's pure libraries by relative path, so the
// Worker, the site's own routes and the pre-upload check cannot disagree about a key, a type or a limit.
import { canReadPrivateAsset, canWriteAdmin, type AssetViewer } from "../apps/web/src/lib/asset-access";
import { rebuildAssetCatalogues, type CatalogueRebuildSummary } from "../apps/web/src/lib/asset-catalogue-rebuild";
import { kindsForAssetKeys } from "../apps/web/src/lib/asset-events";
import { MIME_BY_TYPE, sha256Hex } from "../apps/web/src/lib/asset-file-type";
import {
  ASSET_SHAPES,
  buildAssetKey,
  checkAssetContent,
  metaKeyForAssetKey,
  type AssetShapeId,
} from "../apps/web/src/lib/asset-keys";
import {
  catalogueResponse,
  isAssetCatalogueKind,
  issuesResponse,
  mockupResponse,
  type AssetRouteResult,
} from "../apps/web/src/lib/asset-routes";
import type { AssetBuckets } from "../apps/web/src/lib/asset-store";
import { createR2AssetStore, type R2BucketLike } from "../apps/web/src/lib/asset-store-cloudflare";
import { verifySupabaseUser, type SupabaseEnv } from "../apps/web/src/lib/asset-session";

export type AssetsEnv = SupabaseEnv & {
  MH_FASHION_ASSETS?: R2BucketLike;
  MH_FASHION_PRIVATE?: R2BucketLike;
  /** The site's address, the only origin a cross-origin read is allowed from. */
  ASSETS_SITE_ORIGIN?: string;
};

export type AssetsDeps = {
  /** The two stores; a test passes memory buckets, production reads the bindings. */
  buckets?: AssetBuckets;
  /** The caller, already resolved; `undefined` means "verify the request's token". */
  viewer?: AssetViewer;
  now?: () => Date;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
};

export type QueueMessage = { body: unknown; ack?: () => void; retry?: () => void };
export type QueueBatch = { messages: QueueMessage[] };

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function json(status: number, payload: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload, null, 2), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function cors(env: AssetsEnv): Record<string, string> {
  return env.ASSETS_SITE_ORIGIN ? { "access-control-allow-origin": env.ASSETS_SITE_ORIGIN, vary: "origin" } : {};
}

function routeResult(result: AssetRouteResult, env: AssetsEnv): Response {
  const headers = { ...result.headers, ...cors(env) };
  return new Response(result.status === 304 ? null : result.body, { status: result.status, headers });
}

function bucketsFor(env: AssetsEnv, deps: AssetsDeps | undefined): AssetBuckets | null {
  if (deps?.buckets) return deps.buckets;
  if (!env.MH_FASHION_ASSETS || !env.MH_FASHION_PRIVATE) return null;
  return {
    public: createR2AssetStore(env.MH_FASHION_ASSETS, "public"),
    private: createR2AssetStore(env.MH_FASHION_PRIVATE, "private"),
  };
}

async function viewerFor(request: Request, env: AssetsEnv, deps: AssetsDeps | undefined): Promise<AssetViewer> {
  if (deps && "viewer" in deps) return deps.viewer ?? null;
  return verifySupabaseUser(env, request, deps?.fetchImpl ?? fetch);
}

type AdminUpload = {
  shape: AssetShapeId;
  vars: Record<string, string>;
  meta: Record<string, unknown>;
  replace: boolean;
  data: Uint8Array;
};

function parseJson(text: string | null): Record<string, unknown> {
  if (!text) return {};
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** `multipart/form-data` (the form's own way) or JSON with the file as base64 (a script's way). */
async function readAdminUpload(request: Request): Promise<AdminUpload | { error: string }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const shape = String(form.get("shape") ?? "");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return { error: "a file is required" };
    if (!(shape in ASSET_SHAPES)) return { error: `unknown shape: ${shape}` };
    const bytes = new Uint8Array(await (file as Blob).arrayBuffer());
    return {
      shape: shape as AssetShapeId,
      vars: parseJson(String(form.get("vars") ?? "{}")) as Record<string, string>,
      meta: parseJson(String(form.get("meta") ?? "{}")),
      replace: ["1", "true", "yes"].includes(String(form.get("replace") ?? "").toLowerCase()),
      data: bytes,
    };
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return { error: "the body is not JSON" };
  }
  const shape = typeof body.shape === "string" ? body.shape : "";
  if (!(shape in ASSET_SHAPES)) return { error: `unknown shape: ${shape}` };
  if (typeof body.data !== "string") return { error: "data must be base64" };
  const vars = body.vars && typeof body.vars === "object" ? (body.vars as Record<string, string>) : {};
  const meta = body.meta && typeof body.meta === "object" ? (body.meta as Record<string, unknown>) : {};
  return {
    shape: shape as AssetShapeId,
    vars,
    meta,
    replace: body.replace === true,
    data: decodeBase64(body.data),
  };
}

/**
 * `PUT /api/admin/assets`: the shop's upload. The admin check is the Worker's own, the type comes from
 * the bytes, the key is built (never typed), an existing key is refused unless the form says replace,
 * and the catalogue is rebuilt at once (Plan §12.1 parts 5 and 8, §12.2.5).
 */
async function adminUpload(request: Request, env: AssetsEnv, deps: AssetsDeps | undefined, buckets: AssetBuckets): Promise<Response> {
  const viewer = await viewerFor(request, env, deps);
  if (!viewer) return json(401, { error: "sign_in_required" }, cors(env));
  if (!canWriteAdmin(viewer)) return json(403, { error: "admin_only" }, cors(env));

  const upload = await readAdminUpload(request);
  if ("error" in upload) return json(400, { error: "bad_request", reason: upload.error }, cors(env));

  let key: string;
  try {
    key = buildAssetKey(upload.shape, upload.vars);
  } catch (error) {
    return json(400, { error: "bad_key", reason: (error as Error).message }, cors(env));
  }
  const checked = checkAssetContent(key, upload.data);
  if (!checked.ok) return json(400, { error: "refused_file", reason: checked.reason }, cors(env));

  if (!upload.replace && (await buckets.public.head(key))) {
    return json(409, { error: "already_exists", key }, cors(env));
  }

  const body = checked.cleaned === undefined ? upload.data : new TextEncoder().encode(checked.cleaned);
  await buckets.public.putObject(key, body, {
    contentType: MIME_BY_TYPE[checked.type],
    customMetadata: { sha256: await sha256Hex(upload.data), uploader: viewer.id },
  });

  const metaKey = metaKeyForAssetKey(key);
  if (metaKey && Object.keys(upload.meta).length) {
    await buckets.public.put(metaKey, JSON.stringify(upload.meta, null, 2));
  }

  const kinds = kindsForAssetKeys(metaKey ? [key, metaKey] : [key]);
  const summary = await rebuildAssetCatalogues(buckets, deps?.now?.() ?? new Date(), deps?.log ?? (() => {}), kinds);
  return json(200, { key, metaKey, cleaned: checked.notes, rebuilt: summary.kinds.map((entry) => entry.kind) }, cors(env));
}

/** `GET /api/private/<key>`: the bytes of a private file, after the access check of Plan §12.2.6. */
async function privateFile(request: Request, env: AssetsEnv, deps: AssetsDeps | undefined, buckets: AssetBuckets, key: string): Promise<Response> {
  const viewer = await viewerFor(request, env, deps);
  if (!viewer) return json(401, { error: "sign_in_required" }, { "cache-control": "private, no-store" });
  if (!canReadPrivateAsset(viewer, key)) return json(403, { error: "not_yours" }, { "cache-control": "private, no-store" });
  const object = await buckets.private.getObject(key);
  if (!object) return json(404, { error: "not_found", key }, { "cache-control": "private, no-store" });
  // The bytes are already a buffer; the DOM type only names Blob and string parts.
  return new Response(object.body as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": object.contentType,
      "cache-control": "private, no-store",
      "content-length": String(object.size),
      ...(object.etag ? { etag: object.etag } : {}),
    },
  });
}

export async function handleRequest(request: Request, env: AssetsEnv, deps?: AssetsDeps): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors(env),
        "access-control-allow-methods": "GET, PUT, OPTIONS",
        "access-control-allow-headers": "authorization, content-type, if-none-match",
        "access-control-max-age": "86400",
      },
    });
  }

  const buckets = bucketsFor(env, deps);
  if (!buckets) return json(503, { error: "assets_unbound", reason: "MH_FASHION_ASSETS and MH_FASHION_PRIVATE must both be bound" });

  const ifNoneMatch = request.headers.get("if-none-match");

  if (request.method === "GET" || request.method === "HEAD") {
    if (path === "/api/admin/assets/issues") {
      const viewer = await viewerFor(request, env, deps);
      if (!viewer) return json(401, { error: "sign_in_required" }, cors(env));
      if (!canWriteAdmin(viewer)) return json(403, { error: "admin_only" }, cors(env));
      return routeResult(await issuesResponse(buckets.private, ifNoneMatch), env);
    }
    if (path === "/api/assets/issues") return routeResult(await issuesResponse(buckets.private, ifNoneMatch), env);
    const mockup = /^\/api\/assets\/mockups\/([^/]+)$/.exec(path);
    if (mockup) return routeResult(await mockupResponse(buckets.private, decodeURIComponent(mockup[1]), ifNoneMatch), env);
    const kind = /^\/api\/assets\/([^/]+)$/.exec(path);
    if (kind) {
      const name = decodeURIComponent(kind[1]);
      if (!isAssetCatalogueKind(name)) return json(404, { error: "unknown_kind", kind: name }, cors(env));
      return routeResult(await catalogueResponse(buckets.private, name, ifNoneMatch), env);
    }
    if (path.startsWith("/api/private/")) {
      return privateFile(request, env, deps, buckets, decodeURIComponent(path.slice("/api/private/".length)));
    }
  }

  if (request.method === "PUT" && path === "/api/admin/assets") return adminUpload(request, env, deps, buckets);

  return json(404, { error: "not_found", path }, cors(env));
}

/** The keys an R2 event names. R2 sends one message per object, and a batch may carry a list. */
export function keysFromQueueMessage(body: unknown): string[] {
  if (!body || typeof body !== "object") return [];
  const record = body as { object?: { key?: unknown }; key?: unknown; events?: unknown };
  const keys: string[] = [];
  if (typeof record.key === "string") keys.push(record.key);
  if (record.object && typeof record.object.key === "string") keys.push(record.object.key);
  if (Array.isArray(record.events)) {
    for (const event of record.events) keys.push(...keysFromQueueMessage(event));
  }
  return keys;
}

/** Plan §12.2.9: one message rebuilds the kinds it names, and nothing else. */
export async function handleQueue(batch: QueueBatch, env: AssetsEnv, deps?: AssetsDeps): Promise<CatalogueRebuildSummary> {
  const buckets = bucketsFor(env, deps);
  const kinds = new Set<string>();
  for (const message of batch.messages) {
    for (const kind of kindsForAssetKeys(keysFromQueueMessage(message.body))) kinds.add(kind);
    message.ack?.();
  }
  if (!buckets) throw new Error("assets_unbound: MH_FASHION_ASSETS and MH_FASHION_PRIVATE must both be bound");
  if (!kinds.size) return { kinds: [], written: 0, issues: 0 };
  return rebuildAssetCatalogues(
    buckets,
    deps?.now?.() ?? new Date(),
    deps?.log ?? ((line) => console.log(line)),
    [...kinds].sort() as Parameters<typeof rebuildAssetCatalogues>[3],
  );
}

/** The hourly safety net: a full pass, in case an event was lost. */
export async function handleScheduled(env: AssetsEnv, deps?: AssetsDeps): Promise<CatalogueRebuildSummary> {
  const buckets = bucketsFor(env, deps);
  if (!buckets) throw new Error("assets_unbound: MH_FASHION_ASSETS and MH_FASHION_PRIVATE must both be bound");
  return rebuildAssetCatalogues(buckets, deps?.now?.() ?? new Date(), deps?.log ?? ((line) => console.log(line)));
}

export default {
  fetch: (request: Request, env: AssetsEnv) => handleRequest(request, env),
  queue: async (batch: QueueBatch, env: AssetsEnv) => {
    await handleQueue(batch, env);
  },
  scheduled: async (_controller: unknown, env: AssetsEnv) => {
    await handleScheduled(env);
  },
};
