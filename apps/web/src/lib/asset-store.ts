// Plan §12.1 part 2 and §12.2: the one way the app reaches the asset buckets. The R2 bindings are
// the implementations in production; tests and local runs use `createMemoryAssetBuckets`, so the
// catalogue builders never know which one they are reading.
//
// Two buckets (Plan §12.2.1): `mh-fashion-assets` is public and holds pictures, fonts and artwork;
// `mh-fashion-private` holds anything about a customer or an order, and the catalogue snapshots
// (their `issues` list names what is broken, which is not public information).

/** Public bucket prefixes. Nothing under them is secret, so a visitor may guess any key. */
export const PUBLIC_ASSET_KEY_PREFIXES = [
  "fonts/",
  "designs/",
  "elements/",
  "photos/",
  "patterns/",
  "brushes/",
  "text-styles/",
  "mockups/",
  "models/",
  "textures/",
  "posts/",
  "jersey-mockups/",
  "site/",
] as const;

/** Private bucket prefixes. Reached only by code that checked who is asking (Plan §12.2.6). */
export const PRIVATE_ASSET_KEY_PREFIXES = [
  "catalog/",
  "users/",
  "tmp/",
  "orders/",
  "licences/",
] as const;

/** Every key the asset service will touch starts with one of these. Nothing else is reachable. */
export const ASSET_KEY_PREFIXES = [...PUBLIC_ASSET_KEY_PREFIXES, ...PRIVATE_ASSET_KEY_PREFIXES] as const;

export type AssetKeyPrefix = (typeof ASSET_KEY_PREFIXES)[number];
export type AssetBucketName = "public" | "private";

export function assetKeyPrefixesFor(bucket: AssetBucketName): readonly AssetKeyPrefix[] {
  return bucket === "private" ? PRIVATE_ASSET_KEY_PREFIXES : PUBLIC_ASSET_KEY_PREFIXES;
}

/** The Cache-Control class of Plan §12.2.4, chosen by prefix, so a write cannot pick the wrong one. */
export const ASSET_CACHE_CONTROL = {
  immutable: "public, max-age=31536000, immutable",
  revalidate: "public, max-age=300, stale-while-revalidate=86400",
  private: "private, no-store",
} as const;

/** A changed font, brush tip or texture gets a new name, so its old copy may be cached forever. */
const IMMUTABLE_ASSET_PREFIXES = ["fonts/", "brushes/", "textures/"] as const;

export function assetCacheControl(key: string): string {
  if (PRIVATE_ASSET_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))) return ASSET_CACHE_CONTROL.private;
  if (IMMUTABLE_ASSET_PREFIXES.some((prefix) => key.startsWith(prefix))) return ASSET_CACHE_CONTROL.immutable;
  return ASSET_CACHE_CONTROL.revalidate;
}

/** One page of a listing. `cursor` is the last key of the page; `null` means the listing ended. */
export type AssetStorePage = { keys: string[]; cursor: string | null };

/** A file as it is stored: the bytes plus what a reader needs to serve them. */
export type AssetObject = {
  key: string;
  body: Uint8Array;
  contentType: string;
  cacheControl: string | null;
  size: number;
  etag: string | null;
  customMetadata: Record<string, string>;
  /** When the object was written, ISO 8601, or `null` when the bucket cannot say. */
  uploadedAt: string | null;
};

/** What `head` reports without fetching the bytes (Plan §12.2.12 item 1). */
export type AssetObjectHead = Omit<AssetObject, "body">;

export type AssetPutOptions = {
  contentType: string;
  /** Defaults to the class `assetCacheControl` picks for the key. */
  cacheControl?: string;
  /** `sha256` and the uploader go here (Plan §12.2.5). */
  customMetadata?: Record<string, string>;
};

export type AssetPutBody = Uint8Array | ArrayBuffer | string;

