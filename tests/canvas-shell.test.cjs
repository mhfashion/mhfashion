const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = readFileSync(path.join(__dirname, "../apps/web/src/components/KittlCanvas.tsx"), "utf8");

test("canvas options expose Show Grid and add the temporary Front Mockup box", () => {
  assert.match(source, /aria-label="Canvas options"/);
  assert.match(source, /<span>Show Grid<\/span>/);
  assert.match(source, /aria-checked=\{showGrid\}/);
  assert.match(source, /setShowGrid\(\(visible\) => !visible\)/);
  assert.match(source, /aria-label="Add Mockup"[\s\S]*?addMockup\("Front Mockup"\)/);
  assert.match(source, /aria-label="Add Back Mockup"[\s\S]*?addMockup\("Back Mockup"\)/);
  assert.match(source, /type MockupSide = "Front Mockup" \| "Back Mockup"/);
  assert.match(source, /side === "Front Mockup" && \([\s\S]*?aria-label="Add Back Mockup"/);
  assert.match(source, /aria-label=\{`Close \$\{side\}`}[\s\S]*?removeMockup\(side\)/);
  assert.match(source, /function removeMockup\(side: MockupSide\)[\s\S]*?filter\(\(item\) => item !== side\)/);
});

test("grid is optional, and the initial canvas has no visible specification badges or mockup placeholder", () => {
  assert.match(source, /\{showGrid && \(/);
  assert.match(source, /backgroundSize: "10% 10%"/);
  assert.doesNotMatch(source, /Transparent PNG · Fixed/);
  assert.doesNotMatch(source, /px · \$\{PRINT_CANVAS_SPEC\.resolutionDpi\} DPI/);
  assert.doesNotMatch(source, /<span>Front<\/span>[\s\S]{0,300}<span>Add Mockup<\/span>/);
  assert.doesNotMatch(source, /R2 image placeholder/);
  assert.doesNotMatch(source, /mockupVisible/);
  assert.match(source, /aria-label=\{side\}/);
  assert.match(source, /setShowGrid\(\(visible\) => !visible\)[\s\S]*?setMenuOpen\(false\)/);
  assert.match(source, /absolute -right-5 top-1\/2[\s\S]*?h-3\.5 w-3\.5/);
  assert.match(source, /backgroundSize: "10% 10%"/g);
  assert.match(source, /flex-col items-center justify-start overflow-auto[\s\S]*md:overflow-hidden/);
  assert.match(source, /md:flex-row md:gap-12/);
});
