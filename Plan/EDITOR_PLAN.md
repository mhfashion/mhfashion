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

**Checked against the source on 2026-11-21** in `apps/web/src`, and refreshed on 2026-11-22 against `main` after the
commits that added per-tool option boxes, text styles, 3D text materials, the effects gallery, the brush pack
folder, keyboard undo, the resolution warning, flip, the Shape Builder booleans and the design download.

---

## 1. Where the editor lives

| Piece | File | Lines |
|---|---|---|
| Route shell: site header, Header Bar 2, workspace | `app/create/page.tsx` | 29 |
| Canvas: tools, selection, layers, mockups, undo | `components/EditorCanvas.tsx` | 3,157 |
| Layer model, text metrics, shapes, gradients, masks | `lib/editor-layers.ts` | 2,044 |
| Layers box | `components/EditorLayersPanel.tsx` | 355 |
| Adjustment box | `components/EditorAdjustmentsPanel.tsx` | 676 |
| Tool bar | `components/EditorToolsBar.tsx` | 330 |
| Header bar: Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size, price, Save, Buy | `components/EditorHeaderBar2.tsx` | 386 |
| Edit sidebar | `components/EditorEditSidebar.tsx` | 338 |
| Layer painting | `components/EditorArtworkLayers.tsx` | 332 |
| Layer thumbnails | `components/EditorLayerPreview.tsx` | 364 |
| Photo adjustments | `components/EditorPhotoAdjustments.tsx` | 261 |
| Mockup mirror of the artwork | `components/MockupArtwork.tsx` | — |
| Pen path geometry | `lib/editor-pen-path.ts` | 198 |
| Transform maths | `lib/editor-transform.ts` | 132 |
| Canvas spec | `lib/editor-canvas-spec.ts` | 9 |
| Artwork tiers | `lib/editor-artwork-tiers.ts` | 38 |
| Upload limits and compression | `lib/editor-upload.ts` | 101 |
| Price table | `lib/editor-price.ts` | 45 |
| Product and GSM defaults | `lib/editor-product.ts` | 4 |
| Print attributes | `lib/editor-attributes.ts` | 72 |
| Design library placeholder | `lib/editor-design-library.ts` | 181 |

## 2. What works today

Checked item by item in the source.

| Area | State |
|---|---|
| Print canvas | 4500 × 5400 px at 300 dpi, transparent, blank on open, frozen spec; the element lays out at 900 × 1080 (`PRINT_CANVAS_BACKING_SPEC`) because nothing is drawn into its bitmap, and the print size stays in the spec and the `data-canvas-*` attributes |
| Workspace | pasteboard around the canvas, zoom 0.25×–3×, pan by wheel / Space / Hand tool, grid toggle |
| Tools | Move, Hand, Pencil, Pen, Text, Brush, Eraser, Shape, Gradient; options normalised on load |
| Tool options | every tool has a `Tool Options · <tool>` box at the top of the Adjustments panel (Brush/Pencil, Eraser, Pen, Text, Shape, Move, Gradient); a box writes one field at a time and merges into the stored settings |
| Layers | five kinds; drag reorder; folders with nested children; rename, hide, lock; opacity, fill, blend mode; duplicate, delete |
| Groups and links | group/ungroup with folder rows; link/unlink as transform membership |
| Masks | non-destructive mask strokes (black hides, white reveals), painted with the brush, add/remove, thumbnail |
| Eraser | brush mode and whole-stroke mode, stored as erasure passes, clearable |
| Selection | content-derived box, eight resize handles, rotate handle, hit radius scaled to the box, 15° rotation snap |
| Move | pick-and-drag, group drag, linked drag, arrow-key nudge, layers can be parked off-canvas and still grabbed |
| Text | inline editor with wrapping, caret panning, per-layer styling, a font picker fed by the R2 manifest (search, recents, shelves) with the eight system fonts as fallback, each name painted in its own face, an effect stack of thirteen kinds (shadow, outline, glow, offset, echo, extrude, stripe, blur, gradient, pattern, hollow, bevel, gloss), three decorations, Plain/Arch/Wave warp (Arch and Wave are slants, see §4) |
| Text styles | 31 one-click looks on Classic, Fill and 3D shelves (including Chrome 3D, Gold, Ice, Lava, Balloon, Jelly, Wood, Marble, LED); every tile and every effect row paints its own live preview through the canvas renderer; a style only writes an effect stack, so every part stays editable |
| Text bounds | ink-based, grows with effects and decorations; verified to ≤1.1 px in browser frame differencing |
| Shapes | nine presets, stroke/fill/line style/rounding/shadow/glow, builder select/merge/subtract/intersect/exclude over any path data (`booleanPathData`), not just rectangles |
| Pen | anchors with Bézier handles, drag handles (Alt breaks symmetry), insert and remove nodes, finish with Enter, discard with Escape |
| Brush | per-tool options box: preset chips painted as rows of dabs, nib (tip, size, angle, roundness), paint (opacity, flow, spacing, smoothing), edge (softness, feather), shape dynamics (size, opacity, angle and roundness jitter, scatter, fade-out), dab blend, reset; strokes smoothed as drawn |
| Gradients | five types, up to eight stops, presets, on-canvas axis, thumbnails |
| Images | client-side compression (2 MB, 2000 px), nine photo-adjustment groups, non-destructive values, masks |
| Mockups | Front and Back boxes with connectors, artwork mirror clipped to the print area, independent overlay transforms, shared 3500 px tier |
| Header Bar 2 | eight selection boxes (Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size), live price; Save and Buy disabled |
| Edit sidebar | Designs, Elements, Text, Upload, Image Create; rail stays visible; additions land in the Layers box |
| Browser draft | the layers are written to `localStorage` (`mh-fashion-design-draft-v1`) 400 ms after a change; `/create` restores them on load and says "Restored the design from your last visit"; a design-editable product page renders that draft too |
| Undo / redo | 30 snapshots of the layer list, covering paint, pen, shape and gradient edits plus add, delete, duplicate, rename, reorder, group, mask and visibility/lock toggles; Ctrl+Z / Ctrl+Shift+Z (⌘ on macOS) through `lib/editor-shortcuts.ts`; viewport, mockup overlay and the opacity/fill sliders stay outside it |
| Download | "Download my design" saves a 38.1 × 45.72 cm SVG (300 dpi PNG too) with the used fonts inlined as base64 `@font-face` rules |
| Fonts | the picker reads `fonts/manifest.json` from R2 (`lib/editor-fonts.ts`, `lib/editor-font-library.ts`); bad entries are skipped by name; the eight system fonts stay the fallback |
| Flip | horizontal and vertical, about the selection's own centre (`flipLayerPlacement`); the buttons sit in the Tools bar today and move to the Adjustments panel (E22) |
| Hover | the canvas outlines the layer under the pointer and the Layers row highlights with it |
| Image resolution | a photo that would print below the press resolution is flagged in the Photo panel (`lib/editor-image-ppi.ts`) |
| Phone | 44 px targets, Pan view mode, view-only zoom, second finger cannot hijack a gesture, no panel overlap; 25 layers, the 30-step undo floor and a portrait→landscape rotation are covered by `denseDesign()` in `tests/editor-touch.cjs` |

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
11. A new text effect kind needs a default in `effectSample` and `EffectTile`, or its tile paints empty; the renderer and the bounds share `editorTextEffects` and `editorTextPaintPadding`, so a new kind must extend the padding too.

## 4. Verified gaps

What the code does not do, with the evidence.

