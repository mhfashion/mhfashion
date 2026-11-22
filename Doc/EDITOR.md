# MH Fashion Editor — how it works

This document describes the editor at `/create` exactly as the code behaves today. It is written from
the source, not from earlier plans: every section names the file that implements it. What the editor
does not do is listed in `Plan/EDITOR_PLAN.md` §4, not here.

## 1. Layout

`app/create/page.tsx` renders three stacked parts inside one screen-height column:

1. the site `Header`,
2. `EditorHeaderBar2` — product, print method, fabric, knit, MH cuttings, GSM, colour, size, save, buy and
   the live price. Every list it offers comes from `lib/editor-attributes.ts`, the same lists the admin price
   book is built from,
3. `EditorCanvas` (the file name in the code) — everything else: the canvas, the mockups, the tool bar,
   the Edit sidebar, the Layers box and the Adjustment box.

The canvas area does not scroll; panels open over it. On a phone the bottom navigation keeps its real
height, so the editor never sits under it.

## 2. Canvas and workspace

- The print canvas is 4500 × 5400 px at 300 dpi, transparent, and starts blank (`lib/editor-canvas-spec.ts`).
  It never holds placeholder artwork.
- Around it is a pasteboard (`aria-label="Artwork pasteboard"`) where a layer can be parked outside the
  print area. A layer can travel up to 2400 units from the canvas (`CANVAS_LAYER_TRAVEL_LIMIT`).
- Drawing tools stay on the canvas; moving, resizing and rotating a layer do not, so a layer can be
  dragged partly or fully outside and still be grabbed.
- `Ctrl`/`Cmd` + wheel zooms between 0.25× and 3×; a plain wheel pans. `+`, `−` and `Reset view` do the
  same from the buttons in the workspace corner.
- Holding Space and dragging pans, whichever tool is active.
- A grid can be shown over the canvas from the canvas options menu (the small circle on the canvas edge).

## 3. Tools

`components/EditorToolsBar.tsx` shows nine tools, in this order:

| Tool | What it does |
|---|---|
| Move | selects a layer or group and drags it; arrow keys nudge the selection |
| Hand | drags the view |
| Pencil | freehand line drawing at the pen width |
| Pen | click to place anchors, drag to pull a Bézier handle, Enter finishes, Escape discards |
| Text | click to place a text box and type in it; new layers take the Text tool defaults |
| Brush | freehand painting with the brush settings |
| Eraser | erases with the brush nib, or deletes a whole stroke in stroke mode |
| Shape | drags out a shape from the selected preset |
| Gradient | drags out the gradient axis |

The bar also carries the foreground and background colour swatches with a swap button, the shape
presets, and Undo / Redo. It collapses to a small bar, and on a phone it becomes a compact bar at the
bottom centre with ~44 px targets.

Tool settings are kept in `EditorToolOptions` and normalised on load, so a partial or stale settings
object cannot break a tool. Each tool has its own box at the top of the Adjustments panel
(`Tool Options · <tool>`):

| Tool | Box contents |
|---|---|
| Brush / Pencil | preset chips that paint their own nib, a live stroke preview, nib (tip, size, angle, roundness), paint (opacity, flow, spacing, smoothing), edge (softness, feather), shape dynamics (size/opacity/angle/roundness jitter, jitter floor, scatter, fade-out), dab blend, reset to default |
| Eraser | nib presets (Soft, Hard, Block, Fine) drawn as dabs, mode, nib, size, hardness, opacity, flow, spacing, angle, roundness, clear erasures |
| Pen | path width, width presets (1, 3, 6, 12, 24), cap |
| Text | defaults for a new text layer: size, font, weight, alignment, letter spacing, colour (or follow the toolbar) |
| Shape | the nine shape presets, each drawn with the path builder the canvas uses |
| Move | arrow pad with 1 / 10 / 50 unit steps, plus the layer's current offset |
| Gradient | shape, preset, reverse the ramp |
| Hand, Remove BG | a short hint only |

