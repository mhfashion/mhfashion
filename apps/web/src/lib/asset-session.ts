// Plan §12.1 part 8 and §12.2.6: the Worker checks who is asking itself, with the Supabase access token
// the browser already holds. It never trusts a role sent in a body or a header of its own.
import type { AssetViewer } from "./asset-access";

export type SupabaseEnv = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

type SupabaseUser = {
  id?: string;
  app_metadata?: { role?: string };
  user_metadata?: { role?: string };
};

/**
 * The viewer behind a request, or `null` when there is no token, no Supabase configuration, or the token
 * is refused. Supabase answers `/auth/v1/user` for a valid access token, which verifies it without the
 * Worker holding any signing key.
 */
export async function verifySupabaseUser(
  env: SupabaseEnv,
  request: Request,
  fetchImpl: typeof fetch = fetch,
): Promise<AssetViewer> {
  const token = bearerToken(request);
  if (!token || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  try {
    const response = await fetchImpl(`${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as SupabaseUser;
    if (!user?.id) return null;
    const role = user.app_metadata?.role === "admin" || user.user_metadata?.role === "admin" ? "admin" : "customer";
    return { id: user.id, role };
  } catch {
    return null;
  }
}

/** The site's own Supabase configuration, for a Next route (the Worker reads its bindings instead). */
export function supabaseEnvFromProcess(): SupabaseEnv {
  const env = typeof process !== "undefined" ? process.env : undefined;
  return {
    SUPABASE_URL: env?.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: env?.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
