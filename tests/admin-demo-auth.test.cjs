const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const auth = loadModule("apps/web/src/lib/admin-demo-auth.ts");

const ACCOUNT_KEY = "mh-fashion-admin-demo-account-v1";
const SESSION_KEY = "mh-fashion-admin-demo-session-v1";

function useStorage() {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };
  return values;
}

function cleanUp() {
  delete globalThis.window;
}

test("an account is created once, and the password is never stored as typed", async () => {
  const values = useStorage();
  try {
    assert.equal(auth.hasDemoAdminAccount(), false);
    const session = await auth.createDemoAdminAccount("  QA Admin  ", "  QA@Example.COM ", "correct horse");
    assert.deepEqual(session, { name: "QA Admin", email: "qa@example.com", role: "Administrator" });

    const stored = JSON.parse(values.get(ACCOUNT_KEY));
    assert.equal(stored.email, "qa@example.com", "the email is stored lower case");
    assert.notEqual(stored.passwordHash, "correct horse");
    assert.match(stored.passwordHash, /^[0-9a-f]{64}$/, "a SHA-256 digest, not the password");
    assert.match(stored.salt, /^[0-9a-f]{32}$/);
    assert.equal(auth.hasDemoAdminAccount(), true);
    assert.ok(auth.getDemoAdminSession(), "creating the account also signs in");

    await assert.rejects(() => auth.createDemoAdminAccount("Someone Else", "x@example.com", "another"), /already exists/);
  } finally {
    cleanUp();
  }
});

test("signing in needs the right email and password", async () => {
  useStorage();
  try {
    await auth.createDemoAdminAccount("QA Admin", "qa@example.com", "correct horse");
    auth.signOutDemoAdmin();
    assert.equal(auth.getDemoAdminSession(), null, "signing out drops the session but keeps the account");

    assert.equal(await auth.signInDemoAdmin("qa@example.com", "wrong"), null);
    assert.equal(await auth.signInDemoAdmin("other@example.com", "correct horse"), null);
    assert.equal(auth.getDemoAdminSession(), null, "a refused sign-in leaves no session behind");

    const session = await auth.signInDemoAdmin(" QA@EXAMPLE.com ", "correct horse");
    assert.deepEqual(session, { name: "QA Admin", email: "qa@example.com", role: "Administrator" });
    assert.equal(auth.getDemoAdminSession().name, "QA Admin");
  } finally {
    cleanUp();
  }
});

test("a session expires after a week and a broken record is discarded", () => {
  const values = useStorage();
  try {
    const saved = Date.now();
    values.set(SESSION_KEY, JSON.stringify({ name: "QA", email: "qa@example.com", role: "Administrator", expiresAt: saved + 7 * 24 * 60 * 60 * 1000 }));
    assert.equal(auth.getDemoAdminSession().name, "QA");

    values.set(SESSION_KEY, JSON.stringify({ name: "QA", email: "qa@example.com", expiresAt: saved - 1 }));
    assert.equal(auth.getDemoAdminSession(), null, "an expired session is refused");
    assert.equal(values.has(SESSION_KEY), false, "and removed, so it cannot come back");

    values.set(SESSION_KEY, "{not json");
    assert.equal(auth.getDemoAdminSession(), null);
    assert.equal(values.has(SESSION_KEY), false);

    values.set(SESSION_KEY, JSON.stringify({ name: "QA" }));
    assert.equal(auth.getDemoAdminSession(), null, "a record without an expiry is not trusted");

    values.set(ACCOUNT_KEY, JSON.stringify({ name: "QA", email: "qa@example.com" }));
    assert.equal(auth.hasDemoAdminAccount(), false, "a half-written account is not an account");
    values.set(ACCOUNT_KEY, "nonsense");
    assert.equal(auth.hasDemoAdminAccount(), false);
  } finally {
    cleanUp();
  }
});

test("with no account, signing in is simply refused", async () => {
  useStorage();
  try {
    assert.equal(await auth.signInDemoAdmin("qa@example.com", "correct horse"), null);
    assert.equal(auth.getDemoAdminSession(), null);
    assert.equal(auth.hasDemoAdminAccount(), false);
  } finally {
    cleanUp();
  }
});
