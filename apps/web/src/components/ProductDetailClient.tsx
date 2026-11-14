"use client";

import {
  Check,
  ChevronDown,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Ruler,
  Share2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

type Props = { product: Product; related: Product[] };
type Tab = "details" | "specifications" | "size" | "reviews" | "shipping";

const sizes = ["S", "M", "L", "XL", "XXL"];
const colors = [
  { name: "Black", className: "bg-black" },
  { name: "White", className: "bg-white" },
  { name: "Green", className: "bg-[#236b42]" },
  { name: "Sand", className: "bg-[#d4b78b]" },
  { name: "Red", className: "bg-[#b83219]" },
  { name: "Navy", className: "bg-[#203459]" },
];
const tabs: { id: Tab; label: string }[] = [
  { id: "details", label: "Product Details" },
  { id: "specifications", label: "Specifications" },
  { id: "size", label: "Size Guide" },
  { id: "reviews", label: "Reviews (126)" },
  { id: "shipping", label: "Shipping & Returns" },
];

function OptionButton({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${selected ? "border-accent bg-accent/10 text-accent shadow-sm" : "border-border bg-bg hover:border-accent/60"}`}>
      {selected && <Check size={12} className="mr-1 inline-block" aria-hidden="true" />}
      {children}
    </button>
  );
}

function OptionGroup({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-bg/70 p-2.5 shadow-[0_4px_18px_rgba(30,40,20,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-black tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function ProductDetailClient({ product, related }: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [activeImage, setActiveImage] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [added, setAdded] = useState(false);

  const price = formatRangeKs(product.priceMinKs, product.priceMaxKs);
  const addToCart = () => {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => {
    addItem(product);
    router.push("/cart");
  };

  return (
    <>
      <section className="grid gap-3 rounded-2xl border border-border/70 bg-bg-surface p-2.5 shadow-[0_8px_30px_rgba(30,40,20,0.06)] sm:p-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] lg:gap-4 lg:p-4">
        <div className="min-w-0">
          <div className="relative aspect-square overflow-hidden rounded-2xl border border-border/70 bg-bg">
            {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-text-muted">Product preview</div>}
            {product.isNew && <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-black text-accent-foreground">NEW</span>}
            <button type="button" aria-label="Previous product image" onClick={() => setActiveImage((activeImage + 3) % 4)} className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-primary shadow-sm"><ChevronDown className="rotate-90" size={17} /></button>
            <button type="button" aria-label="Next product image" onClick={() => setActiveImage((activeImage + 1) % 4)} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-primary shadow-sm"><ChevronDown className="-rotate-90" size={17} /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-text-secondary shadow-sm">{activeImage + 1} / 4</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <button key={index} type="button" onClick={() => setActiveImage(index)} className={`aspect-square overflow-hidden rounded-xl border-2 bg-bg ${activeImage === index ? "border-accent" : "border-border/60"}`}>
                {product.imageUrl && index < 2 ? <img src={product.imageUrl} alt={`${product.name} view ${index + 1}`} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-text-faint">View {index + 1}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 px-1 py-1 sm:px-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">MH Fashion</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{product.name}</h1>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-secondary"><span className="font-black tracking-wide text-[#f2b511]">★★★★★</span><b className="text-text-primary">4.9</b><span>·</span><span>126 sold</span></div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Add to wishlist" onClick={() => setFavorite((value) => !value)} className={`rounded-full border border-border p-2.5 ${favorite ? "text-accent" : "text-text-secondary"}`}><Heart size={17} fill={favorite ? "currentColor" : "none"} /></button>
              <button type="button" aria-label="Share product" className="rounded-full border border-border p-2.5 text-text-secondary"><Share2 size={17} /></button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-border/70 pb-3"><span className="text-2xl font-black text-accent">{price}</span><span className="rounded-full bg-accent/10 px-2 py-1 text-[10px] font-black text-accent">↓ 15%</span><span className="text-xs text-text-faint line-through">28,000 Ks</span></div>

          <div className="mt-3 grid gap-2 xl:grid-cols-2">
            <OptionGroup title="Size" action={<button type="button" className="text-[10px] font-bold text-accent"><Ruler size={12} className="mr-1 inline" />Size Guide</button>}>
              {sizes.map((size) => <OptionButton key={size} selected={selectedSize === size} onClick={() => setSelectedSize(size)}>{size}</OptionButton>)}
            </OptionGroup>
            <OptionGroup title={`Color: ${selectedColor}`}>
              {colors.map((color) => <button key={color.name} type="button" aria-label={color.name} onClick={() => setSelectedColor(color.name)} className={`h-8 w-8 rounded-full border-2 ${color.className} ${selectedColor === color.name ? "border-accent ring-2 ring-accent/25 ring-offset-2" : "border-border"}`} />)}
            </OptionGroup>
            <OptionGroup title="Material" action={<span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-accent-foreground">New</span>}>
              <OptionButton selected onClick={() => undefined}>Cotton</OptionButton><OptionButton selected={false} onClick={() => undefined}>Premium Cotton</OptionButton><OptionButton selected={false} onClick={() => undefined}>Polyester</OptionButton><OptionButton selected={false} onClick={() => undefined}>Blend</OptionButton>
            </OptionGroup>
            <OptionGroup title="Fit Type"><OptionButton selected onClick={() => undefined}>Oversized</OptionButton><OptionButton selected={false} onClick={() => undefined}>Regular</OptionButton><OptionButton selected={false} onClick={() => undefined}>Slim Fit</OptionButton><OptionButton selected={false} onClick={() => undefined}>Loose Fit</OptionButton></OptionGroup>
            <OptionGroup title="Sleeve"><OptionButton selected onClick={() => undefined}>Short Sleeve</OptionButton><OptionButton selected={false} onClick={() => undefined}>Long Sleeve</OptionButton></OptionGroup>
            <OptionGroup title="Print Style"><OptionButton selected onClick={() => undefined}>Front Print</OptionButton><OptionButton selected={false} onClick={() => undefined}>Back Print</OptionButton><OptionButton selected={false} onClick={() => undefined}>Both Side</OptionButton></OptionGroup>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-black">Quantity</span><div className="flex items-center rounded-full border border-border bg-bg"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-2.5"><Minus size={14} /></button><span className="min-w-8 text-center text-sm font-bold">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="p-2.5"><Plus size={14} /></button></div><span className="flex items-center gap-1 text-[11px] font-bold text-accent"><Check size={14} /> In Stock · Ready to ship</span></div>
          <div className="mt-3 grid grid-cols-3 gap-1.5"><button type="button" onClick={buyNow} className="rounded-lg bg-accent px-2 py-2.5 text-[11px] font-black text-accent-foreground shadow-sm transition hover:opacity-85 sm:text-xs"><ShoppingCart size={14} className="mr-1 inline" />{t("product.buyNow")}</button><button type="button" onClick={addToCart} className="rounded-lg border-2 border-accent px-2 py-2.5 text-[11px] font-black text-accent transition hover:bg-accent hover:text-accent-foreground sm:text-xs">{added ? t("product.addedToCart") : t("product.addToCart")}</button><a href={`/create?product=${encodeURIComponent(product.slug)}`} className="rounded-lg border border-border px-2 py-2.5 text-center text-[11px] font-black text-text-primary transition hover:border-accent hover:text-accent sm:text-xs">Edit Design</a></div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-accent/10 bg-accent/10 sm:grid-cols-5">
        {[[Truck, "Free Delivery", "On orders over 50K"], [ShieldCheck, "Secure Payment", "100% secure"], [RotateCcw, "Easy Returns", "7 days return"], [UserRound, "24/7 Support", "Get help anytime"], [Sparkles, "Seol Support", "Get help anytime"]].map(([Icon, title, text]) => <div key={title as string} className="bg-bg-surface px-3 py-3 text-center"><Icon size={19} className="mx-auto mb-1 text-accent" /><p className="text-[10px] font-black">{title as string}</p><p className="text-[9px] text-text-muted">{text as string}</p></div>)}
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-bg-surface">
        <div className="flex gap-1 overflow-x-auto border-b border-border/70 p-1.5">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-xl px-3 py-2.5 text-[11px] font-bold ${activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg"}`}>{tab.label}</button>)}</div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
          <div><h2 className="text-base font-black">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>{activeTab === "details" && <div className="mt-3 space-y-2 text-xs leading-5 text-text-secondary"><p>{product.name} combines a clean everyday silhouette with a comfortable finish made for daily wear.</p><p className="flex items-center gap-2"><Check size={14} className="text-accent" /> Premium fabric and comfortable construction</p><p className="flex items-center gap-2"><Check size={14} className="text-accent" /> Modern minimal design</p></div>}{activeTab === "specifications" && <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2"><p><b className="text-text-primary">Product type:</b> {product.productType || "T-Shirt"}</p><p><b className="text-text-primary">Color:</b> {selectedColor}</p><p><b className="text-text-primary">Fit:</b> Oversized</p><p><b className="text-text-primary">Print:</b> Front Print</p></div>}{activeTab === "size" && <p className="mt-3 text-xs leading-5 text-text-secondary">Choose your usual size for a relaxed fit. If you prefer an oversized look, choose one size up.</p>}{activeTab === "reviews" && <p className="mt-3 text-xs leading-5 text-text-secondary">Reviews and verified buyer feedback will appear here as they are connected to the catalog.</p>}{activeTab === "shipping" && <p className="mt-3 text-xs leading-5 text-text-secondary">Orders are prepared for dispatch within 1–2 business days. Returns are accepted within 7 days for eligible items.</p>}</div>
          <div className="rounded-2xl border border-border/60 bg-bg p-3"><div className="flex items-center justify-between"><div><p className="text-3xl font-black">4.9</p><p className="text-[10px] text-text-muted">Based on 126 reviews</p></div><div className="text-right"><p className="text-sm tracking-wide text-[#f2b511]">★★★★★</p><button type="button" className="mt-2 text-[10px] font-bold text-accent">View all reviews →</button></div></div><div className="mt-3 space-y-1.5 text-[10px] text-text-muted">{[[5, "92%"], [4, "6%"], [3, "1%"], [2, "1%"], [1, "0%"]].map(([stars, percentage]) => <div key={stars} className="flex items-center gap-2"><span>{stars} ★</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-accent" style={{ width: percentage }} /></span><span>{percentage}</span></div>)}</div></div>
        </div>
      </section>

      {related.length > 0 && <section className="mt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-black">Related Products</h2><a href="/popular" className="text-[10px] font-bold text-accent">See more →</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} boxed />)}</div></section>}
    </>
  );
}
