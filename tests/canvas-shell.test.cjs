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
const editSidebar = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorEditSidebar.tsx"), "utf8");
const artworkLayers = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorArtworkLayers.tsx"), "utf8");
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
  for (const label of ["Move", "Pen", "Hand tool", "Brush", "Eraser", "Shape", "Gradient", "Remove BG", "Undo", "Redo"]) {
    assert.ok(toolsBar.includes(`label: "${label}"`) || toolsBar.includes(`aria-label="${label}"`), `missing ${label}`);
  }
  assert.doesNotMatch(toolsBar, /id: "text"|label: "Text"/);
  assert.doesNotMatch(source, /activeTool === "text"|tool === "text"|Text objects are not connected/);
  assert.match(toolsBar, /role="group" aria-label="Color swatches"/);
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
  assert.match(source, /\(touchPanEnabled \|\| activeTool === "hand"\) \? "touch-none" : "touch-pan-y"/);
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
  assert.match(layersPanel, /aria-label="Layer list" role="list"/);
  assert.match(layersPanel, /Blend mode for \$\{selectedLayer\.name\}/);
  assert.match(layersPanel, /Opacity for \$\{selectedLayer\.name\}/);
  assert.match(layersPanel, /Hide \(black\)/);
  assert.match(layersPanel, /Reveal \(white\)/);
  assert.match(artworkLayers, /<mask[\s\S]*?maskUnits="userSpaceOnUse"/);
  assert.match(artworkLayers, /stroke\.mode === "hide" \? "black" : "white"/);
  assert.match(artworkLayers, /mask=\{layer\.mask !== null \? `url\(#\$\{maskId\}\)` : undefined\}/);
  assert.match(artworkLayers, /mixBlendMode: layer\.blendMode/);
  assert.match(layersPanel, /aria-label="Layer actions"/);
  assert.match(layerModelSource, /export function addLayerMask/);
  assert.match(layerModelSource, /export function groupEditorLayers/);
  assert.match(layerModelSource, /export function ungroupEditorLayers/);
  assert.match(layerModelSource, /export function deleteEditorLayer/);
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
  assert.match(source, /function addCanvasTextLayer\(source\?: DesignLibraryText \| null\)/);
  assert.match(source, /createEditorTextLayer\(id, `Text \$\{label\}`/);
  assert.match(source, /setEditingTextLayerId\(id\)/);
  assert.match(source, /data-editor-text-editor="true"/);
  assert.match(source, /aria-label="Type text on the canvas"/);
  assert.match(source, /onEditingTextChange\?\.\(event\.target\.value\)/);
  assert.match(source, /setEditorLayerText\(current, editingTextLayerId, value\)/);
  assert.match(source, /editingTextLayer=\{editingTextLayer\}/);
  // Every sidebar addition must be reachable in the Layers stack.
  assert.match(source, /function revealLayersStack\(\)[\s\S]*?min-width: 768px[\s\S]*?setLayersOpen\(true\)/);
  assert.equal((source.match(/revealLayersStack\(\);/g) ?? []).length, 4, "Text, element, design and upload reveal the Layers stack");
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

test("Editor Header Bar 2 selects products without Choose and defaults Product/GSM", () => {
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
  assert.match(headerBar2, /w-\[5\.75rem\]/);
  assert.match(headerBar2, /const GSM_OPTIONS = \[DEFAULT_EDITOR_GSM, "180 GSM", "200 GSM", "240 GSM"\]/);
  assert.doesNotMatch(productGsmSelect, /Choose|option value=""/);
  assert.match(headerBar2, /<option value="">—<\/option>/);
  assert.match(headerBar2, /product === "T-Shirt" \? \([\s\S]*?label="GSM"/);
  assert.match(headerBar2, /<PendingSelect label="Brand" \/>/);
  assert.match(headerBar2, /<PendingSelect label="Model" \/>/);
  assert.match(headerBar2, /product === "T-Shirt" && \([\s\S]*?>\s*Size\s*</);
  assert.match(headerBar2, /aria-label=\{label\}/);
  assert.match(headerBar2, />\s*Color\s*</);
  assert.match(headerBar2, />\s*Size\s*</);
  assert.match(headerBar2, />\s*Save\s*</);
  assert.match(headerBar2, />\s*Buy\s*</);
  assert.equal((headerBar2.match(/^\s+disabled$/gm) || []).length, 5, "future Product options, Brand/Model, Color, Size, Save and Buy remain inactive placeholders");
  assert.match(headerBar2, /bg-bg-surface/);
  assert.match(headerBar2, /text-text-secondary/);
  assert.match(headerBar2, /overflow-x-auto/);
  assert.match(source, /bg-bg text-text-primary/);
  assert.match(source, /border-border bg-bg px-2/);
  assert.match(headerBar2, /import \{ DEFAULT_EDITOR_GSM, type EditorProduct \} from "@\/lib\/editor-product"/);
});
