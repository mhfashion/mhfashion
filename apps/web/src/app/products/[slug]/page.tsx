import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import T from "@/components/T";
import ProductDetailClient from "@/components/ProductDetailClient";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, productSchema } from "@/lib/structured-data";
import { NYEIN_PIECES } from "@/lib/nyein-pieces";
import { getBestSellers, getNewArrivals, getProductBySlug, getProductOptionGroups } from "@/lib/products";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

/** The catalogue first; a Nyein stand-in piece still opens its own page until the rows exist. */
async function findProduct(slug: string) {
  return (await getProductBySlug(slug)) ?? NYEIN_PIECES.find((piece) => piece.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await findProduct((await params).slug);
  return { title: product ? `${product.name} — MH Fashion` : "Product — MH Fashion" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await findProduct((await params).slug);
  if (!product) notFound();

  const [newArrivals, bestSellers, optionGroups] = await Promise.all([
    getNewArrivals(8),
    getBestSellers(8),
    getProductOptionGroups(product.id),
  ]);
  const related = [...newArrivals, ...bestSellers]
    .filter((item, index, all) => item.id !== product.id && all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 4);

  return (
    <div>
      <JsonLd data={productSchema(product)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "Products", path: "/products" },
        { name: product.name, path: `/products/${product.slug}` },
      ])} />
      <Header />
      <main className="w-full bg-bg px-2 py-3 sm:px-4 lg:px-6 lg:py-4">
        <div className="mx-auto w-full max-w-[1500px]">
          <a href="/" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary transition hover:text-accent"><ArrowLeft size={13} /> <T k="product.backToShopping" /></a>
          <ProductDetailClient product={product} related={related} optionGroups={optionGroups} />
        </div>
      </main>
    </div>
  );
}
