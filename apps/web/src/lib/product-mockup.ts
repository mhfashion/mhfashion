// Product mockups live in Cloudflare R2 once the bucket is live. The public bucket origin
// goes in NEXT_PUBLIC_R2_PUBLIC_URL and each object sits at
// `mockups/<product-slug>/<look>.<ext>`.
//
// A look is the colour plus whatever changes the silhouette: fit and sleeve. Size is left
// out on purpose — the photo of a black oversized tee is the same for M and XL — so the
// lookup walks from the most specific look to the least specific one and only then falls
// back to the catalog image.
export const R2_MOCKUP_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");

export const MOCKUP_EXTENSIONS = ["webp", "png", "jpg"] as const;

// Where the design sits on the mockup, as a fraction of the image box.
export const PRODUCT_PRINT_AREA = { left: 0.3, top: 0.22, width: 0.4, height: 0.46 } as const;

export type ProductSelection = {
  color?: string | null;
  fit?: string | null;
  sleeve?: string | null;
  size?: string | null;
};

export function mockupSegment(value?: string | null): string | null {
  const trimmed = (value ?? "").trim().toLowerCase();
  if (!trimmed) return null;
  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || null;
}

export function mockupKeys(slug: string, selection: ProductSelection): string[] {
  const product = mockupSegment(slug);
  if (!product) return [];
  const color = mockupSegment(selection.color);
  const fit = mockupSegment(selection.fit);
  const sleeve = mockupSegment(selection.sleeve);
  const keys: string[] = [];
  if (color) {
    if (fit && sleeve) keys.push(`${color}-${fit}-${sleeve}`);
    if (fit) keys.push(`${color}-${fit}`);
    if (sleeve) keys.push(`${color}-${sleeve}`);
    keys.push(color);
  } else {
    if (fit && sleeve) keys.push(`${fit}-${sleeve}`);
    if (fit) keys.push(fit);
    if (sleeve) keys.push(sleeve);
  }
  keys.push("default");
  return [...new Set(keys)];
}

export function mockupCandidates(
  slug: string,
  selection: ProductSelection,
  options: { base?: string; extensions?: readonly string[]; fallback?: string | null } = {},
): string[] {
  const base = (options.base ?? R2_MOCKUP_BASE).replace(/\/+$/, "");
  const extensions = options.extensions ?? MOCKUP_EXTENSIONS;
  const product = mockupSegment(slug);
  const urls: string[] = [];
  if (base && product) {
    for (const key of mockupKeys(product, selection)) {
      for (const extension of extensions) urls.push(`${base}/mockups/${product}/${key}.${extension}`);
    }
  }
  if (options.fallback) urls.push(options.fallback);
  return [...new Set(urls)];
}

export function selectionLabel(selection: ProductSelection): string {
  return [selection.color, selection.fit, selection.sleeve].filter(Boolean).join(" · ");
}
