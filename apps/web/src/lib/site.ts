export const SITE_NAME = "MH Fashion";
export const SITE_DESCRIPTION =
  "Design and order custom T-shirts, phone covers, jerseys and more. Printed on demand and delivered across Myanmar.";

/**
 * The public origin, only when it is configured and safe. A preview host or a localhost URL must never
 * end up in a canonical link or a JSON-LD `url`, so nothing is guessed: no origin means no absolute URL.
 */
export function getSiteOrigin(): string | undefined {
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

/** Absolute for a path or an already-absolute URL; undefined when there is no origin to resolve against. */
export function absoluteUrl(pathOrUrl: string, origin: string | undefined = getSiteOrigin()): string | undefined {
  if (!pathOrUrl) return undefined;
  try {
    return new URL(pathOrUrl, origin ? `${origin}/` : undefined).toString();
  } catch {
    return undefined;
  }
}
