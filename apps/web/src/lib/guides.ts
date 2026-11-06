import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { GUIDE_STARTER_CATALOG } from "./guide-starter";

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type GuideCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type GuidePost = {
  id: string;
  slug: string;
  categorySlug: string;
  title: string;
  excerpt: string;
  sections: GuideSection[];
  readingMinutes: number;
  featured: boolean;
  publishedAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type GuideCatalog = {
  categories: GuideCategory[];
  posts: GuidePost[];
  source: "supabase" | "starter" | "unavailable";
};

type GuideCategoryRow = {
  id: unknown;
  slug: unknown;
  name: unknown;
  description: unknown;
};

type GuidePostRow = {
  id: unknown;
  category_id: unknown;
  slug: unknown;
  title: unknown;
  excerpt: unknown;
  sections: unknown;
  reading_minutes: unknown;
  featured: unknown;
  published_at: unknown;
  seo_title: unknown;
  seo_description: unknown;
};

const GUIDE_QUERY_TIMEOUT_MS = 8_000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeText(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function unavailableCatalog(): GuideCatalog {
  return { categories: [], posts: [], source: "unavailable" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function parseGuideSection(value: unknown): GuideSection | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.heading)) return null;
  if (
    !Array.isArray(value.paragraphs) ||
    value.paragraphs.length === 0 ||
    !value.paragraphs.every(isNonEmptyString)
  ) {
    return null;
  }

  if (value.bullets !== undefined) {
    if (
      !Array.isArray(value.bullets) ||
      value.bullets.length === 0 ||
      !value.bullets.every(isNonEmptyString)
    ) {
      return null;
    }
  }

  return {
    heading: value.heading,
    paragraphs: value.paragraphs,
    ...(value.bullets === undefined ? {} : { bullets: value.bullets }),
  };
}

function parseGuideCategory(value: unknown): GuideCategory | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.slug) ||
    !SLUG_PATTERN.test(value.slug) ||
    !isNonEmptyString(value.name) ||
    !isNonEmptyString(value.description)
  ) {
    return null;
  }

  return {
    id: value.id,
    slug: value.slug,
    name: value.name,
    description: value.description,
  };
}

function parseGuidePost(
  value: unknown,
  categorySlugsById: Map<string, string>
): GuidePost | null {
  if (!isRecord(value)) return null;
  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.slug) ||
    !SLUG_PATTERN.test(value.slug) ||
    !isNonEmptyString(value.category_id) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.excerpt) ||
    !Array.isArray(value.sections) ||
    value.sections.length === 0 ||
    !isInteger(value.reading_minutes) ||
    value.reading_minutes < 1 ||
    value.reading_minutes > 60 ||
    typeof value.featured !== "boolean" ||
    !isNullableString(value.published_at) ||
    !isNullableString(value.seo_title) ||
    !isNullableString(value.seo_description)
  ) {
    return null;
  }

  const categorySlug = categorySlugsById.get(value.category_id);
  if (!categorySlug) return null;

  const sections = value.sections
    .map(parseGuideSection)
    .filter((section): section is GuideSection => section !== null);
  if (sections.length !== value.sections.length) return null;

  return {
    id: value.id,
    slug: value.slug,
    categorySlug,
    title: value.title,
    excerpt: value.excerpt,
    sections,
    readingMinutes: value.reading_minutes,
    featured: value.featured,
    publishedAt: value.published_at,
    seoTitle: value.seo_title,
    seoDescription: value.seo_description,
  };
}

const fetchWithGuideTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GUIDE_QUERY_TIMEOUT_MS);
  const upstreamSignal = init?.signal;
  const abortFromUpstream = () => controller.abort();

  if (upstreamSignal?.aborted) {
    controller.abort();
  } else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
};

function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    global: { fetch: fetchWithGuideTimeout },
  });
}

function isMissingGuideTablesError(error: unknown): boolean {
  if (!isRecord(error) || typeof error.code !== "string") return false;
  const code = error.code.toLocaleUpperCase();
  return code === "42P01" || code === "PGRST205";
}

async function loadGuideCatalog(): Promise<GuideCatalog> {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return GUIDE_STARTER_CATALOG;

    const publicationTime = new Date().toISOString();
    const [categoriesResult, postsResult] = await Promise.all([
      supabase
        .from("guide_categories")
        .select("id, slug, name, description")
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", publicationTime)
        .order("created_at", { ascending: true }),
      supabase
        .from("guide_posts")
        .select(
          "id, category_id, slug, title, excerpt, sections, reading_minutes, featured, published_at, seo_title, seo_description"
        )
        .eq("status", "published")
        .not("published_at", "is", null)
        .lte("published_at", publicationTime)
        .order("featured", { ascending: false })
        .order("published_at", { ascending: false }),
    ]);

    if (
      isMissingGuideTablesError(categoriesResult.error) ||
      isMissingGuideTablesError(postsResult.error)
    ) {
      return GUIDE_STARTER_CATALOG;
    }
    if (categoriesResult.error || postsResult.error) {
      console.error(
        "getGuideCatalog failed:",
        categoriesResult.error?.message ?? postsResult.error?.message
      );
      return unavailableCatalog();
    }

    const categories = (categoriesResult.data ?? [])
      .map((row) => parseGuideCategory(row as GuideCategoryRow))
      .filter((category): category is GuideCategory => category !== null);
    const categorySlugsById = new Map(
      categories.map((category) => [category.id, category.slug])
    );
    const posts = (postsResult.data ?? [])
      .map((row) => parseGuidePost(row as GuidePostRow, categorySlugsById))
      .filter((post): post is GuidePost => post !== null);

    return { categories, posts, source: "supabase" };
  } catch (error) {
    console.error("getGuideCatalog failed:", error);
    return unavailableCatalog();
  }
}

const getGuideCatalogCached = cache(
  async (): Promise<GuideCatalog> => loadGuideCatalog()
);

export async function getGuideCatalog(): Promise<GuideCatalog> {
  return getGuideCatalogCached();
}

const getGuidePostBySlugCached = cache(
  async (slug: string): Promise<GuidePost | null> => {
    const normalizedSlug = slug.trim().toLocaleLowerCase();
    if (!normalizedSlug) return null;
    const catalog = await getGuideCatalog();
    return (
      catalog.posts.find(
        (post) => post.slug.toLocaleLowerCase() === normalizedSlug
      ) ?? null
    );
  }
);

export async function getGuidePostBySlug(
  slug: string
): Promise<GuidePost | null> {
  return getGuidePostBySlugCached(slug);
}

export function filterGuidePosts(
  posts: GuidePost[],
  categorySlug: string,
  query: string
): GuidePost[] {
  const normalizedCategory = normalizeText(categorySlug);
  const normalizedQuery = normalizeText(query);

  return posts.filter((post) => {
    if (
      normalizedCategory &&
      normalizeText(post.categorySlug) !== normalizedCategory
    ) {
      return false;
    }
    if (!normalizedQuery) return true;

    const searchableText = normalizeText(
      [
        post.categorySlug,
        post.title,
        post.excerpt,
        ...post.sections.flatMap((section) => [
          section.heading,
          ...section.paragraphs,
          ...(section.bullets ?? []),
        ]),
      ].join(" ")
    );
    return searchableText.includes(normalizedQuery);
  });
}
