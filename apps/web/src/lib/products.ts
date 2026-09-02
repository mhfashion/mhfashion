import { createClient } from "@supabase/supabase-js";
import type { Product } from "./types";

// Server-side client — safe to use the anon key here since catalog data
// (products, pricing) has no RLS restriction; it's meant to be public.
function getServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  is_new: boolean;
};

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
    priceMinKs: range?.price_min_ks ?? 0,
    priceMaxKs: range?.price_max_ks ?? 0,
  };
}

export async function getNewArrivals(limit = 6): Promise<Product[]> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new")
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
  // No sales-count metric yet — placeholder: non-"new" products, oldest first.
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new")
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

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, image_url, is_new")
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