Boxes write one field at a time; `updateToolOptions` merges each tool group into the stored settings
instead of replacing it, so changing the font weight cannot reset the size that was just picked.

## 4. Layers

A layer (`EditorArtworkLayer`, `lib/editor-layers.ts`) has an id, a name, a kind, visibility, lock,
opacity, fill opacity, blend mode, a group id, a link id, and the content for its kind:

| Kind | Content |
|---|---|
| `artwork` | freehand strokes plus eraser passes |
| `text` | the text content object |
| `shape` | one or more SVG paths with a style |
| `image` | the image source and its adjustment values |
| `gradient` | gradient type, stops and axis |

The Layers box (`components/EditorLayersPanel.tsx`) is the list of layers:

- Rows can be dragged to any position in the stack.
- A group is a folder row with its children underneath; a child can still be selected and edited on its
  own, and moving the folder moves the group.
- Each row has visibility, lock, mask, name (renamed in place) and an options menu.
- The header has Opacity and Fill number inputs, a blend mode control (normal, multiply, screen,
  overlay), Group / Ungroup, Link / Unlink, and mask add/toggle.
- Selecting a mask thumbnail switches the brush to paint that mask instead of artwork.
- Thumbnails show the layer as painted, including erasures, masks, text effects and gradient fills.

Linked layers move and resize together; links are separate from groups.

Masks are non-destructive: a mask stores its own strokes, black hides and white reveals, and the artwork
underneath is never changed, so a mask can be edited or removed later.

Erasures are a second, subtractive channel on artwork layers; they are painted as a mask in the canvas
and in the thumbnail, and a button clears them.

## 5. Selection and transform

- Placement is done on the canvas, the way Kittl does it: drag to move, the eight handles to resize, the
  round handle to rotate. The Adjustments panel has no Arrange box.
- Duplicate, flip, rotate and reset live on the canvas toolbar and in the Edit sidebar, so the panel does
  not repeat them.

- The selection box is computed from the content: the union of a group's children, the painted text plus
  its effects and decorations, a shape's paths, or an image's box.
- Eight square handles resize; a round handle below the box rotates. Handle hit areas scale with the box
  (`min(15, max(5, shortestSide * 0.3))` px) and the rotate handle sits far enough below to never overlap
  the bottom-centre handle.
- Pressing a layer selects and drags it. Pressing the selection box drags the current selection, unless
  another layer sits under the pointer, in which case that layer is picked.
- With the Move tool, arrow keys nudge the selection by 1 unit, or 10 with Shift.
- Rotation snaps to 15° while snapping is on.

## 6. Text

Text is added with the Text tool, with `Add Text` in the Edit sidebar, or by adding a text layer from a
design; each one creates a text layer and opens the inline editor.

- Typing happens in a text box drawn over the canvas, aligned to the drawn baseline. It grows with every
  wrapped line instead of scrolling the caret out of view.
- While typing, the workspace pans so the caret line stays visible.
- Enter adds a line, Escape stops editing. Choosing another tool also ends editing, and re-entering a
  text layer puts the caret at the end of the text.
- Text wraps to the layer's `wrapWidth` (880 units for new text). Text saved before wrapping existed has
  no width and stays unwrapped.
- **Text styles** apply a look in one click, on three shelves:
  - *Classic*: Neon, Aurora, Sunset, Halo, Sticker, Retro, Chrome, Outline, Shadow, Echo, Striped,
    Long shadow, Comic, Isometric, Varsity, Poster.
  - *Fill*: Hollow, Dots, Checker, Grid.
  - *3D materials*: Chrome 3D, Gold, Ice, Lava, Balloon, Jelly, Wood, Marble, LED, Comic 3D, Isometric. Every tile paints the preset's
  real effect stack on a sample "Aa", through the same renderer the canvas uses, so the tile is the result.
  A preset only writes an effect stack, so every part of it can still be tuned, reordered or removed; the
  tile stays highlighted only while the stack still matches it.
