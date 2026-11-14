const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const source = readFileSync(path.join(__dirname, "../apps/web/src/components/KittlCanvas.tsx"), "utf8");
const mockupArtwork = readFileSync(path.join(__dirname, "../apps/web/src/components/MockupArtwork.tsx"), "utf8");
const tierSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-artwork-tiers.ts"), "utf8");
const mockupSection = source.split('{mockups.map((side) => (')[1] ?? "";
const mockupHeader = mockupSection.split('className="relative aspect-square w-full')[0] ?? "";
function loadArtworkTiers() {
  const fileName = path.join(__dirname, "../apps/web/src/lib/editor-artwork-tiers.ts");
  const compiled = ts.transpileModule(tierSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName,
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  return module.exports;
}

test("canvas options expose Show Grid and add the temporary Front Mockup box", () => {
  assert.match(source, /aria-label="Canvas options"/);
  assert.match(source, /<span>Show Grid<\/span>/);
  assert.match(source, /aria-checked=\{showGrid\}/);
  assert.match(source, /setShowGrid\(\(visible\) => !visible\)/);
  assert.match(source, /aria-label="Add Mockup"[\s\S]*?addMockup\("Front Mockup"\)/);
  assert.match(source, /aria-label="Add Back Mockup"[\s\S]*?addMockup\("Back Mockup"\)/);
  assert.match(source, /type MockupSide = "Front Mockup" \| "Back Mockup"/);
  assert.match(source, /side === "Front Mockup" && \([\s\S]*?aria-label="Add Back Mockup"/);
  assert.match(mockupSection, /aria-label="Add Back Mockup"[\s\S]*?absolute -left-5 top-\[calc\(50%\+1\.25rem\)\] z-30[\s\S]*?h-3\.5 w-3\.5/);
  assert.doesNotMatch(mockupHeader, /Add Back Mockup/);
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

test("canvas and each mockup are independently draggable with live connector wires", () => {
  assert.match(source, /aria-label="Canvas and mockup connections"/);
  assert.match(source, /connectors\.map\(\(connection\) => \(/);
  assert.match(source, /<path d=\{connection\.path\}[^>]*stroke="#8f72d4"/);
  assert.match(source, /for \(const side of mockups\)/);
  assert.match(source, /mockupSurfaceRefs\.current\[side\]/);
  assert.match(source, /onPointerDown=\{\(event\) => startNodeDrag\("Print canvas", event\)\}/);
  assert.match(source, /onPointerDown=\{\(event\) => startNodeDrag\(side, event\)\}/);
  assert.match(source, /function moveNodeDrag\([\s\S]*?setNodePositions\(/);
  assert.match(source, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(source, /touch-none select-none/);
  assert.match(source, /ResizeObserver\(updateConnectors\)/);
  assert.match(source, /\[mockups, nodePositions, pan, zoom\]/);
});

test("canvas freehand strokes appear live on equal-size mockup boxes with a shared artwork tier", () => {
  assert.match(source, /type ArtworkStroke = \{ points: Point\[\] \}/);
  assert.match(source, /onPointerDown=\{startArtworkStroke\}/);
  assert.match(source, /function startArtworkStroke[\s\S]*?setArtworkStrokes\(/);
  assert.match(source, /function moveArtworkStroke[\s\S]*?setArtworkStrokes\(/);
  assert.match(source, /<ArtworkOverlay strokes=\{artworkStrokes\} \/>/);
  assert.match(source, /className=\{`relative z-10 w-\[min\(18\.25rem,78vw\)\] shrink-0/);
  assert.doesNotMatch(source, /Back Mockup" \? "w-\[min\(14rem/);
  assert.match(mockupArtwork, /scale\(\$\{BASE_ARTWORK_SCALE \* safeTransform\.scale\}\)/);
  assert.match(source, /largeArtworkTierOwner/);
  assert.match(source, /maxArtworkEdgePx=\{getArtworkMaxEdgePx\(side, largeArtworkTierOwner\)\}/);
  assert.match(source, /onLargeTierRequested=\{handleLargeTierRequested\}/);
  assert.match(source, /onArtworkDisplayedEdgeChange=\{handleArtworkDisplayedEdgeChange\}/);
  assert.match(mockupArtwork, /useEffect\(\(\) => \{[\s\S]*?scaleAroundCenter\(bounds, current, maxArtworkScale\)/);
  assert.match(mockupArtwork, /onLargeTierRequested\(side\)/);
  assert.doesNotMatch(mockupArtwork, /PROVISIONAL_(FRONT|BACK)_MAX_EDGE_PX/);
  assert.match(source, /function isCanvasEdgeGesture\([\s\S]*?return clientX - rect\.left <= edge/);
  assert.match(source, /node === "Print canvas" && event\.target instanceof HTMLCanvasElement && !isCanvasEdgeGesture/);
});

test("artwork on each Mockup can be moved and resized as one object", () => {
  assert.match(source, /<MockupArtwork[\s\S]*?side=\{side\}[\s\S]*?strokes=\{artworkStrokes\}/);
  assert.match(mockupArtwork, /aria-label=\{`Move \$\{side\} artwork`\}/);
  assert.match(mockupArtwork, /mode === "move"/);
  assert.match(mockupArtwork, /startTransform\("resize", event\)/);
  assert.match(mockupArtwork, /aria-label=\{`Resize mockup artwork; maximum edge \$\{maxArtworkEdgePx\} px`\}/);
  assert.match(mockupArtwork, /setPointerCapture\(event\.pointerId\)/);
  assert.match(mockupArtwork, /Math\.max\(0\.25, Math\.min\((?:gestureMaxScale|keyboardMaxScale),/);
  assert.match(mockupArtwork, /maxEdgePx \/ originalEdgePx/);
  assert.match(mockupArtwork, /displayedWidthPx = Math\.round\(frame\.width \* PIXELS_PER_VIEWBOX_UNIT\)/);
  assert.match(mockupArtwork, /data-artwork-max-edge-px=\{maxArtworkEdgePx\}/);
});

test("the large artwork tier transfers between Front and Back and is released at 1500 px", () => {
  const {
    LARGE_ARTWORK_EDGE_PX,
    SMALL_ARTWORK_EDGE_PX,
    claimLargeArtworkTier,
    getArtworkMaxEdgePx,
    reconcileLargeArtworkTier,
    releaseLargeArtworkTier,
  } = loadArtworkTiers();
  let owner = null;

  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), LARGE_ARTWORK_EDGE_PX);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), LARGE_ARTWORK_EDGE_PX);

  owner = claimLargeArtworkTier(owner, "Front Mockup");
  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), 3500);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), 1500);

  owner = claimLargeArtworkTier(owner, "Back Mockup");
  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), 1500);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), 3500);

  owner = reconcileLargeArtworkTier(owner, "Back Mockup", SMALL_ARTWORK_EDGE_PX);
  assert.equal(owner, null);
  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), LARGE_ARTWORK_EDGE_PX);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), LARGE_ARTWORK_EDGE_PX);

  owner = reconcileLargeArtworkTier(null, "Back Mockup", SMALL_ARTWORK_EDGE_PX + 1);
  assert.equal(owner, "Back Mockup");
  owner = claimLargeArtworkTier(owner, "Front Mockup");
  assert.equal(owner, "Front Mockup");
  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), 3500);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), 1500);
  owner = reconcileLargeArtworkTier(owner, "Front Mockup", SMALL_ARTWORK_EDGE_PX);
  assert.equal(owner, null);
  assert.equal(getArtworkMaxEdgePx("Front Mockup", owner), LARGE_ARTWORK_EDGE_PX);
  assert.equal(getArtworkMaxEdgePx("Back Mockup", owner), LARGE_ARTWORK_EDGE_PX);

  owner = claimLargeArtworkTier(owner, "Front Mockup");
  owner = releaseLargeArtworkTier(owner, "Front Mockup");
  assert.equal(owner, null);
});
