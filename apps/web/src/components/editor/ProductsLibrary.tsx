"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Package, RefreshCw, Search, Shirt } from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import type { Product } from "@/lib/types";

type Props = {
  selectedProductName: string;
  onSelectProduct: (product: Product) => void;
};

type ProductResponse = { products?: Product[]; error?: string };

export default function ProductsLibrary({ selectedProductName, onSelectProduct }: Props) {
  const { formatKs } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | "New">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/editor/products", { signal: controller.signal, cache: "no-store" });
        const payload = await response.json() as ProductResponse;
        if (!response.ok || !Array.isArray(payload.products)) {
          throw new Error(payload.error ?? "The store catalog could not be loaded.");
        }
        setProducts(payload.products);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "The store catalog could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadProducts();
    return () => controller.abort();
  }, [retryKey]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const isCategoryMatch = category === "All" || product.isNew;
      const isSearchMatch = !normalized || `${product.name} ${product.slug}`.toLocaleLowerCase().includes(normalized);
      return isCategoryMatch && isSearchMatch;
    });
  }, [category, products, query]);

  function formatPrice(product: Product) {
    if (product.priceMinKs === product.priceMaxKs) return formatKs(product.priceMinKs);
    return `${formatKs(product.priceMinKs)}–${formatKs(product.priceMaxKs)}`;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-bg px-2.5 py-2 text-[8px] leading-relaxed text-text-muted">
        Catalog items come from the live storefront data. Selecting one sets the current editor product; the mockup selector remains a separate step.
      </div>
      {selectedProductName && <div className="truncate rounded-md border border-accent/40 bg-accent/5 px-2.5 py-2 text-[9px] text-accent"><span className="font-semibold">Selected:</span> {selectedProductName}</div>}

      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" aria-label="Search products" className="h-9 w-full rounded-md border border-border bg-bg pl-8 pr-2 text-[10px] outline-none placeholder:text-text-faint focus:border-accent" />
      </div>
      <div className="flex items-center justify-between">
        <div role="tablist" aria-label="Product filters" className="flex gap-1.5">
          {(["All", "New"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)} className={`rounded-full border px-2.5 py-1 text-[9px] ${category === item ? "border-accent bg-accent/10 font-semibold text-accent" : "border-border text-text-muted hover:border-accent/50"}`}>{item}</button>)}
        </div>
        <span className="text-[8px] text-text-faint">{loading ? "Loading…" : `${filteredProducts.length} products`}</span>
      </div>

      {loading && <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="animate-pulse overflow-hidden rounded-md border border-border"><div className="aspect-[4/3] bg-bg" /><div className="space-y-1.5 p-2"><div className="h-2 w-4/5 rounded bg-bg" /><div className="h-2 w-1/2 rounded bg-bg" /></div></div>)}</div>}
      {error && <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-[9px] leading-relaxed text-red-500"><p>{error}</p><button type="button" onClick={() => setRetryKey((key) => key + 1)} className="mt-2 inline-flex items-center gap-1 rounded border border-red-500/30 px-2 py-1 font-semibold"><RefreshCw size={10} /> Retry</button></div>}
      {!loading && !error && filteredProducts.length > 0 && <div className="grid grid-cols-2 gap-2">
        {filteredProducts.map((product) => {
          const selected = selectedProductName === product.name;
          return <article key={product.id} className={`min-w-0 overflow-hidden rounded-md border bg-bg transition-colors ${selected ? "border-accent ring-1 ring-accent/40" : "border-border hover:border-accent/60"}`}>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[#f0f0ed] dark:bg-[#202020]">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" /> : <div className="flex flex-col items-center gap-1 text-text-faint"><Shirt size={28} strokeWidth={1.2} /><Package size={11} /></div>}
              {product.isNew && <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[7px] font-black text-accent-foreground">NEW</span>}
            </div>
            <div className="p-2">
              <p className="truncate text-[9px] font-semibold text-text-primary" title={product.name}>{product.name}</p>
              <p className="mt-0.5 truncate text-[8px] text-text-muted">{formatPrice(product)}</p>
              <button type="button" aria-pressed={selected} onClick={() => onSelectProduct(product)} className={`mt-1.5 w-full rounded px-1.5 py-1.5 text-[8px] font-bold ${selected ? "bg-accent/10 text-accent" : "bg-accent text-accent-foreground hover:brightness-95"}`}>{selected ? "Selected" : "Use this product"}</button>
              <a href={`/products/${encodeURIComponent(product.slug)}`} target="_blank" rel="noreferrer" className="mt-1 flex items-center justify-center gap-1 text-[8px] text-text-faint hover:text-accent">Details <ExternalLink size={9} /></a>
            </div>
          </article>;
        })}
      </div>}
      {!loading && !error && !filteredProducts.length && <div className="rounded-md border border-dashed border-border px-3 py-7 text-center text-[9px] leading-relaxed text-text-faint">{products.length ? "No matching products. Try another search or filter." : "There are no products in the store catalog yet."}</div>}
      <p className="text-[8px] leading-relaxed text-text-faint">Product data and preview images are read from the current store catalog. Future product images can move to the planned private R2 asset keys.</p>
    </div>
  );
}
