// A customer changes their own password from /account. Two rules must hold: only a signed-in
// customer can change it, and only after proving the current password. These tests pin both.
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

// The session module reads window.localStorage; a tiny in-memory Storage keeps the test browser-free.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
};

const accountsLib = loadModule("apps/web/src/lib/customer-accounts.ts");
const sessionLib = loadModule("apps/web/src/lib/customer-session.ts");

async function signedInCustomer() {
  const hash = await accountsLib.createCustomerPassword("First-Pass-2026");
  const accounts = [
    { email: "may.thu@example.com", name: "May Thu", phone: "+95 9 000 111", status: "Active", mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z", lastOrderAt: "2026-11-01T00:00:00.000Z", passwordUpdatedAt: "2026-11-01T00:00:00.000Z", passwordUpdatedBy: "MH Fashion Owner", password: hash },
    { email: "other@example.com", name: "Other Buyer", phone: "+95 9 222 333", status: "Active", mustChangePassword: false, createdAt: "2026-01-01T00:00:00.000Z", lastOrderAt: "2026-11-01T00:00:00.000Z", passwordUpdatedAt: null, passwordUpdatedBy: null, password: null },
  ];
  return { accounts, hash };
}

test("signed out, no password can be changed", async () => {
  const { accounts } = await signedInCustomer();
  const result = await sessionLib.changeOwnPassword(accounts, null, "First-Pass-2026", "Second-Pass-2026", "Second-Pass-2026");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "signed-out");
  assert.equal(result.accounts, undefined, "nothing is handed back to save");
});

test("signed in, the current password is required", async () => {
  const { accounts } = await signedInCustomer();
  const session = { email: "may.thu@example.com", issuedAt: "2026-11-21T00:00:00.000Z", expiresAt: "2026-11-22T00:00:00.000Z" };
  const result = await sessionLib.changeOwnPassword(accounts, session, "not-the-password", "Second-Pass-2026", "Second-Pass-2026");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "wrong-password");
});

test("a signed-in customer changes their own password, and only theirs", async () => {
  const { accounts } = await signedInCustomer();
  const session = { email: "may.thu@example.com", issuedAt: "2026-11-21T00:00:00.000Z", expiresAt: "2026-11-22T00:00:00.000Z" };
  const result = await sessionLib.changeOwnPassword(accounts, session, "First-Pass-2026", "Second-Pass-2026", "Second-Pass-2026", "2026-11-21T10:00:00.000Z");
  assert.equal(result.ok, true);
  const mine = result.accounts.find((account) => account.email === "may.thu@example.com");
  const theirs = result.accounts.find((account) => account.email === "other@example.com");
  assert.equal(await accountsLib.verifyCustomerPassword(mine, "Second-Pass-2026"), true);
  assert.equal(await accountsLib.verifyCustomerPassword(mine, "First-Pass-2026"), false);
  assert.equal(mine.passwordUpdatedAt, "2026-11-21T10:00:00.000Z");
  assert.match(mine.passwordUpdatedBy, /self/);
  assert.equal(theirs.password, null, "another customer is untouched");
  assert.equal(await accountsLib.verifyCustomerPassword(accounts[0], "First-Pass-2026"), true, "the input accounts are not mutated");
});

test("the new password follows the same policy, and must not repeat the old one", async () => {
  const { accounts } = await signedInCustomer();
  const session = { email: "may.thu@example.com", issuedAt: "2026-11-21T00:00:00.000Z", expiresAt: "2026-11-22T00:00:00.000Z" };
  const weak = await sessionLib.changeOwnPassword(accounts, session, "First-Pass-2026", "abc", "abc");
  assert.equal(weak.reason, "weak");
  assert.ok(weak.issues.length >= 2, "the same policy messages the owner sees");

  const mismatch = await sessionLib.changeOwnPassword(accounts, session, "First-Pass-2026", "Second-Pass-2026", "Second-Pass-2025");
  assert.equal(mismatch.reason, "mismatch");

  const reuse = await sessionLib.changeOwnPassword(accounts, session, "First-Pass-2026", "First-Pass-2026", "First-Pass-2026");
  assert.equal(reuse.reason, "weak");
  assert.match(reuse.issues.join(" "), /not used here/);
});

