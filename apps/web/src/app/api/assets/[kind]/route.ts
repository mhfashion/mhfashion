import { NextResponse } from "next/server";
import { isAssetCatalogueKind, catalogueResponse } from "@/lib/asset-routes";
import { resolveAssetBuckets } from "@/lib/asset-store-r2";

export const dynamic = "force-dynamic";

/** Plan §12.1 part 6: one cacheable snapshot per kind. */
export async function GET(request: Request, context: { params: Promise<{ kind: string }> }) {
  const { kind } = await context.params;
  if (!isAssetCatalogueKind(kind)) {
    return NextResponse.json({ error: "unknown_asset_kind", kind }, { status: 404 });
  }
  const buckets = await resolveAssetBuckets();
  const store = buckets?.private ?? null;
  const result = await catalogueResponse(store, kind, request.headers.get("if-none-match"));
  return new NextResponse(result.status === 304 ? null : result.body, { status: result.status, headers: result.headers });
}
