import { bearerToken, type SupabaseEnv, verifySupabaseUser } from "./asset-session";

/**
 * Plan §19.10 S1: an admin API route may answer only a caller that proves it is staff. Two proofs exist
 * today, and either one is enough:
 *
 * 1. a bearer token equal to the server-only `ADMIN_API_TOKEN` (the shop's own staff tooling), or
 * 2. a Supabase access token whose user carries `app_metadata.role = "admin"`, which only the service role
 *    can write, so a customer cannot promote themselves.
 *
 * The admin screen itself is still browser-local (§10), so this is the guard that keeps the route from
 * answering the public until P0-2 replaces it with a real session.
 */
export type AdminGuardDecision =
  | { allowed: true; via: "token" | "staff" }
  | { allowed: false; status: 401; reason: "no-credentials" | "bad-token" | "not-staff" | "not-configured" };

/** A comma-separated allowlist, trimmed and without blanks. Empty or missing means "no one". */
export function parseAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Compares two strings without leaking where they differ through timing. A length difference is settled
 * first, because the loop below needs equal lengths; that leak is the length only, which is public anyway.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return diff === 0;
}

export type TokenDecision = "allowed" | "absent" | "refused";

/** What the request's bearer token is worth against the configured token. */
export function tokenDecision(header: string | null, token: string | undefined): TokenDecision {
  const configured = token?.trim();
  if (!configured) return "absent";
  const offered = bearerToken(new Request("http://localhost/", { headers: header ? { authorization: header } : {} }));
  if (!offered) return "absent";
  return safeEqual(offered, configured) ? "allowed" : "refused";
}

export type AdminGuardOptions = {
  env: SupabaseEnv;
  token?: string;
  allowUserIds?: string[];
  fetchImpl?: typeof fetch;
};

/** The whole decision, in the order the route makes it: token first, then a Supabase staff user. */
export async function authorizeAdmin(request: Request, options: AdminGuardOptions): Promise<AdminGuardDecision> {
  const decision = tokenDecision(request.headers.get("authorization"), options.token);
  if (decision === "allowed") return { allowed: true, via: "token" };
  if (decision === "refused") return { allowed: false, status: 401, reason: "bad-token" };

  const viewer = await verifySupabaseUser(options.env, request, options.fetchImpl ?? fetch);
  if (viewer?.role === "admin") return { allowed: true, via: "staff" };
  if (viewer) return { allowed: false, status: 401, reason: "not-staff" };
  return { allowed: false, status: 401, reason: options.token?.trim() ? "no-credentials" : "not-configured" };
}

/** One response shape for every refusal, so a caller learns nothing from the difference. */
export function unauthorizedResponse(decision: Extract<AdminGuardDecision, { allowed: false }>): Response {
  return new Response(JSON.stringify({ error: "unauthorized", reason: decision.reason }), {
    status: decision.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** The server's own configuration of the guard, in one place so a route cannot invent a looser rule. */
export function adminGuardOptionsFromProcess(): AdminGuardOptions {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return {
    env: {
      SUPABASE_URL: env?.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: env?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    token: env?.ADMIN_API_TOKEN,
    allowUserIds: parseAllowlist(env?.ADMIN_USER_IDS),
  };
}