| Gap | Evidence |
|---|---|
| No Save, and no design outside the browser | Save and Buy are `disabled` in `EditorHeaderBar2`. The browser draft is restored on load (`readDesignDraftSnapshot` in `lib/design-draft.ts`), but nothing reaches a database, `clearDesignDraft` is never called, and `/create` ignores the `?product=` it is given. Waiting on decision D1 |
| No design hand-off to an order | the editor never writes a design; the admin order record is built from the demo store, not from `/create` |
| Undo is layer-only | `undoStack`/`redoStack` hold `EditorArtworkLayer[][]`; viewport zoom/pan, the mockup overlay transforms and the opacity/fill sliders are outside it, so those changes cannot be undone |
| Every layer can be deleted | `deleteEditorLayer` filters the list without a floor, so deleting the last layer leaves an empty design. Add layer recovers it, and since 2026-11-22 a stroke on the empty design says "Add a layer before drawing." (it used to return silently). Owner decision still needed: keep one layer, or leave it deletable |
| Arch and Wave do not bend text | `editorTextPresetMatrix` returns one shear matrix for the whole text block (6° for Arch, 4° for Wave); no glyph follows a curve. The `circle` option is no longer offered and survives only as a legacy stored value |
| No Myanmar font until the bucket is filled | the picker reads `fonts/manifest.json` from R2 and falls back to the eight system fonts, but the shop has not uploaded a manifest yet, so today's list is still Inter, Arial, Georgia, Impact, Courier New, Trebuchet MS, Verdana and Times New Roman |
| Brush packs are a contract only | `public/brushes/README.md` defines `brushes.json` and tip files, `brushes.json` is empty, and no code reads it |
| No stylus or finger pressure | no `pressure` in the source |
| No eyedropper | none in the source |
| No tool shortcut keys beyond undo/redo | `lib/editor-shortcuts.ts` maps Ctrl/⌘+Z and Ctrl/⌘+Shift+Z; the other shortcuts are Space, arrows, Enter and Escape; no tool letters and no brush-size cursor |
| No align or tidy control | `lib/editor-align.ts` (`alignOffset`, `tidyDeltas`) and its 8 unit tests exist, but no panel control calls them: the target area waits on the per-mockup design-area decision |
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
| E2 | Real-phone QA — **source half done 2026-11-22** (the Edit-sidebar crash is fixed and the suite passes 16/16; the canvas is bounded to 972k px; items 5–7 verified in emulation) | phone is the shop-floor tool; the known test failure hides regressions | `tests/editor-touch.cjs` | small |
| E3 | Settle the `circle` preset — **done 2026-11-22** | a control that does nothing reads as a bug | `lib/editor-layers.ts`, `EditorAdjustmentsPanel` | small |
| E4 | Align to the print canvas, tidy spacing | layers are placed by eye; alignment is the most-requested layout help | new `lib/editor-align.ts`, panel controls | medium |
| E5 | Flip horizontal and vertical — **done 2026-11-22; moves out of the Tools bar into the Adjustments panel (owner, 2026-11-22, see E22)** | mirrored artwork is a normal request for a print shop | `lib/editor-transform.ts`, `EditorToolsBar`, Adjustments panel | medium |
| E6 | Snap guides while dragging | free placement drifts off the print area | `EditorCanvas` drag paths | medium |
| E7 | Hover highlight between canvas and Layers — **done 2026-11-22** | finding the row for a shape on a busy canvas is slow | `EditorCanvas`, `EditorLayersPanel` | small |
| E8 | Shape Builder for `exclude` and arbitrary paths — **done 2026-11-22** | the builder only merges rectangles today | `lib/editor-path-boolean.ts`, `applyEditorShapeBuilderOperation` | medium |
| E9 | Enable the remaining products | Hoodie, Cup, Kids and Bag are visible but dead | `EditorHeaderBar2`, mockups, `editor-price` | medium |
| E10 | Connect the sidebar library and image generation | Designs, Elements and Image Create are placeholders | `editor-design-library`, R2 endpoint, image service | large |
| E11 | Per-character styling, glyphs, artboards | only if the catalogue needs them | text model migration, renderers, export | large |
| E12 | Required selections before Buy | an order must carry every choice; Save stays open | `EditorHeaderBar2`, new gate helper, order payload | small |
| E13 | Keyboard Undo / Redo — **done 2026-11-22** | desktop users expect Ctrl+Z; only the tool-bar buttons exist | `lib/editor-shortcuts.ts`, `EditorCanvas` | small |
| E14 | Image resolution warning — **done 2026-11-22** | a photo enlarged past what the press can print sharply is only discovered after printing | `lib/editor-image-ppi.ts`, `editor-layers`, `EditorCanvas`, Layers box, Adjustment box | small |
| E15 | Header choices come from the admin dashboard | the shop must be able to change, add and remove the choices behind the header boxes without a code change | `lib/editor-attributes.ts`, `lib/admin-attributes.ts`, `EditorHeaderBar2`, `AdminAttributes` | medium — **step 1 done 2026-11-22** (one vocabulary); the admin-driven chain still waits for the database |
| E16 | Download my design — **done 2026-11-22** | the customer had no copy of the artwork; the press bundle was the only file | `lib/design-export.ts`, `EditorDesignExport`, `EditorToolsBar` | small |
| E17 | Font library, including Burmese fonts — **approved 2026-11-22; steps 1–4 done 2026-11-22** (manifest picker, download embedding, upload check, list previews); the press bundle waits on E1 | eight system fonts and no Myanmar font; the printed font depends on the device | `EditorAdjustmentsPanel`, font loading, R2, design export, print export | medium |
| E18 | Text effects, round 2 | more looks and finer control for the effect stack | `editor-layers`, `EditorLayerPreview`, `EditorAdjustmentsPanel` | medium |
| E19 | A real text bend — **approach decided 2026-11-22** (outline warp with HarfBuzz) | Arch and Wave only slant the text | `editor-layers`, `editor-fonts`, renderer, bounds, print | medium |
| E20 | Brushes, round 2 | brush packs, pressure, stabiliser and a size cursor | Brush box, `public/brushes`, `EditorCanvas` | medium |
| E21 | Tool adjustments, polish | numeric entry, reset, shortcuts, eyedropper, richer Pen and Shape boxes, phone layout | `EditorAdjustmentsPanel`, `EditorToolsBar`, `EditorCanvas` | medium |
| E22 | Adjustments panel: complete, compact and beautiful | the panel has no numeric position or size, no align, flip or rotate, no colour system, and every label is 9 to 10 px | `EditorAdjustmentsPanel`, `EditorPhotoAdjustments`, `EditorToolsBar`, shared controls | large |

### E1 — Save and order hand-off

- Restore the draft the editor already writes, so a reload continues the same artwork, then make Save
  write the design (layers, canvas, product, GSM, colour, size, price) somewhere it survives a browser
  change; Buy turns the same payload into an order line.
- Acceptance: reload keeps the artwork; a placed order shows the design in the admin order view with the
  print sheet and mockups; a browser with storage disabled shows a clear message instead of losing work.
- Blocked on the decision in §6 D1 (where the design lives) and on the payment/order work.
- **Step 1 done 2026-11-21: the draft is restored on load.** `lib/design-draft.ts` stores each layer's
  move/scale/rotate beside the layers (`readDesignDraftSnapshot`), `EditorCanvas` restores it after mount
  and shows "Restored the design from your last visit", and a browser that refuses storage says so once.
  Reload keeps the artwork; the order hand-off and Save still wait on D1.
