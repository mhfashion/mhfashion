// The admin sidebar is one dark panel. A platform scrollbar painted a light grey band over its right
// edge and split it in two, and the user row's name block carried a stray layout margin that pushed the
// name and email out of the panel. Both are source-level contracts, so they are pinned here.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shell = fs.readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "apps/web/src/app/globals.css"), "utf8");

const test = require("node:test");

test("the admin sidebar scrolls with a dark bar instead of a light band", () => {
  assert.match(shell, /<nav aria-label="Admin navigation" className="admin-scroll-dark min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">/);
  assert.match(css, /\.admin-scroll-dark \{\n  scrollbar-width: thin;\n  scrollbar-color: rgba\(255, 255, 255, 0\.18\) transparent;/);
  assert.match(css, /\.admin-scroll-dark::-webkit-scrollbar-track \{\n  background: transparent;/);
});

test("the promo card sits below the scroll area so the fold never cuts it in half", () => {
  const nav = shell.slice(shell.indexOf('<nav aria-label="Admin navigation"'), shell.indexOf("</nav>"));
  assert.doesNotMatch(nav, /Create\. Print\. Wear\./);
  const afterNav = shell.slice(shell.indexOf("</nav>"));
  assert.match(afterNav, /rounded-xl border border-white\/10 bg-white\/\[0\.035\] p-3\.5/);
  assert.ok(afterNav.indexOf("Create. Print. Wear.") < afterNav.indexOf("Sign out of demo account"), "the card comes before the user row");
});

test("the sidebar user row keeps its name and email inside the panel", () => {
  const row = shell.slice(shell.indexOf('aria-label="Sign out of demo account" title="Sign out"') - 1400, shell.indexOf('aria-label="Sign out of demo account" title="Sign out"'));
  assert.match(row, /<div className="min-w-0"><p className="truncate text-\[11px\] font-semibold text-white">\{admin\.name\}<\/p>/);
  assert.doesNotMatch(row, /md:ml-\[224px\]/, "the content margin belongs on the page, not inside the sidebar");
});
