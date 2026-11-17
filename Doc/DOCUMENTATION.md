# MH Fashion — Project Documentation

**Canonical documentation file:** `Doc/DOCUMENTATION.md`
**Planning file:** [`Plan/PLAN.md`](../Plan/PLAN.md)

This file consolidates the website work log, code audit, Guide content maintenance instructions, and Admin Dashboard visual-reference notes that previously lived in separate `Doc/` and `docs/` files. The plan remains a separate, canonical file in `Plan/`.

## Contents

- [Website Work Log](#work-log)
- [Repository Code Audit](#code-audit)
- [Guide Content Operations](#guide-content-operations)
- [Admin Dashboard Visual Reference](#admin-dashboard-reference)

<a id="work-log"></a>
## Website Work Log

This log records completed website-related changes in the connected repository. Add an entry after each completed implementation or documentation task, with the date, scope, files, validation evidence, and known limitations. Code-review findings are detailed in [Code Audit section](#code-audit).

### 2026-11-17 — Header Bar 2 green boxes, Color dropdown, and price order

- Applied the owner's correction to Header Bar 2: `Price —` now appears immediately to the left of Save; every Product/GSM/Color/Size/Save/Buy box uses the app's green accent fill while keeping the same fully rounded 80×32px desktop / 80×44px touch dimensions.
- Replaced the always-visible Color dots with a box containing the selected theme swatch and a down-chevron. The chevron opens a fully rounded green dropdown with Background, Surface, and Accent options. The portal-mounted menu is not clipped by the horizontally scrollable bar, and it closes on selection, outside click, or Escape.
- Files: `apps/web/src/components/EditorHeaderBar2.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation on merged `main`: production build passed; lint completed with 0 errors / 25 warnings; all repository Node tests passed **55/55** and canvas-shell passed **16/16**. Focused post-merge CDP verification passed at 1280×900 desktop and 390×844 phone sizes for green box fills, Price-before-Save, rounded menu geometry, Color selection by touch, and mobile hiding of labels/price.
- Scope note: the broader `tests/editor-touch.cjs` run completed its Header Bar 2 checks, then stopped at the existing Edit sidebar selector on line 330 (`aside[aria-label="Edit sidebar"]`); that unrelated Sidebar test was left untouched.

### 2026-11-17 — Photoshop-like Pen cursor and path continuity

- Kept the existing vector Pen workflow (corner anchors, dragged Bézier points, Shift snapping, close/finish/cancel, and editable points/handles) and applied the owner's Photoshop-like continuity correction. The same Pen-nib cursor remains on the viewport and print canvas while Pen is selected, throughout drawing and after committing a path. The cursor hotspot is aligned to the nib point (`12 14`) with crosshair fallback; existing Move-based node editing remains unchanged.
- Finish/Close no longer switches the active tool to Move. Pen stays selected and ready to start another path. Other tools and their cursor behavior are unchanged; no unrequested Pen modes were added.
- Files: `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; all repository Node tests passed **55/55**, including canvas-shell **16/16**; lint completed with **0 errors / 25 warnings**; and `git diff --check` passed. Focused production-mode Chromium verified the same cursor before the first anchor, after each anchor, and after both Finish and Close path; Pen remained selected and a new path could start immediately after either completion.

### 2026-11-16 — Owner-directed Kittl-inspired Pen curves and node editing

- Replaced the straight-anchor-only Pen interaction with click-to-place corners, click-drag smooth Bézier handles, Shift snapping to horizontal/vertical/45-degree segments, a highlighted close target, and touch-visible Finish/Close/Cancel actions. Closed paths use the active foreground as fill; open paths remain stroke-only.
- Pen geometry is retained as editable anchor/handle/closed-state data alongside SVG path data. Double-clicking a selected Pen path enters node-edit mode; dragging points/handles edits the vector, clicking a segment inserts a node with cubic subdivision, and Alt-click, focused-point Delete/Backspace, or Delete point removes a node subject to open/closed minimums. Touch-sized invisible hit areas support Phone/Mobile pointer work. Ordinary handle drag mirrors the opposite handle; Alt-drag breaks the tangent. Changes are recorded through the existing layer undo history.
- Files: `apps/web/src/components/KittlCanvas.tsx`, `apps/web/src/lib/editor-pen-path.ts`, `apps/web/src/lib/editor-layers.ts`, `tests/editor-pen-path.test.cjs`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`, `package.json`, `Plan/PLAN.md`.
- Validation: `npm run build` passed with TypeScript; `npm run test:editor-pen-path` passed **5/5**, `npm run test:editor-layers` passed **14/14**, and `npm run test:canvas-shell` passed **15/15**. Focused ESLint on the edited app files and `git diff --check` passed with no warnings/errors.
- Limitations: snapping to unrelated objects/nodes and the full path appearance property set are not implemented in this pass. Pen paths currently create separate Shape layers and remain in the app's existing in-memory editor state; Save/persistent draft support is still unavailable.

### 2026-11-16 — Owner-directed Header Bar 2 pill selector redesign

- Rebuilt Header Bar 2 controls as consistent fully rounded boxes: 80×32px on desktop and 80×44px for coarse-pointer/touch layouts. Product defaults to `T-Shirt` with no `Choose` option; GSM defaults to `160 GSM` with no `Choose` option; Size defaults to `XL` with `XS` through `3XL` choices.
- Color is a three-swatch selector using the app theme's `Background`, `Surface`, and `Accent` tokens. Desktop retains the Product/GSM/Color/Size labels and shows `Price —` beside Save. Phone layouts hide the field labels and separate price text, leaving the horizontally scrollable control boxes.
- Save and Buy remain disabled placeholders; `/create` has no connected product-price source or order-save/checkout handler. Color and Size selections remain local UI state.
- Files: `apps/web/src/components/EditorHeaderBar2.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: `npm run build` passed (including TypeScript); `npm run lint` completed with 0 errors and 26 warnings; `node --test tests/*.test.cjs` passed **44/44** with the local production app available. A focused CDP check passed at 1280×900 desktop and 390×844 phone sizes, including pill dimensions, defaults, swatch-token color, and the shared Header Dark/Light toggle.
- Scope note: the broader legacy `tests/editor-touch.cjs` run still contains pre-upstream Edit sidebar expectations and stops in that unrelated section; those assertions were left untouched. Header Bar 2 was verified independently rather than expanding this task into Sidebar work.

### 2026-11-15 — Owner-directed Canva-style Editor Sidebar first slice

- Replaced the temporary left Edit sidebar categories with the owner-requested five-category flow: `Designs`, `Elements`, `Text`, `Upload`, and `Image Create`.
- The Sidebar is hidden by default like the Layers panel. Its circular arrow reveals a compact icon rail; selecting a rail item opens the larger panel. A second arrow click hides the rail/panel. The panel uses touch-sized controls and remains protected by the existing mobile mutual-exclusion behavior with Layers.
- Added the requested panel surfaces: top search for Designs, Elements, Text, Upload, and Image Create; design cards; design-layer entries; Add Text; image file selection with the configured KB/MB compression requirement shown; and an AI prompt/Create Image action.
- Files: `apps/web/src/components/EditorEditSidebar.tsx`, `tests/canvas-shell.test.cjs`, `Plan/PLAN.md`.
- Validation: canvas-shell tests passed after updating the assertions for the owner-requested categories and hidden → rail → panel interaction. `npm ci` completed successfully and installed the existing workspace dependencies.
- Validation: the canvas-shell suite passed **13/13**, TypeScript passed, the Next.js production build passed, and `git diff --check` passed. Workspace lint completed with **0 errors / 26 existing warnings**; no new lint error was introduced by this change.
- Limitations: the repository currently has no connected R2 design-library endpoint, SVG-layer extraction endpoint, canvas text/image object model, upload compression/insertion handler, or AI image-generation/download service. The first slice therefore records the UI and interaction contract without claiming those service integrations are complete.

### 2026-11-15 — Keep the Edit rail visible beside the selected section

- Corrected the Sidebar interaction per the owner's follow-up: opening `Designs`, `Text`, or another rail item no longer hides the compact icon rail. The selected category now opens beside the rail as one large section-specific panel, without a duplicate category row inside the panel.
- Selecting another icon on the still-visible rail switches the large panel content while keeping the rail in place. The circular arrow remains available at the outer panel edge to close the Sidebar.
- Files: `apps/web/src/components/EditorEditSidebar.tsx`, `tests/canvas-shell.test.cjs`, `Plan/PLAN.md`.
- Validation: updated the canvas-shell assertions to cover simultaneous rail/panel rendering and section-only panel content. The canvas-shell suite passed **13/13**, TypeScript passed, and `git diff --check` passed. The previous production build remains valid because this correction only changes the existing Sidebar JSX/layout and test assertions; a fresh full build is not required for this UI-only correction.

### 2026-11-15 — Sidebar actions now create real canvas and Layers-stack content

- `Add Text` no longer collects text in the panel. The removed secondary "Text to add" field is replaced by a direct canvas action: clicking the now-small `Add Text` button creates a text layer and focuses an inline editing field positioned on the print canvas, so the user types straight onto the artwork. Enter or Escape (or clicking away) commits the text while the layer stays in the stack. The prefilled placeholder text was removed as requested.
- The Text section now lists the **text layers that exist inside the MH Fashion Designs** below `Add Text`, and Elements no longer shows a plain layer list: every individual layer of every design is rendered as its own thumbnail card in the same two-column card grid style as Designs. Image Create has no search field. Upload keeps a file picker and now shows the user's placed uploads as thumbnail cards with their reduced file size.
- Layers gained a content `kind` (`artwork`, `text`, `shape`, `image`) plus text/shape/image payloads in `apps/web/src/lib/editor-layers.ts`. One shared preview renderer (`apps/web/src/components/EditorLayerPreview.tsx`) draws that content on the print canvas, on the Front/Back mockups, inside the Layers panel thumbnails and inside the Sidebar cards, so the same layer data appears everywhere.
- Every Sidebar addition now lands in the Layers box: design cards add all of that design's layers, element cards add the single clicked layer (a design text layer opens for typing), and an uploaded photo is re-encoded in the browser until it fits the configured size policy (`UPLOAD_MAX_BYTES`, currently 2 MB, with pixel-edge reduction) before being centred on the canvas as an image layer. On desktop the Layers dock opens automatically when content is added; on phones the existing one-dock-at-a-time rule is preserved.
- New files: `apps/web/src/lib/editor-design-library.ts` (MH Fashion design/layer catalog with one entry per individual layer and its SVG-space preview data, plus `designLayerToEditorLayer` / `designToEditorLayers` converters) and `apps/web/src/lib/editor-upload.ts` (size policy, byte formatting, canvas-based downscale/re-encode loop, print-area fitting).
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/lib/editor-design-library.ts`, `apps/web/src/lib/editor-upload.ts`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`, `Plan/PLAN.md`.
- Validation: canvas-shell **14/14**, editor-layers **7/7** (new text/shape/image coverage), canvas-spec **1/1**, browser-guards **1/1**, guides **9/9**; TypeScript passed; `next build` passed; `git diff --check` passed; lint **0 errors / 26 warnings** (all pre-existing, none in the files changed here).
- Limitations: the Designs/Elements/Text catalogs are the repository-side placeholder catalog in `editor-design-library.ts` (`DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"`); once the R2 listing and SVG-parsing endpoints exist they should feed the same `DesignLibraryEntry`/`DesignLibraryLayer` shape instead of the constant. Uploaded images and placed designs are stored in page memory as data URLs/layer data — no browser/account persistence or production export yet. Inline text editing is single-line per layer with no font family/weight/letter-spacing controls or text-specific transform handles; the existing whole-layer move transform applies. `Image Create` still has no AI generation service in this repository, so its button records the prompt and states that a generated image will land on the canvas as its own layer once that service is connected. The KB/MB ceiling is a single module constant rather than an admin-configurable value.

### 2026-11-15 — Canvas layer move/resize and direct text design controls

- Added selection transform controls for Sidebar-created layers on the print canvas: selected layers can be moved with the existing Move tool and resized using the green corner handle. The resize scale is clamped to a usable 25%–300% range and applies to artwork, design elements, text and uploaded images through shared layer rendering. The control is placed above the move hit area so it remains clickable.
- Add Text now opens an actual inline canvas editor with a real text input and a small formatting strip for font size and color. Text is stored immutably in the selected `text` layer while typing, and formatting updates redraw the same canvas text immediately. The layer remains selectable and visible in the Layers panel.
- Removed the user-visible R2 placeholder/status paragraph from Designs and the unnecessary AI service status copy from Image Create. The Sidebar now shows only design controls/cards and the requested functional actions.
- Files: `apps/web/src/components/KittlCanvas.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; canvas-shell **14/14**; editor-layers **7/7**; production build passed; `git diff --check` passed; lint **0 errors / 26 warnings** (existing repository warnings only).
- Remaining limitation: the current text strip provides font size and color first; font family, weight, alignment, letter spacing, and rich text controls are a follow-up layer-design pass. R2/AI service integration remains separate from the local layer mechanics.

### 2026-11-15 — Working Fill, layer grouping, ordering, and non-destructive masks

- Enabled the Layers box `Fill` field. It now writes a clamped `fillOpacity` value to the selected layer and the renderer applies it to all layer pixels/content, including freehand strokes, text, vector elements, and uploaded images. `Opacity` remains the whole-layer opacity control.
- Layer ordering is available through the existing per-layer Move Up / Move Down actions. Each action changes the actual shared array order used by the canvas and mockup renderers, so the visual stacking order follows the Layers box. Grouped layers are selected together and therefore move as one selection when using the canvas Move tool.
- Added Group and Ungroup actions for multi-selected layers. Group membership is stored as a `groupId`, shown beside grouped layer names, and selecting one grouped member selects the full group. Ungroup removes that membership without flattening or duplicating content.
- Kept and completed the non-destructive Photoshop-style mask flow: a mask is a separate thumbnail/target, black (`Hide`) strokes remove pixels through an SVG mask, white (`Reveal`) strokes restore them, and the source artwork remains unchanged. The mask can be selected independently in the Layers box and painted with the existing brush/mask target flow.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, `Plan/PLAN.md`.
- Validation: TypeScript passed; editor-layers **7/7**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Independent grouped layers, mask brush painting, and linked layers

- Group membership no longer forces every member to be selected. A grouped layer can be selected and moved independently; multi-select remains available for intentionally transforming several members together. The existing Group/Ungroup actions remain non-destructive.
- Selecting a layer mask now automatically switches to the Brush tool. Creating a new mask does the same, so the user can immediately paint black (`Hide`) or white (`Reveal`) directly on the canvas. The SVG mask keeps a white base plus black/white brush strokes, preserving source artwork for later mask edits/removal.
- Replaced the disabled adjustment-layer footer slot with a working `Link layers` action. Selecting two or more layers and clicking the link icon assigns a shared link membership; moving any selected linked layer expands the move set to its linked peers. Clicking the same action on linked selections removes the link. Group and Link are separate: groups can be individually selected, while links explicitly synchronize canvas transforms.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/KittlCanvas.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; editor-layers **8/8**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Photoshop-style layer stack drag reorder and folder groups

- Layer rows in the Layers box are now draggable. Dropping a row above/below another row calls the shared `moveEditorLayerToIndex` helper, so the actual layer array and canvas/mockup stacking order change directly instead of requiring repeated Move Up/Move Down clicks. The menu actions remain available as keyboard-friendly alternatives.
- Grouped layers now expose a folder-style collapsed/expanded header in the Layers box. Child rows remain individual layer rows with their own thumbnail, visibility, mask, rename, and selection controls. Collapsing only hides the child rows in the panel; it does not flatten or delete them. Group membership stays separate from Link Layers, and individual group children remain independently selectable.
- Files: `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`.
- Validation: TypeScript passed; editor-layers **9/9**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Restore stable Photoshop-style layer row layout

- Corrected the folder header integration that could overlap or distort the original layer rows. Each group now has a normal folder header wrapper followed by its child row; the original thumbnail, visibility, mask, name, options menu, and drag target remain intact.
- Child rows retain their normal height and controls, while collapse/expand only changes child visibility in the list. Layer data, order, masks, groups, Fill and Link behavior are preserved.
- Validation: TypeScript passed; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Editor-wide Group and Layers audit

- Normalized non-adjacent Group selections into contiguous folder blocks. Dragging a grouped layer now moves the complete folder block instead of splitting the group; dropping at the end of the stack has explicit append semantics. The group header remains collapsible while child layers retain individual selection/editing.
- Linked layer membership is now resolved for both canvas move and resize. Mixed selections no longer silently destroy unrelated link memberships; only all-unlinked selections create a new link, and a selection sharing one link group can unlink it.
- Deleting layers now filters stale multi-selection IDs and repairs the primary selection against the remaining stack. Fill/Opacity updates reject non-finite values and retain the previous value instead of allowing `NaN` into SVG styles.
- Mockup bounds/empty-state now include visible text, image, shape, and stroke content instead of strokes only. Mask and artwork thumbnails now convert normalized stroke points into the `1000 × 1200` thumbnail viewBox correctly.
- Updated the stale editor touch-test Fill selector to the functional `#editor-layer-fill` input. Focused validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (existing project warnings remain).
- Remaining follow-up: selection rectangles are still canvas-tier bounds rather than exact per-primitive bounds, and mockup lock/transform affordances need a dedicated browser interaction pass.

### 2026-11-15 — Photoshop-style transform handles and mask color workflow

- Replaced the single bottom-right canvas resize handle with eight Photoshop-style handles: four corners and four side/midpoint handles. All handles use the shared resize transaction so the selected layer set remains consistent while scaling.
- Added selectable Group folder headers. Selecting the Group header selects every child layer, so canvas move/resize applies to the complete group. Selecting an individual child row keeps the transform selection limited to that child; the Layer box selection remains the source of truth.
- Removed the redundant mask instruction panel and Hide/Reveal buttons from the Layers box. Mask painting now follows the existing Photoshop-style foreground/background color switch: black foreground hides and white foreground reveals. Selecting/creating a mask still switches to Brush automatically.
- Updated canvas-shell and touch-test expectations for eight handles and color-switch mask painting. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; editor-touch syntax passed; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Functional Adjustment panel with Layers return arrow

- The bottom `Adjustment` icon is now functional. Clicking it opens a dedicated right-side Adjustment panel for the selected layer and closes the Layers panel at the same time.
- Text layers expose editable text content, font size, and color controls, plus shared Opacity and Fill controls. Non-text layers show their shared appearance controls and a clear message that text properties are not applicable.
- While Adjustment is open, its round arrow occupies the same dock-toggle position. Clicking that arrow closes Adjustment and reopens the Layers box, preserving the current selection.
- The Adjustment action is available on touch layouts as well as desktop layouts. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Dynamic Photoshop-style canvas selection bounds

- Removed the fixed `120,160 → 880,1040` transform frame. The canvas now calculates selection bounds from the selected layer content: strokes, text metrics, image boxes, and shape path coordinates. A Group selection unions all child bounds; an individual child selection uses only that layer's bounds.
- The eight resize handles are positioned on the calculated corners and side midpoints. Resize direction is handle-aware, so left/top handles grow inward/outward in the expected direction while preserving the layer scale model. Move and resize still use the complete selected ID set, so group-header selection affects the group and child selection affects only the child.
- Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Complete text adjustments and direct Text tool typing

- Expanded text layer styling beyond size/color: font family, bold, italic, underline, left/center/right alignment, letter spacing, and line height are now stored on the text layer and rendered on the canvas.
- The Adjustment panel exposes these controls without requiring the user to re-enter the text. Text content remains editable there as an optional direct edit, while style changes apply immediately to the selected layer.
- Added `Text` to the bottom Tools bar. With Text selected, clicking a position on the canvas creates a new text layer at that exact canvas coordinate and focuses the inline editor so the user can type immediately.
- Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Kittl-style editor interaction pass

- Added the missing Photoshop/Kittl-style rotate affordance below the dynamic selection bounds. Rotation is tracked per layer and applied to selected linked layers together; the handle displays a live canvas interaction rather than a fixed-size transform control.
- Text entry now returns to the Move/selection tool after the inline editor commits, matching the common Kittl flow where Text is an insertion tool and selection resumes after typing.
- Preserved the existing Text Adjustment typography controls and direct Text tool workflow while extending the canvas transform foundation. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Layer-aware Move Tool and no-scroll Tools Bar

- Removed horizontal scrolling from the bottom Tools Bar. The controls now wrap into additional rows when the viewport is narrow, allowing the dock to grow in height instead of hiding tools behind a horizontal scroller.
- Move Tool now operates on the selected artwork layer(s), not the entire canvas artwork. A normal layer click selects one layer; Shift/Ctrl/Cmd-click toggles additional artwork layers. Dragging the canvas then moves only the selected, unlocked layers. Each layer keeps its own bounded in-memory canvas offset, and new strokes on a moved layer remain aligned with that layer.
- Files: `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`.
- Validation: no horizontal Tools Bar overflow assertion, canvas shell **13/13**, editor layers **6/6**, TypeScript, Next.js production build, and Phone/Desktop editor-touch suite passed across 390 × 844, 320 × 740, both landscape sizes, and 1280 × 900.
- Limitations: multi-selection is currently an in-memory layer selection for the active Editor route; it is not yet serialized into a draft or export format.

### 2026-11-15 — Canva-style Edit rail, Photoshop color swap, and canvas Move tool

- Reworked the Edit sidebar into a compact left icon rail like Canva. The rail remains narrow when idle; clicking a Design, Elements, Text, Brand, Uploads, Draw, Projects, or Apps icon opens the wider Edit box and highlights that category with a short honest status description. The existing circular expand/collapse control and Phone/Desktop overlap guard remain in place.
- Updated the Tools Bar color controls to keep the overlapping Photoshop-style foreground/background squares and added a small circular swap control. Clicking either square opens its color picker; clicking `Swap foreground and background colors` exchanges the two colors. New Pen/Brush strokes continue to use the current foreground color.
- Move Tool now has a dedicated interactive target over the print canvas artwork. With Move selected, dragging the canvas artwork changes its shared source overlay transform within bounded canvas offsets; the existing independent Front/Back mockup movement remains unchanged.
- Files: `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, and `tests/editor-touch.cjs`.
- Validation: canvas shell **13/13**, editor layers **6/6**, browser guards **1/1**, TypeScript, Next.js production build, and `git diff --check` passed. Production Chromium editor-touch passed at 390 × 844, 320 × 740, both landscape sizes, and 1280 × 900 desktop.
- Limitations: Edit categories currently provide layout and honest status text rather than connected Canva asset libraries; canvas Move uses a bounded in-memory transform and does not yet serialize to a document draft or export.

### 2026-11-15 — Add Shape / Gradient / Redo tools and shrink editor controls

- Owner request: added `Shape`, `Gradient`, and `Redo` to the compact bottom Tools Bar. Shape and Gradient select their tools and show an honest availability notice because their vector-shape and gradient-fill pipelines are not connected yet. Redo is functional and paired with the existing bounded 30-snapshot artwork Undo history; making a new draw/erase action clears the redo branch.
- Matching controls: the Tools Bar collapse chevron now uses the same solid `bg-accent` circular-arrow treatment as the Edit sidebar and Layers panel show/hide toggles. The existing panel positions remain edge-safe on Phone so the right Layers arrow does not cover the canvas options control.
- Canvas menu: reduced the desktop menu from the previous 144 × 82 px treatment to a compact approximately 112 × 62 px box with 20 px rows, 10 px labels, 11 px icons, and 0.5 padding. Phone/Mobile keeps 40 px rows for touch while retaining the smaller box, and menu pointer events are isolated so touch selection remains reliable.
- Files: `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, and `Plan/PLAN.md`.
- Validation: canvas shell **13/13**, canvas specification **1/1**, browser guards **1/1**, editor layer model **6/6**, and Guide **9/9** passed. TypeScript, `git diff --check`, Next.js production build, and Cloudflare/OpenNext build passed; ESLint remains **0 errors / 25 pre-existing warnings**. The Chromium editor-touch suite passed at 390 × 844, 320 × 740, both landscape sizes, and 1280 × 900 desktop. Final CDP checks confirmed the compact menu entries, theme accent colors/wires, and the updated Tools Bar icons.
- Limitations: Shape and Gradient are UI-selected tools with notices only; they do not yet create vector shapes or gradient fills. Full-document history, persistence, export, physical-device verification, and Cloudflare deployment remain outstanding.

### 2026-11-15 — Add color swatches and remove Text Tool from dock

- Applied this request on the latest `main` after preserving 42 remote commits that had arrived since the earlier local checkout, including the new compact Editor Tools bar and editor functionality. Added overlapping Foreground Color and Background Color swatches to the existing responsive bottom-center dock; removed the Text button from that dock, the `EditorTool` type, and its selection notice. The separate Edit sidebar's disabled `Text` category is unchanged.
- Foreground color is carried in each new Pen/Brush stroke and retained through live point updates and layer duplication; the artwork renderer uses it on the transparent print canvas and both Front/Back previews. Existing strokes without color remain the default dark ink. Background color remains a selectable swatch only and does not fill the transparent canvas. The existing dock/collapse behavior and narrow-screen sidebar hiding are retained.
- Validation: repository Node suites **35/35** (Guide 9, Guide HTTP 5, browser guards 1, canvas spec 1, canvas shell 13, editor layers 6); TypeScript, Next.js production build, Cloudflare/OpenNext build, and `git diff --check` passed. Web workspace lint completed with **0 errors / 25 warnings**; no diagnostics were reported for the changed components. The production Chromium editor-touch suite passed at Phone/Mobile 390×844 and 320×740, landscape 740×390 and 844×390, and desktop 1280×900; its viewport assertions confirm both swatches stay visible and the Text Tool stays absent. Browser smoke test selected Foreground `#e11d48` and Background `#16a34a`, drew a stroke, and confirmed the red stroke on canvas plus Front and Back previews.
- Limitations: Background selection is not a fill/background-editing feature; color and stroke state remain in page memory. The disabled Text category remains in the separate Edit sidebar because this request removes only the Text Tool from the bottom dock. Physical-device checks remain outstanding.
- Deployment status: GitHub Actions run **43655055510** for commit `392b4fa` failed during the secret preflight because both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing from the repository's Actions environment. Their values are not available in this session, so no manual deployment was attempted. The live browser still serves the prior toolbar (Text button present; swatches absent); this change is on `main` but is not live. Deployment requires saving both as encrypted Actions repository secrets, then rerunning the workflow.
### 2026-11-15 — Compact canvas options menu with per-side Mockup entries

- Owner-directed Editor scope: shrink the box that opens from the small circle on the print canvas, replace its single `Add Mockup` action with separate `Front Mockup` and `Back Mockup` actions, remove the `+` control from the Front Mockup box, and recolour that circle plus the canvas/mockup connector wires with the app theme.
- Web/Desktop: the menu now measures 144 x 82 px with 24 px rows (`min-w-36`, `p-1`, `text-xs`, 13 px icon and checkbox) and lists `Show Grid`, `Front Mockup`, `Back Mockup`. Phone/Mobile shows the same three entries in the narrower box and keeps 44 px row height; an already-attached side disables its own entry with an explanatory tooltip, and Product `Phone` continues to offer only `Front Mockup`. Each mockup box keeps its own close `x`; the in-box `+` add button no longer exists on either form factor.
- Theming: the canvas-edge circle uses `bg-accent` with a `text-accent-foreground` centre (verified `rgb(212, 255, 63)` / `rgb(13, 13, 13)` in Dark) and the connector wires use `text-accent` with `stroke/fill="currentColor"`, so both follow the Header Light/Dark toggle like the Layers and Edit sidebar controls. While the menu is open the print-canvas node is raised to `z-30`; this fixed a defect found during browser verification where an attached mockup box painted over the menu and swallowed clicks on the `Back Mockup` row.
- Files: `apps/web/src/components/KittlCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`.
- Validation: canvas shell **13/13**, canvas specification **1/1**, browser guards **1/1**, editor layer model **6/6**, Guide **9/9** and Guide HTTP **5/5** passed. TypeScript, `git diff --check`, the Next.js production build and the Cloudflare/OpenNext Worker build passed. ESLint reported **0 errors / 25 pre-existing warnings**, none in the changed files. The production Chromium editor-touch suite passed at 390 x 844, 320 x 740, 740 x 390, 844 x 390 and 1280 x 900 desktop, including the menu-driven Back Mockup flow and the menu row staying 44 px tall at 25% zoom. CDP screenshots and computed-style checks confirmed the compact menu size, the accent circle, accent `currentColor` wires, and zero add buttons inside mockup boxes.
- Limitations: the mockups are still neutral placeholder boxes with no R2 assets, and the Editor has no Fabric document state, text/image objects, account persistence or production export yet. Physical-device verification remains outstanding. A GitHub push is not a deployment: the Cloudflare secrets are still missing, so production is unchanged.
- Integration note: this work was rebased onto the color-swatch commits `392b4fa` / `5c5c3d3` and re-verified there — all repository Node suites **35/35**, TypeScript, ESLint (0 errors / 25 pre-existing warnings), Next.js build, Cloudflare/OpenNext build, `git diff --check`, and the full Chromium editor-touch suite passed. Both theme modes were re-measured after the merge: circle and wires `rgb(212, 255, 63)` with a `rgb(13, 13, 13)` centre in Dark, `rgb(101, 156, 20)` with a white centre in Light.
- Deployment status: the push is commit `fa1aff8` on `main`. GitHub Actions run **43655653005** failed at the same secret preflight (`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are still absent), so production continues to serve the previous build.

### 2026-11-15 — Remove visible text from Tools bar toggle

- Removed the `title` tooltip from the circular Tools bar expand/collapse arrow. Pointer hover no longer shows “Expand tools”/“Collapse tools”; the control remains icon-only. Its dynamic `aria-label` and `aria-expanded` remain for accessibility.
- The shared toggle and expand/collapse behavior are unchanged across Web/Desktop and Phone/Mobile.
- Validation: all Node suites **35/35**, TypeScript, Next.js production build, Cloudflare/OpenNext build, and `git diff --check` passed. Workspace lint completed with **0 errors / 25 warnings**, with no diagnostic for the changed component. Production Chromium checks passed at 390×844, 320×740, 740×390, 844×390, and 1280×900; each viewport verified no title or visible text on the arrow in both collapsed and expanded states.
- Deployment status: awaiting the GitHub Actions run for this commit; the repository currently lacks the two Cloudflare Actions secrets recorded above.

### 2026-11-15 — Add a compact bottom-center Editor Tools bar

- Added a small, rounded, theme-aware dock at the bottom center of `/create`, with a circular expand/collapse control and 28 px icon buttons for Move, Pen, Hand, Brush, Eraser, Text, Undo, and Remove BG. At 390 × 844 the dock measured 291 × 42 px and cleared the measured mobile navigation. It hides on narrow screens while either side panel is open so it does not cover panel controls.
- Pen and Brush add distinct strokes to the selected unlocked artwork layer and mirror to both mockup previews; Brush renders thicker and softer than Pen. Eraser removes whole strokes touched on the selected artwork layer or active mask. Undo restores the last draw/erase snapshot, bounded to 30 actions. Move uses the current canvas/mockup movement interactions; Hand pans the shared workspace. Text and Remove BG show availability notices because text objects, image upload, and the background-removal pipeline are not implemented yet.
- Validation: canvas shell **13/13**, canvas spec **1/1**, browser guards **1/1**, Guide **9/9**, and editor layer model **6/6** passed; TypeScript, changed-file ESLint, `git diff --check`, and Cloudflare/OpenNext production build passed. The production Chromium editor-touch suite passed across 390 × 844, 320 × 740, two landscape sizes, and desktop. A separate production pointer smoke test confirmed Pen/Brush appearance, Undo/Eraser, Move, Hand, Text/Remove BG notices, and collapse/expand. A real 390 × 844 touch test verified 28 px Brush selection, Brush drawing, and dock collapse/expand.

### 2026-11-15 — Add the temporary Edit sidebar

- Added the `Edit sidebar` opposite the right-side Layers dock, on the left. It begins collapsed and opens/closes with a matching small round, app-accent-colored arrow control.
- Added disabled Canva-like placeholders for `Design`, `Elements`, `Text`, `Brand`, `Uploads`, `Draw`, `Projects`, and `Apps`; their actual content and actions remain pending the owner's next step-by-step instructions.
- On narrow screens, opening one dock closes the other to avoid panel overlap; resizing from desktop into the narrow breakpoint closes both docks. Desktop can keep both sidebars open. Both use theme-aware styling and touch-friendly controls.
- Validation: all repository Node suites **33/33**, TypeScript, changed-file ESLint with no warnings, Cloudflare/OpenNext production build, and responsive Chromium checks passed. CDP verified all eight disabled tool labels, collapsed-by-default left docking, mobile mutual exclusion and desktop-to-phone resize handling, nonoverlapping desktop docks, app accent color in Light/Dark, touch-sized mobile control, and existing editor/layer regressions. Physical-device checks remain outstanding.

### 2026-11-15 — Remove unused Layers rows and accent the circular toggle

- Kept the existing compact right-side panel, but removed the unused `Channels`, `Paths`, top `Menu`, and `Kind` rows. The functional Layers title, blend/opacity, Lock/Fill, layer/mask rows, and bottom action strip remain.
- Replaced the rectangular edge trigger with a circular button using the app's `bg-accent` / `text-accent-foreground` tokens, so it changes with Header Light/Dark. It is 28px on desktop and expands to a 44px coarse-pointer touch target.
- Validation: all Node suites **32/32**, TypeScript, changed-file ESLint with no warnings, Cloudflare/OpenNext production build, and responsive Chromium tests passed. Browser checks cover the removed rows, active theme accent on the toggle, desktop/phone sizing, layer/mask operations, and existing mobile/editor regressions.

### 2026-11-14 — Compact Layers panel to match supplied Photoshop layout

- Reworked the right-side dock to follow the owner's supplied 398×770 Photoshop reference: compact `Layers / Channels / Paths` tabs; a `Kind` filter row; `Normal` blend and numeric opacity; `Lock / Fill` controls; short visibility/thumbnail/name/mask rows; and a compact bottom action strip. Reduced the panel to a 16rem maximum and labels to 11px; the row overflow menu holds rename/reorder/duplicate/delete and mask operations.
- Artwork and mask thumbnails preview their vector strokes. The working controls remain functional; screenshot-specific items not supported by the editor yet (Channels/Paths content, kind filters, pixel locks, Fill, effects, adjustment layers, and groups) are explicitly disabled. Portrait phones retain 44px touch targets; short-landscape viewports (≤500px tall) hide the decorative Kind row and reduce toolbar controls to free scrolling room for the layer/mask list.
- Reference source: user attachment `pasted_file_OMaJAy_image.png` (398×770), supplied 2026-11-14; it is not copied into the repository.
- Validation: all repository Node suites **32/32**, TypeScript, changed-file ESLint with no warnings, Next.js/Cloudflare OpenNext production build, and `git diff --check` passed. Chromium verified the 16rem maximum width and 11px row labels at 1280×900, 390×844/320×740 portrait, 740×390 and 844×390 landscape including mask-control scrolling, right-dock open/close, theme switching, create/draw/duplicate/delete, mask hide/reveal, and existing Phone/T-Shirt, Front/Back, and 3500/1500px tier behaviors. Physical-device checks remain outstanding.

### 2026-11-14 — Dock Layers on the right in a Photoshop-inspired panel

- Moved the initially collapsed Layers dock to the Editor viewport's right edge and moved its toggle arrow to the left edge of the dock.
- Applied a compact neutral graphite/light-gray treatment with Photoshop-like blue selected-layer feedback; the existing Header Light/Dark toggle still changes the panel colors. Layer and mask operations remain unchanged.
- The exact reference image was not available in the repository or the inherited message attachments, so this is a Photoshop-inspired right dock—not a pixel-exact recreation of the screenshot. Reattach the image to refine its precise panel tabs, controls, and spacing.
- Validation: right-edge placement is checked in responsive Chromium for 390×844 and 320×740; TypeScript, ESLint, all Node suites, and the Cloudflare/OpenNext build are rerun for this positioning/style update.

### 2026-11-14 — Implement functional Layers and non-destructive vector masks

- Replaced the left-side panel's “controls later” shell with an initially collapsed, theme-aware layer stack. The current vector artwork layer model supports add/select/rename/reorder, show/hide, lock, duplicate/delete, opacity and blend mode. Canvas drawing appends to the selected unlocked layer.
- Added Photoshop-style Layer Masks: add/remove a mask, select it independently from its artwork, and paint black to hide or white to reveal using the print canvas. Source strokes remain intact. Ordered visible layers, opacity/blend and masks are rendered on the print canvas and shared Front/Back previews; per-mockup move/resize and the existing transferable artwork tier remain independent and unchanged.
- The panel and its Properties/mask controls scroll on short screens. Mobile browser coverage exercises layer create, artwork drawing, hide/reveal mask strokes, duplicate/delete, and reachability at a 844×390 landscape viewport as well as the existing 390×844 and 320×740 phone checks.
- Limitations: artwork and mask strokes are vector and page-memory only. Raster/pixel selection masks, undo/redo, serialized/browser/account saving, production export, and broader Photoshop features are not claimed in this slice; continue those only from the owner's next explicit instructions.
- Validation: all repository Node tests **32/32**, TypeScript, changed-file ESLint, Next.js and Cloudflare/OpenNext production builds, Chromium touch/mouse checks, and `git diff --check` passed. Physical Android/iPhone testing remains outstanding.

### 2026-11-14 — Restore selectable Product and remove Choose defaults

- Replaced the fixed Product value with a compact 92px dropdown. It has no `Choose` option, defaults to `T-Shirt`, allows `Phone`, and keeps `Hoodie`, `Cup`, `Kids`, and `Bag` visible but inactive until their rules are specified.
- Removed `Choose` from the GSM dropdown and selected `160 GSM` as its initial value. Changing between T-Shirt and Phone preserves the GSM selection. Phone still switches to disabled Brand/Model placeholders and permits only one visible Front Mockup; returning to T-Shirt restores the previous Back Mockup.
- The left Layers panel remains a closed-by-default shell only. The owner has now requested Photoshop-style functions including new layers, masks, and deletion. Those operations are not yet implemented; the exact meaning of `Mark` and how layer edits should apply across the print canvas and Front/Back Mockups need clarification before connecting controls to artwork.
- Validation: canvas-shell **11/11**, all repository Node tests **27/27**, TypeScript, changed-file ESLint, Cloudflare/OpenNext build, Chromium Product/GSM and Phone mockup checks at 390×844 and 320×740, desktop theme and mouse checks, Layers shell toggle checks, and `git diff --check` passed.

### 2026-11-14 — Fix Product to T-Shirt and add the Layers panel shell

- Reduced the `Product` value box to 92px and made it a fixed, read-only `T-Shirt` value for this step. Product switching is intentionally not exposed; the prior Phone-specific rules remain in the code but are not reachable in the current UI. The `GSM`, `Color`, and `Size` fields remain in place.
- Added a closed-by-default Layers panel shell on the left edge of the Editor viewport. Its arrow opens the panel, moves to the panel edge, and closes it again. The panel currently contains only the `Layers` heading and a note that controls will be added step by step.
- No Photoshop layer list, create/delete/reorder/visibility/lock controls, blending, opacity, or artwork-to-layer behavior was added; those details are deferred to the owner's later instructions. The overlay stays within the Editor viewport, below the phone view toolbar, and uses the app's theme colors.
- Validation: canvas-shell **11/11**, all repository Node tests **27/27**, TypeScript, changed-file ESLint, Cloudflare/OpenNext build, Chromium checks at 390×844 and 320×740 (open/close and drawer width), landscape phone and 1280×900 desktop open/close, existing touch/mouse editor regressions, and `git diff --check` passed. Physical Android/iPhone testing remains unavailable.

### 2026-11-14 — Make the first Product choices control Bar 2 and Mockups

- `T-Shirt` is the default supported product. Its Bar 2 shows `GSM` and the existing `Size` placeholder; `Color`, `Save`, and `Buy` remain in the row. Selecting `Phone` hides `GSM`/`Size` and shows disabled `Brand`/`Model` placeholders because no brand/model options have been specified; `Color` remains visible.
- On Phone, only one usable Front Mockup is shown and the Back-add control is unavailable. A T-Shirt Back Mockup is preserved while Phone is active and reappears when switching back to T-Shirt. The Front/Back transferable artwork tier remains usable for T-Shirt, and the single Phone mockup receives the large tier. The Product list keeps `Hoodie`, `Cup`, `Kids`, and `Bag` visible but disabled until their rules are specified; no attribute or brand/model options were invented.
- Updated `/create`, the shared Product type, `EditorHeaderBar2`, `KittlCanvas`, tests, and current-state documentation. This supersedes the placeholder-only Product/GSM behavior in the following earlier log entry.
- Validation: canvas-shell **10/10**, all repository Node tests **26/26**, TypeScript, changed-file ESLint, Next.js production build, Chromium Product switching on phone viewports (conditional fields, Phone's single visible mockup/no Back-add control, preserved T-Shirt Back state), desktop mouse/touch regressions, and `git diff --check` passed. Physical Android/iPhone verification remains unavailable.

### 2026-11-14 — Phone Product Detail gallery frame alignment

- Removed the extra outer Product Detail card border, background, padding, and
  shadow below the phone breakpoint. The main product photo and the thumbnail
  row now sit on the same aligned gallery edge without a second side frame
  protruding beside them.
- Kept the framed card treatment for tablet and desktop through the responsive
  `sm` breakpoint and above.
- Validation: the merged Cloudflare/OpenNext production build and `git diff --check` passed before the direct-to-`main` push.

### 2026-11-14 — Add Editor Header Bar 2 placeholders

- Reduced Bar 2 from 56px to a compact 44px row. At that stage, `Product` offered `T-Shirt`, `Phone`, `Hoodie`, `Cup`, `Kids`, and `Bag`; `GSM` offered `160`, `180`, `200`, and `240 GSM`. Product/GSM selections were local to the toolbar before the product-dependent rules were implemented above.
- Kept `Color` in place as requested. `Size`, `Save`, and `Buy` remain disabled placeholders pending later specifications. The row horizontally scrolls on narrow screens.
- Connected Bar 2, the Editor workspace chrome, touch controls, and canvas-options menu to the existing theme tokens. Toggling Dark/Light in the site Header changes the Editor and dropdown appearance; the white print canvas and neutral mockup preview remain stable.
- Validation: all repository Node tests **26/26**, canvas-shell tests **10/10**, TypeScript, changed-file ESLint, Next.js production build, Chromium Product/GSM selections, portrait/landscape interactions, desktop Header theme toggle and color changes, and `git diff --check` passed.

### 2026-11-14 — Reuse the existing web Header Bar in Editor

- Mounted the existing `Header` component above the `/create` editor workspace. Its current responsive behavior is reused as-is: mobile hamburger/logo bar on phones and the floating navigation/actions bar on desktop; no second editor-specific Header or redesign was added.
- Kept the editor inside the remaining viewport height below the Header and above the measured mobile bottom navigation. Updated canvas-shell assertions and the reusable Chromium check to verify the appropriate existing Header is visible and the editor starts below it at mobile and desktop sizes.
- Validation: canvas-shell tests **9/9**, all repository Node tests **25/25**, TypeScript, modified-file ESLint, Next.js production build, Chromium portrait/landscape mobile interactions and desktop mouse interactions, and `git diff --check` passed. The existing Header is visible above the editor at the phone and desktop browser sizes tested.
- Limitation: the existing mobile Header and bottom navigation together leave less vertical editor space on phone; this task intentionally preserves the site's current Header design and controls.

### 2026-11-14 — Phone/Mobile Editor ကို အတည်ပြုထားသော Desktop system နှင့်တူအောင် ပြင်ဆင်ခြင်း

- လက်ရှိ Desktop ဒီဇိုင်းနှင့် shared 3500/1500 px tier ကို မပြောင်းပါ။ Front/Back Artwork group တစ်ခုချင်းစီကို လက်ဖြင့် သီးခြားရွှေ့/resize ပြုလုပ်နိုင်ပြီး အကြီး tier ကို နှစ်ဖက်လုံး ပြောင်းသုံးနိုင်သည်။ Overlay ပြင်ဆင်မှုကြောင့် source strokes သို့မဟုတ် outer Mockup box မပြောင်းပါ။
- ဖုန်းတွင် blank Mockup swipe သည် workspace scroll ဖြစ်ပြီး၊ Mockup header သည် box drag surface ဖြစ်သည်။ Artwork bounds/handle နှင့် Canvas drawing surface တွင် touch gesture ကို browser scroll က ကြားဖြတ်မရအောင် သီးခြားထိန်းထားသည်။ Primary touch က gesture ကို ပိုင်ဆိုင်ပြီး secondary touch၊ cancel၊ lost capture နှင့် window blur တို့ကို ခွဲခြားပိတ်သိမ်းသည်။
- Finger-sized 44 CSS px controls နှင့် invisible move/resize hit targets ထည့်ထားသည်။ မူလ purple dots/resize circle ကို ထိန်းထားပြီး desktop ခလုတ်အရွယ် မပြောင်းပါ။ ဖုန်းအတွက် readable pixel-dimension badge နှင့် `Pan view`, Zoom `+`/`−`, `Reset view` controls ထည့်ထားသည်။ View controls သည် artwork transform မဟုတ်ဘဲ viewport state ကိုသာ ပြောင်းသည်။ Landscape တွင် desktop breakpoint ကျော်သော်လည်း touch controls/stacking ဆက်ရှိသည်။
- Zoom 25% တွင်လည်း controls နှင့် dimension badge မသေးသွားအောင် inverse-scale ဖြင့် screen size ကို ထိန်းထားသည်။ သေးငယ်သော Artwork ကို select လုပ်ပြီးနောက် move/resize hit areas မထပ်စေရန် ဖုန်း resize handle ကို သီးခြားနေရာတွင် connector ဖြင့်ပြသည်။
- Mobile bottom navigation ၏ တကယ့်အမြင့်နှင့် safe-area ကိုတိုင်းပြီး `/create` အမြင့်နှင့် root padding တွင် တစ်ကြိမ်တည်း ချန်ထားသည်။ Editor အောက်ပိုင်းကို navigation မဖုံးတော့ပါ။
- ပြောင်းလဲသည့် source: `KittlCanvas.tsx`, `MockupArtwork.tsx`, `MobileBottomNav.tsx`, `/create/page.tsx`, root layout။ `tests/canvas-shell.test.cjs` တွင် mobile regression assertions ထည့်ထားပြီး `tests/editor-touch.cjs` သည် Node 22 နှင့် local Chromium CDP endpoint ကိုသာ သုံးသည့် reusable touch integration check ဖြစ်သည်။ Dependency အသစ် မထည့်ပါ။
- Validation: Node tests **24/24**၊ TypeScript၊ changed-file ESLint၊ Next.js/OpenNext Cloudflare build နှင့် `git diff --check` အောင်မြင်သည်။ Chromium တွင် 390×844၊ 320×740 portrait touch၊ 740×390 နှင့် 844×390 landscape၊ tiny selected Artwork ကို ထပ်မံရွှေ့ခြင်း/resize၊ tier နှစ်ဖက်လုံး လွှဲပြောင်းခြင်း/release၊ pan/zoom၊ Zoom 25% screen-sized controls/readable badge၊ second-touch/cancel နှင့် desktop control-size/mouse drawing/Back resize regression တို့ကို စမ်းသပ်အောင်မြင်သည်။
- Limitation: physical Android/iPhone နှင့် iOS Safari ပေါ်တွင် မစမ်းရသေးပါ။ Artwork/state များသည် အရင်အတိုင်း page memory တွင်သာ ရှိသည်။ Native app၊ multi-touch pinch editor သို့မဟုတ် roadmap feature အသစ်များ မထည့်ပါ။
### 2026-11-14 — Phone Product Detail option and price verification

- Exercised the X Marks Product Detail flow at a 390×844 phone viewport. The
  gallery, option rows, price area, and fixed phone navigation rendered without
  horizontal overflow in the captured phone screenshot.
- Verified the price sequence: initial `20,000 – 24,000 Ks`; Size alone keeps
  the range; Size + Color + Material + GSM changes it to `24,000 Ks`; Quantity
  2 while the required set is incomplete shows `40,000 – 48,000 Ks`; Quantity
  2 after all four required choices shows `48,000 Ks`.
- This was an interaction/verification pass only; no application source change
  was required. The local server could not render a product route because this
  sandbox has no Supabase catalog environment variables, so the live catalog
  page was used for the click-through check while the 390×844 screenshot was
  also inspected locally.

### 2026-11-14 — Phone interaction audit and copyright placement correction

- Audited the phone-visible navigation and Product Detail controls. The mobile
  header search icon now opens a real search form that submits to
  `/mh-fashion?q=...`; Product Detail Share now uses the Web Share API with a
  clipboard fallback; Size Guide and Review actions switch to their tabs; and
  Fit Type/Sleeve controls now keep their selected state.
- Replaced the no-op phone Sort button on `/mh-fashion` with the existing sort
  query link and changed the phone Filter button to a working category jump.
- Changed `CopyrightBar` to `hidden md:block`. On Phone, copyright is now shown
  only at the bottom of the mobile side drawer (`MobileNav`); the desktop
  copyright strip remains unchanged. The fixed bottom navigation still keeps
  its own safe-area/page clearance.
- Files changed: `apps/web/src/components/MobileNav.tsx`,
  `apps/web/src/components/CopyrightBar.tsx`,
  `apps/web/src/components/ProductDetailClient.tsx`, and
  `apps/web/src/app/mh-fashion/page.tsx`.
- Validation: `npm run lint --workspace=apps/web` completed with **0 errors / 25
  warnings** (the warnings are existing React effect and image warnings), the
  Next.js production build passed, and `git diff --check` passed.
- Remaining limitation: the mobile drawer still contains several future-help
  and app-download placeholder destinations; this audit did not invent those
  missing product/service pages.

### 2026-11-14 — GSM selector and quantity-aware price on product detail

- Replaced the Product Detail `Print Style` control with a compact `GSM`
  selector containing `160 GSM`, `180 GSM`, `200 GSM`, and `240 GSM` options.
- Added GSM to the current client-side variant price calculation. The displayed
  amount now multiplies by the selected quantity, whether the page is showing
  the initial catalog range or the single selected-variant amount.
- Buy Now and Add to Cart now add the selected quantity instead of always adding
  one item. The same controls work on narrow phone layouts, with the compact
  selector rows, price line, quantity control, and three action buttons kept
  within the available width.
- Updated the Specifications tab to show the selected GSM and removed the old
  Print field from that summary.
- Validation: Next.js production build, TypeScript, and `git diff --check`
  passed. This implementation is ready to be committed and pushed with the
  existing direct-to-`main` workflow.
- Limitation: variant amounts remain client-side prototype calculations because
  the catalog schema does not yet provide admin-managed per-GSM/per-attribute
  price records, and cart items still store the base product shape rather than
  a serialized variant selection.

### 2026-11-14 — Make the 3500 px artwork tier transferable

- Owner clarification: the 3500 px large tier is not permanently assigned to Front. Either Front or Back may claim it; while one side's longest artwork edge exceeds 1500 px, that side may use up to 3500 px and the other side is capped at 1500 px. If both sides remain at or below 1500 px, either may claim the large tier by resizing above 1500 px. The numeric values remain provisional, not final print specifications.
- When the large-tier owner is reduced to 1500 px or below, or its Mockup is removed, release the tier. If the tier transfers to the other side, clamp the former owner's artwork to 1500 px while preserving its center. Keep the currently displayed pixel dimensions visible while selected.
- This rule supersedes the fixed Front-3500/Back-1500 assignment in the earlier work-log entry below. Updated `Plan/PLAN.md` first, then implemented shared allocation in `KittlCanvas` and `MockupArtwork`, with a tested allocation helper.
- Validation: all 22 repository Node tests passed, including 6 canvas-shell tests and tier transfer/release cases; Next.js production build, TypeScript, modified-file ESLint, and `git diff --check` passed. A headless Chromium pointer test drew wide artwork, confirmed Front at **3500 px** and Back at **1500 px**, then resized Back past the threshold and confirmed Back changed to **3500 px** while Front changed to **1500 px**.
### 2026-11-14 — Product detail reference UI, compact sizing, and variant price display

- Reworked `apps/web/src/app/products/[slug]/page.tsx` to mount the new
  `ProductDetailClient` detail experience. The page now follows the supplied
  marketplace-style reference with a compact product gallery, thumbnails,
  rating/price area, option selectors, quantity, service benefits, details
  tabs, review summary, shipping copy, and related products.
- Preserved the three requested product actions: **Buy Now**, **Add to Cart**,
  and **Edit Design**. Buy Now adds the product and navigates to `/cart`; Add
  to Cart stays on the page and shows confirmation; Edit Design links to
  `/create?product=<slug>`.
- Reduced the main gallery progressively to a compact 280px cap on desktop and
  phone, centered it on narrow screens, removed outer wrapper boxes around the
  Size, Color, Material, Fit Type, Sleeve, and Print Style controls, and tuned
  mobile title, price, spacing, tabs, and three-button action layout to avoid
  clipping or horizontal overflow.
- Product cards still show the catalog range. The detail page keeps showing a
  quantity-adjusted range until all four required choices—Size, Color, Material,
  and GSM—are selected; only then does it display one exact-looking
  client-calculated price. The selected options are reflected in the active
  states and Specifications tab.
- Files changed: `apps/web/src/app/products/[slug]/page.tsx`,
  `apps/web/src/components/ProductDetailClient.tsx`, `Plan/PLAN.md`, and this
  documentation file.
- Validation: Next.js production build, TypeScript, and `git diff --check`
  passed during the implementation sequence. Application commits were pushed
  directly to `main`; the latest application commit is `fc42b82`.
- Limitations: the current catalog schema exposes one product image and a
  price range rather than real per-variant records, so extra thumbnails and
  option price changes are presentation/prototype states. Selected variant
  data and calculated price are not yet persisted in cart items; real
  admin-configured combination pricing remains open work.

### 2026-11-14 — Enforce provisional Front/Back artwork pixel caps

- Historical implementation before the owner's later clarification: Front was assigned the 3500 px tier and Back the 1500 px tier. This fixed side assignment is superseded; see the newer transferable-tier entry above. The output-pixel values and live-dimension behavior in this dated record describe that earlier implementation only.
- At that earlier implementation, the numeric caps were treated as provisional interim values. The later owner clarification changed the side allocation, not the provisional status of the numeric values; see the newer entry above.
- Updated the Plan after implementation to state both the one-large/one-small rule and that the numeric caps are provisional.
- Validation: canvas shell tests **5/5**, TypeScript, changed-file ESLint, `git diff --check`, and OpenNext Cloudflare Worker production build passed. Headless Chromium on the local production build drew a near-full-canvas stroke, confirmed live dimensions of **2935 × 3500 px** (Front) and **1258 × 1500 px** (Back), then dragged each resize handle well past its limit; both stayed at or under their respective caps.

### 2026-11-14 — Move and resize the whole artwork on each Mockup

- Added an interactive artwork overlay to each existing Front/Back Mockup. The full set of strokes is selected and moved as one group by dragging within its bounds; a visible lower-right handle resizes it from 0.25× to 3×. Arrow keys on the focused handle also adjust size. Front and Back transforms are independent; transforming a preview does not alter the source Canvas strokes or drag the outer Mockup box.
- Updated the Editor Plan after implementation to record this owner-requested interaction.
- Validation: canvas shell regression tests **5/5**, TypeScript, changed-file ESLint, `git diff --check`, Next.js production build, and OpenNext Cloudflare Worker build passed. A headless Chromium smoke test on the production build added Front/Back, drew on Canvas and confirmed strokes on both, then dragged and resized the Front overlay; both transforms changed as expected. OpenNext showed the existing compatibility-date advisory; no build errors.
- Deployment: commit `0572ce2` was pushed to `main`, but [Actions run #43485330098](https://github.com/mhfashion/mhfashion/actions/runs/43485330098) stopped at required-secret preflight because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are unavailable; production deployment did not run.
- Limitation: these transforms are session-only; removing and re-adding a Mockup resets its overlay position and scale.

### 2026-11-14 — Match Front and Back Mockup sizes per direct instruction

- Followed the owner's direct request rather than the previous Plan sizing language. Updated the existing mockup nodes in `KittlCanvas`: Front and Back now share the same responsive width (`min(18.25rem, 78vw)`, square box, and artwork scale (`0.82`). The older work-log entry below records the superseded larger-Front/smaller-Back behavior at that earlier commit.
- Updated the Editor Plan after implementation to record the requested same-size behavior and the instruction that direct owner directions define Editor scope.
- Validation: canvas shell **4/4**, canvas specification **1/1**, browser guards **1/1**, Guides **9/9**; TypeScript, changed-component ESLint, `git diff --check`, and the Next.js/OpenNext Cloudflare Worker production build passed. OpenNext emitted its existing compatibility-date advisory; no build failure occurred.
- Limitation: the mockups remain temporary placeholders with transient page-memory artwork; no R2 garment assets are part of this sizing request.

### 2026-11-14 — Live artwork on large Front and small Back previews

- Historical implementation: offset the Front Mockup's Back-add circle 1.25rem below the connector's centerline and added minimal black freehand drawing inside the fixed canvas. Its shared in-memory strokes render live on the canvas and every added mockup. At that earlier revision Front used a larger placeholder and Back a smaller one; later owner direction made the boxes equal-sized and the artwork tier transferable. The canvas can still be repositioned by dragging its border while the interior is used for drawing.
- Validation: canvas specification **1/1**, canvas shell **4/4**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, workspace ESLint **0 errors / 24 pre-existing warnings**, changed component ESLint clean, `git diff --check` clean. Browser pointer simulation drew a stroke and confirmed it immediately appeared on Canvas, Front, and Back at the different scales; both Back addition and its offset from the wire were visually checked.
- The stroke preview is transient for the current page only; there is no sticker library, object selection/editing, export integration, or persistence yet. A physical Phone/Mobile viewport was not available for browser verification.
- Pushed commit `540d5a8`; [Actions run #43476339108](https://github.com/mhfashion/mhfashion/actions/runs/43476339108) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. Production still shows the fixed canvas and prior connector layer, but not the new drawing synchronization or small Back preview.

### 2026-11-14 — Connect and move the canvas/mockup nodes

- Added a responsive SVG connector wire from the fixed print canvas to each added mockup. The wires attach to the nearest sides and update as the canvas or Front/Back Mockup moves, as zoom/pan changes, and when the workspace reflows. Canvas and each mockup can be dragged separately with pointer/touch input; menu and close buttons remain clickable. The existing Web/Desktop row and Phone/Mobile stack are preserved.
- Validation: canvas specification **1/1**, canvas shell **3/3**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser testing added Front and Back and confirmed two connector paths; controlled pointer drags moved the canvas and Front independently and changed the wire coordinates for both. A physical Phone/Mobile viewport could not be simulated in the available browser.
- Pushed commit `1823f35`; [Actions run #43473595690](https://github.com/mhfashion/mhfashion/actions/runs/43473595690) failed the Cloudflare secret check because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. The live page retains the fixed canvas but does not yet include the connection layer.

### 2026-11-13 — Move Back Mockup circle beside the mockup box

- Moved the circular Back Mockup control out of the title row and onto the left edge of Front Mockup, vertically centered in the gap between the canvas and box. It uses the same small filled-circle treatment as the canvas-edge control. On Phone/Mobile it stays at the side of the stacked Front Mockup box. The Front/Back close buttons remain in each box's title row.
- Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser preview confirmed the plus is beside (not above) Front Mockup and still adds Back Mockup. Phone-sized browser viewport was unavailable.
- Pushed commit `4638585`; [Actions run #43471566424](https://github.com/mhfashion/mhfashion/actions/runs/43471566424) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. The live page still has the fixed canvas but does not include the updated Front Mockup controls.

### 2026-11-13 — Correct mockup control placement and close actions

- Removed the `Front` and `Add Mockup` text row above the canvas. The canvas remains blank until **Add Mockup** is selected from the canvas-edge menu. The circular **Add Back Mockup** control is positioned at the vertical midpoint of the Front Mockup box's left side, between it and the canvas—not above the title. Clicking it adds **Back Mockup**. Each mockup box has its own `×` control and can be dismissed independently.
- Updated the responsive Plan and canvas-shell regression checks. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser interaction confirmed: no initial top row, Front Mockup appears only after Add Mockup, the adjacent circle adds Back Mockup, and each close control removes only its own box.
- Mockups remain neutral temporary boxes; Cloudflare R2 assets and phone-size browser verification are still future work.
- Pushed commit `b9d997a`; [Actions run #43469933175](https://github.com/mhfashion/mhfashion/actions/runs/43469933175) failed its secret preflight because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. Production still serves the previous version: the live response has the 4500×5400 canvas but lacks the Front Mockup title and close controls.

### 2026-11-13 — Temporary Front/Back mockup boxes

- Reduced the canvas-edge circle to 14 px and moved it about 6 px away from the canvas. Selecting its **Add Mockup** option now adds a temporary **Front Mockup** box. The top **Front** row has a small circular Add Mockup control; selecting it adds a **Back Mockup** box. This interprets the requested “Font” as “Front” to pair with Back Mockup.
- Show Grid now overlays both the canvas and every added placeholder box. Placeholder boxes are side-by-side on Web/Desktop and stack in a vertically scrollable Phone/Mobile workspace. These are temporary neutral boxes only; Cloudflare R2 integration/assets are not connected yet.
- Updated the Plan and expanded `tests/canvas-shell.test.cjs`. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, `git diff --check` clean, ESLint **0 errors / 24 existing warnings**. In the browser, verified the grid stays within the canvas, Add Mockup creates Front Mockup, and the top control creates Back Mockup with grid lines also visible in both boxes. Responsive phone stacking/scroll behavior is implemented in the shared UI and covered by source regression checks; the browser session could not be resized to a phone viewport.
- Push commit `e060a54`; GitHub Actions run [#43468279642](https://github.com/mhfashion/mhfashion/actions/runs/43468279642) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are still missing. The live `/create` response has the 4500×5400 canvas but not the new Front/Add Mockup controls; deployment did not occur.

### 2026-11-13 — Minimal canvas options and mockup removal

- Removed the always-visible mockup placeholder and the visible canvas size/DPI/format badges. The canvas remains blank and fixed; its technical metadata is retained in code, not shown as extra on-canvas copy.
- Attached the existing circular control to the canvas edge at its vertical midpoint. Its responsive menu offers **Show Grid** and **Add Mockup**. Show Grid toggles a 10-by-10 layout grid overlay on the canvas. There is no mockup on initial load; Add Mockup is shown but disabled until the owner provides the mockup behavior/details, so no mockup design was invented. The same placement/menu behavior adapts to desktop and phone layouts.
- Updated `Plan/PLAN.md`, added `tests/canvas-shell.test.cjs`, registered the test with npm and GitHub Actions. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript passed, production build and Cloudflare Worker build passed, and production `/create` HTTP smoke verified the 4500×5400 blank canvas without visible spec badges or a static mockup. `git diff --check` clean. ESLint reports **0 errors / 24 existing warnings**.
- A grid layer for mockup surfaces remains unverified because no mockup is displayed or addable yet; implement that alongside the mockup flow after the owner supplies its details. GitHub Actions run [#43465539254](https://github.com/mhfashion/mhfashion/actions/runs/43465539254) again failed its secret preflight: Actions reports both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing. The live `/create` response has the fixed canvas dimensions but still contains the old static mockup placeholder, so this latest UI change is not deployed.

### 2026-11-13 — Owner-specified blank print canvas

- Replaced the white placeholder with a native blank canvas bitmap fixed at **4500 × 5400 px**. The shared spec declares **300 DPI**, transparent PNG target, fixed size, and blank initial state. Removed the visible “T-Shirt” canvas label; the checkerboard is CSS-only and the spec badge sits outside the artwork.
- Kept the change limited to the existing shell; no editor tools, Fabric document/history model, or persistence were restored. This shell still has no PNG download/export, and 300-DPI metadata is a target declaration rather than embedded metadata in an exported file.
- Validation: `test:canvas-spec` **1/1**, browser guard **1/1**, Guide **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, ESLint **0 errors / 24 warnings**. A local production `/create` render confirmed the 4500×5400/300-DPI/transparent/PNG/fixed attributes and absence of the T-Shirt design label.
- Deployment: pushed to `main` as `311d722`; GitHub Actions run [#43462749455](https://github.com/mhfashion/mhfashion/actions/runs/43462749455) failed at the required-secret preflight because both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are absent from repository Actions secrets, so deployment was skipped. The live `/create` URL still serves the old white `T-Shirt design area` HTML and contains none of the new canvas spec values. Production remains unchanged until those secrets are configured and deployment succeeds.

### 2026-11-13 — Disable browser zoom shortcuts and page context menus

- Expanded `BrowserZoomGuard` across the website to block Ctrl/Cmd+wheel and Ctrl/Cmd `+`, `-`, and `0` browser-zoom shortcuts; page-level right-click/context menus are suppressed. Unrelated shortcuts such as Ctrl/Cmd+S and mobile touch pinch zoom remain available.
- Added `tests/browser-guards.test.cjs`, the `test:browser-guards` npm script, and a GitHub Actions test step. Updated the Plan's accessibility/safety requirements.
- Validation: browser-guard tests **1/1**, Guide tests **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, ESLint **0 errors / 24 warnings**. Code is on `main` as `cdfda7d`. GitHub Actions runs [#43461041904](https://github.com/mhfashion/mhfashion/actions/runs/43461041904) and [#43461174394](https://github.com/mhfashion/mhfashion/actions/runs/43461174394) both stopped at the required-secret check: Actions still reports `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing, so this change has **not** deployed to production.

### 2026-11-13 — Owner-requested editor rollback

- Reverted the owner-identified editor commits `4ccc60a` and `a571080` to restore the `/create` application code to its pre-editor state at `007f286`. The responsive Fabric canvas/document/history implementation, phone editor dock/sheets, fixed-canvas settings, local editor draft migration, and editor-only tests were removed; the prior `/create` shell and app framing were restored.
- `Plan/PLAN.md` and this Doc are restored to the pre-editor planning/documentation content; the Plan continues to describe the editor as future work, not as an implemented feature.
- Validation after rollback: `npm run test:guide` **9/9 passed**; TypeScript passed; ESLint **0 errors and 24 warnings**; `npm run build` and `npm run cf:build --workspace=apps/web` passed. No production deployment or database change was performed.
- Follow-up live check: production `/create` still serves the prior deployed editor (HTTP 200; HTML contains old editor labels and `T-Shirt`), so the rollback is not yet visible on the website. GitHub Actions run [#43455369535](https://github.com/mhfashion/mhfashion/actions/runs/43455369535) failed before build/deploy because repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. This environment has no Wrangler login, and GitHub CLI secret access returns HTTP 403; production remains unchanged until authorized deployment credentials are configured.

### 2026-11-13 — Plan consolidation and repository review

- Created `Plan/PLAN.md` as the single planning source by consolidating the former project plan, editor plan, unified editor vision, deployment/publishing notes, legacy architecture reference, and TODO register.
- Added the owner requirement that every UI/UX plan and acceptance pass cover both Web/Desktop and Phone/Mobile together.
- Replaced the former standalone planning and deployment-status files with pointers to the consolidated master plan and updated the Guide documentation's plan reference.
- The read-only code audit has since been completed; its findings and validation evidence are recorded in `Doc/DOCUMENTATION.md#code-audit`.


### Validation update — 2026-11-13

- `npm ci --no-audit --no-fund` completed successfully.
- `npm run test:guide`: **9/9 passed**.
- `npm run test:guide:http`: the initial attempt ran without a local server and returned `ECONNREFUSED`; after starting the local production server as the test expects, **5/5 passed**.
- `npm run lint`: **0 errors, 24 warnings**.
- `npm run build`: passed, including TypeScript and Next.js production build.
- `npm run cf:build --workspace=apps/web`: passed. No deployment was run.
- Production dependency audit (`npm audit --workspace=apps/web --omit=dev`): **0 advisories**. Full-tree audit: **14 advisories (4 high, 10 moderate)** in build/lint dependencies; suggested automatic fixes include incompatible major-version changes, so no fix was applied.
- `git diff --check`: passed.
- The read-only code audit across storefront, editor core, editor UI, admin/data, and delivery/tests is complete; its findings are recorded in `Doc/DOCUMENTATION.md#code-audit`.


### Code audit completed — 2026-11-13

The read-only review of the storefront, editor, admin/data, and deployment/test paths is complete. **13 actionable findings** are recorded with source locations and remediation suggestions in [Code Audit section](#code-audit): 1 high, 11 medium, and 1 low. The principal finding is that the current `/create` route is a shell with an empty design area, not the interactive Fabric.js editor described in older plan snapshots. Other findings cover broken/no-op storefront navigation and search, ignored category filters, cart variant/pricing and account-demo behavior, phone canvas pan/clipping, Supabase RLS gaps, price-query failure handling, and CI not smoke-testing the built Worker runtime.

`Plan/PLAN.md` was updated to reflect the audited `/create` state in both the project overview and detailed editor baseline, mark older feature descriptions as historical, require Web/Desktop and Phone/Mobile coverage together, and list the audit remediation areas. No application code was changed; no deployment or database mutation was performed.


### GitHub publishing preference — 2026-11-13

The owner requested that requested repository changes be committed and pushed directly to the repository default branch (`main`) immediately after writing and basic validation, without another confirmation request. Do not use a compare/pull-request workflow unless explicitly requested. A repository push does not authorize production deployment or production database changes.


### 2026-11-13 — Consolidate documentation into one Doc file

- Combined this Work Log, the Code Audit report, the Guide content operations runbook, and the Admin Dashboard reference notes into `Doc/DOCUMENTATION.md` with named section anchors.
- Removed the obsolete `docs/` files after confirming that no app, test, package, or workflow code imports or reads them. All unique runbook/reference content is preserved here; the full planning material remains in `Plan/PLAN.md`.
- Kept `docs/guide-content.md` instructions intact as documentation; it is not a runtime input. No app source, database, or deployment configuration was changed.

<a id="code-audit"></a>
## Repository Code Audit

- **Repository:** `mhfashion/mhfashion`
- **Reviewed baseline:** `main` at commit `90dc398` (2026-11-13); this is a historical audit baseline, not the current editor implementation.
- **Review type:** Read-only source review plus local build/test/dependency checks. No application code, database, or production deployment was changed. Later editor changes and current behavior are recorded in the dated work-log entries above and the current baseline in `Plan/PLAN.md`.

### Executive summary

The review covered five independent areas: storefront routes/shared UI, editor canvas/document model, editor panels and mobile interactions, admin/Supabase/data flows, and deployment configuration/tests. It confirmed **13 actionable issues: 1 high, 11 medium, and 1 low**. The highest-impact issue is that `/create` is currently a placeholder workspace, not an operational design editor. The detailed editor capabilities in older project notes describe historical/planned behavior and do not match the audited source at this commit.

The local unit tests, corrected production-server HTTP tests, Next.js build, and Cloudflare Worker build pass. Production dependencies have no reported advisories, but the full development/build dependency tree has 14 advisories. No production deployment, Supabase migration, or live account operation was performed.

### Findings

#### High

##### 1. `/create` is a placeholder, not an editable or persistable design editor

**Evidence:** `apps/web/src/app/create/page.tsx:3-8` mounts only `KittlCanvas`. In `apps/web/src/components/KittlCanvas.tsx:129-136`, the design area is an empty `div`; component state covers only mockup visibility, zoom, pan, and gesture handling. The adjacent mockup is explicitly a placeholder (`KittlCanvas.tsx:154-179`). There is no editor document model, artwork operation, history, serializer, or persistence call wired to the route. Although `supabase/migrations/0001_initial_schema.sql:89-95` defines `user_designs.canvas_state`, this route does not use it.

**Recommendation:** Build and mount a typed document model, editing operations, selection/history, layer and property controls, validation/serialization, and persistence before presenting `/create` as an operational design editor. Treat the detailed editor plan as forward-looking until each capability is implemented and tested.

#### Medium

##### 2. Storefront navigation points to missing routes

**Evidence:** `apps/web/src/app/page.tsx:37-40` links to `/products`, `/products?new=true`, and `/categories/t-shirts`. `apps/web/src/components/CategoryRow.tsx:28-30,49-51` links to `/categories` and `/categories/{slug}`. `apps/web/src/components/Footer.tsx:26-29` links to `/products` and `/best-sellers`. The audited route tree has no products index, categories route, or best-sellers route; available product pages use `/products/[slug]`, with `/new` and `/popular` as separate pages.

**Recommendation:** Point navigation at implemented destinations or add the intended index/category pages, including handling for their query parameters.

##### 3. Header search controls do not perform a search

**Evidence:** `apps/web/src/components/HeaderActions.tsx:47-74` renders desktop and responsive text inputs without a form submission handler, search state, or results navigation. Typing a query has no observable search effect.

**Recommendation:** Connect both inputs to one shared search action and implemented results route, or remove/disable the affordance until search is available.

##### 4. Collection category links are ignored

**Evidence:** `apps/web/src/components/Header.tsx:8-14` navigates to `/collections?category=...`, but `apps/web/src/app/collections/page.tsx:19-21` always loads the same collection products and does not read `searchParams`. Collection cards also point to the same `#collection-products` anchor.

**Recommendation:** Validate and apply the category query parameter to the catalog, or route those links to real category-specific destinations.

##### 5. Product option selections are discarded and cart prices use only the minimum

**Evidence:** `apps/web/src/components/ProductOptions.tsx:14-17,22-31` stores size/color/product-type choices locally. Those choices are not passed to `ProductDetailActions.tsx:13-14`; `addItem` receives the unchanged product. `apps/web/src/components/CartPageClient.tsx:12,18-20` computes cart display and subtotal from `priceMinKs`, so the selected variant and applicable price are not represented.

**Recommendation:** Lift selected options into the add-to-cart operation, persist the selected variant and unit price in each cart item, and calculate line totals/subtotal from that selected price.

##### 6. “Best Sellers” is not ranked by sales or popularity

**Evidence:** `apps/web/src/lib/products.ts:83-101` notes that sales-count data is unavailable, filters to `is_new=false`, and sorts by `created_at` ascending. `apps/web/src/app/popular/page.tsx:10-14` presents the result as best sellers/popular products.

**Recommendation:** Use a verified popularity metric, or label the listing as a placeholder/curated selection until that data exists.

##### 7. Account page presents shared hard-coded sample data as an account

**Evidence:** `apps/web/src/app/account/page.tsx:42-46,179-208` includes a fixed profile/contact identity, orders, point totals, balance, designs, and wishlist. It does not load signed-in user data, and the Save control has no handler.

**Recommendation:** Connect the page to authenticated, user-scoped data and persist profile edits. Until then, clearly label all data as a demo and avoid presenting sample identity/contact information as a real account.

##### 8. Short phone viewports can clip the stacked editor workspace

**Evidence:** `apps/web/src/components/KittlCanvas.tsx:105-120,124-160` uses `overflow-hidden`; below `md` the canvas/mockup stack vertically but retains width-derived heights and a 48px separator. The page uses an `h-dvh` container (`apps/web/src/app/create/page.tsx:5-8`), so on short phone viewports the lower content can extend beyond the available height without a scroll path.

**Recommendation:** Add vertical scrolling or a viewport-fit mode, then verify short phone heights and landscape layouts as part of the required Web/Desktop + Phone acceptance checks.

##### 9. Touch pointers cannot pan the canvas on phones

**Evidence:** `KittlCanvas.tsx:68-71` accepts only middle-button drag or Space+left-button drag. A touchscreen primary pointer does not meet either condition, and the viewport is `overflow-hidden` (`KittlCanvas.tsx:115`), leaving no touch pan route.

**Recommendation:** Add a deliberate touch pan gesture (and pinch zoom if supported), with appropriate touch-action/pointer handling and accessible alternatives. Test on phone and preserve interactions for controls.

##### 10. Users can update their own reward-point balances

**Evidence:** `supabase/migrations/0001_initial_schema.sql:17-18` defines `daily_points` and `purchase_points`. The `profiles` policy at lines 139-141 grants `FOR ALL` when `auth.uid() = id`; row-level filtering does not constrain which columns the user may update.

**Recommendation:** Replace the broad write policy with column-limited updates or a trusted database function. Reward balances should be writable only through controlled server-side logic.

##### 11. `platform_settings` lacks row-level security or API-role restrictions

**Evidence:** `supabase/migrations/0001_initial_schema.sql:81-87` creates settings including saved-design limits and the exchange rate. The migration enables RLS on several user tables at lines 134-137 but not on `platform_settings`; no later migration in the reviewed set enables RLS or revokes API-role access. If the Supabase API roles have table grants, the settings may be directly accessible or modifiable.

**Recommendation:** Enable RLS, revoke direct `anon`/`authenticated` access, and expose only narrowly scoped reads or administrative changes through trusted server-side operations.

##### 12. CI HTTP smoke tests do not exercise the Cloudflare Worker artifact

**Evidence:** `.github/workflows/deploy-cloudflare.yml:70-111` starts `npm run start --workspace=apps/web` and runs the HTTP tests against the Next.js Node server (around line 101), then builds the OpenNext Worker and runs Wrangler dry-run (around lines 107-111). It does not start the built Worker/OpenNext preview and send HTTP requests to that runtime.

**Recommendation:** After `cf:build`, run the Worker locally through Wrangler/OpenNext preview and execute smoke tests against that target before deploy. Keep Next.js smoke tests only if they are intended to validate a separate runtime.

#### Low

##### 13. Price-range lookup failures can make products appear free

**Evidence:** `apps/web/src/lib/products.ts:42-45,59-60` returns an empty price-range map when the query fails; `toProduct` then assigns `priceMinKs` and `priceMaxKs` as `0` when no range is found.

**Recommendation:** Represent price-data lookup failure explicitly and show an unavailable-price state unless zero is a verified price.

### Dependency and lint observations

- `npm audit --workspace=apps/web --omit=dev`: **0 vulnerabilities/advisories** in production dependencies at audit time.
- Full `npm audit`: **14 findings (4 high, 10 moderate)**, in build/lint dependencies including OpenNext/minifier/glob and ESLint/TypeScript-ESLint dependency chains. npm's suggested fixes include incompatible major changes (for example OpenNext Cloudflare `0.3.0`, `eslint-config-next` `15.5.29`, or ESLint `9.39.5`), so no automatic fix was applied.
- `npm run lint` completed with **0 errors and 24 warnings**. Warnings include unused imports/values, internal navigation anchors, raw `<img>` usage, and synchronous state-setting effects.
- The Cloudflare build emitted a non-blocking warning that `workerd compatibility_date` is `2025-04-01`.

### Validation performed

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Passed |
| `npm run test:guide` | 9/9 passed |
| `npm run test:guide:http` | 5/5 passed against a locally running production server. The first invocation without a server failed with `ECONNREFUSED`; it was rerun correctly. |
| `npm run lint` | Passed, 0 errors / 24 warnings |
| `npm run build` | Passed; Next.js production build and TypeScript checks completed |
| `npm run cf:build --workspace=apps/web` | Passed |
| Production dependency audit | 0 advisories |
| Full dependency audit | 14 findings: 4 high, 10 moderate |
| `git diff --check` | Passed |

### Scope limitations

This was a source review and local validation, not a production deployment or live service audit. No production URL, authenticated account, Supabase project, RLS behavior against a live database, or Cloudflare Worker preview was exercised. These findings describe the reviewed source at `90dc398`; confirm against the target commit before remediation.

<a id="guide-content-operations"></a>
## Guide Content Operations

The guide catalog is intentionally ready for public reads before the future Post Admin module exists. The content model is split into `public.guide_categories` and `public.guide_posts`; posts store structured JSON sections rather than HTML.

### Apply the migration

The owner should run [`supabase/migrations/0005_guide_content.sql`](../supabase/migrations/0005_guide_content.sql) manually in the Supabase SQL Editor after migrations `0001` through `0004`. This task does not apply database changes. The migration is safe to re-run for its seed rows: category and post inserts use stable slugs with `ON CONFLICT (slug) DO NOTHING`, so existing owner edits are not overwritten.

The migration creates the tables, publication checks, timestamps, indexes, safe-section validation, and RLS. It grants `SELECT` only to `anon` and `authenticated`. Their policies expose a category or post only when it is `published` and its `published_at` is not in the future; a post also requires a published category. There are no public insert, update, delete, or truncate grants. Until admin authentication and the Post Admin module arrive, use the Supabase SQL Editor or a server-side service-role process for content management.

### Content shape

Each post's `sections` value is a JSON array of objects with this shape:

```json
[
  {
    "heading": "A plain-text heading",
    "paragraphs": ["A plain-text paragraph."],
    "bullets": ["An optional plain-text bullet."]
  }
]
```

Sections, paragraphs, and bullets are bounded and must contain plain text. The database validation rejects HTML-looking angle brackets, empty values, malformed arrays, and unexpected section keys. Keep content factual and grounded in `../Plan/PLAN.md#project-plan`; in particular, describe payment, editor, and delivery behaviors as planned until those integrations are actually live. Do not add invented delivery SLAs, size measurements, payment amounts, or gateway details.

### Safely edit a draft

Use the SQL Editor with the exact slug and keep a draft unpublished while editing. Replace the JSON with a valid JSON array and cast it to `jsonb`:

```sql
update public.guide_posts
set
  title = 'Revised title',
  excerpt = 'A concise plain-text summary.',
  sections = '[
    {
      "heading": "A section heading",
      "paragraphs": ["A factual paragraph."],
      "bullets": ["An optional bullet."]
    }
  ]'::jsonb,
  seo_title = 'Revised SEO title',
  seo_description = 'A concise plain-text search description.',
  status = 'draft',
  published_at = null,
  updated_at = now()
where slug = 'the-planned-editor-flow';
```

Category names and descriptions can be edited in `public.guide_categories` by slug. Keep category and post slugs lowercase, hyphen-separated, and stable after a URL is public. The database constraints enforce the slug format and title/excerpt/SEO limits.

### Publish a draft

Review the text and JSON in the SQL Editor, then publish the category and its posts explicitly. A future `published_at` keeps the row hidden until that time; using `now()` publishes immediately:

```sql
update public.guide_categories
set status = 'published', published_at = now(), updated_at = now()
where slug = 'design-guide';

update public.guide_posts
set status = 'published', published_at = now(), updated_at = now()
where slug = 'the-planned-editor-flow';
```

Public reads never return drafts, posts scheduled for the future, or posts whose category is not currently published. To unpublish, set `status = 'draft'` and `published_at = null`.

### Runtime fallback behavior

`apps/web/src/lib/guides.ts` validates every live category, post, and JSON section before returning it. If Supabase environment variables are missing, or PostgREST reports that the guide tables are missing, the loader returns the starter catalog from `apps/web/src/lib/guide-starter.ts` with `source: 'starter'`. A successful live query with zero published rows stays `source: 'supabase'` and returns empty arrays; starter posts are not resurrected over an intentionally empty catalog. Other backend failures return `source: 'unavailable'` with empty arrays. Requests use a bounded fetch timeout and React request memoization without a cross-request stale cache.

Guide page metadata can optionally use `NEXT_PUBLIC_SITE_URL` from the web app environment to create absolute canonical and Open Graph URLs. Set it only to the public HTTPS origin, without a path, credentials, query string, or fragment. If it is absent, canonical and `og:url` tags are omitted rather than guessed; titles, descriptions, and other sharing metadata remain available.

### Future Post Admin

The admin workflow is deliberately not included here. The project plan assigns Guide posts, categories, SEO fields, and publish/draft controls to Post Admin, but no admin authentication or role module exists yet. A future module should use a privileged server-side path, preserve the same JSON contract and publication rules, and keep service-role credentials out of browser code.

### Validation commands

From the repository root, `npm run test:guide` runs the guide loader/search/metadata unit suite and `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false` checks TypeScript. `npm run build` validates the Next.js production build. To run the HTTP suite, start the built web app on port 3000 and run `npm run test:guide:http`; these HTTP assertions intentionally expect the starter catalog, so use a local environment without Supabase variables, not a production content database. `GUIDE_TEST_ORIGIN` can override the local origin.

The migration was also tested in isolated embedded PostgreSQL: applying/rerunning it, matching all seed content, malformed section rejection, draft/future/category publication filtering, and denial of public writes. No production Supabase data was accessed or changed during validation. Managed editor diagnostics were unavailable because this GitHub-only task has no Manus web-project binding; the TypeScript compiler and production build supplied the source diagnostics instead.

<a id="admin-dashboard-reference"></a>
## Admin Dashboard Visual Reference

Sources supplied by the project owner on 2026-11-10:

1. [MH Fashion Admin Dashboard-1.png](https://drive.google.com/file/d/1Og7IC_9dvk7RPOzSgkl3f7BaHID0JEkU/view?usp=sharing)
2. [MH Fashion Admin Dashboard-2.png](https://drive.google.com/file/d/1FICZRT6_wGceafle7t4pne8urS6l0vxy/view?usp=sharing)

### Visual cues observed

- Dark charcoal left navigation rail with MH Fashion branding and a bright lime active state.
- Light, near-white dashboard workspace with a top search bar, notification/profile controls, soft borders, rounded cards, and restrained shadows.
- Four summary metrics near the top, followed by sales and order-status visualizations.
- Operational content includes top-selling products, recent orders, and an activity feed; one reference also promotes the design editor.
- Use a responsive layout that stacks cards on narrow screens.

The current `/admin` page follows these cues but uses clearly labeled local preview data. The linked references are visual guidance only; they do not define live metrics or authorization behavior.
- Validation: all repository Node tests passed **32/32**; TypeScript and ESLint passed; Cloudflare/OpenNext production build passed. Chromium CDP confirmed the dock's right-edge geometry at 390×844 and 320×740, the separated top arrow, 844×390 landscape stacking, desktop open/close, and Light/Dark color switching. Existing layer-mask, Product/Phone, mockup and tier regressions also passed. The screenshot-specific visual match remains open until the reference is attached.

### 2026-11-15 — Kittl Canvas behavior audit and scope gates

- Studied Kittl's public editor documentation for Canvas transforms, Text insertion/editing, Layers, Alignment/Tidy, Text Transformation, Text Shadow, Text Decoration, and Glyphs.
- Compared those behaviors against the current MH Fashion layer model and renderer without changing implementation code. The current system can absorb basic Kittl-style move/scale/rotate, group/child selection, layer synchronization, direct Text insertion, alignment, tidy spacing, flip, and limited text effects.
- Recorded architecture expansion points and approval gates for character-level text runs, text-box wrapping, full Arch/Wave/Circle/Flag transformations, stacked shadow/decoration effects, vector node editing, multi-artboard/infinite canvas, and collaboration/version history.
- Added the detailed comparison and decision checklist to `Doc/KITTL_CANVAS_EDITOR_AUDIT.md`. No advanced feature implementation was started before owner approval.

### 2026-11-15 — Kittl-inspired MH Fashion editor visual pass

- Approved scope now includes the full Kittl-inspired Canvas direction, but the MH Fashion print-canvas and Front/Back Mockup model remains the source of truth. The visual direction is intentionally inspired rather than copied: dark graphite surfaces, rounded asset cards, clearer context-aware panels, stronger typography hierarchy, live-state accents, and neon-lime MH Fashion focus states.
- Refined the Edit rail, asset cards, Layers dock, group rows, and Adjustment dock with responsive rounded surfaces, gradient headers, accent glow, compact metadata, stronger selected states, and touch-safe sizing for Phone/Mobile as well as Web/Desktop.
- No Kittl brand assets or copied proprietary UI were introduced. Advanced behavior work remains staged behind the approved model-expansion plan: text boxes/runs, transformations, effects, alignment/tidy, vector foundations, and future artboard foundations.
- Files: `Plan/PLAN.md`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`.

### 2026-11-15 — Kittl-inspired text font browser

- Expanded the Text Adjustment panel with a searchable/filterable font browser, recent-font chips, selected-font highlighting, and live font previews. Choosing a font updates the selected text layer immediately without re-entering text.
- Kept the existing direct-canvas text workflow and all typography controls intact. The font browser is scrollable and touch-safe on Phone/Mobile while remaining compact on Web/Desktop.
- Validation: Next.js production build passed; canvas-shell **14/14**; editor-layers **11/11**; `git diff --check` passed. Existing lint state remains **0 errors / 26 warnings**.

### 2026-11-15 — Preserve MH Fashion Layer Box styling

- Owner clarification: the Layers Box must retain the MH Fashion Photoshop-style visual treatment rather than the new Kittl-inspired surface styling. Restored the previous Layers Box presentation while preserving all existing behavior: layer selection, drag reorder, folder groups, masks, links, appearance controls, and adjustment entry point.
- Kittl-inspired styling remains scoped to the Edit rail, design/element cards, Adjustment panel, Text controls, and Canvas interaction affordances. The Layers Box is intentionally excluded from that visual treatment.
- Validation: canvas-shell **14/14**, editor-layers **11/11**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-15 — Compact Kittl-style Adjustment sections and text effects

- Reworked the Adjustment panel into compact expandable sections so related controls no longer create one very long scrolling column. Sections are `Text`, `Font`, `Style & Alignment`, `Effects`, `Transform`, and `Appearance`, each using a plus/minus disclosure control and touch-safe row height.
- Added live text effect state to the text layer model for `None`, `Shadow`, and `Outline`, including effect color, shadow offset, and outline width. Added the first live transform presets (`Plain`, `Arch`, `Wave`, `Circle`) to the Adjustment UI while keeping text editable.
- Preserved the MH Fashion Layer Box styling and behavior; this pass changes the Adjustment panel and text renderer only. The supplied reference was used as a visual direction for grouping and density, not copied as a branded asset.
- Validation: canvas-shell **15/15**, editor-layers **11/11**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-16 — Distinct MH Fashion adjustment controls

- Added MH Fashion-specific alignment controls using icon buttons for left, center, and right alignment instead of a generic select field. Added slider-based Opacity and Fill controls with live percentage readouts.
- Expanded the compact Adjustment panel with text effect preset tiles, shadow offset/softness, outline width, decoration controls (line, color cut, oblique), transform tiles, and live Canvas rendering for shadow, outline, and decoration marks.
- Added a Shape Builder section for shape layers with Select, Merge, Subtract, and Intersect modes. The selected mode is stored immutably on the shape layer and is ready for the next multi-path boolean geometry pass; Layer Box styling was not changed.
- Validation: canvas-shell **15/15**, editor-layers **11/11**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-16 — Collapsible previews and Shape Builder geometry

- Kept the Adjustment panel as compact collapsible sections with visible plus/minus disclosure controls. Added dedicated live preview strips for the selected text Shadow/Outline effect and for Plain/Arch/Wave/Circle transformation states.
- Added deterministic Shape Builder geometry for closed axis-aligned rectangle paths. `Merge` produces one compound path, `Intersect` produces the overlap rectangle, and `Subtract` produces the remaining rectangle pieces. Unsupported path syntax is preserved safely with the selected builder mode instead of being destructively rewritten.
- Added regression coverage for all three rectangle operations. The Layers Box remains unchanged.
- Validation: canvas-shell **15/15**, editor-layers **12/12**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-16 — Kittl-inspired Pan/Hand tool interaction

- Improved the Pan/Hand tool without changing the Layer Box. The Hand tool now has a clearer Kittl-inspired active icon state, a pan-specific tooltip, accent glow, and grab/grabbing cursor feedback.
- Preserved and clarified the interaction model: Hand tool + left drag, Space + left drag, middle-button drag, and touch Pan mode all move the editor viewport. The viewport now exposes `data-pan-mode="hand|scroll"` for reliable state styling and testing.
- Refined the Phone/Mobile Pan view control into a rounded active pill with a dedicated hand icon badge while retaining zoom and reset controls.
- Validation: canvas-shell **15/15**, editor-layers **12/12**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-16 — Kittl-inspired Pen tool foundation

- Reworked the Pen tool from a freehand stroke fallback into a vector anchor workflow. Click adds anchors, the active path previews with a dashed segment and anchor nodes, clicking near the first anchor closes the path, and double-click finishes an open path.
- Finished paths are created as editable `shape` layers, selected immediately, revealed in the Layers stack on desktop, and styled with the active foreground color. Switching tools clears an unfinished path so partial geometry is not accidentally committed.
- The workflow is touch-safe because the preview SVG is pointer-events-none and the actual pointer target remains the canvas. Existing Pan, Move, Brush, Mask, and Layer Box behavior was preserved.
- Validation: canvas-shell **15/15**, editor-layers **12/12**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-16 — Stackable Kittl-inspired text effects and Text tool removal

- Expanded the selected-text Effects section from a single Shadow/Outline choice into a reusable stack of seven editable effect types: Shadow, Outline, Glow, Offset, Echo, Extrude, and Stripe. Each effect can be added more than once, enabled/disabled, recolored, configured with its relevant controls, reordered, and removed; clearing the stack leaves the editable text intact.
- Added the stack to the shared text-layer model and immutable update/duplicate paths. The common SVG preview renderer now draws those effects on both the print canvas and Front/Back mockups, preserving existing legacy Shadow/Outline settings for older text layers. The effect controls retain compact cards and coarse-pointer target sizes for Phone/Mobile.
- Removed the Text button and its canvas-click insertion route from the bottom Tools bar. Text insertion remains available through the Edit sidebar's `Add Text` action, which focuses the existing inline text editor.
- Files: `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/KittlCanvas.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`, `Plan/PLAN.md`.
- Validation: all five relevant unit suites passed **39/39** (Guide 9, browser guards 1, canvas spec 1, canvas-shell 15, editor layers 13); TypeScript passed; Next.js production build and OpenNext Cloudflare Worker build passed; `git diff --check` passed. ESLint reported **0 errors / 26 existing repository warnings**.
- Limitations: effect rendering is SVG-based and remains live/editable text, but the current transforms are visual presets rather than true per-character warps; gradient/texture fills, multi-color vector exports, and final production print export remain outside this implementation.

### 2026-11-17 — Tools Bar structure reset before tool-by-tool implementation

The unfinished Subpath/Node Editing, Fill/Stroke property panel, and Bézier-handle work was paused before commit. The visible Tools Bar order is now Move, Hand tool, Pan tool, Pen tool, Brush, Eraser tool, Shape tools, Gradient tool, Color switch tool, Undo, and Redo. Individual tool behavior will be implemented one at a time after the structure is accepted. The Layer Box remains unchanged, and the existing Photoshop/Kittl-inspired Pen foundation is retained.

### 2026-11-17 — Kittl-style Free Transform visual pass

The existing Free Transform behavior was kept intact: all eight resize handles, move behavior, and rotation remain functional. Its appearance now uses the MH Fashion theme accent instead of Kittl blue: a thin 2px accent outline, compact square resize controls, a thin rotation stem, and a small rotation dot. Each visible control has a separate transparent touch hit area so Phone/Mobile editing remains finger-friendly without making the visual controls oversized.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Pen nib icon and persistent selected-tool cursor

The Pen tool now uses the Lucide PenTool nib silhouette to match the supplied pen-nib reference more closely. The Canvas cursor no longer falls back to the large hand/grab appearance when another tool is selected: Pen and Brush use crosshair, Eraser uses cell, Shape and Gradient use crosshair, Move uses move, and Hand/Pan use grab only when those tools are actually active. The print-canvas wrapper now follows the same selected-tool cursor state.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Separate Pencil and Pen tools; add Text tool

Corrected the tool naming based on the owner's clarification: the former `Pan` toolbar item is now a distinct `Pencil tool`, with its own Pencil icon and drawing/cursor state. `Pen tool` remains the nib-based vector path tool. The Hand tool is the only toolbar tool that uses the Hand/viewport-pan behavior. A new `Text tool` is now visible in the Tools Bar; clicking the canvas creates a Text layer at that point and opens the existing direct canvas typing workflow. Selected-tool cursor state now covers Pencil, Pen, Text, Brush, Eraser, Shape, Gradient, Move, and Hand.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Kittl blue rotating Free Transform and live angle label

Free Transform now uses a thinner Kittl-style blue outline (`#4c9dff`) and compact blue/white resize and rotation controls. The complete transform-control group rotates around the selection center together with the selected layer, including the resize handles, rotation stem, rotation dot, and angle badge. While rotating, a small live degree label is displayed near the rotation control; the displayed value is normalized to 0–359 degrees. Existing move, resize, rotation, and mobile touch hit areas remain intact.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Tool-shaped Canvas cursors

Replaced the generic plus/crosshair cursor treatment with custom SVG data cursors tied to the selected tool. Pen now shows a pen nib, Pencil shows a pencil, Brush shows a brush, Eraser shows an eraser, Move shows four-way arrows, Hand shows an open hand, Text shows an I-beam, Shape shows a shape/crosshair, and Gradient shows a gradient swatch. The cursor is applied to both the main editor viewport and the print-canvas surface; pointer/touch interactions remain unchanged and mobile falls back safely to touch behavior.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Circular rotate-arrow handle refinement

Refined the Free Transform rotation control to match the supplied reference: removed the protruding connector stem and replaced the plain dot with a small white circular control containing a dark circular rotate-arrow glyph and a thin Kittl-blue outline. The larger transparent hit area remains for reliable pointer/touch rotation, and the live degree badge remains nearby.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-16 — Functional Kittl-inspired Shape tool

- Replaced the Shape tool's placeholder notice with a compact, touch-friendly preset picker: Rectangle, Rounded rectangle, Ellipse, Triangle, Diamond, Line, Arrow, Star, and Hexagon. The selected preset remains active while drawing; the foreground color styles new geometry.
- Dragging on the print canvas renders a live SVG preview; releasing creates a native editable `shape` layer, selects it, reveals the Layers stack on desktop, and makes it available to the shared mockup renderer. Pointer cancel/lost capture clears an unfinished shape rather than committing it. Existing layer transform handles apply to these vector layers.
- Added a pure geometry helper for the nine presets and regression coverage for all preset paths, reversed drag bounds, fill/stroke behavior, and arrow/ellipse details. The picker includes labels and accessible pressed state, and does not depend on hover.
- Validation after rebasing onto the concurrent main updates: all six relevant unit suites passed **47/47** (Guide 9, browser guards 1, canvas spec 1, canvas-shell 16, editor layers 15, Pen paths 5); TypeScript passed; Next.js production build and OpenNext Cloudflare Worker build passed; `git diff --check` passed. ESLint reported **0 errors / 25 warnings**.
- Current scope: shape choices are geometric vector paths and draw with a drag gesture. Custom path editing, independent fill/stroke styling controls, and more advanced shape adjustment handles are not part of this increment.


### 2026-11-17 — Photoshop-style Free Transform mechanics

- Kept the owner-approved Kittl-inspired control visuals: thin blue selection outline, eight compact resize points, white circular rotate-arrow control without a stem, live degree badge, and larger transparent pointer targets. The owner clarified that Photoshop-like interaction is acceptable when the tool works reliably.
- Corrected transform scaling and rotation to use each layer's actual bounds center rather than the artwork canvas center. The active selection's rotation is reflected by the bounding controls; rotated resize drags are interpreted in the selected object's local coordinates. The actual resize-handle key is read from its parent handle group, fixing the prior fallback that treated every handle as bottom-right.
- Corner handles preserve proportions by default. Holding Shift permits independent X/Y scaling; Alt/Option scales from the selection center. Holding Shift while rotating snaps to 15-degree increments. Scaling/rotation now keep the opposite anchor or group center stable and merge updates into selected layers without clearing transforms on unselected layers. Pen node editing uses the same per-axis scaling and local pivot transforms. Modifier help is exposed on touch-size controls through accessible descriptions.
- Added deterministic math regression coverage for proportional and free scaling, center anchoring, rotated side handles, and rotation snapping. Validation passed: six relevant suites **50/50**; TypeScript passed; Next.js production and OpenNext Cloudflare builds passed; `git diff --check` passed. ESLint returned **0 errors / 25 warnings**.
- Scope limitation: this increment covers move, proportional/free scale, center scaling, and snapped/free rotation. Photoshop's skew, perspective, distortion, warp, numeric transform fields, persistence to serialized layer data, and synchronization of canvas transform maps into separate mockup previews are not implemented here.
- Behavior reference: [Adobe Photoshop — Transform images, shapes, and paths](https://helpx.adobe.com/photoshop/desktop/crop-resize-transform/resize-adjust-resolution/transform-images-and-shapes-and-paths.html) and [Kittl — Canvas essentials](https://help.kittl.com/editing-and-design/basic-handling).
### 2026-11-18 — Canvas cursors match Tools Bar icons

Aligned the custom Canvas cursor SVGs with the same Lucide icon geometry used by the Tools Bar instead of using separately drawn approximations. Pen, Pencil, Brush, Move, Hand, Text, Shape, and Gradient now reuse matching icon path shapes and stroke treatment. Eraser follows the requested exception and displays a simple circular cursor rather than the Eraser icon. The cursor remains synchronized between the editor viewport and print canvas.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — Photo layer Adjustments panel

Added a Photo-specific collapsible section to Adjustments for selected uploaded image layers. It includes live Brightness, Contrast, Saturation, and Blur sliders plus compact Remove background and Upscale action boxes. Image adjustment state is stored immutably on `EditorImageContent`, rendered as SVG image CSS filters, and exposed with data attributes for future connected service processing. The two action boxes currently toggle their requested state and clearly show when active; actual AI background-removal/upscale processing remains dependent on the image service endpoint.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — RAW-style Photo color controls

Expanded the Photo Adjustments section toward a Photoshop Camera Raw workflow. Added live Temperature, Tint, Exposure, Highlights, Shadows, Vibrance, Hue, and Vignette controls, plus a Color Mix group with independent Red, Green, and Blue channel sliders. RGB channel values use an SVG component-transfer filter; Temperature/Tint/Hue/Vibrance/Exposure are composed into the live image filter; Vignette renders as a radial gradient overlay. All values persist immutably on the image layer and remain ready for future non-destructive RAW processing services.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.
