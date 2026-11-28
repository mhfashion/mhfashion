const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const origin = () => process.env.MH_TEST_ORIGIN ?? "http://127.0.0.1:3000";

async function get(pathname) {
  try {
    return await fetch(`${origin()}${pathname}`);
  } catch (error) {
    assert.fail(`needs a server on ${origin()} (npm run start --workspace=apps/web -- --port 3000): ${error.message}`);
  }
}

/** Plan §19.6: the five headers, plus the one that stops framing. */
const REQUIRED = {
  "content-security-policy": /default-src 'self'/,
  "strict-transport-security": /max-age=31536000/,
  "x-content-type-options": /^nosniff$/,
  "referrer-policy": /^strict-origin-when-cross-origin$/,
  "x-frame-options": /^DENY$/,
  "permissions-policy": /camera=\(\)/,
};

test("every response carries the security policy", async () => {
  for (const pathname of ["/", "/create", "/admin/posts", "/products", "/checkout"]) {
    const response = await get(pathname);
    assert.equal(response.status, 200, `${pathname} must render`);
    for (const [name, pattern] of Object.entries(REQUIRED)) {
      const value = response.headers.get(name);
      assert.ok(value, `${pathname} is missing ${name}`);
      assert.match(value, pattern, `${pathname} sends ${name}: ${value}`);
    }
  }
});

test("the content policy still allows what the editor loads", async () => {
  const response = await get("/create");
  const csp = response.headers.get("content-security-policy");
  // Every design preview and uploaded photo is a data URL; Fabric reads blobs.
  assert.match(csp, /img-src [^;]*data:/);
  assert.match(csp, /img-src [^;]*blob:/);
  // Supabase REST/auth and the payment, delivery and search routes are cross-origin.
  assert.match(csp, /connect-src [^;]*https:/);
  // Canvas geometry is inline styles.
  assert.match(csp, /style-src [^;]*'unsafe-inline'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
});

test("the policy is declared once, in the proxy", () => {
  const source = readFileSync(path.join(ROOT, "apps", "web", "src", "proxy.ts"), "utf8");
  for (const header of Object.keys(REQUIRED)) {
    assert.match(source, new RegExp(header, "i"), `middleware.ts does not set ${header}`);
  }
  assert.match(source, /matcher:/, "static bundles must be excluded from the matcher on purpose");
});
