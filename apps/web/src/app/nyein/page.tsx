import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, ShoppingBag } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { getProductsBySubBrand } from "@/lib/products";
import { NYEIN_BRAND } from "@/lib/product-editing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nyein — MH Fashion",
  description: "Nyein ready-made pieces. Buy them exactly as shown — the design is already printed, so there is nothing to customise.",
};

export default async function NyeinPage() {
  const products = await getProductsBySubBrand(NYEIN_BRAND);

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1480px]">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#efffdc] via-[#dbf6bb] to-[#b9ea7d] px-4 py-5 sm:px-10 sm:py-10">
            <div className="relative z-10 max-w-xl">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#3f8213] sm:text-xs sm:tracking-[0.18em]">MH Fashion · Brand</p>
              <h1 className="mt-2 text-2xl font-black leading-[0.95] text-[#22421a] sm:mt-3 sm:text-5xl">Nyein.<br /><span className="text-[#4f9d16]">Ready to wear.</span></h1>
              <p className="mt-2 max-w-md text-[10px] leading-relaxed text-[#355128] sm:mt-4 sm:text-sm">Nyein pieces are printed as shown. Pick your size and colour and buy — there is no design to edit.</p>
              <a href="#nyein-products" className="mt-3 inline-flex items-center rounded-full bg-accent px-3 py-1.5 text-[10px] font-bold text-accent-foreground sm:mt-5 sm:px-4 sm:py-2.5 sm:text-xs">Shop Nyein <ArrowRight size={13} className="ml-1.5 sm:h-[15px] sm:w-[15px]" /></a>
            </div>
            <BadgeCheck className="absolute bottom-4 right-4 text-[#4e9d13]/70 sm:bottom-7 sm:right-7" size={34} />
          </section>

          <section id="nyein-products" className="mt-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-black"><span className="text-accent">{products.length}</span> Nyein pieces</h2>
                <p className="mt-1 text-xs text-text-muted">Sold as shown · no design editing</p>
              </div>
              <span className="rounded-full bg-accent/10 px-3 py-1.5 text-[10px] font-bold text-accent">Ready-made</span>
            </div>

            {products.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                {products.map((product) => (
                  <div key={product.id} className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-surface p-1.5 shadow-sm sm:p-2.5">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-bg-surface p-10 text-center">
                <ShoppingBag size={28} className="mx-auto text-text-muted" />
                <p className="mt-3 text-sm font-bold">Nyein pieces are on the way.</p>
                <p className="mt-1 text-xs text-text-muted">Products appear here once they carry the <span className="font-semibold">Nyein</span> brand in the catalogue.</p>
                <a href="/new" className="mt-4 inline-flex items-center rounded-full bg-accent px-4 py-2 text-[11px] font-bold text-accent-foreground">Browse new arrivals <ArrowRight size={13} className="ml-1.5" /></a>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
