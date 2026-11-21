const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

const loadedModules = new Map();

function loadModule(relativePath) {
  const sourcePath = path.join(__dirname, "..", relativePath);
  const cached = loadedModules.get(sourcePath);
  if (cached) return cached.exports;
  const compiled = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: sourcePath,
  }).outputText;
  const loaded = { exports: {} };
  loadedModules.set(sourcePath, loaded);
  const localRequire = (id) => (id.startsWith("@/") ? loadModule(`apps/web/src/${id.slice(2)}.ts`) : require(id));
  new Function("module", "exports", "require", compiled)(loaded, loaded.exports, localRequire);
  return loaded.exports;
}

const admin = loadModule("apps/web/src/lib/admin-demo-data.ts");
const jersey = loadModule("apps/web/src/lib/admin-jersey.ts");

const NOW = Date.UTC(2026, 10, 21, 9, 0, 0);
const data = admin.createAdminDemoData(NOW);

test("both seeded styles map every required panel inside the photo", () => {
  assert.equal(data.jerseyStyles.length, 2);
  for (const style of data.jerseyStyles) {
    assert.deepEqual(jersey.styleIssues(style, data.jerseyStyles), [], style.name);
    assert.deepEqual(jersey.missingPanels(style), []);
    assert.match(style.wornPhoto, /^jersey-mockups\/[a-z-]+\/worn_photo\.png$/, "the R2 layout from the plan");
    for (const panel of style.panels) {
      assert.equal(panel.view, panel.key === "back" ? "back" : "front");
      for (const corner of panel.corners) {
        assert.ok(corner.x >= 0 && corner.x <= 100 && corner.y >= 0 && corner.y <= 100, `${style.name} ${panel.key}`);
      }
    }
  }
});

test("the shoelace area rejects a collapsed quad", () => {
  const square = [{ x: 10, y: 10 }, { x: 30, y: 10 }, { x: 30, y: 30 }, { x: 10, y: 30 }];
  assert.equal(jersey.quadArea(square), 400);
  assert.equal(jersey.quadArea([{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 10 }, { x: 10, y: 10 }]), 0);
  const thin = [{ x: 10, y: 10 }, { x: 13, y: 10 }, { x: 13, y: 11 }, { x: 10, y: 11 }];
  const issues = jersey.panelIssues({ key: "front-left", view: "front", corners: thin });
  assert.match(issues.join("\n"), /too close together/);
  assert.ok(jersey.quadArea(thin) < jersey.MIN_PANEL_AREA);
});

test("a corner outside the photo or on the wrong view is refused", () => {
  const outside = jersey.panelIssues({ key: "collar", view: "front", corners: [{ x: 140, y: 20 }, { x: 60, y: 20 }, { x: 60, y: 30 }, { x: 40, y: 30 }] });
  assert.match(outside.join("\n"), /Collar: 1 corner is outside the photo/);
  const wrongView = jersey.panelIssues({ key: "back", view: "front", corners: [{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 40 }, { x: 10, y: 40 }] });
  assert.match(wrongView.join("\n"), /Back: it belongs on the back photo/);
});

test("saving a style refuses a duplicate name and a missing required panel", () => {
  const home = data.jerseyStyles[0];
  const duplicate = jersey.saveStyle(data, { ...home, id: "jersey-other", name: "mh sport home" });
  assert.equal(duplicate.data, data);
  assert.match(duplicate.issues.join("\n"), /already a style/);

  const missing = jersey.saveStyle(data, { ...home, id: "jersey-other", name: "Third kit", panels: home.panels.filter((panel) => panel.key !== "back") });
  assert.match(missing.issues.join("\n"), /Back is required/);

  const unnamed = jersey.saveStyle(data, { ...home, id: "jersey-other", name: "   " });
  assert.match(unnamed.issues.join("\n"), /Give the style a name/);

  const ok = jersey.saveStyle(data, { ...home, id: "jersey-third", name: "MH Sport Third" });
  assert.deepEqual(ok.issues, []);
  assert.equal(ok.data.jerseyStyles.length, 3);
  assert.equal(data.jerseyStyles.length, 2, "the input is not mutated");
});

test("a new style arrives with every panel, so it is editable immediately", () => {
  const bare = { id: "jersey-new", name: "New kit", wornPhoto: null, updatedAt: "2026-11-21T10:00:00.000Z", panels: [] };
  const completed = jersey.completePanels(bare);
  assert.deepEqual(completed.panels.map((panel) => panel.key), [...admin.JERSEY_PANEL_KEYS]);
  assert.equal(completed.panels.find((panel) => panel.key === "back").view, "back");
  assert.deepEqual(jersey.styleIssues(completed, [completed]), [], "the defaults already validate");
});

