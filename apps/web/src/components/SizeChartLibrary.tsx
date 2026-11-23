"use client";

import Link from "next/link";
import { useAdminDemoData } from "@/lib/admin-demo-store";
import ProductSizeChart from "@/components/ProductSizeChart";
import { sizeChartIsEmpty } from "@/lib/size-chart";

/**
 * The measured charts the print desk has filled in (Plan P1 item 10). The size guide used to be advice
 * only; this section lists the styles that actually have numbers, and stays quiet until one does.
 */
export default function SizeChartLibrary() {
  const data = useAdminDemoData();
  const measured = data.products.filter((product) => product.status === "Active" && !sizeChartIsEmpty(product.sizeChart));

  return (
    <section data-size-chart-library className="mt-6">
      <h2 className="text-base font-black">Measured charts</h2>
      {measured.length ? (
        <>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            These are the finished garments measured flat. Pick your size from the chart rather than from the label.
          </p>
          <div className="mt-3 space-y-4">
            {measured.map((product) => (
              <div key={product.id}>
                <h3 className="text-xs font-bold text-text-primary">{product.name}</h3>
                <ProductSizeChart productId={product.id} sizes={product.sizes} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 rounded-xl border border-border bg-bg p-4 text-xs leading-5 text-text-secondary">
          No style has measurements published yet. The print desk measures each garment before it is listed; until then, use the measuring
          instructions above and ask us in chat if you are between sizes.{" "}
          <Link href="/contact" className="font-semibold text-accent">Message the shop</Link>
        </p>
      )}
    </section>
  );
}
