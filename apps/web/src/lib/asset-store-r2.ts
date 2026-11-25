// Plan §12.1 part 1 and §12.2: the R2 bindings are the only thing in the app that talks to the
// buckets. The types below are structural on purpose, so this module compiles without the Workers
// type package and a test can pass a plain object.
import { assetCacheControl, assertSafeAssetKey, type AssetBuckets, type AssetStore } from "@/lib/asset-store";

type R2ObjectBodyLike = {
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  size?: number;
  etag?: string;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
};

type R2ObjectHeadLike = Omit<R2ObjectBodyLike, "text" | "arrayBuffer">;

type R2ListResult = {
  objects: { key: string }[];
  truncated?: boolean;
  cursor?: string;
};

/** The part of an R2 bucket binding this service uses. */
export type R2BucketLike = {
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<R2ListResult>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  head(key: string): Promise<R2ObjectHeadLike | null>;
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  delete(key: string): Promise<void>;
};

const DEFAULT_CONTENT_TYPE = "application/json; charset=utf-8";

export function createR2AssetStore(bucket: R2BucketLike, name: "public" | "private" = "public"): AssetStore {
  return {
    async list(prefix, cursor = null) {
      const page = await bucket.list({ prefix, ...(cursor ? { cursor } : {}) });
      return { keys: page.objects.map((object) => object.key), cursor: page.truncated ? page.cursor ?? null : null };
    },
    async get(key) {
      const object = await bucket.get(key);
      return object ? object.text() : null;
    },
    async put(key, body) {
      assertSafeAssetKey(key, name);
      await bucket.put(key, body, {
        httpMetadata: { contentType: DEFAULT_CONTENT_TYPE, cacheControl: assetCacheControl(key) },
      });
    },
    async delete(key) {
      await bucket.delete(key);
    },
    async getObject(key) {
      assertSafeAssetKey(key, name);
      const object = await bucket.get(key);
      if (!object) return null;
      const body = new Uint8Array(await object.arrayBuffer());
      return {
        key,
        body,
        contentType: object.httpMetadata?.contentType ?? DEFAULT_CONTENT_TYPE,
        cacheControl: object.httpMetadata?.cacheControl ?? null,
        size: object.size ?? body.byteLength,
        etag: object.etag ?? null,
        customMetadata: object.customMetadata ?? {},
      };
    },
    async putObject(key, body, options) {
      assertSafeAssetKey(key, name);
      await bucket.put(key, body as ArrayBuffer | Uint8Array | string, {
        httpMetadata: {
          contentType: options.contentType,
          cacheControl: options.cacheControl ?? assetCacheControl(key),
        },
        ...(options.customMetadata ? { customMetadata: options.customMetadata } : {}),
      });
    },
    async head(key) {
      assertSafeAssetKey(key, name);
      const object = await bucket.head(key);
      if (!object) return null;
      return {
        key,
        contentType: object.httpMetadata?.contentType ?? DEFAULT_CONTENT_TYPE,
        cacheControl: object.httpMetadata?.cacheControl ?? null,
        size: object.size ?? 0,
        etag: object.etag ?? null,
        customMetadata: object.customMetadata ?? {},
      };
    },
  };
}

/**
 * The two stores for the current request, or `null` when the buckets are not bound (local
 * `next start`, tests, a preview without the bindings). A null pair is answered with an empty
 * catalogue and a named issue, never a crash, so the editor keeps its system fonts.
 *
 * Both bindings are required: the snapshots live in the private bucket, and a missing one must not
 * quietly send them to the public bucket (Plan §12.2.12 item 2).
 */
export async function resolveAssetBuckets(): Promise<AssetBuckets | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as { env?: Record<string, unknown> };
    const publicBucket = context?.env?.MH_FASHION_ASSETS;
    const privateBucket = context?.env?.MH_FASHION_PRIVATE;
    if (!publicBucket || !privateBucket) return null;
    return {
      public: createR2AssetStore(publicBucket as R2BucketLike, "public"),
      private: createR2AssetStore(privateBucket as R2BucketLike, "private"),
    };
  } catch {
    return null;
  }
}
