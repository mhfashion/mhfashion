// The dashboard hides its navigation behind the header's menu button, and Jersey mapping is gone until it
// comes back as part of a post upload.
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const ROOT = path.join(__dirname, "..");

function loadModule(relativePath) {
  const sourcePath = path.join(ROOT, relativePath);
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  const localRequire = (id) => {
    if (id.startsWith("@/")) return loadModule(`apps/web/src/${id.slice(2)}.ts`);
    if (id.startsWith(".")) return loadModule(path.relative(ROOT, path.join(path.dirname(sourcePath), `${id}.ts`)));
    throw new Error(`unexpected import: ${id}`);
  };
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const read = (relativePath) => readFileSync(path.join(ROOT, relativePath), "utf8");
const shell = read("apps/web/src/components/admin/AdminShell.tsx");
const adminNav = read("apps/web/src/lib/admin-nav.ts");
const adminPosts = read("apps/web/src/components/admin/AdminPosts.tsx");

test("the admin sidebar starts hidden behind a menu button on every width", () => {
  assert.match(shell, /const \[sidebarOpen, setSidebarOpen\] = useState\(false\)/);
  assert.match(shell, /data-admin-nav-toggle/);
  assert.match(shell, /aria-expanded=\{sidebarOpen\}/);
  assert.match(shell, /onClick=\{\(\) => setSidebarOpen\(\(value\) => !value\)\}/);
  assert.match(shell, /inert=\{!sidebarOpen\}/);
  assert.match(shell, /sidebarOpen \? "w-\[224px\] translate-x-0" : "w-0 -translate-x-full md:translate-x-0"/);
  const toggle = shell.slice(shell.indexOf("data-admin-nav-toggle") - 400, shell.indexOf("data-admin-nav-toggle"));
  assert.equal(toggle.includes("md:hidden"), false, "the menu button must stay visible on desktop");
  assert.match(shell, /Close navigation|Open navigation/);
  assert.match(shell, /event\.key === "Escape"/);
});

test("the storefront is untouched by the dashboard's menu", () => {
  const header = read("apps/web/src/components/Header.tsx");
  assert.equal(header.includes("SiteMenu"), false);
  assert.equal(existsSync(path.join(ROOT, "apps/web/src/components/SiteMenu.tsx")), false);
  const mobileNav = read("apps/web/src/components/MobileNav.tsx");
  assert.equal(mobileNav.includes("ADMIN_NAV"), false);
});

test("one nav list feeds the shell's rows and the permission list", () => {
  const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
  const nav = loadModule("apps/web/src/lib/admin-nav.ts");
  assert.deepEqual(
    nav.ADMIN_NAV.map((entry) => entry.id),
    admin.ADMIN_MODULES.map((module) => module.id),
    "the two lists drifted apart",
  );
  assert.deepEqual(Object.keys(nav.ADMIN_NAV[0]), ["id", "label", "href"]);
  for (const entry of nav.ADMIN_NAV) assert.equal(entry.href, entry.id === "dashboard" ? "/admin" : `/admin/${entry.id}`);
});

test("Jersey mapping is removed, not hidden", () => {
  for (const gone of [
    "apps/web/src/app/admin/jersey",
    "apps/web/src/components/admin/AdminJersey.tsx",
    "apps/web/src/lib/admin-jersey.ts",
    "tests/admin-jersey.test.cjs",
  ]) {
    assert.equal(existsSync(path.join(ROOT, gone)), false, `${gone} is still in the tree`);
  }
  assert.equal(adminPosts.includes("Jersey mapping"), false);
  assert.equal(adminPosts.includes("AdminJerseyPanel"), false);
  assert.equal(adminNav.includes("jersey"), false);
  const manifest = JSON.parse(read("apps/web/public/manus-routes.json"));
  assert.equal(manifest.routes.some((route) => route.path === "/admin/jersey"), false);
});
