// Plan §12.1 part 1: the R2 binding is the only thing in the app that talks to the bucket. The
// types below are structural on purpose, so this module compiles without the Workers type package
// and a test can pass a plain object.
import type { AssetStore } from "@/lib/asset-store";

type R2ObjectBody = { text(): Promise<string> };

type R2ListResult = {
  objects: { key: string }[];
  truncated?: boolean;
  cursor?: string;
};

/** The part of an R2 bucket binding this service uses. */
export type R2BucketLike = {
  list(options: { prefix: string; cursor?: string; limit?: number }): Promise<R2ListResult>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: string, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
};

export function createR2AssetStore(bucket: R2BucketLike): AssetStore {
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
      await bucket.put(key, body, { httpMetadata: { contentType: "application/json; charset=utf-8" } });
    },
    async delete(key) {
      await bucket.delete(key);
    },
  };
}

/**
 * The store for the current request, or `null` when the bucket is not bound (local `next start`,
 * tests, a preview without the binding). A null store is answered with an empty catalogue and a
 * named issue, never a crash, so the editor keeps its system fonts.
 */
export async function resolveAssetStore(): Promise<AssetStore | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as { env?: Record<string, unknown> };
    const bucket = context?.env?.MH_FASHION_ASSETS;
    if (!bucket) return null;
    return createR2AssetStore(bucket as R2BucketLike);
  } catch {
    return null;
  }
}
