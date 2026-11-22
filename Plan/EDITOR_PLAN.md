# MH Fashion Editor Plan — `/create`

**Status: as built (owner decision, 2026-11-21).** The editor is finished for now. This file records
what the code does, what it does not do, and the work that could come next. It is a plan: nothing in it
changes behaviour, and nothing in it starts without the owner saying so.

**Owner instruction (2026-11-21):** keep the editor plan and the editor documentation separate from the
project plan, check the code carefully, and write the plan from the code — not from other products'
editors.

**Companion files**

| File | Contents |
|---|---|
| `Doc/EDITOR.md` | how the editor behaves today, written from the source |
| `Plan/PLAN.md` §6 | the project-level summary; it links here |

These two files (`Plan/EDITOR_PLAN.md` and `Doc/EDITOR.md`) are the whole editor plan and documentation.

**Checked against the source on 2026-11-21** in `apps/web/src`.

---

## 1. Where the editor lives

| Piece | File | Lines |
|---|---|---|
| Route shell: site header, Header Bar 2, workspace | `app/create/page.tsx` | 25 |
| Canvas: tools, selection, layers, mockups, undo | `components/EditorCanvas.tsx` | 2,983 |
| Layer model, text metrics, shapes, gradients, masks | `lib/editor-layers.ts` | 1,847 |
| Layers box | `components/EditorLayersPanel.tsx` | 327 |
| Adjustment box | `components/EditorAdjustmentsPanel.tsx` | 438 |
| Tool bar | `components/EditorToolsBar.tsx` | 256 |
| Header bar: Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size, price, Save, Buy | `components/EditorHeaderBar2.tsx` | 397 |
| Edit sidebar | `components/EditorEditSidebar.tsx` | 338 |
| Layer painting | `components/EditorArtworkLayers.tsx` | 332 |
| Layer thumbnails | `components/EditorLayerPreview.tsx` | 274 |
| Photo adjustments | `components/EditorPhotoAdjustments.tsx` | 261 |
| Mockup mirror of the artwork | `components/MockupArtwork.tsx` | — |
| Pen path geometry | `lib/editor-pen-path.ts` | 198 |
| Transform maths | `lib/editor-transform.ts` | 97 |
| Canvas spec | `lib/editor-canvas-spec.ts` | 9 |
| Artwork tiers | `lib/editor-artwork-tiers.ts` | 38 |
| Upload limits and compression | `lib/editor-upload.ts` | 101 |
| Price table | `lib/editor-price.ts` | 45 |
| Product and GSM defaults | `lib/editor-product.ts` | 4 |
| Print attributes | `lib/editor-attributes.ts` | 47 |
| Design library placeholder | `lib/editor-design-library.ts` | 181 |

## 2. What works today

Checked item by item in the source.

| Area | State |
|---|---|
| Print canvas | 4500 × 5400 px at 300 dpi, transparent, blank on open, frozen spec |
| Workspace | pasteboard around the canvas, zoom 0.25×–3×, pan by wheel / Space / Hand tool, grid toggle |
| Tools | Move, Hand, Pencil, Pen, Text, Brush, Eraser, Shape, Gradient; per-tool options, normalised on load |
| Layers | five kinds; drag reorder; folders with nested children; rename, hide, lock; opacity, fill, blend mode; duplicate, delete |
| Groups and links | group/ungroup with folder rows; link/unlink as transform membership |
| Masks | non-destructive mask strokes (black hides, white reveals), painted with the brush, add/remove, thumbnail |
| Eraser | brush mode and whole-stroke mode, stored as erasure passes, clearable |
| Selection | content-derived box, eight resize handles, rotate handle, hit radius scaled to the box, 15° rotation snap |
| Move | pick-and-drag, group drag, linked drag, arrow-key nudge, layers can be parked off-canvas and still grabbed |
| Text | inline editor with wrapping, caret panning, per-layer styling, font search and recents, seven effect kinds with stacking, three decorations, arch and wave presets |
| Text bounds | ink-based, grows with effects and decorations; verified to ≤1.1 px in browser frame differencing |
| Shapes | nine presets, stroke/fill/line style/rounding/shadow/glow, builder merge/subtract/intersect on rectangles |
| Pen | anchors with Bézier handles, drag handles (Alt breaks symmetry), insert and remove nodes, finish with Enter, discard with Escape |
| Brush | size, hardness, flow, spacing, round/square, blend modes, presets, smoothed strokes |
| Gradients | five types, up to eight stops, presets, on-canvas axis, thumbnails |
| Images | client-side compression (2 MB, 2000 px), nine photo-adjustment groups, non-destructive values, masks |
| Mockups | Front and Back boxes with connectors, artwork mirror clipped to the print area, independent overlay transforms, shared 3500 px tier |
| Header Bar 2 | eight selection boxes (Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size), live price; Save and Buy disabled |
| Edit sidebar | Designs, Elements, Text, Upload, Image Create; rail stays visible; additions land in the Layers box |
| Browser draft | the layers are written to `localStorage` (`mh-fashion-design-draft-v1`) 400 ms after a change; a design-editable product page renders that draft and links back to `/create` |
| Undo / redo | 30 layer snapshots, layer changes only |
| Phone | 44 px targets, Pan view mode, view-only zoom, second finger cannot hijack a gesture, no panel overlap |

