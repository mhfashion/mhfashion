const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const WEB = path.join(ROOT, "apps/web");

const manifestSource = readFileSync(path.join(WEB, "src/app/manifest.ts"), "utf8");
const workerSource = readFileSync(path.join(WEB, "public/sw.js"), "utf8");
const layoutSource = readFileSync(path.join(WEB, "src/app/layout.tsx"), "utf8");
const installSource = readFileSync(path.join(WEB, "src/components/PwaInstall.tsx"), "utf8");

test("the manifest declares everything an install prompt needs", () => {
  assert.match(manifestSource, /start_url: "\/\?source=pwa"/, "the start URL tells the shop where the visit came from");
  assert.match(manifestSource, /scope: "\/"/, "the whole shop is in scope");
  assert.match(manifestSource, /display: "standalone"/, "standalone is what makes it look installed");
  assert.match(manifestSource, /name: "MH Fashion/, "the long name");
  assert.match(manifestSource, /short_name: "MH Fashion"/, "the name under the icon");
  assert.match(manifestSource, /theme_color: "#0c0c0c"/, "the status bar matches the shop");
  assert.match(manifestSource, /background_color: "#0c0c0c"/, "the splash matches the shop");
});

test("the manifest ships a 192 and a 512 icon, plus a maskable one", () => {
  assert.match(manifestSource, /src: "\/icon-192\.png", sizes: "192x192"/, "192 is the smallest Chrome accepts");
  assert.match(manifestSource, /src: "\/icon-512\.png", sizes: "512x512"/, "512 is the splash icon");
  assert.match(manifestSource, /purpose: "maskable"/, "Android crops to its own shape without a maskable tile");
  for (const file of ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png", "favicon-32.png"]) {
    const full = path.join(WEB, "public", file);
    assert.ok(existsSync(full), `${file} exists`);
    const head = readFileSync(full).subarray(0, 8);
    assert.deepEqual([...head], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], `${file} is a real PNG`);
  }
});

test("the layout points at the manifest and the icons", () => {
  assert.match(layoutSource, /manifest: "\/manifest\.webmanifest"/, "Next serves app/manifest.ts at this path");
  assert.match(layoutSource, /appleWebApp: \{ capable: true/, "iOS needs its own declaration");
  assert.match(layoutSource, /url: "\/apple-touch-icon\.png", sizes: "180x180"/, "the iOS home-screen icon");
  assert.match(layoutSource, /<PwaInstall \/>/, "the install prompt is mounted once");
});

test("the worker never caches the editor, the admin or an API call", () => {
  assert.match(workerSource, /const NETWORK_ONLY = \["\/admin", "\/create", "\/api", "\/auth", "\/checkout", "\/account"\]/);
  assert.match(workerSource, /if \(request\.method !== "GET"\) return;/, "a POST must never be answered from cache");
  assert.match(workerSource, /if \(isNetworkOnly\(url\.pathname\)\) \{/, "the bypass runs before any cache read");
  assert.match(workerSource, /event\.respondWith\(fetch\(request\)\.catch\(\(\) => offlineResponse\(\)\)\)/, "a working surface still shows our offline page, never a cached copy");
  assert.match(workerSource, /if \(url\.origin !== self\.location\.origin\) return;/, "another origin is not ours to cache");
  assert.match(workerSource, /request\.headers\.has\("range"\)/, "range requests are left alone");
});

test("a navigation falls back to the offline page, not a browser error", () => {
  assert.match(workerSource, /request\.mode === "navigate"/);
  assert.match(workerSource, /caches\.match\(OFFLINE_URL\)/, "the fallback is the offline page");
  assert.match(workerSource, /const OFFLINE_URL = "\/offline"/);
  assert.match(workerSource, /const VERSION = "mh-fashion-v3"/, "a new version is a new cache name");
  assert.match(workerSource, /names\.filter\(\(name\) => !name\.startsWith\(VERSION\)\)/, "old caches are thrown away on activate");
  assert.match(workerSource, /self\.skipWaiting\(\)/, "the new worker takes over without a second visit");
  assert.match(workerSource, /self\.clients\.claim\(\)/);
});

test("the install prompt stays out of the working surfaces and remembers a dismissal", () => {
  assert.match(installSource, /const HIDDEN_PREFIXES = \["\/admin", "\/create"\]/, "no banner over the editor or the admin");
  assert.match(installSource, /navigator\.serviceWorker\.register\("\/sw\.js"\)/, "the worker is registered from the app");
  assert.match(installSource, /beforeinstallprompt/, "Chrome's prompt is captured rather than shown at its own time");
  assert.match(installSource, /event\.preventDefault\(\)/, "the default banner is suppressed so ours is the one shown");
  assert.match(installSource, /appinstalled/, "the banner goes away once installed");
  assert.match(installSource, /mh-fashion-pwa-dismissed/, "a dismissal is remembered");
  assert.match(installSource, /HIDDEN_PREFIXES\.some\(\(prefix\) => pathname\?\.startsWith\(prefix\)\)/);
});

test("the offline page tells the customer what still works and is kept out of search", () => {
  const offline = readFileSync(path.join(WEB, "src/app/offline/page.tsx"), "utf8");
  assert.match(offline, /You are offline/, "it says the state plainly");
  assert.match(offline, /robots: \{ index: false, follow: false \}/, "an offline page must not be indexed");
  assert.match(offline, /href="\/"/, "there is a way back to the shop");
});
