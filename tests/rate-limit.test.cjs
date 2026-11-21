const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const limiter = loadModule("apps/web/src/lib/rate-limit.ts");
const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");

const rule = { limit: 3, windowMs: 60_000 };

test("a client gets the allowance, then a retry-after instead of a 4th try", () => {
  limiter.resetRateLimits();
  const start = 1_000_000;
  assert.equal(limiter.checkRateLimit("ip:1", rule, start).allowed, true);
  assert.equal(limiter.checkRateLimit("ip:1", rule, start + 1).allowed, true);
  const last = limiter.checkRateLimit("ip:1", rule, start + 2);
  assert.equal(last.allowed, true);
  assert.equal(last.remaining, 0);

  const blocked = limiter.checkRateLimit("ip:1", rule, start + 30_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 30);
  assert.equal(blocked.limit, 3);
});

test("the window opens again once it has expired", () => {
  limiter.resetRateLimits();
  const start = 2_000_000;
  for (let index = 0; index < rule.limit; index += 1) limiter.checkRateLimit("ip:2", rule, start);
  assert.equal(limiter.checkRateLimit("ip:2", rule, start + rule.windowMs - 1).allowed, false);
  assert.equal(limiter.checkRateLimit("ip:2", rule, start + rule.windowMs).allowed, true);
});

test("one noisy address cannot spend another address's allowance", () => {
  limiter.resetRateLimits();
  const start = 3_000_000;
  for (let index = 0; index < rule.limit; index += 1) limiter.checkRateLimit("ip:loud", rule, start);
  assert.equal(limiter.checkRateLimit("ip:loud", rule, start).allowed, false);
  assert.equal(limiter.checkRateLimit("ip:quiet", rule, start).allowed, true);
  assert.equal(limiter.checkRateLimit("other-bucket:ip:quiet", rule, start).allowed, true, "buckets are separate");
});

test("the memory does not grow without a bound", () => {
  limiter.resetRateLimits();
  const start = 4_000_000;
  for (let index = 0; index < 6000; index += 1) limiter.checkRateLimit(`flood:${index}`, rule, start);
  const afterSweep = limiter.checkRateLimit("late:1", rule, start + rule.windowMs + 1);
  assert.equal(afterSweep.allowed, true);
  assert.equal(limiter.checkRateLimit("late:1", rule, start + rule.windowMs + 1).allowed, true);
});

test("the client key prefers Cloudflare's header and falls back sanely", () => {
  const make = (headers) => new Request("https://mhfashion.example/api/x", { headers });
  assert.equal(limiter.clientKey(make({ "cf-connecting-ip": "203.0.113.9" })), "203.0.113.9");
  assert.equal(limiter.clientKey(make({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" })), "198.51.100.4");
  assert.equal(limiter.clientKey(make({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "198.51.100.4" })), "203.0.113.9");
  assert.equal(limiter.clientKey(make({ "x-real-ip": "192.0.2.7" })), "192.0.2.7");
  assert.equal(limiter.clientKey(make({})), "unknown");
});

test("the guard answers 429 with a Retry-After and lets the rest through", async () => {
  limiter.resetRateLimits();
  const request = new Request("https://mhfashion.example/api/payments/intent", {
    method: "POST",
    headers: { "cf-connecting-ip": "203.0.113.50" },
  });
  const responses = [];
  for (let index = 0; index < limiter.RATE_LIMITS.paymentIntent.limit + 1; index += 1) {
    responses.push(limiter.enforceRateLimit(request, "payments/intent", limiter.RATE_LIMITS.paymentIntent));
  }
  const allowed = responses.filter((response) => response === null);
  const refused = responses.filter((response) => response !== null);
  assert.equal(allowed.length, limiter.RATE_LIMITS.paymentIntent.limit);
  assert.equal(refused.length, 1);

  const response = refused[0];
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("retry-after")) >= 1);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal((await response.json()).error, "rate_limited");
});

test("the limits keep the expensive route tighter than the cheap ones", () => {
  const { paymentIntent, paymentSimulate, paymentStatus, paymentWebhook } = limiter.RATE_LIMITS;
  assert.ok(paymentIntent.limit < paymentStatus.limit, "creating an intent must cost more than reading a status");
  assert.ok(paymentIntent.limit <= paymentSimulate.limit);
  assert.ok(paymentWebhook.limit > paymentIntent.limit, "a provider retry must not be mistaken for abuse");
  for (const rule of Object.values(limiter.RATE_LIMITS)) {
    assert.ok(rule.limit >= 1 && rule.windowMs >= 1000, JSON.stringify(rule));
  }
});

test("every public payment route is guarded before it does any work", () => {
  const routes = [
    ["apps/web/src/app/api/payments/intent/route.ts", "payments/intent"],
    ["apps/web/src/app/api/payments/simulate/route.ts", "payments/simulate"],
    ["apps/web/src/app/api/payments/status/[ref]/route.ts", "payments/status"],
    ["apps/web/src/app/api/payments/webhook/[provider]/route.ts", "payments/webhook"],
  ];
  for (const [file, bucket] of routes) {
    const source = read(file);
    assert.match(source, /import \{ RATE_LIMITS, enforceRateLimit \} from "@\/lib\/rate-limit";/, file);
    const guard = source.indexOf(`enforceRateLimit(request, "${bucket}"`);
    assert.ok(guard > 0, `${file} must guard its bucket`);
    const firstWork = source.search(/await request\.(json|text)\(\)/);
    if (firstWork > 0) assert.ok(guard < firstWork, `${file} must refuse before reading the body`);
  }
});
