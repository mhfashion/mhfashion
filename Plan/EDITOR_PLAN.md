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
| Product / GSM / colour / size bar with price | `components/EditorHeaderBar2.tsx` | 397 |
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
| Header Bar 2 | product, GSM, colour, size, live price; Save and Buy disabled |
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

## 5. Plan — next steps

Ordered by what the shop needs first. Each item is a separate decision: the editor is final as built, so
the owner approves an item before it starts.

| # | Item | Why | Files | Size |
|---|---|---|---|---|
| E1 | Save the design, then hand it to the order | Save and Buy are dead buttons, the browser draft is never restored, and no order carries the artwork | `EditorHeaderBar2`, `EditorCanvas`, `lib/design-draft.ts`, the order payload | large |
| E2 | Real-phone QA, and fix the `editor-touch.cjs` Edit-sidebar crash | phone is the shop-floor tool; the known test failure hides regressions | `tests/editor-touch.cjs` | small |
| E3 | Settle the `circle` preset | a control that does nothing reads as a bug | `lib/editor-layers.ts`, `EditorAdjustmentsPanel` | small |
| E4 | Align to the print canvas, tidy spacing | layers are placed by eye; alignment is the most-requested layout help | new `lib/editor-align.ts`, panel controls | medium |
| E5 | Flip horizontal and vertical | mirrored artwork is a normal request for a print shop | layer fields, renderer, mockup, print | medium |
| E6 | Snap guides while dragging | free placement drifts off the print area | `EditorCanvas` drag paths | medium |
| E7 | Hover highlight between canvas and Layers | finding the row for a shape on a busy canvas is slow | `EditorCanvas`, `EditorLayersPanel` | small |
| E8 | Shape Builder for `exclude` and arbitrary paths | the builder only merges rectangles today | `applyEditorShapeBuilderOperation` | medium |
| E9 | Enable the remaining products | Hoodie, Cup, Kids and Bag are visible but dead | `EditorHeaderBar2`, mockups, `editor-price` | medium |
| E10 | Connect the sidebar library and image generation | Designs, Elements and Image Create are placeholders | `editor-design-library`, R2 endpoint, image service | large |
| E11 | Per-character styling, glyphs, artboards | only if the catalogue needs them | text model migration, renderers, export | large |

### E1 — Save and order hand-off

- Restore the draft the editor already writes, so a reload continues the same artwork, then make Save
  write the design (layers, canvas, product, GSM, colour, size, price) somewhere it survives a browser
  change; Buy turns the same payload into an order line.
- Acceptance: reload keeps the artwork; a placed order shows the design in the admin order view with the
  print sheet and mockups; a browser with storage disabled shows a clear message instead of losing work.
- Blocked on the decision in §6 D1 (where the design lives) and on the payment/order work.

### E2 — Phone QA

- Fix the `null` `getBoundingClientRect` in the Edit-sidebar section so the suite runs to the end, then
  run the flow on at least one physical Android and one iPhone.
- Acceptance: `tests/editor-touch.cjs` passes end to end, and a written note records the devices, OS
  versions and what was checked.

### E3 — `circle` preset

- Either paint a circular baseline (and grow the bounds to match) or remove `circle` from the control.
- Acceptance: every preset the panel offers paints, and the ink stays inside the transform box (frame
  differencing, ≤1.1 px).

### E4 — Align and tidy

- Align the selection to the print canvas (left, centre, right, top, middle, bottom) and tidy the spacing
  of three or more layers.
- Constraint: moves layer origins, never scales, treats a linked set as one unit.
- Acceptance: unit tests on the helper against `PRINT_CANVAS_SPEC`; a canvas test that the artwork lands
  inside the print area.

### E5 — Flip

- Horizontal and vertical flip on the selection, mirrored in the mockup and the print export.
- Acceptance: the printed PNG is the mirror of the unflipped one and the transform box still hugs the
  ink (a flipped italic moves its ink).

### E6 — Snap guides

- While dragging, snap to the canvas edges and centre, and to other layers' edges and centres, with a
  visible guide line; a modifier key suspends snapping.
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

## 6. Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Where does a saved design live — browser storage, the database, or only the order? | Database, keyed to the customer, with the order carrying a snapshot; browser-only storage loses work on a device change |
| D2 | Do Save and Buy ship before payments are finished? | Ship Save first (it is useful alone); Buy waits for the payment flow |
| D3 | Fix `circle` or remove it? | Remove it now, add it back with a real transform later |
| D4 | Which product comes after T-Shirt and Phone? | Hoodie — it is the closest print geometry to the T-shirt |
| D5 | Alignment and snapping, or keep free placement? | Both: snapping while dragging, alignment as an explicit action |
| D6 | Per-character text styling? | Not now; per-layer styling covers the catalogue, and the change touches every renderer, the print sheet and saved designs |

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
