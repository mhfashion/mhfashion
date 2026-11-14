import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import ProductDetailClient from "@/components/ProductDetailClient";
import { getBestSellers, getNewArrivals, getProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  return { title: product ? `${product.name} — MH Fashion` : "Product — MH Fashion" };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [newArrivals, bestSellers] = await Promise.all([getNewArrivals(8), getBestSellers(8)]);
  const related = [...newArrivals, ...bestSellers]
    .filter((item, index, all) => item.id !== product.id && all.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 4);

  return (
    <div>
      <Header />
      <main className="w-full bg-bg px-2 py-3 sm:px-4 lg:px-6 lg:py-4">
        <div className="mx-auto w-full max-w-[1500px]">
          <a href="/" className="mb-3 inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary transition hover:text-accent"><ArrowLeft size={13} /> Back to shopping</a>
          <ProductDetailClient product={product} related={related} />
        </div>
      </main>
    </div>
  );
}