- **Bug fixed 2026-11-22: a corrupt draft blanked the editor.** Reading the draft back put whatever was in
  `localStorage` in front of the renderer, so three shapes killed `/create` with "This page couldn't load"
  until the visitor cleared storage: a `null` layer (`Cannot read properties of null (reading 'strokes')`),
  a stroke whose `points` was not a list (`e.points.map is not a function`), and a shape path of `null`
  (`Cannot read properties of undefined (reading 'flatMap')`). `readDesignDraftSnapshot` now runs every
  layer through `sanitizeDesignDraftLayers`: a layer without an id, or whose declared kind has no usable
  content, is dropped; unusable strokes and shape paths are dropped and the rest of the layer is kept;
  numbers are coerced and clamped; an unknown kind from an older build is treated as plain artwork. A
  layer that paints nothing is still kept, because that is the editor's own blank layer. Verified with
  ten corrupt drafts in Chromium (every one now opens the canvas with no console error) and
  `tests/design-draft.test.cjs` (3 new tests, 10 in the file).

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
- **Source half done 2026-11-22: the canvas limit is bounded.** Checklist item (1) is a real risk in the code:
  the print canvas was a `<canvas width=4500 height=5400>`, a 24.3 million pixel backing store (~97 MB), and
  older iOS refuses a canvas above 16.7 million pixels. Nothing draws into that bitmap — the artwork paints in
  the SVG layers above it — so the element now takes `PRINT_CANVAS_BACKING_SPEC` (900 x 1080, 972k px) and keeps
  the print size in `PRINT_CANVAS_SPEC` and the `data-canvas-*` attributes. Verified in Chromium at 1440x900 and
  390x844: backing store 900x1080, `data-canvas-width/height/dpi` still 4500/5400/300, the on-screen box
  unchanged at 292x350 (ratio 0.834). The physical-device pass still has to confirm it on hardware.
- **Emulation pass 2026-11-22: checklist items 5, 6 and 7 are verified in Chromium, and the checks are now
  part of the suite.** A new `denseDesign()` section in `tests/editor-touch.cjs` (14 sections, all pass) proves:
  25 added layers sit beside the blank one and each add lands in well under a second; 35 pencil strokes then 40
  `Ctrl+Z` presses leave exactly 5 strokes, so the undo floor is the documented 30 snapshots; a second finger
  placed mid-stroke does not start a second stroke or extend the line (the tallest ink stays at the pencil width,
  because every pointer handler already rejects a non-primary pointer); and a rotation to 844x390 keeps the
  canvas width, adds no horizontal scroll at page or viewport level, and leaves the canvas reachable through the
  viewport's own scroll.
- **Every one of those paths was then checked in Chromium (1440 x 900) with the console guard on:** add
  (1 to 2 rows, undo back to 1), rename (label becomes `Renamed Layer`, undo restores `Layer 1`), hide and
  show, lock and unlock, mask add and remove, reorder, group, and delete (2 to 1, undo back to 2) each
  return to the previous state with no console error. Deleting both layers leaves an empty list; a stroke
  on it used to paint nothing and say nothing, and now says "Add a layer before drawing." — the same
  treatment the Pen tool already gave a missing layer.
- **Layer housekeeping is now undoable.** `deleteLayer`, `addLayer`, `duplicateLayer`, `renameLayer`,
  `moveLayer`, `moveLayerToIndex`, `groupSelectedLayers`, `ungroupSelectedLayers`, `createLayerMask`,
  `deleteLayerMask`, `toggleLayerVisibility` and `toggleLayerLock` all call `rememberLayerSnapshot()`. Before
  this, a mis-tapped delete could not be undone, and `Ctrl+Z` silently reverted an older paint operation instead.
- **Checked at five viewports on 2026-11-22** (768 x 1024, 1024 x 768, 820 x 1180, 414 x 896, 360 x 800;
  touch emulation on the three under 900 px): no horizontal overflow (`scrollWidth - innerWidth` is 0 at
  every size), the print canvas sits inside the viewport with the header above it and the tools bar below
  it, all ten header boxes are present, and no console error is logged. The only elements wider than the
  viewport are the header's own horizontal scroll container and the docked panels' scroll strips, which is
  what they are for. A tablet (768 x 1024) is therefore covered by the layout rules, not just the two
  sizes §7 names.
- **Bug fixed 2026-11-22: a long Burmese word broke inside its syllables.** A word wider than the
  wrap limit was split per code point, so `"မြန်မာနိုင်ငံ"` painted lines that began with `"ာ"` and `"်"` —
  vowel signs and the asat hanging off nothing, and the artwork broke at different places than the
  textarea. The split now runs over grapheme clusters (`editorTextGraphemes`, `Intl.Segmenter`) and merges
  a cluster that opens with a combining mark back into the previous one, because UAX #29 gives a Myanmar
  spacing mark its own cluster. Verified with `tests/editor-layers.test.cjs` (Myanmar and joined-emoji
  cases) and in Chromium: a 130-code-point Burmese word at the default 110px/880 wrap paints 10 lines,
  rejoins to the original string, and no line starts with a mark, on the canvas, the mockup and the preview.
- **Checklist item 6 is covered at the tightest size (2026-11-22).** At 320 × 480 the `short phone bar`
  section finds all 16 bar buttons hit-testing to themselves (none covered, none off screen), the bar
  ending above the `Mobile navigation` bar, and the print canvas scrolling clear above the bar. No bug
  was found; the check now guards the clearance work on the smallest screen the shop supports.
- **Checklist item 3 is now covered in emulation and fixed in the source (2026-11-22).** A phone keyboard
  shrinks the *visual* viewport without shrinking the layout box, so the caret could sit below the last
  visible pixel with nothing re-panning it: measured on 390 × 844, after six lines the caret line sat at
  y 490–529 while the visible area ended at 334. `keepTextCaretVisible` now clamps to
  `visualViewport` (`offsetTop` + `height`) instead of the layout box, and it re-runs on `resize`,
  `orientationchange` and the visual viewport's own `resize`/`scroll`, not only on a text change. Same
  measurement after the fix: caret 264–302 inside 153–334, and it stays in view when the screen returns
  to 844. The new `keyboard caret` section in `tests/editor-touch.cjs` pins it (19 sections, all pass).
  A real keyboard still has to confirm it on hardware, which is what E2 itself requires.
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
- **Helper only 2026-11-21:** `lib/editor-align.ts` (`alignOffset`, `tidyDeltas`) and its 8 unit tests are
  written; it is not wired to any control yet, because the target area is the decision above.
- Acceptance: unit tests on the helper against `PRINT_CANVAS_SPEC`; a canvas test that the artwork lands
  inside the print area.

### E5 — Flip

- Horizontal and vertical flip on the selection, mirrored in the mockup and the print export.
- Acceptance: the printed PNG is the mirror of the unflipped one and the transform box still hugs the
  ink (a flipped italic moves its ink).
- **Owner decision (2026-11-22): Flip does not belong in the Tools bar.** The two buttons live in the
  Adjustments panel's Arrange section (E22). `flipLayerPlacement` and `flipSelectedLayers` stay as they are; only
  the buttons move, and the Tools bar loses its `canFlip` and `onFlip` props.

### E6 — Snap guides

- While dragging, snap to the canvas edges and centre, and to other layers' edges and centres, with a
  visible guide line; a modifier key suspends snapping.
