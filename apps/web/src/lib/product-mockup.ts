// Product mockups live in Cloudflare R2 once the bucket is live. The public bucket origin
// goes in NEXT_PUBLIC_R2_PUBLIC_URL.
//
// There are two independent mockup sets, because the two places show the garment differently:
//   mockups/product/<product-slug>/<look>.<ext>  — catalogue photos (styled, 4:5 portrait)
//   mockups/editor/<product-slug>/<look>.<ext>   — editor panel photos (flat, 1:1 square)
//   mockups/3d/<product-slug>/<look>.<ext>       — 3D renders, reserved for the 3D mockup viewer
// The 3D set also has its models at models/<product-slug>.glb; the folder exists so the renders
// and the models can be uploaded before the viewer ships without another migration.
// The flat `mockups/<product-slug>/<look>.<ext>` layout is still tried after the product set so
// photos uploaded before the split keep working.
//
// A look is the colour plus whatever changes the silhouette: fit and sleeve. Size is left
// out on purpose — the photo of a black oversized tee is the same for M and XL — so the
// lookup walks from the most specific look to the least specific one and only then falls
// back to the catalog image.
export const R2_MOCKUP_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim().replace(/\/+$/, "");

export const MOCKUP_EXTENSIONS = ["webp", "png", "jpg"] as const;

/** Where a mockup is shown: the catalogue, the editor panel, or the 3D viewer. */
export type MockupSet = "editor" | "product" | "3d";

export const MOCKUP_SETS: readonly MockupSet[] = ["product", "editor", "3d"] as const;

/** Rendered turntable frames and the model they come from, per set. */
export const MOCKUP_MODEL_EXTENSIONS = ["glb", "gltf"] as const;

export function mockupSetFolder(set: MockupSet): string {
  return `mockups/${set}`;
}

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

/**
 * Editor look keys. The editor panel is one square garment seen straight on, so the look is the
 * colour plus the fabric weight (GSM changes the drape, not the silhouette) — never the fit or
 * the sleeve, which the editor does not choose.
 */
export function editorMockupKeys(slug: string, selection: { color?: string | null; gsm?: string | null }): string[] {
  const product = mockupSegment(slug);
  if (!product) return [];
  const color = mockupSegment(selection.color);
  const gsm = mockupSegment(selection.gsm);
  const keys: string[] = [];
  if (color && gsm) keys.push(`${color}-${gsm}`);
  if (color) keys.push(color);
  if (gsm) keys.push(gsm);
  keys.push("default");
  return [...new Set(keys)];
}

export function editorMockupCandidates(
  slug: string,
  selection: { color?: string | null; gsm?: string | null },
  options: { base?: string; extensions?: readonly string[] } = {},
): string[] {
  const base = (options.base ?? R2_MOCKUP_BASE).replace(/\/+$/, "");
  const product = mockupSegment(slug);
  const extensions = options.extensions ?? MOCKUP_EXTENSIONS;
  if (!base || !product) return [];
  const urls = editorMockupKeys(product, selection).flatMap((key) =>
    extensions.map((extension) => `${base}/${mockupSetFolder("editor")}/${product}/${key}.${extension}`),
  );
  return [...new Set(urls)];
}

export function mockupCandidates(
  slug: string,
  selection: ProductSelection,
  options: {
    base?: string;
    extensions?: readonly string[];
    fallback?: string | null;
    includeDefault?: boolean;
    set?: MockupSet;
    /** Also try the pre-split `mockups/<slug>/...` layout (catalogue only). */
    legacy?: boolean;
  } = {},
): string[] {
  const base = (options.base ?? R2_MOCKUP_BASE).replace(/\/+$/, "");
  const extensions = options.extensions ?? MOCKUP_EXTENSIONS;
  const product = mockupSegment(slug);
  const set = options.set ?? "product";
  const urls: string[] = [];
  if (base && product) {
    const keys = mockupKeys(product, selection);
    // Colour thumbnails drop the generic "default" look: falling back to it would paint every
    // colour with the same photo, which reads as a duplicate rather than a colour.
    const visible = options.includeDefault === false ? keys.filter((key) => key !== "default") : keys;
    for (const key of visible) {
      for (const extension of extensions) urls.push(`${base}/${mockupSetFolder(set)}/${product}/${key}.${extension}`);
    }
    if (set === "product" && options.legacy !== false) {
      for (const key of visible) {
        for (const extension of extensions) urls.push(`${base}/mockups/${product}/${key}.${extension}`);
      }
    }
  }
  if (options.fallback) urls.push(options.fallback);
  return [...new Set(urls)];
}

export function selectionLabel(selection: ProductSelection): string {
  return [selection.color, selection.fit, selection.sleeve].filter(Boolean).join(" · ");
}