## 3. Contracts that must not drift

Each of these was a real defect once. Keep them when changing the editor.

1. A text transform box hugs the painted ink plus effects and decorations, never the font line box.
2. A pure text layer gets no grab margin; strokes, shapes and images get 18 units.
3. `editorTextLines` is the only source of painted lines.
4. The inline editor's box follows the wrapped line count, not the newline count.
5. Handle hit radius scales with the box; the rotate handle stays clear of the resize handles.
6. Move, resize and rotate use the unclamped point; drawing tools stay on the canvas.
7. A press on the selection re-picks a different layer underneath before dragging.
8. Mockup artwork is clipped to the print area.
9. Print geometry (4500 × 5400 px, `unitsPerCm`, layer records) is a contract with the press.
10. The shared header's language and currency pills always show the active option.

## 4. Verified gaps

What the code does not do, with the evidence.

| Gap | Evidence |
|---|---|
| No save button and no restore | Save and Buy are `disabled` in `EditorHeaderBar2`. The only persistence is the browser draft (`saveDesignDraft` in `lib/design-draft.ts`, called from `EditorCanvas` on a 400 ms debounce), and `/create` never reads it back: `readDesignDraft` is only used by `ProductDetailClient`, so a reload starts on one blank layer while the old draft stays in `localStorage`. `clearDesignDraft` is exported but never called, nothing reaches the database, and `/create` ignores the `?product=` it is given |
| No design hand-off to an order | the editor never writes a design; the admin order record is built from the demo store, not from `/create` |
| Undo is layer-only | `undoStack`/`redoStack` hold `EditorArtworkLayer[][]`; viewport and mockup positions are outside it |
| No keyboard undo | only the tool-bar buttons; there is no `Ctrl+Z` handler |
| `circle` text preset paints nothing | `editorTextPresetTransform` returns `undefined` for `none` and `circle`; the Adjustment box still offers it |
| Shape Builder is rectangle-only | `applyEditorShapeBuilderOperation` parses only axis-aligned `M … H … V … H … Z` rectangles and uses the first two paths |
| No align, tidy or distribute | no helper in `lib/`, no control in the panels |
| No flip | no horizontal or vertical flip on any layer kind |
| No hover highlight | canvas → panel selection sync exists; hovering neither side highlights the other |
| No positional snapping | only `snapEditorRotationDelta` (15°); no guides, no edge or centre snapping |
| No context menu | no right-click menu on the canvas or the Layers box |
| No glyph, uppercase or ligature controls | none in the text controls |
| Styling is per text layer | one font, size and colour for the whole layer |
| Only two products | Hoodie, Cup, Kids and Bag are disabled; product and GSM do not change the mockup art or the price table beyond what `editor-price.ts` lists |
| Design library is a placeholder | `DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"` |
| Image Create has no pipeline | the prompt field exists; nothing generates or inserts an image |
| No artboards | one print canvas plus mockups |
| Phone verified by emulation only | `tests/editor-touch.cjs` runs Chromium with touch emulation |
| Header choices are fixed in code | `lib/editor-attributes.ts` holds the option lists (Print Method, Fabric Type, Knit Structure, MH Cuttings) and the narrowing rules as constants, as its own header comment says; the admin attribute chain (`lib/admin-attributes.ts`, `AdminAttributes.tsx`) is edited separately and the editor does not read it |

## 5. Plan — next steps

Ordered by what the shop needs first. Each item is a separate decision: the editor is final as built, so
the owner approves an item before it starts.