- Colour fields for text, shape fill, shape stroke, decoration and the photo border carry a row of brand
  swatches beside the colour wheel.
- The Adjustment box styles the whole layer: font family (with search and recent fonts), size, colour,
  weight, italic, underline, alignment, letter-spacing and line height.
- Effects are a stack, and the box lists them as pictures: each tile paints a sample "Aa" with that one
  effect, and each row of the stack shows its own thumbnail. The kinds are shadow, outline, glow, offset,
  echo, extrude, stripe, blur, gradient, pattern, hollow, bevel and gloss. Each can be added, enabled or
  disabled, moved up or down, removed, and given its own colour, offset, blur or width.
  A gradient fill takes two colours and paints over the glyphs; a pattern fills them with dots, a grid or a
  checker; a blur paints a soft copy behind them; a hollow turns the glyphs into an outline; a bevel lights
  one edge and shades the other, which is what raises a face off its side; a gloss clips a light ramp to the
  upper half of the glyphs, the way a foil balloon catches light.
- An extrusion takes a **far colour** as well as its near one, so the side runs dark to light and reads as
  depth instead of a flat slab.
- **Transform** (warp) tiles paint Plain, Arch and Wave through the same renderer, so the bend on the tile is
  the bend on the canvas.
- Decorations: a horizontal line, a colour cut or an oblique cut, each with its own colour and width.
- Transform presets: plain, arch and wave are painted; circle is offered but paints nothing (see
  `Plan/EDITOR_PLAN.md` §4).
- The transform box follows the painted glyphs plus effects and decorations, so it never cuts through the
  artwork.

## 7. Shapes

Nine presets: rectangle, rounded rectangle, ellipse, triangle, diamond, line, arrow, star, hexagon.

- Style: stroke colour and width, fill on/off and colour, line style (solid, dash, dot), corner rounding,
  drop shadow and glow.
- Shape Builder: merge, subtract, intersect and exclude. It works on any closed path on the layer —
  presets, rotated shapes and pen paths — because the geometry (`lib/editor-path-boolean.ts`) flattens
  every path into rings, splits it where the sides cross, keeps the pieces each operation wants and chains
  them back into rings. The first path is the base, so subtract cuts the rest out of it; the result is one
  path, and the transform box follows it. Curves are sampled at 0.25 artwork units (about one print
  pixel), and a result that would be empty leaves the artwork untouched.
- New shapes are added as paths on one shape layer rather than a new layer per shape.

## 8. Pen

- Click places a corner anchor, click-drag pulls a Bézier handle, and clicking near the first anchor
  closes the path.
- Enter finishes an open path; Escape discards the path being drawn.
- Once the path exists, anchors and handles can be dragged (Alt breaks handle symmetry), a node can be
  inserted on the path, and a node can be removed.
- Pen width and cap (round, butt, square) come from the tool options.

## 9. Brush and eraser

- Brush: size, hardness, flow, spacing, shape (round, square) and blend (normal, multiply, screen), with
  presets in the tool options, and a reset that restores the tool defaults. Each preset chip paints a row of
  nib dabs at its own size, tip, roundness, softness, scatter and opacity, and a live strip under the presets
  shows the current settings.
- Eraser: brush mode erases with the nib, stroke mode removes a whole stroke; both are stored as erasure
  passes on the layer, so they can be cleared. Nib presets (Soft, Hard, Block, Fine) set size, hardness,
  opacity, flow and spacing in one press, and each chip shows its nib as a row of dabs.
- Strokes are smoothed as they are drawn and stored as points on the layer.

## 10. Gradients

- Types: linear, radial, angle, reflected, diamond.
- Up to 8 stops, each with colour and opacity, plus presets.
- The gradient axis is drawn on the canvas and can be re-dragged; the Adjustment box also exposes the
  start and end coordinates.
- The gradient is stored on a gradient layer and previewed in its Layers thumbnail.
- "Reverse the ramp" in the tool options flips the preset before it is laid down, so the last colour
  starts the axis.

## 11. Images

