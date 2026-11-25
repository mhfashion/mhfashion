import { NextResponse } from "next/server";
import { canWriteAdmin } from "@/lib/asset-access";
import { issuesResponse } from "@/lib/asset-routes";
import { supabaseEnvFromProcess, verifySupabaseUser } from "@/lib/asset-session";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";

export const dynamic = "force-dynamic";

/**
 * Plan §12.1 part 10: the problems behind the catalogues, read from the snapshots the rebuild wrote.
 * The snapshots live in the private bucket and an issue can name a customer's file, so the list is for an
 * admin only (§12.2.12 item 2); the Worker answers the same report at `/api/admin/assets/issues`.
 */
export async function GET(request: Request) {
  const viewer = await verifySupabaseUser(supabaseEnvFromProcess(), request);
  if (!viewer) return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  if (!canWriteAdmin(viewer)) return NextResponse.json({ error: "admin_only" }, { status: 403 });

  const buckets = await resolveAssetBuckets();
  const store = buckets?.private ?? null;
  const result = await issuesResponse(store, request.headers.get("if-none-match"));
  return new NextResponse(result.status === 304 ? null : result.body, { status: result.status, headers: result.headers });
}
