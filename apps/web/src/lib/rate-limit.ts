import { NextResponse } from "next/server";

/**
 * A fixed-window limiter held in module memory. On Cloudflare the module is per isolate, so this
 * bounds what one isolate will do for one client; it is not a global quota. It stops a script that
 * hammers a route from a single address, which is the realistic abuse here — a durable counter
 * (KV or Durable Objects) would be needed for a hard, site-wide limit.
 */
export type RateLimitRule = { limit: number; windowMs: number };

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
const MAX_KEYS = 5000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
};

export function checkRateLimit(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitResult {
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) sweep(now);
    windows.set(key, { count: 1, resetAt: now + rule.windowMs });
    return { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0, limit: rule.limit };
  }
  if (existing.count >= rule.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      limit: rule.limit,
    };
  }
  existing.count += 1;
  return { allowed: true, remaining: rule.limit - existing.count, retryAfterSeconds: 0, limit: rule.limit };
}

function sweep(now: number) {
  for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
  // Still full of live windows: drop the oldest half rather than grow without a bound.
  if (windows.size >= MAX_KEYS) {
    const entries = [...windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of entries.slice(0, Math.ceil(entries.length / 2))) windows.delete(key);
  }
}

export function resetRateLimits() {
  windows.clear();
}

/** Cloudflare puts the real address in `cf-connecting-ip`; other hosts use the first X-Forwarded-For hop. */
export function clientKey(request: Request): string {
  const headers = request.headers;
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Returns a 429 response when the client is over the rule, or null when the request may proceed. */
export function enforceRateLimit(request: Request, bucket: string, rule: RateLimitRule): NextResponse | null {
  const result = checkRateLimit(`${bucket}:${clientKey(request)}`, rule);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds), "Cache-Control": "no-store" } },
  );
}

export const RATE_LIMITS = {
  /** Creating a payment intent costs a provider call and a stored row. */
  paymentIntent: { limit: 10, windowMs: 60_000 },
  /** The demo settle button is a write; keep it to a human pace. */
  paymentSimulate: { limit: 20, windowMs: 60_000 },
  /** Status polling is cheap but polled in a loop. */
  paymentStatus: { limit: 120, windowMs: 60_000 },
  /** A provider retries a webhook, so the window is wider and the limit generous. */
  paymentWebhook: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;
