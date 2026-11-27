// Plan §12.2.7: a photo that no saved design uses is kept for 24 hours and then deleted. The bucket's
// lifecycle rule is the backstop; this sweep is the part the Worker can run from its hourly cron, so a
// local bucket — and a bucket whose rule was never configured — behaves the same as production.
import type { AssetStore } from "./asset-store";

export const TMP_SWEEP_PREFIX = "tmp/";
export const TMP_SWEEP_AGE_MS = 24 * 60 * 60 * 1000;

export type TmpSweepResult = {
  /** Every key the listing returned. */
  scanned: number;
  deleted: string[];
  /** A file the bucket could not date: kept, and named, because deleting on a guess loses a photo. */
  undated: string[];
};

/**
 * Delete the temporary uploads older than `maxAgeMs`. A file with no write time is kept and reported —
 * a customer's photo is never deleted because a bucket forgot to say when it arrived.
 */
export async function sweepTemporaryUploads(
  store: AssetStore,
  now: Date = new Date(),
  options: { maxAgeMs?: number; log?: (line: string) => void } = {},
): Promise<TmpSweepResult> {
  const maxAgeMs = options.maxAgeMs ?? TMP_SWEEP_AGE_MS;
  const log = options.log ?? (() => {});
  const result: TmpSweepResult = { scanned: 0, deleted: [], undated: [] };
  let cursor: string | null = null;
  do {
    const page = await store.list(TMP_SWEEP_PREFIX, cursor);
    cursor = page.cursor;
    for (const key of page.keys) {
      result.scanned += 1;
      const head = await store.head(key);
      if (!head) continue;
      const written = head.uploadedAt ?? head.customMetadata.uploadedAt ?? null;
      const age = written ? now.getTime() - Date.parse(written) : Number.NaN;
      if (!Number.isFinite(age)) {
        result.undated.push(key);
        log(`assets: tmp kept ${key}, the bucket reports no write time`);
        continue;
      }
      if (age < maxAgeMs) continue;
      await store.delete(key);
      result.deleted.push(key);
    }
  } while (cursor);
  if (result.deleted.length) {
    log(`assets: tmp swept, ${result.deleted.length} file${result.deleted.length === 1 ? "" : "s"} removed`);
  }
  return result;
}
