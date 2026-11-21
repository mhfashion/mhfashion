# MH Fashion Editor Plan — `/create`

**Status: as built (owner decision, 2026-11-21).** This file describes the editor that ships today and
the forward items the owner may choose. It is a plan, not a change request: nothing here authorises a
behaviour change.

**Owner instruction (2026-11-21):** keep the editor plan and the editor documentation separate from the
rest of the project plan, check the code carefully, and write only the plan. `Plan/PLAN.md` keeps a
short summary and links here; the behaviour documentation lives in `Doc/EDITOR.md`.

**Sources**

| Document | Role |
|---|---|
| `Doc/KITTL_CANVAS_EDITOR_AUDIT.md` | Kittl behaviour audit (2026-11-15) with its help-page citations — what Kittl does and where MH Fashion stands |
| `Doc/KITTL_CANVAS_RESEARCH.md` | Kittl canvas research notes |
| `Doc/EDITOR.md` | How the editor behaves today, written for a maintainer |
| this file | What the editor is, what it already has, and what could come next |

**Verified against the source on 2026-11-21**, in `apps/web/src` at commit `571d60b`. The audit predates
several of these findings, so where the two disagree this file wins.

---

## 1. Where the editor lives

| Piece | File | Size |
|---|---|---|
| Route shell: shared site header, Header Bar 2, workspace | `app/create/page.tsx` | 25 lines |
| Canvas: tools, selection, layers, mockups, undo | `components/KittlCanvas.tsx` | 2,983 lines |
| Layer model, text metrics, shapes, gradients, masks | `lib/editor-layers.ts` | 1,847 lines |
| Layers box (Photoshop-style rows) | `components/EditorLayersPanel.tsx` | 327 |
| Adjustment box (text, effects, shape, gradient, pen, brush) | `components/EditorAdjustmentsPanel.tsx` | 438 |
| Tool bar (desktop and phone) | `components/EditorToolsBar.tsx` | 256 |
| Compact product/GSM/colour/size bar with price | `components/EditorHeaderBar2.tsx` | 397 |
| Sidebar (Designs, Elements, Text, Upload, Image Create) | `components/EditorEditSidebar.tsx` | 338 |
| Layer painting (SVG) | `components/EditorArtworkLayers.tsx` | 332 |
| Thumbnails | `components/EditorLayerPreview.tsx` | 274 |
| Photo adjustments | `components/EditorPhotoAdjustments.tsx` | 261 |
| Mockup mirror of the artwork | `components/MockupArtwork.tsx` | — |
| Pen path geometry | `lib/editor-pen-path.ts` | 198 |
| Free-transform maths | `lib/editor-transform.ts` | 97 |
| Canvas spec | `lib/editor-canvas-spec.ts` | 9 |
| Artwork tiers | `lib/editor-artwork-tiers.ts` | 38 |
| Upload limits and compression | `lib/editor-upload.ts` | 101 |
| Price table | `lib/editor-price.ts` | 45 |
| Product/GSM defaults | `lib/editor-product.ts` | 4 |
| Print attributes (method, fabric, knit, cuttings) | `lib/editor-attributes.ts` | 47 |
| Design library (R2 placeholder) | `lib/editor-design-library.ts` | 181 |

## 2. Canvas and coordinates

- `PRINT_CANVAS_SPEC` is frozen: 4500 × 5400 px at 300 dpi, transparent, PNG target, blank on open, no
  placeholder artwork (`lib/editor-canvas-spec.ts`).
- Artwork units are canvas pixels; the print sheet converts them with the `unitsPerCm` recorded on the
  order design, so the canvas size and that constant are a print contract, not a preference.
- The workspace is a pasteboard around the print canvas. Drawing tools clamp to the canvas
  (`toCanvasPoint`); move/resize/rotate use `toCanvasPointUnclamped`, so a layer can be parked outside
  the print area and still be grabbed.
- `CANVAS_LAYER_TRAVEL_LIMIT` (2400 artwork units) bounds how far a layer can be dragged away.
- Front and Back mockups are separate boxes with their own artwork overlay transforms; each mirrors the
  canvas artwork and clips it to the print area (`MockupArtwork`).

## 3. Tools

`EditorToolsBar` exposes nine tools in this order: **Move**, **Hand**, **Pencil**, **Pen**, **Text**,
**Brush**, **Eraser**, **Shape**, **Gradient**. The default active tool is `pen`. The bar collapses, and
on a phone it becomes a compact bottom-centre bar with 44 px targets.

Per-tool settings live in `EditorToolOptions` (`lib/editor-layers.ts`) and are normalised on load
(`normalizeEditorToolOptions`), so a stale or partial settings object cannot break a tool.

## 4. Layer model

`EditorArtworkLayer` (`lib/editor-layers.ts`):

| Field | Meaning |
|---|---|
| `id`, `name` | identity and the label in the Layers box |
| `kind` | `artwork` \| `text` \| `shape` \| `image` \| `gradient` |
| `visible`, `locked` | row toggles; a locked layer rejects edits |
| `opacity`, `fillOpacity`, `blendMode` | `normal` \| `multiply` \| `screen` \| `overlay` |
| `groupId`, `linkId` | folder membership and explicit transform links |
| `strokes`, `erasures` | freehand paint and the subtractive eraser passes over it |
| `mask` | `LayerMaskStroke[]` — black hides, white reveals, artwork untouched |
| `text`, `shape`, `image`, `gradient` | per-kind content |

Layer operations are pure helpers on the array: `reorderEditorLayer`, `moveEditorLayerToIndex`,
`groupEditorLayers`, `ungroupEditorLayers`, `linkEditorLayers`, `unlinkEditorLayers`,
`duplicateEditorLayer`, `deleteEditorLayer`, `addLayerMask`, `removeLayerMask`, `updateEditorLayer`.

## 5. Layers box

`EditorLayersPanel` is the Photoshop-style panel:

- Rows are draggable to any position (HTML5 drag), keeping a group block contiguous.
- Groups render as a folder header with nested child rows; each child stays individually selectable.
- Row controls: visibility, lock, mask target and thumbnail, name (renamed in place), options menu, drag.
- Header controls: Opacity and Fill (number inputs, clamped), blend mode, Group/Ungroup, Link/Unlink,
  mask add/toggle.
- Selecting a mask thumbnail switches the brush to paint the mask with the editor's foreground and
  background colours instead of artwork.
- Thumbnails paint the layer as it looks, including erasures, mask and text effects
  (`EditorLayerPreview`).

## 6. Selection and transform

- The selection box is derived from the selected content, not from fixed canvas coordinates: a text
  layer's box hugs the painted ink plus its effects and decorations (`editorTextCanvasBounds`,
  `editorTextPaintPadding`, `editorTextDecoration`); a group's box is the union of its children.
- Eight resize handles (`top-left` … `bottom-right`, named on `[data-resize-handle]`) plus a rotate
  handle below the box. Handle hit radius is `min(15, max(5, shortestSide * 0.3))` px, so a one-line text
  box can still be moved instead of resized; the rotate handle sits
  `max(58, (handleR + rotateR + 10) / unitScale)` below the box, so it never lands on the bottom-centre
  handle.
- A press picks the layer under the pointer (`hitTestLayerAt`) and then drags it; the selection box is a
  solid rect that re-picks a different layer when pressed.
- Group transforms apply to the whole group; selecting a child transforms only that child. Linked layers
  move and resize together.
- Rotation snaps to 15° when enabled (`snapEditorRotationDelta`).

## 7. Text

`EditorTextContent` carries the string, font family, size, weight, italic, underline, alignment,
letter-spacing, line-height, colour, `wrapWidth`, effects, decoration and `textTransform`.

- **Wrapping.** `editorTextLines` splits on `\n` and soft-wraps each line to `wrapWidth`, breaking at
  spaces and falling back to a per-character split for a word wider than the limit. New text gets
  `DEFAULT_TEXT_WRAP_WIDTH` (880); layers saved before wrapping existed have no `wrapWidth` and stay
  unwrapped.
- **Metrics.** `editorTextLineMetrics` measures both the layout box (`width`/`advance`, used for wrapping
  and `text-anchor`) and the ink box (`inkLeft`/`inkRight`, used for the transform outline), so italic
  slant and trailing letter-spacing cannot cut the box through the glyphs. A reported ink descent of
  exactly `0` is a real measurement; the 0.2 em estimate is only for a browser reporting no font line
  box at all.
- **Effects.** `editorTextEffects` resolves the painted list — `shadow`, `outline`, `glow`, `offset`,
  `echo`, `extrude`, `stripe` — from `effects`, or from the legacy `textEffect` preset. One copy of the
  text is painted per effect, so the stack is ordered and the bounds grow with it.
- **Decoration.** `editorTextDecoration` returns the painted line/rect geometry in absolute layer units
  (horizontal line, colour cut, oblique); the renderer and the padding both read it.
- **Transform presets.** `textTransform` is `none` \| `arch` \| `wave` \| `circle`. `arch` tilts the line
  and `wave` shears it (`editorTextPresetMatrix`); **`circle` is offered in the Adjustment box but paints
  no transform** — see §16.
- **Inline editing.** The Text tool places a `foreignObject` textarea aligned to the drawn baseline; its
  height is the wrapped line count × line height + 4, so it grows with every line. Re-entering an
  existing layer puts the caret at the end. `commitEditingText` returns the tool to Move.
- **Caret panning.** `keepTextCaretVisible` pans the workspace by the caret's own line, coalesced through
  `caretPanFrameRef`, so typing past the viewport edge does not oscillate.

## 8. Shapes, pen, gradients

- **Shapes.** `EDITOR_SHAPE_PRESETS` — rectangle, rounded-rectangle, ellipse, triangle, diamond, line,
  arrow, star, hexagon — with line style (`solid`/`dash`/`dot`), stroke and fill, shadow and glow
  (`EditorShapeStyle`), and rounded corners via `roundEditorShapePath`.
- **Shape Builder.** `applyEditorShapeBuilderOperation` supports `merge`, `subtract` and `intersect`; it
  is limited to the first two axis-aligned rectangles of a shape layer (see §16).
- **Pen.** `editorPenPathData` builds the SVG `d`; anchors carry `handleIn`/`handleOut`. On the canvas,
  `movePenEditNode` drags anchors and handles (Alt breaks handle symmetry) and `addPenNodeOnPath` inserts
  a node; `insertEditorPenAnchor` and `removeEditorPenAnchor` keep the geometry consistent.
- **Gradients.** Types `linear`, `radial`, `angle`, `reflected`, `diamond`; up to
  `EDITOR_GRADIENT_STOP_LIMIT` (8) stops with per-stop opacity; presets in `EDITOR_GRADIENT_PRESETS`;
  conic wedges and diamond facets are computed by `editorGradientConicWedges` and
  `editorGradientDiamondFacets`, so the SVG and the thumbnail agree.

## 9. Images and photo adjustments

- Upload ceiling `UPLOAD_MAX_BYTES` (2 MB) and longest retained edge `UPLOAD_MAX_EDGE` (2000 px); the
  upload is compressed client-side before it becomes a layer (`lib/editor-upload.ts`).
- `EditorImageContent` carries the photo adjustments — exposure, contrast, highlights and shadows,
  curves, HSL, split toning, colour mixer, levels, grain, vignette, sharpen, noise reduction, lens
  corrections — plus flags for `backgroundRemoved`, `upscaled`, `aiEnhanced` and a smart-filter intensity.
- The Adjustment box renders them in `EditorPhotoAdjustments`; the flags that depend on a backend service
  stay inert until that service exists.

## 10. Mockups and artwork tiers

- Front and Back mockups are independently draggable boxes with connector wires, sharing responsive
  square dimensions and a starting artwork scale.
- Each mockup's artwork overlay can be moved and resized independently; live pixel dimensions show while
  it is selected.
- The large tier is **shared and transferable**: `LARGE_ARTWORK_EDGE_PX` 3500 and
  `SMALL_ARTWORK_EDGE_PX` 1500. Either side may claim the large tier by growing past 1500; while one side
  owns it the other is limited to 1500; returning to 1500 or removing the mockup releases it
  (`claimLargeArtworkTier`, `reconcileLargeArtworkTier`, `releaseLargeArtworkTier`).
- The mockup mirrors layers with their offsets, scales, origins and rotations, then clips to the print
  area, so a layer dragged off-canvas disappears from the mockup exactly as it would print.

## 11. Header Bar 2 and price

- The bar carries Product, GSM, Color, Size, Save and Buy boxes with shared geometry constants
  (`FIELD_BOX`, `TRIGGER_BOX`, `ACTION_BOX`, `MENU_BOX`, `MENU_OPTION`, `COLOR_SWATCH`).
- Product options: T-Shirt and Phone are selectable; Hoodie, Cup, Kids and Bag are listed but disabled.
  GSM options: 160, 180, 200, 240.
- Selecting an option updates the price immediately (`data-editor-price`), from
  `calculateEditorPriceKs` (base price per product plus GSM and size tables).
- **Save and Buy are disabled placeholders.** The editor has no save, no order hand-off and no
  persistence (see §12).

## 12. State, undo, persistence

- All editor state is React state inside `KittlCanvas` (layers, selection, tool, viewport, mockups). It is
  lost on reload.
- Undo/redo keeps the last 30 layer-array snapshots (`undoStack`/`redoStack` of
  `EditorArtworkLayer[][]`); it covers layer state, not viewport or mockup transforms.
- Nothing is written to `localStorage`, `sessionStorage` or Supabase from the editor; `canvas_state`
  appears nowhere in `apps/web/src`. A design reaches an order through the order record, not from this
  route.

## 13. Phone parity

- Touch targets are ~44 CSS px and stay that size through viewport zoom; primary touch owns the drag and
  a second touch cannot take the gesture over.
- With `Pan view` on, one finger pans the whole view; `+`, `−` and `Reset view` change viewport zoom and
  pan only, never artwork positions.
- With pan off: drawing, node dragging, mockup box moving, artwork group moving and corner resizing all
  work.
- The editor height leaves the real bottom-navigation height and safe area; the sidebar and Layers dock
  close before they can overlap at phone width.
- Verified with Chromium touch emulation at 390×844 and in landscape; **not** verified on a physical
  Android or iPhone.

## 14. Contracts that must not drift

Each of these was a real defect once; keep them when touching the editor.

1. A text transform box hugs the painted **ink** plus effects and decorations, never the font line box.
2. A pure text layer gets **0** grab margin; strokes, shapes and images get 18 units.
3. `editorTextLines` is the only source of painted lines — never `value.split("\n")`.
4. The inline editor's box follows the wrapped line count, not the newline count.
5. Handle hit radius scales with the box; the rotate handle sits outside the resize handles.
6. Move/resize/rotate use the unclamped point; drawing tools stay on the canvas.
7. A press on the selection re-picks a different layer underneath, then drags.
8. The artwork mirror on a mockup is clipped to the print area.
9. Print geometry (4500×5400 px, `unitsPerCm`, layer records) is a contract with the press.
10. The language and currency pills in the shared header always show the active option.

## 15. Test coverage today

| Suite | What it covers |
|---|---|
| `tests/editor-layers.test.cjs` (49) | layer defaults, brush metadata, eraser masks, layer masks, live strokes, properties/rename/order, duplicate, text/element/upload layers, shape paths and style, rounded corners, pen nodes |
| `tests/canvas-shell.test.cjs` (29) | canvas shell behaviour, tool bar, layers dock, header bar |
| `tests/photo-adjustments.test.cjs` (18) | image adjustment maths and clamps |
| `tests/editor-attributes.test.cjs` (8) | print method, fabric, knit and cuttings option sets |
| `tests/editor-pen-path.test.cjs` (6) | path data, snapping, anchor insert and remove |
| `tests/editor-price.test.cjs` (4) | product/GSM/size price table |
| `tests/canvas-spec.test.cjs` (1) | frozen canvas spec |
| `tests/editor-touch.cjs` | CDP phone and desktop interaction: tiny artwork, landscape, dark/light, dock arrows, tier resize, drawing |

Run `node --test tests/*.test.cjs` for the unit suites, and `tests/editor-touch.cjs` against a running
server (`EDITOR_TEST_ORIGIN`, default `http://127.0.0.1:3000`). The phone **Edit sidebar** section of
`editor-touch.cjs` has a known pre-existing failure (a `null` `getBoundingClientRect`) unrelated to the
editor logic; earlier assertions still run.

