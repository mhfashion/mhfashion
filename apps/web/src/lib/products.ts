import { createClient } from "@supabase/supabase-js";
import type { ProductOptionGroup } from "./product-options";
import { optionKeyForAttributeName } from "./product-options";
import { normalizeSearchText } from "./search-text";
import type { Product } from "./types";

// Server-side client — safe to use the anon key here since catalog data
// (products, pricing) has no RLS restriction; it's meant to be public.
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_new: boolean;
  product_type?: string | null;
  sub_brand?: string | null;
  is_customizable?: "full" | "partial" | "none" | null;
};

type AttributeLinkRow = { attribute_type_id: string };
type AttributeTypeRow = { id: string; name: string; display_order: number };
type AttributeValueRow = { attribute_type_id: string; value: string };

type PriceRangeRow = {
  product_id: string;
  price_min_ks: number;
  price_max_ks: number;
};

// product_price_ranges is a plain view (no FK to products), so PostgREST
// can't reliably auto-embed it in a single `select`. Fetch separately and
// merge in JS instead — simpler and works regardless of relationship
// detection.
async function getPriceRanges(productIds: string[]): Promise<Map<string, PriceRangeRow>> {
  if (productIds.length === 0) return new Map();
  const supabase = getServerSupabase();
  if (!supabase) return new Map();
  const { data, error } = await supabase
    .from("product_price_ranges")
    .select("product_id, price_min_ks, price_max_ks")
    .in("product_id", productIds);

  if (error) {
    console.error("getPriceRanges failed:", error.message);
    return new Map();
  }
  return new Map((data ?? []).map((r) => [r.product_id, r]));
}

function toProduct(row: ProductRow, ranges: Map<string, PriceRangeRow>): Product {
  const range = ranges.get(row.id);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url ?? undefined,
    isNew: row.is_new,
    productType: row.product_type ?? undefined,
    subBrand: row.sub_brand ?? undefined,
    isCustomizable: row.is_customizable ?? undefined,
    priceMinKs: range?.price_min_ks ?? 0,
    priceMaxKs: range?.price_max_ks ?? 0,
  };
}

/**
 * The option boxes a post sells on, straight from the admin's ticked attributes. `null` means the
 * catalogue carries no attribute rows for this product, so the shop's defaults stand in.
 */
export async function getProductOptionGroups(productId: string): Promise<ProductOptionGroup[] | null> {
  const supabase = getServerSupabase();
  if (!supabase || !productId) return null;

  const { data: links, error: linkError } = await supabase
    .from("product_attribute_types")
    .select("attribute_type_id")
    .eq("product_id", productId);
  if (linkError) {
    console.error("getProductOptionGroups failed:", linkError.message);
    return null;
  }
  const typeIds = ((links ?? []) as AttributeLinkRow[]).map((row) => row.attribute_type_id);
  if (!typeIds.length) return null;

  const [typesResult, valuesResult] = await Promise.all([
    supabase.from("attribute_types").select("id, name, display_order").in("id", typeIds),
    supabase.from("attribute_values").select("attribute_type_id, value").in("attribute_type_id", typeIds).order("created_at"),
  ]);
  if (typesResult.error || valuesResult.error) {
    console.error("getProductOptionGroups failed:", typesResult.error?.message ?? valuesResult.error?.message);
    return null;
  }

  const valuesByType = new Map<string, string[]>();
  for (const row of (valuesResult.data ?? []) as AttributeValueRow[]) {
    valuesByType.set(row.attribute_type_id, [...(valuesByType.get(row.attribute_type_id) ?? []), row.value]);
  }

  return ((typesResult.data ?? []) as AttributeTypeRow[])
    .sort((left, right) => left.display_order - right.display_order || left.name.localeCompare(right.name))
    .map((type) => ({
      key: optionKeyForAttributeName(type.name),
      label: type.name,
      options: valuesByType.get(type.id) ?? [],
    }));
}

export async function getNewArrivals(limit = 6): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .eq("is_new", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getNewArrivals failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProductRow[];
  const ranges = await getPriceRanges(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, ranges));
}

export async function getBestSellers(limit = 6): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  // No sales-count metric yet — placeholder: non-"new" products, oldest first.
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .eq("is_new", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("getBestSellers failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProductRow[];
  const ranges = await getPriceRanges(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, ranges));
}

export async function getAllProducts(limit = 60): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAllProducts failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProductRow[];
  const ranges = await getPriceRanges(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, ranges));
}

/**
 * PostgREST splits `or()` on commas and treats `%`, `_`, `*` and brackets as syntax, so a search
 * term is reduced to letters, digits, spaces and a few safe marks before it reaches the query.
 */
export function normalizeSearchQuery(input: string | null | undefined): string {
  return normalizeSearchText(input)
    // \p{M} keeps Myanmar combining marks (င်, ျ, ီ); without it "အင်္ကျီ" loses its vowels.
    .replace(/[^\p{L}\p{M}\p{N}\s'&.+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export async function searchProducts(query: string, limit = 40): Promise<Product[]> {
  const term = normalizeSearchQuery(query);
  const supabase = getServerSupabase();
  if (!supabase || term.length < 2) return [];
  const pattern = `%${term}%`;
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .or(`name.ilike.${pattern},sub_brand.ilike.${pattern},product_type.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("searchProducts failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProductRow[];
  const ranges = await getPriceRanges(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, ranges));
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    if (error) console.error("getProductBySlug failed:", error.message);
    return null;
  }
  const row = data as ProductRow;
  const ranges = await getPriceRanges([row.id]);
  return toProduct(row, ranges);
}

/**
 * One round trip for several slugs, in the order asked. A post that names six products must not cost six
 * queries, and a slug the catalogue no longer holds simply comes back missing.
 */
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  const wanted = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  if (wanted.length === 0) return [];
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .in("slug", wanted);
  if (error || !data) {
    if (error) console.error("getProductsBySlugs failed:", error.message);
    return [];
  }
  const rows = data as ProductRow[];
  const ranges = await getPriceRanges(rows.map((row) => row.id));
  const products = rows.map((row) => toProduct(row, ranges));
  return wanted.flatMap((slug) => products.filter((product) => product.slug === slug));
}

/**
 * Products of one catalogue line (the `sub_brand` column). Nyein is a ready-made line: it is
 * sold as shown, so those products never offer the design editor.
 */
export async function getProductsBySubBrand(subBrand: string, limit = 24): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new, product_type, sub_brand, is_customizable")
    .ilike("sub_brand", subBrand)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getProductsBySubBrand failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as ProductRow[];
  const ranges = await getPriceRanges(rows.map((r) => r.id));
  return rows.map((r) => toProduct(r, ranges));
}
