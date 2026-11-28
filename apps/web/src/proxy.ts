import { NextResponse } from "next/server";

/**
 * Plan §19.6 and §19.10 S3: the site used to serve the platform defaults, so it sent no content policy and
 * no transport hardening. These headers are set once, here, for every response — pages, route handlers and
 * the editor alike.
 *
 * The policy is written around what the app actually loads, not around a template:
 * - `script-src 'self' 'unsafe-inline'` — the App Router emits inline bootstrap/flight data; there is no
 *   nonce plumbing, and an inline script cannot be injected here without an HTML injection first.
 * - `style-src 'self' 'unsafe-inline'` — canvas geometry and the docked panels are inline styles.
 * - `img-src 'self' data: blob: https:` — every design preview, uploaded photo and SVG is a data URL, the
 *   editor reads blobs, and catalogue/mockup pictures may arrive from the R2 public host.
 * - `connect-src 'self' https: wss:` — Supabase REST/auth and the payment, delivery and search routes.
 * - `frame-ancestors 'none'` — nothing frames the shop; `object-src 'none'` — no plugin content.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https: wss:",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": CONTENT_SECURITY_POLICY,
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
};

export function proxy() {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

export default proxy;

/** Static bundles and the service worker keep their own caching; everything else gets the policy. */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