| # | Item | Why | Files | Size |
|---|---|---|---|---|
| E1 | Save the design, then hand it to the order | Save and Buy are dead buttons, the browser draft is never restored, and no order carries the artwork | `EditorHeaderBar2`, `EditorCanvas`, `lib/design-draft.ts`, the order payload | large |
| E2 | Real-phone QA, and fix the `editor-touch.cjs` Edit-sidebar crash | phone is the shop-floor tool; the known test failure hides regressions | `tests/editor-touch.cjs` | small |
| E3 | Settle the `circle` preset — **done 2026-11-22** | a control that does nothing reads as a bug | `lib/editor-layers.ts`, `EditorAdjustmentsPanel` | small |
| E4 | Align to the print canvas, tidy spacing | layers are placed by eye; alignment is the most-requested layout help | new `lib/editor-align.ts`, panel controls | medium |
| E5 | Flip horizontal and vertical — **done 2026-11-22** | mirrored artwork is a normal request for a print shop | `lib/editor-transform.ts`, `EditorToolsBar` | medium |
| E6 | Snap guides while dragging | free placement drifts off the print area | `EditorCanvas` drag paths | medium |
| E7 | Hover highlight between canvas and Layers — **done 2026-11-22** | finding the row for a shape on a busy canvas is slow | `EditorCanvas`, `EditorLayersPanel` | small |
| E8 | Shape Builder for `exclude` and arbitrary paths — **done 2026-11-22** | the builder only merges rectangles today | `lib/editor-path-boolean.ts`, `applyEditorShapeBuilderOperation` | medium |
| E9 | Enable the remaining products | Hoodie, Cup, Kids and Bag are visible but dead | `EditorHeaderBar2`, mockups, `editor-price` | medium |
| E10 | Connect the sidebar library and image generation | Designs, Elements and Image Create are placeholders | `editor-design-library`, R2 endpoint, image service | large |
| E11 | Per-character styling, glyphs, artboards | only if the catalogue needs them | text model migration, renderers, export | large |
| E12 | Required selections before Buy | an order must carry every choice; Save stays open | `EditorHeaderBar2`, new gate helper, order payload | small |
| E13 | Keyboard Undo / Redo — **done 2026-11-22** | desktop users expect Ctrl+Z; only the tool-bar buttons exist | `lib/editor-shortcuts.ts`, `EditorCanvas` | small |
| E14 | Image resolution warning — **done 2026-11-22** | a photo enlarged past what the press can print sharply is only discovered after printing | `lib/editor-image-ppi.ts`, `editor-layers`, `EditorCanvas`, Layers box, Adjustment box | small |
| E15 | Header choices come from the admin dashboard | the shop must be able to change, add and remove the choices behind the header boxes without a code change | `lib/editor-attributes.ts`, `lib/admin-attributes.ts`, `EditorHeaderBar2`, `AdminAttributes` | medium |

### E1 — Save and order hand-off

- Restore the draft the editor already writes, so a reload continues the same artwork, then make Save
  write the design (layers, canvas, product, GSM, colour, size, price) somewhere it survives a browser
  change; Buy turns the same payload into an order line.
- Acceptance: reload keeps the artwork; a placed order shows the design in the admin order view with the
  print sheet and mockups; a browser with storage disabled shows a clear message instead of losing work.
- Blocked on the decision in §6 D1 (where the design lives) and on the payment/order work.

### Built: E3 the `circle` text preset (2026-11-22)

- Settled by removal from the control: the Adjustment box offers Plain / Arch / Wave, the three presets
  that paint. A circle baseline would need a per-glyph placement pass in every renderer (canvas, inline
  editor, mockup, print sheet) for a look the catalogue does not ask for.
- `textTransform: "circle"` stays in the type and in `editorTextPresetMatrix` as a **legacy stored value**:
  artwork saved with it renders as plain text with the ink box unchanged, instead of breaking.
- Verified: `tests/editor-layers.test.cjs` (a circle layer renders plain, its box equals the plain box) and
  `tests/editor-arrange.test.cjs` (the tile list is exactly Plain / Arch / Wave).

### E2 — Phone QA

- Fix the `null` `getBoundingClientRect` in the Edit-sidebar section so the suite runs to the end, then
  run the flow on at least one physical Android and one iPhone.
- Acceptance: `tests/editor-touch.cjs` passes end to end, and a written note records the devices, OS
  versions and what was checked.
