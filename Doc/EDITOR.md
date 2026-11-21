# MH Fashion Editor — how it behaves

Documentation for the editor at `/create`, as built on 2026-11-21 (commit `571d60b`). The plan and
roadmap live in `Plan/EDITOR_PLAN.md`; the Kittl comparison lives in
`Doc/KITTL_CANVAS_EDITOR_AUDIT.md`. This file describes what the code does, so a maintainer can change
it without breaking the contracts in §9.

## 1. Shape of the thing

```
app/create/page.tsx          shared site Header + EditorHeaderBar2 + KittlCanvas
  components/KittlCanvas.tsx everything interactive: tools, selection, layers,
                             mockups, undo, the inline text editor
  components/EditorLayersPanel.tsx     Photoshop-style Layers box
  components/EditorAdjustmentsPanel.tsx the per-layer Adjustment box
  components/EditorToolsBar.tsx        tool rail (desktop) / bottom bar (phone)
  components/EditorEditSidebar.tsx     Designs, Elements, Text, Upload, Image Create
  components/EditorArtworkLayers.tsx   paints layers as SVG
  components/EditorLayerPreview.tsx    paints layer thumbnails
  components/MockupArtwork.tsx         mirrors the artwork onto a mockup
  lib/editor-layers.ts         the layer model, text metrics, shapes, gradients
  lib/editor-pen-path.ts       pen anchors and path data
  lib/editor-transform.ts      resize and rotation maths
```

All editor state is React state inside `KittlCanvas`. Nothing is saved: no `localStorage`, no
`sessionStorage`, no Supabase write. Reloading `/create` starts a blank 4500 × 5400 px canvas.

## 2. Canvas

- Print canvas: 4500 × 5400 px at 300 dpi, transparent (`lib/editor-canvas-spec.ts`).
- Artwork coordinates are canvas pixels. The order record stores `unitsPerCm` so the press can convert a
  layer to centimetres; keep the two in step.
- The pasteboard around the canvas is where a layer can be parked off-print. Drawing tools clamp to the
  canvas; move, resize and rotate do not (`toCanvasPointUnclamped`), and `CANVAS_LAYER_TRAVEL_LIMIT`
  (2400 units) stops a layer being dragged out of reach.

## 3. Layers

`EditorArtworkLayer` holds `id`, `name`, `kind` (`artwork` | `text` | `shape` | `image` | `gradient`),
`visible`, `locked`, `opacity`, `fillOpacity`, `blendMode`, `groupId`, `linkId`, `strokes`, `erasures`,
`mask`, and the per-kind content object.

- **Groups** behave like folders: a header row with nested children, children still individually
  selectable, transforms on the folder apply to the whole group.
- **Links** are explicit transform membership, separate from groups: linked layers move and resize
  together.
- **Masks** are non-destructive. `mask` holds brush strokes; black hides, white reveals; the artwork
  underneath is never changed, so a mask can be edited or removed later. Selecting the mask thumbnail
  makes the brush paint the mask with the editor's foreground/background colour.
- **Erasures** are a second, subtractive channel over `strokes`; they are painted as an SVG mask in both
  the canvas and the thumbnail.
- Layer edits are pure functions in `lib/editor-layers.ts` (`reorderEditorLayer`,
  `moveEditorLayerToIndex`, `groupEditorLayers`, `linkEditorLayers`, `duplicateEditorLayer`,
  `deleteEditorLayer`, …). Keep them pure: the undo stack stores whole layer arrays.

## 4. Selection and transform

- The selection box is computed from the selected content: the union of a group's children, the ink box
  of a text layer (plus effects and decorations), the geometry of a shape, the box of an image.
- Eight resize handles plus a rotate handle. Handle hit radius is `min(15, max(5, shortestSide * 0.3))`
  px and the rotate handle sits `max(58, (handleR + rotateR + 10) / unitScale)` below the box, so a small
  text box can still be moved and the rotate handle never overlaps the bottom-centre handle.
- A press picks the layer under the pointer (`hitTestLayerAt`). The selection box is a solid rect, so it
  re-picks a different layer when pressed instead of swallowing the press.
- Rotation snaps to 15° when snapping is on.

## 5. Text

- `EditorTextContent` is per layer: string, font, size, weight, italic, underline, alignment,
  letter-spacing, line-height, colour, `wrapWidth`, effects, decoration, `textTransform`.
