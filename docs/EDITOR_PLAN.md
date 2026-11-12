# MH Fashion Editor Plan

**Status:** Standalone, continuously updatable planning document for `/create`

**Date:** 2026-11-12

**Parent-plan reference:** [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §6

**Canonical owner:** This file is the source of truth for editor-specific behavior, implementation logic, milestones, and acceptance criteria. Future editor updates should be made here first; `PROJECT_PLAN.md` should keep only a short summary and link.

**Implementation boundary:** This document defines the behavior MH Fashion should build. It does not claim that every item below is already implemented.

## Standalone maintenance policy

Keep this document independent from the broader product plan so editor work can evolve without making `PROJECT_PLAN.md` difficult to maintain. Add new editor tools, Fabric.js implementation details, interaction rules, data contracts, export behavior, performance constraints, and tests to this file. When a major editor milestone changes the product status, update the short reference note in `PROJECT_PLAN.md`; do not duplicate the full editor specification there.

## 1. Product direction

MH Fashion should combine three useful editor patterns without copying any product's proprietary interface or assets:

- **Kittl-style accessibility:** quick canvas actions, direct manipulation, artboard-first workflows, contextual controls, simple alignment, useful text transformations, mockup attachment, and fast export. Kittl documents selection, move, rotate, scale, zoom, pan, undo/redo, layer management, alignment, text transformations, mockups, and export as connected editor workflows. [1] [2] [3] [4] [5] [6]
- **Photoshop-style non-destructive composition:** a predictable layer stack, groups, visibility, locking, opacity, blend modes, masks, Smart Objects, adjustment/effect ownership, and history-backed changes. Photoshop's documented model combines Smart Objects, Smart Filters, adjustment layers, and masks so edits can remain reversible. [7]
- **Illustrator-style vector precision:** object selection versus path selection, editable anchors and handles, Pen/Curvature workflows, Shape Builder operations, artboards, Smart Guides, snapping, measurements, and precise export. Illustrator separates object-level selection from anchor/path editing and exposes guides for alignment, spacing, measurements, and transformations. [8] [9] [10]

The result should feel like **MH Fashion Design Studio**: easy enough for a first-time T-shirt designer, but structurally reliable enough for production artwork and print export.

## 2. Current implementation baseline

The current prototype uses Fabric.js 7.4.0 in the browser. It already has local Front/Back draft state, Undo/Redo, Save/restore, object-level Move, Marquee, Lasso, Magic Wand, Eyedropper, Shape, Pen, Path Select, Clone Stamp, Gradient, Eraser, Ruler, Rotate View, Hand, and Zoom tools. It also has a layer stack with visibility, locking, grouping, reorder, thumbnails, blend modes, opacity, Fill, Flow, effects, clipping preview, Smart Object metadata, and browser-local persistence.

The current prototype must continue to be described accurately:

- The editor is currently an **object-level editor**, not a Photoshop-equivalent pixel editor.
- Magic Wand selects vector/text objects by color tolerance; on raster artwork it reports a whole-image selection rather than selecting pixel ranges.
- Path Select selects a complete Pen path; anchor-node editing is not complete.
- Eraser removes an artwork object while leaving its layer available; it is not pixel erasing.
- Clone Stamp duplicates editable objects; it is not raster brush cloning.
- R2 uploads, account-backed drafts, production mockup rendering, AI Remove Background, AI Upscale, paintable masks, true pixel merge, and server-side production export remain future work.

This file is the forward plan. The existing prototype notes in `PROJECT_PLAN.md` remain the record of what is currently available.

## 3. Editor workspace and coordinate model

### 3.1 Workspace regions

The desktop editor should have the following stable regions:

1. **Top command bar:** document name, undo, redo, history/snapshot access, zoom readout, save status, price, Save, Add to Cart, and Buy Now.
2. **Left rail:** Upload, Elements, Text, Effects, AI, and the tool palette. Tools are grouped into Select, Draw, Modify, Navigate, and Measure rather than presented as an unstructured icon list.
3. **Flyout panel:** opens beside the left rail and never changes the artboard's coordinate system. Search, categories, presets, and settings live here.
4. **Center workspace:** Front and Back artboards, white artboard surface, optional transparency grid, rulers, guides, safe/print areas, and mockup preview.
5. **Right dock:** Layers panel, contextual properties, color, typography, effects, masks, and mockup controls. The Layers box must remain mounted even when no layer is selected.
6. **Bottom attribute bar:** Product, print method, fabric, structure, GSM, color, cutting, size, and mockup attachment state. Product selection remains separate from the editor's asset browser.

### 3.2 Document coordinate system

Every design document has a document coordinate space independent of browser zoom and viewport pan:

- `documentWidth` and `documentHeight` describe the print area in design units.
- `viewportZoom`, `viewportPanX`, `viewportPanY`, and `viewportRotation` describe only how the user views the document.
- Each object stores local transform data: `x`, `y`, `width`, `height`, `scaleX`, `scaleY`, `rotation`, `skewX`, `skewY`, and `origin`.
- Front and Back are separate artboards/documents sharing the selected product attributes.
- Mockup placement uses a separate mapping transform. It must never rewrite the source artwork's document coordinates.
- All hit-testing converts pointer coordinates through `screen → viewport → document → object-local` space. This prevents browser zoom or Rotate View from corrupting print placement.

### 3.3 Artboard and print safety

The canvas must show three non-printing regions:

- **Trim boundary:** final print-area boundary.
- **Safe area:** recommended inset where important text and logos should remain.
- **Bleed/overflow area:** optional extra artwork area for production methods that need it.

The user can toggle these overlays. They are not exported into the clean SVG/PNG production output. Product-specific print-area dimensions come from the selected Product and attribute combination, not hardcoded editor defaults.

### 3.4 Responsive UI/UX layout contract

The existing global site header and the editor command bar remain unchanged. The responsive work applies to the editor workspace below them: tools, asset flyout, canvas, Layers/Properties, mockup controls, and product attributes.

On **Web/Desktop**, the workspace uses a compact three-zone composition: a narrow left tool rail, an optional asset flyout, a flexible center canvas, and a right Layers/Properties dock. The right dock keeps the layer tree available without forcing a separate navigation page. Widths are constrained so the canvas remains the visual priority; long controls scroll inside their own panel instead of making the whole document scroll.

On **Phone**, the workspace is a single-column canvas-first view. The left rail becomes an icon-only 44–48px rail. Asset panels open as a bottom sheet with a rounded top edge, a visible drag/close affordance, a maximum height, and internal scrolling. Layers/Properties open as a separate bottom sheet or side overlay from a compact mobile dock; they must not permanently consume canvas width. Product attributes stay in a horizontally scrollable compact strip. The canvas must remain reachable without nested page scrolling.

All responsive panels use the same state and callbacks as desktop. Opening a sheet does not clear selection, alter document coordinates, or duplicate editor state. A sheet closes with its close button, backdrop tap where safe, or `Escape`; text inputs and file pickers keep focus until their action completes. Touch targets are at least 44px on phone, while the dense desktop panel may use smaller secondary controls. Selected, pressed, locked, hidden, loading, and disabled states must remain visible without hover.

The mobile dock exposes only the high-frequency actions: Assets, Layers, Mockup, and the active tool. Advanced properties remain inside the Layers sheet below the layer tree. The desktop header/command bar is not redesigned as part of this milestone; future header work requires a separate plan decision.

## 4. Selection architecture

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

### 4.1 Selection rules

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

### 4.2 Selection visual language

- Object selection: thin accent outline and transform handles.
- Multi-selection: one outer bounding box plus small member indicators.
- Path selection: visible anchors, direction handles, selected segments, and path direction.
- Locked object: lock badge, no transform handles, clear status message.
- Clipped object: clip badge and a visible relation to its base layer.
- Mockup edit: a distinct inner placement frame so users know they are moving artwork inside the mockup, not moving the mockup itself.

## 5. Move tool — first-class behavior

The Move tool is the default tool and must be the most predictable part of the editor. Photoshop's Move tool moves one or more selected layers, supports automatic layer/group selection, and uses 1 px and 10 px keyboard nudges. [11] Kittl similarly treats direct select-and-drag, right-click actions, locking, and keyboard modifiers as core canvas behavior. [1] [6]

### 5.1 Basic Move behavior

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

### 5.2 Auto-select policy

The Move tool options must expose:

- **Auto-select: Off:** pointer selects only the currently selected layer or the layer explicitly chosen in Layers.
- **Auto-select: Layer:** clicking visible artwork selects the topmost eligible layer.
- **Auto-select: Group:** clicking a child selects its nearest editable group.
- **Select through transparent pixels:** off by default for raster images; when enabled, transparent pixels do not capture the click.
- **Ignore locked layers:** on by default.
- **Pick from all visible layers / current side:** current side by default, all visible layers as an explicit option.

This follows Photoshop's documented Layer versus Group auto-selection distinction while keeping MH Fashion's product workflow safer by default. [11]

### 5.3 Move snapping and guides

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

### 5.4 Move property editing

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

### 5.5 Move acceptance criteria

- A locked object cannot move through the canvas, keyboard, contextual toolbar, or drag-and-drop.
- A locked ancestor locks all descendants.
- Moving a group preserves child local coordinates.
- Moving a multi-selection preserves relative distances and rotations.
- Move does not alter the object's design color or source artwork.
- Undo returns every object to its exact prior transform.
- Front/Back mockup attachment never changes source placement coordinates.
- Move works identically at 25%, 100%, and 400% viewport zoom.

## 6. Transform system

Transform must be shared by Move, Rotate, Scale, Shear, and Free Transform rather than implemented separately for each tool.

### 6.1 Transform modes

- **Bounding-box transform:** move, scale, rotate, flip.
- **Free Transform:** independent corner movement with optional perspective/quad mode for approved mockup mapping.
- **Numeric Transform:** exact position, size, angle, skew, and origin fields.
- **Transform origin:** center by default; user can move the origin for rotation, reflection, and scaling.
- **Constrain:** Shift locks proportions/angles depending on the active gesture; an explicit toolbar toggle makes the behavior discoverable.
- **Scale from center:** `Alt/Option`.
- **Duplicate while transforming:** `Alt/Option` drag.
- **Reset Transform:** restores the saved transform baseline without deleting source artwork.

### 6.2 Product-specific transform restrictions

The selected product may impose a print-area boundary, maximum scale, minimum legibility size, or allowed rotation. The editor should warn before export rather than silently clamp the user's artwork. Admin-configured rules can later define whether an object may cross the trim boundary.

## 7. Vector drawing system

### 7.1 Pen tool

The Pen tool creates editable vector paths, not raster marks:

- click creates corner anchors;
- click-drag creates smooth anchors with direction handles;
- click an existing endpoint closes a path;
- `Alt/Option` temporarily changes the active handle behavior;
- `Esc` commits an open path;
- path properties include fill, stroke, stroke width, cap, join, dash, opacity, and blend mode;
- every path is stored as a path object with anchors, handles, closed/open state, fill, and stroke;
- a first Pen object can reuse an eligible blank layer under the current layer rules.

Illustrator's Pen documentation treats paths as editable anchor-and-handle geometry, and its tool family includes Add Anchor Point, Delete Anchor Point, Anchor Point, and Curvature tools. MH Fashion should adopt that model for production vector artwork. [9]

### 7.2 Path Select and anchor editing

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

### 7.3 Shape Builder and Boolean operations

Add Illustrator-inspired vector construction tools:

- Shape Builder merges selected regions and removes selected regions.
- Boolean operations: Union, Subtract, Intersect, Exclude, Divide, and Outline.
- Operations preserve an editable operation record where feasible; otherwise they create an explicit derived vector object with source references in history.
- A preview highlights the region that will be added or removed before commit.
- Original source shapes remain recoverable through Undo and a non-destructive compound-shape representation.

Illustrator documents Shape Builder as a way to create complex shapes by merging and erasing simpler objects. [12]

### 7.4 Vector color and appearance

Vector objects need separate Fill and Stroke channels. Each channel supports solid color, gradient, opacity, and swatch reference. Appearance should be represented as an ordered stack so a later implementation can support multiple strokes/fills without changing the document model.

## 8. Raster and image system

### 8.1 Image import

Supported local input remains PNG, JPG, and WebP. Import must:

- preserve the original file bytes in the document or asset store;
- create a non-destructive image layer with a transform baseline;
- generate a thumbnail without replacing the source;
- show pixel dimensions and effective print DPI;
- warn when an image is too small for the selected print area;
- support Replace Contents while preserving the existing transform;
- support Reset Transform;
- support Rasterize only as an explicit destructive action.

### 8.2 Pixel selection roadmap

The production editor should eventually support:

- Rectangular/Elliptical Marquee;
- Lasso and Polygonal Lasso;
- Magic Wand with contiguous/non-contiguous modes, tolerance, anti-alias, and sample-all-layers options;
- Select Subject / Remove Background through the configured AI provider;
- inverse, expand, contract, feather, and save selection;
- selection channels or named reusable selections.

The current Magic Wand is intentionally object-level for raster images. Do not describe it as pixel selection until a real pixel buffer and mask pipeline exists.

### 8.3 Pixel editing roadmap

A later raster engine may support brush, pencil, paint bucket, clone brush, healing, blur, sharpen, dodge, burn, smudge, and pixel eraser. These operations require a tile-based or worker-backed raster surface, memory limits, progressive rendering, and a clear distinction between source image data and generated preview. They should not be simulated by deleting Fabric objects.

## 9. Layers, groups, masks, and non-destructive editing

### 9.1 Layer tree

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

### 9.2 Layer operations

Support create, rename, duplicate, delete, hide/show, lock/unlock, reorder, group, ungroup, nest, unnest, isolate, clip, link, and select. Layer reorder must use a clear insertion marker. The panel must show visibility and lock state even when the row is not hovered. Kittl's documented layer system provides a useful baseline for reorder, rename, hide, lock, group, nested artboard content, and export inclusion. [2]

### 9.3 Lock modes

The current all-or-nothing lock remains the first production step. Later, add Photoshop-style independent locks:

- lock transparent pixels;
- lock image pixels;
- lock position;
- lock all;
- lock children through group inheritance.

A lock reason must be shown when an action is rejected: object lock, ancestor lock, product-template lock, or system/mockup lock.

### 9.4 Masks

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

### 9.5 Blend, opacity, Fill, and Flow

Keep the current panel order: Blend Mode and Opacity first; Lock and Fill second. Add Flow only in Advanced properties. Distinguish:

- **Opacity:** transparency of the complete rendered layer, including effects where applicable.
- **Fill:** transparency of the base artwork before selected effects.
- **Flow:** accumulation/intensity for brush-like operations; for non-raster objects it may remain disabled.
- **Blend mode:** how the layer or isolated group composites with the layer below.

New groups default to Pass Through. Choosing another group blend mode composites children first, then blends the group result. This matches the current MH Fashion direction and the Photoshop-style distinction between layer opacity and blending. [14]

### 9.6 Smart Objects

The current embedded raster Smart Object metadata should become a formal source-container model:

- original source bytes or source asset key;
- source type: raster, SVG, text, or compound group;
- placement transform;
- content version;
- replace-content history;
- reset-transform baseline;
- rasterize conversion record.

Future linked Smart Objects may reference private R2 assets, but missing-link states must be explicit and must never silently render a blank layer. Photoshop documents embedded and linked Smart Objects, replacing contents, resetting transforms, and rasterizing as separate operations. [7] [15]

### 9.7 Photoshop-style Layers box contract

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

### 9.8 Photoshop-inspired tool behavior contract

The tool palette is organized by behavior: Select, Draw, Modify, Navigate, and Measure. The Move tool is first-class. Its options bar exposes Auto-select Off, Layer, or Group; locked-layer ignoring; current-side versus all-visible-layer scope; and optional transparent-pixel picking for raster images. Photoshop documents Layer and Group as distinct Auto Select modes, and arrow keys as layer nudges. [11] [16]

For the current Fabric object editor, these options apply to object selection and group context rather than pixel selection. Auto-select Off keeps canvas hit-testing on the selected layer; Layer selects the topmost eligible object; Group selects the nearest editable parent context. `Shift` constrains a drag to its dominant axis, `Alt/Option` duplicates on drag, `Space` temporarily pans, `Ctrl/Cmd` temporarily bypasses snapping, and `V` activates Move. A raster-only behavior is explicitly marked unavailable until the tile-based pixel engine exists.

Selection tools follow Photoshop's separation between selecting a layer/object and editing its contents. Marquee and Lasso select objects in the current milestone; later raster selections will produce masks or alpha selections rather than deleting pixels. Magic Wand remains vector color matching until a real raster selection buffer is implemented. Eraser and Clone Stamp must continue to report their object-level behavior instead of claiming pixel parity.

### 9.9 Implementation mapping

The canonical model remains `EditorLayer[]` plus `CanvasMark[]`, with Fabric objects carrying a stable `data.id`. The Layers box owns presentation state (`query`, `filter`, collapsed groups, hover, focus, drop hint); the document owns composition state (`visible`, `locked`, `parentId`, `childIds`, `opacity`, `fillOpacity`, `flow`, `blendMode`, masks, effects, and source metadata). Canvas event handlers consult the document state before setting `selectable` or `evented`. Every row action calls `commitDocument`, so visibility, lock, reorder, group, mask metadata, and property changes share Undo/Redo and local-draft persistence.

The first implementation slice now includes Move Auto-select controls, selected-layer policy in Fabric hit testing, Layers-box search/type filtering, Shift multi-selection, bulk hide/lock actions, group-aware multi-delete, and history-backed state updates. The next slice will add contiguous range selection, group isolation, keyboard stack movement, independent lock modes, and mask companion nodes. Pixel brushes, pixel masks, and Photoshop-compatible PSD import are not implied by this plan.

### 9.10 History and appearance implementation milestone

The editor now exposes a compact History panel in the dock. Each document transaction records a user-facing label, the current state, undo count, and redo count. Undo moves the current label to the redo branch; a new edit clears the redo branch; restoring a draft starts a fresh history session. The existing top command-bar Undo/Redo buttons and the dock buttons call the same transaction functions, so they cannot diverge.

Layer appearance controls are grouped in the Layers dock: Blend Mode uses the selected layer/group's allowed mode list, Opacity applies to the whole rendered layer, and Fill applies to base artwork while remaining disabled for groups. Numeric fields clamp to 0–100 and the expandable slider provides a touch-friendly adjustment path. Each appearance change is an undoable history transaction.

Layer rows are draggable with before/inside/after insertion feedback. Locked sources, locked targets, and locked ancestors reject a reorder without mutating document state. The drop operation preserves `parentId`, updates group `childIds`, and records a `Reorder layer` history entry. Locked rows expose a not-allowed cursor and cannot be dragged.

## 10. Text and typography system

Text must remain editable until the user explicitly converts it to outlines or rasterizes it.

### 10.1 Text object levels

Use two levels of editing:

- **Text-box level:** transform, font family, overall size, box width/height, alignment, line height, letter spacing, fill, stroke, shadow, curve/warp, and effects.
- **Character level:** selected ranges can change font, weight, size, color, letter spacing, uppercase, underline, italic, and ligatures.

Kittl explicitly separates text-box-level and character-level editing and supports font, weight, size, letter spacing, line height, alignment, uppercase, ligatures, and transformed text. [5]

### 10.2 Typography features

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

## 11. Effects and appearance

Effects must be editable properties, not baked pixels, until export or explicit rasterization.

### 11.1 Initial effects

- shadow: offset, blur, spread, color, opacity;
- stroke/outline: width, join, color, opacity;
- glow: color, size, intensity;
- blur and sharpen for raster images;
- gradient fill;
- texture overlay;
- color overlay and recolor;
- displacement/warp as a future mockup-only effect.

### 11.2 Effect order

Each layer stores an ordered effect list. The renderer documents whether an effect acts before or after Fill, Opacity, Blend, and Mask. The UI must show a compact list with visibility toggles, reorder, duplicate, reset, and “convert to pixels” only as an explicit destructive action.

### 11.3 Kittl-inspired text decoration

Add text decoration presets for apparel design—outline, shadow, offset, cut, stripe, and texture—but keep them represented as editable text effects. Kittl documents decoration and transformation effects that can work together while character styling remains editable. [3] [5]

## 12. Alignment, guides, rulers, and measurements

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

## 13. Mockup and product preview system

### 13.1 Mockup object model

A mockup is a linked preview node with:

- source product/style/color/angle;
- placement zone or panel mapping;
- artwork source side and layer filter;
- transform or perspective mapping;
- color/recolor parameters;
- render status and asset version.

The source design remains independent. Updating the design refreshes every attached mockup.

### 13.2 Apparel and jersey behavior

- T-shirt/hoodie: design is clipped to the selected print zone and composited over the product mockup.
- Front and Back are separate source sides. Front placement copies to Back only when print-area types match.
- Jersey: panel-based SVG zones map front-left, front-right, back, sleeves, collar, and any future panels. MVP uses perspective warp; displacement maps are later.
- Product color changes update all attached compatible mockups, but never recolor the design artwork itself.
- Mockup edit mode moves/scales the design inside the mapped frame. Selecting the mockup itself edits mockup properties.

Kittl's documented mockup workflow also keeps the design linked to the selected artboard, allows repositioning/scaling inside the mockup, separates mockup color from artwork color, and supports multiple mockups with a shared source design. [3]

### 13.3 Commerce gate

Add to Cart and Buy Now remain disabled until:

1. a valid Product and required attributes are selected;
2. a valid print area is selected;
3. the mockup attachment is complete;
4. artwork passes size, overflow, and unsupported-font checks;
5. a production export can be generated or queued.

## 14. Export and production handoff

### 14.1 User export

Provide Quick Export for the current selection and a full Export panel for production settings. Kittl distinguishes quick selection export from full export settings such as size, DPI, format, color, transparency, and multiple artboards. [6]

Supported targets:

- transparent PNG for preview and digital use;
- SVG for clean vector artwork;
- PDF for print handoff when the print workflow supports it;
- JPEG only when transparency is not needed;
- mockup PNG/JPEG for storefront preview;
- ZIP for multiple sides, colorways, or mockups.

### 14.2 Production export package

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

### 14.3 Export validation

Before export:

- verify all referenced assets are available;
- verify fonts are licensed/embedded or converted according to policy;
- flag raster images below effective DPI threshold;
- flag artwork outside the allowed print region;
- flag unsupported blend/effect features that cannot be represented in clean SVG;
- verify front/back and panel IDs;
- render a thumbnail and compare it with the editor preview;
- store export version and warnings for Print Admin.

## 15. Keyboard and pointer conventions

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

## 16. Undo, redo, history, and persistence

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

## 17. Accessibility and safety

- Every tool has a tooltip, shortcut, keyboard focus state, and plain-language status message.
- Color-only state must also have an icon, label, or pattern.
- Locked, hidden, clipped, masked, and unavailable objects must be distinguishable without relying on color alone.
- Keyboard users can navigate rail, flyout, Layers, properties, and canvas selection.
- Destructive actions—Rasterize, Apply Mask, Outline Text, Merge, Delete Layer—require an explicit confirmation or an immediately recoverable history command.
- Right-click disabling remains part of the current product requirement, but all important actions must also be available through keyboard and visible menus.
- Terms acceptance, watermark, copyright responsibility, and user-content policy remain required before first use.

## 18. Implementation phases

### Phase E0 — Baseline hardening

- Keep the current Fabric.js object model and local draft behavior stable.
- Replace inferred layer type with explicit serialized `kind`.
- Centralize pointer coordinate conversion and transform commands.
- Add editor-specific automated tests for Move, selection, lock inheritance, layer reorder, undo/redo, Save/restore, Front/Back, and mockup attachment.
- Add the searchable shortcut/help panel.

### Phase E1 — Professional Move and selection

- Auto-select Layer/Group modes.
- Multi-select, marquee intersection preference, lasso intersection mode.
- 1/10 unit nudges, exact X/Y/W/H/rotation fields.
- Snap toggles, guides, spacing readouts, align/distribute panel.
- Transform origin, constrained scale, duplicate-on-drag, flip, and reset transform.

### Phase E2 — Vector precision

- Direct Path Edit and anchor handles.
- Add/delete/convert anchors and segment operations.
- Shape Builder and Boolean operations.
- Separate fill/stroke appearance model.
- Text on path and vector outline conversion with original-text preservation.

### Phase E3 — Layers and non-destructive effects

- First-class masks and editable mask mode.
- Full lock modes, linked layers, group isolation, and layer search/filter.
- Formal Smart Object container and replace-content UI.
- Effect stack, effect ordering, mask-aware effects, and export warnings.

### Phase E4 — Raster production engine

- Worker/tile-backed pixel buffer.
- Real pixel selections, paintable masks, pixel eraser, clone brush, and raster filters.
- AI Remove Background and Upscale for uploaded photos.
- Memory/performance limits and progressive rendering.

### Phase E5 — Product, mockup, and export production

- Private R2 assets and same-origin asset routes.
- Production mockup mappings for T-shirt, hoodie, streetwear, and jersey panels.
- Clean SVG and print export worker.
- Export manifest, coordinates, warnings, previews, and Print Admin handoff.
- Supabase Auth, account-backed designs, saved versions, and design limits.

### Phase E6 — Collaboration and advanced automation

- Server draft versions and conflict resolution.
- Comments/review states.
- Multi-artboard design sets and colorway variations.
- Batch mockup/export.
- AI-assisted layout, recolor, background removal, and image generation, each with explicit point cost and user confirmation.

## 19. Definition of done for the production editor

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

## References

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


## Appendix A — Fabric.js implementation logic

This appendix converts the product behavior above into a concrete Fabric.js 7.4.0 implementation strategy. The examples are TypeScript-oriented pseudocode: names may be adapted to the existing `FabricDesignCanvas.tsx`, but the state boundaries and event ordering should remain stable.

### A.1 Fabric object and application-state contract

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

### A.2 Move tool state machine

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

### A.3 Selection and locked-object guards

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

### A.4 Move coordinate, snapping, and group math

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

### A.5 Move preview versus committed state

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

### A.6 Keyboard Move implementation

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

### A.7 Fabric Text on Path architecture

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

### A.8 Custom FabricTextOnPath rendering

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

### A.9 Text on Path editing behavior

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

### A.10 Text on Path persistence and serialization

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

### A.11 Text on Path undo/redo transactions

Use separate command types so history descriptions are meaningful:

- `text-path-create`: text and guide path created together;
- `text-path-edit-text`: source string changed;
- `text-path-edit-style`: font, size, fill, stroke, spacing, or alignment changed;
- `text-path-move-offset`: start/baseline offset changed;
- `path-modified`: guide geometry changed and dependent text reflowed;
- `text-path-unlink`: text converted to ordinary text at its current visual placement;
- `text-path-delete`: linked text or guide deleted with a recoverable relationship record.

Typing should coalesce into one command after a short idle period. Dragging a path or offset handle should commit once on pointer-up. Undoing a path edit restores the path geometry and automatically re-renders every dependent text mark. Deleting a guide path must not silently delete text; offer “unlink and keep text,” “delete linked text,” or “cancel.”

### A.12 Text on Path export logic

For SVG export, generate a standards-compliant `<path>` and `<textPath>` only when the export renderer can preserve the selected font, direction, baseline offset, and effects. Otherwise, convert the glyph layout to vector outlines or a high-resolution raster fallback according to the print method, and record the conversion in `warnings.json`.

For PNG/mockup export, render the same glyph layout used by the Fabric preview onto an offscreen canvas at the requested export scale. Do not screenshot the browser canvas at its current zoom. The export renderer must use document dimensions and export scale, then apply the mockup mapping separately.

A clean production export must never include the editing guide path, selection controls, start-offset handles, missing-path badge, or text editing proxy. If the guide is intentionally part of the artwork, the user must duplicate/convert it to an ordinary visible path layer first.

### A.13 Fabric performance rules

- Cache flattened path samples and invalidate them only when the guide path geometry, scale, or relevant transform changes.
- Do not create a Fabric object per glyph for normal editing; use one custom Text on Path object.
- Render guides and measurement labels as transient objects in a separate overlay collection.
- Batch `requestRenderAll()` through `requestAnimationFrame` during pointer moves.
- Avoid calling `canvas.loadFromJSON()` for every React state update; update existing objects in place when IDs and kinds match.
- Use `object.setCoords()` after transform changes and before hit-testing or selection bounds are read.
- Keep `callbacksRef.current` current, as in the current prototype, so Fabric listeners do not close over stale React state.
- Mark linked dependents dirty when a path changes, but recalculate their layout lazily if they are outside the viewport.
- Add a maximum text length/path sample budget and show a non-destructive warning for unusually large designs.

### A.14 Implementation test matrix

The Move tool tests must cover single object movement, multi-selection, group movement, locked object rejection, locked ancestor rejection, Auto-select Layer/Group, Alt duplication, Shift axis constraint, Ctrl/Cmd snap bypass, arrow nudges, undo/redo, pointer cancellation, zoom 25/100/400%, rotated viewport, hidden layers, and Front/Back isolation.

Text on Path tests must cover creation from an open path, creation from a closed path, left/center/right alignment, start and baseline offsets, reverse side, keep-upright behavior, font/size/spacing changes, Unicode grapheme clusters, text editing through the IME proxy, path anchor movement, path deletion/unlink, missing path restore, undo/redo, SVG export, PNG export, mockup export, and exclusion of guide/selection overlays.

A visual regression fixture should render the same document at 25%, 100%, 400%, 1x export, and 4x export. The glyph positions and object transforms should remain identical in document coordinates. A serialization round-trip test must compare the canonical `CanvasMark`/`EditorLayer` state before and after Fabric reconstruction, not merely compare screenshots.

### A.15 Recommended implementation order

1. Extract transform conversion and edit-permission helpers from `FabricDesignCanvas.tsx`.
2. Add a `useFabricEditorController` or equivalent controller module for gesture transactions, selection synchronization, and history boundaries.
3. Finish Move tool snapping, exact fields, duplicate-on-drag, keyboard nudging, and transaction guards.
4. Add explicit `kind: "TextOnPath"` and `pathId` to the canonical mark schema and add migration tests.
5. Implement path flattening, glyph layout, and a custom Text on Path renderer with a hidden `IText` editing proxy.
6. Add offset/path handles, path dependency invalidation, serialization, and undo/redo commands.
7. Add SVG/PNG export parity and missing-path/export warning behavior.
8. Add performance and visual regression tests before enabling the feature for production users.

Until steps 4–7 are complete, the editor should label Text on Path as experimental and should not promise editable text-on-path production export. Until steps 1–3 are complete, Move should remain the only default selection tool and numeric transform edits should continue to use the existing guarded application-state path.
