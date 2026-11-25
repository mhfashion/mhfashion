"use client";

import { Check, Heart, Minus, Plus, Ruler, Share2, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import ProductMockupPreview from "@/components/ProductMockupPreview";
import ProductSizeChart from "@/components/ProductSizeChart";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { readDesignDraft, resolveDesignOverlay, type DesignOverlay } from "@/lib/design-draft";
import { isDesignEditable } from "@/lib/product-editing";
import {
  CART_VARIANT_KEYS,
  defaultOptionSelection,
  missingOptionKeys,
  resolveProductOptionGroups,
  type ProductOptionGroup,
} from "@/lib/product-options";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  related: Product[];
  /** The admin's ticked attribute rows; `null` means the catalogue has none yet. */
  optionGroups?: ProductOptionGroup[] | null;
};
type Tab = "details" | "specifications" | "size" | "reviews" | "shipping";

// Swatch colours for the names the catalogue uses; an admin colour we do not know still gets a tile.
const SWATCH_CLASS: Record<string, string> = {
  Black: "bg-black",
  White: "bg-white",
  Green: "bg-[#236b42]",
  Sand: "bg-[#d4b78b]",
  Red: "bg-[#b83219]",
  Navy: "bg-[#203459]",
  Blue: "bg-[#2563eb]",
  Grey: "bg-[#6b7280]",
  Gray: "bg-[#6b7280]",
  Yellow: "bg-[#facc15]",
};

// Selection-independent groups keep the mockup complete when the admin left them out.
const PRESELECTED_GROUPS = ["fit", "sleeve"];
const tabs: { id: Tab; label: string }[] = [
  { id: "details", label: "Product Details" },
  { id: "specifications", label: "Specifications" },
  { id: "size", label: "Size Guide" },
  { id: "reviews", label: "Reviews (126)" },
  { id: "shipping", label: "Shipping & Returns" },
];

function OptionButton({ selected, children, onClick }: { selected: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`rounded-md border px-1.5 py-1 text-[8px] font-semibold leading-none transition ${selected ? "border-accent bg-accent/10 text-accent shadow-sm" : "border-border bg-bg hover:border-accent/60"}`}>
      {selected && <Check size={12} className="mr-1 inline-block" aria-hidden="true" />}
      {children}
    </button>
  );
}

