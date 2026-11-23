const assert = require("node:assert/strict");
const test = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { loadModule } = require("./helpers/load-ts-module.cjs");

const data = loadModule("apps/web/src/lib/admin-demo-data.ts");
const brushesLib = loadModule("apps/web/src/lib/admin-brushes.ts");

const ROOT = path.join(__dirname, "..");

test("the seeded library has four usable brushes with unique bucket ids", () => {
  const brushes = data.createSeedBrushes();
  assert.equal(brushes.length, 4);
  assert.equal(new Set(brushes.map((brush) => brush.id)).size, 4);
  for (const brush of brushes) {
    assert.match(brush.id, brushesLib.BRUSH_ID_PATTERN, brush.id);
    assert.ok(brush.name.length > 0);
    assert.ok(data.ADMIN_BRUSH_SHELVES.includes(brush.shelf), brush.shelf);
    assert.ok(data.ADMIN_BRUSH_TIPS.includes(brush.tip), brush.tip);
    assert.equal(Array.isArray(brushesLib.validateBrushDraft(brushesLib.brushDraftFrom(brush), brushes, brush.id)), true);
    assert.deepEqual(brushesLib.validateBrushDraft(brushesLib.brushDraftFrom(brush), brushes, brush.id), []);
  }
  assert.equal(brushesLib.enabledBrushCount(brushes), 3);
});

test("a brush's texture key is its own folder under brushes/", () => {
  assert.equal(brushesLib.brushTextureKey("ink-round"), "brushes/ink-round/texture.png");
});

test("saved brushes are repaired on read: bad entries dropped, numbers clamped", () => {
  const normalized = data.normalizeBrushes([
    { id: "good-one", name: "Good", shelf: "Marker", tip: "square", size: 900, spacing: 0, opacity: 3, softness: -1, enabled: true },
    { id: "Bad_Id", name: "Bad id" },
    { id: "no-name", name: "  " },
    { id: "good-one", name: "Duplicate" },
    { id: "defaults", name: "Defaults" },
    null,
    "nope",
  ]);
  assert.deepEqual(normalized.map((brush) => brush.id), ["good-one", "defaults"]);
  assert.equal(normalized[0].size, 400);
  assert.equal(normalized[0].spacing, 1);
  assert.equal(normalized[0].opacity, 1);
  assert.equal(normalized[0].softness, 0);
  assert.equal(normalized[1].shelf, "Ink");
  assert.equal(normalized[1].tip, "round");
  assert.equal(normalized[1].size, 52);
  assert.equal(normalized[1].enabled, true);
});

test("a missing brush list falls back to the seed library", () => {
  assert.deepEqual(data.normalizeBrushes(undefined).map((brush) => brush.id), data.createSeedBrushes().map((brush) => brush.id));
  assert.deepEqual(data.normalizeBrushes("garbage").length, 4);
});

test("the draft validation names every problem in one pass", () => {
  const existing = data.createSeedBrushes();
  const issues = brushesLib.validateBrushDraft(
    { id: "Bad Id", name: "", shelf: "Nope", tip: "pointed", size: 2, spacing: 400, opacity: 0, softness: 5 },
    existing,
    null,
  );
  assert.equal(issues.length, 8, issues.join(" | "));
  assert.match(issues[0], /lowercase words joined by -/);
  assert.match(issues[1], /name the picker can show/);
  assert.match(issues.join(" "), /size must be between 4 and 400/);
  assert.match(issues.join(" "), /spacing must be between 1% and 200%/);
  assert.match(issues.join(" "), /opacity must be between 0.05 and 1/);
  assert.match(issues.join(" "), /softness must be between 0 and 1/);
});

test("an id already in use is refused, unless it is the brush being edited", () => {
  const existing = data.createSeedBrushes();
  const draft = brushesLib.brushDraftFrom(existing[0]);
  assert.match(brushesLib.validateBrushDraft(draft, existing, null).join(" "), /already exists/);
  assert.deepEqual(brushesLib.validateBrushDraft(draft, existing, existing[0].id), []);
});

