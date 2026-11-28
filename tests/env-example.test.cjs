const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SCANNED = [path.join(ROOT, "apps", "web", "src"), path.join(ROOT, "Worker")];

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
  }
  return files;
}

/** `process.env.NAME` and `process.env["NAME"]` in the application source. */
function envNamesInCode() {
  const names = new Set();
  for (const file of SCANNED.flatMap((directory) => walk(directory))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) names.add(match[1]);
    for (const match of source.matchAll(/process\.env\[\s*["']([A-Z][A-Z0-9_]+)["']\s*\]/g)) names.add(match[1]);
  }
  return names;
}

/** Provider credentials are declared as `requires: [...]`, not read by name. */
function providerRequires() {
  const source = readFileSync(path.join(ROOT, "apps", "web", "src", "lib", "payments.ts"), "utf8");
  const names = new Set();
  for (const match of source.matchAll(/requires:\s*\[([^\]]*)\]/g)) {
    for (const quoted of match[1].matchAll(/"([A-Z][A-Z0-9_]+)"/g)) names.add(quoted[1]);
  }
  return names;
}

/**
 * Two settings are read from an `env` parameter instead of `process.env`, so the scan cannot see them:
 * `PAYMENTS_ALLOW_MOCK` (lib/payment-webhook.ts) and the guard's own names (lib/admin-api-guard.ts).
 */
const READ_INDIRECTLY = ["PAYMENTS_ALLOW_MOCK", "ADMIN_API_TOKEN"];

/** Worker bindings are not environment variables; they live in wrangler.jsonc and are named there. */
const BINDINGS = ["RATE_LIMIT_KV", "MH_FASHION_ASSETS", "MH_FASHION_PRIVATE", "ASSETS"];

function exampleNames() {
  const source = readFileSync(path.join(ROOT, "apps", "web", ".env.example"), "utf8");
  return new Set(
    source
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=")[0].trim())
      .filter((name) => /^[A-Z][A-Z0-9_]*$/.test(name)),
  );
}

test("the example lists every name the code reads", () => {
  const expected = new Set([...envNamesInCode(), ...providerRequires(), ...READ_INDIRECTLY]);
  const declared = exampleNames();
  const missing = [...expected].filter((name) => !declared.has(name)).sort();
  assert.deepEqual(missing, [], `apps/web/.env.example is missing: ${missing.join(", ")}`);
});

test("the example lists nothing the code never reads", () => {
  const expected = new Set([...envNamesInCode(), ...providerRequires(), ...READ_INDIRECTLY, ...BINDINGS]);
  const unused = [...exampleNames()].filter((name) => !expected.has(name)).sort();
  assert.deepEqual(unused, [], `apps/web/.env.example names variables nothing reads: ${unused.join(", ")}`);
});

test("the set the code reads is not accidentally empty", () => {
  const names = envNamesInCode();
  assert.ok(names.size >= 8, `the scan found ${names.size} names; the source layout may have changed`);
  for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "MH_DELIVERY_TOKEN"]) {
    assert.ok(names.has(name), `${name} should be a literal read of process.env`);
  }
});

test("the two settings that are read indirectly are documented where they are read", () => {
  const paymentWebhook = readFileSync(path.join(ROOT, "apps", "web", "src", "lib", "payment-webhook.ts"), "utf8");
  assert.match(paymentWebhook, /PAYMENTS_ALLOW_MOCK/, "the switch must stay named in the source");
  const guard = readFileSync(path.join(ROOT, "apps", "web", "src", "lib", "admin-api-guard.ts"), "utf8");
  assert.match(guard, /ADMIN_API_TOKEN/, "the guard's token must stay named in the source");
});
