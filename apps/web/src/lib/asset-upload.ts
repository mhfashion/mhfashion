// Plan §12.2.5 item 3 and §12.2.7: a customer's photo. The browser re-encodes it (which drops the EXIF,
// including any location), the route checks the bytes, the size and the pixel size, limits how many
// uploads one customer makes per hour, and writes it under `uploads/tmp/<user-id>/`. Saving a design
// promotes the files it uses to `uploads/<user-id>/`; the rest of `tmp` expires after 24 hours.
import { sha256Hex } from "./asset-file-type";
import { buildAssetKey, checkAssetContent } from "./asset-keys";
import { isSafeAssetKey, type AssetStore } from "./asset-store";

/** Twenty photos an hour is far more than a design needs and still bounds an accident. */
export const UPLOAD_HOURLY_LIMIT = 20;

export type UploadQuota = { windowStart: number; count: number };

/** The quota record sits beside the uploads; `quota.json` matches no upload key, so it is never served. */
export function uploadQuotaKey(userId: string): string {
  return `uploads/tmp/${userId}/quota.json`;
}

export function readUploadQuota(raw: string | null, now: number): UploadQuota {
  if (raw) {
    try {
      const value = JSON.parse(raw) as Partial<UploadQuota>;
      if (typeof value.windowStart === "number" && typeof value.count === "number") {
        return { windowStart: value.windowStart, count: value.count };
      }
    } catch {
      // A broken record is treated as an empty window, never as a crash.
    }
  }
  return { windowStart: now, count: 0 };
}

/** The window is one hour from its first upload; a fresh window starts at zero. */
export function nextUploadQuota(quota: UploadQuota, now: number): UploadQuota {
  if (now - quota.windowStart >= 60 * 60 * 1000) return { windowStart: now, count: 0 };
  return quota;
}

export function uploadAllowed(quota: UploadQuota, limit: number = UPLOAD_HOURLY_LIMIT): boolean {
  return quota.count < limit;
}

/** The temporary key for a new upload; the extension is the one the bytes really are. */
export function uploadKeyFor(userId: string, uploadId: string, ext: string): string {
  return buildAssetKey("upload-tmp", { id: userId, file: uploadId, ext });
}

/** `uploads/tmp/<user>/<file>` → `uploads/<user>/<file>`: the key a saved design keeps. */
export function promotionKeyFor(key: string): string | null {
  const match = /^uploads\/tmp\/([a-z0-9][a-z0-9-]*)\/([a-z0-9-]+\.[a-z0-9]+)$/.exec(key);
  if (!match) return null;
  return `uploads/${match[1]}/${match[2]}`;
}

export type UploadCheck =
  | { ok: true; key: string; contentType: string; size: number; sha256: string }
  | { ok: false; status: number; error: string; reason: string };

/**
 * Everything the upload route decides, in one place: the key, the bytes, the pixel size and the quota.
 * `contentType` comes from the bytes, never from the request.
 */
export async function checkUpload(input: {
  userId: string;
  uploadId: string;
  data: Uint8Array;
  ext: string;
  quota: UploadQuota;
  limit?: number;
}): Promise<UploadCheck> {
  if (!uploadAllowed(input.quota, input.limit)) {
    return { ok: false, status: 429, error: "too_many_uploads", reason: "wait an hour before uploading more" };
  }
  let key: string;
  try {
    key = uploadKeyFor(input.userId, input.uploadId, input.ext);
  } catch (error) {
    return { ok: false, status: 400, error: "bad_upload", reason: (error as Error).message };
  }
  const checked = checkAssetContent(key, input.data);
  if (!checked.ok) return { ok: false, status: 400, error: "refused_file", reason: checked.reason };
  return {
    ok: true,
    key,
    contentType: checked.type === "jpg" ? "image/jpeg" : `image/${checked.type}`,
    size: input.data.byteLength,
    sha256: await sha256Hex(input.data),
  };
}

/**
 * Saving a design keeps the photos it uses: each temporary key is copied to its permanent key and the
 * temporary one is dropped. A key that is not the caller's is refused, never promoted.
 */
export async function promoteUploads(
  store: AssetStore,
  userId: string,
  keys: string[],
): Promise<{ promoted: string[]; refused: string[] }> {
  const promoted: string[] = [];
  const refused: string[] = [];
  for (const key of keys) {
    const target = promotionKeyFor(key);
    if (!target || !key.startsWith(`uploads/tmp/${userId}/`) || !isSafeAssetKey(target, "private")) {
      refused.push(key);
      continue;
    }
    const object = await store.getObject(key);
    if (!object) {
      refused.push(key);
      continue;
    }
    await store.putObject(target, object.body, {
      contentType: object.contentType,
      customMetadata: object.customMetadata,
    });
    await store.delete(key);
    promoted.push(target);
  }
  return { promoted, refused };
}