test("a long name is refused", () => {
  const draft = { ...brushesLib.brushDraftFrom(), id: "fresh", name: "x".repeat(41) };
  assert.match(brushesLib.validateBrushDraft(draft, [], null).join(" "), /Keep the name under 40 characters/);
});

test("saving a draft trims the text, rounds the numbers and keeps the switch state", () => {
  const existing = { ...data.createSeedBrushes()[3] };
  const brush = brushesLib.brushFromDraft(
    { id: "  new-brush ", name: "  New brush ", shelf: "Paint", tip: "round", size: 51.6, spacing: 9.4, opacity: 0.876, softness: 0.444 },
    existing,
  );
  assert.deepEqual(brush, {
    id: "new-brush",
    name: "New brush",
    shelf: "Paint",
    tip: "round",
    size: 52,
    spacing: 9,
    opacity: 0.88,
    softness: 0.44,
    enabled: false,
  });
  assert.equal(brushesLib.brushFromDraft(brushesLib.brushDraftFrom(), undefined).enabled, true);
});

test("upsert adds at the end and updates in place", () => {
  const store = { brushes: data.createSeedBrushes() };
  const added = brushesLib.upsertBrush(store, { ...store.brushes[0], id: "extra", name: "Extra" });
  assert.equal(added.brushes.length, 5);
  assert.equal(added.brushes[4].id, "extra");
  const updated = brushesLib.upsertBrush(added, { ...added.brushes[1], name: "Renamed" });
  assert.equal(updated.brushes.length, 5);
  assert.equal(updated.brushes[1].name, "Renamed");
  assert.deepEqual(updated.brushes.map((brush) => brush.id), added.brushes.map((brush) => brush.id));
});

test("remove, toggle and move change only what they name", () => {
  const store = { brushes: data.createSeedBrushes() };
  const removed = brushesLib.removeBrush(store, "marker-square");
  assert.deepEqual(removed.brushes.map((brush) => brush.id), ["ink-round", "watercolour-wash", "chalk-grain"]);

  const toggled = brushesLib.toggleBrush(store, "chalk-grain");
  assert.equal(toggled.brushes[3].enabled, true);
  assert.equal(toggled.brushes[0].enabled, true);

  const movedUp = brushesLib.moveBrush(store, "watercolour-wash", -1);
  assert.deepEqual(movedUp.brushes.map((brush) => brush.id), ["ink-round", "watercolour-wash", "marker-square", "chalk-grain"]);
  const movedDown = brushesLib.moveBrush(store, "ink-round", 1);
  assert.deepEqual(movedDown.brushes.map((brush) => brush.id), ["marker-square", "ink-round", "watercolour-wash", "chalk-grain"]);
});

test("a move past either end leaves the list alone", () => {
  const store = { brushes: data.createSeedBrushes() };
  assert.deepEqual(brushesLib.moveBrush(store, "ink-round", -1), store);
  assert.deepEqual(brushesLib.moveBrush(store, "chalk-grain", 1), store);
  assert.deepEqual(brushesLib.moveBrush(store, "missing", 1), store);
});

test("the module is registered in the admin list and the sidebar", () => {
  assert.equal(data.ADMIN_MODULES.some((module) => module.id === "brushes" && module.label === "Brushes"), true);
  const shell = readFileSync(path.join(ROOT, "apps/web/src/components/admin/AdminShell.tsx"), "utf8");
  assert.match(shell, /\{ id: "brushes", label: "Brushes", href: "\/admin\/brushes", icon: Brush \}/);
  const page = readFileSync(path.join(ROOT, "apps/web/src/app/admin/brushes/page.tsx"), "utf8");
  assert.match(page, /<AdminBrushes \/>/);
});

test("a fresh demo set carries the brush library", () => {
  const demo = data.createAdminDemoData(Date.UTC(2026, 10, 22));
  assert.equal(Array.isArray(demo.brushes), true);
  assert.equal(demo.brushes.length, 4);
});
