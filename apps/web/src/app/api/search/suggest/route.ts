import { NextResponse } from "next/server";
import { MH_DESIGN_LIBRARY } from "@/lib/editor-design-library";
import { filterGuidePosts, getGuideCatalog } from "@/lib/guides";
import { normalizeSearchQuery, recordSearchMiss, searchCatalog } from "@/lib/products";
import { matchesSearchQuery } from "@/lib/search-text";

export const dynamic = "force-dynamic";

export type SearchSuggestion = {
  kind: "product" | "guide" | "design";
  title: string;
  subtitle: string;
  href: string;
};

/** Plan §17 S6: the header shows at most five suggestions, so the groups are capped to fit that list. */
const SUGGESTION_CAPS = { products: 3, guides: 1, designs: 1 } as const;
const MAX_TERM = 60;

export async function GET(request: Request) {
  const term = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? "").slice(0, MAX_TERM);
  if (term.length < 2) {
    return NextResponse.json({ suggestions: [], counts: { products: 0, guides: 0, designs: 0 }, approximate: false });
  }

  const products = await searchCatalog(term, SUGGESTION_CAPS.products);
  const guides = filterGuidePosts((await getGuideCatalog()).posts, "", term).slice(0, SUGGESTION_CAPS.guides);
  const designs = MH_DESIGN_LIBRARY
    .filter((design) => matchesSearchQuery([design.name, ...design.layers.map((layer) => layer.name)].join(" "), term))
    .slice(0, SUGGESTION_CAPS.designs);

  const suggestions: SearchSuggestion[] = [
    ...products.products.map((product) => ({
      kind: "product" as const,
      title: product.name,
      subtitle: [product.subBrand, product.productType].filter(Boolean).join(" · "),
      href: `/products/${product.slug}`,
    })),
    ...guides.map((guide) => ({
      kind: "guide" as const,
      title: guide.title,
      subtitle: guide.categorySlug.replace(/-/g, " "),
      href: `/guide/${guide.slug}`,
    })),
    ...designs.map((design) => ({
      kind: "design" as const,
      title: design.name,
      subtitle: design.layers.map((layer) => layer.name).join(" · "),
      href: "/create",
    })),
  ];

  const counts = { products: products.products.length, guides: guides.length, designs: designs.length };
  if (!suggestions.length) await recordSearchMiss(term);

  return NextResponse.json({ suggestions, counts, approximate: products.approximate });
}