- Owner decision (2026-11-21): the snap targets include the design areas defined per mockup. This item starts after the mockup design-area discussion.
- **Helper only 2026-11-21:** `lib/editor-snap.ts` (`snapTargetLines`, `snapBoxToLines`, `offsetBox`) and
  its 8 unit tests are written and take the target area as a parameter; the drag is not wired to it yet.
- Acceptance: a drag within the snap distance lands exactly on the guide, the guide disappears on release,
  and touch dragging keeps working.

### E7 — Hover highlight — **built 2026-11-22, acceptance covered**

- Hovering a canvas layer highlights its Layers row; hovering a row outlines its canvas layer. No
  selection change. Implemented in `EditorCanvas.tsx` (`hoveredLayerId`, `hoveredBounds`, the
  `[data-editor-hover-outline]` dashed box) and `EditorLayersPanel.tsx` (`onHoverLayer`, the row ring
  and `data-layer-hovered`). The outline is only drawn for a layer that is **not** selected, so it never
  doubles the solid transform box.
- Acceptance met: the new `hover highlight` section in `tests/editor-touch.cjs` drives a real mouse in
  Chromium at 1280 × 900 and asserts both directions and both clears — hover the artwork, then the row
  of the same layer, then away — with the selection unchanged in every step, and a 390 × 844 touch tap
  that leaves no outline. Suite now 17 sections, all pass.

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
- **Through the R2 asset service (owner, 2026-11-22; `Plan/PLAN.md` §12.1):** Designs and Elements read
  `GET /api/assets/designs` and `/elements`, whose JSON the Worker builds from the folders in R2 and a small
  `meta.json` per asset (name, category, tags). The `pending-r2-endpoint` placeholder in
  `lib/editor-design-library.ts` is replaced by that response. A design's layers stay individually selectable.
  Uploaded photos are private: they go to R2 through the Worker and come back only to their owner.
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

### E16 — Download my design (done 2026-11-22)

- **Where:** a Download chip at the end of the editor tools bar, beside Undo and Redo, with a two-item menu:
  "PNG · 300 dpi (print)" and "SVG · vector". It is disabled while every layer is hidden.
- **What it writes:** only the artwork. `EditorDesignExport` renders the same `EditorArtworkLayers` into a
  hidden `<svg>` with no transform box, guides, handles or inline text editor, and
  `serializeArtworkSvg` copies that group into a standalone document. A file the press opens therefore looks
  like the canvas and not like the editor.
- **Size:** the document is `width="38.1cm" height="45.72cm"` with `viewBox="0 0 1000 1200"`, i.e. the print
  area of `PRINT_CANVAS_SPEC` (4500 × 5400 px at 300 dpi). The PNG is rasterised through an `<img>` and a
  canvas at `exportPixelSize()` — 4500 × 5400 px — so `pixelsToCentimetres()` recovers the same 38.1 × 45.72 cm
  the press sheet and the layer-measurement CSV quote.
- **No webfont risk:** the project loads no webfont (`EDITOR_TEXT_FONT_FAMILY` is `'Inter', system-ui, …`), so
  the rasterised SVG resolves the same system fonts as the page. If a webfont is ever added, it must be inlined
  into the export or the PNG text will fall back.
- **Failure:** an empty canvas reports "Add something to the canvas before downloading"; a rasterise error
  reports "The design could not be downloaded. Try again." rather than saving a broken file.
- Verified in Chromium at 1440 × 900 and 390 × 844 touch: the menu items are 44 px tall on a phone, both files
  download, the PNG is 4500 × 5400 px with the artwork in the same place as on the canvas, and the SVG holds
  no `foreignObject`, handle or outline node.

### Built: E15 step 1 — one vocabulary for the header and the price book (2026-11-22)

- `lib/editor-attributes.ts` now holds every list the header offers: print method, fabric, knit, MH
  cuttings, GSM (`160/180/200/240`), size (`XS`–`3XL`) and the colours, each with its label and swatch.
  `COLOR_LABELS` is the label list the price book keys on.
- `TSHIRT_POST_ATTRIBUTES` in `lib/admin-demo-data.ts` is built from those lists instead of repeating them,
  so the editor header and the admin pricing table cannot offer different sizes or colours again. This is
  the interim step the plan asks for while the managed chain waits for the database; the admin still cannot
  *change* the list, only read the same one.
- What drifted and is now settled: the price book offered `S`–`2XL` and six colours while the header
  offered `XS`–`3XL` and eight. The union is the shared list — sizes `XS`–`3XL`, colours White, Black, Navy,
  Red, Blue, Green, Yellow, Grey, Sand (Sand is a real garment colour the price book already sold). The
  header's price table already covered every size, so no price changed.
- Verified: `tests/editor-attributes.test.cjs` pins the admin seed chain to the shared lists and checks the
  size/GSM price tables cover exactly what is offered; `tests/canvas-shell.test.cjs` fails if the header
  grows a private copy again; the phone and desktop header checks in `tests/editor-touch.cjs` pass with the
  nine-colour menu.

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

### E17 — Font library, including Burmese fonts  *(approved 2026-11-22; the font files live in R2)*

- **Facts checked in the source:** the font list is eight names, all system fonts; none is a Myanmar font; no
  font file is loaded anywhere, so the font a layer paints with depends on the device. `Doc/PRINT-BUNDLE.md`
  says text stays text in the print SVG and is converted to outlines only if the press lacks the font.
- **Approved:** a hosted font library. The font files live in R2 and are put there by the shop (owner,
  2026-11-22). The editor, the mockups and the print sheet all load the same files, so all three show the same
  letters. Fonts sit on shelves (Sans, Serif, Display, Script, Burmese). Only fonts in use are loaded. The
  admin dashboard takes over adding and removing fonts later, as E15 does for the header choices.
- **In R2:** follows the folder pattern of `Doc/R2-STORAGE.md`:
  - `fonts/<font-slug>/<style>.woff2` (for example `regular`, `bold`, `italic`), woff2 only, with a version in
    the file name when a font is replaced so a cached copy is never served stale.
  - The font list is **built by the R2 asset service** (`Plan/PLAN.md` §12.1, owner decision 2026-11-22): the Worker
    reads the font folders and a small `meta.json` per font (display name, shelf, files by weight and style, the
    scripts it covers, the licence name and link, whether it is on) and returns `GET /api/assets/fonts`. The JSON has
    the shape `parseEditorFontManifest` already accepts, so the editor changes only the address it reads from. A
    bad entry is skipped and listed as an issue the admin can see, as for the brush tips. A hand-edited
    `fonts/manifest.json`, if one exists, is still honoured while the shop moves over. The font list is expected to
    move into the database later (D13).
  - The base address of the font files comes from the same public R2 address the mockups use, never hard-coded, so a
    later move to AWS S3 changes one setting.
  - A browser only uses a font served from another address if R2 allows that site with an
    `Access-Control-Allow-Origin` header, so the bucket needs a CORS rule for the site (`Doc/R2-STORAGE.md` §7);
    that is the price of serving fonts from the public bucket address (decision R2-1 in `Plan/PLAN.md` §12.1).
  - Myanmar fonts are large: load one only when a layer uses it, and split Latin and Myanmar with a
    `unicode-range` if a file is big.
- **Export (a dependency of E16):** the design download draws the SVG through an `<img>`, which does not load
  fonts from the network, so the export must embed the fonts the artwork uses inside the SVG (base64 woff2) or
  turn the text into outlines; otherwise the PNG falls back to a system font. The E16 section already warns of
  this. The press SVG and the press bundle follow the same rule.
