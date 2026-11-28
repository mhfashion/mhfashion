import { NextResponse } from "next/server";

/**
 * A fixed-window limiter held in module memory. On Cloudflare the module is per isolate, so this
 * bounds what one isolate will do for one client; it is not a global quota. It stops a script that
 * hammers a route from a single address, which is the realistic abuse here — a durable counter
 * (KV or Durable Objects) would be needed for a hard, site-wide limit.
 */
export type RateLimitRule = { limit: number; windowMs: number };

export type RateLimitWindow = { count: number; resetAt: number };

const windows = new Map<string, RateLimitWindow>();
const MAX_KEYS = 5000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limit: number;
};

/** The counter for one window: how many calls it has seen and when it starts over. */
function nextWindow(existing: RateLimitWindow | null, rule: RateLimitRule, now: number): { window: RateLimitWindow; result: RateLimitResult } {
  if (!existing || existing.resetAt <= now) {
    return {
      window: { count: 1, resetAt: now + rule.windowMs },
      result: { allowed: true, remaining: rule.limit - 1, retryAfterSeconds: 0, limit: rule.limit },
    };
  }
  if (existing.count >= rule.limit) {
    return {
      window: existing,
      result: {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
        limit: rule.limit,
      },
    };
  }
  const window = { count: existing.count + 1, resetAt: existing.resetAt };
  return {
    window,
    result: { allowed: true, remaining: rule.limit - window.count, retryAfterSeconds: 0, limit: rule.limit },
  };
}

export function checkRateLimit(key: string, rule: RateLimitRule, now: number = Date.now()): RateLimitResult {
  const existing = windows.get(key);
  if (!existing && windows.size >= MAX_KEYS) sweep(now);
  const { window, result } = nextWindow(existing ?? null, rule, now);
  windows.set(key, window);
  return result;
}

/**
 * Where the counters live. Module memory is per isolate; a KV-backed store
 * (`kvRateLimitStore`) makes the allowance hold across isolates. A read-then-write store is
 * best effort under concurrency — KV has no compare-and-set — but it is still far tighter than one
 * allowance per isolate.
 */
export type RateLimitStore = {
  read(key: string): Promise<RateLimitWindow | null>;
  write(key: string, window: RateLimitWindow): Promise<void>;
};

export type RateLimitKv = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export function kvRateLimitStore(kv: RateLimitKv, prefix = "ratelimit:"): RateLimitStore {
  return {
    async read(key) {
      const value = await kv.get(`${prefix}${key}`, "json");
      if (!value || typeof value !== "object") return null;
      const { count, resetAt } = value as Partial<RateLimitWindow>;
      if (typeof count !== "number" || typeof resetAt !== "number") return null;
      return { count, resetAt };
    },
    async write(key, window) {
      // The key outlives its own window by a minute, so a stale count is never read as current.
      const expirationTtl = Math.max(60, Math.ceil((window.resetAt - Date.now()) / 1000) + 60);
      await kv.put(`${prefix}${key}`, JSON.stringify(window), { expirationTtl });
    },
  };
}

let activeStore: RateLimitStore | null = null;

/** Point the limiter at a durable store; `null` puts it back on module memory. */
export function useRateLimitStore(store: RateLimitStore | null) {
  activeStore = store;
}

/** The same rule, counted in the configured store. Falls back to module memory when none is set. */
export async function checkRateLimitAsync(key: string, rule: RateLimitRule, now: number = Date.now()): Promise<RateLimitResult> {
  if (!activeStore) return checkRateLimit(key, rule, now);
  const { window, result } = nextWindow(await activeStore.read(key), rule, now);
  await activeStore.write(key, window);
  return result;
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

let storeResolved = false;

/**
 * Use the Worker's `RATE_LIMIT_KV` namespace when it is bound, once per isolate. Without the binding
 * (local `next start`, tests) the limiter keeps its module-memory counters.
 */
async function ensureDurableStore(): Promise<void> {
  if (storeResolved) return;
  storeResolved = true;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = (await getCloudflareContext({ async: true })) as unknown as { env?: Record<string, unknown> };
    const kv = context?.env?.RATE_LIMIT_KV;
    if (kv) activeStore = kvRateLimitStore(kv as RateLimitKv);
  } catch {
    // No Workers context: module memory is the allowance.
  }
}

/** Returns a 429 response when the client is over the rule, or null when the request may proceed. */
export async function enforceRateLimit(request: Request, bucket: string, rule: RateLimitRule): Promise<NextResponse | null> {
  await ensureDurableStore();
  const result = await checkRateLimitAsync(`${bucket}:${clientKey(request)}`, rule);
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
  /** A photo upload is a write to R2 and a quota read; the upload route also counts per customer. */
  upload: { limit: 40, windowMs: 60_000 },
  /** A delivery quote may be a courier call; the checkout asks once per address change. */
  deliveryQuote: { limit: 30, windowMs: 60_000 },
  /** A staff read that names customer rows: cheap, finished, and never hammered by a script. */
  adminRead: { limit: 60, windowMs: 60_000 },
} satisfies Record<string, RateLimitRule>;
