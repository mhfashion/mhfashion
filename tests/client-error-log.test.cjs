const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");
function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, require);
  return loaded.exports;
}

const log = loadModule("apps/web/src/lib/error-log.ts");

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

const AT = "2026-11-22T04:00:00.000Z";

test("a recorded crash reads back with the fields the admin table needs", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "Cannot read properties of undefined (reading 'x')", path: "/create", stack: "at Editor (chunk.js:1:1)", at: AT }, storage);
  const [entry] = log.readClientErrorLog(storage);
  assert.equal(entry.message, "Cannot read properties of undefined (reading 'x')");
  assert.equal(entry.path, "/create");
  assert.equal(entry.kind, "error", "a boundary crash is the default kind");
  assert.equal(entry.stack, "at Editor (chunk.js:1:1)");
  assert.equal(entry.at, AT);
  assert.match(entry.id, /^crash-[0-9a-z]+-[0-9a-z]+$/, "every entry carries a stable id");
});

test("the newest crash is first", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "first", path: "/a", at: "2026-11-22T04:00:00.000Z" }, storage);
  log.recordClientError({ message: "second", path: "/b", at: "2026-11-22T05:00:00.000Z" }, storage);
  assert.deepEqual(log.readClientErrorLog(storage).map((entry) => entry.message), ["second", "first"]);
});

test("a crash that repeats collapses into one row that moves forward", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "boom", path: "/create", at: "2026-11-22T04:00:00.000Z" }, storage);
  log.recordClientError({ message: "boom", path: "/create", at: "2026-11-22T05:00:00.000Z", digest: "abc" }, storage);
  const entries = log.readClientErrorLog(storage);
  assert.equal(entries.length, 1, "a render loop must not fill the log");
  assert.equal(entries[0].at, "2026-11-22T05:00:00.000Z", "the row shows when it last happened");
  assert.equal(entries[0].digest, "abc", "the newest digest wins");
});

test("the same message on two routes stays two rows", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "boom", path: "/create", at: AT }, storage);
  log.recordClientError({ message: "boom", path: "/admin", at: AT }, storage);
  assert.equal(log.readClientErrorLog(storage).length, 2, "the path is what tells them apart");
});

test("the log keeps the newest entries and drops the rest", () => {
  const storage = memoryStorage();
  for (let index = 0; index < log.CLIENT_ERROR_LIMIT + 5; index += 1) {
    log.recordClientError({ message: `crash ${index}`, path: "/p", at: new Date(Date.UTC(2026, 10, 22, 0, index)).toISOString() }, storage);
  }
  const entries = log.readClientErrorLog(storage);
  assert.equal(entries.length, log.CLIENT_ERROR_LIMIT);
  assert.equal(entries[0].message, `crash ${log.CLIENT_ERROR_LIMIT + 4}`, "the newest survived");
  assert.equal(entries.at(-1).message, "crash 5", "the oldest five were dropped");
});

test("a long message and stack are cut, not stored whole", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "x".repeat(500), path: "/create", stack: "y".repeat(5000), at: AT }, storage);
  const [entry] = log.readClientErrorLog(storage);
  assert.equal(entry.message.length, 300);
  assert.equal(entry.stack.length, log.CLIENT_ERROR_STACK_LIMIT);
});

test("an empty message records nothing", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "   ", path: "/create", at: AT }, storage);
  assert.deepEqual(log.readClientErrorLog(storage), []);
});

test("clearing empties the log and removes the key", () => {
  const storage = memoryStorage();
  log.recordClientError({ message: "boom", path: "/create", at: AT }, storage);
  assert.equal(log.clearClientErrorLog(storage), true);
  assert.deepEqual(log.readClientErrorLog(storage), []);
  assert.equal(storage.data.has(log.CLIENT_ERROR_STORAGE_KEY), false, "no empty array is left behind");
});

