import type { Metadata } from "next";
import { getSiteOrigin } from "./site";

// The origin policy lives in `site.ts`; this name is kept for the guide pages and their tests.
export { getSiteOrigin as getGuideSiteOrigin } from "./site";

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
  const origin = getSiteOrigin();
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