- Painted lines come from `editorTextLines`: split on `\n`, then soft-wrap to `wrapWidth`. Never rebuild
  lines from `value.split("\n")`; that is how a long line used to run off the canvas.
- `editorTextLineMetrics` measures the layout box and the ink box separately, and
  `editorTextMetrics` unions each line's ink around its own origin. The transform box uses the ink, which
  is why an italic or a trailing letter-space no longer gets clipped.
- Effects (`shadow`, `outline`, `glow`, `offset`, `echo`, `extrude`, `stripe`) paint one extra copy of
  the text each, in list order; `editorTextPaintPadding` grows the bounds by the same amount so the box
  still hugs what is painted.
- Decorations (horizontal line, colour cut, oblique) come from `editorTextDecoration` in absolute layer
  units; renderer and padding both read it.
- `textTransform` supports `arch` and `wave`. `circle` is selectable but paints nothing yet.
- Typing happens in a `foreignObject` textarea whose height is `wrapped lines × line height + 4`. It is
  positioned on the drawn baseline, so the caret sits where the glyphs are. Committing returns the tool
  to Move; re-entering a layer puts the caret at the end.
- While typing, `keepTextCaretVisible` pans the workspace by the caret's line, coalesced per frame.

## 6. Tools

Move, Hand, Pencil, Pen, Text, Brush, Eraser, Shape, Gradient (default `pen`). Tool settings live in
`EditorToolOptions` and are normalised on load.

- **Pen** anchors carry Bézier handles; dragging an anchor moves it, dragging a handle reshapes the
  curve, Alt breaks handle symmetry, and a node can be inserted on a path.
- **Shape** presets: rectangle, rounded-rectangle, ellipse, triangle, diamond, line, arrow, star, hexagon,
  with stroke/fill, line style, shadow and glow. Shape Builder supports merge/subtract/intersect, but only
  on the first two axis-aligned rectangles.
- **Gradient** supports linear, radial, angle, reflected and diamond with up to 8 stops; the conic and
  diamond cases are computed as explicit facets so SVG and thumbnails match.
- **Upload** compresses an image to ≤2 MB and ≤2000 px on the long edge before it becomes a layer.

## 7. Mockups

Front and Back are independent boxes with their own overlay transforms; the artwork on each is a mirror
of the canvas clipped to the print area. The large artwork tier (3500 px) is shared and transferable:
either side may claim it by growing past 1500 px, the other is then capped at 1500 px, and returning to
1500 px or removing the mockup releases it.

## 8. Phone

Touch targets are ~44 px. With `Pan view` on, one finger pans the view and `+`/`−`/`Reset view` change
zoom only. With pan off, drawing, node dragging, mockup moving and corner resizing work. The layout
leaves room for the bottom navigation and closes the side panels before they overlap. This is verified
with Chromium touch emulation, not on a physical device.

## 9. Contracts

Breaking one of these has caused a real bug before:

1. Text box hugs the ink, plus effects and decorations — never the font line box.
2. Pure text layers get no grab margin; strokes, shapes and images get 18 units.
3. `editorTextLines` is the only source of painted lines.
4. The inline editor's height follows the wrapped line count.
5. Handle hit radius scales with the box; the rotate handle stays clear of the resize handles.
6. Move/resize/rotate use the unclamped point; drawing tools stay on the canvas.
7. A press on the selection re-picks a different layer underneath before dragging.
8. Mockup artwork is clipped to the print area.
9. Print geometry (canvas size, `unitsPerCm`, layer records) is a contract with the press.
10. Header language and currency pills always show the active option.

## 10. Tests

```
node --test tests/*.test.cjs            # unit suites, including the editor helpers
npm run start --workspace=apps/web -- --port 3000
EDITOR_TEST_ORIGIN=http://127.0.0.1:3000 node tests/editor-touch.cjs   # CDP interaction
```

`tests/editor-layers.test.cjs` covers the layer model, masks, shapes and pen nodes;
`tests/canvas-shell.test.cjs` the shell and panels; `tests/photo-adjustments.test.cjs` the image maths;
`tests/editor-pen-path.test.cjs` the path geometry; `tests/editor-price.test.cjs` the price table;
`tests/canvas-spec.test.cjs` the frozen canvas spec.

Known pre-existing failure: the phone **Edit sidebar** section of `tests/editor-touch.cjs` throws on a
`null` `getBoundingClientRect`. It is unrelated to the editor logic; assertions earlier in the file still
run.
