# MH Fashion Editor Plan

**Status:** Planning baseline for `/create`  
**Date:** 2026-11-12  
**Parent plan:** [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) §6  
**Implementation boundary:** This document defines the behavior MH Fashion should build. It does not claim that every item below is already implemented.

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
