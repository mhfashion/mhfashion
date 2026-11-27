import ProductCard from "@/components/ProductCard";
import type { Product } from "@/lib/types";
import T from "@/components/T";

const BADGES = ["BEST SELLER", "TRENDING", "POPULAR"];

/** The shop's product shelf: the same card, frame and spacing on the home page and on Nyein. */
export default function ProductStrip({
  products,
  limit = 5,
  badges = false,
  href,
}: {
  products: Product[];
  limit?: number;
  badges?: boolean;
  href?: string;
}) {
  if (!products.length) {
    return <div className="rounded-xl border border-border bg-bg-surface px-5 py-10 text-center text-xs text-text-muted"><T k="home.emptyStrip" /></div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {products.slice(0, limit).map((product, index) => (
        <div key={product.id} className="relative rounded-xl border border-border bg-bg-surface p-2.5 shadow-sm">
          {badges ? (
            <span className={`absolute left-3 top-3 z-10 rounded-full px-2 py-1 text-[9px] font-bold text-white ${index === 0 ? "bg-[#f4b718]" : "bg-accent"}`}>
              {BADGES[Math.min(index, BADGES.length - 1)]}
            </span>
          ) : null}
          <ProductCard product={product} href={href} />
        </div>
      ))}
    </div>
  );
}