function OptionGroup({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="p-0">
      <div className="mb-1 flex items-center justify-between gap-1">
        <h3 className="text-[9px] font-black leading-none tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function ProductDetailClient({ product, related, optionGroups: catalogueGroups = null }: Props) {
  const router = useRouter();
  const { addItem } = useCart();
  const { formatRangeKs } = useCurrency();
  const { t } = useI18n();
  const designEditable = isDesignEditable(product);
  // Every box on the page comes from the post's attributes: a colour the admin did not tick is not offered.
  const optionGroups = useMemo(
    () => resolveProductOptionGroups(catalogueGroups, { readyMade: !designEditable }),
    [catalogueGroups, designEditable],
  );
  const [selection, setSelection] = useState<Record<string, string>>(() => {
    const initial = defaultOptionSelection(optionGroups);
    for (const group of optionGroups) {
      if (PRESELECTED_GROUPS.includes(group.key) && !initial[group.key]) initial[group.key] = group.options[0];
    }
    return initial;
  });
  const selectOption = (key: string, value: string) => setSelection((current) => ({ ...current, [key]: value }));
  const selectedSize = selection.size ?? null;
  const selectedColor = selection.color ?? null;
  const selectedMaterial = selection.material ?? null;
  const selectedGsm = selection.gsm ?? null;
  const selectedFit = selection.fit ?? "";
  const selectedSleeve = selection.sleeve ?? "";
  const setSelectedColor = (value: string | null) => selectOption("color", value ?? "");
  const colorGroup = optionGroups.find((group) => group.key === "color");
  const sizeGroup = optionGroups.find((group) => group.key === "size");
  const colourChoices = (colorGroup?.options ?? []).map((name) => ({ name, className: SWATCH_CLASS[name] }));
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [design, setDesign] = useState<DesignOverlay | null>(
    product.designSvgUrl ? { kind: "svg", url: product.designSvgUrl } : null,
  );
  const [favorite, setFavorite] = useState(false);
  const [added, setAdded] = useState(false);
  const [variantWarning, setVariantWarning] = useState(false);

  // `?design=` carries a shared artwork; otherwise the design open in the editor is used.
  // A ready-made product (Nyein) never paints an editor draft: its artwork is printed already.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("design");
    setDesign(resolveDesignOverlay({
      svgUrl: shared ?? product.designSvgUrl,
      draft: designEditable ? readDesignDraft() : null,
    }));
  }, [product.designSvgUrl, designEditable]);

  const sizePrice = ({ S: 0, M: 1000, L: 2000, XL: 3000, XXL: 4000 } as Record<string, number>)[selectedSize ?? ""] ?? 0;
  const colorPrice = { Black: 0, White: 500, Green: 1000, Sand: 500, Red: 1000, Navy: 500 }[selectedColor ?? ""] ?? 0;
  const materialPrice = { Cotton: 0, "Premium Cotton": 3000, Polyester: 1000, Blend: 1500 }[selectedMaterial ?? ""] ?? 0;
  const gsmPrice = { "160 GSM": 0, "180 GSM": 1000, "200 GSM": 2000, "240 GSM": 3500 }[selectedGsm ?? ""] ?? 0;
  const variantPriceMin = product.priceMinKs + sizePrice + colorPrice + materialPrice + gsmPrice;
  const variantPriceMax = product.priceMaxKs + sizePrice + colorPrice + materialPrice + gsmPrice;
  const unansweredOptions = missingOptionKeys(optionGroups, selection);
  const hasCompleteVariantSelection = unansweredOptions.length === 0;
  const price = hasCompleteVariantSelection
    ? `${(variantPriceMax * quantity).toLocaleString("en-US")} Ks`
    : formatRangeKs(variantPriceMin * quantity, variantPriceMax * quantity);
  const extras = Object.fromEntries(
    optionGroups
      .filter((group) => !(CART_VARIANT_KEYS as readonly string[]).includes(group.key))
      .map((group) => [group.label, selection[group.key] ?? ""] as const)
      .filter(([, value]) => Boolean(value)),
  );
  const variant = {
    size: selectedSize,
    color: selectedColor,
    material: selectedMaterial,
    gsm: selectedGsm,
    fit: selectedFit || null,
    sleeve: selectedSleeve || null,
    ...(Object.keys(extras).length ? { extras } : {}),
  };
  const missingVariant = !hasCompleteVariantSelection;
  const firstMissingLabel = optionGroups.find((group) => group.key === unansweredOptions[0])?.label ?? "option";
  const addQuantityToCart = () => {
    // One line per exact combination: a different size or colour never merges into this one.
    addItem(product, variant, quantity, hasCompleteVariantSelection ? variantPriceMax : undefined);
  };
  const addToCart = () => {
    if (missingVariant) {
      setVariantWarning(true);
      return;
    }
    setVariantWarning(false);
    addQuantityToCart();
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };
  const buyNow = () => {
    if (missingVariant) {
      setVariantWarning(true);
      return;
    }
    addQuantityToCart();
    router.push("/cart");
  };
  const shareProduct = async () => {
    const shareData = { title: product.name, text: `Check out ${product.name} on MH Fashion`, url: window.location.href };
    if (navigator.share) await navigator.share(shareData).catch(() => undefined);
    else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <>
      <section className="grid gap-2 rounded-xl border-0 bg-transparent p-0 shadow-none sm:border sm:border-border/70 sm:bg-bg-surface sm:p-2 sm:shadow-[0_8px_30px_rgba(30,40,20,0.06)] lg:grid-cols-[minmax(0,640px)_minmax(0,1fr)] lg:gap-2.5 lg:p-2.5">
        <div className="mx-auto min-w-0 w-full max-w-[min(100%,640px)] lg:max-w-[640px]">
          <div className="relative">
            <ProductMockupPreview
              slug={product.slug}
              name={product.name}
              imageUrl={product.imageUrl}
              selection={{ color: selectedColor, fit: selectedFit, sleeve: selectedSleeve, size: selectedSize }}
              design={design}
              colours={colourChoices}
              onSelectColour={setSelectedColor}
            />
            {product.isNew && <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-[10px] font-black text-accent-foreground">NEW</span>}
          </div>
          <p data-mockup-caption className="mt-1 text-center text-[9px] text-text-muted">
            {selectedColor || selectedMaterial || selectedGsm
              ? `Mockup: ${[selectedColor, selectedFit, selectedSleeve].filter(Boolean).join(" · ")}`
              : colorGroup
                ? "Pick a colour and fit to see the mockup"
                : "Ready-made print — pick a size to order"}
            {design ? " · your design on top" : ""}
          </p>
        </div>

        <div className="min-w-0 px-1 py-1 sm:px-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent">MH Fashion</p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-3xl">{product.name}</h1>
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-text-secondary"><span className="font-black tracking-wide text-[#f2b511]">★★★★★</span><b className="text-text-primary">4.9</b><span>·</span><span>126 sold</span></div>
            </div>
            <div className="flex gap-1.5">
              <button type="button" aria-label="Add to wishlist" onClick={() => setFavorite((value) => !value)} className={`rounded-full border border-border p-2.5 ${favorite ? "text-accent" : "text-text-secondary"}`}><Heart size={17} fill={favorite ? "currentColor" : "none"} /></button>
              <button type="button" aria-label="Share product" onClick={shareProduct} className="rounded-full border border-border p-2.5 text-text-secondary"><Share2 size={17} /></button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-border/70 pb-2.5 sm:mt-4 sm:gap-2 sm:pb-3"><span data-product-price aria-live="polite" className="text-xl font-black text-accent sm:text-2xl">{price}</span><span className="rounded-full bg-accent/10 px-2 py-1 text-[9px] font-black text-accent sm:text-[10px]">↓ 15%</span><span className="text-[10px] text-text-faint line-through sm:text-xs">28,000 Ks</span></div>

          <div className={optionGroups.length ? "mt-2 grid gap-1 xl:grid-cols-2" : "mt-2"}>
            {optionGroups.map((group) => (
              <OptionGroup
                key={group.key}
                title={`${group.label}${selection[group.key] && group.key !== "color" ? `: ${selection[group.key]}` : group.key === "color" && selection.color ? `: ${selection.color}` : ""}`}
                action={
                  group.key === "size" ? (
                    <button type="button" onClick={() => setActiveTab("size")} className="text-[10px] font-bold text-accent"><Ruler size={12} className="mr-1 inline" />Size Guide</button>
                  ) : group.key === "material" ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-black text-accent-foreground">New</span>
                  ) : undefined
                }
              >
                {group.key === "color"
                  ? group.options.map((name) => (
                      <button
                        key={name}
                        type="button"
                        aria-label={name}
                        aria-pressed={selectedColor === name}
                        onClick={() => selectOption("color", name)}
                        className={`h-5 w-5 rounded-full border ${SWATCH_CLASS[name] ?? "bg-bg-surface"} ${selectedColor === name ? "border-accent ring-1 ring-accent/25 ring-offset-1" : "border-border"}`}
                      />
                    ))
                  : group.options.map((option) => (
                      <OptionButton key={option} selected={selection[group.key] === option} onClick={() => selectOption(group.key, option)}>{option}</OptionButton>
                    ))}
              </OptionGroup>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3"><span className="text-xs font-black">Quantity</span><div className="flex items-center rounded-full border border-border bg-bg"><button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="p-2.5"><Minus size={14} /></button><span data-product-quantity aria-live="polite" className="min-w-8 text-center text-sm font-bold">{quantity}</span><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className="p-2.5"><Plus size={14} /></button></div><span className="flex items-center gap-1 text-[11px] font-bold text-accent"><Check size={14} /> In Stock · Ready to ship</span></div>
          <div className={`mt-3 grid gap-1 sm:gap-1.5 ${designEditable ? "grid-cols-3" : "grid-cols-2"}`}><button type="button" onClick={buyNow} data-buy-now className="min-w-0 whitespace-nowrap rounded-lg bg-accent px-1 py-2.5 text-[9px] font-black text-accent-foreground shadow-sm transition hover:opacity-85 sm:px-2 sm:text-xs"><ShoppingCart size={12} className="mr-0.5 inline sm:mr-1 sm:h-[14px] sm:w-[14px]" />{t("product.buyNow")}</button><button type="button" onClick={addToCart} data-add-to-cart className="min-w-0 whitespace-nowrap rounded-lg border-2 border-accent px-1 py-2.5 text-[9px] font-black text-accent transition hover:bg-accent hover:text-accent-foreground sm:px-2 sm:text-xs">{added ? t("product.addedToCart") : t("product.addToCart")}</button>{designEditable ? <a href={`/create?product=${encodeURIComponent(product.slug)}`} className="min-w-0 whitespace-nowrap rounded-lg border border-border px-1 py-2.5 text-center text-[9px] font-black text-text-primary transition hover:border-accent hover:text-accent sm:px-2 sm:text-xs">Edit Design</a> : null}</div>
          {variantWarning ? <p data-variant-warning role="status" className="mt-2 rounded-lg bg-[#fff6e6] px-2.5 py-1.5 text-[10px] font-semibold text-[#9a6a12]">Choose {unansweredOptions.length > 1 ? "each option" : firstMissingLabel.toLowerCase()} first — every combination is a separate order line.</p> : null}
        </div>
      </section>

      <section className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-bg-surface">
        <div className="flex gap-1 overflow-x-auto border-b border-border/70 p-1.5">{tabs.map((tab) => <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded-xl px-3 py-2.5 text-[11px] font-bold ${activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg"}`}>{tab.label}</button>)}</div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)]">
          <div><h2 className="text-base font-black">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>{activeTab === "details" && <div className="mt-3 space-y-2 text-xs leading-5 text-text-secondary">{designEditable ? null : <p data-ready-made className="font-semibold text-accent">{t("product.readyMade")}</p>}<p>{product.name} combines a clean everyday silhouette with a comfortable finish made for daily wear.</p><p className="flex items-center gap-2"><Check size={14} className="text-accent" /> Premium fabric and comfortable construction</p><p className="flex items-center gap-2"><Check size={14} className="text-accent" /> Modern minimal design</p></div>}{activeTab === "specifications" && <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2"><p><b className="text-text-primary">Product type:</b> {product.productType || "T-Shirt"}</p><p><b className="text-text-primary">Color:</b> {selectedColor || "Not selected"}</p><p><b className="text-text-primary">Material:</b> {selectedMaterial || "Not selected"}</p><p><b className="text-text-primary">Size:</b> {selectedSize || "Not selected"}</p><p><b className="text-text-primary">GSM:</b> {selectedGsm || "Not selected"}</p><p><b className="text-text-primary">Fit:</b> {selectedFit}</p><p><b className="text-text-primary">Sleeve:</b> {selectedSleeve}</p></div>}{activeTab === "size" && <div><p className="mt-3 text-xs leading-5 text-text-secondary">Choose your usual size for a relaxed fit. If you prefer an oversized look, choose one size up.</p><ProductSizeChart productId={product.id} sizes={sizeGroup?.options ?? []} /></div>}{activeTab === "reviews" && <p className="mt-3 text-xs leading-5 text-text-secondary">Reviews and verified buyer feedback will appear here as they are connected to the catalog.</p>}{activeTab === "shipping" && <p className="mt-3 text-xs leading-5 text-text-secondary">Orders are prepared for dispatch within 1–2 business days. Returns are accepted within 7 days for eligible items.</p>}</div>
          <div className="rounded-2xl border border-border/60 bg-bg p-3"><div className="flex items-center justify-between"><div><p className="text-3xl font-black">4.9</p><p className="text-[10px] text-text-muted">Based on 126 reviews</p></div><div className="text-right"><p className="text-sm tracking-wide text-[#f2b511]">★★★★★</p><button type="button" onClick={() => setActiveTab("reviews")} className="mt-2 text-[10px] font-bold text-accent">View all reviews →</button></div></div><div className="mt-3 space-y-1.5 text-[10px] text-text-muted">{[[5, "92%"], [4, "6%"], [3, "1%"], [2, "1%"], [1, "0%"]].map(([stars, percentage]) => <div key={stars} className="flex items-center gap-2"><span>{stars} ★</span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border"><span className="block h-full rounded-full bg-accent" style={{ width: percentage }} /></span><span>{percentage}</span></div>)}</div></div>
        </div>
      </section>

      {related.length > 0 && <section className="mt-5"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-black">Related Products</h2><a href="/popular" className="text-[10px] font-bold text-accent">See more →</a></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{related.map((item) => <ProductCard key={item.id} product={item} boxed />)}</div></section>}
    </>
  );
}