- Owner decision (2026-11-21): this item is done by testing on real devices and fixing what is found, not by emulation alone.
- Checklist for the real-device pass: (1) iPhone Safari opens `/create`, draws and holds many layers on the 4500 × 5400 canvas without the page reloading (browser canvas limits are not verified in the source); (2) Burmese text typed with the Text tool, in several fonts and with effects, renders correctly on the canvas, the mockup and the print sheet; (3) the on-screen keyboard never hides the text box or caret; (4) uploads from the gallery and camera, including photos over 10 MB; (5) every tool with one finger, a second finger never taking over, Pan view, `+` / `−` / Reset view; (6) the Layers box and Edit sidebar never overlap, and the bottom navigation and safe areas never cover the editor; (7) portrait to landscape, dark and light, 20 to 30 layers, and the 30-step undo limit; (8) a reload loses the working canvas today (E1) and is recorded as such.

### E3 — `circle` preset

- Either paint a circular baseline (and grow the bounds to match) or remove `circle` from the control.
- Acceptance: every preset the panel offers paints, and the ink stays inside the transform box (frame
  differencing, ≤1.1 px).

### E4 — Align and tidy

- Align the selection to the print canvas (left, centre, right, top, middle, bottom) and tidy the spacing
  of three or more layers.
- Constraint: moves layer origins, never scales, treats a linked set as one unit.
- Owner decision (2026-11-21): the alignment targets are the design areas the shop defines for each mockup, not always the canvas centre. This item starts after the mockup design-area discussion.
- Acceptance: unit tests on the helper against `PRINT_CANVAS_SPEC`; a canvas test that the artwork lands
  inside the print area.

### E5 — Flip

- Horizontal and vertical flip on the selection, mirrored in the mockup and the print export.
- Acceptance: the printed PNG is the mirror of the unflipped one and the transform box still hugs the
  ink (a flipped italic moves its ink).

### E6 — Snap guides

- While dragging, snap to the canvas edges and centre, and to other layers' edges and centres, with a
  visible guide line; a modifier key suspends snapping.
- Owner decision (2026-11-21): the snap targets include the design areas defined per mockup. This item starts after the mockup design-area discussion.
- Acceptance: a drag within the snap distance lands exactly on the guide, the guide disappears on release,
  and touch dragging keeps working.

### E7 — Hover highlight

- Hovering a canvas layer highlights its Layers row; hovering a row outlines its canvas layer. No
  selection change.
- Acceptance: a browser test asserts both directions appear and clear, and that touch devices are
  unaffected.

### E8 — Shape Builder

- `exclude` plus boolean operations on any closed path, not just the first two rectangles.
- Acceptance: merge, subtract, intersect and exclude on rotated shapes and pen paths produce one path
  that prints, with bounds following the result.

### E9 — Products

- Enable Hoodie, Cup, Kids and Bag with their mockups, print areas and prices; product and GSM must change
  the mockup and the price.
- Acceptance: each product renders its mockup, prices from its own table, and prints on the correct print
  area.

### E10 — Sidebar services

- Designs and Elements read the real design library; Upload stores its images; Image Create generates and
  inserts an image.
- Acceptance: a design added from the sidebar survives a reload (once E1 lands) and appears in the print
  bundle.

### E12 — Required selections before Buy  *(owner decision, 2026-11-21)*

- **Rule:** Buy is allowed only when all eight header selections hold a value: Product, Print Method,
  Fabric Type, Knit Structure, MH Cuttings, GSM, Color and Size. **Save is always allowed**, whatever is or
  is not chosen.
- **Today:** the header opens with a value in every box except Color (owner, 2026-11-21). A box counts as
  chosen when it holds a value, a pre-filled default included (decision D7).
