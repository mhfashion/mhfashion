"use client";

import { useState } from "react";
import Link from "next/link";
import { Ruler } from "lucide-react";
import { useAdminDemoData } from "@/lib/admin-demo-store";
import { SIZE_CHART_MEASURE_LABEL, cmToInches, sizeChartMeasures, sizeChartRows } from "@/lib/size-chart";

/**
 * The measured chart for one product, filled in from `/admin/products` (Plan P1 item 10). Until the owner
 * measures a style the panel says so and points at the size guide — a guessed chest measurement is a
 * returned garment, so nothing is invented here.
 */
export default function ProductSizeChart({ productId, sizes }: { productId: string; sizes: readonly string[] }) {
  const data = useAdminDemoData();
  const [unit, setUnit] = useState<"cm" | "in">("cm");
  const product = data.products.find((entry) => entry.id === productId);
  const chart = product?.sizeChart;
  const rows = sizeChartRows(chart, sizes);
  const measures = sizeChartMeasures(chart);

  if (!rows.length) {
    return (
      <div data-product-size-chart="missing" className="mt-3 rounded-xl border border-border bg-bg p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-text-primary"><Ruler size={14} className="text-accent" /> Measurements for this style are not published yet</p>
        <p className="mt-2 text-xs leading-5 text-text-secondary">
          The print desk is measuring this garment. Choose your usual size for a relaxed fit, or one size up for an oversized look — and ask us in chat if you are between sizes.
        </p>
        <Link href="/size-guide" className="mt-2 inline-block text-[11px] font-bold text-accent">How to measure →</Link>
      </div>
    );
  }

  return (
    <div data-product-size-chart="measured" className="mt-3 rounded-xl border border-border bg-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-text-primary">Measured flat, finished garment</p>
        <div className="flex items-center gap-1 text-[10px] font-bold">
          {(["cm", "in"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setUnit(option)}
              aria-pressed={unit === option}
              data-size-chart-unit={option}
              className={`rounded-full px-2 py-0.5 ${unit === option ? "bg-accent text-accent-foreground" : "border border-border text-text-secondary"}`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[320px] text-left text-[11px]">
          <thead className="text-[10px] text-text-muted">
            <tr>
              <th className="pb-1.5 pr-3 font-semibold">Size</th>
              {measures.map((measure) => <th key={measure} className="pb-1.5 pr-3 font-semibold">{SIZE_CHART_MEASURE_LABEL[measure]}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.size}>
                <td className="py-1.5 pr-3 font-bold text-text-primary">{row.size}</td>
                {measures.map((measure) => (
                  <td key={measure} className="py-1.5 pr-3 tabular-nums text-text-secondary">
                    {row.measures[measure] === undefined
                      ? "—"
                      : unit === "cm" ? `${row.measures[measure]} cm` : `${cmToInches(row.measures[measure] as number)} in`}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] text-text-muted">
        Measured on a garment laid flat, so chest is half the body measurement. A size can differ by ±1 cm between production runs.{" "}
        <Link href="/size-guide" className="font-semibold text-accent">How to measure</Link>
      </p>
    </div>
  );
}
