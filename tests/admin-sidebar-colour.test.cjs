// The admin sidebar is the same white panel as the header bar, one flat colour from top to bottom: it
// holds the navigation and nothing else. A platform scrollbar painted a light grey band over its right
// edge and split it in two, so the dark scrollbar is pinned here too.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const shell = fs.readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "apps/web/src/app/globals.css"), "utf8");

const test = require("node:test");

test("the admin sidebar is the same white panel as the header bar", () => {
  assert.match(shell, /<nav aria-label="Admin navigation" className="admin-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">/);
  assert.match(shell, /fixed bottom-\[32px\] left-0 top-\[64px\][^"]*border-r border-\[#e8ebef\] bg-white/, "the panel matches the header bar");
  assert.doesNotMatch(shell, /bg-\[#11171b\]/, "the dark panel is gone");
  assert.match(css, /\.admin-scroll \{\n  scrollbar-width: thin;\n  scrollbar-color: rgba\(23, 28, 37, 0\.22\) transparent;/);
  assert.match(css, /\.admin-scroll::-webkit-scrollbar-track \{\n  background: transparent;/);
});

test("the sidebar is the navigation only, so the panel is one flat colour", () => {
  const nav = shell.slice(shell.indexOf('<nav aria-label="Admin navigation"'), shell.indexOf("</nav>"));
  const panel = shell.slice(shell.indexOf('id="admin-sidebar"'), shell.indexOf("</aside>"));
  assert.doesNotMatch(panel, /Create\. Print\. Wear\./, "the promo card is gone");
  assert.doesNotMatch(panel, /Open design editor/, "the promo card's link is gone");
  assert.doesNotMatch(panel.slice(panel.indexOf("</nav>")), /bg-white\/\[0\.035\]/, "no tinted block under the nav");
  assert.doesNotMatch(panel.slice(panel.indexOf("</nav>")), /border-t border-white/, "no divider strip under the nav");
  assert.match(nav, /flex-1/, "the nav fills the panel");
});

test("the account and its sign-out appear once, in the header", () => {
  assert.equal(shell.split('aria-label="Sign out of demo account"').length - 1, 1, "one sign-out control in the shell");
  assert.equal(shell.split("<AdminAvatar").length - 1, 1, "one avatar in the shell");
  const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
  assert.match(header, /aria-label="Sign out of demo account"/, "the header carries it");
  const panel = shell.slice(shell.indexOf('id="admin-sidebar"'), shell.indexOf("</aside>"));
  assert.doesNotMatch(panel, /aria-label="Sign out of demo account"/, "the sidebar no longer repeats it");
});

test("the footer is one thin bar pinned to the viewport, and the sidebar stops above it", () => {
  const bar = shell.match(/<footer data-admin-footer[^>]*className="([^"]+)"/);
  assert.ok(bar, "the admin shell renders its own footer bar");
  assert.match(bar[1], /fixed inset-x-0 bottom-0/, "the bar does not scroll with the page");
  assert.match(bar[1], /h-\[32px\]/, "the bar stays thin");
  assert.match(shell, /All rights reserved\./, "the bar carries the copyright line");
  assert.match(shell, /fixed bottom-\[32px\] left-0 top-\[64px\]/, "the sidebar ends where the bar starts");
  assert.doesNotMatch(shell, /<footer className="mt-6/, "the old scrolling footer is gone");

  const site = fs.readFileSync(path.join(__dirname, "..", "apps/web/src/components/CopyrightBar.tsx"), "utf8");
  assert.match(site, /if \(pathname\?\.startsWith\("\/admin"\)\) return null;/, "the site bar steps aside on admin screens");
});
