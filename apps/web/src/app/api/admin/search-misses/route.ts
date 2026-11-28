import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { adminGuardOptionsFromProcess, authorizeAdmin, unauthorizedResponse } from "@/lib/admin-api-guard";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export type SearchMiss = { term: string; hits: number; lastSeen: string };

/**
 * Plan §17 S8 and §19.10 S1: the week's searches that found nothing. `top_search_misses` is granted to
 * `service_role` only, so this route needs the service-role key — and, because the rows are the words
 * customers typed, it also refuses a caller that cannot prove it is staff. An anonymous request gets 401
 * before the key is looked at, so the answer never reveals whether the log is configured.
 *
 * Once the admin has a real Supabase session (P0-2), the same guard accepts that session and the token
 * path can be retired.
 */
export async function GET(request: Request) {
  const decision = await authorizeAdmin(request, adminGuardOptionsFromProcess());
  if (!decision.allowed) return unauthorizedResponse(decision);

  const limited = await enforceRateLimit(request, "admin/search-misses", RATE_LIMITS.adminRead);
  if (limited) return limited;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ configured: false, misses: [] });
  }

  const params = new URL(request.url).searchParams;
  const days = Math.min(90, Math.max(1, Number(params.get("days") ?? 7) || 7));
  const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 10) || 10));

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.rpc("top_search_misses", { p_days: days, p_limit: limit });
  if (error) {
    // 42883/PGRST202: the shop has not run migration 0011 yet.
    const missing = error.code === "42883" || error.code === "PGRST202";
    return NextResponse.json({ configured: true, misses: [], pending: missing }, { status: missing ? 200 : 502 });
  }

  const misses: SearchMiss[] = (data ?? []).map((row: { term: string; hits: number; last_seen: string }) => ({
    term: row.term,
    hits: row.hits,
    lastSeen: row.last_seen,
  }));
  return NextResponse.json({ configured: true, misses });
}
