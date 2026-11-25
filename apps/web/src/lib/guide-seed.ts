import { GUIDE_STARTER_CATALOG } from "./guide-starter";
import type { GuideCatalog } from "./guides";

/**
 * The starter handbook as database rows. The guide tables are the only source
 * the site reads once they exist, and nothing else writes them, so publishing
 * the built-in posts means inserting exactly these rows.
 */
export type GuideSeedCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "published";
  published_at: string;
  created_at: string;
};

export type GuideSeedPostRow = {
  id: string;
  category_id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  sections: unknown;
  reading_minutes: number;
  featured: boolean;
  status: "published";
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
  product_links: unknown[];
};

export type GuideSeedRows = {
  categories: GuideSeedCategoryRow[];
  posts: GuideSeedPostRow[];
};

export function guideSeedRows(
  catalog: GuideCatalog = GUIDE_STARTER_CATALOG,
  publishedAt: string = new Date().toISOString(),
): GuideSeedRows {
  const categoryIdBySlug = new Map(catalog.categories.map((category) => [category.slug, category.id]));
  return {
    categories: catalog.categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      status: "published" as const,
      published_at: publishedAt,
      created_at: publishedAt,
    })),
    posts: catalog.posts.map((post) => {
      const categoryId = categoryIdBySlug.get(post.categorySlug);
      if (!categoryId) throw new Error(`Guide post ${post.slug} points at unknown category ${post.categorySlug}`);
      return {
        id: post.id,
        category_id: categoryId,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        cover_image_url: post.coverImageUrl ?? null,
        sections: post.sections,
        reading_minutes: post.readingMinutes,
        featured: post.featured,
        status: "published" as const,
        published_at: publishedAt,
        seo_title: post.seoTitle ?? null,
        seo_description: post.seoDescription ?? null,
        product_links: post.productLinks ?? [],
      };
    }),
  };
}
