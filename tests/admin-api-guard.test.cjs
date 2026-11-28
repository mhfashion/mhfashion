const test = require("node:test");
const assert = require("node:assert/strict");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const guard = loadModule("apps/web/src/lib/admin-api-guard.ts");

function requestWith(headers = {}) {
  return new Request("http://localhost/api/admin/search-misses", { headers });
}

/** A fetch that fails the test if it is ever called: the token path must not reach the network. */
const neverFetch = () => {
  throw new Error("the guard called Supabase when it should have decided already");
};

/** A Supabase `/auth/v1/user` answer, so the verifier is exercised without a network. */
function supabaseAnswer(payload, status = 200) {
  return async () => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

const supabaseEnv = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_ANON_KEY: "anon" };

test("a bearer token is compared against the configured token and nothing else is accepted", () => {
  assert.equal(guard.tokenDecision("Bearer s3cret", "s3cret"), "allowed");
  assert.equal(guard.tokenDecision("bearer s3cret", "s3cret"), "allowed", "the scheme is case-insensitive");
  assert.equal(guard.tokenDecision("Bearer  s3cret ", "s3cret"), "allowed", "surrounding space is trimmed");
  assert.equal(guard.tokenDecision("Bearer wrong", "s3cret"), "refused");
  assert.equal(guard.tokenDecision("Bearer s3cret2", "s3cret"), "refused", "a longer token is not a match");
  assert.equal(guard.tokenDecision("Basic s3cret", "s3cret"), "absent", "another scheme is not a bearer token");
  assert.equal(guard.tokenDecision(null, "s3cret"), "absent");
  assert.equal(guard.tokenDecision("Bearer s3cret", ""), "absent", "no configured token means no token path");
  assert.equal(guard.tokenDecision("Bearer s3cret", undefined), "absent");
});

test("the comparison does not short-circuit on a shared prefix", () => {
  assert.equal(guard.safeEqual("aaaa", "aaaa"), true);
  assert.equal(guard.safeEqual("aaaa", "aaab"), false);
  assert.equal(guard.safeEqual("aaaa", "aaa"), false, "length is settled first");
  assert.equal(guard.safeEqual("", ""), true);
  assert.equal(guard.safeEqual("မြန်မာ", "မြန်မာ"), true, "a comparison is over code units, not bytes");
});

test("an allowlist tolerates spaces and blanks", () => {
  assert.deepEqual(guard.parseAllowlist("a1, b2 ,, c3"), ["a1", "b2", "c3"]);
  assert.deepEqual(guard.parseAllowlist(""), []);
  assert.deepEqual(guard.parseAllowlist(undefined), []);
});

test("a matching token is enough, and the guard never asks Supabase", async () => {
  const decision = await guard.authorizeAdmin(requestWith({ authorization: "Bearer s3cret" }), {
    env: supabaseEnv,
    token: "s3cret",
    fetchImpl: neverFetch,
  });
  assert.deepEqual(decision, { allowed: true, via: "token" });
});

test("a wrong token is refused even when Supabase would say yes", async () => {
  const decision = await guard.authorizeAdmin(requestWith({ authorization: "Bearer wrong" }), {
    env: supabaseEnv,
    token: "s3cret",
    fetchImpl: neverFetch,
  });
  assert.deepEqual(decision, { allowed: false, status: 401, reason: "bad-token" });
});

test("a Supabase user with the admin role is staff; a customer is not", async () => {
  const staff = await guard.authorizeAdmin(requestWith({ authorization: "Bearer access-token" }), {
    env: supabaseEnv,
    fetchImpl: supabaseAnswer({ id: "u1", app_metadata: { role: "admin" } }),
  });
  assert.deepEqual(staff, { allowed: true, via: "staff" });

  const customer = await guard.authorizeAdmin(requestWith({ authorization: "Bearer access-token" }), {
    env: supabaseEnv,
    fetchImpl: supabaseAnswer({ id: "u2", app_metadata: { role: "customer" } }),
  });
  assert.deepEqual(customer, { allowed: false, status: 401, reason: "not-staff" });
});

test("a token Supabase refuses, and a shop with no configuration, both get 401", async () => {
  const refused = await guard.authorizeAdmin(requestWith({ authorization: "Bearer expired" }), {
    env: supabaseEnv,
    fetchImpl: supabaseAnswer({ message: "invalid" }, 401),
  });
  assert.deepEqual(refused, { allowed: false, status: 401, reason: "not-configured" });

  const anonymous = await guard.authorizeAdmin(requestWith(), { env: {}, token: "s3cret" });
  assert.deepEqual(anonymous, { allowed: false, status: 401, reason: "no-credentials" });
});

test("the refusal is one shape, so a caller cannot tell which check failed", async () => {
  const decision = await guard.authorizeAdmin(requestWith(), { env: {}, token: "s3cret" });
  const response = guard.unauthorizedResponse(decision);
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const body = await response.json();
  assert.equal(body.error, "unauthorized");
  assert.equal(body.reason, "no-credentials");
});

test("the route refuses an anonymous caller before it looks at the database key", async () => {
  const origin = process.env.MH_TEST_ORIGIN ?? "http://127.0.0.1:3000";
  let response;
  try {
    response = await fetch(`${origin}/api/admin/search-misses`);
  } catch (error) {
    assert.fail(`needs a server on ${origin} (npm run start --workspace=apps/web -- --port 3000): ${error.message}`);
  }
  assert.equal(response.status, 401, "the search terms are not public");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.error, "unauthorized");
  assert.equal(body.misses, undefined, "no rows are returned to a refused caller");

  const withWrongToken = await fetch(`${origin}/api/admin/search-misses`, { headers: { Authorization: "Bearer nope" } });
  assert.equal(withWrongToken.status, 401);
  assert.equal((await withWrongToken.json()).error, "unauthorized");
});