- Upload from the Edit sidebar or with the upload control. An upload is compressed in the browser to at
  most 2 MB and 2000 px on its long edge before it becomes a layer.
- The Adjustment box offers photo adjustments in nine groups: basic tone, curves, colour mixer, colour
  grading, levels, selective colour, channel mixers, detail and effects. Auto and reset buttons are
  provided per group.
- Values are stored on the layer as instructions, so the photo itself is never overwritten.
- An image layer can carry a mask like any other layer.
- **Frame** rounds the corners and draws a border. Both are painted inside the image box (the border is
  inset by half its own width), so the transform outline still hugs the photo.
- **Print quality** is the effective ppi of the photo on the print canvas: 300 dpi × the photo's own
  pixels ÷ the print pixels its box covers (one artwork unit is 4.5 print px), taking the lower axis, so a
  photo stretched on one side only is limited by that side. Rotation and masks do not change it.
- The number shows as a badge on the image row in the Layers box (tap it on a phone to open the Adjustment
  box) and as a line at the top of the Adjustment box. The steps are good at 150 ppi and above, low from
  100 to 149, and very low below 100; those thresholds are placeholders from the print desk.
- Shrinking a photo past a step makes the tool bar say it once ("print quality dropped to N ppi"). It
  never blocks Save or Buy, and a layer stored without its pixel size shows no number at all.

## 12. Mockups

- Front and Back mockups are separate boxes on the pasteboard, each connected to the canvas by a wire.
  They are added from the canvas options menu; the Back mockup is not offered for the Phone product.
- Each mockup shows the artwork mirrored from the canvas and clipped to the print area, so a layer
  dragged off the canvas disappears from the mockup exactly as it would print.
- Each mockup's artwork overlay can be moved and resized independently, and shows its pixel size while
  selected.
- The large artwork tier (3500 px) is shared: either mockup can claim it by growing past 1500 px, the
  other is then capped at 1500 px, and returning to 1500 px or removing the mockup releases it.

## 13. Header bar

`components/EditorHeaderBar2.tsx` holds the order-facing controls:

- Product: T-Shirt and Phone selectable; Hoodie, Cup, Kids and Bag are shown but disabled.
- GSM: 160, 180, 200 and 240.
- Colour and size: selectable, with the colour swatch shown in the trigger.
- The price updates as soon as an option changes.
- Save and Buy are present but disabled: the editor has no save or order hand-off yet.

## 14. Edit sidebar

`components/EditorEditSidebar.tsx` starts as a narrow icon rail and opens a panel for the selected
section:

| Section | Contents |
|---|---|
| Designs | MH Fashion designs, each added to the canvas as layers |
| Elements | the individual layers of those designs as thumbnail cards, plus a search field |
| Text | `Add Text` and the text layers that exist in the designs |
| Upload | upload an image to the canvas, and the images already uploaded |
| Image Create | a prompt field for generated images |

The rail stays visible while a panel is open, and choosing another rail item swaps the panel content.
Anything added here also appears in the Layers box.

The design library is a local placeholder until the storage endpoint exists
(`DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"` in `lib/editor-design-library.ts`).

## 15. Undo, state and the draft

- Undo and Redo keep the last 30 layer-array snapshots and cover layer changes: add, delete, move,
  resize, style, reorder, group and mask.
- Viewport zoom, pan and mockup positions are not in the history.
- The layer array and each layer's move/scale/rotate are written to the browser's `localStorage` under
  `mh-fashion-design-draft-v1`, 400 ms after the last change (`lib/design-draft.ts`, called from
  `EditorCanvas`).
- Opening `/create` reads that draft back and restores the artwork where it was left, then says
  "Restored the design from your last visit". The restore runs after mount, so the server-rendered blank
  canvas and the first client render still match.
- A draft with no artwork (only blank layers) is ignored, so a fresh visit still starts on one blank
  layer. A browser that refuses storage shows "This browser is not saving your design. Keep this tab open
  until you order." once, instead of failing silently.