- **Licence:** every manifest entry carries its licence and a link; the owner confirms that commercial print
  use is allowed before a font is switched on.
- **Burmese:** a few open-licence Myanmar families offered as a shelf; the licence of each font is checked
  before it ships (open-licence fonts such as Padauk and the Noto Myanmar families are the usual candidates).
  Unicode is the only supported encoding; Zawgyi text is not supported or converted (owner decision,
  2026-11-22, D10).
- **Print:** at export time the text is converted to outlines, or the font file is embedded, so the press
  never lacks a font.
- **Step 1 done 2026-11-22: the manifest and the loader.** `lib/editor-fonts.ts` parses
  `fonts/manifest.json` (shelf, scripts, weights, styles, licence, `enabled`), refuses a file that is not a
  bucket-relative `.woff2` or an entry without a licence, and skips a bad entry by name instead of failing.
  `lib/editor-font-library.ts` fetches the manifest once, builds `@font-face` rules with a Latin and a
  Myanmar `unicode-range`, and loads only the fonts a text layer uses. The picker lists the manifest's fonts
  shelf by shelf and falls back to the eight system fonts when there is no manifest, so nothing on screen
  changed until fonts are uploaded. Documented in `Doc/R2-STORAGE.md` §3.2b and `Doc/EDITOR.md` §6.
  Verified: `tests/editor-fonts.test.cjs` (10 tests) and the browser suite, which still lists the eight
  system fonts. Checked again against a manifest served from a local bucket: the picker listed the hosted
  font only (the bad entry was skipped), picking it injected both weights, and the browser downloaded only
  the weight the layer used; the missing font file fell back without an error.
- **Step 2 done 2026-11-22: the download keeps the font.** "Download my design" now inlines the used fonts
  as base64 `@font-face` rules in a `<defs><style>` block (`designExportFontCss` → `designExportDocument`),
  because the 300 dpi PNG is rasterised through an `<img>`, which fetches nothing. A file that cannot be
  downloaded is left out, so a broken bucket never blocks the export. Verified in Chromium against a local
  manifest: the downloaded `mh-fashion-t-shirt.svg` held `<defs><style><![CDATA[@font-face{...data:font/woff2;base64,...`
  with the chosen family; `tests/editor-fonts.test.cjs` and `tests/design-export.test.cjs` cover the rules
  and the CDATA guard.
- **Step 3 done 2026-11-22: a pre-upload check.** `npm run fonts:check -- path/to/fonts`
  (`lib/editor-font-audit.ts` + `scripts/check-font-manifest.cjs`) reads a local copy of the folder with the
  editor's own parser and prints the picker order, every entry the editor would drop and why, any listed file
  that is not in the folder, and any file over 1 MB; it exits 1 while something is wrong, so the owner can
  gate the upload on it. Verified on a good folder, a missing weight, a folder passed as either the bucket
  root or `fonts/`, and an entry without a licence.
- **Step 4 done 2026-11-22: the list paints each font.** The picker already asked for `font-family: <name>` per
  row, but a hosted face was never loaded until the font was chosen, so the labels painted in the fallback.
  Opening the Font section now loads one file per enabled font (`previewFontFile`: the regular, else the first)
  through the same single `<style>`, keyed `<slug>#preview` so a later full load still adds the other weights.
  Verified against a local manifest: nothing was loaded while the section was closed; opening it injected one
  400-weight rule and fetched only `regular.woff2`; the row carries `font-family: Padauk`.
- **Still open:** upload the manifest and the font files to R2 and add the site origin to the bucket's CORS
  rule; check each licence for commercial print; embed (or outline) the used fonts in the **press bundle**
  SVG, which is the remaining E16 dependency; move the font list into the admin dashboard as E15 does;
  confirm Burmese shaping on a real device.
- Acceptance: Burmese text shows correct shaping (stacked consonants, medial signs, vowel order) on the canvas,
  the mockup and the print sheet, with and without effects; a font switched off still renders on existing
  designs; the editor does not load fonts it does not use; the fonts load from R2 with the CORS rule in place;
  the downloaded PNG and SVG show the chosen font, not a fallback; a font whose file is missing falls back
  quietly and the editor says so once; a bad manifest entry is skipped; checked on Web and Phone, EN and MM.

### E18 — Text effects, round 2  *(proposed, 2026-11-22)*

Today an effect holds colour, a second colour, offset, blur, width, count, distance, angle and opacity, and the
stack has thirteen kinds. Proposed additions, each with its own tile, row thumbnail, default and paint padding
(contract 11):

1. **Inner shadow and inner glow** — depth inside the letters, the missing piece of many 3D looks.
2. **Outline options** — position (outside, centre, inside), join (round, mitre) and a second outline for a
   double-outline look. An outline has only colour and width today.
3. **Backdrop plate** — a rounded rectangle or pill behind the text with padding, radius and colour, for
   label and sticker looks.
4. **Image or texture fill** — the glyphs show a photo or texture instead of a flat colour.
5. **Distress** — a grain mask removes parts of the letters for the vintage apparel look; the textures arrive
   through a drop folder like the brush packs.
6. **Pattern controls** — size, spacing and angle for dots, grid and checker, plus stripes, diagonals, stars
   and waves, and a halftone dot that changes size across the letters.
7. **Per-effect blend mode** (opacity already exists).
8. **Stack tools** — duplicate an effect, copy a stack from one text layer to another, and save the current
   stack as "my style".
9. **More styles** on the shelves for the new kinds (for example a Retro, a Neon and a Distress shelf). A glitch
   or RGB-split look needs no new kind; it is a preset of existing offsets.
- **Print caution:** effects that rely on soft transparency (large blur, glow, soft shadow) can print
  differently on a dark garment depending on the print method. Ask the print desk which effects are safe, and
  consider previewing the design on a dark and a light garment colour.
- Acceptance: for each kind the tile paints, the row thumbnail paints, the transform box contains all paint
  (frame differencing, ≤1.1 px), the effect survives save and reload (once E1 lands), Burmese text keeps its
  clusters intact under the effect, and it works at 1440 × 900 and 390 × 844.

### E19 — A real text bend  *(approach decided 2026-11-22; the owner delegated D11; not yet approved to start)*

- **Fact:** `editorTextPresetMatrix` returns one shear matrix (6° Arch, 4° Wave). The whole block leans; nothing
  curves. The Warp tiles therefore preview a slant.
- **Goal:** real bends — Arc up and down, Circle, Wave, Flag, Rise, Bulge and Pinch — each with a Bend amount
  from −100 to +100; Plain stays, and Bend 0 equals Plain.
- **Decided method: outline warp.** The text is shaped, turned into glyph outlines, and every outline point is
  moved by the bend function. Nothing is left to the browser's text layout.
  1. **Shape** the text with HarfBuzz (`harfbuzzjs`, MIT, WebAssembly). HarfBuzz documents a dedicated Myanmar
     shaping model, so stacked consonants, medial signs and vowel order come out as the font intends.
  2. **Outline:** `font.glyphToPath(glyphId)` gives each glyph's outline as SVG path data.
  3. **Bend:** each outline point is mapped through the chosen bend; long segments are subdivided first so the
     edges curve smoothly.
  4. **Paint:** the result is one path per text layer. The canvas, the Warp tiles, the mockup mirror, the print
     SVG and the PNG export all paint that same path, so the bend is identical everywhere and needs no font at
     export time.
  5. **Source of truth:** the text and the bend settings stay on the layer, and the outline is derived data,
     cached by (text, font file, size, bend). Plain text keeps today's text renderer, wrapping and caret; the
     inline editor edits the unbent text and the bend shows live on the canvas.
