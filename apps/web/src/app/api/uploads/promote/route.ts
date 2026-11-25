import { NextResponse } from "next/server";
import { supabaseEnvFromProcess, verifySupabaseUser } from "@/lib/asset-session";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";
import { promoteUploads } from "@/lib/asset-upload";

export const dynamic = "force-dynamic";

/**
 * Plan §12.2.5 item 3: saving a design keeps the photos it uses, by moving them out of `tmp` where the
 * 24-hour rule deletes them. Only the caller's own keys are promoted.
 */
export async function POST(request: Request) {
  const buckets = await resolveAssetBuckets();
  if (!buckets) {
    return NextResponse.json({ error: "assets_unbound", reason: "the asset buckets are not bound in this environment" }, { status: 503 });
  }
  const viewer = await verifySupabaseUser(supabaseEnvFromProcess(), request);
  if (!viewer) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });

  let keys: unknown;
  try {
    keys = ((await request.json()) as { keys?: unknown }).keys;
  } catch {
    keys = null;
  }
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== "string")) {
    return NextResponse.json({ error: "bad_request", reason: "send { keys: string[] }" }, { status: 400 });
  }

  const result = await promoteUploads(buckets.private, viewer.id, keys as string[]);
  return NextResponse.json(result);
}
