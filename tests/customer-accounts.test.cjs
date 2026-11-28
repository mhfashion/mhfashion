// The owner can read a customer's details and set, reset or block their password. These tests pin
// the contract: a password is only ever stored as a salted hash, never rendered, and a blocked or
// password-less account cannot sign in.
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
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    return require(id);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const read = (relativePath) => readFileSync(path.join(__dirname, "..", relativePath), "utf8");
const accounts = loadModule("apps/web/src/lib/customer-accounts.ts");
const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");

const NOW = Date.parse("2026-11-21T09:00:00.000Z");
const data = admin.createAdminDemoData(NOW);

test("every customer email in the order queue has an account, with no password yet", () => {
  const emails = new Set(data.orders.map((order) => order.customerEmail));
  const seeded = new Set((data.customerAccounts ?? []).map((account) => account.email));
  assert.deepEqual([...seeded].sort(), [...emails].sort(), "one account per order email");
  for (const account of data.customerAccounts) {
    assert.equal(account.password, null, `${account.email} starts with no password`);
    assert.equal(account.status, "Active");
    assert.equal(account.mustChangePassword, false);
    assert.equal(accounts.canCustomerSignIn(account), false, `${account.email} cannot sign in until a password is set`);
  }
});

test("a set password is stored as a salted hash and verifies by hash only", async () => {
  const target = data.customerAccounts[0];
  const password = "Mh-Kyaw-2026";
  const hash = await accounts.createCustomerPassword(password);
  assert.notEqual(hash.hash, password, "the plaintext is never stored");
  assert.ok(hash.salt.length >= 16, "each password carries its own salt");
  assert.equal(hash.hash.includes(password), false);
  assert.equal(hash.iterations >= 100_000, true, "PBKDF2 runs enough iterations to be slow to brute force");

  const next = accounts.applyCustomerPassword(data.customerAccounts, target.email, hash, {
    actor: "MH Fashion Owner", at: "2026-11-21T10:00:00.000Z",
  });
  const account = next.find((entry) => entry.email === target.email);
  assert.deepEqual(account.password, hash);
  assert.equal(account.passwordUpdatedAt, "2026-11-21T10:00:00.000Z");
  assert.equal(account.passwordUpdatedBy, "MH Fashion Owner");
  assert.equal(accounts.canCustomerSignIn(account), true);
  assert.equal(await accounts.verifyCustomerPassword(account, password), true);
  assert.equal(await accounts.verifyCustomerPassword(account, `${password}!`), false);
  assert.equal(accounts.customerPasswordState(account).startsWith("Set "), true);
});

test("two customers who pick the same password get different hashes", async () => {
  const [first, second] = data.customerAccounts;
  const a = await accounts.createCustomerPassword("Same-Pass-1");
  const b = await accounts.createCustomerPassword("Same-Pass-1");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
  assert.ok(first.email !== second.email);
});

test("the password policy refuses weak, personal and common passwords", () => {
  const account = { email: "phyo.wai@example.com", name: "Phyo Wai" };
  assert.ok(accounts.passwordIssues("abc12", account).length, "too short");
  assert.ok(accounts.passwordIssues("letmewalk", account).length, "no number");
  assert.ok(accounts.passwordIssues("letmewalk7", account).includes("Add a letter.") === false);
  assert.ok(accounts.passwordIssues("password1", account).length, "a common password");
  assert.ok(accounts.passwordIssues("phyo.wai2026", account).some((issue) => issue.includes("email")), "the email address");
  assert.ok(accounts.passwordIssues("phyo-2026", account).some((issue) => issue.includes("name")), "the customer's name");
  assert.deepEqual(accounts.passwordIssues("MH-Kyaw-2026", account), [], "a good one passes");
});

test("a generated password satisfies the policy and is not predictable", () => {
  const seen = new Set();
  for (let index = 0; index < 20; index += 1) {
    const generated = accounts.generateCustomerPassword();
    assert.equal(generated.length >= 12, true);
    assert.deepEqual(accounts.passwordIssues(generated, { email: "someone@example.com", name: "Someone" }), []);
    seen.add(generated);
  }
  assert.equal(seen.size, 20, "twenty draws are twenty different passwords");
});