export type AssetStore = {
  list(prefix: string, cursor?: string | null): Promise<AssetStorePage>;
  /** The object as text: `meta.json` and the catalogue snapshots. */
  get(key: string): Promise<string | null>;
  /** Replace an object with text: JSON, and only JSON. Binary files use `putObject`. */
  put(key: string, body: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** The object as bytes, with the metadata a route needs to serve it. */
  getObject(key: string): Promise<AssetObject | null>;
  /** Write a file with the caller's content type, cache class and custom metadata. */
  putObject(key: string, body: AssetPutBody, options: AssetPutOptions): Promise<void>;
  /** Size, content type and ETag without the bytes. */
  head(key: string): Promise<AssetObjectHead | null>;
};

/** The two buckets of Plan §12.2.1, as the code sees them: a public source and a private snapshot store. */
export type AssetBuckets = { public: AssetStore; private: AssetStore };

const MAX_KEY_LENGTH = 512;

/**
 * A bucket-relative key, and nothing that could escape the bucket: no scheme, no absolute path,
 * no `..` segment, no backslash and no empty segment. The font loader refuses the same shapes.
 * With a bucket name the key must also sit under that bucket's own prefixes.
 */
export function isSafeAssetKey(key: string, bucket?: AssetBucketName): boolean {
  if (!key || key.length > MAX_KEY_LENGTH) return false;
  if (key !== key.trim()) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("\\") || key.includes("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(key)) return false;
  const segments = key.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return false;
  const prefixes = bucket ? assetKeyPrefixesFor(bucket) : ASSET_KEY_PREFIXES;
  return prefixes.some((prefix) => key.startsWith(prefix));
}

export function assertSafeAssetKey(key: string, bucket?: AssetBucketName): void {
  if (!isSafeAssetKey(key, bucket)) throw new Error(`refused asset key: ${key}`);
}

function toBytes(body: AssetPutBody): Uint8Array {
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return body;
  return new Uint8Array(body);
}

export type MemoryAssetStore = AssetStore & {
  /** Text objects: `meta.json` and the snapshots. */
  readonly files: Map<string, string>;
  /** Binary objects: pictures, fonts and photos. */
  readonly objects: Map<string, AssetObject>;
  /** How many writes landed, so a test can prove a snapshot was not rewritten. */
  readonly writes: string[];
  /** Write times, so a test can age a file the way a day of use would. */
  readonly writtenAt: Map<string, string>;
};

/**
 * An in-memory bucket for tests and local work. `pageSize` is deliberately small in tests so a
 * listing has to follow the cursor, which is the behaviour the R2 listing has too.
 */
export function createMemoryAssetStore(
  entries: Record<string, string> = {},
  options: { pageSize?: number; now?: () => Date } = {},
): MemoryAssetStore {
  const files = new Map<string, string>(Object.entries(entries));
  const objects = new Map<string, AssetObject>();
  const writes: string[] = [];
  const writtenAt = new Map<string, string>();
  const pageSize = Math.max(1, Math.floor(options.pageSize ?? 1000));

  return {
    files,
    objects,
    writes,
    writtenAt,
    async list(prefix, cursor = null) {
      const keys = [...new Set([...files.keys(), ...objects.keys()])]
        .filter((key) => key.startsWith(prefix))
        .sort();
      const start = cursor ? keys.findIndex((key) => key > cursor) : 0;
      const from = start < 0 ? keys.length : start;
      const page = keys.slice(from, from + pageSize);
      const last = page[page.length - 1];
      return { keys: page, cursor: last && from + page.length < keys.length ? last : null };
    },
    async get(key) {
      assertSafeAssetKey(key);
      return files.has(key) ? files.get(key)! : null;
    },
    async put(key, body) {
      assertSafeAssetKey(key);
      files.set(key, body);
      objects.delete(key);
      writtenAt.set(key, (options.now?.() ?? new Date()).toISOString());
      writes.push(key);
    },
    async delete(key) {
      assertSafeAssetKey(key);
      files.delete(key);
      objects.delete(key);
      writtenAt.delete(key);
    },
    async getObject(key) {
      assertSafeAssetKey(key);
      const stored = objects.get(key);
      if (stored) return { ...stored, body: stored.body.slice() };
      const text = files.get(key);
      if (text === undefined) return null;
      const body = new TextEncoder().encode(text);
      return {
        key,
        body,
        contentType: "application/json; charset=utf-8",
        cacheControl: null,
        size: body.byteLength,
        etag: null,
        customMetadata: {},
        uploadedAt: writtenAt.get(key) ?? null,
      };
    },
    async putObject(key, body, putOptions) {
      assertSafeAssetKey(key);
      const bytes = toBytes(body);
      const at = (options.now?.() ?? new Date()).toISOString();
      writtenAt.set(key, at);
      objects.set(key, {
        key,
        body: bytes,
        contentType: putOptions.contentType,
        cacheControl: putOptions.cacheControl ?? assetCacheControl(key),
        size: bytes.byteLength,
        etag: null,
        customMetadata: putOptions.customMetadata ?? {},
        uploadedAt: at,
      });
      files.delete(key);
      writes.push(key);
    },
    async head(key) {
      assertSafeAssetKey(key);
      const stored = objects.get(key);
      if (stored) {
        return {
          key: stored.key,
          contentType: stored.contentType,
          cacheControl: stored.cacheControl,
          size: stored.size,
          etag: stored.etag,
          customMetadata: stored.customMetadata,
          uploadedAt: stored.uploadedAt,
        };
      }
      const text = files.get(key);
      if (text === undefined) return null;
      return {
        key,
        contentType: "application/json; charset=utf-8",
        cacheControl: null,
        size: new TextEncoder().encode(text).byteLength,
        etag: null,
        customMetadata: {},
        uploadedAt: writtenAt.get(key) ?? null,
      };
    },
  };
}

/** The two buckets a test or a local run passes to the builders. */
export function createMemoryAssetBuckets(
  publicEntries: Record<string, string> = {},
  privateEntries: Record<string, string> = {},
  options: { pageSize?: number; now?: () => Date } = {},
): { public: MemoryAssetStore; private: MemoryAssetStore } {
  return {
    public: createMemoryAssetStore(publicEntries, options),
    private: createMemoryAssetStore(privateEntries, options),
  };
}
