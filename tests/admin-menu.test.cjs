// The dashboard is reached through the header's menu button, and Jersey mapping is gone until it comes
// back as part of a post upload.
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
const header = read("apps/web/src/components/Header.tsx");
const menu = read("apps/web/src/components/SiteMenu.tsx");
const mobileNav = read("apps/web/src/components/MobileNav.tsx");
const adminNav = read("apps/web/src/lib/admin-nav.ts");
const adminPosts = read("apps/web/src/components/admin/AdminPosts.tsx");

test("the header menu is the way in, and the drawer lists every admin section", () => {
  assert.match(header, /import SiteMenu from "\.\/SiteMenu"/);
  assert.match(header, /<SiteMenu \/>/);
  assert.match(menu, /data-site-menu-button/);
  assert.match(menu, /aria-expanded=\{open\}/);
  assert.match(menu, /createPortal\(/);
  assert.match(menu, /\{ADMIN_NAV\.map\(\(entry\) => \(/);
  assert.match(menu, /data-admin-link=\{entry\.id\}/);
  assert.match(menu, /event\.key !== "Escape"/, "Escape must close the drawer");
  assert.match(mobileNav, /ADMIN_NAV\.map/);
});

test("no shop surface links to the dashboard without the menu", () => {
  for (const file of [
    "apps/web/src/components/Header.tsx",
    "apps/web/src/components/HeaderActions.tsx",
    "apps/web/src/components/MobileNav.tsx",
    "apps/web/src/components/Footer.tsx",
    "apps/web/src/components/MobileBottomNav.tsx",
  ]) {
    assert.equal(read(file).includes('href="/admin'), false, `${file} links straight to the dashboard`);
  }
});

test("one nav list feeds the shell, the storefront menu and the permissions", () => {
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