test("a temporary password can be flagged, and a blocked account cannot sign in", async () => {
  const target = data.customerAccounts[1];
  const hash = await accounts.createCustomerPassword("Temp-Pass-2026");
  let next = accounts.applyCustomerPassword(data.customerAccounts, target.email, hash, {
    actor: "MH Fashion Owner", at: "2026-11-21T11:00:00.000Z", mustChangePassword: true,
  });
  let account = next.find((entry) => entry.email === target.email);
  assert.equal(account.mustChangePassword, true);
  assert.match(accounts.customerPasswordState(account), /Temporary password/);

  next = accounts.setCustomerStatus(next, target.email, "Blocked");
  account = next.find((entry) => entry.email === target.email);
  assert.equal(accounts.canCustomerSignIn(account), false, "a blocked account cannot sign in");
  assert.equal(accounts.customerPasswordState(account), "Sign-in blocked");
  assert.equal(await accounts.verifyCustomerPassword(account, "Temp-Pass-2026"), true, "the hash survives a block");

  next = accounts.setCustomerStatus(next, target.email, "Active");
  assert.equal(accounts.canCustomerSignIn(next.find((entry) => entry.email === target.email)), true);
});

test("an unknown email is refused instead of silently creating an account", async () => {
  const hash = await accounts.createCustomerPassword("Nobody-2026");
  assert.throws(
    () => accounts.applyCustomerPassword(data.customerAccounts, "nobody@example.com", hash, {
      actor: "MH Fashion Owner", at: "2026-11-21T12:00:00.000Z",
    }),
    /not a customer/,
  );
});

test("saved data keeps its passwords and gains an account for a new order email", async () => {
  const existing = data.customerAccounts[0];
  const hash = await accounts.createCustomerPassword("Keep-Me-2026");
  const stored = [{ ...existing, password: hash, passwordUpdatedAt: "2026-11-20T08:00:00.000Z", passwordUpdatedBy: "MH Fashion Owner" }];
  const orders = [
    { customerEmail: existing.email, customerName: existing.name, customerPhone: existing.phone, placedAt: existing.lastOrderAt },
    { customerEmail: "new.buyer@example.com", customerName: "New Buyer", customerPhone: "+95 9 111 222 333", placedAt: "2026-11-21T08:00:00.000Z" },
  ];
  const normalized = accounts.normalizeCustomerAccounts(stored, orders, NOW);
  const kept = normalized.find((entry) => entry.email === existing.email);
  assert.deepEqual(kept.password, hash, "a saved password is not thrown away");
  assert.equal(await accounts.verifyCustomerPassword(kept, "Keep-Me-2026"), true);
  const added = normalized.find((entry) => entry.email === "new.buyer@example.com");
  assert.ok(added, "a new order email gets an account");
  assert.equal(added.password, null);

  const corrupt = accounts.normalizeCustomerAccounts([{ ...existing, password: { salt: "", hash: "" } }], orders, NOW);
  assert.equal(corrupt.find((entry) => entry.email === existing.email).password, null, "a broken hash is dropped, not trusted");
});

test("the Customers screen opens a detail drawer with the password panel and never renders the hash", () => {
  const screen = read("apps/web/src/components/admin/AdminCustomers.tsx");
  assert.match(screen, /data-customer-row=\{customer\.email\}/, "a row opens the customer");
  assert.match(screen, /data-customer-detail=\{customer\.email\}/);
  assert.match(screen, /data-customer-addresses/, "the details include the delivery addresses");
  assert.match(screen, /data-customer-password-input/);
  assert.match(screen, /data-customer-password-confirm/);
  assert.match(screen, /data-customer-generate/, "a temporary password can be generated");
  assert.match(screen, /data-customer-must-change/, "the owner can force a change at next sign-in");
  assert.match(screen, /mustChangePassword: account\.mustChangePassword/, "the tick survives the save instead of being cleared");
  assert.match(screen, /data-customer-block/, "sign-in can be blocked");
  assert.match(screen, /createCustomerPassword\(password\)/, "the password is hashed before it is saved");
  assert.doesNotMatch(screen, /account\.password\.hash/, "the stored hash is never put on screen");
  assert.doesNotMatch(screen, /account\.password\.salt/);
  assert.match(screen, /data-customer-password-issued[\s\S]{0,400}Shown once/, "a set password is shown once, then cleared");
});

test("the demo data carries the accounts through save and load", () => {
  const source = read("apps/web/src/lib/admin-demo-data.ts");
  assert.match(source, /customerAccounts: createSeedCustomerAccounts\(orders, now\)/);
  assert.match(source, /customerAccounts: normalizeCustomerAccounts\(parsed\.customerAccounts, orders, Date\.now\(\)\)/);
  assert.ok(Array.isArray(data.customerAccounts) && data.customerAccounts.length > 0);
});
