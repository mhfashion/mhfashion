const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadModule } = require("./helpers/load-ts-module.cjs");
const adminData = loadModule("apps/web/src/lib/admin-demo-data.ts");
const editor = loadModule("apps/web/src/lib/editor-layers.ts");
const root = path.join(__dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("brushes are not an admin module", () => {
  assert.ok(!adminData.ADMIN_MODULES.some((module) => module.id === "brushes"), "the dashboard no longer lists Brushes");
  assert.doesNotMatch(read("apps/web/src/lib/admin-demo-data.ts"), /"brushes"/);
  assert.doesNotMatch(read("apps/web/src/components/admin/AdminShell.tsx"), /\/admin\/brushes/);
  assert.ok(!existsSync(path.join(root, "apps/web/src/app/admin/brushes")), "the admin route is gone");
  assert.ok(!existsSync(path.join(root, "apps/web/src/components/admin/AdminBrushes.tsx")), "and its screen with it");
});

test("the editor owns the brush shelf", () => {
  const presets = editor.EDITOR_BRUSH_PRESETS;
  assert.ok(presets.length >= 4);
  assert.ok(presets.some((preset) => preset.settings.shape === "square"), "a square tip is offered");
  assert.ok(presets.some((preset) => preset.settings.shape === "round"), "and a round one");
  assert.ok(presets.every((preset) => preset.settings.size >= 1 && preset.settings.size <= 400));
  const panel = read("apps/web/src/components/EditorAdjustmentsPanel.tsx");
  assert.match(panel, /aria-label=\{`\$\{label\} presets`\}/);
  assert.match(panel, /ariaLabel=\{`\$\{label\} shape`\}/);
  assert.match(panel, /<BrushOptions/);
});