- **Buy with something missing:** the Buy button stays clickable, because a disabled button cannot say why.
  Clicking it shows a small notice that names every missing selection (for example "Choose Color before
  buying"), outlines each missing box, and scrolls or focuses the first one. The notice is non-blocking, is
  announced to screen readers (`role="status"`), and clears as soon as the last missing box is filled.
- **Wording:** the notice reads in English and Myanmar with the active UI language, and names fields with
  their header labels. The owner reviews the Myanmar wording.
- **Web and Phone:** on Web the notice sits under the Buy button and does not cover the canvas; on Phone it
  sits under the header row, above the bottom navigation, the header row scrolls the first missing box into
  view, targets stay about 44 px, and the notice never overlaps the Layers box or Edit sidebar.
- **Server check:** the order endpoint repeats the rule and rejects a payload that lacks a required
  selection, and it also rejects a combination that has no price or is hidden in Availability. The button is
  never the only guard.
- **Scope:** T-Shirt. The Phone product's required set is decided when Phone ordering is built.
- **Order of work:** the gate ships with Buy (E1, after payment). Until then Buy stays disabled.
- Acceptance: with Color empty, Buy shows a notice naming Color, the Color box is outlined and in view; Save
  works with Color empty; choosing Color clears the notice and outline at once; with everything chosen Buy
  proceeds; Enter and Space on Buy behave like a click and move focus to the first missing box; the notice is
  announced and shows in English and Myanmar, dark and light, at 1440 × 900 and 390 × 844; a unit test covers
  the pure "which selections are missing" function; a server test rejects a payload with a missing selection,
  an unpriced combination and a hidden one.

### E13 — Keyboard Undo / Redo  *(owner decision, 2026-11-21)*

- `Ctrl+Z` (`Cmd+Z` on Mac) undoes; `Ctrl+Shift+Z`, `Cmd+Shift+Z` and `Ctrl+Y` redo. `Cmd+Y` is left alone.
- It runs the same undo and redo functions as the tool-bar buttons and keeps the same scope: layer changes
  only, 30 snapshots; zoom, pan and mockup positions stay outside the history.
- **Fields keep the browser's own Undo:** while the focus is in an input, textarea, select, a contenteditable
  element or a `role="textbox"` element (the inline text editor, the Edit-sidebar search, number fields), the
  shortcut does nothing, so typing is never rolled back by layer history.
- **Burmese and other non-Latin layouts:** when the pressed key is not a Latin letter, the physical key is
  used, so the shortcut works on a Myanmar keyboard. On a Latin layout that moves the letters (AZERTY), the
  letter wins.
- Ignored: any Alt combination (AltGr types characters on some layouts) and keystrokes made while an input
  method is composing text.
- The shortcut works whether the tool bar is expanded or collapsed and while the Layers or Adjustment box is
  open.
- Phone: no keyboard, so the buttons stay the way to undo.
- Acceptance: a unit test covers the key matrix and the field check; a browser test undoes and redoes a layer
  change with the tool bar collapsed and with the Layers box open; typing in the text editor and pressing the
  shortcut changes the text only; `Doc/EDITOR.md` §17 gains the new rows.

### E14 — Image resolution warning  *(owner decision, 2026-11-21: add it)*

- **Facts checked in the source:** layers live in a 1000 × 1200 artwork space that maps to the 4500 × 5400 px
  canvas at 4.5 px per unit; an uploaded photo is reduced to at most 2000 px on its long edge (`UPLOAD_MAX_EDGE`)
  and inserted centred, fitted inside 80 % of the artwork width and height (`imageLayerBox`); an image layer
  stores its box and byte size but not the photo's own pixel size.
- **Measure:** effective ppi = 300 × (photo pixels along an axis) ÷ (pixels that axis covers on the print
  canvas). Rotation and masks do not change it. A photo stretched on one axis only takes the lower value. By
  this formula a 2000 px photo at the default size lands between about 139 ppi (a portrait photo) and 167
  ppi (a landscape or square one), and a 1000 px photo between about 69 and 83 ppi.
- **Needs:** the photo's source pixel size stored on the layer at upload, or measured by loading the image for
  layers saved without it.
- **Applies to** image layers only; text, shapes and strokes are vector.
- **Levels:** good, low, very low. The thresholds come from the print desk's minimum acceptable ppi; 150 and
  100 are placeholders to test with.
- **Where:** a small badge on the image row in the Layers box, a "Print quality: N ppi" line with its level in
  the Adjustment box, and a quiet on-canvas notice when resizing drops a layer to a lower level. Phone shows an
  icon (about 44 px) that opens the detail. English and Myanmar, dark and light.
- **Never blocks:** Save and Buy stay available. Whether "very low" needs a confirmation at Buy is decided in
  E1. Optionally the ppi of each image layer is stored on the order item so the print sheet shows it
  (`lib/print-quality.ts` already carries the other print checks).
- Open decision D8: the 2000 px upload cap decides whether the warning is useful (see §6).
- Acceptance: unit tests for the formula (a 2000 px photo shown 2000 px wide gives 300; shown 3500 px wide gives
  about 171; rotation and masks leave it unchanged; a one-axis stretch takes the lower value); the badge and
  line update live while resizing; undo history is untouched; checked at 1440 × 900 and 390 × 844.

### E15 — Header choices managed from the admin dashboard  *(owner decision, 2026-11-21)*

- **Rule:** the shop can change the choices behind the header boxes from the admin dashboard — rename, add,
  remove and reorder the options of Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Size and
  Color — and the narrowing rules between them (today Sublimation allows Polyester only, Polyester allows
  Interlock and Air Layer, cotton allows Single Jersey and Interlock). Nothing the shop is expected to change
  stays fixed in code.
- **Same source everywhere:** the editor header, the admin pricing table and the T-shirt post form read the
  same managed chain. Today the editor reads constants and the admin edits its own copy, so the two can
  disagree.
- **Removing an option:** an option already used by a priced combination, a post or an order is hidden from
  new choices, not deleted, so existing records keep their meaning.
- **Order of work:** the managed chain must live where the editor and the server can both read it (the
  database, after the Supabase work); until then the admin copy and the constants stay in step by hand.
- Acceptance: adding an option in the admin makes it appear in the editor header and the pricing table after
  a reload; removing one hides it from new choices and leaves existing orders readable; a changed narrowing
  rule changes what the header offers; a unit test covers the fall-back to the first valid option when a
  choice stops being offered; checked on Web and Phone.

### Built: E13 keyboard Undo / Redo (2026-11-22)

- `lib/editor-shortcuts.ts` resolves the key: `Ctrl+Z` / `Cmd+Z` undo, `Ctrl+Shift+Z`, `Cmd+Shift+Z` and
  `Ctrl+Y` redo, `Cmd+Y` left to the browser, Alt combinations and composing keystrokes ignored.
- A focused text field (input, textarea, select, contenteditable, `role="textbox"`) keeps the browser's own
  undo, so typing is never rolled back by the layer history.
- A non-Latin layout falls back to the physical key (`KeyZ`), so a Myanmar keyboard works; a Latin letter
  wins over the position, so AZERTY keeps its letter.
- `EditorCanvas` binds it to the same `undoCanvasAction` / `redoCanvasAction` as the tool bar, through a
  ref rebuilt every render, so it works with the tool bar collapsed and either box open.
- Verified: `tests/editor-shortcuts.test.cjs` (6 cases) and a browser check in `tests/editor-touch.cjs`
  that undoes and redoes a stroke with the tools collapsed and the Layers box open, then confirms a
  focused rename field leaves the layers alone.

### Built: E14 image resolution warning (2026-11-22)

- `lib/editor-image-ppi.ts`: effective ppi = 300 × the photo's own pixels ÷ the print pixels its box
  covers (4.5 print px per artwork unit), taking the lower axis so a one-axis stretch counts. Levels step
  at 150 and 100 ppi (placeholders from the print desk). Rotation and masks do not change the value, and a
  layer without a stored pixel size reports nothing instead of a guess.
- `EditorImageContent` gained `sourceWidth` / `sourceHeight`, written by the upload path from the retained
  pixel size, so the number is measured, not estimated.
- Where it shows: a badge on the image row in the Layers box (which also opens the Adjustment box, and is
  a 44 px target on touch), and a "Print quality: N ppi · level" line at the top of the Adjustment box.
  When a resize drops a photo a level, the editor says it once in the tool-bar notice. Save and Buy are
  never blocked.
- Verified: `tests/editor-image-ppi.test.cjs` (the 300 / 171 / 139 / 167 / 69 / 83 ppi cases, the level
  steps, the null cases) and a Chromium check: a 1200 px upload shows "100 ppi · low", and resizing it up
  1.5× turns the badge to "67 ppi" and the notice to "upload-1200.png: print quality dropped to 67 ppi".

### Built: E8 Shape Builder booleans (2026-11-22)

- `lib/editor-path-boolean.ts` is the geometry: an SVG path walker (M, L, H, V, C, S, Q, T, Z, absolute and
  relative; an arc falls back to a straight line to its endpoint) that flattens curves into closed rings,
  a split-and-classify boolean that keeps the pieces each operation wants, and a chain walk that rebuilds
  rings. Endpoints within a hundredth of a unit of each other are merged first, because the crossing of
  edge A with edge B is computed twice and the two results differ in the last bits.
- Rings are oriented by nesting depth, so a hole cuts the right way under the nonzero fill rule.
- `applyEditorShapeBuilderOperation` now folds every path on the layer (the first is the base for
  subtract) into one path, and leaves the artwork alone when the result would be empty.
- The Adjustment box offers Select / Merge / Subtract / Intersect / Exclude.
- Verified: `tests/editor-path-boolean.test.cjs` (areas, ring counts, curves, rotated shapes, pen paths,
  relative commands, fractional coordinates, empty results) and a Chromium run that draws two overlapping
  rectangles on one layer and clicks each mode: merge gives one 8-point ring, subtract one 6-point ring,
  intersect one 4-point ring, exclude one path of two 6-point rings, and the transform box shrinks and
  grows with the result (210x251 → 190x191 → 90x91 → 210x251 px).

## 6. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Where does a saved design live — browser storage, the database, or only the order? | Database, keyed to the customer, with the order carrying a snapshot; browser-only storage loses work on a device change |
| D2 | Do Save and Buy ship before payments are finished? | Ship Save first (it is useful alone); Buy waits for the payment flow |
| D3 | Fix `circle` or remove it? | Remove it now, add it back with a real transform later |
| D4 | Which product comes after T-Shirt and Phone? | Hoodie — it is the closest print geometry to the T-shirt |
| D5 | Alignment and snapping, or keep free placement? | Both: snapping while dragging, alignment as an explicit action |
| D6 | Per-character text styling? | Not now; per-layer styling covers the catalogue, and the change touches every renderer, the print sheet and saved designs |
| D7 | Do the pre-filled header defaults count as chosen for the Buy gate (E12)? | Yes: only Color is empty today, and the gate exists to stop an order missing a value, which a default never does |
| D8 | Raise the 2000 px upload cap (E14)? | Raise it, or keep the original at order time. At the cap a photo is already about 139 to 167 ppi at the default size, so the warning would fire on nearly every photo; raising it needs the real-device check in E2 |
| D9 | Fit Type is a priced post attribute but has no box in the editor header. Where does the customer choose it, and is it required before Buy? (Owner, 2026-11-21: Sleeve has not been decided to be added, so it is outside this question.) | Settle this before E1: the order must carry whatever the price depends on |

### Owner decisions recorded (2026-11-21)

1. Keyboard Undo / Redo is approved (E13).
2. Save and the order hand-off (E1) is the most important item. Save comes first, once accounts exist; Buy
   follows the payment work.
3. Align and snap guides (E4, E6) work inside design areas that the shop defines for each mockup, not always
   the centre. The mockup details are discussed later and E4 and E6 wait for that.
4. The image resolution warning is approved (E14); the upload-cap question is open (D8).
5. Phone QA (E2) is real-device testing followed by fixes.
6. Required selections before Buy (E12): all eight header selections; Save always allowed; Buy shows what is
   missing.
7. The header holds eight selection boxes, as listed in §2.
8. The choices behind the header boxes, and the rules between them, must be changeable from the admin dashboard, not fixed in code (E15).

## 7. Verification and change policy

- The editor is final as built. Behaviour changes only on an explicit owner instruction, one item at a
  time, and the item's acceptance in §5 is met before it is called done.
- Every change is checked at desktop 1440 × 900 **and** phone 390 × 844 touch.
- Anything that paints is checked by frame differencing: hide the glyphs, diff two screenshots, require
  ≤1.1 px of ink outside the transform box.
- Any layer change is checked against the print sheet and the mockup, not only the canvas.
- `node --test tests/*.test.cjs` must stay green, and `tests/editor-touch.cjs` is run against a live
  server for anything interactive.
- Documentation: `Doc/EDITOR.md` is updated in the same change as the behaviour; this plan is updated
  when an item starts or finishes.

## 8. Test coverage today

| Suite | Tests |
|---|---|
| `tests/editor-layers.test.cjs` | 49 |
| `tests/canvas-shell.test.cjs` | 29 |
| `tests/photo-adjustments.test.cjs` | 18 |
| `tests/editor-attributes.test.cjs` | 8 |
| `tests/editor-pen-path.test.cjs` | 6 |
| `tests/editor-price.test.cjs` | 4 |
| `tests/canvas-spec.test.cjs` | 1 |
| `tests/editor-touch.cjs` | browser flow (desktop and phone) |

The last run of the three editor helper suites (layers, pen path, canvas spec) reported 56 passing.
