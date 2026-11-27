/**
 * Where a public bucket key is fetched from. The bucket address is a setting
 * (`NEXT_PUBLIC_R2_PUBLIC_URL`), never a literal, so a move to another host is one variable. A key that
 * is already an absolute URL is left alone, so a placeholder entry keeps working beside a bucket entry.
 */
export function publicAssetUrl(base: string, key: string): string {
  const path = key.trim().replace(/^\/+/, "");
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const root = base.trim().replace(/\/+$/, "");
  return root ? `${root}/${path}` : path;
}
