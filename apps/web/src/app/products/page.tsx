import type { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import AdSlotBanner from "@/components/AdSlotBanner";
import Header from "@/components/Header";
import T from "@/components/T";
import ProductCard from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "All Products — MH Fashion", description: "Every product MH Fashion prints, in one place." };

export default async function ProductsPage() {
  const products = await getAllProducts(60);
  return (
    <div><Header /><main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1480px]">
      <div className="mb-5"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-accent"><LayoutGrid size={13} /> <T k="shop.eyebrow" /></p><h1 className="mt-2 text-2xl font-black sm:text-4xl"><T k="products.title" /></h1><p className="mt-1 text-xs text-text-muted sm:text-sm"><T k="products.lead" /></p></div>
      <AdSlotBanner slot="products-top" />
      {products.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {products.map((product) => <div key={product.id} data-product-card className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5"><ProductCard product={product} /></div>)}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-surface p-10 text-center text-sm text-text-muted"><T k="products.catalogMissing" /></div>
      )}
    </div></main></div>
  );
}
