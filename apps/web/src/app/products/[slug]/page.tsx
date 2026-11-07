import type { Metadata } from "next";
import { ArrowLeft, Check, Heart, RotateCcw, ShieldCheck, Shirt, Truck } from "lucide-react";
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

  const price = product.priceMinKs === product.priceMaxKs
    ? `${product.priceMinKs.toLocaleString("en-US")} Ks`
    : `${product.priceMinKs.toLocaleString("en-US")} – ${product.priceMaxKs.toLocaleString("en-US")} Ks`;

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-3 py-3 sm:px-5 sm:py-5 lg:px-8">
        <div className="mx-auto max-w-[1040px]">
          <a href="/" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-accent">
            <ArrowLeft size={13} /> Back to shopping
          </a>
          <section className="grid gap-4 rounded-xl border border-border bg-bg-surface p-3 shadow-sm sm:p-4 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
            <div>
              <div className="relative mx-auto aspect-square max-w-[360px] overflow-hidden rounded-lg bg-bg">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center"><Shirt size={42} className="text-border-light" /></span>
                )}
                {product.isNew && <span className="absolute left-2.5 top-2.5 rounded bg-accent px-2 py-1 text-[9px] font-black text-accent-foreground">NEW</span>}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                <div className="aspect-square rounded border-2 border-accent bg-bg p-0.5"><div className="h-full rounded bg-bg-surface" /></div>
                <div className="aspect-square rounded border border-border bg-bg" />
                <div className="aspect-square rounded border border-border bg-bg" />
                <div className="aspect-square rounded border border-border bg-bg" />
              </div>
            </div>

            <div className="min-w-0 py-1">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent">MH Fashion</span>
                <button type="button" aria-label="Favorite product" className="text-text-secondary hover:text-accent"><Heart size={17} /></button>
              </div>
              <h1 className="mt-3 text-xl font-black leading-tight tracking-tight sm:text-2xl">{product.name}</h1>
              <div className="mt-3 inline-flex rounded-md border border-accent/30 bg-accent/5 px-3 py-1.5 text-base font-black text-accent">{price}</div>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-text-muted"><span className="font-bold text-[#f4b718]">★★★★★</span><span>4.9</span><span>·</span><span>126 sold</span></div>
              <p className="mt-3 text-xs leading-5 text-text-secondary">Custom print made for your style. Select your preferred product options and make it yours with MH Fashion.</p>

              <div className="mt-4 divide-y divide-border rounded-lg border border-border bg-bg text-[11px]">
                <div className="flex items-center gap-2 px-3 py-2.5"><Truck size={15} className="text-accent" /><span className="font-semibold">Delivery</span><span className="ml-auto text-text-secondary">Myanmar-wide shipping</span></div>
                <div className="flex items-center gap-2 px-3 py-2.5"><ShieldCheck size={15} className="text-accent" /><span className="font-semibold">Payment</span><span className="ml-auto text-text-secondary">Secure checkout</span></div>
                <div className="flex items-center gap-2 px-3 py-2.5"><RotateCcw size={15} className="text-accent" /><span className="font-semibold">Returns</span><span className="ml-auto text-text-secondary">Easy exchange support</span></div>
              </div>

              <div className="mt-4"><ProductDetailActions product={product} /></div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-text-muted"><Check size={13} className="text-accent" /> Secure purchase · Quality checked · Customizable design</div>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
