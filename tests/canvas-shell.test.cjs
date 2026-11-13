const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const source = readFileSync(path.join(__dirname, "../apps/web/src/components/KittlCanvas.tsx"), "utf8");

test("editor creates a fixed Fabric canvas and keeps independent Front/Back documents", () => {
  assert.match(source, /import\("fabric"\)/);
  assert.match(source, /new Canvas\(canvasElement\.current/);
  assert.match(source, /width: PRINT_CANVAS_SPEC\.widthPx/);
  assert.match(source, /height: PRINT_CANVAS_SPEC\.heightPx/);
  assert.match(source, /type Side = "Front" \| "Back"/);
  assert.match(source, /documentRef\.current\[docKey\(next\)\]/);
  assert.match(source, /aria-pressed=\{side === "Front"\}/);
  assert.match(source, /aria-pressed=\{side === "Back"\}/);
});

test("text, shapes and uploaded images are editable artwork objects", () => {
  assert.match(source, /new IText\("Your text"/);
  assert.match(source, /new fabric\.Rect/);
  assert.match(source, /new fabric\.Circle/);
  assert.match(source, /FabricImage\.fromURL\(url\)/);
  assert.match(source, /readAsDataURL\(file\)/);
  assert.match(source, /15 \* 1024 \* 1024/);
  assert.match(source, /canvas\.setActiveObject\(/);
});

test("undo, redo, browser-local save/restore and deletion are available", () => {
  assert.match(source, /const STORAGE_KEY = "mh-fashion-editor-v1"/);
  assert.match(source, /localStorage\.getItem\(STORAGE_KEY\)/);
  assert.match(source, /localStorage\.setItem\(STORAGE_KEY/);
  assert.match(source, /historyRef\.current/);
  assert.match(source, /aria-label="Undo"/);
  assert.match(source, /aria-label="Redo"/);
  assert.match(source, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(source, /getActiveObjects\(\)/);
});

test("layer selection and responsive touch-first asset/layer controls are present", () => {
  assert.match(source, /aria-label="Layers and properties"/);
  assert.match(source, /const selectLayer = \(object: FabricObject\) =>/);
  assert.match(source, /aria-label="Editor tools"/);
  assert.match(source, /role="dialog" aria-label="Add artwork"/);
  assert.match(source, /editor-dock-button/);
  assert.match(source, /md:hidden/);
  assert.match(source, /max-h-\[55dvh\]/);
  assert.match(source, /aria-label="Pan canvas"/);
  assert.match(source, /aria-pressed=\{panMode\}/);
  assert.match(source, /aria-label="Selected artwork color"/);
});

test("the editor route hides storefront footer, bottom navigation and reserved spacing", () => {
  const frame = readFileSync(path.join(__dirname, "../apps/web/src/components/SiteFrame.tsx"), "utf8");
  assert.match(frame, /const isEditor = pathname === "\/create"/);
  assert.match(frame, /isEditor \? "min-h-0" : "pb-16 md:pb-0"/);
  assert.match(frame, /!isEditor && <CopyrightBar \/>/);
  assert.match(frame, /!isEditor && <MobileBottomNav \/>/);
});
