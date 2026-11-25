// Plan §12.1 part 1 and §12.2: the R2 bindings are the only thing in the app that talks to the
// buckets. The store itself lives in `asset-store-cloudflare.ts`, which the assets Worker bundles; this
// module only resolves the bindings for a Next request.
import type { AssetBuckets, AssetStore } from "./asset-store";
import { createR2AssetStore, type R2BucketLike } from "./asset-store-cloudflare";

export { createR2AssetStore };
export type { R2BucketLike };

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
