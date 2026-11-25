import { NextResponse } from "next/server";
import { mockupResponse } from "@/lib/asset-routes";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";

export const dynamic = "force-dynamic";

/** Plan §12.1 part 6: the looks that really exist, so a product page never probes. */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const buckets = await resolveAssetBuckets();
  const store = buckets?.private ?? null;
  const result = await mockupResponse(store, slug, request.headers.get("if-none-match"));
  return new NextResponse(result.status === 304 ? null : result.body, { status: result.status, headers: result.headers });
}
