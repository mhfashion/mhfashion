// Plan §12.1 part 1: the R2 binding is the only thing in the app that talks to the bucket, and this
// module is the half the separate assets Worker can bundle (it imports nothing but the store contract).
// The types are structural on purpose, so this module compiles without the Workers type package and a
// test can pass a plain object.
import { assetCacheControl, assertSafeAssetKey, type AssetStore } from "./asset-store";

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

