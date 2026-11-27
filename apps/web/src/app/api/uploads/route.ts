import { NextResponse } from "next/server";
import { sniffAssetType } from "@/lib/asset-file-type";
import { supabaseEnvFromProcess, verifySupabaseUser } from "@/lib/asset-session";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";
import { checkUpload, nextUploadQuota, readUploadQuota, uploadQuotaKey } from "@/lib/asset-upload";

export const dynamic = "force-dynamic";

/** The editor re-encodes before it sends (Plan §12.2.5); this is the hard ceiling behind that. */
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

function badRequest(error: string, reason: string, status = 400) {
  return NextResponse.json({ error, reason }, { status });
}

async function readBody(request: Request): Promise<{ data: Uint8Array; ext?: string } | null> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return null;
    const ext = form.get("ext");
    return { data: new Uint8Array(await (file as Blob).arrayBuffer()), ext: ext ? String(ext) : undefined };
  }
  try {
    const body = (await request.json()) as { data?: unknown; ext?: unknown };
    if (typeof body.data !== "string") return null;
    const binary = Buffer.from(body.data, "base64");
    return { data: new Uint8Array(binary), ext: typeof body.ext === "string" ? body.ext : undefined };
  } catch {
    return null;
  }
}

/**
 * Plan §12.2.5 item 3: a customer's photo. The caller is checked by Supabase, the bytes decide the type,
 * the size and the pixel size, and the file lands under `tmp/<user-id>/` until a design keeps it.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "uploads", RATE_LIMITS.upload);
  if (limited) return limited;

  const buckets = await resolveAssetBuckets();
  if (!buckets) return badRequest("assets_unbound", "the asset buckets are not bound in this environment", 503);

  const viewer = await verifySupabaseUser(supabaseEnvFromProcess(), request);
  if (!viewer) return badRequest("sign_in_required", "sign in before uploading", 401);

  const body = await readBody(request);
  if (!body) return badRequest("bad_request", "send the file as multipart 'file' or as base64 'data'");
  if (body.data.byteLength === 0) return badRequest("bad_request", "the file is empty");
  if (body.data.byteLength > MAX_UPLOAD_BYTES) return badRequest("too_large", "an upload is limited to 2 MB", 413);

  const sniffed = sniffAssetType(body.data);
  if (!sniffed) return badRequest("refused_file", "the bytes are not a file type the shop accepts");
  const ext = body.ext ?? sniffed;

  const now = Date.now();
  const quota = nextUploadQuota(readUploadQuota(await buckets.private.get(uploadQuotaKey(viewer.id)), now), now);
  const checked = await checkUpload({ userId: viewer.id, uploadId: crypto.randomUUID(), data: body.data, ext, quota });
  if (!checked.ok) return badRequest(checked.error, checked.reason, checked.status);

  await buckets.private.putObject(checked.key, body.data, {
    contentType: checked.contentType,
    cacheControl: "private, no-store",
    customMetadata: { sha256: checked.sha256, uploader: viewer.id, uploadedAt: new Date(now).toISOString() },
  });
  await buckets.private.put(uploadQuotaKey(viewer.id), JSON.stringify({ windowStart: quota.windowStart, count: quota.count + 1 }));

  return NextResponse.json({ key: checked.key, contentType: checked.contentType, size: checked.size });
}