## 16. Verified limits (as built, not planned)

| Limit | Detail |
|---|---|
| `circle` text transform | selectable in the Adjustment box, paints no transform (`editorTextPresetTransform` returns `undefined` for it) |
| `flag`, `rise`, `angle`, `distort` transforms | do not exist |
| Shape Builder | merge/subtract/intersect only, and only on the first two axis-aligned rectangles; no `exclude`, no arbitrary paths |
| Alignment and tidy | no align-to-canvas or distribute helpers anywhere |
| Flip horizontal/vertical | not implemented |
| Hover highlight | canvas → panel selection sync works; hovering does not highlight the other side |
| Snap guides | only 15° rotation snapping; no positional guides or smart lines |
| Context menu | none |
| Glyphs, uppercase, ligatures | none |
| Character-level runs | none — styling is per text layer |
| Artboards, infinite canvas | none — one print canvas plus mockups |
| Persistence, collaboration, version history | none |
| Save and Buy | disabled placeholders |
| Sidebar design library | `DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"`; the R2 endpoint, SVG layer extraction, upload pipeline and AI image pipeline are integration work |
| Header Bar 2 products | Hoodie, Cup, Kids and Bag disabled; product and GSM do not change the mockup |
| Phone | verified with emulation only, not on a physical device |

## 17. Roadmap (needs owner approval)

The audit's recommended order, minus what §16 shows is already built. Nothing here is approved by being
listed: the editor is final as built, so an item starts only when the owner says so.

| # | Item | Model change | Decision |
|---|---|---|---|
| R1 | Canvas ↔ Layers hover highlighting | none | — |
| R2 | Align to print canvas, tidy/distribute | geometry helpers | — |
| R3 | Flip horizontal/vertical | two layer fields | — |
| R4 | Drag-to-create text box | `wrapWidth` from the drag | — |
| R5 | Paint `circle`, add `flag` (or remove them) | preset matrices | D2 |
| R6 | Effect stacking control, 3D shadow | ordered effect list | D3 |
| R7 | Character-level text runs | `runs[]` plus migration | D1 |
| R8 | Shape Builder for arbitrary paths, `exclude` | boolean ops on `d` strings | D4 |
| R9 | Artboards, collaboration, version history | workspace, export, persistence | D5, D6 |

Per-item detail — files, acceptance and the reasoning — is in Appendix B.

## 18. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Character-level formatting now? | No — text-box-level styling. Runs touch every renderer, both bounds, the print sheet and saved designs. |
| D2 | Which text transformations? | Keep `arch`/`wave`; finish `circle`, add `flag`; leave `distort`/`rise`/`angle` out. |
| D3 | Shadow and outline only, or the full effect stack? | The seven painted effects cover the catalogue; add stacking before 3D. |
| D4 | Full Shape Builder in scope? | Not now; node editing already ships and rectangle booleans cover the shapes in use. |
| D5 | Single print canvas or multi-artboard? | Single print canvas; every mockup, export and order line assumes one print area. |
| D6 | Collaboration and version history? | No; they need backend state, conflict resolution and permissions. |

## 19. Change policy

- The editor is **final as built** (owner decision, 2026-11-21). Behaviour changes only on an explicit
  owner instruction, one item at a time.
- Every editor change is verified at desktop 1440×900 **and** phone 390×844 touch, because the shop floor
  uses phones.
- Anything that paints is verified by frame differencing: hide the glyphs, diff two screenshots, require
  ≤1.1 px of ink outside the transform box.
- Print output (sheet, mockup, layer records in cm) is part of the acceptance for any layer change.
- Keep `Plan/PLAN.md` free of editor detail; it links here.

---

## Appendix A — specification moved from `Plan/PLAN.md`

The editor specification and product direction that used to live inside `Plan/PLAN.md` are kept below,
verbatim, because other documents link to their anchors. This is the historical contract; where it
disagrees with §1–§19 above, the verified statements above win. Section numbers 1–19 inside the appendix
are the old document's numbering, not this plan's.

<a id="unified-editor-vision"></a>
### Unified Editor Vision (consolidated from `docs/UNIFIED_EDITOR_VISION.md`)

**Status:** Canonical product direction for the next editor milestones
**Scope:** Kittl-inspired design workflow + Photoshop-inspired professional control + Canva-inspired template and brand workflow, adapted for apparel production.

### 1. What we are building

MH Fashion should not become three separate editors hidden behind three different interfaces. It should be one editor with three complementary modes of work:

1. **Create mode — Kittl + Canva strengths.** A fast, visual starting point with templates, ready-made text layouts, searchable assets, brand colors, font pairings, mockups, and one-click composition. Kittl's official editor documentation describes templates, asset search, text layouts, text transformations, effects, artboards, mockups, and a Layers panel as connected parts of the same workflow. [1]
2. **Pro mode — Photoshop strengths.** Precise object and pixel workflows with a Move tool, selection tools, vector paths, masks, groups, Smart Objects, Blend Modes, Opacity, Fill, History, keyboard shortcuts, and non-destructive editing. Photoshop's documented model keeps layer order, Move-tool selection, groups, masks, Smart Objects, and history as explicit controls rather than flattening them into a template operation. [2] [3]
3. **Production mode — MH Fashion's differentiator.** Apparel sides, garment mockups, print-safe areas, fabric and GSM attributes, color and cutting options, DPI/export validation, and a clean production package. Production mode must protect template and print constraints while still allowing approved design edits.

The result should feel approachable when a user starts from a template, powerful when a designer opens the Layers and History docks, and safe when the design is sent to apparel production.

The supplied Kittl project link was not publicly inspectable in this session because it opened an account/authentication screen. This plan therefore uses Kittl's public documentation for behavior, not an unsupported claim about the private project artwork.

### 2. Shared workspace shell

The global site Header and the existing editor command bar remain unchanged. Below them, every mode uses the same workspace shell:

- **Left rail:** Create panels and professional tools. The top group contains Templates, Uploads, Elements, Text, Brand, Mockups, and AI. A divider separates these from Move, Select, Pen, Shape, Eraser, Clone, Gradient, Measure, Hand, and Zoom.
- **Center stage:** the active artboard or apparel side, with zoom, pan, rulers, guides, print-safe overlays, and mockup preview. The stage never owns document truth; it renders the scene graph and dispatches typed commands.
- **Context bar:** selection-aware controls for typography, color, alignment, dimensions, transform, and quick effects. It changes with the selected object but does not hide core layer controls.
- **Right dock:** tabs for Layers, History, Design, and Production. Layers and History are always available. Design exposes the selected object's detailed properties. Production exposes mockup, print area, and export validation.
- **Bottom attributes strip:** product, print method, fabric, knit, GSM, color, cutting, and size. It remains separate from creative editing because changing a garment attribute can change print constraints.

The shell is canvas-first on phone. Left tools become an icon rail, Create assets open in bottom sheets, and Layers/History open as sheets or an overlay. The same scene graph and commands are used on desktop and phone; only panel placement changes.

### 3. Mode behavior

#### 3.1 Create mode

Create mode is the fastest path from an empty design to a usable garment composition. It opens with template and asset discovery, not a blank technical panel. Users can search a catalog, filter by category, preview a template, apply it to the active side, and replace editable content without breaking the garment document.

A template is not a flattened image. It is a versioned package containing editable nodes, groups, font references, brand-token slots, print-area intent, and optional mockup placement. A user can enter Pro mode at any time and inspect the same nodes in Layers.

Create mode includes:

- template search by product, style, occasion, and print method;
- recent, liked, and organization-approved templates;
- asset library with upload, element, photo, graphic, and texture categories;
- predefined text combinations that remain separate editable text layers;
- one-click color theme and font pairing application;
- quick mockup preview;
- safe reset that returns to the template version without deleting the source project.

#### 3.2 Pro mode

Pro mode exposes the professional tool and layer model without forcing every beginner to see it first. The Move tool supports Auto-select Off, Layer, and Group. Shift-click supports additive selection. Arrow keys nudge selected content, and locked ancestors reject edits with an explanation.

Pro mode keeps editing non-destructive whenever the source type supports it:

- text remains editable until explicit outline/rasterize conversion;
- SVG and vector paths remain editable nodes;
- images retain source metadata and placement transforms;
- Smart Objects preserve source content while allowing replacement;
- masks hide/reveal without deleting source pixels;
- effects are ordered appearance nodes;
- blend mode, opacity, fill, and flow have distinct meanings;
- History stores named document commands and supports undo/redo branches and snapshots.

Photoshop's official guidance describes combining Smart Objects, Smart Filters, adjustment layers, and masks to preserve editability. MH Fashion should adopt that principle while keeping the implementation compatible with the browser scene graph. [2]

#### 3.3 Production mode

Production mode makes the document ready for apparel, not merely visually attractive. It displays Front, Back, and any supported garment panels as artboards with garment-specific print-safe geometry. It shows warnings when content is outside the print area, uses an unsupported font, has insufficient raster resolution, or depends on an unavailable source asset.

A production lock can protect mockup geometry, side coordinates, template branding, or approved text. Creative edits remain possible inside the allowed region. The export command produces clean artwork, preview, coordinates, source/version metadata, and warnings instead of a screenshot-only output.

### 4. Unified document model

The editor should evolve from parallel `CanvasMark[]` and `EditorLayer[]` arrays into a typed scene graph while preserving backward compatibility during migration:

```ts
type DesignDocument = {
  version: number;
  activeArtboardId: string;
  artboards: Artboard[];
  nodes: DesignNode[];
  brandTokens: BrandTokenSet[];
  templateSource?: TemplateSource;
  production: ProductionDocument;
  history: HistoryMetadata;
};

type DesignNode = {
  id: string;
  kind: "group" | "text" | "path" | "shape" | "image" | "smart-object" | "mask" | "effect" | "adjustment" | "mockup";
  parentId?: string;
  children?: string[];
  visible: boolean;
  locked: boolean;
  selectable: boolean;
  transform: TransformState;
  appearance: AppearanceState;
  source?: SourceReference;
  constraints?: ProductionConstraint[];
};
```

The important design rule is that a template, an imported image, a text preset, and a hand-drawn path all become nodes in the same document. Their editing affordances differ by `kind`, but selection, grouping, ordering, visibility, locking, history, and export use the same command system.

Commands should be typed and history-backed:

```ts
type EditorCommand =
  | { type: "insert-template"; templateId: string }
  | { type: "insert-node"; node: DesignNode }
  | { type: "update-node"; id: string; patch: Partial<DesignNode> }
  | { type: "move-nodes"; ids: string[]; delta: { x: number; y: number } }
  | { type: "reorder-nodes"; ids: string[]; targetId: string; position: "before" | "inside" | "after" }
  | { type: "apply-effect"; id: string; effect: EffectState }
  | { type: "set-brand-token"; tokenId: string; value: string }
  | { type: "validate-production" };
```

This command boundary is what lets a Kittl-like quick action and a Photoshop-like precise property edit produce the same reliable undo, autosave, collaboration, and export behavior.

### 5. Kittl, Photoshop, and Canva strengths to combine

#### Kittl contribution

Use Kittl's design-first behavior for templates, artboards, assets, text layouts, vector creation, text transformations, effects, clipping masks, mockups, and approachable right-panel controls. Kittl documents layers with reorder, hide, lock, and grouped-object expansion, and documents editable text effects and mockup workflows. [1]

#### Photoshop contribution

Use Photoshop's professional behavior for document truth: explicit layers/groups, Move Auto-select modes, drag reorder insertion lines, multi-layer movement, masks, Smart Objects, blend modes, non-destructive effects, and named history states. Photoshop documents that Shift-click can add layers to a selection and that selected content can move together. [3]

#### Canva contribution

Use Canva's low-friction discovery and team workflow for templates, Brand Kits, and mobile-friendly layer access. Canva documents opening Layers from Position, selecting layers from the panel, drag-reordering with an insertion line, rearranging multiple layers, and Shift-selecting multiple layers. [4] Canva Brand Kits organize official logos, colors, fonts, and assets for use inside the editor, with Brand Templates and brand controls supporting consistency. [5]

#### MH Fashion contribution

Add product-aware constraints that generic design tools do not own: front/back garment sides, print method, fabric and GSM, cuttings, mockup placement, print-safe boundaries, export validation, and production handoff. These rules are first-class constraints, not an afterthought added during checkout.

### 6. Panel information architecture

The right dock should use four tabs:

- **Layers:** scene tree, search/filter, multi-select, visibility, lock, groups, reorder, masks, clipping, Smart Object badges, Blend Mode, Opacity, Fill, and effects.
- **History:** named commands, Undo/Redo, snapshots, draft restore, and branch-clearing behavior after a new edit.
- **Design:** context properties for text, vectors, images, effects, transforms, alignment, and color.
- **Production:** active garment side, mockup, print area, DPI, warnings, and export package.

The left Create rail should use five user-facing sections: Templates, Assets, Text, Brand, and AI. Professional tools remain below a divider. This keeps Canva/Kittl discovery separate from Photoshop precision without building three competing sidebars.

### 7. Brand and template system

Brand assets need a reusable token layer rather than copied colors. A Brand Kit stores logos, color palettes, font families, graphics, usage guidelines, and approved templates. Applying a brand theme updates linked nodes only; a user can detach a node to preserve a deliberate exception.

Template slots should support locked, replaceable, and optional content:

- locked logo or production mark;
- replaceable headline text;
- replaceable image or graphic;
- optional badge/group;
- brand color token;
- garment-side placement constraint.

A template preview must explain what is editable before insertion. If a font or source asset is missing, the editor shows a substitution warning and keeps the node editable rather than silently converting it to a raster image.

### 8. Implementation roadmap

**U1 — Unified shell and mode state.** Add Create/Pro/Production mode state without duplicating the canvas. Add right-dock tabs for Layers, History, Design, and Production. Keep current Header and command bar unchanged.

**U2 — Scene graph adapter.** Introduce a node adapter around current `CanvasMark` and `EditorLayer` data. Serialize stable IDs, parent/child links, appearance, source metadata, and production constraints. Add migration tests for existing local drafts.

**U3 — Create system.** Add template records, searchable template cards, editable slots, recent/liked templates, brand token application, and template-safe reset.

**U4 — Pro system.** Complete multi-layer drag reorder, contiguous range selection, group isolation, keyboard movement, masks, Smart Object source states, appearance effects, and richer History snapshots.

**U5 — Production system.** Add garment-aware artboards, print-safe geometry, DPI/font/source validation, mockup linkage, and reproducible export manifests.

**U6 — Collaboration and AI.** Add comments/presence, permissions, version restore, AI generation as node insertion, and brand-safe AI guardrails. AI suggestions must create editable nodes or clearly labeled raster results; they must not silently replace the source design.

### 9. Non-negotiable product rules

The three inspirations must be combined at the document and command level, not by copying three visual shells. There must be one selection model, one layer tree, one history system, one autosave path, and one export validator.

Fast template actions must always be inspectable in Pro mode. Professional operations must not destroy template semantics without an explicit conversion. Production restrictions must be visible and explainable. Mobile must expose the same capabilities through sheets and compact controls rather than becoming a separate reduced document model.

### References

[1]: https://help.kittl.com/editing-and-design "Kittl Editing and design official documentation"
[2]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html "Adobe Photoshop Non-destructive editing techniques"
[3]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Adobe Photoshop Reorder and move layers"
[4]: https://www.canva.com/help/finding-and-arranging-layers/ "Canva Finding and arranging layers"
[5]: https://www.canva.com/help/brand-kit/ "Canva Set up Brand Kits"


---

<a id="editor-implementation-plan"></a>
### Editor Implementation Plan (consolidated from `docs/EDITOR_PLAN.md`)

**Status:** Detailed, continuously maintained editor plan section for `/create`

**Date:** 2026-11-12

