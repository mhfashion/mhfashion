import type { GuidePost } from "@/lib/guides";
import type { Product } from "@/lib/types";
import type { InfoSection } from "@/lib/storefront-info";
import { CONTACT_EMAIL } from "@/lib/storefront-info";
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, getSiteOrigin } from "@/lib/site";

const CONTEXT = "https://schema.org";

type JsonLd = Record<string, unknown>;

/**
 * `<` and `>` are escaped because the payload is inlined in a script tag: a product name that contains
 * `</script>` would otherwise close the element early.
 */
export function serializeJsonLd(value: unknown): string {
  const json = JSON.stringify(value);
  if (json === undefined) return "null";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function organizationSchema(origin: string | undefined = getSiteOrigin()): JsonLd {
  const url = absoluteUrl("/", origin);
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    ...(url ? { url } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONTACT_EMAIL,
        areaServed: "MM",
        availableLanguage: ["en", "my"],
      },
    ],
  };
}

/** The site-wide node. The search action points at the real `/search` page, so the sitelinks box works. */
export function websiteSchema(origin: string | undefined = getSiteOrigin()): JsonLd {
  const url = absoluteUrl("/", origin);
  const search = absoluteUrl("/search", origin);
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    name: SITE_NAME,
    ...(url ? { url } : {}),
    ...(search
      ? {
          potentialAction: {
            "@type": "SearchAction",
            target: `${search}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }
      : {}),
  };
}

export function productDescription(product: Product): string {
  const kind = product.productType ? `a ${product.productType}` : "a product";
  const line = product.subBrand ? ` from the ${product.subBrand} line` : "";
  return `${product.name} is ${kind}${line}. Personalise the design in the ${SITE_NAME} editor and we print it on demand.`;
}

/**
 * Product with an AggregateOffer: the catalogue carries a price range per product, and a range is what
 * the card and the product page show, so the structured data must not pretend there is a single price.
 */
export function productSchema(product: Product, origin: string | undefined = getSiteOrigin()): JsonLd {
  const url = absoluteUrl(`/products/${encodeURIComponent(product.slug)}`, origin);
  const image = product.imageUrl ? absoluteUrl(product.imageUrl, origin) : undefined;
  const lowPrice = Math.max(0, Math.round(product.priceMinKs));
  const highPrice = Math.max(lowPrice, Math.round(product.priceMaxKs));
  return {
    "@context": CONTEXT,
    "@type": "Product",
    name: product.name,
    sku: product.id,
    description: productDescription(product),
    ...(url ? { url } : {}),
    ...(image ? { image: [image] } : {}),
    ...(product.productType ? { category: product.productType } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "MMK",
      lowPrice,
      highPrice,
      offerCount: 1,
      availability: "https://schema.org/InStock",
      ...(url ? { url } : {}),
    },
  };
}

export function breadcrumbSchema(
  items: { name: string; path: string }[],
  origin: string | undefined = getSiteOrigin(),
): JsonLd {
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const url = absoluteUrl(item.path, origin);
      return { "@type": "ListItem", position: index + 1, name: item.name, ...(url ? { item: url } : {}) };
    }),
  };
}

/** An answer with no text is dropped: an empty `acceptedAnswer` is a markup error, not a thin answer. */
export function faqSchema(sections: InfoSection[]): JsonLd {
  const entries = sections
    .map((section) => ({
      question: section.heading.trim(),
      answer: [...(section.body ?? []), ...(section.bullets ?? [])].join(" ").replace(/\s+/g, " ").trim(),
    }))
    .filter((entry) => entry.question.length > 0 && entry.answer.length > 0);
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export function articleSchema(
  post: Pick<GuidePost, "slug" | "title" | "excerpt" | "seoDescription" | "publishedAt" | "coverImageUrl">,
  options: { categoryName?: string; origin?: string } = {},
): JsonLd {
  const origin = options.origin ?? getSiteOrigin();
  const url = absoluteUrl(`/guide/${encodeURIComponent(post.slug)}`, origin);
  const image = post.coverImageUrl ? absoluteUrl(post.coverImageUrl, origin) : undefined;
  return {
    "@context": CONTEXT,
    "@type": "Article",
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    ...(url ? { url, mainEntityOfPage: url } : {}),
    ...(image ? { image: [image] } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt, dateModified: post.publishedAt } : {}),
    ...(options.categoryName ? { articleSection: options.categoryName } : {}),
    inLanguage: "en",
    publisher: { "@type": "Organization", name: SITE_NAME, ...(absoluteUrl("/", origin) ? { url: absoluteUrl("/", origin) } : {}) },
  };
}
