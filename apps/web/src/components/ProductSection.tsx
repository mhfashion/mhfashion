import type { Product } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function ProductSection({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  return (
    <section className="px-6 md:px-8 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold">{title}</h2>
        <a href="#" className="text-xs text-accent">
          See All →
        </a>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