- **Why this over the alternatives:**

  | Method | Burmese | Same result on every surface | Effects | Verdict |
  |---|---|---|---|---|
  | SVG text path | the browser decides how clusters are placed on a curve; old engines dropped clusters on a path (Mozilla bug 621918) and the W3C gap notes for Indic scripts show vowel signs and conjuncts still behave differently between engines | no: depends on each browser, and the PNG export | stroke effects cut joined glyphs apart | not chosen |
  | Per-character transforms | splitting a Burmese syllable into characters breaks it; grapheme segmentation does not reliably keep a syllable whole | partly | as above | not chosen |
  | **Outline warp** | shaped by HarfBuzz, whose Myanmar model is documented | **yes: one path painted everywhere** | effects run on one path; contours can be merged first | **chosen** |

- **Effects and seams:** glyph outlines overlap inside a Burmese syllable, so stroking each glyph separately
  shows seams (the W3C gap analyses list "text stroke cuts joining glyphs apart" for Indic scripts; Myanmar is
  not named there, so it is checked on real text). The outline is therefore merged into one shape with
  `booleanPathData(paths, "merge")` from `lib/editor-path-boolean.ts` before outline, hollow, bevel and extrude
  effects use it. The layer's transform box follows the bent ink (contract 1).
- **Needs the font file, and the manifest only lists woff2:** HarfBuzz's documented formats are TrueType and
  OpenType (`.ttf`, `.ttc`, `.otf`); woff2 is not among them, and `lib/editor-fonts.ts` refuses any file that is not a bucket-relative `.woff2`.
  Decision D14: each manifest style gets an optional `outline` field naming a `.ttf` or `.otf` kept next to the
  woff2; the editor keeps loading the woff2 for display, and a font without an `outline` file simply cannot be
  bent. The same R2 CORS rule covers the second file.
- **System fonts cannot be bent:** the eight system fonts have no file the editor can read, so the bend is
  offered for hosted fonts only; the control says so on a system font.
- **Weight:** the HarfBuzz module is loaded only when a layer first uses a bend; its download size is to be
  measured before it ships. Shaping and bending a few hundred glyphs is quick, and the cache keeps it off the
  drawing path.
- **Burmese specifics:** the line breaker must never split a syllable (break only between clusters), the bend
  is checked on real Burmese strings such as မြန်မာ, ကြောင်, ပြည်ထောင်စု and သင်္ကြန်, and the same strings are
  checked with and without effects.
- Acceptance: each bend paints identically on the canvas, the tile, the mockup, the downloaded PNG and SVG, and
  the press SVG; the box contains the ink (frame differencing, ≤1.1 px); Bend 0 equals Plain; the Burmese
  strings above keep every stacked consonant, medial sign and vowel in the right place at several bend amounts;
  an outline effect on bent Burmese text shows no seams; removing a font's `outline` file turns the bend off for
  that font instead of failing; checked on Web and Phone, EN and MM.

### E20 — Brushes, round 2  *(proposed, 2026-11-22)*

- **Fact:** the Brush box already has presets, nib, paint, edge and shape-dynamics controls. The brush pack
  contract (`public/brushes/README.md`) exists but nothing reads it yet.
- **Wire the brush pack:** the Brush box builds its gallery from `brushes.json` (a bad row is skipped, not
  fatal), shelved by `group`, with PNG stamp tips tinted to the brush colour and SVG vector tips.
- **Where the tips live (owner, 2026-11-22):** the owner finds the tips and puts them in R2, as with the fonts.
  The `brushes.json` contract in `public/brushes/README.md` then applies to a `brushes/` folder in R2. The R2 asset
  service (`Plan/PLAN.md` §12.1) builds the list the Brush box reads, `GET /api/assets/brushes`, from that folder
  and the `brushes.json` the shop wrote; the repo folder stays a template. The R2 CORS rule covers the tip files.
  The pre-upload check for brushes uses the same builder as the fonts check.
- **A starter set:** Ink (pen, marker), Dry media (chalk, charcoal, pencil), Airbrush, Splatter, Texture (grain,
  sponge) and Shape (stars, leaves), found and uploaded by the owner; each licence is checked before a tip is
  switched on.
- **Pressure:** the pointer's pressure drives size and opacity when a stylus or pressure-capable screen
  reports it, with an on/off switch per brush; no pressure is read today. Fingers report none, so the feature
  is optional.
- **Stabiliser:** a smoothing-by-lag slider for shaky hands, mostly useful on a phone.
- **Nib cursor:** a circle or tip outline at the real size for the current zoom while the Brush, Pencil or
  Eraser is active.
- **Colour dynamics:** hue, saturation and brightness jitter alongside the existing jitters.
- **My brushes:** save the current settings as a named preset; a symmetry (mirror) mode may follow.
- Acceptance: a dropped pack appears without a code change and a malformed entry is skipped; a stamp brush
  draws the tip at the right size, spacing and angle; the Eraser can use the same tips; pressure, stabiliser and
  cursor work on Web and Phone; strokes still print identically to the canvas.

### E21 — Tool adjustments, polish  *(proposed, 2026-11-22)*

1. **Number fields:** every slider gets a number field, step arrows, a per-field reset (double-click) and
   arrow-key stepping (Shift for ×10); the value shows while dragging.
2. **Shortcut keys:** V Move, H Hand, B Brush, N Pencil, P Pen, T Text, E Eraser, U Shape, G Gradient, I
   Eyedropper, `[` and `]` for brush size, X to swap colours, D for the default colours; each is shown in the
   tool tooltip and is ignored while a field has focus (the same rule as E13).
3. **Eyedropper:** pick a colour from the canvas or the mockup; the browser's EyeDropper API where it exists,
   canvas sampling elsewhere.
4. **Pen box:** join style, line style (solid, dashed, dotted), end shapes for open paths, and a separate fill
   for closed paths. Today it holds width, width presets and cap.
5. **Shape box:** defaults for fill, stroke, width and corner radius, star points and polygon sides, and a hint
   for the modifier keys (Shift keeps proportions, Alt draws from the centre). Today it holds only the presets.
6. **Text box:** a default text style for new text, default line height and wrap width, next to size, font,
   weight, alignment, spacing and colour.
7. **Gradient box:** an angle field and the stop editor reachable from the tool box, plus opacity.
8. **Reset everywhere:** every box gets a reset to its tool defaults; the Brush/Pencil box has one today and
   the other boxes list none.
9. **Presets and recents:** the shop's own saved presets per tool (save, rename, delete) and the last six
   colours and fonts.
10. **Phone:** a tool's options open as a bottom sheet with large sliders, one box at a time, never hiding the
    canvas, 44 px targets.
11. **Persistence (decision for the owner):** whether tool settings survive a reload.
- Acceptance: each item works with mouse, touch and keyboard; the values stay in range after typing; settings
  are never lost when another field changes (`updateToolOptions` merges per field); Web at 1440 × 900 and Phone
  at 390 × 844; the Tool Options tests grow with each box.

### E22 — Adjustments panel: complete, compact and beautiful  *(proposed, 2026-11-22; owner request)*

The owner wants the Adjustments panel to be more complete, tighter, and good to look at, and wants Flip in it
rather than in the Tools bar.