**Parent-plan reference:** [project plan](#project-plan) §6

**Canonical owner:** This section of `Plan/PLAN.md` is the source of truth for editor-specific behavior, implementation logic, milestones, and acceptance criteria. Keep the short summary and link in the project plan section above; do not create a separate editor plan file.

**Implementation boundary:** This document defines the behavior MH Fashion should build. It does not claim that every item below is already implemented.

**Unified product direction:** [unified editor vision](#unified-editor-vision) is the canonical product-level synthesis of Kittl-style creation, Photoshop-style professional control, Canva-style templates/brand workflow, and MH Fashion production constraints. This file remains the detailed implementation contract.

### Editor section maintenance policy

Keep detailed editor work in this section of the single master plan. Add new editor tools, Fabric.js implementation details, interaction rules, data contracts, export behavior, performance constraints, and tests here. When a major editor milestone changes product status, update the short reference in the project plan section above; do not recreate standalone plan documents or duplicate the full editor specification elsewhere.

<a id="editor-plan-from-audit"></a>
### 1. Product direction

MH Fashion should combine four useful editor patterns without copying any product's proprietary interface or assets:

- **Kittl-style accessibility:** quick canvas actions, direct manipulation, artboard-first workflows, contextual controls, simple alignment, useful text transformations, mockup attachment, and fast export. Kittl documents selection, move, rotate, scale, zoom, pan, undo/redo, layer management, alignment, text transformations, mockups, and export as connected editor workflows. [1] [2] [3] [4] [5] [6]
- **Photoshop-style non-destructive composition:** a predictable layer stack, groups, visibility, locking, opacity, blend modes, masks, Smart Objects, adjustment/effect ownership, and history-backed changes. Photoshop's documented model combines Smart Objects, Smart Filters, adjustment layers, and masks so edits can remain reversible. [7]
- **Canva-style discovery and brand workflow:** searchable templates, low-friction asset insertion, mobile-friendly Layers access, reusable brand logos/colors/fonts/assets, approved templates, and safe multi-layer rearrangement. Canva documents Layers access from Position, drag insertion lines, multi-layer selection, and Brand Kits for shared brand assets. [21] [22]
- **Illustrator-style vector precision:** object selection versus path selection, editable anchors and handles, Pen/Curvature workflows, Shape Builder operations, artboards, Smart Guides, snapping, measurements, and precise export. Illustrator separates object-level selection from anchor/path editing and exposes guides for alignment, spacing, measurements, and transformations. [8] [9] [10]

The result should feel like **MH Fashion Design Studio**: easy enough for a first-time T-shirt designer, but structurally reliable enough for production artwork and print export.

The three primary experiences must share one document model, one selection system, one Layer tree, one History system, one autosave path, and one production validator. Detailed mode behavior, template/brand tokens, scene-graph migration, and implementation phases are maintained in [unified editor vision](#unified-editor-vision).

### 2. Current implementation baseline

**Verified repository state (2026-11-14):** `/create` reuses the website's existing responsive Header Bar above a separate compact 44px `Header Bar 2` and its fixed-height editor workspace; the existing mobile and desktop header treatments remain unchanged. Bar 2 has selectable local-only `Product` options (`T-Shirt`, `Phone`, `Hoodie`, `Cup`, `Kids`, `Bag`) and `GSM` options (`160`, `180`, `200`, `240 GSM`). `Color` is retained, while `Size`, `Save`, and `Buy` remain disabled placeholders; product/GSM selections do not yet alter mockups or pricing. The Header's Dark/Light toggle applies to the Editor chrome and dropdowns through the shared theme tokens; print canvas and neutral mockup preview stay stable. The row is horizontally scrollable on narrow phones and can be extended as later toolbar items are specified. The editor has a blank fixed print canvas, optional grid, independently draggable canvas and temporary Front/Back Mockup boxes, connector wires, and transient freehand strokes mirrored to each mockup. Front and Back boxes share responsive square dimensions and the same starting artwork scale. Each mockup's complete artwork overlay can be moved/resized independently. The provisional 3500 px large tier is shared and transferable: either side may claim it by growing beyond 1500 px; while one side owns it, the other is limited to 1500 px. If both are at or below 1500 px, either may claim the large tier. Reducing the owner to 1500 px or below or removing its mockup releases the tier. The numeric caps are provisional, not final print specifications. Strokes and transforms remain in page memory. This route does not instantiate Fabric.js as an object-level editor and has no Layers/Properties panel, undo/redo, serialization, browser/account draft persistence, production export, or R2 assets; `user_designs.canvas_state` is unused.

The implementation target described in this file is forward-looking. The current route must be described as a placeholder workspace, not as an object-level editor or a Photoshop-equivalent pixel editor. The previous notes about tools, Layers, text/Elements insertion, Smart Objects, masks, and local Save/restore are historical snapshots that do not match the audited source at this commit.

**Owner-directed Phone/Mobile parity (2026-11-14):** Desktop တွင် mouse/keyboard pan နှင့် wheel zoom ကို ဆက်ထိန်းထားသည်။ ဖုန်း/coarse-pointer တွင် `Pan view` ကို ဖွင့်ထားလျှင် လက်တစ်ချောင်းဖြင့် View တစ်ခုလုံးကို ရွှေ့နိုင်ပြီး၊ `+`/`−` နှင့် `Reset view` ခလုတ်များက viewport zoom/pan ကိုသာ ပြောင်းသည်။ Artwork နှင့် node အနေအထားများကို မပြောင်းပါ။ Pan mode ပိတ်ထားချိန်တွင် Canvas အတွင်း ဆွဲရေးခြင်း၊ Canvas အနားမှ node ရွှေ့ခြင်း၊ Mockup header မှ outer box ရွှေ့ခြင်း၊ Artwork bounds မှ group ရွှေ့ခြင်းနှင့် corner handle မှ resize ပြုလုပ်ခြင်းတို့ ဆက်လုပ်နိုင်သည်။ Mockup နေရာလွတ်ကို swipe လုပ်လျှင် stacked workspace ကို scroll လုပ်သည်။ ဖုန်း landscape အကျယ်တွင်လည်း touch controls နှင့် stacking မပျောက်ပါ။

ဖုန်း touch controls၊ resize/move hit area များကို 44 CSS px ခန့်ထားပြီး viewport zoom ပြောင်းလည်း လက်နှိပ်ဧရိယာကို ထိန်းထားသည်။ Pixel dimensions ကို ဖုန်းတွင် ဖတ်လို့ရသော badge ဖြင့် ပြသည်။ Primary touch တစ်ခုတည်းက drag ကို ပိုင်ဆိုင်ပြီး ဒုတိယ touch က gesture ကို အစားမထိုးနိုင်ပါ။ Editor အမြင့်တွင် bottom navigation ၏ တကယ့်အမြင့်/safe-area ကို ချန်ထားသည်။ Shared 3500/1500 px artwork tier၊ source strokes နှင့် independent transforms အလုပ်လုပ်ပုံကို မပြောင်းပါ။ Local Chromium touch emulation နှင့် regression tests ဖြင့် စစ်ဆေးထားသော်လည်း physical Android/iPhone စက်ပေါ်တွင် မစမ်းရသေးပါ။

The following broader capabilities remain future work: an editable typed document, object-level artwork operations on the source Canvas, selection/history for document objects, layer/property controls, validated serialization, browser/account persistence, production mockup rendering, AI tools, paintable masks, true pixel merge, and server-side production export.

**Direct owner instruction (2026-11-14):** Artwork mirrored from the Canvas onto each Mockup is manipulated as one whole overlay. Drag within its selection bounds to move it, and use its lower-right handle to resize it. The **provisional 3500 px large tier is shared and transferable**, not tied to Front: either side may claim it by growing beyond **1500 px**; while one side owns it, the other is limited to **1500 px**. If neither side exceeds 1500 px, either side may claim the large tier. The tier is released when its owner returns to 1500 px or below or its mockup is removed. Show live pixel dimensions while selected. Front and Back have independent overlay transforms; moving/resizing an overlay does not change the source Canvas strokes or outer Mockup box. Transforms are transient and reset when a Mockup is removed and added again.

### 3. Editor workspace and coordinate model

#### 3.1 Workspace regions

The desktop editor should have the following stable regions:

1. **Top command bar:** document name, undo, redo, history/snapshot access, zoom readout, save status, price, Save, Add to Cart, and Buy Now.
2. **Left rail:** Upload, Elements, Text, Effects, AI, and the tool palette. Tools are grouped into Select, Draw, Modify, Navigate, and Measure rather than presented as an unstructured icon list.
3. **Flyout panel:** opens beside the left rail and never changes the artboard's coordinate system. Search, categories, presets, and settings live here.
4. **Center workspace:** Keep the current print canvas blank and fixed; do not add always-visible dimension, DPI, or format badges above it. Keep the smaller canvas-options circle slightly separated from the canvas edge at its vertical midpoint on both Web/Desktop and Phone/Mobile. Its menu contains **Show Grid** and **Add Mockup**. Show Grid toggles a layout grid over the canvas and all added mockup boxes. Do not display a mockup by default. Add Mockup creates a temporary Front Mockup; place the circular Back Mockup add control at the left edge, slightly below the connector wire, between the canvas and Front Mockup. Provide a close control on each mockup. Allow the canvas and mockup boxes to move independently with pointer/touch dragging and draw connector wires from the canvas to each mockup that track movement and responsive layout. Drawing a black freehand stroke inside the canvas mirrors it live to both mockups. Per the owner's direct instruction, Front and Back mockup boxes use identical width (`min(18.25rem, 78vw)`, square aspect ratio, and common initial `0.82` artwork scale). Keep the canvas interior for drawing and drag its border to reposition it. This limited stroke preview is temporary and does not add the full sticker library/object editor or persistence. Replace the temporary boxes with Cloudflare R2-backed assets after those are supplied.
5. **Right dock:** Layers panel, contextual properties, color, typography, effects, masks, and mockup controls. The Layers box must remain mounted even when no layer is selected.
6. **Bottom attribute bar:** Product, print method, fabric, structure, GSM, color, cutting, size, and mockup attachment state. Product selection remains separate from the editor's asset browser.

**Owner-directed Mockup interaction (2026-11-14):** The full set of strokes shown on each Mockup is one independently movable/resizable artwork group, separate from the Mockup box itself and from the source Canvas drawing. Provide a visible corner resize handle and support pointer/touch dragging. Enforce one shared, provisional **3500 px** large tier and one **1500 px** small tier: whichever side grows above 1500 px owns the large tier, and the other side is capped at 1500 px. Either side may claim the large tier; it is released when its owner returns to 1500 px or below.

#### 3.2 Document coordinate system

Every design document has a document coordinate space independent of browser zoom and viewport pan:

- `documentWidth` and `documentHeight` describe the print area in design units.
- `viewportZoom`, `viewportPanX`, `viewportPanY`, and `viewportRotation` describe only how the user views the document.
- Each object stores local transform data: `x`, `y`, `width`, `height`, `scaleX`, `scaleY`, `rotation`, `skewX`, `skewY`, and `origin`.
- Front and Back are separate artboards/documents sharing the selected product attributes.
- Mockup placement uses a separate mapping transform. It must never rewrite the source artwork's document coordinates.
- All hit-testing converts pointer coordinates through `screen → viewport → document → object-local` space. This prevents browser zoom or Rotate View from corrupting print placement.

#### 3.3 Artboard and print safety

The canvas must show three non-printing regions:

- **Trim boundary:** final print-area boundary.
- **Safe area:** recommended inset where important text and logos should remain.
- **Bleed/overflow area:** optional extra artwork area for production methods that need it.

The user can toggle these overlays. They are not exported into the clean SVG/PNG production output. Product-specific print-area dimensions come from the selected Product and attribute combination, not hardcoded editor defaults.

#### 3.4 Responsive UI/UX layout contract

Current user-directed steps (2026-11-13): temporarily hide the storefront site `Header` on `/create`, while keeping the editor workspace. Prevent Ctrl/Command+wheel from zooming the browser; over the workspace it zooms the view. Pan with middle-button drag or Space+left-drag, and let unmodified wheel move the view vertically. Do not display a pixel-size label or invent physical print dimensions; product-specific print dimensions must come from product configuration. The preview boxes use responsive visual proportions from the supplied reference: a blue-outlined `T-Shirt` design box on the left, a purple-outlined `Mockup` box on the right, and a connector line with a small purple dot between them. The dot toggles the mockup box. Until real product mockup images are supplied in R2, render neutral placeholder image slots with a print-area guide; do not connect to or populate R2 now. Show one slot per available product side: Front and Back for a two-sided shirt, and only the supported side for a one-sided product. The blank `/create` editor currently defaults to Front and Back until selected-product configuration is wired. These pan gestures follow [Kittl Canvas essentials](https://help.kittl.com/editing-and-design/basic-handling) and [Kittl keyboard shortcuts](https://help.kittl.com/editing-and-design/keyboard-shortcuts). Apply only these requested behaviors; do not redesign other controls. Responsive work applies to the editor workspace: tools, asset flyout, canvas, Layers/Properties, mockup controls, and product attributes.

On **Web/Desktop**, the workspace uses a compact three-zone composition: a narrow left tool rail, an optional asset flyout, a flexible center canvas, and a right Layers/Properties dock. The right dock keeps the layer tree available without forcing a separate navigation page. Widths are constrained so the canvas remains the visual priority; long controls scroll inside their own panel instead of making the whole document scroll.

On **Phone**, the workspace is a single-column canvas-first view. The left rail becomes an icon-only 44–48px rail. Asset panels open as a bottom sheet with a rounded top edge, a visible drag/close affordance, a maximum height, and internal scrolling. Layers/Properties open as a separate bottom sheet or side overlay from a compact mobile dock; they must not permanently consume canvas width. Product attributes stay in a horizontally scrollable compact strip. The canvas must remain reachable without nested page scrolling.

All responsive panels use the same state and callbacks as desktop. Opening a sheet does not clear selection, alter document coordinates, or duplicate editor state. A sheet closes with its close button, backdrop tap where safe, or `Escape`; text inputs and file pickers keep focus until their action completes. Touch targets are at least 44px on phone, while the dense desktop panel may use smaller secondary controls. Selected, pressed, locked, hidden, loading, and disabled states must remain visible without hover.

The mobile dock exposes only the high-frequency actions: Assets, Layers, Mockup, and the active tool. Advanced properties remain inside the Layers sheet below the layer tree. The desktop header/command bar is not redesigned as part of this milestone; future header work requires a separate plan decision.

### 4. Selection architecture

Selection is the foundation for every tool. A selection is not only a Fabric active object; it is an application-level selection state that can refer to one object, many objects, anchors, path segments, a group, an artboard, or a mockup mapping.

```ts
type SelectionState = {
  kind: "none" | "object" | "multi" | "group" | "path" | "anchors" | "artboard" | "mockup";
  ids: string[];
  anchorIds?: string[];
  activeId?: string;
  sourceSide: "front" | "back";
};
```

#### 4.1 Selection rules

- Single click selects the topmost eligible object under the pointer.
- `Shift`/`Ctrl` click adds or removes an object from the selection.
- Dragging on empty canvas creates a marquee. The default marquee mode selects objects fully inside; a preference can enable intersecting selection.
- Lasso selects objects whose hit region or configured center point falls inside the lasso. The current prototype uses center-point selection; production should offer object-intersection selection.
- Clicking a layer selects the corresponding object and scrolls the canvas object into view.
- Hovering a layer highlights its canvas object, and hovering an object highlights its layer row, following the useful Kittl layer-panel relationship. [2]
- A locked object cannot become an editable active object. It may still be visible, copied as a reference, or selected through a permitted parent operation.
- A hidden object cannot be selected from the canvas, but it remains selectable from Layers for reveal/unhide.
- Group selection has two levels: select the group as one transform unit, or enter isolation mode to edit children without losing the group context.
- Double-click on text enters text-edit mode. Double-click on a group enters isolation mode unless the pointer is directly over editable text.
- `Esc` exits text edit, path edit, group isolation, or mockup edit in that order, then clears selection.

#### 4.2 Selection visual language

- Object selection: thin accent outline and transform handles.
- Multi-selection: one outer bounding box plus small member indicators.
- Path selection: visible anchors, direction handles, selected segments, and path direction.
- Locked object: lock badge, no transform handles, clear status message.
- Clipped object: clip badge and a visible relation to its base layer.
- Mockup edit: a distinct inner placement frame so users know they are moving artwork inside the mockup, not moving the mockup itself.

### 5. Move tool — first-class behavior

The Move tool is the default tool and must be the most predictable part of the editor. Photoshop's Move tool moves one or more selected layers, supports automatic layer/group selection, and uses 1 px and 10 px keyboard nudges. [11] Kittl similarly treats direct select-and-drag, right-click actions, locking, and keyboard modifiers as core canvas behavior. [1] [6]

#### 5.1 Basic Move behavior

1. Activate with the Move tool button or `V`.
2. Click an eligible object to select it.
3. Drag inside the object to move it in document coordinates.
4. Drag a selected object when multiple objects are selected to move the complete selection as one unit.
5. Click empty canvas to clear selection unless marquee drag begins.
6. Hold `Shift` while dragging to constrain movement to the dominant horizontal or vertical axis.
7. Hold `Alt/Option` while dragging to duplicate the selection and move the duplicate.
8. Hold `Space` temporarily to pan instead of moving the artwork; release Space to return to Move.
9. Arrow keys nudge by 1 design pixel/unit. `Shift + Arrow` nudges by 10. The nudge amount must be configurable for physical print units.
10. `Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z` undo and redo the complete move as one transaction, not every pointer event.

#### 5.2 Auto-select policy

The Move tool options must expose:

- **Auto-select: Off:** pointer selects only the currently selected layer or the layer explicitly chosen in Layers.
- **Auto-select: Layer:** clicking visible artwork selects the topmost eligible layer.
- **Auto-select: Group:** clicking a child selects its nearest editable group.
- **Select through transparent pixels:** off by default for raster images; when enabled, transparent pixels do not capture the click.
- **Ignore locked layers:** on by default.
- **Pick from all visible layers / current side:** current side by default, all visible layers as an explicit option.

This follows Photoshop's documented Layer versus Group auto-selection distinction while keeping MH Fashion's product workflow safer by default. [11]

#### 5.3 Move snapping and guides

During Move, the editor may show:

- artboard center and edges;
- safe-area edges;
- print-area centerlines;
- object edges, centers, and equal-spacing guides;
- Front/Back alignment guides when the same placement should be reused;
- cursor position, delta X/Y, and distance to nearby objects;
- snap-to-grid, snap-to-guides, snap-to-object, and snap-to-artboard toggles.

Illustrator's Smart Guides distinguish object guides, alignment guides, anchor/path labels, object highlighting, measurement labels, spacing guides, distance guides, construction guides, and snapping tolerance. MH Fashion should expose these as a smaller understandable set, with an Advanced toggle for detailed control. [10]

Snapping must be reversible during a gesture: hold `Ctrl/Cmd` while dragging to temporarily disable snapping, matching the modifier pattern documented by Kittl. [6]

#### 5.4 Move property editing

The contextual toolbar and right panel must support exact fields:

- X, Y position;
- W, H dimensions;
- lock/unlock aspect ratio;
- rotation;
- skew X/Y in Advanced mode;
- horizontal and vertical flip;
- align to artboard;
- align to selection;
- distribute with equal spacing;
- bring forward/backward and bring to front/send to back;
- duplicate, copy, paste, and paste in place;
- reset transform;
- convert to group or component where applicable.

Every numeric edit is a single history transaction. Invalid values are rejected with a visible message and do not partially mutate the object.

#### 5.5 Move acceptance criteria

- A locked object cannot move through the canvas, keyboard, contextual toolbar, or drag-and-drop.
- A locked ancestor locks all descendants.
- Moving a group preserves child local coordinates.
- Moving a multi-selection preserves relative distances and rotations.
- Move does not alter the object's design color or source artwork.
- Undo returns every object to its exact prior transform.
- Front/Back mockup attachment never changes source placement coordinates.
- Move works identically at 25%, 100%, and 400% viewport zoom.

### 6. Transform system

Transform must be shared by Move, Rotate, Scale, Shear, and Free Transform rather than implemented separately for each tool.

#### 6.1 Transform modes

- **Bounding-box transform:** move, scale, rotate, flip.
- **Free Transform:** independent corner movement with optional perspective/quad mode for approved mockup mapping.
- **Numeric Transform:** exact position, size, angle, skew, and origin fields.
- **Transform origin:** center by default; user can move the origin for rotation, reflection, and scaling.
- **Constrain:** Shift locks proportions/angles depending on the active gesture; an explicit toolbar toggle makes the behavior discoverable.
- **Scale from center:** `Alt/Option`.
- **Duplicate while transforming:** `Alt/Option` drag.
- **Reset Transform:** restores the saved transform baseline without deleting source artwork.

#### 6.2 Product-specific transform restrictions

The selected product may impose a print-area boundary, maximum scale, minimum legibility size, or allowed rotation. The editor should warn before export rather than silently clamp the user's artwork. Admin-configured rules can later define whether an object may cross the trim boundary.

### 7. Vector drawing system

#### 7.1 Pen tool

The Pen tool creates editable vector paths, not raster marks. Its existing path workflow supports Photoshop-like anchor basics: click places a corner point; click-drag creates a smooth Bézier point; Shift snaps the new segment to horizontal, vertical, or 45-degree directions; hovering over the first point highlights the close target; and **Close path**, **Finish**, double-click to finish an open path, and **Cancel** are available. The owner's latest direction is Photoshop-like continuity rather than a Kittl-only feel; this remains a step-by-step subset, not full Photoshop parity.

Finished Pen paths store both their SVG path data and editable anchor/handle/closed-state metadata. Double-clicking a selected Pen path enters node editing; dragging an anchor moves it, dragging a handle adjusts its curve, clicking a segment inserts a node while preserving cubic geometry, and Alt-click, focused-point Delete/Backspace, or **Delete point** removes a selected node subject to the minimum point count. Touch-sized invisible hit targets make node/handle dragging usable on phone screens. Alt-dragging a handle breaks the mirrored tangent; ordinary handle dragging keeps the opposite handle mirrored. Drawing and node edits use the existing canvas undo/redo snapshot history.

Implemented 2026-11-17: one Pen-nib cursor is used consistently on the viewport and print canvas while Pen is selected, from path start through curve drawing, Cancel, Finish/Close, and after commit. Finish/Close leaves Pen selected and ready for another path. Existing node editing remains available through Move and retains that tool's cursor; other tools' cursors are unchanged. Remaining limits: snapping to nearby unrelated objects or nodes, reuse of a blank Shape layer, and broader shape properties (dash, opacity, blend controls, advanced cap/join settings) are not implemented. Other Photoshop-specific variants or controls remain unimplemented until the owner specifies them.

Implemented 2026-11-18 (Photoshop-like Pen refinement): the cursor hotspot moved to the nib tip (`15 22`) so an anchor lands under the pen point. An Alt-drag while placing a node breaks the smooth node into a corner with only the outgoing handle (`cornerEditorPenAnchor`). Enter/Return finishes the active path and Escape discards it, both ignored while typing in a field; clicking the last placed anchor finishes the path as an open path. The Pen actions bar lists the keys. Verified with the full Node suite and headless-Chromium CDP at desktop 1280×900 (10 checks) and phone 390×844 with touch (3 checks). Still a step-by-step Photoshop-like subset, not full parity.

Implemented 2026-11-18: click-dragged anchors show paired Bézier guide lines and visible endpoint dots in the live Pen preview; committed path handles remain adjustable in the existing node-edit workflow, including Alt to break the mirrored tangent. Handle drags continue tracking pointer movement through editor redraws. The active preview uses a 1.5px stroke, and the committed Pen path uses a thin stroke at the default canvas size. Removed the “Click: corner · drag: curve · Shift: snap · click start: close” instruction and the empty idle hint panel; Finish/Close path/Cancel remain available while a path is active. Additional Photoshop-specific modes remain out of scope until the owner specifies them.

#### 7.2 Path Select and anchor editing

Path Select must have two explicit modes:

- **Path Select:** selects and transforms the whole path.
- **Direct Path Edit:** selects anchors or segments and edits only their geometry.

Direct Path Edit must support:

- select one or more anchors;
- move anchors with snapping;
- convert corner ↔ smooth ↔ symmetric anchor;
- add/delete anchors without destroying neighboring curve intent;
- move a segment;
- break, join, close, and reverse a path;
- simplify path with a preview and undo;
- convert stroke to outline as a separate destructive command with a confirmation.

The current prototype's Path Select is whole-path only, so Direct Path Edit is a production milestone rather than an existing feature.

#### 7.3 Shape Builder and Boolean operations

Add Illustrator-inspired vector construction tools:

- Shape Builder merges selected regions and removes selected regions.
- Boolean operations: Union, Subtract, Intersect, Exclude, Divide, and Outline.
- Operations preserve an editable operation record where feasible; otherwise they create an explicit derived vector object with source references in history.
- A preview highlights the region that will be added or removed before commit.
- Original source shapes remain recoverable through Undo and a non-destructive compound-shape representation.

Illustrator documents Shape Builder as a way to create complex shapes by merging and erasing simpler objects. [12]

#### 7.4 Vector color and appearance

Vector objects need separate Fill and Stroke channels. Each channel supports solid color, gradient, opacity, and swatch reference. Appearance should be represented as an ordered stack so a later implementation can support multiple strokes/fills without changing the document model.

### 8. Raster and image system

#### 8.1 Image import

Supported local input remains PNG, JPG, and WebP. Import must:

- preserve the original file bytes in the document or asset store;
- create a non-destructive image layer with a transform baseline;
- generate a thumbnail without replacing the source;
- show pixel dimensions and effective print DPI;
- warn when an image is too small for the selected print area;
- support Replace Contents while preserving the existing transform;
- support Reset Transform;
- support Rasterize only as an explicit destructive action.

#### 8.2 Pixel selection roadmap

The production editor should eventually support:

- Rectangular/Elliptical Marquee;
- Lasso and Polygonal Lasso;
- Magic Wand with contiguous/non-contiguous modes, tolerance, anti-alias, and sample-all-layers options;
- Select Subject / Remove Background through the configured AI provider;
- inverse, expand, contract, feather, and save selection;
- selection channels or named reusable selections.

The current Magic Wand is intentionally object-level for raster images. Do not describe it as pixel selection until a real pixel buffer and mask pipeline exists.

#### 8.3 Pixel editing roadmap

A later raster engine may support brush, pencil, paint bucket, clone brush, healing, blur, sharpen, dodge, burn, smudge, and pixel eraser. These operations require a tile-based or worker-backed raster surface, memory limits, progressive rendering, and a clear distinction between source image data and generated preview. They should not be simulated by deleting Fabric objects.

### 9. Layers, groups, masks, and non-destructive editing

#### 9.1 Layer tree

The layer tree is the source of truth for composition order. Each layer has:

```ts
type EditorLayer = {
  id: string;
  name: string;
  kind: "text" | "shape" | "path" | "image" | "element" | "group" | "adjustment" | "mockup";
  parentId?: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  fillOpacity?: number;
  flow?: number;
  blendMode: BlendMode;
  clipping?: boolean;
  maskId?: string;
  effects: EffectState[];
  sourceRef?: string;
  transform: TransformState;
};
```

The current implementation infers some type behavior from layer names. Production must store `kind` explicitly and migrate old drafts safely.

#### 9.2 Layer operations

Support create, rename, duplicate, delete, hide/show, lock/unlock, reorder, group, ungroup, nest, unnest, isolate, clip, link, and select. Layer reorder must use a clear insertion marker. The panel must show visibility and lock state even when the row is not hovered. Kittl's documented layer system provides a useful baseline for reorder, rename, hide, lock, group, nested artboard content, and export inclusion. [2]

#### 9.3 Lock modes

The current all-or-nothing lock remains the first production step. Later, add Photoshop-style independent locks:

- lock transparent pixels;
- lock image pixels;
- lock position;
- lock all;
- lock children through group inheritance.

A lock reason must be shown when an action is rejected: object lock, ancestor lock, product-template lock, or system/mockup lock.

#### 9.4 Masks

Implement masks as first-class non-destructive nodes:

- layer mask: grayscale alpha that reveals/hides pixels or vector render output;
- vector mask: path-based visibility boundary;
- clipping mask: upper layer uses the alpha of a lower base layer;
- group mask: masks the composited group result;
- mask link: linked mask moves with the layer; unlink allows independent movement;
- mask strength: preview opacity of the mask effect;
- edit mask mode: paint/edit mask without altering source artwork;
- invert, disable, apply, and delete mask actions with confirmations for destructive Apply.

Photoshop documents layer masks as a way to hide or reveal parts of a layer and non-destructive workflows as combinations of masks, Smart Objects, adjustment layers, and Smart Filters. [7] [13]

#### 9.5 Blend, opacity, Fill, and Flow

Keep the current panel order: Blend Mode and Opacity first; Lock and Fill second. Add Flow only in Advanced properties. Distinguish:

- **Opacity:** transparency of the complete rendered layer, including effects where applicable.
- **Fill:** transparency of the base artwork before selected effects.
- **Flow:** accumulation/intensity for brush-like operations; for non-raster objects it may remain disabled.
- **Blend mode:** how the layer or isolated group composites with the layer below.

New groups default to Pass Through. Choosing another group blend mode composites children first, then blends the group result. This matches the current MH Fashion direction and the Photoshop-style distinction between layer opacity and blending. [14]

#### 9.6 Smart Objects

The current embedded raster Smart Object metadata should become a formal source-container model:

- original source bytes or source asset key;
- source type: raster, SVG, text, or compound group;
- placement transform;
- content version;
- replace-content history;
- reset-transform baseline;
- rasterize conversion record.

Future linked Smart Objects may reference private R2 assets, but missing-link states must be explicit and must never silently render a blank layer. Photoshop documents embedded and linked Smart Objects, replacing contents, resetting transforms, and rasterizing as separate operations. [7] [15]

#### 9.7 Photoshop-style Layers box contract

The Layers box should borrow Photoshop's interaction model without copying Adobe's visual assets or proprietary implementation. The panel is a composition control surface, not merely a list of objects. Its stack order is explicit, its row state is always visible, and every destructive or non-destructive operation maps to an application-state transaction.

**Layer row anatomy:** each row contains a visibility control, an optional expand/collapse control, a thumbnail, a human-readable name, a type or group badge, and lock/mask/effect/clipping indicators. Visibility and lock are persistent row controls rather than hover-only affordances. Selecting the thumbnail/name selects the layer; double-clicking the name enters rename mode. A group row selects the group at the first level, while its disclosure control expands children without changing selection. Photoshop exposes visibility, locking, stacking, grouping, and layer selection as separate layer-panel operations. [16] [17]

**Panel header:** the header keeps the active side and item count visible. Under it, MH Fashion adds a search field and a type filter for All, Text, Shape, Path, Image, Group, Smart Object, Mask, and Effect. Filtering is presentation-only: it must never change document order, selection, visibility, export inclusion, or persisted layer data. If a group contains a matching descendant, the group remains visible as context. A clear action restores the complete tree.

**Selection and multi-selection:** clicking a row selects it; `Shift` selects a contiguous range and `Ctrl/Cmd` toggles non-contiguous rows. The application stores selected IDs separately from Fabric's active object so a panel selection remains stable when the canvas is re-rendered. A locked or hidden layer can be selected from the panel for reveal/unlock, but it cannot become an editable canvas target until the restriction is removed.

**Visibility and lock semantics:** the eye icon controls rendering only. It does not delete content and it does not change the source mark. The lock icon blocks canvas transforms, keyboard nudges, numeric property edits, reordering when the operation would violate a locked ancestor, and destructive actions. A group lock applies to descendants. When an action is rejected, the status message identifies whether the cause is the selected layer, an ancestor group, the product template, or a mockup/system layer.

**Stacking and drag behavior:** the panel renders the topmost layer first, matching the canvas compositor's order. Dragging a row displays a before/inside/after insertion marker. Dropping into a group changes `parentId`; dropping before/after changes sibling order. A group cannot be nested inside its own descendant, a content layer cannot be inserted into a locked group, and invalid drops are no-ops with an explanatory status message. Keyboard layer order commands use `Alt/Option + [` and `]` for selection movement and `Ctrl/Cmd + [` and `]` for stack movement, with MH Fashion shortcuts documented in the help surface. [18]

**Group isolation:** double-clicking a group row or group artwork enters isolation mode. The panel keeps the group context visible, dims unrelated rows, and routes canvas clicks only to the group's descendants. `Esc` exits isolation before clearing selection. Group blend mode defaults to Pass Through; choosing another mode composites children first and then blends the group result with the layer below.

**Non-destructive property strip:** Opacity applies to the complete rendered layer; Fill applies to base artwork before selected effects; Flow is reserved for brush/raster tools; Blend Mode controls compositing. Numeric changes are clamped, validated, and committed as one history transaction. The panel must never silently rasterize a vector, text, or Smart Object to make a property possible. Photoshop documents opacity and blending as layer-panel properties and distinguishes non-destructive masks, Smart Objects, and Smart Filters. [14] [19]

**Smart Object and mask affordances:** a Smart Object row shows a source badge and preserves its placement transform when contents are replaced. A mask row is represented as a child/companion node with its own selected state, visibility, density, link, disable, invert, apply, and delete commands. The first MH Fashion implementation may expose metadata and preview controls while pixel mask painting remains a later raster milestone; the UI must label that boundary instead of implying unsupported Photoshop parity. [15] [20]

**MH Fashion design adaptation:** use the existing compact right-dock language—dark text, pale surfaces, lime accent, dense but readable rows—and add Photoshop's information hierarchy rather than reproducing its desktop chrome. The row should preserve a minimum 36px hit target, keyboard focus ring, tooltip/aria label, and visible selected/hover/drop states. On narrow screens, properties collapse below the layer tree; the layer search/filter remains available.

#### 9.8 Photoshop-inspired tool behavior contract

The tool palette is organized by behavior: Select, Draw, Modify, Navigate, and Measure. The Move tool is first-class. Its options bar exposes Auto-select Off, Layer, or Group; locked-layer ignoring; current-side versus all-visible-layer scope; and optional transparent-pixel picking for raster images. Photoshop documents Layer and Group as distinct Auto Select modes, and arrow keys as layer nudges. [11] [16]

For the current Fabric object editor, these options apply to object selection and group context rather than pixel selection. Auto-select Off keeps canvas hit-testing on the selected layer; Layer selects the topmost eligible object; Group selects the nearest editable parent context. `Shift` constrains a drag to its dominant axis, `Alt/Option` duplicates on drag, `Space` temporarily pans, `Ctrl/Cmd` temporarily bypasses snapping, and `V` activates Move. A raster-only behavior is explicitly marked unavailable until the tile-based pixel engine exists.

Selection tools follow Photoshop's separation between selecting a layer/object and editing its contents. Marquee and Lasso select objects in the current milestone; later raster selections will produce masks or alpha selections rather than deleting pixels. Magic Wand remains vector color matching until a real raster selection buffer is implemented. Eraser and Clone Stamp must continue to report their object-level behavior instead of claiming pixel parity.

#### 9.9 Implementation mapping

The canonical model remains `EditorLayer[]` plus `CanvasMark[]`, with Fabric objects carrying a stable `data.id`. The Layers box owns presentation state (`query`, `filter`, collapsed groups, hover, focus, drop hint); the document owns composition state (`visible`, `locked`, `parentId`, `childIds`, `opacity`, `fillOpacity`, `flow`, `blendMode`, masks, effects, and source metadata). Canvas event handlers consult the document state before setting `selectable` or `evented`. Every row action calls `commitDocument`, so visibility, lock, reorder, group, mask metadata, and property changes share Undo/Redo and local-draft persistence.

The first implementation slice now includes Move Auto-select controls, selected-layer policy in Fabric hit testing, Layers-box search/type filtering, Shift multi-selection, bulk hide/lock actions, group-aware multi-delete, and history-backed state updates. The next slice will add contiguous range selection, group isolation, keyboard stack movement, independent lock modes, and mask companion nodes. Pixel brushes, pixel masks, and Photoshop-compatible PSD import are not implied by this plan.

#### 9.10 History and appearance implementation milestone

The editor now exposes a compact History panel in the dock. Each document transaction records a user-facing label, the current state, undo count, and redo count. Undo moves the current label to the redo branch; a new edit clears the redo branch; restoring a draft starts a fresh history session. The existing top command-bar Undo/Redo buttons and the dock buttons call the same transaction functions, so they cannot diverge.

Layer appearance controls are grouped in the Layers dock: Blend Mode uses the selected layer/group's allowed mode list, Opacity applies to the whole rendered layer, and Fill applies to base artwork while remaining disabled for groups. Numeric fields clamp to 0–100 and the expandable slider provides a touch-friendly adjustment path. Each appearance change is an undoable history transaction.

Layer rows are draggable with before/inside/after insertion feedback. Locked sources, locked targets, and locked ancestors reject a reorder without mutating document state. The drop operation preserves `parentId`, updates group `childIds`, and records a `Reorder layer` history entry. Locked rows expose a not-allowed cursor and cannot be dragged.

### 10. Text and typography system

Text must remain editable until the user explicitly converts it to outlines or rasterizes it.

#### 10.1 Text object levels

Use two levels of editing:

- **Text-box level:** transform, font family, overall size, box width/height, alignment, line height, letter spacing, fill, stroke, shadow, curve/warp, and effects.
- **Character level:** selected ranges can change font, weight, size, color, letter spacing, uppercase, underline, italic, and ligatures.

Kittl explicitly separates text-box-level and character-level editing and supports font, weight, size, letter spacing, line height, alignment, uppercase, ligatures, and transformed text. [5]

#### 10.2 Typography features

Roadmap features:

- point text and area text;
- text on path;
- curved text with live editable curve;
- arch, circle, angle, rise, wave, flag, and custom transformations;
- font search by family, style, weight, and license status;
- variable font axes where licensed fonts support them;
- paired typography presets;
- text auto-fit with minimum readable size warnings;
- outline text as a derived vector copy, preserving the original hidden text layer;
- font substitution warning when a saved design's font is unavailable.

The current prototype has heading/subheading/body insertion and basic selected-text formatting. Custom licensed fonts remain deferred until the typography/R2 phase.

### 11. Effects and appearance

Effects must be editable properties, not baked pixels, until export or explicit rasterization.

#### 11.1 Initial effects

- shadow: offset, blur, spread, color, opacity;
- stroke/outline: width, join, color, opacity;
- glow: color, size, intensity;
- blur and sharpen for raster images;
- gradient fill;
- texture overlay;
- color overlay and recolor;
- displacement/warp as a future mockup-only effect.

#### 11.2 Effect order

Each layer stores an ordered effect list. The renderer documents whether an effect acts before or after Fill, Opacity, Blend, and Mask. The UI must show a compact list with visibility toggles, reorder, duplicate, reset, and “convert to pixels” only as an explicit destructive action.

#### 11.3 Kittl-inspired text decoration

Add text decoration presets for apparel design—outline, shadow, offset, cut, stripe, and texture—but keep them represented as editable text effects. Kittl documents decoration and transformation effects that can work together while character styling remains editable. [3] [5]

### 12. Alignment, guides, rulers, and measurements

Provide a single Alignment panel for:

- align left/center/right/top/middle/bottom to artboard;
- align selected objects to each other;
- distribute horizontal and vertical spacing;
- tidy three or more objects;
- equal width/height;
- center in print area;
- match Front placement to Back where allowed.

Kittl's alignment model distinguishes one object aligned to the artboard from multiple objects aligned to each other and offers equal spacing for three or more objects. [4]

The Ruler tool remains a non-printing measurement overlay. Production adds persistent guides, guide labels, unit switching, angle/distance readouts, and measurement annotations that can be saved as non-printing document metadata.

### 13. Mockup and product preview system

#### 13.1 Mockup object model

A mockup is a linked preview node with:

- source product/style/color/angle;
- placement zone or panel mapping;
- artwork source side and layer filter;
- transform or perspective mapping;
- color/recolor parameters;
- render status and asset version.

The source design remains independent. Updating the design refreshes every attached mockup.

#### 13.2 Apparel and jersey behavior

- T-shirt/hoodie: design is clipped to the selected print zone and composited over the product mockup.
- Front and Back are separate source sides. Front placement copies to Back only when print-area types match.
- Jersey: panel-based SVG zones map front-left, front-right, back, sleeves, collar, and any future panels. MVP uses perspective warp; displacement maps are later.
- Product color changes update all attached compatible mockups, but never recolor the design artwork itself.
- Mockup edit mode moves/scales the design inside the mapped frame. Selecting the mockup itself edits mockup properties.

Kittl's documented mockup workflow also keeps the design linked to the selected artboard, allows repositioning/scaling inside the mockup, separates mockup color from artwork color, and supports multiple mockups with a shared source design. [3]

#### 13.3 Commerce gate

Add to Cart and Buy Now remain disabled until:

1. a valid Product and required attributes are selected;
2. a valid print area is selected;
3. the mockup attachment is complete;
4. artwork passes size, overflow, and unsupported-font checks;
5. a production export can be generated or queued.

### 14. Export and production handoff

#### 14.1 User export

Provide Quick Export for the current selection and a full Export panel for production settings. Kittl distinguishes quick selection export from full export settings such as size, DPI, format, color, transparency, and multiple artboards. [6]

Supported targets:

- transparent PNG for preview and digital use;
- SVG for clean vector artwork;
- PDF for print handoff when the print workflow supports it;
- JPEG only when transparency is not needed;
- mockup PNG/JPEG for storefront preview;
- ZIP for multiple sides, colorways, or mockups.

#### 14.2 Production export package

The production worker/exporter must produce:

```text
order-export/
  manifest.json
  front.svg
  back.svg
  panels/*.svg
  previews/front.png
  previews/back.png
  mockups/*.png
  coordinates.json
  warnings.json
```

`manifest.json` records Product, Fabric Type, Knit Structure, GSM, Print Method, Cutting, Color, Size, document dimensions, export version, source design ID, font IDs, and asset checksums. `coordinates.json` records clean SVG placement coordinates per print location. No browser-only preview transform should be accepted as production coordinates without conversion and validation.

#### 14.3 Export validation

Before export:

- verify all referenced assets are available;
- verify fonts are licensed/embedded or converted according to policy;
- flag raster images below effective DPI threshold;
- flag artwork outside the allowed print region;
- flag unsupported blend/effect features that cannot be represented in clean SVG;
- verify front/back and panel IDs;
- render a thumbnail and compare it with the editor preview;
- store export version and warnings for Print Admin.

### 15. Keyboard and pointer conventions

Use familiar shortcuts where they do not conflict with browser behavior:

- `V` Move/Selection;
- `T` Text;
- `P` Pen;
- `H` Hand;
- `Z` Zoom;
- `I` Eyedropper;
- `R` Rectangle/Shape;
- `E` Eraser;
- `Ctrl/Cmd + Z` Undo;
- `Ctrl/Cmd + Shift + Z` Redo;
- `Ctrl/Cmd + D` Duplicate;
- `Ctrl/Cmd + G` Group;
- `Ctrl/Cmd + Shift + G` Ungroup;
- `Ctrl/Cmd + S` Save;
- `Ctrl/Cmd + E` Export;
- `[` / `]` move layer backward/forward;
- `Shift + [` / `Shift + ]` send to back/bring to front;
- `Space + drag` pan;
- `Alt/Option + drag` duplicate;
- `Shift + drag` constrain;
- `Alt/Option + scroll` zoom;
- `Esc` exit current edit mode.

The shortcut panel must be searchable, show Mac and Windows variants, and explain conflicts. Kittl's official shortcut list provides a practical baseline for editor, view, layer, arrangement, text, and modifier shortcuts. [6]

### 16. Undo, redo, history, and persistence

Every user-visible mutation is a command with:

```ts
type EditorCommand = {
  id: string;
  type: string;
  timestamp: number;
  side: "front" | "back" | "document";
  targetIds: string[];
  before: SerializedEditorState;
  after: SerializedEditorState;
  description: string;
};
```

Rules:

- pointer drags coalesce into one command on pointer-up;
- text typing coalesces by short idle interval, with an explicit commit on blur;
- layer reorder, visibility, lock, mask, effect, and transform each create one command;
- undo never writes a partially restored canvas;
- redo is invalidated after a new mutation;
- snapshots are named read-only restore points;
- browser-local Save remains available, but account-backed Save becomes the production source of truth;
- autosave uses a debounced local draft and later a server draft with conflict/version checks.

### 17. Accessibility and safety

- Every tool has a tooltip, shortcut, keyboard focus state, and plain-language status message.
- Color-only state must also have an icon, label, or pattern.
- Locked, hidden, clipped, masked, and unavailable objects must be distinguishable without relying on color alone.
- Keyboard users can navigate rail, flyout, Layers, properties, and canvas selection.
- Destructive actions—Rasterize, Apply Mask, Outline Text, Merge, Delete Layer—require an explicit confirmation or an immediately recoverable history command.
- Disable page zoom shortcuts and Ctrl/Cmd+wheel browser zoom on the website, and suppress page-level right-click/context menus. Keep unrelated shortcuts working, preserve mobile touch pinch zoom, and make site actions available through visible controls and keyboard paths. Browser chrome menus and toolbar zoom remain outside website control.
- Terms acceptance, watermark, copyright responsibility, and user-content policy remain required before first use.

### 18. Implementation phases

#### Phase E0 — First usable shared editor (Web + Phone)

- The verified `/create` route is a shell, so build the actual Fabric.js canvas and shared per-side document state; do not assume an existing object model or local draft behavior.
- Deliver the owner-requested initial artwork operations and responsive controls described in §6 on both Web/Desktop and Phone/Mobile, preserving one selection/document/history state across desktop panels and phone sheets.
- Hide the global mobile navigation and remove its reserved bottom-page spacing on `/create`; keep the full-height editor canvas and phone dock inside the viewport.
- Centralize document-to-viewport coordinate conversion and transform commands so pan/zoom never modify artwork coordinates.
- Add editor-specific tests for insertion, selection/move, transform conversion, undo/redo, local save/restore, Front/Back, and responsive state parity. Keep broader selection, lock inheritance, layer reorder, export, and advanced tools in later phases.
- Add the searchable shortcut/help panel after the core editor flow is usable.

#### Phase E1 — Professional Move and selection

- Auto-select Layer/Group modes.
- Multi-select, marquee intersection preference, lasso intersection mode.
- 1/10 unit nudges, exact X/Y/W/H/rotation fields.
- Snap toggles, guides, spacing readouts, align/distribute panel.
- Transform origin, constrained scale, duplicate-on-drag, flip, and reset transform.

#### Phase E2 — Vector precision

- Direct Path Edit and anchor handles.
- Add/delete/convert anchors and segment operations.
- Shape Builder and Boolean operations.
- Separate fill/stroke appearance model.
- Text on path and vector outline conversion with original-text preservation.

#### Phase E3 — Layers and non-destructive effects

- First-class masks and editable mask mode.
- Full lock modes, linked layers, group isolation, and layer search/filter.
- Formal Smart Object container and replace-content UI.
- Effect stack, effect ordering, mask-aware effects, and export warnings.

#### Phase E4 — Raster production engine

- Worker/tile-backed pixel buffer.
- Real pixel selections, paintable masks, pixel eraser, clone brush, and raster filters.
- AI Remove Background and Upscale for uploaded photos.
- Memory/performance limits and progressive rendering.

#### Phase E5 — Product, mockup, and export production

- Private R2 assets and same-origin asset routes.
- Production mockup mappings for T-shirt, hoodie, streetwear, and jersey panels.
- Clean SVG and print export worker.
- Export manifest, coordinates, warnings, previews, and Print Admin handoff.
- Supabase Auth, account-backed designs, saved versions, and design limits.

#### Phase E6 — Collaboration and advanced automation

- Server draft versions and conflict resolution.
- Comments/review states.
- Multi-artboard design sets and colorway variations.
- Batch mockup/export.
- AI-assisted layout, recolor, background removal, and image generation, each with explicit point cost and user confirmation.

### 19. Definition of done for the production editor

The editor is production-ready only when all of the following are true:

- Move, selection, snapping, exact transforms, and keyboard nudges are deterministic at every viewport zoom.
- Every object mutation is undoable, restorable, and serialized without losing source data.
- Vector paths remain editable; raster images remain replaceable; text remains editable until explicitly outlined.
- Masks, clipping, opacity, Fill, Blend, groups, and effects render consistently in canvas preview, mockups, and production export.
- Locked and hidden objects cannot be accidentally edited or exported incorrectly.
- Front, Back, and jersey panel coordinates pass print-area validation.
- Production export has a manifest, clean artwork, preview, coordinates, warnings, and reproducible version metadata.
- Account-backed drafts, R2 asset access, role checks, and order linkage are secure before public launch.
- Automated tests cover the editor's state machine and critical pointer/keyboard flows.
- The editor can explain every unsupported feature instead of silently producing an inaccurate print file.

### References

[1]: https://help.kittl.com/editing-and-design/basic-handling "Kittl Canvas essentials"
[2]: https://help.kittl.com/editing-and-design/using-layers "Kittl Use layers"
[3]: https://help.kittl.com/editing-and-design/mockup-generator "Kittl Use the mockup generator"
[4]: https://help.kittl.com/editing-and-design/alignment "Kittl Align elements"
[5]: https://help.kittl.com/editing-and-design/text-settings-editing "Kittl Edit and style text"
[6]: https://help.kittl.com/editing-and-design/download-settings "Kittl Export your design"
[7]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html "Photoshop Non-destructive editing techniques"
[8]: https://helpx.adobe.com/illustrator/using/tools-in-illustrator.html "Illustrator Tools in Illustrator"
[9]: https://helpx.adobe.com/illustrator/using/tool-techniques/pen-tool.html "Illustrator Draw shapes and paths using the Pen tool"
[10]: https://helpx.adobe.com/illustrator/desktop/measure-and-align/grids-and-guides/smart-guides-options.html "Illustrator Smart Guides options"
[11]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Photoshop Reorder and move layers"
[12]: https://helpx.adobe.com/illustrator/using/creating-shapes-shape-builder-tool.html "Illustrator Create shapes using the Shape Builder tool"
[13]: https://helpx.adobe.com/photoshop/desktop/create-masks/layer-masks/add-layer-masks.html "Photoshop Add and edit layer masks"
[14]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html "Photoshop Set layer opacity and blending modes"
[15]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html "Photoshop Smart Objects overview and benefits"
[16]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Photoshop Reorder and move layers"
[17]: https://helpx.adobe.com/il_en/photoshop/using/create-layers-groups.html "Photoshop Create layers and groups"
[18]: https://helpx.adobe.com/cn/photoshop-elements/desktop/keyboard-shortcuts/keys-layers-panel.html "Photoshop Layers panel keyboard shortcuts"
[19]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html "Photoshop Set layer opacity and blending modes"
[20]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/create-embedded-smart-objects.html "Photoshop Create embedded Smart Objects"
[21]: https://www.canva.com/help/finding-and-arranging-layers/ "Canva Finding and arranging layers"
[22]: https://www.canva.com/help/brand-kit/ "Canva Set up Brand Kits"
[23]: https://help.kittl.com/editing-and-design/pen-tool "Kittl Use Pen tool"
[24]: https://help.kittl.com/editing-and-design "Kittl Editing and design"


### Appendix A — Fabric.js implementation logic

This appendix converts the product behavior above into a concrete Fabric.js 7.4.0 implementation strategy. The examples are TypeScript-oriented pseudocode: names may be adapted to the existing `FabricDesignCanvas.tsx`, but the state boundaries and event ordering should remain stable.

#### A.1 Fabric object and application-state contract

Fabric objects are the rendering and pointer-interaction layer; `CanvasMark[]` and `EditorLayer[]` remain the application source of truth. Do not use Fabric's internal object index or object identity as a persisted layer ID. Every editable Fabric object must carry a stable application record:

```ts
type FabricData = {
  id: string;                 // same ID as CanvasMark and EditorLayer
  side: "front" | "back";
  kind: "Text" | "TextOnPath" | "Shape" | "Pen" | "Image" | "Element" | "Clone";
  layerId: string;
  sourcePathId?: string;      // TextOnPath -> linked guide path
  transient?: boolean;        // overlays are never persisted
};

type TransformState = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  skewX: number;
  skewY: number;
  originX: "left" | "center" | "right";
  originY: "top" | "center" | "bottom";
};
```

`CanvasMark` stores normalized document values for persistence, while Fabric stores scene-space values for rendering. The conversion must be centralized:

```ts
function markToFabric(mark: CanvasMark, fabric: typeof import("fabric")) { /* ... */ }
function fabricToMark(object: FabricObject, previous: CanvasMark): CanvasMark { /* ... */ }
```

The conversion must include `left`, `top`, `scaleX`, `scaleY`, `angle`, `skewX`, `skewY`, `originX`, and `originY`. Do not reconstruct a transform only from a bounding rectangle: doing so loses rotation, skew, and the difference between object dimensions and scaled dimensions.

Every object inserted into a canvas receives `object.data = { id, side, kind, layerId }`. Every object rebuilt from state receives the same data before it is added to the canvas. `data` is used for lookup only; serialized state is still generated from the application model so transient Fabric controls, clip previews, and selection objects cannot leak into drafts.

#### A.2 Move tool state machine

The Move tool should have an explicit gesture state instead of relying on scattered booleans:

```ts
type MoveGesture = {
  phase: "idle" | "pressed" | "dragging" | "duplicating";
  pointerId?: number;
  startScene: Point;
  lastScene: Point;
  startTransforms: Map<string, TransformState>;
  activeIds: string[];
  duplicateIds?: string[];
  startedAt: number;
  historyCommitted: boolean;
  snapDisabled: boolean;
  axis?: "x" | "y";
};
```

The state machine is important because `mouse:move` fires many times. The editor must not push one history entry or React state update for every pointer event. On pointer-down, capture the selected objects' starting transforms. During pointer-move, update Fabric objects for immediate feedback. On pointer-up, serialize the final transforms once and commit one command.

Recommended event flow:

1. `mouse:down` receives a `TPointerEventInfo<...>` and converts the browser pointer into scene coordinates with `canvas.getScenePoint(event.e)`. This is the correct coordinate source when viewport zoom/pan is active; do not use raw `offsetX`/`offsetY`.
2. Resolve the target object using the active Auto-select policy. Ignore `transient`, hidden, locked, and locked-ancestor objects. If the target is different from the current selection, update the application selection before starting a drag.
3. Create `MoveGesture` with the selected object IDs and exact starting transforms. Store a deep copy; a reference to mutable Fabric values is not sufficient for undo.
4. If `Alt/Option` is pressed, clone the selected marks and layers once, assign new IDs, attach cloned Fabric objects, and switch the gesture to `duplicating`. The original selection must remain unchanged.
5. Set `phase = "pressed"`. Do not yet write a history command. A click without meaningful movement should only select.
6. On `mouse:move`, calculate `sceneDelta = currentScene - startScene`. Divide by viewport scale only if the chosen scene coordinate API returns viewport coordinates; never divide twice. Apply axis constraint, snapping, and group transform to the starting values.
7. Write the preview transforms directly to the Fabric objects, call `setCoords()` on each, and call `canvas.requestRenderAll()`. React state may be throttled with `requestAnimationFrame`; the source model should not be rewritten on every raw event.
8. Once movement exceeds a small scene-space threshold, for example 2 document units, change to `dragging` and show the contextual delta/guide overlay.
9. On `mouse:up`, finalize the transforms from Fabric, convert them to `CanvasMark` values, update `EditorLayer.transform` if the layer model owns the transform, and push one `EditorCommand` containing all affected IDs. Clear the gesture and transient guides.
10. If the pointer leaves the canvas, use pointer capture or a window-level pointer-up listener so a drag cannot remain stuck in `dragging` state. Cancel safely on `Escape` by restoring `startTransforms` and removing duplicate objects if a duplicate gesture was active.

Use Fabric's selection events only to synchronize selection, not to implement the entire Move gesture:

```ts
canvas.on("selection:created", syncSelection);
canvas.on("selection:updated", syncSelection);
canvas.on("selection:cleared", clearSelection);
canvas.on("object:moving", renderMovePreview);
canvas.on("object:modified", commitFabricModification);
```

`object:modified` is useful for handle-based scale/rotate operations, but it must not create a second history entry after a custom Move gesture has already committed one. Keep a `suppressModifiedCommitRef` or a gesture transaction ID. The same transaction guard is required when application state re-renders Fabric objects after a drag.

#### A.3 Selection and locked-object guards

Centralize all edit permission checks. Do not duplicate slightly different lock checks in Move, Text on Path, Layers, and the toolbar:

```ts
function canEditObject(
  object: FabricObject,
  layers: EditorLayer[],
): { ok: true; layer: EditorLayer } | { ok: false; reason: string } {
  const id = (object as DataObject).data?.id;
  let layer = findLayer(layers, id);
  if (!layer) return { ok: false, reason: "This artwork is not editable" };
  while (layer) {
    if (!layer.visible) return { ok: false, reason: "This layer is hidden" };
    if (layer.locked) return { ok: false, reason: "This layer or its parent is locked" };
    layer = layer.parentId ? findLayer(layers, layer.parentId) : undefined;
  }
  return { ok: true, layer: findLayer(layers, id)! };
}
```

A locked object may still be visible and should be able to participate in a selection marquee as a non-editable candidate only if the user enabled “show locked in selection.” It must never receive Fabric transform controls. Set `object.selectable = false`, `object.evented = false`, and render a lock indicator in the layer row/overlay. When a locked target is clicked, do not silently select a different object underneath; show “Layer locked” and allow the user to choose the underlying object deliberately with the documented selection-through behavior.

For multi-selection, filter out locked members before constructing `fabric.ActiveSelection`. If the user selects a mix of editable and locked objects from Layers, either keep the locked objects as non-transforming members with a clear warning or reject the group transform. The first production version should reject the transform rather than produce a partial, surprising move.

#### A.4 Move coordinate, snapping, and group math

All Move calculations happen in document scene space. The algorithm is:

```ts
const rawDelta = subtract(currentScene, gesture.startScene);
const constrained = constrainAxis(rawDelta, nativeEvent.shiftKey);
const delta = nativeEvent.metaKey || nativeEvent.ctrlKey
  ? constrained
  : snapDelta(constrained, snapContext);
```

`snapDelta` must compare candidate positions derived from the starting geometry, not the already-snapped preview. Otherwise repeated pointer events can accumulate rounding error. Candidates include each selected object's left/center/right and top/center/bottom against artboard, safe-area, guide, and nearby object candidates. Use a tolerance in document units derived from a screen-pixel preference:

```ts
const toleranceScene = snapToleranceScreenPx / currentViewportZoom;
```

For a group or ActiveSelection, calculate the selection bounds once at gesture start. Apply one snapped delta to every member so relative distances remain exact. Do not snap each child independently. For nested groups, transform the group's parent coordinate and preserve each child's local transform.

When a group has rotation, use the group's scene-space bounding box for guides but apply translation in scene space. Translation should not modify child angle, scale, skew, or local coordinates. When exact numeric X/Y is entered, bypass visual snapping and write the requested document coordinate directly.

#### A.5 Move preview versus committed state

During drag, Fabric is the low-latency preview surface. The React model is committed at gesture boundaries. This avoids a feedback loop where `onMarksChange` causes the canvas effect to remove and recreate objects during a pointer drag. The existing `callbacksRef` pattern is appropriate: keep current callbacks and settings in a ref, while the Fabric event listeners are installed once.

On commit:

```ts
const before = serializeTransforms(gesture.startTransforms, gesture.activeIds);
const after = serializeFromFabric(gesture.activeIds);
if (!sameTransform(before, after)) {
  onMarksChange(applyTransforms(callbacksRef.current.marks, after));
  pushHistory({ type: "move", targetIds: gesture.activeIds, before, after });
}
```

Use a numeric epsilon when comparing floating-point values, but persist rounded values consistently, for example to 1/100 document unit. The displayed position may be rounded; the internal transform must not be repeatedly rounded during the drag.

#### A.6 Keyboard Move implementation

Attach one document-level keydown handler while the editor is focused, but ignore it when an input, textarea, select, or active text-editing Fabric object owns the event. For a selected editable object:

```ts
const step = event.shiftKey ? 10 : 1;
const delta = {
  x: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
  y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
};
```

Apply one nudge command per keydown. If key repeat is enabled, coalesce repeated nudges within a short interval into one history command while still rendering each step. `Alt/Option + Arrow` may use a configurable fine step later; do not overload it until the shortcut is documented.

`V` changes the active tool only when the user is not typing. `Space` temporarily enables pan and must not be interpreted as a text-space insertion outside Fabric text-edit mode. `Escape` cancels active transformation first, then exits group/path/text editing, then clears selection.

#### A.7 Fabric Text on Path architecture

Fabric.js provides `Text`, `IText`, and `Textbox`, but a production-grade editable text-on-path feature should not depend on a browser-only SVG `<textPath>` as the persisted source. SVG textPath support varies across export/render paths, and a collection of independent character objects creates too many layers and makes editing/selection awkward.

Use three linked records:

```ts
type TextOnPathMark = CanvasMark & {
  kind: "TextOnPath";
  text: string;
  pathId: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  fill: string;
  charSpacing: number;       // Fabric-style 1/1000 em units
  startOffset: number;       // document units along path
  alignment: "left" | "center" | "right";
  baselineOffset: number;    // perpendicular distance from path
  side: "normal" | "reverse";
  pathStart: number;
  pathEnd?: number;
  keepUpright: boolean;
};

type TextPathLink = {
  textId: string;
  pathId: string;
  visibleInExport: boolean;
  showGuideWhenSelected: boolean;
};
```

The guide path is a normal editable `fabric.Path` with its own stable ID and layer. The text object is a custom `FabricTextOnPath` display object with the text mark in `object.data`. The guide path may be hidden in normal preview and shown when the text or path is selected. The guide path is not merged into the text layer and is excluded from clean export unless the user explicitly requests “include guides.”

#### A.8 Custom FabricTextOnPath rendering

Implement `FabricTextOnPath` as a custom `FabricObject` or a carefully isolated subclass of `Fabric.Text`. It should own the source string and typography properties, but render glyphs along the flattened path in `_render(ctx)`.

The render pipeline is:

1. Resolve the linked guide path by ID from a path registry. If the path is missing, render the text in a visible error state and add an export warning; never silently place it at the origin.
2. Convert the Fabric path commands into a flattened polyline/arc-length table. Each sample stores `{ distance, x, y, tangentAngle }`. Cache this table by `pathId + pathGeometryVersion`.
3. Use the browser canvas context or Fabric's text measurement logic to measure each grapheme cluster, not each UTF-16 code unit. This avoids breaking emoji, combining marks, and some Myanmar text sequences.
4. Add letter spacing after each measured glyph according to the documented unit conversion. For Fabric-style `charSpacing`, use the same conversion as the selected font renderer and keep it in the mark so re-rendering is deterministic.
5. Compute total line width. For `left`, begin at `startOffset`; for `center`, begin at `startOffset - width / 2`; for `right`, begin at `startOffset - width`. Clamp or warn if the text exceeds `pathStart/pathEnd`.
6. For each glyph, find the midpoint distance on the path, interpolate its point and tangent, and calculate the baseline position using `baselineOffset` along the path normal.
7. Save the context, translate to the glyph point, rotate by tangent angle, flip by 180 degrees for reverse side, and draw the glyph at its local baseline. Restore the context for the next glyph.
8. Apply Fabric fill, stroke, opacity, shadow, and blend properties consistently. Effects that depend on a single continuous text outline may require a raster/vector export fallback warning.
9. Render a selection outline and path guide only when selected. These are transient overlays and must never become part of the exported artwork.

A simplified renderer shape is:

```ts
_render(ctx: CanvasRenderingContext2D) {
  const layout = this.getGlyphLayout();
  ctx.save();
  applyFabricPaint(ctx, this);
  for (const glyph of layout) {
    ctx.save();
    ctx.translate(glyph.x, glyph.y + glyph.normalX * this.baselineOffset);
    ctx.rotate(glyph.angle + (this.side === "reverse" ? Math.PI : 0));
    drawGlyph(ctx, glyph.text, -glyph.width / 2, 0, this.keepUpright, this.side);
    ctx.restore();
  }
  ctx.restore();
}
```

The real implementation must account for the font's ascent/descent, italic overhang, stroke width, shadow padding, retina scaling, and the text object's own transform. The guide path is evaluated in document space first; the Fabric object's transform is applied after the glyph positions are calculated. This makes moving, rotating, and scaling the whole text-on-path object predictable.

#### A.9 Text on Path editing behavior

The user experience should have two modes:

- **Text edit mode:** double-click the text; show an HTML/Fabric text editor or a hidden `IText` proxy for caret, selection, IME, and keyboard input. The proxy is not the visual export object. Changes update `TextOnPathMark.text` and invalidate glyph layout.
- **Path edit mode:** select the guide path with Path Select/Direct Path Edit; the text follows the path in real time. Anchor edits are one history transaction on pointer-up, and the linked text remains selected as a dependent preview if the user enabled that option.

The right panel must expose text, font, weight, size, fill, stroke, letter spacing, alignment, start offset, baseline offset, normal/reverse side, and keep-upright. Add handles on the guide path for:

- start offset;
- center/anchor position;
- baseline offset;
- path end clamp;
- reverse direction.

Dragging a start-offset handle changes only `startOffset`, not the path or text transform. Dragging the baseline handle changes only `baselineOffset`. Moving the whole selected text object changes its object transform and keeps the text-to-path relationship intact. Moving the guide path changes the path and therefore moves the text, but the text object's own transform remains unchanged.

For circular or closed paths, normalize distances modulo total path length. For open paths, clamp to the available path range and show an overflow warning. A `keepUpright` option should flip glyphs when the tangent would make text upside down; the user can disable it for artistic reverse lettering.

Do not silently support multiline Text on Path in the first version. Either convert line breaks into a new separate path-linked text object or reject them with a clear message. A later version can support multiple baselines using one path per line or an offset curve.

#### A.10 Text on Path persistence and serialization

A Text on Path draft must serialize the text and guide path independently:

```ts
{
  id: "text-path-123",
  kind: "TextOnPath",
  text: "MH FASHION",
  pathId: "path-456",
  fontFamily: "Arial",
  fontSize: 32,
  charSpacing: 0,
  startOffset: 12,
  baselineOffset: 0,
  alignment: "center",
  side: "normal",
  pathStart: 0,
  keepUpright: true,
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  angle: 0
}
```

On restore, load all paths before dependent Text on Path objects, build the path registry, then create text objects. If a path is missing, retain the text mark and its `pathId`, render a non-printing missing-path badge, and block production export until the user repairs or removes the link. Draft migration must preserve ordinary `Text` marks as ordinary text; never reinterpret an old text mark as Text on Path because its name contains “path.”

Fabric's own `toObject()` may be used for debugging or a temporary browser draft, but the canonical MH Fashion serializer must explicitly include `pathId`, typography, offsets, side, and link metadata. Transient guide overlays, HTML editing proxies, and cached glyph tables must be excluded.

#### A.11 Text on Path undo/redo transactions

Use separate command types so history descriptions are meaningful:

- `text-path-create`: text and guide path created together;
- `text-path-edit-text`: source string changed;
- `text-path-edit-style`: font, size, fill, stroke, spacing, or alignment changed;
- `text-path-move-offset`: start/baseline offset changed;
- `path-modified`: guide geometry changed and dependent text reflowed;
- `text-path-unlink`: text converted to ordinary text at its current visual placement;
- `text-path-delete`: linked text or guide deleted with a recoverable relationship record.

Typing should coalesce into one command after a short idle period. Dragging a path or offset handle should commit once on pointer-up. Undoing a path edit restores the path geometry and automatically re-renders every dependent text mark. Deleting a guide path must not silently delete text; offer “unlink and keep text,” “delete linked text,” or “cancel.”

#### A.12 Text on Path export logic

For SVG export, generate a standards-compliant `<path>` and `<textPath>` only when the export renderer can preserve the selected font, direction, baseline offset, and effects. Otherwise, convert the glyph layout to vector outlines or a high-resolution raster fallback according to the print method, and record the conversion in `warnings.json`.

For PNG/mockup export, render the same glyph layout used by the Fabric preview onto an offscreen canvas at the requested export scale. Do not screenshot the browser canvas at its current zoom. The export renderer must use document dimensions and export scale, then apply the mockup mapping separately.

A clean production export must never include the editing guide path, selection controls, start-offset handles, missing-path badge, or text editing proxy. If the guide is intentionally part of the artwork, the user must duplicate/convert it to an ordinary visible path layer first.

#### A.13 Fabric performance rules

- Cache flattened path samples and invalidate them only when the guide path geometry, scale, or relevant transform changes.
- Do not create a Fabric object per glyph for normal editing; use one custom Text on Path object.
- Render guides and measurement labels as transient objects in a separate overlay collection.
- Batch `requestRenderAll()` through `requestAnimationFrame` during pointer moves.
- Avoid calling `canvas.loadFromJSON()` for every React state update; update existing objects in place when IDs and kinds match.
- Use `object.setCoords()` after transform changes and before hit-testing or selection bounds are read.
- Keep `callbacksRef.current` current, as in the current prototype, so Fabric listeners do not close over stale React state.
- Mark linked dependents dirty when a path changes, but recalculate their layout lazily if they are outside the viewport.
- Add a maximum text length/path sample budget and show a non-destructive warning for unusually large designs.

#### A.14 Implementation test matrix

The Move tool tests must cover single object movement, multi-selection, group movement, locked object rejection, locked ancestor rejection, Auto-select Layer/Group, Alt duplication, Shift axis constraint, Ctrl/Cmd snap bypass, arrow nudges, undo/redo, pointer cancellation, zoom 25/100/400%, rotated viewport, hidden layers, and Front/Back isolation.

Text on Path tests must cover creation from an open path, creation from a closed path, left/center/right alignment, start and baseline offsets, reverse side, keep-upright behavior, font/size/spacing changes, Unicode grapheme clusters, text editing through the IME proxy, path anchor movement, path deletion/unlink, missing path restore, undo/redo, SVG export, PNG export, mockup export, and exclusion of guide/selection overlays.

A visual regression fixture should render the same document at 25%, 100%, 400%, 1x export, and 4x export. The glyph positions and object transforms should remain identical in document coordinates. A serialization round-trip test must compare the canonical `CanvasMark`/`EditorLayer` state before and after Fabric reconstruction, not merely compare screenshots.

#### A.15 Recommended implementation order

1. Extract transform conversion and edit-permission helpers from `FabricDesignCanvas.tsx`.
2. Add a `useFabricEditorController` or equivalent controller module for gesture transactions, selection synchronization, and history boundaries.
3. Finish Move tool snapping, exact fields, duplicate-on-drag, keyboard nudging, and transaction guards.
4. Add explicit `kind: "TextOnPath"` and `pathId` to the canonical mark schema and add migration tests.
5. Implement path flattening, glyph layout, and a custom Text on Path renderer with a hidden `IText` editing proxy.
6. Add offset/path handles, path dependency invalidation, serialization, and undo/redo commands.
7. Add SVG/PNG export parity and missing-path/export warning behavior.
8. Add performance and visual regression tests before enabling the feature for production users.

Until steps 4–7 are complete, the editor should label Text on Path as experimental and should not promise editable text-on-path production export. Until steps 1–3 are complete, Move should remain the only default selection tool and numeric transform edits should continue to use the existing guarded application-state path.


---

## Appendix B — roadmap detail per item

**Rewritten:** 2026-11-21, on the owner's instruction *"Editor ထဲ doc အတိုင်း Editor Plan ကို ပြန်ရေးထားပါ"*.

**Source:** `Doc/KITTL_CANVAS_EDITOR_AUDIT.md` — the Kittl canvas audit of 2026-11-15. That document
stays the reference for what Kittl does and for its help-page citations; this section is the plan
derived from it, kept current against the code.

**Authority:** writing a plan authorises no code. §19 keeps the owner's decision that the editor is
final as built, so an item here ships only when the owner approves that item, and the six decisions in
B4 are the owner's to make. Where this appendix and §1–§19 disagree, §1–§19 win.

### B1. What the audit concluded

The present layer model is the right base. Layer objects, the Layers panel, group/ungroup, links,
content-derived selection bounds, eight resize handles, a rotate handle, the mask brush, the Text tool
and the Text adjustment panel already carry most of Kittl's canvas workflow, so those interactions can
be extended rather than replaced.

Six areas do not fit the present data model and need it to grow first: character-level text
formatting, text box geometry and wrapping, text transformation and effect stacks, glyph/ligature
controls, vector node editing and clipping, and artboard nesting. §2 records how much of that has
shipped since the audit was written — wrapping, the effect stack and node editing have, the rest has
not. The audit also lists the
project-level systems it puts out of reach — real-time collaboration and version history — and asks
for an owner decision before any of them is started.

### B2. Verified state (audit item → today)

Checked against the source on 2026-11-21; the audit predates several of these.

| Audit item | Today | Evidence |
|---|---|---|
| Content-derived selection bounds | built | `editorTextCanvasBounds`, `layerCanvasBounds` in `lib/editor-layers.ts` |
| Eight resize handles, aspect behaviour | built | `[data-resize-handle]` `top-left` … `bottom-right` in `KittlCanvas.tsx` |
| Rotate handle, per-layer and per-group rotation | built | rotate handle below the bounds in `KittlCanvas.tsx`; `snapEditorRotationDelta` in `lib/editor-transform.ts` |
| Group transform versus child transform | built | group selection uses the union of child bounds |
| Linked-layer transform | built | `Link Layers` action; links move and resize together |
| Text tool click-to-type, return to Move | built | inline `foreignObject` editor; `commitEditingText` switches back |
| Text adjustment sections, live style updates | built | `EditorAdjustmentsPanel.tsx` |
| Layers reorder, rename, hide, lock, group, ungroup | built | `EditorLayersPanel.tsx` (drag rows, folder groups) |
| Foreground/background mask painting | built | mask target + brush painting in `KittlCanvas.tsx` |
| Layer ↔ canvas selection sync | partial | canvas → panel works; hover highlighting does not exist |
| Alignment to the print canvas, tidy/distribution | missing | no alignment or distribute helpers anywhere in `lib/` or the panel |
| Collapsible adjustment sections | built | `EditorAdjustmentsPanel.tsx` sections |
| Text box width/height, multiline wrapping | partial | `wrapWidth` + `editorTextLines` soft-wrap; the box is not drawn by dragging |
| Text transform presets (arch, wave, circle, flag) | partial | `textTransform` paints `arch` and `wave`; `circle` is a no-op and `flag`/`rise`/`angle`/`distort` do not exist |
| Shadow / outline / decoration effect objects | built | seven effect kinds in `editorTextEffects`, `editorTextDecoration`, `editorTextPaintPadding` |
| Glyph panel, uppercase, ligatures | missing | — |
| Font search, recent fonts, weight options | built | `EditorAdjustmentsPanel.tsx` font search + recents; `fontWeight` |
| Canvas hover ↔ Layers hover highlight | missing | — |
| Flip horizontal / vertical | missing | — |
| Snap guides, smart alignment lines | missing | only 15° rotation snapping exists |
| Context menu actions | missing | — |
| Per-layer effect previews in thumbnails | built | `EditorLayerPreview.tsx` paints the same effects |
| Undo/redo of layer state | built, layer-level | `undoStack`/`redoStack` hold `EditorArtworkLayer[][]` in `KittlCanvas.tsx` |
| Vector path model, node editing, Shape Builder | built, with limits | `lib/editor-pen-path.ts` stores anchors with Bézier handles; `movePenEditNode` drags anchors and handles (Alt breaks symmetry) and nodes can be added on a path; `applyEditorShapeBuilderOperation` does merge/subtract/intersect, but only on the first two axis-aligned rectangles — no `exclude`, no arbitrary paths |
| Artboard hierarchy, infinite canvas | missing | single print canvas plus mockups |
| Collaboration, version history | missing | — |

### B3. Roadmap

Ordered by the audit's own recommendation, minus what §2 shows is already built. Every item needs the
owner's go-ahead before it is coded; the "approval" column says whether it is a normal change or one
of the model-level decisions in §4.

| # | Item | Model change | Approval |
|---|---|---|---|
| R1 | Canvas ↔ Layers hover highlighting | none | normal |
| R2 | Align to print canvas, tidy/distribute | geometry helpers only | normal |
| R3 | Flip horizontal/vertical | two layer fields | normal |
| R4 | Drag-to-create text box | `wrapWidth` from the drag, height from the wrapped lines | normal |
| R5 | `circle` and `flag` text transforms | transform matrix per preset | normal |
| R6 | Effect stacking order and 3D shadow | effect list already ordered; add 3D kinds | D3 |
| R7 | Character-level text runs | `runs[]` + migration of saved layers | D1 |
| R8 | Shape Builder for arbitrary paths, `exclude` | boolean ops on stored path strings | D4 |
| R9 | Artboards, collaboration, version history | workspace/export/persistence | D5, D6 |

**R1 — hover highlighting.** A hovered canvas layer highlights its Layers row and a hovered row
outlines its canvas layer, without selecting it. Files: `KittlCanvas.tsx` (hover state, outline),
`EditorLayersPanel.tsx` (row highlight), `lib/editor-layers.ts` (`hitTestLayerAt` already resolves the
top layer under a point). Acceptance: hovering either side highlights the other within one frame,
touch devices are unaffected, and a CDP test asserts the row class and the outline element appear and
clear.

**R2 — align and tidy.** Align a layer or group to the print canvas (left, centre, right, top, middle,
bottom) and tidy the spacing of three or more selected layers. Files: new `lib/editor-align.ts`,
actions in `EditorAdjustmentsPanel.tsx` or the Layers box. Constraint: alignment moves layer origins,
never scales, and must respect linked groups as one unit. Acceptance: unit tests on the helper
against `PRINT_CANVAS_SPEC` (4500×5400 px at 300 dpi) with layers of mixed size, plus a canvas test
that the artwork lands on the print area.

**R3 — flip.** Horizontal and vertical flip on the selected layer or group, mirrored in the mockup
and the print export. Files: `EditorArtworkLayer` fields, `EditorLayerPreview.tsx`,
`MockupArtwork.tsx`, `layerCanvasBounds` (a flip does not change the bounds, but the ink box of a
flipped italic does). Acceptance: the printed PNG is the mirror of the unflipped one and the
transform box still hugs the ink.

**R4 — drag-to-create text box.** Dragging with the Text tool fixes `wrapWidth` at the drag width and
the box height follows the wrapped line count; a plain click keeps today's 880-unit default. Files:
`KittlCanvas.tsx` (text-tool drag), `editor-layers.ts` (already wraps to `wrapWidth`). Acceptance:
a 300-unit-wide box wraps a long line at the drag width and the caret stays inside the box while
typing (the `keepTextCaretVisible` contract).

**R5 — `circle` and `flag` transforms.** `circle` currently resolves to "no transform" and `flag`
does not exist, so the preset list over-promises. Either paint them (a circular baseline for
`circle`, a per-line phase shift for `flag`) or remove them from the control. Files:
`editorTextTransform` in `lib/editor-layers.ts`, the transform bounds in `editorTextCanvasBounds`,
the panel list. Acceptance: the ink stays inside the transform box at every preset, verified by frame
differencing as the other presets were.

**R6 — effect stack and 3D shadow.** The effect list is already ordered and painted in order; what is
missing is Kittl's "Detailed 3D shadow" and user-controlled stacking. Needs D3. Acceptance: stacked
shadow + outline + decoration render in list order on canvas, thumbnail, mockup and print sheet.

**R7 — character-level runs.** Needs D1: text becomes `runs[]` (ranges with their own font, size,
colour, weight, italic, underline, letter-spacing) with a migration for saved layers, and every
consumer of `text.value` plus the shared style fields has to read the runs. Acceptance: a saved design
with mixed runs round-trips through localStorage, the mockup and the print sheet, and old layers open
unchanged.

**R8 — Shape Builder beyond rectangles.** Needs D4. Node editing is already there (anchors, handles,
adding nodes); what the builder cannot do is operate on anything but the first two axis-aligned
rectangles, and there is no `exclude`. Files: `applyEditorShapeBuilderOperation` in
`lib/editor-layers.ts` (path intersection on the stored `d` strings), the Adjustments panel mode list.
Acceptance: merge/subtract/intersect/exclude on two rotated shapes and on a pen path produce one path
that prints and exports correctly, with the layer's bounds following the result.

**R9 — artboards and collaboration.** Needs D5 and D6. These change the workspace, export scope and
persistence, so they are planned only if the owner wants them.

### B4. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Character-level formatting now, or text-box-level styling only? | Keep text-box-level styling. Runs touch every renderer, both bounds, the print sheet and saved designs; nothing in the shop needs per-word styling yet. |
| D2 | Which text transformations in the first version? | `arch` and `wave` are painted today; finish `circle` and `flag`, and leave `distort`/`rise`/`angle` out. |
| D3 | Shadow/outline only, or the full effect stack? | The seven painted effects already cover the designs in the catalogue; add stacking control before adding 3D. |
| D4 | Full Shape Builder (arbitrary paths, `exclude`) in scope? | Not now. Node editing already ships and the rectangle-only builder covers the catalogue shapes; full path booleans are a separate tool with its own geometry tests. |
| D5 | Single print canvas plus mockups, or multi-artboard/infinite canvas? | Keep one print canvas. Every mockup, export and order line assumes a single print area. |
| D6 | Collaboration and version history in scope? | No. Autosave per browser and the order record already cover recovery; collaboration needs backend state, conflicts and permissions. |

### B5. Deliberately out of scope

- Copying Kittl's interface, assets or presets; only the interaction patterns are modelled.
- Fabric.js object-level editing: the editor paints SVG layers and has no Fabric canvas.
- Per-character fonts before D1, 3D effects before D3, full path booleans before D4.
- Anything that changes the print contract (print area in cm, artwork units per cm, layer records) —
  that contract is fixed by the order sheet and the press files.

### B6. How each item is verified

- Unit tests in `tests/*.test.cjs` for the pure helpers (`node --test tests/*.test.cjs`), following
  the existing `editor-layers`, `editor-pen-path` and `editor-attributes` suites.
- Interaction tests in `tests/editor-touch.cjs` and CDP probes for canvas behaviour, with the phone
  checks at 390×844 touch (the editor is used on a phone on the shop floor).
- Frame differencing for anything that paints (effects, transforms, flips): hide the glyphs, diff two
  screenshots, and require ≤1.1 px of ink outside the transform box, as the current text box is
  verified.
- The print sheet and mockup are part of the acceptance for any layer change, not an afterthought.

## Appendix C — owner corrections (record of what was built)

These were recorded in `Plan/PLAN.md` §6 while the editor was being built. They are kept verbatim as the
record of the owner's instructions; the verified behaviour they produced is described in §1–§19.

**Owner-directed Editor Sidebar scope (2026-11-15):** Do not infer the Sidebar implementation from the forward editor plan. The owner requested a hidden-by-default left Sidebar that reveals a compact Canva-style icon rail from its circular arrow, then opens a larger panel when a rail item is selected. The five categories are `Designs`, `Elements`, `Text`, `Upload`, and `Image Create`. `Designs` and `Elements` require top search fields; Designs will show MH Fashion SVG assets from R2 and Elements will show the individual layers from those designs. Text will expose an `Add Text` action that enables typing on the canvas. Upload will accept a user photo, reduce it to the configured KB/MB limit, and insert it directly into the canvas. Image Create will accept an AI prompt and place the generated image on the canvas after download. The first UI slice records the requested surfaces and responsive interaction; the R2 design endpoint, SVG layer extraction, canvas text/image object model, upload compression/insertion pipeline, and AI generation/download pipeline remain explicit integration work until their project services are connected.

**Owner correction (2026-11-15):** When the compact rail item opens a large section panel, the compact rail must remain visible. The large panel shows only the selected section's content; it must not repeat a second category-navigation row. Selecting another item on the still-visible rail switches the large panel content to that section.

**Owner correction (2026-11-15, Sidebar content and canvas actions):** `Add Text` must place the text directly on the canvas and let the user type there immediately; the secondary "Text to add" field and its prefilled text are removed. The `Add Text` control itself is a small button, and below it the Text section lists the text layers that exist inside the MH Fashion Designs. Elements must not be a plain layer list: every individual layer gets its own thumbnail card, in the same visual style as the Designs grid. Image Create has no search field. Whatever the user adds from the Sidebar — text, element, design, or upload — must also appear as a layer in the Layers box.

**Owner correction (2026-11-15, canvas layer editing):** Any layer that reaches the canvas from the Sidebar must be selectable, movable, and resizable. Text layers must support real inline typing on the canvas and immediate design edits; the first text controls are font size and color, with richer font family/weight/alignment/letter-spacing controls to follow. User-facing implementation/status explanations that are not editor controls should not be rendered in the Sidebar.

**Owner correction (2026-11-15, Layers box):** The Layers box `Fill` control must update the selected layer instead of being a disabled placeholder. Layers need practical up/down ordering, multi-layer Group/Ungroup, and a Photoshop-style non-destructive Layer Mask: a separate mask target/thumbnail, black hides, white reveals, and painting must preserve the original artwork so the mask can be edited or removed later. Grouped members should select and move together while remaining individual editable layers.

**Owner correction (2026-11-15, group/link/mask follow-up):** Group membership must not prevent selecting or moving a group member independently. Layer masks must switch to the Brush tool and support direct black hide / white reveal painting on the canvas. The bottom adjustment icon slot is replaced by a working Link Layers action; links are explicit transform membership and remain separate from groups.

**Owner correction (2026-11-15, Photoshop-style Layers box):** Layer rows must be draggable to an arbitrary position in the stack, not only moved by repeated commands. Groups must behave like folder groups with a collapsible header and nested child rows, while each child remains individually selectable/editable.

**Owner correction (2026-11-15, Layers row stability):** Group folder headers must not overlap, distort, or replace the normal Photoshop-style layer rows. The folder header and child rows must remain separate, with the original thumbnail, visibility, mask, name, options, and drag interactions preserved.

**Owner correction (2026-11-15, editor-wide audit):** Grouped layers must form contiguous Photoshop-style folder blocks; drag/drop must preserve group blocks and correct downward/end insertion semantics. Link membership must apply consistently to move and resize without destructive mixed-selection toggles. Deletion must clean selections, Fill/Opacity must reject invalid numbers, and mockups must include visible text/image/shape content in bounds and empty-state decisions.

**Owner correction (2026-11-15, Photoshop transforms and masks):** Canvas selection controls must expose eight resize handles. Selecting a Group folder applies canvas transforms to the complete group; selecting a child applies them only to that child. Layer-mask painting must use the editor foreground/background color switch rather than a redundant Hide/Reveal instruction panel.

**Owner correction (2026-11-15, Adjustment panel):** The bottom Adjustment icon must open a dedicated adjustment box for the selected layer, close the Layers box while open, and use the same round dock-arrow position to return to Layers. Text selections must expose text value, font size, and color controls; shared opacity/fill controls remain available for all layer types.

**Owner correction (2026-11-15, dynamic canvas transforms):** Canvas selection frames must derive their position and size from actual selected content rather than fixed canvas coordinates. A selected Group uses the union of its child bounds; a selected child uses only its own bounds. All eight Photoshop-style handles must follow those bounds and resize direction.

**Owner correction (2026-11-15, text editing):** Text Adjustment controls must cover font family, size, color, weight, italic, underline, alignment, letter spacing, and line height without requiring text re-entry. The Tools bar Text tool must create a layer at the clicked canvas position and focus direct typing immediately.

**Owner correction (2026-11-15, Kittl-style interaction pass):** Selected layers/groups must expose a dedicated rotate handle below the dynamic bounds, apply rotation to linked selections, and return the Text tool to the Move/selection tool after typing is committed.

**Owner approval (2026-11-15, Kittl-style expansion and visual direction):** Implement the approved Kittl-inspired Canvas behaviors, including text box geometry, character-level text styling, text transformations, text effects, alignment/tidy, vector editing foundations, and future multi-artboard foundations without discarding MH Fashion's Print Canvas + Front/Back Mockup model. The visual treatment may borrow Kittl's polished editor language—rounded cards, clear context-aware panels, generous spacing, strong typography hierarchy, live previews, and expressive accent surfaces—but must remain MH Fashion branded with the existing dark-first, neon-lime accent direction rather than copying Kittl branding.

**Current implementation state (2026-11-18):** `/create` mounts the existing responsive site Header, a compact theme-aware Header Bar 2, and the Editor workspace. The print canvas is blank and fixed; the optional grid, draggable canvas, connector wires, and freehand drawing are in place. Header Bar 2 uses identical fully rounded green `bg-accent` `80×32px` desktop and `80×44px` coarse-pointer boxes for Product, GSM/Brand/Model, Color, Size, Save, and Buy. Product, GSM, Color, and Size are all one `BoxDropdown` control, so every field opens the same green dropdown panel, sized to its box (rounded on its sides, not a clamped capsule) with the chevron pinned to the same right-edge spot on each box, and no native `select` is used. Labels appear on desktop and are hidden on phone-width layouts, leaving a horizontally scrollable row of boxes. Product has no `Choose` entry and defaults to `T-Shirt`; `Phone` is selectable while `Hoodie`, `Cup`, `Kids`, and `Bag` remain inactive pending their rules. GSM has no `Choose` entry and defaults to `160 GSM`. Color shows the selected Background, Surface, or Accent theme swatch beside a down-chevron; the chevron opens the rounded green dropdown (Accent selected initially); the swatch is a 20×20px rounded square, not a dot. Size defaults to XL with XS/S/M/L/XL/2XL/3XL choices. Desktop shows a live price immediately to the left of Save: once the product's required selections are present, the provisional client-side calculation (`calculateEditorPriceKs`, matching the storefront's base + GSM + Size variant model) shows the Ks amount and updates at once on every change; it reads `Price —` while a required choice is missing. `/create` has no connected product/variant price source, and Save/Buy remain disabled placeholders. Color and Size selections are local UI state. T-Shirt shows GSM/Size and supports Front/Back Mockups. Phone replaces GSM/Size with disabled Brand/Model placeholders, keeps Color, shows one Front Mockup, and hides the Back Mockup plus its add control; the Back setup is restored when switching back. Each visible artwork overlay can be moved/resized independently, and the provisional 3500 px large artwork tier transfers between Front and Back when artwork grows beyond 1500 px. These numeric caps are provisional, not final print specifications. The right-side Photoshop Layers dock is initially closed and keeps the supplied reference's compact proportions. Its visible structure is a single `Layers` title, blend/opacity, Lock/Fill, compact visibility/artwork-mask/name rows, and the bottom action strip; the unused `Channels`, `Paths`, top `Menu`, and `Kind` rows are removed. The panel has a 16rem maximum desktop width and 11px row labels. Its circular show/hide toggle uses the app's global `bg-accent` and `text-accent-foreground` tokens (28px on desktop, 44px on coarse pointers) and follows the Header Light/Dark theme. A left-side `Edit sidebar` also starts closed behind a matching circular arrow: the first click reveals a compact icon rail and each rail item opens one large panel for that section while the rail stays visible. The five sections are `Designs`, `Elements`, `Text`, `Upload`, and `Image Create`; Designs/Elements/Text keep a top search field, and Designs, Elements and the Text section render one thumbnail card per design or per individual design layer. Layers now carry a `kind` (`artwork`, `text`, `shape`, `image`) with shared preview rendering, so a Sidebar addition becomes a real layer: `Add Text` creates a text layer and focuses an inline field on the print canvas so typing appears on the canvas immediately, element/design cards insert their own shape or text layers, and an uploaded photo is re-encoded in the browser to the configured size policy before it is placed on the canvas as an image layer. Every one of these also appears in the Layers box, which opens automatically on desktop docks. It uses app theme colors; desktop can show both sidebars, while at widths below 768px opening one closes the other to prevent overlap. In short coarse-pointer landscape viewports (≤500px tall), the toolbar remains compact and the scrollable layer/mask list stays reachable. The Layers panel provides a functional vector-layer stack with add/select/rename/reorder/show-hide/lock/duplicate/delete, per-layer opacity and blend, and freehand drawing assigned to the selected unlocked artwork layer. Photoshop-style Layer Masks can be added, selected, removed, and painted black (hide) or white (reveal) without destructively erasing source artwork. Pixel locks, Fill, effects, adjustment layers, and groups remain visible as disabled placeholders, not functional features. Visible ordered layers, appearance settings, and masks render from shared source data on the print canvas and Front/Back previews; each mockup retains its independent move/resize transform and existing shared artwork-tier rule. Layer, mask, and artwork state remain in page memory. This route does not instantiate Fabric.js as an object-level editor and has no full-document Undo/Redo (only a bounded drawing/erase undo stack), serialization, browser/account draft persistence, production export, or R2 assets; masks are vector-stroke masks, not pixel-image selections. Older audits below describe their dated baselines, not the current source.

**Implemented owner-directed compact Tools bar (2026-11-15):** The `/create` editor has a small, rounded, theme-aware dock at the bottom center with a circular chevron to expand/collapse without visible tooltip text while retaining its accessible label, and compact 28 px controls for Move, Pen, Hand, Brush, Eraser, Shape, Gradient, Undo, Redo, and Remove BG. Shape and Gradient select their tools and show an honest availability notice until their vector/gradient pipelines are connected. Undo and Redo use the bounded artwork snapshot history. Foreground and Background Color swatches remain in the dock; foreground color is applied to new Pen/Brush artwork on the canvas and both mockup previews. Background color is selectable but does not fill the transparent print canvas. The Text Tool remains removed. The dock clears mobile bottom navigation and hides while a Layers or Edit side panel is open. The Edit sidebar and Layers panel use the same solid accent circular arrow treatment as the Tools bar, while staying edge-safe on Phone.

**Owner-directed compact canvas options menu (2026-11-15):** The small circle on the print-canvas edge opens a reduced menu measuring about 112 px wide and 62 px high on Web/Desktop with 20 px rows; Phone/Mobile keeps 40 px finger-sized rows. It contains `Show Grid`, `Front Mockup` and `Back Mockup`; there is no `Add Mockup` action and the Front Mockup box no longer carries a `+` add control. Each side is attached from the menu, an already-attached side disables its own entry, Product `Phone` continues to list only `Front Mockup`, and every box keeps its own close control. The circle and canvas/mockup connector wires follow the Header Light/Dark accent theme, and the print-canvas node stacks above the mockups while the menu is open so its entries stay clickable.

**Owner-directed layer-aware Move Tool and no-scroll Tools Bar (2026-11-15):** The bottom Tools Bar does not horizontally scroll; it wraps and grows vertically when the viewport is narrow. Move Tool uses the active artwork layer selection: a normal layer click selects one layer, Shift/Ctrl/Cmd-click toggles multiple layers, and dragging the print canvas moves only selected unlocked layers using independent bounded offsets.

**Owner-directed Canva-style Edit rail and canvas controls (2026-11-15):** The Edit sidebar starts as a narrow left icon rail. Selecting a rail item expands the wider box, highlights the selected category, and shows its current status; the category library behavior remains pending. The Tools Bar color control uses overlapping Photoshop-style foreground/background squares with independent color pickers and a swap action. Move Tool dragging now moves the source artwork overlay inside the print canvas with bounded offsets; mockup artwork keeps its independent existing transforms.

**Owner-specified blank print canvas (2026-11-13):** keep the current shell and set the native blank canvas to a fixed **4500 × 5400 px** with a **300-DPI PNG target** and transparent pixel buffer. Do not preload or draw any copy, including “T-Shirt.” The checkerboard and size/spec label are presentation-only UI outside the artwork; no resize control is provided. This is a canvas-spec update only and does not restore the reverted editor tools, document/history model, or persistence. PNG download and embedding 300-DPI metadata remain unsupported by the shell.

**Phone/Web baseline:** phone editing supports finger-sized artwork move/resize targets, touch pan/zoom controls, blank-workspace scrolling, and portrait/landscape layouts without changing desktop mouse behavior. Browser regression checks cover 390×844, 320×740, and landscape viewports; physical-device verification remains outstanding. Follow the owner's direct instructions for each next Editor change and validate both Web/Desktop and Phone/Mobile when the change affects their shared UI.

The detailed editor feature list below is a **forward plan**, not a claim that those capabilities exist. Use the Editor Implementation Plan section later in this file for the full target design and acceptance contract.

**Owner request — make the editor usable on Phone like Web (2026-11-13):** the current Web route is also only a shell, so the first delivery must make the same core editor work on Web/Desktop and Phone/Mobile, rather than creating a phone-only mockup. Use one shared Fabric document state per garment side. The first usable slice includes adding and editing text, basic shapes, and uploaded images; selecting, moving, resizing, rotating, recoloring, and deleting objects; front/back documents; a layer list; undo/redo; and browser-local save/restore. On Phone, keep the canvas reachable in a single-column layout, hide the global mobile navigation and its reserved page padding on `/create`, provide 44px-or-larger controls and a compact bottom dock/sheet, support object editing by touch, provide an explicit Pan mode and visible zoom controls, and keep the same document, selection, and history state as Web/Desktop. Advanced Photoshop-style tools, production export, R2, and account-backed storage remain outside this first slice.