test("a temporary password can be replaced by the customer, clearing the flag", async () => {
  const { accounts } = await signedInCustomer();
  accounts[0].mustChangePassword = true;
  const session = { email: "may.thu@example.com", issuedAt: "2026-11-21T00:00:00.000Z", expiresAt: "2026-11-22T00:00:00.000Z" };
  const result = await sessionLib.changeOwnPassword(accounts, session, "First-Pass-2026", "Second-Pass-2026", "Second-Pass-2026");
  assert.equal(result.ok, true);
  assert.equal(result.accounts[0].mustChangePassword, false);
  assert.equal(accountsLib.customerPasswordState(result.accounts[0]).startsWith("Set "), true);
});

test("sign-in refuses an unknown email, a blocked account, a password-less one and a wrong password", async () => {
  const { accounts } = await signedInCustomer();
  assert.equal((await sessionLib.signInCustomer(accounts, "ghost@example.com", "First-Pass-2026")).reason, "unknown-email");
  assert.equal((await sessionLib.signInCustomer(accounts, "other@example.com", "First-Pass-2026")).reason, "no-password");
  assert.equal((await sessionLib.signInCustomer(accounts, "may.thu@example.com", "wrong")).reason, "wrong-password");
  accounts[0].status = "Blocked";
  assert.equal((await sessionLib.signInCustomer(accounts, "may.thu@example.com", "First-Pass-2026")).reason, "blocked");
  accounts[0].status = "Active";
  const ok = await sessionLib.signInCustomer(accounts, "MAY.THU@example.com", "First-Pass-2026");
  assert.equal(ok.ok, true);
  assert.equal(ok.account.email, "may.thu@example.com", "the email is matched without case");
});

test("the session is stored, expires and can be ended", () => {
  store.clear();
  assert.equal(sessionLib.readCustomerSession(), null, "nothing stored means signed out");
  const session = sessionLib.startCustomerSession("May.Thu@Example.com", Date.parse("2026-11-21T08:00:00.000Z"));
  assert.equal(session.email, "may.thu@example.com");
  assert.ok(session.expiresAt > session.issuedAt);
  assert.equal(sessionLib.readCustomerSession(Date.parse("2026-11-21T09:00:00.000Z")).email, "may.thu@example.com");
  assert.equal(
    sessionLib.readCustomerSession(Date.parse("2026-11-22T21:00:00.000Z")),
    null,
    "a session older than its life is signed out and removed",
  );
  assert.equal(store.size, 0, "the expired session is deleted from storage");

  sessionLib.startCustomerSession("may.thu@example.com", Date.parse("2026-11-21T08:00:00.000Z"));
  sessionLib.endCustomerSession();
  assert.equal(sessionLib.readCustomerSession(), null);
});

test("a tampered or corrupt session is ignored rather than trusted", () => {
  store.clear();
  store.set("mh-fashion-customer-session-v1", "{not json");
  assert.equal(sessionLib.readCustomerSession(), null);
  store.set("mh-fashion-customer-session-v1", JSON.stringify({ email: "", expiresAt: new Date(Date.now() + 60000).toISOString() }));
  assert.equal(sessionLib.readCustomerSession(), null);
  store.set("mh-fashion-customer-session-v1", JSON.stringify({ email: "may.thu@example.com" }));
  assert.equal(sessionLib.readCustomerSession(), null, "a session without an expiry is not accepted");
});

test("the account screen mounts the password panel, and the panel refuses the signed-out state", () => {
  const page = read("apps/web/src/app/account/page.tsx");
  assert.match(page, /import AccountPasswordPanel from "@\/components\/account\/AccountPasswordPanel"/);
  assert.match(page, /<AccountPasswordPanel my=\{my\} \/>/, "the panel sits in Account Settings");

  const panel = read("apps/web/src/components/account/AccountPasswordPanel.tsx");
  assert.match(panel, /data-account-password-signed-out/, "signed out says so");
  assert.match(panel, /signInCustomer\(data\.customerAccounts, email, signInPassword\)/, "sign-in verifies the password");
  assert.match(panel, /changeOwnPassword\(data\.customerAccounts, session, current, next, confirm\)/, "the change goes through the session check");
  assert.match(panel, /data-account-password-save/);
  assert.doesNotMatch(panel, /password\.hash/, "the panel never reads the stored hash");
  assert.match(panel, /readCustomerSession\(\)/, "the session is read on mount only, keeping the server render honest");
});
