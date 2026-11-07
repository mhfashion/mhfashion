import type { Metadata } from "next";
import { ArrowLeft, Heart, Shirt } from "lucide-react";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetailActions from "@/components/ProductDetailActions";
import { getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return { title: product ? `${product.name} — MH Fashion` : "Product — MH Fashion" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1180px]">
          <a href="/" className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-text-secondary hover:text-accent">
            <ArrowLeft size={14} /> Back to shopping
          </a>
          <section className="grid gap-6 rounded-2xl border border-border bg-bg-surface p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] lg:gap-10 lg:p-8">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-bg">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center"><Shirt size={54} className="text-border-light" /></span>
              )}
              {product.isNew && <span className="absolute left-4 top-4 rounded-full bg-accent px-3 py-1.5 text-[10px] font-black text-accent-foreground">NEW</span>}
            </div>
            <div className="flex flex-col justify-center">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">MH Fashion</span>
                <Heart size={20} className="text-text-secondary" />
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
              <div className="mt-5 inline-flex w-fit rounded-lg border border-border bg-bg px-3 py-2 text-base font-bold text-text-primary shadow-sm">
                {product.priceMinKs === product.priceMaxKs ? `${product.priceMinKs.toLocaleString("en-US")} Ks` : `${product.priceMinKs.toLocaleString("en-US")} – ${product.priceMaxKs.toLocaleString("en-US")} Ks`}
              </div>
              <p className="mt-5 text-sm leading-7 text-text-secondary">Make it yours with a custom MH Fashion design. Choose Buy Now to continue to checkout, add it to your cart for later, or edit the design before ordering.</p>
              <div className="mt-7"><ProductDetailActions product={product} /></div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