- **Facts checked in the source (`EditorAdjustmentsPanel.tsx`, 682 lines):**
  - The panel is 16 rem wide (`PANEL_WIDTH = "min(16rem, 86vw)"`) and is a one-open-at-a-time accordion.
  - Text is 9 px in 41 places and 10 px in 41 places; nothing is 12 px or larger. Myanmar script, which has tall
    stacked marks, is hard to read at those sizes.
  - Controls: 11 native colour inputs, 4 native selects, 4 range sliders and 5 number inputs, so colour, choice
    and number controls look and behave differently from each other and from the header's own dropdown.
  - **Appearance** holds only blend mode, opacity and fill.
  - There is **no numeric X, Y, width, height or rotation**, no align, no rotate and no reset; the only
    placement controls are the nudge pad in the Move tool options and the on-canvas handles.
  - Flip and Download sit in the Tools bar, not in the panel.
  - Text has bold, italic and underline toggles but no letter-case control.
  - The existing `aria-label` strings are what the tests find controls by.

**What the panel still needs**

1. **Arrange section** (every layer kind): X and Y, width and height shown in centimetres (the press unit,
   `unitsPerCm`) with the pixel size beside them, rotation in degrees, a lock-proportions toggle,
   align to the design area (E4, E6) or to the print canvas, rotate 90°, reset transform, and for a multi-selection
   distribute. **Flip horizontal and flip vertical are here** (owner decision, 2026-11-22), enabled whenever a
   layer is selected, with the same `flipSelectedLayers` behaviour.
2. **One colour control** for all eleven places: a swatch that opens a small popover with the shop's palette,
   the last six colours, a hex field and an eyedropper (E21). The shop palette comes from the admin like the
   header choices (E15).
3. **Text:** letter case (as typed, UPPER, lower, Capitalised), and the text controls already listed in E21;
   the hosted font's weights as a choice, not only a bold toggle.
4. **Photo:** a reset per group, a before/after toggle, a Basic view (exposure, contrast, saturation,
   temperature) and an Advanced view (the rest), crop, replace image, and a couple of one-tap looks with live
   previews. Background removal stays "not connected" until the image service exists (E10).
5. **Whole panel:** a reset on every section header, copy and paste of a layer's style, and remembering which
   sections the shop keeps open for each kind of layer.

**Design direction**

1. **Structure:** a sticky header with the selected layer's thumbnail, name and kind, then a row of icon tabs
   that depends on the kind (Arrange, Style, Effects, Photo, Layer). Several sections may be open at once.
2. **One control family:** a 32 px row with the label on the left and the control on the right; a slider always
   comes with a number field; two related values (X/Y, W/H) share a row; two to four choices are a segmented
   control; on/off choices are icon toggles with a tooltip; native selects are replaced by the same dropdown the
   header already uses.
3. **Type and space:** body text 12 px and captions 11 px at least, section titles 14 px, line height 1.5 so
   Myanmar marks are not clipped, a 4 / 8 px spacing scale, and the site's existing colour tokens, radius and
   focus ring, so the panel looks like the rest of the editor in dark and light.
4. **Width:** 18 to 20 rem on desktop, scrolling only inside the panel; labels may wrap in Myanmar instead of
   being cut.
5. **Feel:** previews inside presets (the text styles already paint live tiles; photo looks and shadows follow),
   clear hover, pressed and disabled states, short transitions that respect reduced-motion.
6. **Phone:** the panel opens as a bottom sheet with a drag handle and three heights, one section group at a
   time, 44 px targets, and it never covers the object being edited.

- **Order of work:** the owner reviews a visual mock-up (desktop and phone, dark and light, English and Myanmar)
  before any code. Then the shared controls (row, slider with number, colour field, dropdown, segmented) are
  built once and the sections move onto them one at a time. E21 reuses these controls, so E22 comes first or
  together with it.
- **Tools bar after the change:** Flip leaves it. **Flip moved 2026-11-22** (the owner had already decided it, so
  it did not wait for the mock-up): both buttons now sit at the top of the panel's Appearance section, keep their
  `Flip horizontal` / `Flip vertical` labels, and are disabled while the layer is locked. The rest of E22 still
  waits for the mock-up. Download also sits in the Tools bar today; whether Download moves to the header next to
  Save and Buy is the owner's call (decision D15).
- **Contracts:** the panel keeps the existing `aria-label` strings the tests rely on, keeps the Undo and Redo
  behaviour unchanged, and keeps the Layers and Adjustments boxes from overlapping.
- Acceptance: a selected layer of each kind shows its Arrange section; typing a width in centimetres resizes the
  layer and matches the on-canvas box; Flip works from the panel and the Tools bar no longer has it; every
  colour field in the panel is the same control; no text in the panel is smaller than 11 px; Myanmar labels do
  not clip; the panel reads well at 1440 × 900 and 390 × 844, in dark and light; the existing editor tests
  pass; a screenshot per layer kind is attached to the change.

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
| D10 | Zawgyi: **resolved 2026-11-22** — Unicode only, Zawgyi is not supported. Burmese fonts: **confirmed 2026-11-22** — a short list of open-licence Unicode fonts, each licence checked, files put in R2 by the shop (E17) | — |
| D11 | How is the text bend built? (E19) | **Resolved 2026-11-22 (owner delegated the choice):** outline warp — HarfBuzz shapes the text, the glyph outlines are bent and painted as one path everywhere; see E19 |
| D12 | Who supplies the starter brush tips? (E20) | **Resolved 2026-11-22:** the owner finds them and puts them in R2; each licence is checked |
| D13 | Until the database exists, where does the font list live? (E17) | **Resolved 2026-11-22, then refined the same day:** in R2. The Worker builds the JSON from the folders and each font's `meta.json` (`Plan/PLAN.md` §12.1); it is expected to move into the database later |
| D14 | How does the bend get a font file HarfBuzz can read? (E19) | Add an optional `outline` field per manifest style naming a `.ttf` or `.otf` next to the woff2; the loader still serves the woff2. The alternative, decoding woff2 in the browser, adds a decoder to the download |
| D15 | Does Download leave the Tools bar too and sit in the header next to Save and Buy? (E22) | Yes: the header already holds the actions that finish a design, and the Tools bar then holds tools only |

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
9. More text effects, more brushes and better tool adjustments are wanted (owner request, 2026-11-22). E18 to E21 are proposals; none is approved to start.
10. The font library (E17) is approved. The font files live in R2 and the shop puts them there (owner, 2026-11-22).
11. Burmese text is Unicode only; Zawgyi is not supported. The font list stays in `fonts/manifest.json` in R2 for now and is expected to move into the database later (owner, 2026-11-22).
12. The Burmese font approach is confirmed: a short list of open-licence Unicode fonts, licences checked, files put in R2 by the shop (owner, 2026-11-22).
13. The text bend is built as an outline warp (E19); the owner left the choice to the plan author. Whether D14 (a `.ttf`/`.otf` file beside each woff2) is accepted is still to be confirmed.
14. The brush tips are found and uploaded to R2 by the owner (E20, D12).
15. Flip does not belong in the Tools bar; it moves into the Adjustments panel — **done 2026-11-22**. The Adjustments panel should be more complete, tighter and good to look at (E22, owner request, 2026-11-22). E22 is a proposal; the owner reviews a visual mock-up first.
16. Files in R2 are read through a Worker that turns them into JSON, not by the browser directly (owner, 2026-11-22). The design is `Plan/PLAN.md` §12.1; E10, E17 and E20 use it.

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