- The restore half of the draft is done; Save and Buy still do not write anything outside the browser.
- A product page whose product allows a custom design renders that stored draft as its mockup and offers
  an `Edit Design` link to `/create?product=<slug>`. The editor ignores the `?product=` value and always
  opens on the default product.
- Nothing is stored in the database from this route, `clearDesignDraft` is exported but never called,
  and Save and Buy are disabled.

## 16. Phone

- Touch targets are about 44 px and stay that size at any zoom.
- `Pan view` mode: one finger pans the whole view; `+`, `−` and `Reset view` change the view only.
- With pan off, drawing, dragging nodes, moving mockups, moving the artwork and corner resizing all work.
- A second finger cannot take over a gesture the first finger started.
- The Edit sidebar and the Layers box close before they can overlap at phone width.
- Verified with browser touch emulation at 390×844 and in landscape; not yet checked on a physical phone.

## 17. Keyboard and pointer

| Input | Result |
|---|---|
| Space + drag | pan the view |
| Middle-button drag | pan the view |
| Ctrl/Cmd + wheel | zoom |
| Wheel | pan |
| Arrow keys (Move tool) | nudge the selection 1 unit; 10 with Shift |
| Enter (Pen) | finish the open path |
| Escape (Pen) | discard the path being drawn |
| Enter (text) | new line |
| Escape (text) | stop editing |
| Escape (menus) | close the menu |
| Ctrl+Z / Cmd+Z | undo a layer change |
| Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y | redo a layer change |

- Undo and Redo are the tool-bar actions, with the same 30-snapshot layer history. `Cmd+Y` is left to
  the browser, and Alt combinations are ignored because AltGr types characters.
- A focused text field keeps the browser's own undo: while the caret is in an input, a textarea, a
  select, a contenteditable element or a `role="textbox"` element (the inline text editor, the layer
  rename field, number fields) the shortcut does nothing, so typing is never rolled back by the layer
  history.
- On a keyboard layout that does not produce a Latin letter (a Myanmar layout, for example) the physical
  key is used, so the shortcut still works. On a layout that moves the letters (AZERTY) the letter printed
  on the key wins.
- The shortcut works whether the tool bar is expanded or collapsed and while the Layers or Adjustment box
  is open. A phone has no keyboard, so the buttons stay the way to undo.

## 18. Tests

```
node --test tests/*.test.cjs
npm run start --workspace=apps/web -- --port 3000
EDITOR_TEST_ORIGIN=http://127.0.0.1:3000 node tests/editor-touch.cjs
```

| Suite | Covers |
|---|---|
| `tests/editor-layers.test.cjs` | layer defaults, brush metadata, eraser masks, layer masks, live strokes, properties, duplicate, text/element/upload layers, shape paths and style, rounded corners, pen nodes |
| `tests/canvas-shell.test.cjs` | canvas shell, tool bar, layers dock, header bar |
| `tests/photo-adjustments.test.cjs` | image adjustment values and clamps |
| `tests/editor-attributes.test.cjs` | print method, fabric, knit and cuttings option sets |
| `tests/editor-pen-path.test.cjs` | path data, snapping, anchor insert and remove |
| `tests/editor-price.test.cjs` | product, GSM and size price table |
| `tests/editor-shortcuts.test.cjs` | the undo/redo key matrix, the text-field rule, non-Latin layouts |
| `tests/editor-image-ppi.test.cjs` | the print ppi formula, its levels, and the layers it cannot measure |
| `tests/editor-path-boolean.test.cjs` | the four builder operations on rectangles, curves, rotated shapes and pen paths |
| `tests/canvas-spec.test.cjs` | the frozen canvas spec |
| `tests/editor-touch.cjs` | phone and desktop interaction driven through the browser: tiny artwork, landscape, dark/light, dock arrows, tier resize, drawing |

Known pre-existing failure: the phone **Edit sidebar** section of `tests/editor-touch.cjs` throws on a
`null` `getBoundingClientRect`. It is unrelated to the editor logic, and the assertions before it still
run.
