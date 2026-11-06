import type { Metadata } from "next";

// Do not guess the production domain or derive canonical links from Preview.
export function getGuideSiteOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    if (
      url.protocol !== "https:" || url.username || url.password ||
      url.hostname === "localhost" || url.hostname === "127.0.0.1" ||
      url.pathname !== "/" || url.search || url.hash
    ) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function guideMetadata({
  title,
  description,
  path,
  article = false,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  article?: boolean;
  noindex?: boolean;
}): Metadata {
  const origin = getGuideSiteOrigin();
  const url = origin ? `${origin}${path}` : undefined;
  return {
    title,
    description,
    ...(url ? { alternates: { canonical: url } } : {}),
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: article ? "article" : "website",
      title,
      description,
      siteName: "MH Fashion",
      ...(url ? { url } : {}),
    },
    twitter: { card: "summary", title, description },
  };
}