Counted on 2026-11-22 from the files themselves (each file run on its own, passing), not from memory.

| Suite | Tests |
| --- | --- |
| **Editor** | **245** |
| `tests/browser-guards.test.cjs` | 1 |
| `tests/canvas-shell.test.cjs` | 30 |
| `tests/canvas-spec.test.cjs` | 2 |
| `tests/design-draft.test.cjs` | 10 |
| `tests/design-export.test.cjs` | 7 |
| `tests/editor-align.test.cjs` | 8 |
| `tests/editor-arrange.test.cjs` | 8 |
| `tests/editor-attributes.test.cjs` | 12 |
| `tests/editor-flip.test.cjs` | 7 |
| `tests/editor-font-audit.test.cjs` | 5 |
| `tests/editor-fonts.test.cjs` | 12 |
| `tests/editor-image-ppi.test.cjs` | 11 |
| `tests/editor-layers.test.cjs` | 49 |
| `tests/editor-path-boolean.test.cjs` | 10 |
| `tests/editor-pen-path.test.cjs` | 6 |
| `tests/editor-pinch.test.cjs` | 11 |
| `tests/editor-price.test.cjs` | 4 |
| `tests/editor-shortcuts.test.cjs` | 6 |
| `tests/editor-snap.test.cjs` | 8 |
| `tests/editor-tool-options.test.cjs` | 12 |
| `tests/editor-viewport.test.cjs` | 8 |
| `tests/photo-adjustments.test.cjs` | 18 |
| **Admin** | **165** |
| `tests/admin-ads.test.cjs` | 12 |
| `tests/admin-attributes.test.cjs` | 10 |
| `tests/admin-brushes.test.cjs` | 13 |
| `tests/admin-cascade.test.cjs` | 10 |
| `tests/admin-csv.test.cjs` | 9 |
| `tests/admin-demo-auth.test.cjs` | 4 |
| `tests/admin-demo-data.test.cjs` | 13 |
| `tests/admin-jersey.test.cjs` | 10 |
| `tests/admin-loyalty.test.cjs` | 10 |
| `tests/admin-modules.test.cjs` | 11 |
| `tests/admin-order-print.test.cjs` | 12 |
| `tests/admin-orders.test.cjs` | 7 |
| `tests/admin-posts.test.cjs` | 13 |
| `tests/admin-pricing.test.cjs` | 16 |
| `tests/admin-settlements.test.cjs` | 8 |
| `tests/admin-takedown.test.cjs` | 7 |
| **Storefront and shared** | **295** |
| `tests/account-orders.test.cjs` | 6 |
| `tests/asset-catalogue.test.cjs` | 15 |
| `tests/asset-rebuild.test.cjs` | 3 |
| `tests/asset-routes.test.cjs` | 14 |
| `tests/cart-lines.test.cjs` | 9 |
| `tests/check-font-manifest.test.cjs` | 5 |
| `tests/checkout.test.cjs` | 10 |
| `tests/client-error-log.test.cjs` | 15 |
| `tests/contact-messages.test.cjs` | 8 |
| `tests/delivery-quote.test.cjs` | 5 |
| `tests/guide-card.test.cjs` | 5 |
| `tests/guide-http.test.cjs` | 5 |
| `tests/guide-products.test.cjs` | 17 |
| `tests/guides.test.cjs` | 10 |
| `tests/loyalty-ledger.test.cjs` | 7 |
| `tests/nyein-brand.test.cjs` | 5 |
| `tests/order-archive.test.cjs` | 9 |
| `tests/order-barcode.test.cjs` | 9 |
| `tests/order-qr.test.cjs` | 5 |
| `tests/order-refunds.test.cjs` | 8 |
| `tests/payments.test.cjs` | 9 |
| `tests/print-quality.test.cjs` | 40 |
| `tests/product-mockup.test.cjs` | 14 |
| `tests/product-trust-row.test.cjs` | 4 |
| `tests/pwa.test.cjs` | 7 |
| `tests/rate-limit.test.cjs` | 9 |
| `tests/search.test.cjs` | 5 |
| `tests/size-chart.test.cjs` | 7 |
| `tests/stock-movement.test.cjs` | 7 |
| `tests/storefront-info.test.cjs` | 8 |
| `tests/structured-data.test.cjs` | 8 |
| `tests/wishlist.test.cjs` | 7 |
| **All suites** | **705** |

`tests/editor-touch.cjs` is the browser suite (19 sections, run against a live server): the draft
reload, 25 layers, the 30-step undo floor, a second finger mid-stroke, a rotation, a long Burmese word
wrapping between grapheme clusters, an upload that cannot be decoded, the hover highlight in both
directions, the caret above a shrinking (keyboard-sized) viewport, the 320 × 480 tools bar, and a
console guard that fails the run on any uncaught exception or `console.error`.

`tests/storefront-e2e.cjs` drives the purchase path over CDP at 1440 × 900 and 390 × 844 touch.

The last full run (`node --test tests/*.test.cjs`) reported **705 passing, 0 failing**, against a server
on port 3000 (`guide-http` needs it; it fails with ECONNREFUSED otherwise), and both browser suites
passed on the same build.


### Checks run 2026-11-22 (shop side, admin, routing)

| Check | Result |
|---|---|
| Unknown slug on `/products`, `/guide`, `/collections`, `/admin/orders` | 404, no stack trace |
| Reflected input: `/search?q=<script>`, `/guide?q=<img onerror>`, `/products?design=javascript:` | rendered escaped, no payload in the HTML |
| Demo admin: register → `/admin` ("Good morning, Owner") → `/admin/pricing` | 24 combination rows, prices shown in Ks, no console error |
| Admin pages without a session | redirect to `/admin/login`, so the guard holds |
| Layer rename to `""` or whitespace | keeps the old name (`updateEditorLayer` trims and falls back) |
| Upload a renamed non-image (`.heic`, `.png` with text inside) | no crash; the notice now names the file and suggests JPG/PNG/WebP (it used to show only Chrome's "The source image could not be decoded.") |
| Upload a real 8×8 PNG | image layer added, "Upload reduced to 762 B and added to the canvas." |
| Checkout with a seeded cart (no Supabase needed) | line + total 42,000 Ks, order `#MH1101` written with a `checkoutKey`, stage Pending Payment, cart emptied, no console error |
| Checkout submit on an empty form | used to report only the terms; now lists name, phone, address, township, city and terms together |
| Pen / shape / eraser with a single click (no drag) | no junk layer, no console error |
| Press sheet from `/admin/orders` at 390x844 | opens its own tab (real click keeps the popup), 390/390 scroll, print button present |
| Admin settings save → reload | used to show the seed values again and the next Save reverted the stored ones; now the saved name/rate survive a reload and a second save, and Reset demo data still restores the seed |
| Every admin route at 1440x900 and 390x844 | 24 loads, no console error, no sideways scroll, a heading on each |
| Admin orders at 390x844 (touch) | 390/390 scroll; a tap on "Advance #MH1086 to Printing" moves the order Processing → Printing; the drawer opens with the print button and the note field; printing records a `reprints` entry so the button reads "Reprint the press sheet" |
| Delivery fee on checkout | by design the fee is quoted later; "Total today" is the subtotal and the panel says so |

The shop catalogue and the checkout cannot be exercised in this workspace: products come from
Supabase and `NEXT_PUBLIC_SUPABASE_URL` is unset, so every product list is empty and there is nothing
to add to a cart. Those flows need the database (E15) before they can be tested end to end.
