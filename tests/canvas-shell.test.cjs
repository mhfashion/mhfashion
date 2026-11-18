const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const source = readFileSync(path.join(__dirname, "../apps/web/src/components/KittlCanvas.tsx"), "utf8");
const mockupArtwork = readFileSync(path.join(__dirname, "../apps/web/src/components/MockupArtwork.tsx"), "utf8");
const toolsBar = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorToolsBar.tsx"), "utf8");
const tierSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-artwork-tiers.ts"), "utf8");
const mockupSection = source.split('{mockups.map((side) => (')[1] ?? "";
const mockupHeader = mockupSection.split('className="relative aspect-square w-full')[0] ?? "";
const createRoute = readFileSync(path.join(__dirname, "../apps/web/src/app/create/page.tsx"), "utf8");
const mobileNav = readFileSync(path.join(__dirname, "../apps/web/src/components/MobileBottomNav.tsx"), "utf8");
const header = readFileSync(path.join(__dirname, "../apps/web/src/components/Header.tsx"), "utf8");
const headerBar2 = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorHeaderBar2.tsx"), "utf8");
const productGsmSelect = headerBar2.split("function PendingSelect")[0] ?? "";
const layersPanel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayersPanel.tsx"), "utf8");
const adjustmentsPanel = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorAdjustmentsPanel.tsx"), "utf8");
const editSidebar = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorEditSidebar.tsx"), "utf8");
const artworkLayers = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorArtworkLayers.tsx"), "utf8");
const transformMath = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-transform.ts"), "utf8");
const layerPreview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
const layerModelSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-layers.ts"), "utf8");
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