test("the last style cannot be deleted, and a copy keeps its zones", () => {
  const single = { ...data, jerseyStyles: [data.jerseyStyles[0]] };
  const blocked = jersey.removeStyle(single, "jersey-home");
  assert.equal(blocked.data, single);
  assert.match(blocked.issues[0], /Keep at least one style/);

  const copy = jersey.duplicateStyle(data, "jersey-home", "MH Sport Home copy");
  assert.deepEqual(copy.issues, []);
  const added = copy.data.jerseyStyles.find((style) => style.name === "MH Sport Home copy");
  assert.ok(added);
  assert.deepEqual(added.panels, data.jerseyStyles[0].panels, "the quads come across unchanged");
  assert.notEqual(added.id, data.jerseyStyles[0].id);
  assert.match(added.wornPhoto, /jersey-home-copy/, "the photo path follows the new id");

  const removed = jersey.removeStyle(copy.data, added.id);
  assert.equal(removed.data.jerseyStyles.length, 2);
});

test("a corner edit lands on the chosen panel only", () => {
  const home = data.jerseyStyles[0];
  const panel = jersey.panelOf(home, "front-left");
  const corners = panel.corners.map((corner, index) => (index === 0 ? { x: 34, y: 31 } : corner));
  const result = jersey.updatePanel(data, home.id, "front-left", corners);
  assert.deepEqual(result.issues, []);
  const updated = result.data.jerseyStyles[0];
  assert.deepEqual(updated.panels.find((entry) => entry.key === "front-left").corners[0], { x: 34, y: 31 });
  assert.deepEqual(updated.panels.find((entry) => entry.key === "front-right").corners, jersey.panelOf(home, "front-right").corners);
  assert.deepEqual(home.panels.find((entry) => entry.key === "front-left").corners[0], { x: 30, y: 30 }, "the input is not mutated");
});

test("the exported JSON matches the R2 mapping_zones.json contract", () => {
  const style = data.jerseyStyles[0];
  const parsed = JSON.parse(jersey.mappingZonesJson(style));
  assert.equal(parsed.styleId, style.id);
  assert.equal(parsed.wornPhoto, style.wornPhoto);
  assert.deepEqual(parsed.panels.map((panel) => panel.key), style.panels.map((panel) => panel.key));
  assert.deepEqual(parsed.panels[0].corners[0], { x: 30, y: 30 });
  assert.ok(parsed.panels.every((panel) => panel.corners.length === 4));
});

test("the preview path and view split follow the quad", () => {
  const style = data.jerseyStyles[0];
  assert.equal(jersey.panelPath(jersey.panelOf(style, "front-left")), "M30 30 L49 30 L49 62 L30 62 Z");
  assert.deepEqual(jersey.panelsForView(style, "back").map((panel) => panel.key), ["back"]);
  assert.equal(jersey.panelsForView(style, "front").length, 5);
  assert.equal(jersey.PANEL_LABELS["front-left"], "Front left");
});

test("Jersey mapping is registered, routed and states the panel contract", () => {
  assert.ok(admin.ADMIN_MODULES.some((module) => module.id === "jersey" && module.label === "Jersey"));

  // Jersey lives inside Posts (owner request 2026-11-21), so the sidebar no longer lists it and the old
  // /admin/jersey bookmark redirects to the Posts tab.
  const shell = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.ok(!/id: "jersey"/.test(shell), "the sidebar must not list Jersey on its own");
  const posts = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminPosts.tsx"), "utf8");
  assert.match(posts, /\{ id: "jersey", label: "Jersey mapping" \}/);
  assert.match(posts, /<AdminJerseyPanel \/>/);
  assert.ok(existsSync(path.join(__dirname, "..", "apps/web/src/app/admin/jersey/page.tsx")));
  const jerseyPage = readFileSync(path.join(__dirname, "..", "apps/web/src/app/admin/jersey/page.tsx"), "utf8");
  assert.match(jerseyPage, /redirect\("\/admin\/posts\?tab=jersey"\)/);

  const source = readFileSync(path.join(__dirname, "..", "apps/web/src/components/admin/AdminJersey.tsx"), "utf8");
  assert.match(source, /export function AdminJerseyPanel\(\)/);
  for (const marker of [
    "data-jersey-style",
    "data-panel-chip",
    "data-jersey-preview",
    "data-jersey-photo",
    "data-jersey-missing",
    "data-jersey-message",
    'aria-label="Add a jersey style"',
    'aria-label="Export mapping zones JSON"',
    'aria-label="Duplicate this style"',
    'aria-label="Delete this style"',
    "CORNER_LABELS[index]} x",
    "Every required panel is mapped.",
    "the catalog preview and the post-edit mockup read the same zones",
  ]) {
    assert.ok(source.includes(marker), `AdminJersey is missing ${marker}`);
  }
});
