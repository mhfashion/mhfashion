import type { Metadata } from "next";
import { ArrowLeft, ChevronDown, Heart, Shirt } from "lucide-react";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import ProductDetailActions from "@/components/ProductDetailActions";
import ProductOptions from "@/components/ProductOptions";
import { getBestSellers, getNewArrivals, getProductBySlug } from "@/lib/products";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

function getProductOverview(product: Product) {
  const productType = product.productType?.trim();
  const customization = product.isCustomizable;
  const customizationLabel = customization === "full"
    ? "Full customization"
    : customization === "partial"
      ? "Partial customization"
      : customization === "none"
        ? "Listed design"
        : "Not specified";
  const customizationDescription = customization === "full"
    ? "This item is marked as fully customizable in the catalog."
    : customization === "partial"
      ? "This item supports selected customization options."
      : customization === "none"
        ? "This item is offered in its listed design."
        : "See the available product options above for details.";

  return {
    description: `${productType ? `${product.name} is a ${productType.toLowerCase()} from the MH Fashion collection.` : `${product.name} is part of the MH Fashion collection.`} ${customizationDescription}`,
    productType: productType || "Not specified",
    customizationLabel,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return { title: product ? `${product.name} — MH Fashion` : "Product — MH Fashion" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [newArrivals, bestSellers] = await Promise.all([getNewArrivals(8), getBestSellers(8)]);
  const related = [...newArrivals, ...bestSellers].filter((item, index, all) => item.id !== product.id && all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 4);
  const price = product.priceMinKs === product.priceMaxKs ? `${product.priceMinKs.toLocaleString("en-US")} Ks` : `${product.priceMinKs.toLocaleString("en-US")} – ${product.priceMaxKs.toLocaleString("en-US")} Ks`;
  const productOverview = getProductOverview(product);

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-1.5 py-2 sm:px-2 sm:py-3 lg:px-2">
        <div className="w-full max-w-none">
          <a href="/" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-accent"><ArrowLeft size={13} /> Back to shopping</a>
          <section className="grid gap-2.5 rounded-xl border border-border/40 bg-bg-surface p-2 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] sm:gap-3 sm:p-3 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-4">
            <div className="mx-auto w-full max-w-[200px] sm:max-w-none">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/40 bg-bg">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center"><Shirt size={38} className="text-border-light" /></span>}
                {product.isNew && <span className="absolute left-2 top-2 rounded bg-accent px-2 py-1 text-[9px] font-black text-accent-foreground">NEW</span>}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5"><div className="aspect-square rounded-md border border-accent bg-bg" /><div className="aspect-square rounded-md border border-border/60 bg-bg" /><div className="aspect-square rounded-md border border-border/60 bg-bg" /><div className="aspect-square rounded-md border border-border/60 bg-bg" /></div>
            </div>
            <div className="min-w-0 py-0.5">
              <div className="flex items-center justify-between border-b border-border pb-1.5"><span className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent">MH Fashion</span><button type="button" aria-label="Favorite product" className="text-text-secondary hover:text-accent"><Heart size={16} /></button></div>
              <h1 className="mt-2.5 text-xl font-black leading-tight tracking-tight">{product.name}</h1>
              <div className="mt-2 inline-flex rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1 text-sm font-black text-accent">{price}</div>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted"><span className="font-bold text-[#f4b718]">★★★★★</span><span>4.9</span><span>·</span><span>126 sold</span></div>
              <ProductOptions />
              <div className="mt-4"><ProductDetailActions product={product} /></div>
            </div>
          </section>

          <section aria-labelledby="product-details-title" className="mt-2.5 rounded-xl border border-border bg-bg-surface p-3 sm:p-3.5">
            <h2 id="product-details-title" className="text-sm font-black">Product details</h2>
            <p className="mt-1.5 text-[11px] leading-5 text-text-secondary">{productOverview.description}</p>
            <dl className="mt-2 flex flex-wrap gap-1.5">
              <div className="rounded-md border border-border/60 px-2 py-1"><dt className="text-[9px] text-text-muted">Type</dt><dd className="text-[10px] font-semibold">{productOverview.productType}</dd></div>
              <div className="rounded-md border border-border/60 px-2 py-1"><dt className="text-[9px] text-text-muted">Customization</dt><dd className="text-[10px] font-semibold">{productOverview.customizationLabel}</dd></div>
            </dl>
          </section>

          <section className="mt-2.5 rounded-xl border border-border bg-bg-surface p-2.5 sm:p-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 py-1">
                <h2 className="text-sm font-black">Reviews</h2>
                <span className="flex items-center gap-1.5 text-[10px] text-text-muted"><span className="font-bold text-[#f4b718]">★★★★★</span> 4.9 / 5 · 18 reviews <ChevronDown size={13} /></span>
              </summary>
              <div className="mt-2 grid gap-2 border-t border-border pt-2 sm:grid-cols-2">
                <article className="rounded-lg bg-bg p-2.5"><div className="text-[10px] text-[#f4b718]">★★★★★</div><p className="mt-1 text-[11px] leading-5 text-text-secondary">“The print quality is great and the fabric feels comfortable.”</p><p className="mt-1.5 text-[10px] font-bold">May · Verified buyer</p></article>
                <article className="rounded-lg bg-bg p-2.5"><div className="text-[10px] text-[#f4b718]">★★★★★</div><p className="mt-1 text-[11px] leading-5 text-text-secondary">“Exactly like the preview. Good fit and fast support.”</p><p className="mt-1.5 text-[10px] font-bold">Nandar · Verified buyer</p></article>
              </div>
            </details>
          </section>

          {related.length > 0 && <section className="mt-4 rounded-xl border border-border bg-bg-surface p-3 sm:p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">You may also like</h2><a href="/popular" className="text-[10px] font-semibold text-accent">View all</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
        </div>
      </main>

    </div>
  );
}