test("compact canvas options menu exposes Show Grid and the two product mockup sides", () => {
  assert.match(source, /aria-label="Canvas options"/);
  assert.match(source, /<span>Show Grid<\/span>/);
  assert.match(source, /aria-checked=\{showGrid\}/);
  assert.match(source, /setShowGrid\(\(visible\) => !visible\)/);
  assert.match(source, /aria-label="Add Front Mockup"[\s\S]*?addMockup\("Front Mockup"\)/);
  assert.match(source, /<span>Front Mockup<\/span>[\s\S]*?<span>Back Mockup<\/span>/);
  assert.doesNotMatch(source, /aria-label="Add Mockup"/);
  assert.match(source, /aria-label="Add Back Mockup"[\s\S]*?addMockup\("Back Mockup"\)/);
  assert.match(source, /type MockupSide = "Front Mockup" \| "Back Mockup"/);
  assert.match(source, /\{product === "Phone" \? null : \([\s\S]*?aria-label="Add Back Mockup"/);
  assert.match(source, /if \(product === "Phone" && side === "Back Mockup"\) return/);
  assert.match(source, /product === "Phone" \? mockups\.filter\(\(side\) => side === "Front Mockup"\)/);
  assert.match(source, /hidden=\{product === "Phone" && side === "Back Mockup"\}/);
  assert.match(source, /activeLargeArtworkTierOwner =\s*product === "Phone" && largeArtworkTierOwner === "Back Mockup" \? null : largeArtworkTierOwner/);
  assert.doesNotMatch(mockupSection, /aria-label="Add Back Mockup"/);
  assert.doesNotMatch(source, /-left-\[35px\]/);
  assert.doesNotMatch(mockupHeader, /Add Back Mockup/);
  assert.match(source, /aria-label=\{`Close \$\{side\}`}[^]*?removeMockup\(side\)/);
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
  assert.match(source, /min-w-28 rounded border border-border bg-bg-surface p-0\.5 shadow-lg/);
  assert.doesNotMatch(source, /min-w-44|p-1\.5 shadow-lg/);
  assert.match(source, /gap-1 rounded px-1\.5 py-0\.5 text-left text-\[10px\]/);
  assert.match(source, /<Grid2X2 size=\{11\}/);
  assert.match(source, /rounded-full bg-accent shadow-sm ring-1 ring-accent\/40 hover:bg-accent\/80/);
  assert.match(source, /h-1 w-1 rounded-full bg-accent-foreground/);
  assert.doesNotMatch(source, /bg-\[#a58be8\]|hover:bg-\[#8f72d4\]/);
  assert.match(source, /backgroundSize: "10% 10%"/g);
  assert.match(source, /flex-col items-center justify-start overflow-auto[\s\S]*md:overflow-hidden/);
  assert.match(source, /md:flex-row md:gap-12/);
});

test("canvas and each mockup are independently draggable with live connector wires", () => {
  assert.match(source, /aria-label="Canvas and mockup connections"/);
  assert.match(source, /connectors\.map\(\(connection\) => \(/);
  assert.match(source, /className="pointer-events-none absolute inset-0 z-0 overflow-visible text-accent"/);
  assert.match(source, /<path d=\{connection\.path\}[^>]*stroke="currentColor"/);
  assert.match(source, /<circle cx=\{connection\.start\.x\}[^>]*fill="currentColor"/);
  assert.doesNotMatch(source, /#8f72d4/);
  assert.match(source, /for \(const side of visibleMockups\)/);
  assert.match(source, /mockupSurfaceRefs\.current\[side\]/);
  assert.match(source, /onPointerDown=\{\(event\) => startNodeDrag\("Print canvas", event\)\}/);
  assert.match(source, /onPointerDown=\{\(event\) => startNodeDrag\(side, event\)\}/);
  assert.match(source, /function moveNodeDrag\([\s\S]*?setNodePositions\(/);
  assert.match(source, /event\.currentTarget\.setPointerCapture\(event\.pointerId\)/);
  assert.match(source, /touch-none select-none/);
  assert.match(source, /ResizeObserver\(updateConnectors\)/);
  assert.match(source, /\[visibleMockups, nodePositions, pan, zoom\]/);
});

test("canvas strokes are stored on selected layers and shared with equal-size mockup boxes", () => {
  assert.match(source, /onPointerDown=\{startArtworkStroke\}/);
  assert.match(source, /function startArtworkStroke[\s\S]*?selectedLayer = layers\.find/);
  assert.match(source, /function startArtworkStroke[\s\S]*?appendLayerStroke\(/);
  assert.match(source, /function moveArtworkStroke[\s\S]*?updateLayerLastStroke\(/);
  assert.match(source, /<ArtworkOverlay[\s\S]*?layers=\{layers\}/);
  assert.match(source, /<MockupArtwork[\s\S]*?layers=\{layers\}/);
  assert.match(source, /className=\{`relative z-10 w-\[min\(18\.25rem,78vw\)\] shrink-0/);
  assert.doesNotMatch(source, /Back Mockup" \? "w-\[min\(14rem/);
  assert.match(mockupArtwork, /scale\(\$\{BASE_ARTWORK_SCALE \* safeTransform\.scale\}\)/);
  assert.match(source, /largeArtworkTierOwner/);
  assert.match(source, /maxArtworkEdgePx=\{getArtworkMaxEdgePx\(side, activeLargeArtworkTierOwner\)\}/);
  assert.match(source, /onLargeTierRequested=\{handleLargeTierRequested\}/);
  assert.match(source, /onArtworkDisplayedEdgeChange=\{handleArtworkDisplayedEdgeChange\}/);
  assert.match(mockupArtwork, /useEffect\(\(\) => \{[\s\S]*?scaleAroundCenter\(bounds, current, maxArtworkScale\)/);
  assert.match(mockupArtwork, /onLargeTierRequested\(side\)/);
  assert.doesNotMatch(mockupArtwork, /PROVISIONAL_(FRONT|BACK)_MAX_EDGE_PX/);
  assert.match(source, /function isCanvasEdgeGesture\([\s\S]*?return clientX - rect\.left <= edge/);
  assert.match(source, /node === "Print canvas" && event\.target instanceof HTMLCanvasElement && !isCanvasEdgeGesture/);
});

test("compact bottom-center Tools bar exposes requested tools and connected actions", () => {
  assert.match(source, /<EditorToolsBar[\s\S]*?activeTool=\{activeTool\}[\s\S]*?canUndo=\{undoStack\.length > 0\}/);
  assert.match(source, /onToggleCollapsed=\{\(\) => setToolsCollapsed/);
  assert.match(source, /hideOnMobile=\{layersOpen \|\| editSidebarOpen\}/);
  assert.match(toolsBar, /data-testid="editor-tools-bar"/);
  assert.match(toolsBar, /flex-wrap/);
  assert.doesNotMatch(toolsBar, /overflow-x-auto/);
  assert.match(toolsBar, /absolute inset-x-0 bottom-2 z-50 flex justify-center/);
  assert.match(toolsBar, /hideOnMobile \? "max-md:hidden"/);
  assert.match(toolsBar, /rounded-2xl/);
  assert.match(toolsBar, /h-7 w-7/);
  for (const label of ["Move", "Hand tool", "Pencil tool", "Pen tool", "Text tool", "Brush", "Eraser tool", "Shape tools", "Gradient tool", "Undo", "Redo"]) {
    assert.ok(toolsBar.includes(`label: "${label}"`) || toolsBar.includes(`aria-label="${label}"`), `missing ${label}`);
  }
  assert.match(toolsBar, /id: "text"/);
  assert.match(toolsBar, /Pencil tool/);
  assert.match(toolsBar, /id: "pencil"/);
  assert.match(toolsBar, /Pencil/);
  assert.match(toolsBar, /id: "text"/);
  assert.match(toolsBar, /PenTool/);
  assert.match(toolsBar, /shadow-\[0_2px_8px_rgba\(212,255,63,.35\)\]/);
  assert.match(source, /function finishPenPath\(close = false\)/);
  assert.match(source, /function addPenAnchor/);
  assert.match(source, /onDoubleClick=\{\(\) => activeTool === "pen" && finishPenPath\(false\)\}/);
  assert.match(source, /aria-label="Pen path preview"/);
  assert.match(source, /appendEditorShapePaths\(current, selectedLayer\.id/);
  assert.match(source, /Pen path added to \$\{selectedLayer\.name\}/);
  assert.match(source, /selectedPenPaths\.map/);
  assert.match(source, /activeEditingPenPathIndex/);
  assert.match(source, /const activeToolCursor = activeTool === "pen" \? "cursor-crosshair"/);
  assert.match(source, /activeToolCursor\}`/);
  assert.match(source, /function editorToolCursor\(tool: EditorTool\)/);
  assert.match(source, /pen: '<path/);
  assert.match(source, /pencil: '<path/);
  assert.match(source, /shape: '<rect/);
  assert.match(source, /eraser: '<circle cx="12" cy="12" r="7"\/>/);
  assert.match(source, /activeToolCursorStyle/);
  const finishPenPathSource = source.slice(source.indexOf("function finishPenPath"), source.indexOf("function addPenAnchor"));
  assert.doesNotMatch(finishPenPathSource, /setActiveTool\("move"\)/, "Finishing a path keeps the Pen tool active");
  assert.match(source, /const hotspot = tool === "pen" \? "12 14" : "2 2"/);
  assert.match(source, /const fallbackCursor = tool === "pen" \? "crosshair" : "auto"/);
  assert.match(source, /style=\{\{ touchAction: "none", cursor: activeTool === "pen" \? activeToolCursorStyle : undefined \}\}/);
  assert.match(source, /className=\{activeTool === "pen" \? "" : "cursor-crosshair"\}/);
  assert.match(source, /className=\{activeTool === "pen" \? "" : "cursor-move"\}/);
  assert.match(source, /draggedEditorPenAnchor/);
  assert.match(source, /snapEditorPenPoint/);
  assert.match(source, /isNearPenStart/);
  assert.match(source, /data-pen-close-target/);
  assert.match(source, /aria-label="Pen path point controls"/);
  assert.match(source, /r="38" fill="transparent" stroke="transparent" pointerEvents="all"/);
  assert.match(source, /event\.key === "Delete" \|\| event\.key === "Backspace"/);
  assert.match(source, /touchAction: "none"/);
  assert.match(source, /addPenNodeOnPath/);
  const startPenEditDragSource = source.slice(source.indexOf("function startPenEditDrag"), source.indexOf("function movePenEditNode"));
  assert.match(startPenEditDragSource, /window\.addEventListener\("pointermove", moveHandler, true\)/);
  assert.match(startPenEditDragSource, /window\.addEventListener\("pointerup", endHandler, true\)/);
  assert.match(startPenEditDragSource, /window\.addEventListener\("pointercancel", endHandler, true\)/);
  assert.match(source, /function clearPenEditWindowHandlers\(\)/);
  assert.match(source, /aria-label="Pen path editing controls" className="pointer-events-none/);
  assert.match(source, /pointer-events-auto rounded-lg bg-accent/);
  assert.match(source, /Alt-click point to remove/);
  assert.match(source, /aria-label="Pen tool actions"/);
  assert.match(source, /strokeWidth: 5, penPath/);
  assert.match(source, /strokeWidth="1\.5" vectorEffect="non-scaling-stroke"/);
  assert.match(source, /data-pen-handle-endpoint="in"/);
  assert.match(source, /data-pen-handle-endpoint="out"/);
  assert.match(source, /activeTool === "pen" && penAnchors.length > 0 && \(/);
  assert.doesNotMatch(source, /Click: corner · drag: curve · Shift: snap · click start: close/);
  assert.match(source, /activeTool === "text"/);
  assert.match(source, /addCanvasTextLayer\(undefined, \{ x: point\.x \* 1000, y: point\.y \* 1200 \}\)/);
  assert.match(editSidebar, /Add Text/);
  assert.match(toolsBar, /role="group" aria-label="Color switch tool"/);
  assert.match(toolsBar, /aria-label="Foreground Color"/);
  assert.match(toolsBar, /aria-label="Background Color"/);
  assert.equal((toolsBar.match(/type="color"/g) ?? []).length, 2);
  assert.match(source, /const \[foregroundColor, setForegroundColor\] = useState\("#202124"\)/);
  assert.match(source, /const \[backgroundColor, setBackgroundColor\] = useState\("#ffffff"\)/);
  assert.match(source, /color: foregroundColor/);
  assert.match(source, /foregroundColor=\{foregroundColor\}/);
  assert.match(source, /backgroundColor=\{backgroundColor\}/);
  assert.match(layerModelSource, /color\?: string/);
  assert.match(artworkLayers, /color=\{stroke\.color \?\? "#202124"\}/);
  assert.match(toolsBar, /aria-label=\{collapsed \? "Expand editor tools" : "Collapse editor tools"\}/);
  assert.doesNotMatch(toolsBar, /title=\{collapsed \? "Expand tools" : "Collapse tools"\}/);
  assert.match(toolsBar, /aria-label="Redo"/);
  assert.match(toolsBar, /canRedo/);
  assert.match(source, /redoCanvasAction/);
  assert.match(toolsBar, /Expand editor tools/);
  assert.match(toolsBar, /Collapse editor tools/);
  assert.match(source, /activeTool === "hand" && event\.button === 0/);
  assert.match(source, /activeTool !== "move"/);
  assert.match(source, /function eraseArtworkAt\(/);
  assert.match(source, /function undoCanvasAction\(/);
  assert.match(source, /function rememberLayerSnapshot\(/);
  assert.match(layerModelSource, /tool\?: "pen" \| "brush"/);
  assert.match(layerModelSource, /return \{ \.\.\.stroke, points:/);
  assert.match(artworkLayers, /stroke\.tool === "brush" \? 52 : width/);
  assert.match(mockupArtwork, /strokes\.some\(\(stroke\) => stroke\.tool === "brush"\) \? 32 : 18/);
});

test("Shape tool exposes selectable presets, previews gestures, and appends paths to the active layer", () => {
  assert.match(toolsBar, /data-testid="editor-shape-picker"/);
  assert.match(toolsBar, /role="group" aria-label="Shape options"/);
  assert.match(toolsBar, /Choose a shape, then drag on the canvas/);
  assert.match(toolsBar, /min-h-11/);
  for (const label of ["Rectangle", "Rounded rectangle", "Ellipse", "Triangle", "Diamond", "Line", "Arrow", "Star", "Hexagon"]) {
    assert.ok(layerModelSource.includes(label), `missing shape choice ${label}`);
  }
  assert.match(source, /function startShapeDrawing/);
  assert.match(source, /activeShapeDragRef/);
  assert.match(source, /type ActiveShapeDrag = \{ pointerId: number; layerId: string/);
  assert.match(source, /data-editor-shape-preview/);
  assert.match(source, /createEditorShapePaths\(shapeDrag\.preset/);
  assert.match(source, /appendEditorShapePaths\(current, shapeDrag\.layerId, paths\)/);
  assert.match(source, /\$\{label\} added to \$\{selectedLayer\.name\}/);
  assert.doesNotMatch(source, /Shape Tool is ready for the upcoming vector-shape pipeline/);
});

test("artwork on each Mockup can be moved and resized as one object", () => {
  assert.match(source, /<MockupArtwork[\s\S]*?side=\{side\}[\s\S]*?layers=\{layers\}[\s\S]*?maxArtworkEdgePx=/);
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

test("phone editing uses finger-sized targets while blank mockup swipes can scroll", () => {
  assert.match(source, /shrink-0 touch-pan-y select-none md:touch-none/);
  assert.match(source, /event\.pointerType === "touch" && node !== "Print canvas"/);
  assert.match(source, /data-node-drag-handle/);
  assert.match(mockupArtwork, /data-artwork-resize-touch-target/);
  assert.match(mockupArtwork, /setTouchHitRadius\(22 \* Math\.max\(1000 \/ rect\.width, 1200 \/ rect\.height\)\)/);
  assert.match(mockupArtwork, /data-artwork-move-touch-target/);
  assert.match(mockupArtwork, /data-artwork-touch-dimensions/);
  assert.match(mockupArtwork, /!event\.isPrimary \|\| dragRef\.current/);
  assert.match(mockupArtwork, /window\.addEventListener\("blur", cancelDrag\)/);
});

test("phone view pan is captured before editing and navigation reserves its measured height", () => {
  assert.match(source, /aria-label="Touch view controls"[\s\S]*?\[@media\(pointer:coarse\)\]:flex/);
  assert.match(source, /aria-label="Pan view" aria-pressed=\{touchPanEnabled\}/);
  assert.match(source, /aria-label="Zoom out"/);
  assert.match(source, /aria-label="Zoom in"/);
  assert.match(source, /aria-label="Reset view"/);
  assert.match(source, /onPointerDownCapture=\{startPan\}/);
  assert.match(source, /onPointerMoveCapture=\{movePan\}/);
  assert.match(source, /onLostPointerCapture=\{endPan\}/);
  assert.match(source, /touchPanEnabled \|\| activeTool === "hand"/);
  assert.match(source, /data-pan-mode=\{\(touchPanEnabled \|\| activeTool === "hand"\) \? "hand" : "scroll"\}/);
  assert.match(source, /spaceHeld \|\| touchPanEnabled \|\| activeTool === "hand"\) \? "cursor-grab"/);
  assert.match(createRoute, /100dvh-var\(--mobile-navigation-height,4rem\)/);
  assert.match(createRoute, /md:h-dvh/);
  assert.match(mobileNav, /setProperty\("--mobile-navigation-height"/);
  assert.match(mobileNav, /new ResizeObserver\(updateHeight\)/);
});

test("Compact Photoshop-style Layers panel docks right and controls its functional stack and masks", () => {
  assert.match(source, /const \[layersOpen, setLayersOpen\] = useState\(false\)/);
  assert.match(source, /<EditorLayersPanel[\s\S]*?open=\{layersOpen\}[\s\S]*?onToggle=\{toggleLayersPanel\}[\s\S]*?onAddLayer=\{addLayer\}[\s\S]*?onAddMask=\{createLayerMask\}[\s\S]*?onDeleteLayer=\{deleteLayer\}/);
  assert.match(source, /<div className="relative min-h-0 flex-1">[\s\S]*?ref=\{viewportRef\}/);
  assert.match(source, /createEditorArtworkLayer\("layer-1", "Layer 1"\)/);
  assert.match(source, /function addLayer\(\)[\s\S]*?setSelectedLayerId\(id\)/);
  assert.match(source, /function createLayerMask\(id: string\)[\s\S]*?setSelectedTarget\("mask"\)/);
  assert.match(source, /function deleteLayer\(id: string\)[\s\S]*?deleteEditorLayer\(layers, id\)/);
  assert.match(layersPanel, /aria-label="Layers panel"/);
  assert.match(layersPanel, /data-dock-side="right"/);
  assert.match(layersPanel, /aria-label="Layers panel title"/);
  assert.match(layersPanel, /role="heading" aria-level=\{2\}/);
  assert.doesNotMatch(layersPanel, /Channels|Paths|Kind|Layers panel menu/);
  assert.match(layersPanel, /h-7 w-7[^\"]*rounded-full[^\"]*bg-accent[^\"]*text-accent-foreground/);
  assert.match(layersPanel, /Opacity:/);
  assert.match(layersPanel, /Lock:/);
  assert.match(layersPanel, /Fill:/);
  assert.match(layersPanel, /id="editor-layer-fill"/);
  assert.match(layersPanel, /Fill for \$\{selectedLayer\.name\}/);
  assert.match(layersPanel, /fillOpacity: Number\(event\.target\.value\)/);
  assert.match(layersPanel, /text-\[11px\]/);
  assert.match(layersPanel, /dark:bg-\[#303030\]/);
  assert.match(layersPanel, /aria-label=\{open \? "Collapse Layers panel" : "Expand Layers panel"\}/);
  assert.match(layersPanel, /aria-expanded=\{open\}/);
  assert.match(layersPanel, /style=\{\{ right: open \? PANEL_WIDTH : 0 \}\}/);
  for (const label of ["Add layer", "Rename", "Duplicate", "Delete", "Hide", "Show", "mask", "Move"]) {
    assert.match(layersPanel, new RegExp(label, "i"));
  }
  assert.match(layersPanel, /Group selected layers/);
  assert.match(layersPanel, /Ungroup selected layers/);
  assert.match(layersPanel, /aria-label="Link layers"/);
  assert.match(layersPanel, /onLinkSelected/);
  assert.match(layersPanel, /aria-label="Open Adjustments panel"/);
  assert.match(layersPanel, /onOpenAdjustments/);
  assert.match(source, /function openAdjustments\(\)[\s\S]*?setLayersOpen\(false\)[\s\S]*?setAdjustmentsOpen\(true\)/);
  assert.match(source, /function closeAdjustments\(\)[\s\S]*?setAdjustmentsOpen\(false\)[\s\S]*?setLayersOpen\(true\)/);
  assert.match(layersPanel, /aria-label="Layer list" role="list"/);
  assert.match(layersPanel, /draggable/);
  assert.match(layersPanel, /onMoveLayerToIndex/);
  assert.match(layerModelSource, /export function moveEditorLayerToIndex/);
  assert.match(layersPanel, /Collapse group \$\{layer\.groupId\}/);
  assert.match(layersPanel, /Expand group \$\{layer\.groupId\}/);
  assert.match(layersPanel, /Blend mode for \$\{selectedLayer\.name\}/);
  assert.match(layersPanel, /Opacity for \$\{selectedLayer\.name\}/);
  assert.doesNotMatch(layersPanel, /Mask: black hides|Hide \(black\)|Reveal \(white\)/);
  assert.match(source, /foregroundColor\.toLowerCase\(\) === "#ffffff"/);
  assert.match(source, /resizeHandles = \[/);
  assert.match(source, /top-left/);
  assert.match(source, /bottom-right/);
  assert.match(source, /function layerCanvasBounds\(layer: EditorArtworkLayer\)/);
  assert.match(source, /const selectionBounds = useMemo/);
  assert.match(source, /selectionBounds=\{selectionBounds\}/);
  assert.match(source, /x=\{selectionBounds\.x\}/);
  assert.match(source, /aria-label="Rotate selected layer"/);
  assert.match(source, /transform=\{`rotate\(\$\{transformRotation\}/);
  assert.match(source, /stroke="#4c9dff" strokeWidth="1\.25" vectorEffect="non-scaling-stroke" data-transform-outline/);
  assert.match(source, /data-rotate-handle="true"/);
  assert.match(source, /data-rotate-glyph="true"/);
  assert.doesNotMatch(source, /<line x1=\{\(selectionBounds\.x \+ selectionBounds\.width \/ 2\)\}/);
  assert.match(source, /data-rotation-angle="true"/);
  assert.match(source, /\{displayRotation\}°/);
  assert.match(source, /r="22" fill="transparent" pointerEvents="auto"/);
  assert.match(source, /function startCanvasLayerRotate/);
  assert.match(source, /layerRotations/);
  assert.match(source, /freeScale:\s*event\.shiftKey/);
  assert.match(source, /centered:\s*event\.altKey/);
  assert.match(source, /snapEditorRotationDelta\(delta, event\.shiftKey, 15\)/);
  assert.match(source, /const canvasLayerOrigins = useMemo/);
  assert.match(artworkLayers, /scale\(\$\{scale\.x\} \$\{scale\.y\}\)/);
  assert.match(transformMath, /export function getFreeTransformResizeFactors/);
  assert.match(artworkLayers, /<mask[\s\S]*?maskUnits="userSpaceOnUse"/);
  assert.match(artworkLayers, /stroke\.mode === "hide" \? "black" : "white"/);
  assert.match(artworkLayers, /mask=\{layer\.mask !== null \? `url\(#\$\{maskId\}\)` : undefined\}/);
  assert.match(artworkLayers, /mixBlendMode: layer\.blendMode/);
  assert.match(layersPanel, /aria-label="Layer actions"/);
  assert.match(layerModelSource, /export function addLayerMask/);
  assert.match(layerModelSource, /export function groupEditorLayers/);
  assert.match(layerModelSource, /export function ungroupEditorLayers/);
  assert.match(layerModelSource, /export function linkEditorLayers/);
  assert.match(layerModelSource, /export function unlinkEditorLayers/);
  assert.match(layerModelSource, /export function deleteEditorLayer/);
});

test("Adjustment panel groups Kittl-style text controls into compact expandable sections", () => {
  assert.match(adjustmentsPanel, /function Section\(/);
  for (const section of ["Text", "Font", "Style & Alignment", "Effects", "Transform", "Photo", "Appearance"]) {
    assert.ok(adjustmentsPanel.includes(`title=\"${section}\"`), `missing ${section} adjustment section`);
  }
  assert.match(adjustmentsPanel, /aria-label="Search fonts"/);
  assert.match(adjustmentsPanel, /aria-label=\{`Apply text \$\{kind\}`\}/);
  assert.match(adjustmentsPanel, /effect\.kind === "shadow" \? "Text shadow softness"/);
  assert.match(adjustmentsPanel, /aria-label="Text effect stack"/);
  for (const effect of ["shadow", "outline", "glow", "offset", "echo", "extrude", "stripe"]) {
    assert.match(adjustmentsPanel, new RegExp(`kind: "${effect}"`));
  }
  assert.match(adjustmentsPanel, /Move \$\{effect\.kind\} effect up/);
  assert.match(adjustmentsPanel, /Remove \$\{effect\.kind\} effect/);
  assert.match(layerPreview, /data-editor-text-effect/);
  assert.match(layerModelSource, /effects\?: EditorTextEffect\[\]/);
  assert.match(adjustmentsPanel, /aria-label={`Text transform \$\{shape\}`}/);
  assert.match(adjustmentsPanel, /className=\"mb-2 flex items-center justify-center rounded-lg/);
  assert.match(layerModelSource, /textEffect\?: "none" \| "shadow" \| "outline"/);
  assert.match(layerModelSource, /export function applyEditorShapeBuilderOperation/);
  assert.match(layerPreview, /data-editor-text-transform/);
  assert.match(adjustmentsPanel, /aria-label="Photo brightness"/);
  assert.match(adjustmentsPanel, /aria-label="Photo contrast"/);
  assert.match(adjustmentsPanel, /aria-label="Photo saturation"/);
  assert.match(adjustmentsPanel, /aria-label="Photo temperature"/);
  assert.match(adjustmentsPanel, /aria-label="Photo tint"/);
  assert.match(adjustmentsPanel, /aria-label="Photo exposure"/);
  assert.match(adjustmentsPanel, /aria-label="Photo highlights"/);
  assert.match(adjustmentsPanel, /aria-label="Photo shadows"/);
  assert.match(adjustmentsPanel, /aria-label="Photo vibrance"/);
  assert.match(adjustmentsPanel, /aria-label="Photo red channel"/);
  assert.match(adjustmentsPanel, /aria-label="Photo green channel"/);
  assert.match(adjustmentsPanel, /aria-label="Photo blue channel"/);
  assert.match(adjustmentsPanel, /aria-label="Selective color cyan"/);
  assert.match(adjustmentsPanel, /aria-label="Selective color magenta"/);
  assert.match(adjustmentsPanel, /aria-label="Selective color yellow"/);
  assert.match(adjustmentsPanel, /aria-label="Selective color black"/);
  assert.match(adjustmentsPanel, /aria-label="HSL hue"/);
  assert.match(adjustmentsPanel, /aria-label="HSL saturation"/);
  assert.match(adjustmentsPanel, /aria-label="HSL lightness"/);
  assert.match(adjustmentsPanel, /aria-label="AI Enhance photo"/);
  assert.match(adjustmentsPanel, /aria-label="Smart filter"/);
  assert.match(adjustmentsPanel, /aria-label="Smart filter intensity"/);
  assert.match(adjustmentsPanel, /Add photo layer mask/);
  assert.match(adjustmentsPanel, /Edit photo layer mask/);
  assert.match(adjustmentsPanel, /aria-label="Remove photo layer mask"/);
  assert.match(adjustmentsPanel, /Blend mode for \$\{selectedLayer\.name\}/);
  assert.match(adjustmentsPanel, /aria-label="Photo vignette"/);
  assert.match(adjustmentsPanel, /aria-label="Photo levels black point"/);
  assert.match(adjustmentsPanel, /aria-label="Photo levels white point"/);
  assert.match(adjustmentsPanel, /aria-label="Photo levels gamma"/);
  assert.match(adjustmentsPanel, /aria-label="Photo curves preview"/);
  assert.match(adjustmentsPanel, /Photo curve point/);
  assert.match(adjustmentsPanel, /aria-label="Remove background"/);
  assert.match(adjustmentsPanel, /aria-label="Upscale photo"/);
  assert.match(layerPreview, /data-editor-image-background-removed/);
  assert.match(layerPreview, /data-editor-image-vignette/);
  assert.match(layerPreview, /feFuncR/);
  assert.match(layerPreview, /levelsTableValues/);
  assert.match(layerPreview, /curveTableValues/);
});

test("Edit sidebar starts hidden, reveals a rail, and exposes the owner-requested categories", () => {
  assert.match(source, /const \[editSidebarOpen, setEditSidebarOpen\] = useState\(false\)/);
  assert.match(source, /function toggleLayersPanel\(\)[\s\S]*?matchMedia\("\(max-width: 767px\)"\)[\s\S]*?setEditSidebarOpen\(false\)/);
  assert.match(source, /function toggleEditSidebar\(\)[\s\S]*?matchMedia\("\(max-width: 767px\)"\)[\s\S]*?setLayersOpen\(false\)/);
  assert.match(source, /const closeSidebarsBeforeTheyOverlap = \(event: MediaQueryListEvent\)[\s\S]*?setLayersOpen\(false\)[\s\S]*?setEditSidebarOpen\(false\)/);
  assert.match(source, /addEventListener\("change", closeSidebarsBeforeTheyOverlap\)/);
  assert.match(source, /<EditorEditSidebar[\s\S]*?open=\{editSidebarOpen\}[\s\S]*?onAddDesign=\{addCanvasDesign\}[\s\S]*?onAddElement=\{addCanvasElementLayer\}[\s\S]*?onAddText=\{addCanvasTextLayer\}[\s\S]*?onUploadImage=\{addCanvasUpload\}/);
  assert.match(editSidebar, /aria-label=\{activeSection \+ " editor sidebar"\}/);
  assert.match(editSidebar, /data-dock-side="left"/);
  assert.match(editSidebar, /\{railVisible && \(/);
  assert.match(editSidebar, /\{hasPanel && \(/);
  assert.match(editSidebar, /left-12/);
  assert.doesNotMatch(editSidebar, /aria-label="Edit sidebar tools"/);
  assert.doesNotMatch(editSidebar, /overflow-x-auto border-b border-border/);
  assert.match(editSidebar, /const \[railVisible, setRailVisible\] = useState\(false\)/);
  assert.match(editSidebar, /const hasPanel = railVisible && open/);
  assert.match(editSidebar, /aria-label=\{hasPanel \? "Collapse Edit sidebar" : railVisible \? "Hide Edit sidebar" : "Expand Edit sidebar"\}/);
  assert.match(editSidebar, /style=\{\{ left: hasPanel \? "calc\(3rem \+ " \+ PANEL_WIDTH \+ "\)" : railVisible \? "3rem" : 0 \}\}/);
  assert.match(editSidebar, /h-7 w-7[^"]*rounded-full[^"]*bg-accent[^"]*text-accent-foreground/);
  assert.match(editSidebar, /aria-label="Edit sidebar rail"/);
  assert.match(editSidebar, /"Open " \+ label \+ " in Edit sidebar"/);
  assert.match(editSidebar, /setActiveSection\(section\)/);
  for (const label of ["Designs", "Elements", "Text", "Upload", "Image Create"]) {
    assert.match(editSidebar, new RegExp(`label: "${label}"`));
  }
  assert.match(editSidebar, /Search designs/);
  assert.match(editSidebar, /MH Fashion designs/);
  assert.match(editSidebar, /Search elements/);
  assert.match(editSidebar, /Add Text/);
  assert.match(editSidebar, /Choose a photo/);
  assert.match(editSidebar, /Create Image/);
  assert.doesNotMatch(editSidebar, /R2 SVG source listing is still pending/);
  assert.match(editSidebar, /formatByteSize\(uploadLimitBytes\)/);
  // Text: Add Text is compact and lists design text layers as per-layer thumbnails.
  assert.match(editSidebar, /self-start rounded-lg[^"]*text-\[11px\] font-bold text-accent/);
  assert.match(editSidebar, /Text layers in Designs/);
  assert.match(editSidebar, /aria-label="Design text layers"/);
  assert.doesNotMatch(editSidebar, /Text to add/);
  // Elements: every design layer is its own thumbnail card, like Designs.
  assert.match(editSidebar, /aria-label="Design elements" className="grid grid-cols-2 gap-2"/);
  assert.match(editSidebar, /function ElementCard/);
  assert.match(editSidebar, /<ArtworkFrame>/);
  // Image Create has no search field.
  assert.doesNotMatch(editSidebar, /Search image ideas/);
  assert.doesNotMatch(editSidebar, /Search uploads/);
  // Sidebar categories and canvas actions share the editor layer model.
  assert.match(editSidebar, /MH_DESIGN_LIBRARY/);
  assert.match(editSidebar, /MH_DESIGN_TEXT_LAYERS/);
  assert.match(editSidebar, /onAddText\(\)/);
  assert.match(editSidebar, /onAddText\(layer\.text\)/);
  assert.match(editSidebar, /onUploadImage\(file\)/);
  // Add Text types straight onto the canvas and lands in the Layers stack.
  assert.match(source, /const \[editingTextLayerId, setEditingTextLayerId\] = useState<string \| null>\(null\)/);
  assert.match(source, /function addCanvasTextLayer\(source\?: DesignLibraryText \| null, position\?: Point\)/);
  assert.match(source, /createEditorTextLayer\(id, `Text \$\{label\}`/);
  assert.match(source, /setEditingTextLayerId\(id\)/);
  assert.match(source, /data-editor-text-editor="true"/);
  assert.match(source, /aria-label="Type text on the canvas"/);
  assert.match(source, /onEditingTextChange\?\.\(event\.target\.value\)/);
  assert.match(source, /setEditorLayerText\(current, editingTextLayerId, value\)/);
  assert.match(source, /editingTextLayer=\{editingTextLayer\}/);
  // Every sidebar addition must be reachable in the Layers stack.
  assert.match(source, /function revealLayersStack\(\)[\s\S]*?min-width: 768px[\s\S]*?setLayersOpen\(true\)/);
  assert.equal((source.match(/revealLayersStack\(\);/g) ?? []).length, 4, "Only explicit text, element, design and upload insertion reveals Layers");
  assert.match(layersPanel, /EditorLayerPreview paths=\{layer\.shape\?\.paths\} text=\{layer\.text\} image=\{layer\.image\}/);
  assert.match(toolsBar, /aria-label="Swap foreground and background colors"/);
  assert.match(source, /canvasLayerTransforms/);
  assert.match(source, /Move canvas artwork/);
  assert.match(source, /startCanvasArtworkMove/);
});

test("Sidebar catalogs come from the MH Fashion design library and uploads honour the size limit", () => {
  const designLibrary = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-design-library.ts"), "utf8");
  const uploadSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-upload.ts"), "utf8");
  const layerPreview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
  // One thumbnail per individual layer, shared by canvas, Layers panel and sidebar cards.
  assert.match(designLibrary, /export const MH_DESIGN_LIBRARY: DesignLibraryEntry\[\]/);
  assert.match(designLibrary, /export const MH_DESIGN_LAYERS/);
  assert.match(designLibrary, /export const MH_DESIGN_TEXT_LAYERS/);
  assert.match(designLibrary, /designLayerToEditorLayer/);
  assert.match(designLibrary, /designToEditorLayers/);
  assert.match(designLibrary, /pending-r2-endpoint/, "R2 SVG listing is still the pending source");
  // Uploads are reduced to the registered KB/MB policy before they reach the canvas.
  assert.match(uploadSource, /export const UPLOAD_MAX_BYTES/);
  assert.match(uploadSource, /await createImageBitmap\(file\)/);
  assert.match(uploadSource, /blob\.size <= maxBytes/);
  assert.match(uploadSource, /export function imageLayerBox/);
  assert.match(uploadSource, /export function formatByteSize/);
  assert.match(layerPreview, /data-editor-text-content="true"/);
  assert.match(layerPreview, /data-editor-shape-path="true"/);
  assert.match(layerPreview, /data-editor-image-content="true"/);
});

test("editor reuses the existing web-app Header Bar above its full-height workspace", () => {
  assert.match(createRoute, /import Header from "@\/components\/Header"/);
  assert.match(createRoute, /data-editor-shared-header[^]*?<Header \/>/);
  assert.match(createRoute, /<Header \/>[\s\S]*?<KittlCanvas product=\{product\} \/>/);
  assert.match(createRoute, /h-\[calc\(100dvh-var\(--mobile-navigation-height,4rem\)\)\][\s\S]*md:h-dvh/);
  assert.match(header, /import MobileNav from "\.\/MobileNav"/);
  assert.match(header, /import HeaderActions from "\.\/HeaderActions"/);
});

test("Editor Header Bar 2 uses equal green boxes, a rounded Color dropdown, and Price before Save", () => {
  assert.match(createRoute, /import EditorHeaderBar2 from "@\/components\/EditorHeaderBar2"/);
  assert.match(createRoute, /useState<EditorProduct>\(DEFAULT_EDITOR_PRODUCT\)/);
  assert.match(createRoute, /useState\(DEFAULT_EDITOR_GSM\)/);
  assert.match(createRoute, /onProductChange=\{setProduct\}/);
  assert.match(createRoute, /<KittlCanvas product=\{product\} \/>/);
  assert.match(createRoute, /<Header \/>[\s\S]*?<EditorHeaderBar2[\s\S]*?\/>[\s\S]*?<KittlCanvas product=\{product\} \/>/);
  assert.match(headerBar2, /aria-label="Header Bar 2"/);
  assert.match(headerBar2, /h-11 w-full/);
  assert.match(headerBar2, /const PRODUCT_OPTIONS = \["T-Shirt", "Phone", "Hoodie", "Cup", "Kids", "Bag"\]/);
  assert.match(headerBar2, /const FUTURE_PRODUCTS = \["Hoodie", "Cup", "Kids", "Bag"\]/);
  assert.match(headerBar2, /label="Product"[\s\S]*?disabledOptions=\{FUTURE_PRODUCTS\}/);
  assert.match(headerBar2, /const GSM_OPTIONS = \[DEFAULT_EDITOR_GSM, "180 GSM", "200 GSM", "240 GSM"\]/);
  assert.match(headerBar2, /const SIZE_OPTIONS = \["XS", "S", "M", "L", "XL", "2XL", "3XL"\]/);
  assert.match(headerBar2, /const COLOR_OPTIONS = \[[\s\S]*?bg-bg[\s\S]*?bg-bg-surface[\s\S]*?bg-accent/);
  assert.match(headerBar2, /const FIELD_BOX =[\s\S]*?w-20 rounded-full[\s\S]*?border-accent bg-accent[\s\S]*?text-accent-foreground/);
  assert.match(headerBar2, /const ACTION_BOX =[\s\S]*?w-20[\s\S]*?rounded-full[\s\S]*?border-accent bg-accent[\s\S]*?text-accent-foreground/);
  assert.match(headerBar2, /pointer:coarse/);
  assert.doesNotMatch(productGsmSelect, /Choose|option value=""/);
  assert.match(headerBar2, /function PendingSelect\([\s\S]*?value="—"[\s\S]*?options=\{\["—"\]\}/);
  assert.match(headerBar2, /product === "T-Shirt" \? \([\s\S]*?label="GSM"/);
  assert.match(headerBar2, /<PendingSelect label="Brand" \/>/);
  assert.match(headerBar2, /<PendingSelect label="Model" \/>/);
  assert.match(headerBar2, /<ColorField value=\{selectedColor\} onChange=\{setSelectedColor\} \/>/);
  assert.match(headerBar2, /label="Size"[\s\S]*?options=\{SIZE_OPTIONS\}/);
  assert.match(headerBar2, /aria-label="Color"[\s\S]*?data-editor-box="Color"/);
  assert.match(headerBar2, /aria-haspopup="listbox"[\s\S]*?aria-expanded=\{open\}/);
  assert.match(headerBar2, /data-color-swatch=\{selectedColor\.value\}/);
  assert.match(headerBar2, /role="listbox"[\s\S]*?rounded-full[\s\S]*?border-accent bg-accent/);
  assert.match(headerBar2, /role="option"[\s\S]*?aria-selected=\{value === color\.value\}/);
  assert.match(headerBar2, /createPortal/);
  assert.match(headerBar2, /data-editor-box=\{label\}/);
  assert.match(headerBar2, /hidden shrink-0 text-xs font-medium text-text-secondary sm:inline/);
  assert.match(headerBar2, /aria-label="Save" data-editor-box="Save" disabled/);
  assert.match(headerBar2, /aria-label="Buy"[\s\S]*?data-editor-box="Buy"[\s\S]*?disabled/);
  assert.match(headerBar2, /data-editor-price/);
  assert.match(headerBar2, /Price —/);
  assert.ok(headerBar2.indexOf("data-editor-price") < headerBar2.indexOf('aria-label="Save"'), "Price appears to the left of Save");
  assert.match(headerBar2, /className="hidden shrink-0 whitespace-nowrap[\s\S]*?sm:inline"/);
  assert.match(headerBar2, /text-text-secondary/);
  assert.match(headerBar2, /overflow-x-auto/);
  assert.match(source, /bg-bg text-text-primary/);
  assert.match(source, /border-border bg-bg px-2/);
  assert.match(headerBar2, /import \{ useEffect, useRef, useState \} from "react"/);
  assert.match(headerBar2, /import \{ createPortal \} from "react-dom"/);
  assert.match(headerBar2, /import \{ DEFAULT_EDITOR_GSM, type EditorProduct \} from "@\/lib\/editor-product"/);
});