test("a corrupt or hand-edited log cannot break the admin page", () => {
  const corrupt = memoryStorage({ [log.CLIENT_ERROR_STORAGE_KEY]: "{not json" });
  assert.deepEqual(log.readClientErrorLog(corrupt), []);
  const notAnArray = memoryStorage({ [log.CLIENT_ERROR_STORAGE_KEY]: JSON.stringify({ message: "boom" }) });
  assert.deepEqual(log.readClientErrorLog(notAnArray), []);
  const mixed = memoryStorage({
    [log.CLIENT_ERROR_STORAGE_KEY]: JSON.stringify([
      { message: "real", path: "/create", at: AT, kind: "unhandled" },
      { message: "", path: "/x" },
      "nonsense",
      { message: "no timestamp", path: "/y" },
    ]),
  });
  const entries = log.readClientErrorLog(mixed);
  assert.equal(entries.length, 2, "blank and non-object rows are dropped");
  assert.equal(entries[0].kind, "unhandled");
  assert.equal(entries[1].at, new Date(0).toISOString(), "a missing timestamp becomes the epoch, not a crash");
  assert.equal(entries[1].id.startsWith("crash-"), true, "a missing id is rebuilt");
});

test("storage that refuses to work never throws", () => {
  const hostile = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("quota"); },
    removeItem() { throw new Error("denied"); },
  };
  assert.deepEqual(log.readClientErrorLog(hostile), []);
  assert.deepEqual(log.recordClientError({ message: "boom", path: "/create", at: AT }, hostile), [], "nothing stored, nothing thrown");
  assert.equal(log.clearClientErrorLog(hostile), false);
});

test("the log groups the way an owner reads it", () => {
  const entries = [
    { id: "1", message: "boom", path: "/create", kind: "error", digest: "", stack: "", at: "2026-11-22T06:00:00.000Z" },
    { id: "2", message: "boom", path: "/create", kind: "error", digest: "", stack: "", at: "2026-11-22T05:00:00.000Z" },
    { id: "3", message: "quiet", path: "/faq", kind: "unhandled", digest: "", stack: "", at: "2026-11-22T07:00:00.000Z" },
  ];
  const groups = log.summariseClientErrors(entries);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].message, "boom", "the worst offender comes first");
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].lastAt, "2026-11-22T06:00:00.000Z");
  assert.equal(groups[1].message, "quiet");
});

test("a headline names where it happened", () => {
  const base = { id: "1", message: "boom", digest: "", stack: "", at: AT };
  assert.equal(log.clientErrorHeadline({ ...base, path: "/create", kind: "error" }), "/create — boom");
  assert.equal(log.clientErrorHeadline({ ...base, path: "/", kind: "global" }), "whole app — boom", "a root crash has no meaningful path");
});

test("both boundaries record before they offer a way out", () => {
  const errorPage = readFileSync(path.join(ROOT, "apps/web/src/app/error.tsx"), "utf8");
  assert.match(errorPage, /recordClientError\(\{/, "the page boundary writes the crash down");
  assert.match(errorPage, /kind: "error"/);
  assert.match(errorPage, /onClick=\{reset\}/, "the customer gets a retry, not a dead end");
  assert.match(errorPage, /href="\/"/, "and a way back to the shop");

  const globalPage = readFileSync(path.join(ROOT, "apps/web/src/app/global-error.tsx"), "utf8");
  assert.match(globalPage, /kind: "global"/, "a root layout crash is marked as the whole app");
  assert.match(globalPage, /<html lang="en">/, "a global boundary replaces the layout, so it renders its own html");
  assert.match(globalPage, /style=\{shell\}/, "inline styles: Tailwind may not be loaded here");
});

test("an event handler crash is caught by the window listener, noise is not", () => {
  const reporter = readFileSync(path.join(ROOT, "apps/web/src/components/CrashReporter.tsx"), "utf8");
  assert.match(reporter, /addEventListener\("error", onError\)/, "an uncaught error outside React still reaches the log");
  assert.match(reporter, /kind: "unhandled"/);
  assert.match(reporter, /Script error/, "a cross-origin message is not a bug we can act on");
  assert.match(reporter, /ResizeObserver loop/);
  const layout = readFileSync(path.join(ROOT, "apps/web/src/app/layout.tsx"), "utf8");
  assert.match(layout, /<CrashReporter \/>/, "the reporter is mounted once");
});

test("the admin reads the log on this device and says so", () => {
  const card = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminCrashLog.tsx"), "utf8");
  assert.match(card, /useSyncExternalStore\(subscribeClientErrorLog/, "the table follows the log without a reload");
  assert.match(card, /clearClientErrorLog\(\)/, "the owner can clear it");
  assert.match(card, /never uploaded/, "the page is honest that nothing leaves the device");
  assert.match(card, /data-crash-row/, "each crash is a row a test can find");
  const settings = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminSettings.tsx"), "utf8");
  assert.match(settings, /<AdminCrashLogCard \/>/, "the crash log lives in Settings");
});
