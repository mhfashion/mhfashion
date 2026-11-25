import { NextResponse } from "next/server";
import { issuesResponse } from "@/lib/asset-routes";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";

export const dynamic = "force-dynamic";

/** Plan §12.1 part 10: the problems behind the catalogues, read from the snapshots the rebuild wrote. */
export async function GET(request: Request) {
  const buckets = await resolveAssetBuckets();
  const store = buckets?.private ?? null;
  const result = await issuesResponse(store, request.headers.get("if-none-match"));
  return new NextResponse(result.status === 304 ? null : result.body, { status: result.status, headers: result.headers });
}
