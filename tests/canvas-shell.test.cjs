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
const photoAdjustments = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorPhotoAdjustments.tsx"), "utf8");
const editSidebar = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorEditSidebar.tsx"), "utf8");
const artworkLayers = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorArtworkLayers.tsx"), "utf8");
const transformMath = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-transform.ts"), "utf8");
const layerPreview = readFileSync(path.join(__dirname, "../apps/web/src/components/EditorLayerPreview.tsx"), "utf8");
const layerModelSource = readFileSync(path.join(__dirname, "../apps/web/src/lib/editor-layers.ts"), "utf8");
const mockupSource = readFileSync(path.join(__dirname, "../apps/web/src/components/MockupArtwork.tsx"), "utf8");
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
  assert.match(source, /const hotspot = "2 2"/);
  assert.match(source, /const fallbackCursor = tool === "pen" \? "crosshair" : "auto"/);
  assert.match(source, /style=\{\{ touchAction: "none", cursor: activeTool === "pen" \? activeToolCursorStyle : undefined \}\}/);
  assert.match(source, /className=\{activeTool === "pen" \? "" : "cursor-crosshair"\}/);
  assert.match(source, /className=\{activeTool === "pen" \? "" : "cursor-move"\}/);
  assert.match(source, /draggedEditorPenAnchor/);
  assert.match(source, /snapEditorPenPoint/);
  assert.match(source, /isNearPenStart/);
  assert.match(source, /isNearPenEnd/);
  assert.match(source, /cornerEditorPenAnchor/);
  assert.match(source, /drag\.corner \? cornerEditorPenAnchor\(drag\.point, point\) : draggedEditorPenAnchor\(drag\.point, point\)/);
  assert.match(source, /corner: event\.altKey/);
  assert.match(source, /event\.key === "Enter"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /penKeyHandlerRef/);
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
  assert.match(source, /strokeWidth: toolOptions\.pen\.width, penPath/);
  assert.match(source, /strokeWidth="1\.5" vectorEffect="non-scaling-stroke"/);
  assert.match(source, /data-pen-handle-endpoint="in"/);
  assert.match(source, /data-pen-handle-endpoint="out"/);
  assert.match(source, /activeTool === "pen" && penAnchors.length > 0 && \(/);
  assert.doesNotMatch(source, /Click: corner · drag: curve · Shift: snap · click start: close/);
  assert.match(source, /activeTool === "text"/);
  // Photoshop rule: the Text tool edits the selected text layer in place and only
  // creates a new text layer when the selection is missing or is not a text layer.
  assert.match(source, /if \(selected\?\.kind === "text"\) \{\n\s+if \(selected\.locked\) \{\n\s+setToolNotice\("Unlock this text layer before editing its text\."\);\n\s+return;\n\s+\}\n\s+setEditingTextLayerId\(selected\.id\);/);
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
  assert.match(source, /function eraseTouchedStrokes\(/);
  assert.match(source, /function beginEraserPass\(/);
  assert.match(source, /function extendEraserPass\(/);
  assert.match(source, /appendLayerErasure\(current, layerId, buildEraserPass\(\[point\]\)\)/);
  assert.match(source, /function undoCanvasAction\(/);
  assert.match(source, /function rememberLayerSnapshot\(/);
  assert.match(layerModelSource, /tool\?: "pen" \| "brush"/);
  assert.match(layerModelSource, /return \{ \.\.\.stroke, points:/);
  assert.match(artworkLayers, /artworkStrokeWidth\(stroke, width\)/);
  assert.match(mockupArtwork, /strokes\.some\(\(stroke\) => stroke\.tool === "brush"\) \? 32 : 18/);
});

test("Shape tool exposes selectable presets, previews gestures, and appends paths to the active layer", () => {
  assert.match(toolsBar, /data-testid="editor-shape-picker"/);
  assert.match(toolsBar, /role="group" aria-label="Shape options"/);
  // Kittl-style: the Shape chip beside the bar opens a compact icon-only popover;
  // choosing an option closes the box and the chip keeps the chosen shape's icon.
  assert.match(toolsBar, /const \[shapeMenuOpen, setShapeMenuOpen\] = useState\(false\)/);
  assert.match(toolsBar, /aria-expanded=\{shapeMenuOpen\}/);
  assert.match(toolsBar, /const SelectedShapeIcon = shapeIcons\[selectedShape\]/);
  assert.match(toolsBar, /<SelectedShapeIcon size=\{14\}/);
  assert.match(toolsBar, /onSelectShape\(preset\);\n\s+setShapeMenuOpen\(false\);/);
  assert.match(toolsBar, /data-testid="editor-shape-picker"[\s\S]*?w-max[\s\S]*?grid-cols-3/);
  assert.match(toolsBar, /title=\{EDITOR_SHAPE_LABELS\[preset\]\}/);
  assert.doesNotMatch(toolsBar, /Choose a shape, then drag on the canvas/);
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

test("shape adjustments expose Photoshop/Kittl fill, stroke, radius, and effects", () => {
  // Data model: independent fill/stroke channels plus effects, with clamping.
  assert.match(layerModelSource, /export type EditorShapeStyle = \{/);
  assert.match(layerModelSource, /export type EditorShapeLineStyle = "solid" \| "dash" \| "dot"/);
  assert.match(layerModelSource, /export function defaultEditorShapeStyle\(paths: EditorShapePath\[\]\): EditorShapeStyle/);
  assert.match(layerModelSource, /export function normalizeEditorShapeStyle\(input: EditorShapeStyle\): EditorShapeStyle/);
  assert.match(layerModelSource, /export function resolveEditorShapeStyle\(shape: EditorShapeContent\): EditorShapeStyle/);
  assert.match(layerModelSource, /export function updateEditorShapeStyle\(/);
  assert.match(layerModelSource, /export function roundEditorShapePath\(d: string, radius: number\): string/);
  assert.match(layerModelSource, /shadow: \{ enabled: false, color: "#000000"/);
  assert.match(layerModelSource, /glow: \{ enabled: false, color: "#d4ff3f"/);
  // A new shape seeds its style from its geometry so the panel never shows empty values.
  assert.match(layerModelSource, /const style = layer\.shape\?\.style \?\? defaultEditorShapeStyle\(nextPaths\)/);
  // Renderer: style drives fill/stroke/dash/filter and corner rounding.
  assert.match(layerPreview, /shapeStyle\?: EditorShapeStyle \| null/);
  assert.match(layerPreview, /shapeDash/);
  assert.match(layerPreview, /feDropShadow/);
  assert.match(layerPreview, /data-editor-shape-style=\{shapeStyle \? "true" : undefined\}/);
  assert.match(layerPreview, /roundEditorShapePath\(path\.d, shapeStyle\.cornerRadius\)/);
  // Panel: a Shape section with fill/stroke/line-style/radius and the two effects.
  assert.match(adjustmentsPanel, /title="Shape"/);
  assert.match(adjustmentsPanel, /aria-label="Shape fill color"/);
  assert.match(adjustmentsPanel, /aria-label="Shape stroke color"/);
  assert.match(adjustmentsPanel, /ariaLabel="Shape stroke width"/);
  assert.match(adjustmentsPanel, /ariaLabel="Shape corner radius"/);
  assert.match(adjustmentsPanel, /aria-label="Toggle shape drop shadow"/);
  assert.match(adjustmentsPanel, /aria-label="Toggle shape glow"/);
  assert.match(adjustmentsPanel, /onUpdateShapeStyle\(\{ strokeStyle: style \}\)/);
  // Canvas: the live preview uses the target layer's style and update handler is wired.
  assert.match(source, /const previewStyle = targetShape\?\.style \?\? defaultEditorShapeStyle\(previewPaths\)/);
  assert.match(source, /function updateSelectedShapeStyle\(update: Partial<EditorShapeStyle>\)/);
  assert.match(source, /onUpdateShapeStyle=\{updateSelectedShapeStyle\}/);
});

test("the Gradient tool draws, re-aims, and edits gradient layers", () => {
  // The drag handler creates or re-aims a gradient layer and holds the tool preset.
  assert.match(source, /function startGradientDrawing\(event: React\.PointerEvent<HTMLCanvasElement>\)/);
  assert.match(source, /createEditorGradientLayer\(id, `Gradient \$\{label\}`, gradient\)/);
  assert.match(source, /setEditorLayerGradient\(current, drag\.layerId!, gradient\)/);
  assert.match(source, /editorGradientFromToolSettings\(toolOptions\.gradient\)/);
  // A live preview overlay draws during the drag, and a tap still drops a gradient.
  assert.match(source, /data-editor-gradient-preview=\{preview\.type\}/);
  assert.match(source, /function gradientWithAxis\(drag: ActiveGradientDrag, end: Point\): EditorGradient/);
  // The tool is routed from pointer-down, not refused.
  assert.match(source, /if \(activeTool === "gradient"\) \{\n\s+startGradientDrawing\(event\);\n\s+return;/);
  // A gradient layer fills the whole canvas and is drawn by the shared preview.
  assert.match(source, /if \(layer\.gradient\) return \{ x: 0, y: 0, width: 1000, height: 1200 \}/);
  assert.match(artworkLayers, /gradient=\{layer\.gradient\}/);
  assert.match(mockupSource, /Boolean\(layer\.gradient\)/);
  // The preview renders each Photoshop shape: linear, reflected, radial, angle, diamond.
  assert.match(layerPreview, /data-editor-gradient-layer=\{gradient\.type\}/);
  assert.match(layerPreview, /gradient\.type === "reflected"/);
  assert.match(layerPreview, /editorGradientConicWedges\(gradient\)/);
  assert.match(layerPreview, /editorGradientDiamondFacets\(gradient\)/);
  // The Adjustments panel exposes tool shape/preset pickers and a stop editor.
  assert.match(adjustmentsPanel, /function GradientOptions\(\{ value, onChange \}/);
  assert.match(adjustmentsPanel, /aria-label="Gradient shape"/);
  assert.match(adjustmentsPanel, /aria-label="Gradient preset"/);
  assert.match(adjustmentsPanel, /function GradientEditor\(\{ gradient, onChange \}/);
  assert.match(adjustmentsPanel, /aria-label="Gradient stop handles"/);
  assert.match(adjustmentsPanel, /aria-label="Add gradient stop"/);
  assert.match(source, /onUpdateGradient=\{updateSelectedGradient\}/);
});

test("drawing tools are inert on photo layers and the tools bar disables them", () => {
  // Canvas guard: a selected photo layer blocks paint/pen/shape/gradient/eraser.
  assert.match(source, /const DRAWING_TOOLS: EditorTool\[\] = \["brush", "pencil", "pen", "shape", "gradient", "eraser"\]/);
  assert.match(source, /if \(activeLayer\?\.kind === "image" && DRAWING_TOOLS\.includes\(activeTool\)\)/);
  assert.match(source, /Photo layers are adjusted in the Photo Adjustments panel; drawing tools are off for photos\./);
  // Tool selection also falls back to Move for a photo layer.
  assert.match(source, /if \(selected\?\.kind === "image" && DRAWING_TOOLS\.includes\(tool\)\) \{\n\s+setActiveTool\("move"\)/);
  // Tools bar greys out the drawing tools and passes the flag through.
  assert.match(source, /drawingToolsDisabled=\{selectedLayer\?\.kind === "image"\}/);
  assert.match(toolsBar, /drawingToolsDisabled\?: boolean/);
  assert.match(toolsBar, /const disabled = drawingToolsDisabled && \(id === "brush"/);
  assert.match(toolsBar, /disabled=\{disabled\}/);
  assert.match(toolsBar, /Drawing tools are off for photo layers/);
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
  assert.match(source, /r=\{handleHitRadius\} fill="transparent" pointerEvents="auto"/);
  // Handles are a little bigger, keep a constant on-screen size, and reveal a
  // double-headed arrow glyph on hover.
  assert.match(source, /data-resize-glyph="true"/);
  assert.match(source, /function resizeHandleGlyphPath\(angle: number\)/);
  assert.match(source, /const RESIZE_GLYPH_PATHS = \{/);
  assert.match(source, /const handleHitRadius = 15 \/ unitScale/);
  assert.match(source, /const rotateHitRadius = 17 \/ unitScale/);
  assert.match(source, /scale\(\$\{handleBoxScale\}\)/);
  // Every tool shows the matching resize cursor while hovering a handle.
  assert.match(source, /cursor: "cursor-nwse-resize"/);
  assert.match(source, /cursor: "cursor-nesw-resize"/);
  assert.match(source, /cursor: "cursor-ns-resize"/);
  assert.match(source, /cursor: "cursor-ew-resize"/);
  assert.match(source, /className=\{handle\.cursor\}/);
  assert.match(source, /onPointerEnter=\{\(\) => setHoveredHandle\(handle\.key\)\}/);
  assert.match(source, /const \[hoveredHandle, setHoveredHandle\] = useState<string \| null>\(null\)/);
  // The rotate handle keeps its own distinct glyph and a grab cursor.
  assert.match(source, /r=\{rotateHitRadius\} fill="transparent" pointerEvents="auto" onPointerDown=\{onRotateStart\} className="cursor-grab"/);
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
  assert.match(adjustmentsPanel, /<EditorPhotoAdjustments image=\{image\} selectedLayer=\{selectedLayer\}/);
  assert.match(adjustmentsPanel, /onUpdateImage: \(update: PhotoAdjustmentUpdate\) => void/);
  // Camera Raw groups and their live controls.
  for (const group of ["Basic", "Tone Curve", "Color Mixer", "Color Grading", "Levels", "Selective Color", "Channel Mixer", "Detail", "Effects", "Optics", "Calibration"]) {
    assert.match(photoAdjustments, new RegExp(`title="${group}`));
  }
  assert.match(photoAdjustments, /aria-label="Auto photo adjustments"/);
  assert.match(photoAdjustments, /aria-label="Reset photo adjustments"/);
  assert.match(photoAdjustments, /ariaLabel="Photo temperature"/);
  assert.match(photoAdjustments, /ariaLabel="Photo tint"/);
  assert.match(photoAdjustments, /ariaLabel="Photo exposure"/);
  assert.match(photoAdjustments, /ariaLabel="Photo contrast"/);
  assert.match(photoAdjustments, /ariaLabel="Photo highlights"/);
  assert.match(photoAdjustments, /ariaLabel="Photo shadows"/);
  assert.match(photoAdjustments, /ariaLabel="Photo whites"/);
  assert.match(photoAdjustments, /ariaLabel="Photo blacks"/);
  assert.match(photoAdjustments, /ariaLabel="Photo texture"/);
  assert.match(photoAdjustments, /ariaLabel="Photo clarity"/);
  assert.match(photoAdjustments, /ariaLabel="Photo dehaze"/);
  assert.match(photoAdjustments, /ariaLabel="Photo vibrance"/);
  assert.match(photoAdjustments, /ariaLabel="Photo saturation"/);
  assert.match(photoAdjustments, /ariaLabel="Photo hue"/);
  assert.match(photoAdjustments, /ariaLabel="Photo red channel"/);
  assert.match(photoAdjustments, /ariaLabel="Photo green channel"/);
  assert.match(photoAdjustments, /ariaLabel="Photo blue channel"/);
  assert.match(photoAdjustments, /ariaLabel="Selective color cyan"/);
  assert.match(photoAdjustments, /ariaLabel="Selective color magenta"/);
  assert.match(photoAdjustments, /ariaLabel="Selective color yellow"/);
  assert.match(photoAdjustments, /ariaLabel="Selective color black"/);
  assert.match(photoAdjustments, /Color mixer mode/);
  assert.match(photoAdjustments, /Color mixer \$\{band\} \$\{mixerMode/);
  assert.match(photoAdjustments, /ariaLabel="Tone curve highlights"/);
  assert.match(photoAdjustments, /ariaLabel="Tone curve lights"/);
  assert.match(photoAdjustments, /ariaLabel="Tone curve darks"/);
  assert.match(photoAdjustments, /ariaLabel="Tone curve shadows"/);
  assert.match(photoAdjustments, /ariaLabel="Grading blending"/);
  assert.match(photoAdjustments, /ariaLabel="Photo color noise reduction"/);
  assert.match(photoAdjustments, /ariaLabel="Remove chromatic aberration"/);
  assert.match(photoAdjustments, /ariaLabel="Lens corrections"/);
  assert.match(photoAdjustments, /primary hue/);
  assert.match(photoAdjustments, /primary saturation/);
  assert.match(photoAdjustments, /aria-label="Photo services"/);
  assert.match(photoAdjustments, /ariaLabel="Grading highlights hue"/);
  assert.match(photoAdjustments, /ariaLabel="Grading midtones hue"/);
  assert.match(photoAdjustments, /ariaLabel="Grading shadows hue"/);
  assert.match(photoAdjustments, /ariaLabel="AI Enhance photo"/);
  assert.match(photoAdjustments, /aria-label="Smart filter"/);
  assert.match(photoAdjustments, /ariaLabel="Smart filter intensity"/);
  assert.match(photoAdjustments, /Add photo layer mask/);
  assert.match(photoAdjustments, /Edit photo layer mask/);
  assert.match(photoAdjustments, /aria-label="Remove photo layer mask"/);
  assert.match(adjustmentsPanel, /Blend mode for \$\{selectedLayer\.name\}/);

  assert.match(photoAdjustments, /ariaLabel="Photo vignette"/);
  assert.match(photoAdjustments, /ariaLabel="Photo grain"/);
  assert.match(photoAdjustments, /ariaLabel="Photo levels black point"/);
  assert.match(photoAdjustments, /ariaLabel="Photo levels white point"/);
  assert.match(photoAdjustments, /ariaLabel="Photo levels gamma"/);
  assert.match(photoAdjustments, /aria-label="Photo curves preview"/);
  assert.match(photoAdjustments, /Photo curve point/);
  assert.match(photoAdjustments, /ariaLabel="Remove background"/);
  assert.match(photoAdjustments, /ariaLabel="Upscale photo"/);
  assert.match(layerPreview, /buildToneTable\(image\)/);
  assert.match(layerPreview, /feColorMatrix type="matrix" values=\{colorValues\}/);

  assert.match(adjustmentsPanel, /border-border bg-bg-surface text-text-primary/);
  assert.match(adjustmentsPanel, /border-border bg-bg px-3 text-text-primary/);
  assert.match(adjustmentsPanel, /aria-label=\{open \? "Return to Layers" : "Open Adjustments panel"\}/);
  assert.match(adjustmentsPanel, /title=\{open \? "Return to Layers" : "Open Adjustments panel"\}/);
  assert.match(adjustmentsPanel, /data-adjustments-return-arrow=\{open \? "true" : "false"\}/);
  assert.match(layerPreview, /data-editor-image-background-removed/);
  assert.match(layerPreview, /data-editor-image-vignette/);
  assert.match(layerPreview, /data-editor-image-split-tone/);
  assert.match(layerPreview, /data-editor-image-grain/);
  assert.match(layerPreview, /feFuncR/);
  // Shared Camera Raw fields and the pure adjustment math module.
  assert.match(layerModelSource, /whites\?: number/);
  assert.match(layerModelSource, /blacks\?: number/);
  assert.match(layerModelSource, /splitHighlightSat\?: number/);
  assert.match(photoAdjustments, /neutralPhotoAdjustments/);
  assert.match(photoAdjustments, /autoPhotoAdjustments/);
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
  assert.match(editSidebar, /border-border bg-bg-surface\/95 py-2 text-text-primary/);
  assert.match(editSidebar, /border-border bg-bg px-3 text-text-primary/);
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
  assert.doesNotMatch(editSidebar, /block truncate px-2 py-1\.5 text-\[10px\] font-semibold text-text-primary/);
  assert.doesNotMatch(editSidebar, /block truncate px-2 pb-1\.5 text-\[9px\] text-text-muted/);
  assert.doesNotMatch(editSidebar, /layer\.image \? formatByteSize\(layer\.image\.byteSize\)/);
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
  // Multi-line typing: the inline editor is a textarea that grows with each line,
  // Enter inserts a new line, and the artwork renders one tspan per line.
  assert.match(source, /<textarea[\s\S]*?aria-label="Type text on the canvas"/);
  assert.match(source, /if \(event\.key === "Escape"\) event\.currentTarget\.blur\(\)/);
  assert.match(layerPreview, /text\.value\.split\("\\n"\)/);
  assert.match(layerPreview, /<tspan key=\{index\} x=\{text\.x\} dy=\{index === 0 \? 0 : lineHeight\}>/);
  // A Text layer stays text-only: drawing and shapes are refused, not appended.
  assert.match(source, /function textLayerRejection\(layer: EditorArtworkLayer \| undefined\)/);
  assert.match(source, /layer\.kind !== "text"\) return null/);
  assert.match(source, /const rejection = textLayerRejection\(selectedLayer\)/);
  assert.match(layerModelSource, /if \(layer\.id !== layerId \|\| layer\.locked \|\| layer\.kind === "text"\) return layer;/);
  // The transform box hugs the text instead of spanning the artwork like an image.
  assert.match(layerModelSource, /export function editorTextCanvasBounds/);
  assert.match(source, /editorTextCanvasBounds\(layer\.text\)/);
  assert.match(source, /if \(layer\.kind === "text" && textBounds\) return textBounds/);
  assert.match(source, /editingText\.value\.split\("\\n"\)\.length/);
  // The mockup preview uses the same measured bounds, not the old per-character estimate.
  assert.match(mockupSource, /editorTextCanvasBounds\(layer\.text\)/);
  assert.doesNotMatch(mockupSource, /layer\.text\.value\.length \* layer\.text\.fontSize \* 0\.58/);
  // The Pen cursor hotspot sits on the icon's nib (top-left), not the tail.
  assert.match(source, /const hotspot = "2 2"/);
  // Every sidebar addition must be reachable in the Layers stack.
  assert.match(source, /function revealLayersStack\(\)[\s\S]*?min-width: 768px[\s\S]*?setLayersOpen\(true\)/);
  assert.equal((source.match(/revealLayersStack\(\);/g) ?? []).length, 5, "Only explicit text, element, design, upload and gradient insertion reveals Layers");
  assert.match(layersPanel, /EditorLayerPreview paths=\{layer\.shape\?\.paths\} shapeStyle=\{layer\.shape \? resolveEditorShapeStyle\(layer\.shape\) : null\} text=\{layer\.text\} image=\{layer\.image\}/);
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

test("Editor Header Bar 2 uses one uniform box shape, one rounded dropdown, and a live price", () => {
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
  assert.match(headerBar2, /const GSM_OPTIONS = \[DEFAULT_EDITOR_GSM, "180 GSM", "200 GSM", "240 GSM"\]/);
  assert.match(headerBar2, /const SIZE_OPTIONS = \["XS", "S", "M", "L", "XL", "2XL", "3XL"\]/);
  assert.match(headerBar2, /const COLOR_OPTIONS = \[[\s\S]*?bg-bg[\s\S]*?bg-bg-surface[\s\S]*?bg-accent/);
  // Every box (fields and actions) shares one shape definition.
  assert.match(headerBar2, /const FIELD_BOX =[\s\S]*?w-20[\s\S]*?rounded-full[\s\S]*?border-accent bg-accent[\s\S]*?text-accent-foreground/);
  assert.match(headerBar2, /const TRIGGER_BOX = `\$\{FIELD_BOX\}/);
  assert.match(headerBar2, /const ACTION_BOX = `\$\{FIELD_BOX\}/);
  assert.match(headerBar2, /pointer:coarse/);
  // One dropdown component serves Product, GSM, Color, and Size.
  assert.match(headerBar2, /function BoxDropdown\(/);
  assert.match(headerBar2, /function SelectBox\(/);
  assert.match(headerBar2, /function ColorBox\(/);
  assert.doesNotMatch(headerBar2, /<select/);
  assert.doesNotMatch(productGsmSelect, /Choose|option value=""/);
  assert.match(headerBar2, /function PendingSelect\([\s\S]*?value="—"[\s\S]*?options=\{\["—"\]\}/);
  assert.match(headerBar2, /product === "T-Shirt" \? \([\s\S]*?label="GSM"/);
  assert.match(headerBar2, /<PendingSelect label="Brand" \/>/);
  assert.match(headerBar2, /<PendingSelect label="Model" \/>/);
  assert.match(headerBar2, /<ColorBox value=\{selectedColor\} onChange=\{setSelectedColor\} \/>/);
  assert.match(headerBar2, /label="Size"[\s\S]*?options=\{SIZE_OPTIONS\}/);
  assert.match(headerBar2, /aria-label=\{label\}[\s\S]*?data-editor-box=\{label\}/);
  assert.match(headerBar2, /aria-haspopup="listbox"[\s\S]*?aria-expanded=\{open\}/);
  assert.match(headerBar2, /data-color-swatch=\{selectedColor\.value\}/);
  // The popup is a compact green panel, no wider than the box it opens from.
  assert.match(headerBar2, /const MENU_BOX =[\s\S]*?rounded-2xl[\s\S]*?border-accent bg-accent/);
  assert.doesNotMatch(headerBar2, /const MENU_BOX =[^;]*rounded-full/, "Menu panel must not use rounded-full, which clamps into a capsule");
  assert.match(headerBar2, /const MENU_OPTION =[\s\S]*?rounded-full/);
  assert.match(headerBar2, /const width = Math\.min\(Math\.round\(rect\.width\), window\.innerWidth - 16\)/, "Menu width follows the trigger box width");
  // The chevron is pinned to the right edge on every field box.
  assert.match(headerBar2, /absolute right-1\.5 top-1\/2 -translate-y-1\/2/);
  // The colour swatch reads as a rounded square box, not a small dot.
  assert.match(headerBar2, /const COLOR_SWATCH = "h-5 w-5 shrink-0 rounded-md border border-accent-foreground\/50"/);
  assert.match(headerBar2, /role="listbox"[\s\S]*?className=\{MENU_BOX\}/);
  assert.match(headerBar2, /role="option"[\s\S]*?aria-selected=\{value === option\.value\}/);
  assert.match(headerBar2, /createPortal/);
  assert.match(headerBar2, /hidden shrink-0 text-xs font-medium text-text-secondary sm:inline/);
  assert.match(headerBar2, /aria-label="Save" data-editor-box="Save" disabled/);
  assert.match(headerBar2, /aria-label="Buy"[\s\S]*?data-editor-box="Buy"[\s\S]*?disabled/);
  // Price is computed from the product's selections and shown left of Save.
  assert.match(headerBar2, /calculateEditorPriceKs\(\{ product, gsm, size: selectedSize \}\)/);
  assert.match(headerBar2, /data-editor-price/);
  assert.match(headerBar2, /data-editor-price-ks=\{priceKs \?\? ""\}/);
  assert.match(headerBar2, /priceKs === null \? "Price —" : `Price \$\{priceKs\.toLocaleString\("en-US"\)\} Ks`/);
  assert.ok(headerBar2.indexOf("data-editor-price") < headerBar2.indexOf('aria-label="Save"'), "Price appears to the left of Save");
  assert.match(headerBar2, /className="hidden shrink-0 whitespace-nowrap[\s\S]*?sm:inline"/);
  assert.match(headerBar2, /text-text-secondary/);
  assert.match(headerBar2, /overflow-x-auto/);
  assert.match(source, /bg-bg text-text-primary/);
  assert.match(source, /border-border bg-bg px-2/);
  assert.match(headerBar2, /import \{ useEffect, useRef, useState \} from "react"/);
  assert.match(headerBar2, /import \{ createPortal \} from "react-dom"/);
  assert.match(headerBar2, /import \{ DEFAULT_EDITOR_GSM, type EditorProduct \} from "@\/lib\/editor-product"/);
  assert.match(headerBar2, /import \{ calculateEditorPriceKs \} from "@\/lib\/editor-price"/);
});

test("Free Transform box hides while a Brush/Pencil stroke is being drawn", () => {
  // Drawing state is toggled from the freehand stroke lifecycle.
  assert.match(source, /const \[isDrawingStroke, setIsDrawingStroke\] = useState\(false\)/);
  assert.match(source, /setIsDrawingStroke\(true\)/);
  assert.match(source, /setIsDrawingStroke\(false\)/);
  // The transform overlay only renders when no stroke is in progress.
  assert.match(source, /selectionBounds && !editingText && !drawingStroke && \(/);
  assert.match(source, /drawingStroke\?: boolean/);
  assert.match(source, /drawingStroke=\{isDrawingStroke\}/);
});

test("Adjustments panel exposes per-tool options for the active tool", () => {
  // Tool options live in shared editor state and are normalized on every change.
  assert.match(source, /const \[toolOptions, setToolOptions\] = useState<EditorToolOptions>/);
  assert.match(source, /normalizeEditorToolOptions\(EDITOR_TOOL_OPTIONS_DEFAULT\)/);
  assert.match(source, /function updateToolOptions\(/);
  assert.match(source, /activeTool=\{activeTool\}/);
  assert.match(source, /toolOptions=\{toolOptions\}/);
  assert.match(source, /onUpdateToolOptions=\{updateToolOptions\}/);
  // Brush and Pencil share the BrushOptions control; the panel titles the section per tool.
  assert.match(adjustmentsPanel, /Tool Options · \$\{TOOL_LABELS\[activeTool\]\}/);
  assert.match(adjustmentsPanel, /activeTool === "brush" \|\| activeTool === "pencil"/);
  assert.match(adjustmentsPanel, /function BrushOptions\(/);
  // The brush controls are labelled from the tool name, so Brush and Pencil share them.
  assert.match(adjustmentsPanel, /ariaLabel=\{`\$\{label\} shape`\}/);
  assert.match(adjustmentsPanel, /ariaLabel=\{`\$\{label\} size`\}/);
  assert.match(adjustmentsPanel, /label=\{activeTool === "brush" \? "Brush" : "Pencil"\}/);
  for (const label of ["Opacity", "Softness", "Feather", "Flow", "Spacing", "Smoothing", "Size jitter", "Opacity jitter"]) {
    assert.match(adjustmentsPanel, new RegExp(`label="${label}"`));
  }
  // Photoshop/Kittl brush engine controls: tip geometry, dab build-up, dynamics, and blending.
  for (const field of ["angle", "roundness", "flow", "spacing", "smoothing", "size jitter", "opacity jitter", "jitter floor", "scatter", "angle jitter", "roundness jitter", "blend"]) {
    assert.match(adjustmentsPanel, new RegExp(`ariaLabel=\\{` + "`" + `\\$\\{label\\} ${field}` + "`" + `\\}`));
  }
  assert.match(adjustmentsPanel, /aria-label=\{`\$\{label\} fade out`\}/);
  assert.match(adjustmentsPanel, /EDITOR_BRUSH_BLENDS\.map\(/);
  assert.match(adjustmentsPanel, /EDITOR_BRUSH_PRESETS\.map\(/);
  assert.match(adjustmentsPanel, /aria-label=\{`\$\{label\} preset \$\{preset\.label\}`\}/);
  assert.match(artworkLayers, /brushDabPoints\(stroke\)/);
  assert.match(artworkLayers, /data-editor-brush-blend=/);
  assert.match(adjustmentsPanel, /activeTool === "eraser"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser size"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser hardness"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser opacity"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser flow"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser spacing"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser mode"/);
  assert.match(adjustmentsPanel, /ariaLabel="Eraser nib"/);
  assert.match(adjustmentsPanel, /aria-label="Clear erasures on this layer"/);
  // The eraser shows a live, size-accurate nib so increasing the size is visible.
  assert.match(source, /data-editor-eraser-cursor="true"/);
  assert.match(source, /const \[eraserCursor, setEraserCursor\]/);
  assert.match(source, /activeTool === "eraser" \? "none" : undefined/);
  assert.match(adjustmentsPanel, /activeTool === "pen"/);
  assert.match(adjustmentsPanel, /aria-label="Pen path width"/);
  assert.match(adjustmentsPanel, /aria-label=\{`Pen cap \$\{cap\}`\}/);
  // The panel opens even without a selected layer so tool options stay reachable.
  assert.match(layersPanel, /aria-label="Open Adjustments panel" title="Open Adjustments" onClick=\{onOpenAdjustments\}/);
  assert.doesNotMatch(layersPanel, /aria-label="Open Adjustments panel" title="Open Adjustments" disabled=\{!selectedLayer\}/);
  // Brush/pencil strokes carry the chosen nib so the canvas renders them per-stroke.
  assert.match(source, /width: brushSettings\.size/);
  assert.match(source, /opacity: brushSettings\.opacity/);
  assert.match(source, /shape: brushSettings\.shape/);
  // The brush engine options travel with the stroke so the committed artwork keeps its look.
  for (const field of ["spacing", "flow", "smoothing", "sizeJitter", "opacityJitter", "jitterMinimum", "angle", "roundness", "scatter", "angleJitter", "roundnessJitter", "fadeOut", "blend"]) {
    assert.match(source, new RegExp(`${field}: brushSettings\\.${field}`));
  }
  assert.match(artworkLayers, /export function artworkStrokeWidth\(/);
  assert.match(artworkLayers, /export function artworkStrokeOpacity\(/);
  assert.match(artworkLayers, /data-editor-stroke-shape=/);
});

test("editor tool options normalize to safe ranges", () => {
  const fileName = path.join(__dirname, "../apps/web/src/lib/editor-layers.ts");
  const compiled = ts.transpileModule(layerModelSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName,
  }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", compiled)(module, module.exports);
  const { normalizeEditorToolOptions, EDITOR_TOOL_OPTIONS_DEFAULT } = module.exports;

  const defaults = normalizeEditorToolOptions(undefined);
  assert.equal(defaults.brush.size, EDITOR_TOOL_OPTIONS_DEFAULT.brush.size);
  assert.equal(defaults.brush.shape, "round");
  assert.equal(defaults.pen.cap, "round");
  assert.equal(defaults.gradient.type, "linear", "the gradient tool defaults to a linear shape");
  assert.equal(defaults.gradient.presetId, "black-white");

  const clamped = normalizeEditorToolOptions({
    brush: { size: 9999, opacity: 5, softness: -40, feather: 500, shape: "square", spacing: 0, flow: 0, smoothing: 99, sizeJitter: 500, opacityJitter: -10, jitterMinimum: 900, angle: 400, roundness: -20, blend: "nope" },
    eraser: { size: 1, hardness: 500, opacity: 0, flow: 0, spacing: 999, angle: 400, roundness: -20, mode: "nope", shape: "square" },
    pen: { width: 999, cap: "square" },
  });
  assert.equal(clamped.brush.size, 400);
  assert.equal(clamped.brush.opacity, 1);
  assert.equal(clamped.brush.softness, 0);
  assert.equal(clamped.brush.feather, 100);
  assert.equal(clamped.brush.shape, "square");
  assert.equal(clamped.brush.spacing, 1);
  assert.equal(clamped.brush.flow, 1);
  assert.equal(clamped.brush.smoothing, 10);
  assert.equal(clamped.brush.sizeJitter, 100);
  assert.equal(clamped.brush.opacityJitter, 0);
  assert.equal(clamped.brush.jitterMinimum, 100);
  assert.equal(clamped.brush.angle, 180);
  assert.equal(clamped.brush.roundness, 0);
  assert.equal(clamped.brush.blend, "normal");
  assert.equal(clamped.eraser.size, 10);
  assert.equal(clamped.eraser.hardness, 100);
  assert.equal(clamped.eraser.opacity, 1);
  assert.equal(clamped.eraser.flow, 1);
  assert.equal(clamped.eraser.spacing, 100);
  assert.equal(clamped.eraser.angle, 180);
  assert.equal(clamped.eraser.roundness, 0);
  assert.equal(clamped.eraser.mode, "brush");
  assert.equal(clamped.eraser.shape, "square");
  assert.equal(defaults.eraser.mode, "brush");
  assert.equal(defaults.eraser.shape, "round");
  assert.equal(clamped.pen.width, 60);
  assert.equal(clamped.pen.cap, "square");
});
