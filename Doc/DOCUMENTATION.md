# MH Fashion — Project Documentation

**Canonical documentation file:** `Doc/DOCUMENTATION.md`
**Planning file:** [`Plan/PLAN.md`](../Plan/PLAN.md)
**Editor plan and documentation:** [Part II of the plan](../Plan/PLAN.md#part-ii--editor-plan) and [`Doc/EDITOR.md`](EDITOR.md)

This file consolidates the website work log, code audit, Guide content maintenance instructions, and Admin Dashboard visual-reference notes that previously lived in separate `Doc/` and `docs/` files. The plan remains a separate, canonical file in `Plan/`.

## Contents

- [Website Work Log](#work-log)
- [Repository Code Audit](#code-audit)
- [Guide Content Operations](#guide-content-operations)
- [Admin Dashboard Visual Reference](#admin-dashboard-reference)

<a id="work-log"></a>
## Website Work Log

### 2026-11-21 — Guide posts show photos, share one banner, and the article uses the full width

- **Photos in posts.** `GuideSection` gained `images?: GuideImage[]` (`{ url, caption }`), parsed from
  the post's `sections` JSON, so photos survive the Supabase path and not just the starter catalogue.
  All twelve starter posts now have a cover photo (used by `GuideCard` and at the top of the article)
  and one captioned photo in their first section. The images are Lorem Picsum **placeholders** with
  hand-picked ids (desk, device and garment scenes) instead of random seeds; the caption doubles as the
  alt text, and the `starter` note above the article says licensed photography replaces them.
- **One banner.** `components/guide/GuideBanner.tsx` holds the landing hero's green gradient banner
  (eyebrow pill, `<h1>`, lead, meta row, action slot). The article's two-column cover card was replaced by
  the same banner: category eyebrow, title, excerpt, reading time and "More in …" / "All guides" buttons.
- **Full-width article.** The "On this page" table of contents and its 230 px column are gone, so the
  article fills the content column; section `id`s remain for deep links, and the bullet lists regained
  `list-disc` (Tailwind's preflight had removed the markers).
- Files: `apps/web/src/lib/guides.ts`, `apps/web/src/lib/guide-starter.ts`,
  `apps/web/src/components/guide/GuideBanner.tsx`, `apps/web/src/app/guide/page.tsx`,
  `apps/web/src/app/guide/[slug]/page.tsx`, `tests/guide-http.test.cjs`, `tests/guide-card.test.cjs`.
- Validation: TypeScript clean; ESLint clean (two pre-existing `<img>` warnings); `node --test` **830/830**;
  guide HTTP suite 5/5; Chromium 1440×1000 and 390×844 with touch — twelve cards with photos, an article
  with two captioned figures, article width equal to the content width, no "On this page", no overflow.

### 2026-11-21 — Guide landing shows "See more" under the boxes; articles carry related posts

- **What the owner asked for.** Drop the "View All Posts" link in the Guide header and put a "see more"
  under the post boxes instead; and keep showing other, related post boxes below an article.
- **Landing grid.** `apps/web/src/components/guide/GuidePostGrid.tsx` renders every card the server sent,
  hides the ones past `GUIDE_GRID_PAGE_SIZE` (8) with the `hidden` class and `data-guide-card="more"`, and
  puts a centred **See more** pill (with the remaining count) under the grid; each press reveals another
  eight. The pill and the header link are gone from `app/guide/page.tsx`, which instead renders a
  `<noscript>` style that shows every card when JavaScript is off. A `key` built from category, query and
  post count remounts the grid so a filter change starts again at eight cards.
- **Related posts.** `relatedGuidePosts(posts, post, limit = 4)` in `lib/guides.ts` ranks same-category
  posts first (4 points), then posts sharing a product link (2 each), keeps catalogue order for ties, and
  never returns the article itself. `app/guide/[slug]/page.tsx` now uses it and lays the cards out on the
  same 2 / 4 column grid as the landing page.
- Files: `apps/web/src/app/guide/page.tsx`, `apps/web/src/app/guide/[slug]/page.tsx`,
  `apps/web/src/components/guide/GuidePostGrid.tsx`, `apps/web/src/lib/guides.ts`,
  `tests/guide-http.test.cjs`, `tests/guide-card.test.cjs`, `tests/guides.test.cjs`.
- Validation: TypeScript clean; ESLint clean (two pre-existing warnings); `node --test tests/*.test.cjs`
  **830/830**; guide HTTP suite 5/5 against the running server; Chromium at 1440×900 and 390×844 with
  touch showed 8 of 12 cards + "See more 4" → all 12 with the pill gone, and four different related cards
  under the payment article.

### 2026-11-18 — Text Free Transform now hugs the glyph ink, not the font line box

- The owner reported again that both earlier text fixes were still not right, with the Free Transform box the more obvious one: the outline sat well away from the text, so the box looked about twice the height of the letters.
- **Root cause.** `editorTextCanvasBounds` used the font **line box** (`fontBoundingBoxAscent`/`Descent`). For the 110px default font that is 102 + 26 = 128 units, while the drawn capitals only reach ~84 units of ink, so the outline was ~44 units taller than the visible glyphs — roughly 11px of empty gap above and 12px below on screen. The "write downward" path was already correct after the previous fix (re-entering a layer puts the caret at the end), but the box defect dominated the report.
- **Fix.** `editorTextLineMetrics` now measures both boxes: the font line box (`ascent`/`descent`, still used to align the inline editor caret) and the glyph **ink** box (`inkAscent`/`inkDescent`, from `actualBoundingBoxAscent`/`Descent`). `editorTextMetrics` unions each line's ink box around its own baseline (line *i* sits *i* line-heights down), skipping blank lines so an empty line never adds phantom height, and `editorTextCanvasBounds` returns that ink box. The canvas keeps its uniform 18-unit selection margin, so the outline now hugs the glyphs evenly on all four sides.
- **Result.** The single-line box is 35px tall on screen instead of 47.8px, with ~5px above and ~5px below the ink (was ~11px / ~12px). A two-line `AAAA`/`gggg` box measures 273 units = 132 (line height) + 74 (caps ink) + 30 (descender ink) + 36 (2×18 margin), matching the model exactly.
- Files: `apps/web/src/lib/editor-layers.ts`, `tests/editor-layers.test.cjs`, `Doc/DOCUMENTATION.md`, `TODO.md`.
- Validation: TypeScript passed; ESLint exit 0 on the changed files; Next.js production build passed; all repository Node tests passed **108/108** (editor-layers **42/42**, canvas-shell **22/22**), plus the `guide-http` integration suite **5/5** against the running server. Headless-Chromium CDP on desktop 1280×900 and phone 390×844 confirmed the box hugs the ink (symmetric ~5px padding, was ~11px above / ~12px below), a two-line label keeps one `tspan` per line, and re-entering a layer writes downward (`"ONE"` → Enter → `"ONE\nTWO"`, caret at the end).
- Known limitation: the 18-unit selection margin is shared with every other layer kind, so a text box is a few pixels larger than the ink; it is uniform on all four sides. The 2026-11-18 "write downward on re-entry" entry below described the box as the SVG line box; that is superseded by this ink-hugging change.

### 2026-11-18 — desktop-editor-style Gradient tool: draw, re-aim, and edit gradient layers

- Added a `gradient` layer kind and the `EditorGradient` model to `apps/web/src/lib/editor-layers.ts`: a gradient shape (`linear`, `radial`, `angle` conic, `reflected`, `diamond`), a drag axis (`x1/y1` -> `x2/y2` in the shared 1000x1200 artwork space), and up to eight stops (id, offset 0-100, hex colour, opacity 0-1). The default ramp is black to white on a horizontal axis at y=600.
- Pure helpers: `defaultEditorGradient`, `normalizeEditorGradient` (clamps offsets/opacity and rejects bad colours), `sortEditorGradientStops`, `sampleEditorGradient` (linear ramp sampling for the conic/diamond shapes), `editorGradientGeometry` (origin + radius from the 3-4-5 drag distance), `editorGradientConicWedges` (120 flat wedges, since SVG has no native conic paint), `editorGradientDiamondFacets` (four facets), `editorGradientFromToolSettings`, `createEditorGradientLayer`, `setEditorLayerGradient`, and `updateEditorGradientSettings`/`setEditorGradientStops`. The Gradient tool carries its own shape/preset in `EditorToolOptions.gradient`.
- Canvas (`EditorCanvas.tsx`): a Gradient drag paints a full-canvas fill. A drag over a selected gradient layer re-aims that layer's axis; a drag elsewhere drops a new gradient layer; a tap falls back to a full-width horizontal axis through the point. A live `GradientPreview` overlay draws during the drag, and a gradient layer's selection box is the full canvas.
- Rendering: `GradientPreview` in `EditorLayerPreview.tsx` renders every shape from the one 1000x1200 artwork space, so the print canvas (`EditorArtworkLayers`), the Layers thumbnail (`EditorLayersPanel`), and both mockups (`MockupArtwork`) look identical. `EditorAdjustmentsPanel.tsx` gained a `Gradient` tool-options section (shape and preset pickers with live ramp previews) and a `Gradient` layer section (type select, draggable stop handles, add/remove stop, per-stop colour/position/opacity, and the axis Start/End fields).
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/MockupArtwork.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; ESLint **0 errors** on the changed files; Next.js production build passed; Node suites passed (editor-layers **41/41**, canvas-shell **22/22**, photo-adjustments **18/18**, editor-price **4/4**, editor-pen-path **6/6**, guides **9/9**, browser-guards **1/1**, canvas-spec **1/1**; guide-http fails only because no server is on port 3000). Headless-Chromium CDP against the production server on port 12000 confirmed the Gradient tool draws a linear layer with two stops, a second drag re-aims the axis without adding a layer, the Adjustments panel exposes the shape/preset pickers and the stop editor, adding a stop grows the handles 2 -> 3, switching the type to Radial swaps the SVG def to a radial fill, recolouring a stop updates the rendered ramp, and the preset/shape pickers apply to the next gradient, with no runtime exceptions.
- Limitation: this is a vector gradient fill, not a raster or mesh gradient. Per-stop midpoint/bias, the desktop editor's noise/dither options, and gradient strokes (only fills) are not included.

This log records completed website-related changes in the connected repository. Add an entry after each completed implementation or documentation task, with the date, scope, files, validation evidence, and known limitations. Code-review findings are detailed in [Code Audit section](#code-audit).

### 2026-11-18 — Text Free Transform now hugs the glyph ink, not the font line box

- The owner reported again that both earlier text fixes were still not right, with the Free Transform box the more obvious one: the outline sat well away from the text, so the box looked about twice the height of the letters.
- **Root cause.** `editorTextCanvasBounds` used the font **line box** (`fontBoundingBoxAscent`/`Descent`). For the 110px default font that is 102 + 26 = 128 units, while the drawn capitals only reach ~84 units of ink, so the outline was ~44 units taller than the visible glyphs — roughly 11px of empty gap above and 12px below on screen. The "write downward" path was already correct after the previous fix (re-entering a layer puts the caret at the end), but the box defect dominated the report.
- **Fix.** `editorTextLineMetrics` now measures both boxes: the font line box (`ascent`/`descent`, still used to align the inline editor caret) and the glyph **ink** box (`inkAscent`/`inkDescent`, from `actualBoundingBoxAscent`/`Descent`). `editorTextMetrics` unions each line's ink box around its own baseline (line *i* sits *i* line-heights down), skipping blank lines so an empty line never adds phantom height, and `editorTextCanvasBounds` returns that ink box. The canvas keeps its uniform 18-unit selection margin, so the outline now hugs the glyphs evenly on all four sides.
- **Result.** The single-line box is 35px tall on screen instead of 47.8px, with ~5px above and ~5px below the ink (was ~11px / ~12px). A two-line `AAAA`/`gggg` box measures 273 units = 132 (line height) + 74 (caps ink) + 30 (descender ink) + 36 (2×18 margin), matching the model exactly.
- Files: `apps/web/src/lib/editor-layers.ts`, `tests/editor-layers.test.cjs`, `Doc/DOCUMENTATION.md`, `TODO.md`.
- Validation: TypeScript passed; ESLint exit 0 on the changed files; Next.js production build passed; all repository Node tests passed **108/108** (editor-layers **42/42**, canvas-shell **22/22**), plus the `guide-http` integration suite **5/5** against the running server. Headless-Chromium CDP on desktop 1280×900 and phone 390×844 confirmed the box hugs the ink (symmetric ~5px padding, was ~11px above / ~12px below), a two-line label keeps one `tspan` per line, and re-entering a layer writes downward (`"ONE"` → Enter → `"ONE\nTWO"`, caret at the end).
- Known limitation: the 18-unit selection margin is shared with every other layer kind, so a text box is a few pixels larger than the ink; it is uniform on all four sides. The previous 2026-11-18 entry below described the box as the SVG line box; that is superseded by this ink-hugging change.

### 2026-11-18 — Text: write downward on re-entry, and a box that truly hugs the glyphs

- The owner reported that the earlier text fixes still did not work: (1) you could not keep writing downward, and (2) the Text Free Transform box was still visibly wrong (the more obvious of the two).
- **Why it still failed.** The previous box math floored the height at `fontSize` and used the *ink* box (`actualBoundingBoxAscent`), which is cap-height only, so the box top sat ~20 units **below** the drawn text's top and cut through the caps; the extra `fontSize` floor added a further mismatch. And on re-entering an existing layer the inline `textarea` was focused with the caret at position 0, so Enter inserted a new line **above** the text and typing overwrote the start — the "cannot write downward" symptom.
- **Box now hugs the glyphs.** `editorTextCanvasBounds` returns the exact SVG `<text>` box: `x` per alignment, `y = baseline − ascent`, `height = (lines − 1) × lineHeight + ascent + descent`, with no floor or padding. `editorTextLineMetrics` now prefers the font's own `fontBoundingBoxAscent`/`fontBoundingBoxDescent` over the ink box, so all-caps and descender text both fit. `layerCanvasBounds` still adds its uniform 18-unit selection margin (the same margin every other layer gets), so the outline hugs the text symmetrically instead of offsetting to one side.
- **Writing downward.** Re-entering a text layer now places the caret at the end of the text (`textAreaRef` + a focus effect), so Enter adds a line below and typing continues after the last glyph. The inline `textarea`'s first baseline is aligned with the drawn text (`editorTop = y − ascent − halfLeading`) so the caret sits on the glyphs, and it grows with every line.
- **Editor stays open.** Tapping the inline Font size / Color controls no longer commits the edit; `onBlur` keeps the editor open when focus moves to another control inside `[data-editor-text-editor]`, and only a focus move outside commits. Escape still commits.
- **Handles no longer block the text.** While the Text tool is active the Free Transform box is hidden (`transformControlsHidden`), so its bottom-centre handle can no longer sit on the glyphs and swallow the click that should re-open the editor.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorCanvas.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`, `TODO.md`.
- Validation: TypeScript passed; ESLint **0 errors / 25 warnings** with no diagnostics in the changed files; Next.js production build passed; all repository Node tests passed **107/107**. Headless-Chromium CDP against the production server on port 3000, desktop 1280×900 and phone 390×844, confirmed: the outline padding around the drawn text is now symmetric (~5px at rest, ~8px after a resize, ~11px after a rotate; it was **−20px at the top** before, i.e. the box started inside the glyphs); the box is hidden while the Text tool is active; re-entering a layer reopens the editor with the caret at the end and `"HI"` → Enter → `"HI\nTHERE"` draws two `tspan`s; and tapping the inline Font size control keeps the editor open. The Pen cursor hotspot still reads `2 2`.
- Known limitation: the 18-unit selection margin is shared with every other layer kind, so a text box is a few pixels larger than the glyph ink; it is uniform on all four sides.

### 2026-11-18 — Restore text-layer fixes (multi-line typing, glyph-hugging box) and correct the Pen cursor

- Re-applied the reverted text-layer work (the `432ac36` revert had removed the `c974e3c` changes) and fixed the Pen cursor hotspot, addressing three owner reports.
- **Multi-line typing.** The inline on-canvas editor is a `textarea` that grows with each line; Enter starts a new line (Escape still commits) instead of committing, and `EditorLayerPreview` renders one `<tspan>` per line so the drawn artwork matches the editor. The underline decoration follows the last line.
- **Text + Free Transform.** The Free Transform box now hugs the glyphs via `editorTextCanvasBounds` instead of spanning the artwork like an image. `layerCanvasBounds` uses it, so a short label shows a small box and a two-line label grows taller. The measurement now reads the real font through a shared `CanvasRenderingContext2D` (`editorTextLineMetrics` → `measureText`), because a fixed per-character estimate was too narrow for wide glyphs — a `SAMPLE` label measured 0.76em/char, so the old box cut through the text. Node and SSR keep the previous estimate as a fallback. `MockupArtwork` uses the same measured bounds, so the mockup frame matches the print canvas. A Text layer also stays text-only: the Pen, Brush, Pencil, Eraser, and Shape tools refuse to draw on it (with a notice), and `appendLayerStroke`/`appendEditorShapePaths` skip a `"text"` layer in the model.
- **Pen cursor.** The pen cursor hotspot was `15 22`, the pen icon's tail (bottom-right); the nib the slit points at is the top-left corner, so the hotspot is now `2 2` — the same anchor every other tool uses — and the anchor lands where the nib is.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/MockupArtwork.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: TypeScript passed; ESLint clean (exit 0) on the changed files and **0 errors / 25 warnings** repo-wide; Next.js production build passed; all repository Node tests passed **101/101** (editor-layers **36/36**, canvas-shell **21/21**); `git diff --check` passed. Headless-Chromium CDP against the production server on port 12000 confirmed on desktop 1280×900 and phone 390×844: the inline editor is a `textarea` whose Enter adds a line (`"HELLO\nWORLD"`, `"LINE1\nLINE2"`) and the artwork draws one tspan per line; the transform box now encloses the glyphs (156.2px box vs 145.7px text, was 122.2px and cutting through them) and stays enclosing after a resize (256.2 vs 239.0); re-editing an existing text layer appends a third line without creating a new layer; rotate and move still work; and the Pen cursor hotspot reads `2 2`.

### 2026-11-18 — Eraser: live size-accurate nib cursor and precise brush-mode erasing

- The eraser now shows a live nib outline on the print canvas that matches the current `size`, `shape`, `angle`, and `roundness`, and hides the tiny fixed system cursor (`cursor: none`) while the eraser is active. The nib follows the pointer and scales with the Size control, so raising the size visibly enlarges the eraser. Round nibs draw a circle; square nibs draw a rotated rounded rect; both use `vectorEffect="non-scaling-stroke"` so the outline stays a crisp 1.5px at any zoom.
- Erasing precision: Brush mode (the default) is non-destructive — it paints an erasure mask over only the touched spot and leaves the artwork intact. Stroke mode remains the opt-in whole-stroke erase. Measured erased width grows with size (≈15px at size 40, ≈66px at 160, ≈156px at 400).
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; ESLint **0 errors / 25 warnings** (unchanged); Next.js production build passed; Node suites passed (editor-layers **33/33**, canvas-shell **21/21**, and the rest unchanged). Headless-Chromium CDP against the production server on port 12000 passed **11/11** checks across two passes: the nib appears on hover, scales with size (r 60 at size 120 to r 200 at size 400), tracks the pointer, and renders square nibs; and both eraser modes behave (brush adds an erasure mask and keeps the stroke; stroke mode removes the whole stroke), with no runtime exceptions.
- Limitation: the nib is a pointer-position outline (mouse hover and drag); on coarse-pointer touch it follows the finger during a drag but is not shown while merely hovering, since touch has no hover.

### 2026-11-18 — Brush tool: desktop editors brush engine, adjustments, presets, and eraser accuracy

- **Brush engine.** `ArtworkStroke` and `EditorBrushSettings` gained `spacing`, `flow`, `smoothing`, `sizeJitter`, `opacityJitter`, `jitterMinimum`, `angle`, `roundness`, `scatter`, `angleJitter`, `roundnessJitter`, `fadeOut`, and a dab `blend` (`normal`/`multiply`/`screen`). `brushDabPoints` resamples the pointer path into spaced nib dabs along a `smoothBrushPoints` stabilized path, applies deterministic hashed jitter (size, opacity, angle, roundness, scatter) so a re-render never shimmers, and caps the dab count so a long dense drag stays responsive. `brushDabBlurRadius` scales edge softness with nib size.
- **Renderer.** `EditorArtworkLayers` renders dab runs with per-stroke soften filters, square-nib per-dab angle/roundness, fade-out, and `mix-blend-mode` (`data-editor-brush-blend`). Strokes without `spacing` (pen and legacy) keep rendering as a single path. The Layers thumbnail now previews the erasure mask.
- **Adjustments panel.** `BrushOptions` is grouped into Presets, Nib, Paint, Edge, Shape dynamics, and Blending, covering every control and shared by Brush and Pencil. `EDITOR_BRUSH_PRESETS` adds hard round, soft round, spray, chalk, marker, ink, and airbrush as full settings patches applied through the normalizer.
- **Eraser.** `eraseTouchedStrokes` now tests the eraser pass against stroke **segments** via `segmentDistancePx` (with `distanceToSegment`, `orientation`, `segmentsIntersect` helpers) instead of only stroke vertices, so a fast drag can no longer slip between recorded samples. `EditorEraserSettings` also gained `mode` (`brush`/`stroke`), `shape`, `hardness`, `opacity`, `flow`, `spacing`, `angle`, and `roundness`, and `appendLayerErasure`/`updateLayerLastErasure` store brush-style passes.
- **Files:** `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`.
- **Validation:** TypeScript passed; ESLint **0 errors / 25 warnings** (unchanged); Next.js production build passed; Node suites passed (editor-layers **33/33**, canvas-shell **21/21**, photo-adjustments **18/18**, editor-price **4/4**, editor-pen-path **6/6**, guides **9/9**, browser-guards **1/1**, canvas-spec **1/1**). Headless-Chromium CDP against the production server on port 12000 passed **27/27** checks across three passes: dab spacing/flow/smoothing/jitter, square-nib angle/roundness, multiply blend, fade-out, scatter off the straight path, preset application, and both eraser modes (brush adds an erasure mask; stroke mode clears the stroke), with no runtime exceptions.
- **Limitation:** this is a desktop-editor-style vector-dab subset, not raster parity — no textured nib stamps, no pressure or velocity input, no per-stroke smoothing modes beyond the moving-average stabilizer, and no brush asset persistence (settings live in page memory only).

### 2026-11-18 — Shape adjustments: desktop editors fill, stroke, radius, and effects

- Added a vector appearance model to `apps/web/src/lib/editor-layers.ts`: `EditorShapeStyle` with independent **Fill** (color, enable, opacity) and **Stroke** (color, width, `solid`/`dash`/`dot`) channels, a `cornerRadius`, and two effects (`EditorShapeShadow` drop shadow and `EditorShapeGlow` outer glow). `EditorShapeContent` now carries an optional `style`.
- Helpers: `defaultEditorShapeStyle` derives sensible values from a shape's own path fills/strokes; `resolveEditorShapeStyle` falls back to that when a shape has no stored style; `normalizeEditorShapeStyle` clamps every field; `updateEditorShapeStyle` merges a partial and re-normalizes; `roundEditorShapePath` rounds the corners of a closed M/L polygon. `appendEditorShapePaths` now seeds a style from the geometry, and `applyEditorShapeBuilderOperation`/`duplicateEditorLayer` preserve it.
- Renderer: `EditorLayerPreview` takes a `shapeStyle` prop and drives `fill`, `fillOpacity`, `stroke`, `strokeWidth`, `strokeDasharray`, corner rounding (`roundEditorShapePath`), and a `feDropShadow`/glow `filter` via `<defs>`. The canvas (`EditorArtworkLayers`), the Layers thumbnail (`EditorLayersPanel`), and the mockups (`MockupArtwork`) all pass the resolved style, so a shape looks the same everywhere.
- UI: the Adjustments panel gained a **Shape** section (`EditorAdjustmentsPanel`) with fill color/enable/opacity, stroke color/width, line style (solid/dash/dot), corner radius, and the drop-shadow (offset X/Y, blur, opacity) and outer-glow (spread, opacity) controls. `EditorCanvas` wires `onUpdateShapeStyle` and the drag preview now renders the target layer's style live.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; ESLint **0 errors / 25 warnings** (unchanged); Next.js production build passed; Node suites passed (editor-layers **22/22**, canvas-shell **21/21**, photo-adjustments **18/18**, editor-price **4/4**, editor-pen-path **6/6**, browser-guards **1/1**, canvas-spec **1/1**). Headless-Chromium CDP against the production server on port 12000 passed **9/9** checks: the Shape tool draws, the committed path uses the styled renderer, the Shape section opens, enabling the drop shadow renders a `feDropShadow` filter, a non-zero corner radius rewrites the path with `Q` curves, and enabling the glow renders a glow filter — with no runtime exceptions.
- Limitation: this is a desktop-editor-style subset, not full parity — a single fill and a single stroke per shape (no gradient fill or stacked appearance), no independent per-path styling inside one shape layer, and no dash-gap or cap/join controls yet.

### 2026-11-18 — Pen tool: nib-tip cursor, Alt-drag corners, Enter/Escape keys, click-last-anchor finish

- Moved the Pen cursor hotspot from `12 14` to the nib tip (`15 22`) so a click places an anchor exactly under the pen point. The tool-shaped cursor still matches the Tools Bar icon.
- Added `cornerEditorPenAnchor` to `apps/web/src/lib/editor-pen-path.ts`: an Alt-drag while placing an anchor now breaks the smooth node into a corner with only the outgoing handle, instead of the mirrored pair from a plain drag. `PenAnchorDrag` carries a `corner` flag recorded from `event.altKey`.
- Added keys while a Pen path is active: Enter/Return finishes the path, Escape discards it. Both are ignored while typing in an input, textarea, select, or contenteditable, and are routed through a ref so the window listener is not re-subscribed on every render.
- Clicking the last placed anchor now finishes the path as an open path (previously only the first anchor closed it).
- Added the key hints to the Pen actions bar text: “Click anchors · drag for curves · Alt-drag for corners · Enter finish · Esc cancel”.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/lib/editor-pen-path.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-pen-path.test.cjs`.
- Validation: TypeScript passed; ESLint **0 errors** (25 pre-existing warnings, none in the changed files); Next.js production build passed; all Node suites passed (canvas-shell **20/20**, editor-pen-path **6/6**, editor-layers **20/20**, photo-adjustments **18/18**, editor-price **4/4**). Headless-Chromium CDP against a fresh production build on port 3000 passed **10/10** desktop checks (nib-tip cursor, click-places-anchors, actions bar, hint text, Escape cancel, Enter finish, click-last-anchor finish, committed SVG paths, plain-drag paired handles, Alt-drag single outgoing handle) and **3/3** phone checks at 390×844 with touch emulation (touch taps place anchors, actions bar present with the hint hidden on narrow, Escape cancels).
- Limitation: still a step-by-step desktop-editor-like subset, not full parity; no anchor snapping to unrelated objects and no dash/opacity/advanced cap-join properties yet.

### 2026-11-18 — Per-tool options for brush, pencil, eraser, and pen

- Added a `Tool Options` section to the Adjustments panel that changes with the active tool, and the panel now opens on that section. Selecting Brush, Pencil, Eraser, or Pen shows only that tool's controls.
- Brush and Pencil expose tip shape (round/square), size, opacity, and softness/feather. Eraser exposes its radius. Pen exposes stroke width and cap.
- Wired the values into the canvas instead of the old fixed constants. The eraser now uses `toolOptions.eraser.size` for its hit radius (previously a hard-coded `radiusPx = 180`), and committed Pen paths use `toolOptions.pen.width` (previously a fixed `strokeWidth: 5`).
- Each brush/pencil stroke now stores its own `width`, `opacity`, `shape`, and `softness` on `ArtworkStroke`, so different strokes in one layer can look different. Legacy strokes with no stored values keep the previous brush look (52px / 0.68 opacity) through `artworkStrokeWidth`/`artworkStrokeOpacity` fallbacks.
- Square tips render with `stroke-linecap: butt`; softness above zero applies a Gaussian-blur filter.
- The Free Transform box is now hidden while a freehand stroke is in progress (`drawingStroke` on `ArtworkOverlay`), so the selection outline no longer sits under the pointer mid-stroke.
- The bottom Layers action strip's Adjustments button is enabled even with no selected layer, so tool options stay reachable.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; ESLint clean (exit 0) on the five changed files; all repository Node tests passed **64/64** against a production server on port 3000; Next.js production build passed. Headless Chromium against the production server confirmed the per-tool `Tool Options · <Tool>` heading, the Brush controls (shape/size/opacity/softness/feather), the Eraser size control, the Pen width/cap controls, a committed stroke carrying `stroke-width="88"`, `stroke-opacity="0.68"`, `data-editor-stroke-shape="square"`, `stroke-linecap="butt"`, and the transform box absent during both a first and a second stroke and present again after release.
- Limitation: tool options live in page memory only; they are not persisted to a draft or account, matching the rest of the editor's current state handling.

### 2026-11-18 — Free-transform handles: bigger, constant-size, with hover arrows

- Enlarged the Free Transform handles and gave them a constant on-screen size. The artwork SVG is drawn in a 1000×1200 unit space that shrinks to fit its container (about 0.29 units-to-pixel at desktop), so the old fixed-unit handle drew only ~3px on screen. A `ResizeObserver` now measures the SVG scale and sizes each handle to about 10px on screen regardless of zoom, so the corners and edge handles are noticeably bigger as the owner asked.
- Hovering any resize handle now reveals a double-headed arrow glyph inside the handle that points along that handle's axis (diagonal on corners, straight on edges), and the pointer becomes the matching resize cursor — `nwse`, `nesw`, `ns`, or `ew` — no matter which tool is active. The handle's transparent hit circle was widened too, so the cursor and glyph appear as soon as the pointer reaches the handle.
- The rotate handle keeps its own distinct circular-arrow glyph, is enlarged to the same constant size, and shows a grab cursor. The angle read-out beside it is unchanged.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; TypeScript passed; ESLint clean (exit 0) on the changed file; all repository Node tests passed **61/61**; `git diff --check` passed. Focused production Chromium at desktop 1280×900 and phone 390×844 confirmed eight resize handles sized about 14px on screen (up from about 3px), a double-headed arrow glyph appearing only on hover, the matching resize cursor on the hovered handle, and the rotate handle keeping its own glyph and grab cursor.

### 2026-11-18 — Shape tool opens a compact reference-style picker beside its chip

- Reworked the Shape tool to match the owner's reference-style request: it no longer raises a large labelled box, and the picker is not permanently shown. The Shape chip in the tools bar now shows the currently selected shape's icon; clicking it activates the Shape tool and opens a small picker right beside the chip.
- Choosing an option closes the box, keeps the Shape tool active so the user can draw immediately, and the chip's icon switches to the chosen shape. Options are icon-only (shape names kept as `title`/`aria-label`), laid out in a three-column popover, 28px square on desktop and 40px square on coarse pointers so touch targets stay finger-sized.
- Removed the previous always-open-on-tool-select picker and the "Choose a shape, then drag on the canvas" hint line. The picker also stays closed on page load.
- Files: `apps/web/src/components/EditorToolsBar.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; TypeScript passed; ESLint clean (exit 0) on the changed file; all repository Node tests passed **61/61**; `git diff --check` passed. Focused production Chromium at desktop 1280×900 and phone 390×844 confirmed the picker is absent on load, opens beside the chip at **106×106px** (nine 28px icons) on desktop and **142×142px** (nine 40px icons) on phone, closes after a choice, and the chip's icon changes to the chosen shape.

### 2026-11-18 — Text tool follows the layer rule

- Fixed the Text tool so it stops creating a layer on every canvas click. Previously `startArtworkStroke` called `addCanvasTextLayer(undefined, …)` for every click regardless of the selection, so each click spawned a new `Text N` layer.
- Confirmed rule (owner): if the selected layer is a text layer, the Text tool edits that layer's own text in place and creates no layer; if the selected layer is not a text layer (artwork/shape/image) or nothing is selected, it creates exactly one new text layer and types into it. This matches how Pen and Shape already append to the selected layer.
- Implementation: the `activeTool === "text"` branch in `apps/web/src/components/EditorCanvas.tsx` now looks up the selected layer, reopens the existing in-place editor (`setEditingTextLayerId`) when it is a text layer, warns when that layer is locked, and only falls through to `addCanvasTextLayer` for a missing or non-text selection.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; TypeScript passed; ESLint clean (exit 0) on the changed file; all repository Node tests passed **61/61**; `git diff --check` passed. Focused production Chromium at desktop 1280×900 and phone 390×844 confirmed both branches: with a selected text layer the Text tool opened the in-place editor and the layer count stayed at 2; with a selected non-text artwork layer it created exactly one new text layer (3 → 4) and opened its editor.
- Limitation: the Sidebar `Add Text` button and each Text/Element card still add one layer per action (that is the explicit insertion action, not the Text tool); only the canvas-click Text tool was changed.

### 2026-11-18 — Header Bar 2 uniform boxes, shared rounded dropdown, and live price

- Made every Header Bar 2 control share one box shape. Product, GSM, Color, and Size now render through a single `BoxDropdown` component built on the same `FIELD_BOX`/`TRIGGER_BOX` geometry as the Save/Buy `ACTION_BOX` boxes; the native `<select>` elements are gone, so all six boxes use identical fully rounded `80×32px` desktop / `80×44px` coarse-pointer geometry and green `bg-accent` fill.
- Every field's chevron now opens the same green dropdown panel (`MENU_BOX`/`MENU_OPTION`), portal-mounted so the horizontally scrollable bar cannot clip it. Product, GSM, Size, and Color share the panel; Color keeps its selected theme swatch in the trigger. Options carry `role="option"`/`aria-selected`, disabled future products, Escape/outside-click close, and arrow/Home/End key navigation.
- Rounded the sides of the opened dropdown panel. The panel first used `rounded-full`, which on a ~240px-tall menu clamps into a capsule (semicircular top/bottom with straight vertical sides) rather than rounded sides; it now uses a `rounded-2xl` panel with `rounded-full` options, giving evenly rounded corners on every side.
- Sized the opened dropdown panel to the box it opens from. The menu was a fixed 176px overlay; it now takes the trigger's width (80px), so the panel lines up under the control instead of looming over it. Option rows use the box height (32px desktop / 44px touch), and the panel stays clamped inside the viewport.
- Pinned each field box's chevron to the same spot. The chevron is absolutely positioned at the right edge of every box (`right-1.5`, vertically centred), so Product, GSM, Color, and Size all show the arrow in the same place; the label/content is centred in the space that remains.
- Made the Color swatch a box instead of a dot. The selected swatch (in the Color trigger and in each dropdown option) is now a 20×20px rounded square (`rounded-md`), not a small circle, so it reads like the box it sits in.
- Made the Save-adjacent price live. New `apps/web/src/lib/editor-price.ts` exposes `calculateEditorPriceKs`, a provisional client-side calculation matching the storefront's base + GSM + Size variant model. The price shows the Ks amount once the product's required selections exist and updates immediately on every Product/GSM/Size change; it reads `Price —` only while a required choice is missing. Save/Buy remain disabled placeholders because no price source or save/checkout handler is connected.
- Files: `apps/web/src/components/EditorHeaderBar2.tsx`, `apps/web/src/lib/editor-price.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, `tests/editor-price.test.cjs`, `package.json`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; TypeScript passed; ESLint had **0 errors / 25 warnings** with no diagnostics in the changed files; all repository Node tests passed **61/61** (including the new editor-price suite and canvas-shell **16/16**); and `git diff --check` passed. Focused production Chromium confirmed the uniform 80×32 desktop boxes, the live price (`Price 28,000 Ks` default, `Price 12,000 Ks` after switching to Phone, `Price 31,500 Ks` after 240 GSM, `Price 36,500 Ks` after 3XL), and the follow-up refinements: every opened dropdown is 80px wide (the box width, not the old 176px), every box pins its chevron 7px from the right edge and vertically centred, and the Color swatch is a 20×20px rounded square at desktop 1280×900 and phone 390×844.
- Scope note: the broader `tests/editor-touch.cjs` run completes its Header Bar 2 desktop and phone checks, then stops at the pre-existing unrelated Edit sidebar selector (`aside[aria-label="Edit sidebar"]`); that assertion fails identically on unmodified `main` and was left untouched.

### 2026-11-17 — Header Bar 2 green boxes, Color dropdown, and price order

- Applied the owner's correction to Header Bar 2: `Price —` now appears immediately to the left of Save; every Product/GSM/Color/Size/Save/Buy box uses the app's green accent fill while keeping the same fully rounded 80×32px desktop / 80×44px touch dimensions.
- Replaced the always-visible Color dots with a box containing the selected theme swatch and a down-chevron. The chevron opens a fully rounded green dropdown with Background, Surface, and Accent options. The portal-mounted menu is not clipped by the horizontally scrollable bar, and it closes on selection, outside click, or Escape.
- Files: `apps/web/src/components/EditorHeaderBar2.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation on merged `main`: production build passed; lint completed with 0 errors / 25 warnings; all repository Node tests passed **55/55** and canvas-shell passed **16/16**. Focused post-merge CDP verification passed at 1280×900 desktop and 390×844 phone sizes for green box fills, Price-before-Save, rounded menu geometry, Color selection by touch, and mobile hiding of labels/price.
- Scope note: the broader `tests/editor-touch.cjs` run completed its Header Bar 2 checks, then stopped at the existing Edit sidebar selector on line 330 (`aside[aria-label="Edit sidebar"]`); that unrelated Sidebar test was left untouched.

### 2026-11-17 — desktop-editor-like Pen cursor and path continuity

- Kept the existing vector Pen workflow (corner anchors, dragged Bézier points, Shift snapping, close/finish/cancel, and editable points/handles) and applied the owner's desktop-editor-like continuity correction. The same Pen-nib cursor remains on the viewport and print canvas while Pen is selected, throughout drawing and after committing a path. The cursor hotspot is aligned to the nib point (`12 14`) with crosshair fallback; existing Move-based node editing remains unchanged.
- Finish/Close no longer switches the active tool to Move. Pen stays selected and ready to start another path. Other tools and their cursor behavior are unchanged; no unrequested Pen modes were added.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: Next.js production build passed; all repository Node tests passed **55/55**, including canvas-shell **16/16**; lint completed with **0 errors / 25 warnings**; and `git diff --check` passed. Focused production-mode Chromium verified the same cursor before the first anchor, after each anchor, and after both Finish and Close path; Pen remained selected and a new path could start immediately after either completion.

### 2026-11-18 — desktop-editor-style Pen Bézier handles, thin path, and hint removal

- Dragging from an anchor now shows both Bézier guide lines and visible endpoint dots in the live preview. Existing saved-path handles remain editable; dragging a handle changes the cubic path, and Alt still breaks the mirrored tangent.
- Thinned the live Pen preview to 1.5px and the committed Pen path to a fine line at the default canvas size. Removed the “Click: corner · drag: curve · Shift: snap · click start: close” instruction and the empty idle box; Finish, Close path, and Cancel remain visible during an active path.
- Stabilized handle editing across React redraws by tracking pointer move/up/cancel for the duration of an active handle drag and cleaning up listeners on release or unmount.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation on 2026-11-18: production build passed; all repository Node tests passed **55/55**; Pen geometry and canvas-shell tests passed **21/21**; lint completed with **0 errors / 25 warnings**. Focused production Chromium verified idle hint removal, visible in/out handle endpoints, 1.5px preview, active path actions, and that dragging a saved-path handle changes the cubic SVG path data. `git diff --check` passed.

### 2026-11-16 — Owner-directed reference-inspired Pen curves and node editing

- Replaced the straight-anchor-only Pen interaction with click-to-place corners, click-drag smooth Bézier handles, Shift snapping to horizontal/vertical/45-degree segments, a highlighted close target, and touch-visible Finish/Close/Cancel actions. Closed paths use the active foreground as fill; open paths remain stroke-only.
- Pen geometry is retained as editable anchor/handle/closed-state data alongside SVG path data. Double-clicking a selected Pen path enters node-edit mode; dragging points/handles edits the vector, clicking a segment inserts a node with cubic subdivision, and Alt-click, focused-point Delete/Backspace, or Delete point removes a node subject to open/closed minimums. Touch-sized invisible hit areas support Phone/Mobile pointer work. Ordinary handle drag mirrors the opposite handle; Alt-drag breaks the tangent. Changes are recorded through the existing layer undo history.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/lib/editor-pen-path.ts`, `apps/web/src/lib/editor-layers.ts`, `tests/editor-pen-path.test.cjs`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`, `package.json`, `Plan/PLAN.md`.
- Validation: `npm run build` passed with TypeScript; `npm run test:editor-pen-path` passed **5/5**, `npm run test:editor-layers` passed **14/14**, and `npm run test:canvas-shell` passed **15/15**. Focused ESLint on the edited app files and `git diff --check` passed with no warnings/errors.
- Limitations: snapping to unrelated objects/nodes and the full path appearance property set are not implemented in this pass. Pen paths currently create separate Shape layers and remain in the app's existing in-memory editor state; Save/persistent draft support is still unavailable.

### 2026-11-16 — Owner-directed Header Bar 2 pill selector redesign

- Rebuilt Header Bar 2 controls as consistent fully rounded boxes: 80×32px on desktop and 80×44px for coarse-pointer/touch layouts. Product defaults to `T-Shirt` with no `Choose` option; GSM defaults to `160 GSM` with no `Choose` option; Size defaults to `XL` with `XS` through `3XL` choices.
- Color is a three-swatch selector using the app theme's `Background`, `Surface`, and `Accent` tokens. Desktop retains the Product/GSM/Color/Size labels and shows `Price —` beside Save. Phone layouts hide the field labels and separate price text, leaving the horizontally scrollable control boxes.
- Save and Buy remain disabled placeholders; `/create` has no connected product-price source or order-save/checkout handler. Color and Size selections remain local UI state.
- Files: `apps/web/src/components/EditorHeaderBar2.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, `TODO.md`, `Plan/PLAN.md`.
- Validation: `npm run build` passed (including TypeScript); `npm run lint` completed with 0 errors and 26 warnings; `node --test tests/*.test.cjs` passed **44/44** with the local production app available. A focused CDP check passed at 1280×900 desktop and 390×844 phone sizes, including pill dimensions, defaults, swatch-token color, and the shared Header Dark/Light toggle.
- Scope note: the broader legacy `tests/editor-touch.cjs` run still contains pre-upstream Edit sidebar expectations and stops in that unrelated section; those assertions were left untouched. Header Bar 2 was verified independently rather than expanding this task into Sidebar work.

### 2026-11-15 — Owner-directed template-style Editor Sidebar first slice

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
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/lib/editor-design-library.ts`, `apps/web/src/lib/editor-upload.ts`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`, `Plan/PLAN.md`.
- Validation: canvas-shell **14/14**, editor-layers **7/7** (new text/shape/image coverage), canvas-spec **1/1**, browser-guards **1/1**, guides **9/9**; TypeScript passed; `next build` passed; `git diff --check` passed; lint **0 errors / 26 warnings** (all pre-existing, none in the files changed here).
- Limitations: the Designs/Elements/Text catalogs are the repository-side placeholder catalog in `editor-design-library.ts` (`DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"`); once the R2 listing and SVG-parsing endpoints exist they should feed the same `DesignLibraryEntry`/`DesignLibraryLayer` shape instead of the constant. Uploaded images and placed designs are stored in page memory as data URLs/layer data — no browser/account persistence or production export yet. Inline text editing is single-line per layer with no font family/weight/letter-spacing controls or text-specific transform handles; the existing whole-layer move transform applies. `Image Create` still has no AI generation service in this repository, so its button records the prompt and states that a generated image will land on the canvas as its own layer once that service is connected. The KB/MB ceiling is a single module constant rather than an admin-configurable value.

### 2026-11-15 — Canvas layer move/resize and direct text design controls

- Added selection transform controls for Sidebar-created layers on the print canvas: selected layers can be moved with the existing Move tool and resized using the green corner handle. The resize scale is clamped to a usable 25%–300% range and applies to artwork, design elements, text and uploaded images through shared layer rendering. The control is placed above the move hit area so it remains clickable.
- Add Text now opens an actual inline canvas editor with a real text input and a small formatting strip for font size and color. Text is stored immutably in the selected `text` layer while typing, and formatting updates redraw the same canvas text immediately. The layer remains selectable and visible in the Layers panel.
- Removed the user-visible R2 placeholder/status paragraph from Designs and the unnecessary AI service status copy from Image Create. The Sidebar now shows only design controls/cards and the requested functional actions.
- Files: `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; canvas-shell **14/14**; editor-layers **7/7**; production build passed; `git diff --check` passed; lint **0 errors / 26 warnings** (existing repository warnings only).
- Remaining limitation: the current text strip provides font size and color first; font family, weight, alignment, letter spacing, and rich text controls are a follow-up layer-design pass. R2/AI service integration remains separate from the local layer mechanics.

### 2026-11-15 — Working Fill, layer grouping, ordering, and non-destructive masks

- Enabled the Layers box `Fill` field. It now writes a clamped `fillOpacity` value to the selected layer and the renderer applies it to all layer pixels/content, including freehand strokes, text, vector elements, and uploaded images. `Opacity` remains the whole-layer opacity control.
- Layer ordering is available through the existing per-layer Move Up / Move Down actions. Each action changes the actual shared array order used by the canvas and mockup renderers, so the visual stacking order follows the Layers box. Grouped layers are selected together and therefore move as one selection when using the canvas Move tool.
- Added Group and Ungroup actions for multi-selected layers. Group membership is stored as a `groupId`, shown beside grouped layer names, and selecting one grouped member selects the full group. Ungroup removes that membership without flattening or duplicating content.
- Kept and completed the non-destructive desktop-editor-style mask flow: a mask is a separate thumbnail/target, black (`Hide`) strokes remove pixels through an SVG mask, white (`Reveal`) strokes restore them, and the source artwork remains unchanged. The mask can be selected independently in the Layers box and painted with the existing brush/mask target flow.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `Plan/PLAN.md`.
- Validation: TypeScript passed; editor-layers **7/7**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Independent grouped layers, mask brush painting, and linked layers

- Group membership no longer forces every member to be selected. A grouped layer can be selected and moved independently; multi-select remains available for intentionally transforming several members together. The existing Group/Ungroup actions remain non-destructive.
- Selecting a layer mask now automatically switches to the Brush tool. Creating a new mask does the same, so the user can immediately paint black (`Hide`) or white (`Reveal`) directly on the canvas. The SVG mask keeps a white base plus black/white brush strokes, preserving source artwork for later mask edits/removal.
- Replaced the disabled adjustment-layer footer slot with a working `Link layers` action. Selecting two or more layers and clicking the link icon assigns a shared link membership; moving any selected linked layer expands the move set to its linked peers. Clicking the same action on linked selections removes the link. Group and Link are separate: groups can be individually selected, while links explicitly synchronize canvas transforms.
- Files: `apps/web/src/lib/editor-layers.ts`, `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `tests/editor-layers.test.cjs`, `tests/canvas-shell.test.cjs`.
- Validation: TypeScript passed; editor-layers **8/8**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — desktop-editor-style layer stack drag reorder and folder groups

- Layer rows in the Layers box are now draggable. Dropping a row above/below another row calls the shared `moveEditorLayerToIndex` helper, so the actual layer array and canvas/mockup stacking order change directly instead of requiring repeated Move Up/Move Down clicks. The menu actions remain available as keyboard-friendly alternatives.
- Grouped layers now expose a folder-style collapsed/expanded header in the Layers box. Child rows remain individual layer rows with their own thumbnail, visibility, mask, rename, and selection controls. Collapsing only hides the child rows in the panel; it does not flatten or delete them. Group membership stays separate from Link Layers, and individual group children remain independently selectable.
- Files: `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`.
- Validation: TypeScript passed; editor-layers **9/9**; canvas-shell **14/14**; production build passed; `git diff --check` passed.

### 2026-11-15 — Restore stable desktop-editor-style layer row layout

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

### 2026-11-15 — desktop-editor-style transform handles and mask color workflow

- Replaced the single bottom-right canvas resize handle with eight desktop-editor-style handles: four corners and four side/midpoint handles. All handles use the shared resize transaction so the selected layer set remains consistent while scaling.
- Added selectable Group folder headers. Selecting the Group header selects every child layer, so canvas move/resize applies to the complete group. Selecting an individual child row keeps the transform selection limited to that child; the Layer box selection remains the source of truth.
- Removed the redundant mask instruction panel and Hide/Reveal buttons from the Layers box. Mask painting now follows the existing desktop-editor-style foreground/background color switch: black foreground hides and white foreground reveals. Selecting/creating a mask still switches to Brush automatically.
- Updated canvas-shell and touch-test expectations for eight handles and color-switch mask painting. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; editor-touch syntax passed; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Functional Adjustment panel with Layers return arrow

- The bottom `Adjustment` icon is now functional. Clicking it opens a dedicated right-side Adjustment panel for the selected layer and closes the Layers panel at the same time.
- Text layers expose editable text content, font size, and color controls, plus shared Opacity and Fill controls. Non-text layers show their shared appearance controls and a clear message that text properties are not applicable.
- While Adjustment is open, its round arrow occupies the same dock-toggle position. Clicking that arrow closes Adjustment and reopens the Layers box, preserving the current selection.
- The Adjustment action is available on touch layouts as well as desktop layouts. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Dynamic desktop-editor-style canvas selection bounds

- Removed the fixed `120,160 → 880,1040` transform frame. The canvas now calculates selection bounds from the selected layer content: strokes, text metrics, image boxes, and shape path coordinates. A Group selection unions all child bounds; an individual child selection uses only that layer's bounds.
- The eight resize handles are positioned on the calculated corners and side midpoints. Resize direction is handle-aware, so left/top handles grow inward/outward in the expected direction while preserving the layer scale model. Move and resize still use the complete selected ID set, so group-header selection affects the group and child selection affects only the child.
- Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Complete text adjustments and direct Text tool typing

- Expanded text layer styling beyond size/color: font family, bold, italic, underline, left/center/right alignment, letter spacing, and line height are now stored on the text layer and rendered on the canvas.
- The Adjustment panel exposes these controls without requiring the user to re-enter the text. Text content remains editable there as an optional direct edit, while style changes apply immediately to the selected layer.
- Added `Text` to the bottom Tools bar. With Text selected, clicking a position on the canvas creates a new text layer at that exact canvas coordinate and focuses the inline editor so the user can type immediately.
- Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — reference-style editor interaction pass

- Added the missing desktop-editor-style rotate affordance below the dynamic selection bounds. Rotation is tracked per layer and applied to selected linked layers together; the handle displays a live canvas interaction rather than a fixed-size transform control.
- Text entry now returns to the Move/selection tool after the inline editor commits, matching the usual editor behaviour flow where Text is an insertion tool and selection resumes after typing.
- Preserved the existing Text Adjustment typography controls and direct Text tool workflow while extending the canvas transform foundation. Validation: TypeScript passed; editor-layers **11/11**; canvas-shell **14/14**; production build passed; lint reported **0 errors** (26 existing warnings remain).

### 2026-11-15 — Layer-aware Move Tool and no-scroll Tools Bar

- Removed horizontal scrolling from the bottom Tools Bar. The controls now wrap into additional rows when the viewport is narrow, allowing the dock to grow in height instead of hiding tools behind a horizontal scroller.
- Move Tool now operates on the selected artwork layer(s), not the entire canvas artwork. A normal layer click selects one layer; Shift/Ctrl/Cmd-click toggles additional artwork layers. Dragging the canvas then moves only the selected, unlocked layers. Each layer keeps its own bounded in-memory canvas offset, and new strokes on a moved layer remain aligned with that layer.
- Files: `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/EditorArtworkLayers.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`.
- Validation: no horizontal Tools Bar overflow assertion, canvas shell **13/13**, editor layers **6/6**, TypeScript, Next.js production build, and Phone/Desktop editor-touch suite passed across 390 × 844, 320 × 740, both landscape sizes, and 1280 × 900.
- Limitations: multi-selection is currently an in-memory layer selection for the active Editor route; it is not yet serialized into a draft or export format.

### 2026-11-15 — template-style Edit rail, color swap, and canvas Move tool

- Reworked the Edit sidebar into a compact left icon rail like the template editor. The rail remains narrow when idle; clicking a Design, Elements, Text, Brand, Uploads, Draw, Projects, or Apps icon opens the wider Edit box and highlights that category with a short honest status description. The existing circular expand/collapse control and Phone/Desktop overlap guard remain in place.
- Updated the Tools Bar color controls to keep the overlapping desktop-editor-style foreground/background squares and added a small circular swap control. Clicking either square opens its color picker; clicking `Swap foreground and background colors` exchanges the two colors. New Pen/Brush strokes continue to use the current foreground color.
- Move Tool now has a dedicated interactive target over the print canvas artwork. With Move selected, dragging the canvas artwork changes its shared source overlay transform within bounded canvas offsets; the existing independent Front/Back mockup movement remains unchanged.
- Files: `apps/web/src/components/EditorEditSidebar.tsx`, `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, and `tests/editor-touch.cjs`.
- Validation: canvas shell **13/13**, editor layers **6/6**, browser guards **1/1**, TypeScript, Next.js production build, and `git diff --check` passed. Production Chromium editor-touch passed at 390 × 844, 320 × 740, both landscape sizes, and 1280 × 900 desktop.
- Limitations: Edit categories currently provide layout and honest status text rather than connected the template editor asset libraries; canvas Move uses a bounded in-memory transform and does not yet serialize to a document draft or export.

### 2026-11-15 — Add Shape / Gradient / Redo tools and shrink editor controls

- Owner request: added `Shape`, `Gradient`, and `Redo` to the compact bottom Tools Bar. Shape and Gradient select their tools and show an honest availability notice because their vector-shape and gradient-fill pipelines are not connected yet. Redo is functional and paired with the existing bounded 30-snapshot artwork Undo history; making a new draw/erase action clears the redo branch.
- Matching controls: the Tools Bar collapse chevron now uses the same solid `bg-accent` circular-arrow treatment as the Edit sidebar and Layers panel show/hide toggles. The existing panel positions remain edge-safe on Phone so the right Layers arrow does not cover the canvas options control.
- Canvas menu: reduced the desktop menu from the previous 144 × 82 px treatment to a compact approximately 112 × 62 px box with 20 px rows, 10 px labels, 11 px icons, and 0.5 padding. Phone/Mobile keeps 40 px rows for touch while retaining the smaller box, and menu pointer events are isolated so touch selection remains reliable.
- Files: `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`, and `Plan/PLAN.md`.
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
- Files: `apps/web/src/components/EditorCanvas.tsx`, `tests/canvas-shell.test.cjs`, `tests/editor-touch.cjs`.
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
- Added disabled template-like placeholders for `Design`, `Elements`, `Text`, `Brand`, `Uploads`, `Draw`, `Projects`, and `Apps`; their actual content and actions remain pending the owner's next step-by-step instructions.
- On narrow screens, opening one dock closes the other to avoid panel overlap; resizing from desktop into the narrow breakpoint closes both docks. Desktop can keep both sidebars open. Both use theme-aware styling and touch-friendly controls.
- Validation: all repository Node suites **33/33**, TypeScript, changed-file ESLint with no warnings, Cloudflare/OpenNext production build, and responsive Chromium checks passed. CDP verified all eight disabled tool labels, collapsed-by-default left docking, mobile mutual exclusion and desktop-to-phone resize handling, nonoverlapping desktop docks, app accent color in Light/Dark, touch-sized mobile control, and existing editor/layer regressions. Physical-device checks remain outstanding.

### 2026-11-15 — Remove unused Layers rows and accent the circular toggle

- Kept the existing compact right-side panel, but removed the unused `Channels`, `Paths`, top `Menu`, and `Kind` rows. The functional Layers title, blend/opacity, Lock/Fill, layer/mask rows, and bottom action strip remain.
- Replaced the rectangular edge trigger with a circular button using the app's `bg-accent` / `text-accent-foreground` tokens, so it changes with Header Light/Dark. It is 28px on desktop and expands to a 44px coarse-pointer touch target.
- Validation: all Node suites **32/32**, TypeScript, changed-file ESLint with no warnings, Cloudflare/OpenNext production build, and responsive Chromium tests passed. Browser checks cover the removed rows, active theme accent on the toggle, desktop/phone sizing, layer/mask operations, and existing mobile/editor regressions.

### 2026-11-14 — Compact Layers panel to match the supplied layout

- Reworked the right-side dock to follow the owner's supplied 398×770 reference: compact `Layers / Channels / Paths` tabs; a `Kind` filter row; `Normal` blend and numeric opacity; `Lock / Fill` controls; short visibility/thumbnail/name/mask rows; and a compact bottom action strip. Reduced the panel to a 16rem maximum and labels to 11px; the row overflow menu holds rename/reorder/duplicate/delete and mask operations.
- Artwork and mask thumbnails preview their vector strokes. The working controls remain functional; screenshot-specific items not supported by the editor yet (Channels/Paths content, kind filters, pixel locks, Fill, effects, adjustment layers, and groups) are explicitly disabled. Portrait phones retain 44px touch targets; short-landscape viewports (≤500px tall) hide the decorative Kind row and reduce toolbar controls to free scrolling room for the layer/mask list.
- Reference source: user attachment `pasted_file_OMaJAy_image.png` (398×770), supplied 2026-11-14; it is not copied into the repository.
- Validation: all repository Node suites **32/32**, TypeScript, changed-file ESLint with no warnings, Next.js/Cloudflare OpenNext production build, and `git diff --check` passed. Chromium verified the 16rem maximum width and 11px row labels at 1280×900, 390×844/320×740 portrait, 740×390 and 844×390 landscape including mask-control scrolling, right-dock open/close, theme switching, create/draw/duplicate/delete, mask hide/reveal, and existing Phone/T-Shirt, Front/Back, and 3500/1500px tier behaviors. Physical-device checks remain outstanding.

### 2026-11-14 — Dock Layers on the right in a desktop-editor-inspired panel

- Moved the initially collapsed Layers dock to the Editor viewport's right edge and moved its toggle arrow to the left edge of the dock.
- Applied a compact neutral graphite/light-gray treatment with desktop-editor-like blue selected-layer feedback; the existing Header Light/Dark toggle still changes the panel colors. Layer and mask operations remain unchanged.
- The exact reference image was not available in the repository or the inherited message attachments, so this is a desktop-editor-inspired right dock—not a pixel-exact recreation of the screenshot. Reattach the image to refine its precise panel tabs, controls, and spacing.
- Validation: right-edge placement is checked in responsive Chromium for 390×844 and 320×740; TypeScript, ESLint, all Node suites, and the Cloudflare/OpenNext build are rerun for this positioning/style update.

### 2026-11-14 — Implement functional Layers and non-destructive vector masks

- Replaced the left-side panel's “controls later” shell with an initially collapsed, theme-aware layer stack. The current vector artwork layer model supports add/select/rename/reorder, show/hide, lock, duplicate/delete, opacity and blend mode. Canvas drawing appends to the selected unlocked layer.
- Added desktop-editor-style Layer Masks: add/remove a mask, select it independently from its artwork, and paint black to hide or white to reveal using the print canvas. Source strokes remain intact. Ordered visible layers, opacity/blend and masks are rendered on the print canvas and shared Front/Back previews; per-mockup move/resize and the existing transferable artwork tier remain independent and unchanged.
- The panel and its Properties/mask controls scroll on short screens. Mobile browser coverage exercises layer create, artwork drawing, hide/reveal mask strokes, duplicate/delete, and reachability at a 844×390 landscape viewport as well as the existing 390×844 and 320×740 phone checks.
- Limitations: artwork and mask strokes are vector and page-memory only. Raster/pixel selection masks, undo/redo, serialized/browser/account saving, production export, and broader raster features are not claimed in this slice; continue those only from the owner's next explicit instructions.
- Validation: all repository Node tests **32/32**, TypeScript, changed-file ESLint, Next.js and Cloudflare/OpenNext production builds, Chromium touch/mouse checks, and `git diff --check` passed. Physical Android/iPhone testing remains outstanding.

### 2026-11-14 — Restore selectable Product and remove Choose defaults

- Replaced the fixed Product value with a compact 92px dropdown. It has no `Choose` option, defaults to `T-Shirt`, allows `Phone`, and keeps `Hoodie`, `Cup`, `Kids`, and `Bag` visible but inactive until their rules are specified.
- Removed `Choose` from the GSM dropdown and selected `160 GSM` as its initial value. Changing between T-Shirt and Phone preserves the GSM selection. Phone still switches to disabled Brand/Model placeholders and permits only one visible Front Mockup; returning to T-Shirt restores the previous Back Mockup.
- The left Layers panel remains a closed-by-default shell only. The owner has now requested desktop-editor-style functions including new layers, masks, and deletion. Those operations are not yet implemented; the exact meaning of `Mark` and how layer edits should apply across the print canvas and Front/Back Mockups need clarification before connecting controls to artwork.
- Validation: canvas-shell **11/11**, all repository Node tests **27/27**, TypeScript, changed-file ESLint, Cloudflare/OpenNext build, Chromium Product/GSM and Phone mockup checks at 390×844 and 320×740, desktop theme and mouse checks, Layers shell toggle checks, and `git diff --check` passed.

### 2026-11-14 — Fix Product to T-Shirt and add the Layers panel shell

- Reduced the `Product` value box to 92px and made it a fixed, read-only `T-Shirt` value for this step. Product switching is intentionally not exposed; the prior Phone-specific rules remain in the code but are not reachable in the current UI. The `GSM`, `Color`, and `Size` fields remain in place.
- Added a closed-by-default Layers panel shell on the left edge of the Editor viewport. Its arrow opens the panel, moves to the panel edge, and closes it again. The panel currently contains only the `Layers` heading and a note that controls will be added step by step.
- No layer list, create/delete/reorder/visibility/lock controls, blending, opacity, or artwork-to-layer behavior was added; those details are deferred to the owner's later instructions. The overlay stays within the Editor viewport, below the phone view toolbar, and uses the app's theme colors.
- Validation: canvas-shell **11/11**, all repository Node tests **27/27**, TypeScript, changed-file ESLint, Cloudflare/OpenNext build, Chromium checks at 390×844 and 320×740 (open/close and drawer width), landscape phone and 1280×900 desktop open/close, existing touch/mouse editor regressions, and `git diff --check` passed. Physical Android/iPhone testing remains unavailable.

### 2026-11-14 — Make the first Product choices control Bar 2 and Mockups

- `T-Shirt` is the default supported product. Its Bar 2 shows `GSM` and the existing `Size` placeholder; `Color`, `Save`, and `Buy` remain in the row. Selecting `Phone` hides `GSM`/`Size` and shows disabled `Brand`/`Model` placeholders because no brand/model options have been specified; `Color` remains visible.
- On Phone, only one usable Front Mockup is shown and the Back-add control is unavailable. A T-Shirt Back Mockup is preserved while Phone is active and reappears when switching back to T-Shirt. The Front/Back transferable artwork tier remains usable for T-Shirt, and the single Phone mockup receives the large tier. The Product list keeps `Hoodie`, `Cup`, `Kids`, and `Bag` visible but disabled until their rules are specified; no attribute or brand/model options were invented.
- Updated `/create`, the shared Product type, `EditorHeaderBar2`, `EditorCanvas`, tests, and current-state documentation. This supersedes the placeholder-only Product/GSM behavior in the following earlier log entry.
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
- ပြောင်းလဲသည့် source: `EditorCanvas.tsx`, `MockupArtwork.tsx`, `MobileBottomNav.tsx`, `/create/page.tsx`, root layout။ `tests/canvas-shell.test.cjs` တွင် mobile regression assertions ထည့်ထားပြီး `tests/editor-touch.cjs` သည် Node 22 နှင့် local Chromium CDP endpoint ကိုသာ သုံးသည့် reusable touch integration check ဖြစ်သည်။ Dependency အသစ် မထည့်ပါ။
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
- This rule supersedes the fixed Front-3500/Back-1500 assignment in the earlier work-log entry below. Updated `Plan/PLAN.md` first, then implemented shared allocation in `EditorCanvas` and `MockupArtwork`, with a tested allocation helper.
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

- Followed the owner's direct request rather than the previous Plan sizing language. Updated the existing mockup nodes in `EditorCanvas`: Front and Back now share the same responsive width (`min(18.25rem, 78vw)`, square box, and artwork scale (`0.82`). The older work-log entry below records the superseded larger-Front/smaller-Back behavior at that earlier commit.
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

**Evidence:** `apps/web/src/app/create/page.tsx:3-8` mounts only `EditorCanvas`. In `apps/web/src/components/EditorCanvas.tsx:129-136`, the design area is an empty `div`; component state covers only mockup visibility, zoom, pan, and gesture handling. The adjacent mockup is explicitly a placeholder (`EditorCanvas.tsx:154-179`). There is no editor document model, artwork operation, history, serializer, or persistence call wired to the route. Although `SQL/0001_initial_schema.sql:89-95` defines `user_designs.canvas_state`, this route does not use it.

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

##### 8. Short phone viewports can clip the stacked editor workspace — RESOLVED 2026-11-22

**Evidence (historical):** the viewport used `overflow-hidden`, and below `md` the canvas/mockup stack retained width-derived heights, so on a short phone viewport the lower content extended past the available height with no scroll path.

**Fix:** the viewport scrolls (it already did) and `lib/editor-viewport.ts` measures how much of the print canvas the floating Tools Bar covers, reserving exactly that much room with a spacer inside the scroller. The spacer must not be padding on the scroller: the scroller is absolutely positioned, so its padding inflates its own box and pushed the editor under the bottom navigation at 740 × 390. Verified in Chromium at 320 × 480, 320 × 568 and 360 × 640: 0 px of the print canvas stays under the bar when scrolled to the end, no horizontal overflow; 390 × 844, 820 × 1180 and 1280 × 900 reserve nothing and are unchanged. `tests/editor-viewport.test.cjs` covers the geometry.

##### 9. Touch pointers cannot pan the canvas on phones — RESOLVED 2026-11-22

**Evidence (historical):** only middle-button drag or Space+left-button drag panned, so a touchscreen had no pan route.

**Fix:** phones pan with the `Pan view` toggle or the Hand tool (both set `touch-action: none`), and two fingers pinch-zoom between 0.25× and 3× while panning, keeping the artwork under the fingers. The maths is in `lib/editor-pinch.ts` and the scroller's own offset is fed into it, because the browser anchors the scroll when the zoom makes the workspace taller and the artwork would otherwise jump by that amount (72 px in the first run). Measured in Chromium: the anchored point lands within 0 px, and the clamps stop at 3× and 0.25×. `tests/editor-pinch.test.cjs` covers it.

##### 10. Users can update their own reward-point balances

**Evidence:** `SQL/0001_initial_schema.sql:17-18` defines `daily_points` and `purchase_points`. The `profiles` policy at lines 139-141 grants `FOR ALL` when `auth.uid() = id`; row-level filtering does not constrain which columns the user may update.

**Recommendation:** Replace the broad write policy with column-limited updates or a trusted database function. Reward balances should be writable only through controlled server-side logic.

##### 11. `platform_settings` lacks row-level security or API-role restrictions

**Evidence:** `SQL/0001_initial_schema.sql:81-87` creates settings including saved-design limits and the exchange rate. The migration enables RLS on several user tables at lines 134-137 but not on `platform_settings`; no later migration in the reviewed set enables RLS or revokes API-role access. If the Supabase API roles have table grants, the settings may be directly accessible or modifiable.

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

The owner should run [`SQL/0005_guide_content.sql`](../SQL/0005_guide_content.sql) manually in the Supabase SQL Editor after migrations `0001` through `0004`. This task does not apply database changes. The migration is safe to re-run for its seed rows: category and post inserts use stable slugs with `ON CONFLICT (slug) DO NOTHING`, so existing owner edits are not overwritten.

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
where slug = 'editor-guide';
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
where slug = 'editor-guide';
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

### 2026-11-15 — Editor canvas behavior audit and scope gates

- Studied public editor documentation for Canvas transforms, Text insertion/editing, Layers, Alignment/Tidy, Text Transformation, Text Shadow, Text Decoration, and Glyphs.
- Compared those behaviors against the current MH Fashion layer model and renderer without changing implementation code. The current system can absorb basic reference-style move/scale/rotate, group/child selection, layer synchronization, direct Text insertion, alignment, tidy spacing, flip, and limited text effects.
- Recorded architecture expansion points and approval gates for character-level text runs, text-box wrapping, full Arch/Wave/Circle/Flag transformations, stacked shadow/decoration effects, vector node editing, multi-artboard/infinite canvas, and collaboration/version history.
- Added the detailed comparison and decision checklist to a separate editor notes file (removed on 2026-11-21; the plan and doc now live in the former editor plan file (now Part II of `Plan/PLAN.md`) and `Doc/EDITOR.md`). No advanced feature implementation was started before owner approval.

### 2026-11-15 — reference-inspired MH Fashion editor visual pass

- Approved scope now includes the full reference-inspired Canvas direction, but the MH Fashion print-canvas and Front/Back Mockup model remains the source of truth. The visual direction is intentionally inspired rather than copied: dark graphite surfaces, rounded asset cards, clearer context-aware panels, stronger typography hierarchy, live-state accents, and neon-lime MH Fashion focus states.
- Refined the Edit rail, asset cards, Layers dock, group rows, and Adjustment dock with responsive rounded surfaces, gradient headers, accent glow, compact metadata, stronger selected states, and touch-safe sizing for Phone/Mobile as well as Web/Desktop.
- No third-party brand assets or copied proprietary UI were introduced. Advanced behavior work remains staged behind the approved model-expansion plan: text boxes/runs, transformations, effects, alignment/tidy, vector foundations, and future artboard foundations.
- Files: `Plan/PLAN.md`, `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorLayersPanel.tsx`, `apps/web/src/components/EditorEditSidebar.tsx`.

### 2026-11-15 — reference-inspired text font browser

- Expanded the Text Adjustment panel with a searchable/filterable font browser, recent-font chips, selected-font highlighting, and live font previews. Choosing a font updates the selected text layer immediately without re-entering text.
- Kept the existing direct-canvas text workflow and all typography controls intact. The font browser is scrollable and touch-safe on Phone/Mobile while remaining compact on Web/Desktop.
- Validation: Next.js production build passed; canvas-shell **14/14**; editor-layers **11/11**; `git diff --check` passed. Existing lint state remains **0 errors / 26 warnings**.

### 2026-11-15 — Preserve MH Fashion Layer Box styling

- Owner clarification: the Layers Box must retain the MH Fashion desktop-editor-style visual treatment rather than the new reference-inspired surface styling. Restored the previous Layers Box presentation while preserving all existing behavior: layer selection, drag reorder, folder groups, masks, links, appearance controls, and adjustment entry point.
- reference-inspired styling remains scoped to the Edit rail, design/element cards, Adjustment panel, Text controls, and Canvas interaction affordances. The Layers Box is intentionally excluded from that visual treatment.
- Validation: canvas-shell **14/14**, editor-layers **11/11**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-15 — Compact reference-style Adjustment sections and text effects

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

### 2026-11-16 — reference-inspired Pan/Hand tool interaction

- Improved the Pan/Hand tool without changing the Layer Box. The Hand tool now has a clearer reference-inspired active icon state, a pan-specific tooltip, accent glow, and grab/grabbing cursor feedback.
- Preserved and clarified the interaction model: Hand tool + left drag, Space + left drag, middle-button drag, and touch Pan mode all move the editor viewport. The viewport now exposes `data-pan-mode="hand|scroll"` for reliable state styling and testing.
- Refined the Phone/Mobile Pan view control into a rounded active pill with a dedicated hand icon badge while retaining zoom and reset controls.
- Validation: canvas-shell **15/15**, editor-layers **12/12**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-16 — reference-inspired Pen tool foundation

- Reworked the Pen tool from a freehand stroke fallback into a vector anchor workflow. Click adds anchors, the active path previews with a dashed segment and anchor nodes, clicking near the first anchor closes the path, and double-click finishes an open path.
- Finished paths are created as editable `shape` layers, selected immediately, revealed in the Layers stack on desktop, and styled with the active foreground color. Switching tools clears an unfinished path so partial geometry is not accidentally committed.
- The workflow is touch-safe because the preview SVG is pointer-events-none and the actual pointer target remains the canvas. Existing Pan, Move, Brush, Mask, and Layer Box behavior was preserved.
- Validation: canvas-shell **15/15**, editor-layers **12/12**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-16 — Stackable reference-inspired text effects and Text tool removal

- Expanded the selected-text Effects section from a single Shadow/Outline choice into a reusable stack of seven editable effect types: Shadow, Outline, Glow, Offset, Echo, Extrude, and Stripe. Each effect can be added more than once, enabled/disabled, recolored, configured with its relevant controls, reordered, and removed; clearing the stack leaves the editable text intact.
- Added the stack to the shared text-layer model and immutable update/duplicate paths. The common SVG preview renderer now draws those effects on both the print canvas and Front/Back mockups, preserving existing legacy Shadow/Outline settings for older text layers. The effect controls retain compact cards and coarse-pointer target sizes for Phone/Mobile.
- Removed the Text button and its canvas-click insertion route from the bottom Tools bar. Text insertion remains available through the Edit sidebar's `Add Text` action, which focuses the existing inline text editor.
- Files: `apps/web/src/components/EditorAdjustmentsPanel.tsx`, `apps/web/src/components/EditorLayerPreview.tsx`, `apps/web/src/components/EditorToolsBar.tsx`, `apps/web/src/components/EditorCanvas.tsx`, `apps/web/src/lib/editor-layers.ts`, `tests/canvas-shell.test.cjs`, `tests/editor-layers.test.cjs`, `Plan/PLAN.md`.
- Validation: all five relevant unit suites passed **39/39** (Guide 9, browser guards 1, canvas spec 1, canvas-shell 15, editor layers 13); TypeScript passed; Next.js production build and OpenNext Cloudflare Worker build passed; `git diff --check` passed. ESLint reported **0 errors / 26 existing repository warnings**.
- Limitations: effect rendering is SVG-based and remains live/editable text, but the current transforms are visual presets rather than true per-character warps; gradient/texture fills, multi-color vector exports, and final production print export remain outside this implementation.

### 2026-11-17 — Tools Bar structure reset before tool-by-tool implementation

The unfinished Subpath/Node Editing, Fill/Stroke property panel, and Bézier-handle work was paused before commit. The visible Tools Bar order is now Move, Hand tool, Pan tool, Pen tool, Brush, Eraser tool, Shape tools, Gradient tool, Color switch tool, Undo, and Redo. Individual tool behavior will be implemented one at a time after the structure is accepted. The Layer Box remains unchanged, and the existing desktop-editor-inspired Pen foundation is retained.

### 2026-11-17 — reference-style Free Transform visual pass

The existing Free Transform behavior was kept intact: all eight resize handles, move behavior, and rotation remain functional. Its appearance now uses the MH Fashion theme accent instead of blue: a thin 2px accent outline, compact square resize controls, a thin rotation stem, and a small rotation dot. Each visible control has a separate transparent touch hit area so Phone/Mobile editing remains finger-friendly without making the visual controls oversized.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Pen nib icon and persistent selected-tool cursor

The Pen tool now uses the Lucide PenTool nib silhouette to match the supplied pen-nib reference more closely. The Canvas cursor no longer falls back to the large hand/grab appearance when another tool is selected: Pen and Brush use crosshair, Eraser uses cell, Shape and Gradient use crosshair, Move uses move, and Hand/Pan use grab only when those tools are actually active. The print-canvas wrapper now follows the same selected-tool cursor state.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Separate Pencil and Pen tools; add Text tool

Corrected the tool naming based on the owner's clarification: the former `Pan` toolbar item is now a distinct `Pencil tool`, with its own Pencil icon and drawing/cursor state. `Pen tool` remains the nib-based vector path tool. The Hand tool is the only toolbar tool that uses the Hand/viewport-pan behavior. A new `Text tool` is now visible in the Tools Bar; clicking the canvas creates a Text layer at that point and opens the existing direct canvas typing workflow. Selected-tool cursor state now covers Pencil, Pen, Text, Brush, Eraser, Shape, Gradient, Move, and Hand.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — blue rotating Free Transform and live angle label

Free Transform now uses a thinner reference-style blue outline (`#4c9dff`) and compact blue/white resize and rotation controls. The complete transform-control group rotates around the selection center together with the selected layer, including the resize handles, rotation stem, rotation dot, and angle badge. While rotating, a small live degree label is displayed near the rotation control; the displayed value is normalized to 0–359 degrees. Existing move, resize, rotation, and mobile touch hit areas remain intact.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Tool-shaped Canvas cursors

Replaced the generic plus/crosshair cursor treatment with custom SVG data cursors tied to the selected tool. Pen now shows a pen nib, Pencil shows a pencil, Brush shows a brush, Eraser shows an eraser, Move shows four-way arrows, Hand shows an open hand, Text shows an I-beam, Shape shows a shape/crosshair, and Gradient shows a gradient swatch. The cursor is applied to both the main editor viewport and the print-canvas surface; pointer/touch interactions remain unchanged and mobile falls back safely to touch behavior.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-17 — Circular rotate-arrow handle refinement

Refined the Free Transform rotation control to match the supplied reference: removed the protruding connector stem and replaced the plain dot with a small white circular control containing a dark circular rotate-arrow glyph and a thin the reference editor-blue outline. The larger transparent hit area remains for reliable pointer/touch rotation, and the live degree badge remains nearby.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-16 — Functional reference-inspired Shape tool

- Replaced the Shape tool's placeholder notice with a compact, touch-friendly preset picker: Rectangle, Rounded rectangle, Ellipse, Triangle, Diamond, Line, Arrow, Star, and Hexagon. The selected preset remains active while drawing; the foreground color styles new geometry.
- Dragging on the print canvas renders a live SVG preview; releasing creates a native editable `shape` layer, selects it, reveals the Layers stack on desktop, and makes it available to the shared mockup renderer. Pointer cancel/lost capture clears an unfinished shape rather than committing it. Existing layer transform handles apply to these vector layers.
- Added a pure geometry helper for the nine presets and regression coverage for all preset paths, reversed drag bounds, fill/stroke behavior, and arrow/ellipse details. The picker includes labels and accessible pressed state, and does not depend on hover.
- Validation after rebasing onto the concurrent main updates: all six relevant unit suites passed **47/47** (Guide 9, browser guards 1, canvas spec 1, canvas-shell 16, editor layers 15, Pen paths 5); TypeScript passed; Next.js production build and OpenNext Cloudflare Worker build passed; `git diff --check` passed. ESLint reported **0 errors / 25 warnings**.
- Current scope: shape choices are geometric vector paths and draw with a drag gesture. Custom path editing, independent fill/stroke styling controls, and more advanced shape adjustment handles are not part of this increment.


### 2026-11-17 — desktop-editor-style Free Transform mechanics

- Kept the owner-approved reference-inspired control visuals: thin blue selection outline, eight compact resize points, white circular rotate-arrow control without a stem, live degree badge, and larger transparent pointer targets. The owner clarified that desktop-editor-like interaction is acceptable when the tool works reliably.
- Corrected transform scaling and rotation to use each layer's actual bounds center rather than the artwork canvas center. The active selection's rotation is reflected by the bounding controls; rotated resize drags are interpreted in the selected object's local coordinates. The actual resize-handle key is read from its parent handle group, fixing the prior fallback that treated every handle as bottom-right.
- Corner handles preserve proportions by default. Holding Shift permits independent X/Y scaling; Alt/Option scales from the selection center. Holding Shift while rotating snaps to 15-degree increments. Scaling/rotation now keep the opposite anchor or group center stable and merge updates into selected layers without clearing transforms on unselected layers. Pen node editing uses the same per-axis scaling and local pivot transforms. Modifier help is exposed on touch-size controls through accessible descriptions.
- Added deterministic math regression coverage for proportional and free scaling, center anchoring, rotated side handles, and rotation snapping. Validation passed: six relevant suites **50/50**; TypeScript passed; Next.js production and OpenNext Cloudflare builds passed; `git diff --check` passed. ESLint returned **0 errors / 25 warnings**.
- Scope limitation: this increment covers move, proportional/free scale, center scaling, and snapped/free rotation. the desktop editor's skew, perspective, distortion, warp, numeric transform fields, persistence to serialized layer data, and synchronization of canvas transform maps into separate mockup previews are not implemented here.
- Behavior reference: desktop image editors, transform of images, shapes, and paths.
### 2026-11-18 — Canvas cursors match Tools Bar icons

Aligned the custom Canvas cursor SVGs with the same Lucide icon geometry used by the Tools Bar instead of using separately drawn approximations. Pen, Pencil, Brush, Move, Hand, Text, Shape, and Gradient now reuse matching icon path shapes and stroke treatment. Eraser follows the requested exception and displays a simple circular cursor rather than the Eraser icon. The cursor remains synchronized between the editor viewport and print canvas.

Validation passed: canvas-shell **15/15**, editor-layers **14/14**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — Photo layer Adjustments panel

Added a Photo-specific collapsible section to Adjustments for selected uploaded image layers. It includes live Brightness, Contrast, Saturation, and Blur sliders plus compact Remove background and Upscale action boxes. Image adjustment state is stored immutably on `EditorImageContent`, rendered as SVG image CSS filters, and exposed with data attributes for future connected service processing. The two action boxes currently toggle their requested state and clearly show when active; actual AI background-removal/upscale processing remains dependent on the image service endpoint.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — RAW-style Photo color controls

Expanded the Photo Adjustments section toward a professional photo editor workflow. Added live Temperature, Tint, Exposure, Highlights, Shadows, Vibrance, Hue, and Vignette controls, plus a Color Mix group with independent Red, Green, and Blue channel sliders. RGB channel values use an SVG component-transfer filter; Temperature/Tint/Hue/Vibrance/Exposure are composed into the live image filter; Vignette renders as a radial gradient overlay. All values persist immutably on the image layer and remain ready for future non-destructive RAW processing services.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — Photo Curves and Levels

Added professional photo-editor-style Levels and Curves to the Photo Adjustments section. Levels includes Black point, White point, and Gamma controls. Curves includes a live graph preview and five editable control-point sliders; the curve is applied through SVG component-transfer table values. Levels are applied through SVG table/gamma transfer stages before RGB channel mixing, so the controls render non-destructively in the Canvas and previews. All state remains immutable on the image layer.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — Selective Color, HSL, AI Enhance, and Smart Filters

Expanded Photo Adjustments with a Selective Color group for Cyan, Magenta, Yellow, and Black; an HSL group for Hue, Saturation, and Lightness; an AI Enhance toggle; and Smart Filter presets with intensity control. Smart presets include Clarity, Cinematic, Vintage, B&W, Warm, and Cool. These values persist immutably on the photo layer and compose into the live SVG/CSS filter chain. AI Enhance and Smart Filters currently provide deterministic local preview behavior while remaining ready for future AI/image-service integration.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.

### 2026-11-18 — Photo Layer Masks and Blend Modes

Added Photo-specific Mask controls inside the Photo Adjustments section. Uploaded photo layers can now add a non-destructive layer mask, enter mask editing directly from Adjustments, or remove the mask. Existing black-hide/white-reveal brush behavior and the Canvas mask rendering are reused, so photo masks affect the image and its mockups consistently. Added a Blend mode selector to Appearance with Normal, Multiply, Screen, and Overlay; the selected mode is applied to the photo rendering group and persists through the existing immutable layer update path.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-18 — Photo layers are non-drawable; sectioned Photo Adjustments

Three owner changes landed together. Drawing tools no longer touch a photo layer: `EditorCanvas.startArtworkStroke` returns early for `brush`, `pencil`, `pen`, `shape`, `gradient`, and `eraser` when the selected layer's kind is `image`, `chooseTool` falls back to Move with an explanatory notice, and `EditorToolsBar` receives a `drawingToolsDisabled` prop that greys those buttons out (they are the only disabled tools; Move, Hand, Text, colours, and undo/redo stay live). A photo is therefore edited only through Photo Adjustments.

Photo Adjustments was reorganised into independent photo-editor sections that each open on their own: Basic, Tone Curve, Color Mixer, Color Grading, Levels, Selective Color, Channel Mixer, Detail, Effects, Optics, and Calibration. The service actions — Upscale, Remove Background, AI Enhance, Smart Filter, and the Add/Edit/Remove layer mask buttons — moved into a separate `Photo services` box outside the adjustment sections. Color Mixer gained a Hue/Saturation/Luminance mode with an eight-band per-color row (red, orange, yellow, green, aqua, blue, purple, magenta). Color Grading gained Blending and Balance. Tone Curve gained parametric Highlights/Lights/Darks/Shadows regions next to the draggable point graph. Detail gained Color Noise Reduction. Optics (Remove Chromatic Aberration, Lens Corrections) and Calibration (Red/Green/Blue Primary hue and saturation) are new sections.

The math is in `photo-adjustments.ts`: parametric curve regions are smooth bumps folded into the single tone transfer table, and the per-color mixer, primary calibration, lens correction, and chromatic-aberration controls fold into the single colour matrix and CSS filter. Since an SVG filter cannot isolate a single hue per pixel, the per-color and primary controls act as a weighted global shift — a documented approximation, stated as such in the code comment. New fields (`splitBlending`, `mixerHue`/`mixerSaturation`/`mixerLuminance`, `curveShadows`/`curveDarks`/`curveLights`/`curveHighlights`, `colorNoiseReduction`, `removeChromaticAberration`, `lensCorrections`, and the six primary values) were added to `EditorImageContent`, `PhotoAdjustmentKey`, the reset, and the change detector.

Validation passed: canvas-shell **20/20**, photo-adjustments **18/18**, editor-layers **20/20**, editor-pen-path **5/5**, editor-price **4/4**, and the full repository Node suite **83/83**; TypeScript passed; Next.js production build passed; ESLint **0 errors / 25 warnings** (none in changed files); `git diff --check` passed.

### 2026-11-18 — professional photo-editor-style Photo Adjustments

Rebuilt Photo Adjustments around a professional photo-editor model instead of a flat slider list. Controls are grouped into collapsible panels: White Balance (Temperature/Tint), Light (Exposure in EV, Contrast, Highlights, Shadows, Whites, Blacks), Presence (Texture, Clarity, Dehaze, Vibrance, Saturation, Hue), Tone Curve, Levels, Color Mixer (HSL), Color Grading (highlight/midtone/shadow hue+saturation and balance), Selective Color, Channel Mixer, Effects (Vignette, Grain, Grain size), Detail (Sharpen, Noise reduction, Blur), and Smart & AI. Auto and Reset buttons set a balanced starting point or return every control to neutral.

All the math moved into the pure, testable module `apps/web/src/lib/photo-adjustments.ts`. Exposure is applied in stops (2^EV), and Highlights/Shadows/Whites/Blacks act only on their documented tonal zones, so the whole tone stage folds into one luminance transfer table that the preview applies through a single `feComponentTransfer`. White balance, hue, saturation/vibrance, HSL, selective color, and the RGB channel mix combine into one `feColorMatrix`. Split toning renders as a three-stop gradient overlay, vignette as a radial gradient, and grain as a `feTurbulence` overlay. Presence sliders (clarity/texture/dehaze/sharpen/noise reduction) and smart presets compose a CSS filter. Every value stays an immutable instruction on `EditorImageContent`, so the preview, mockups, and the print canvas render identically and non-destructively.

Tone-curve points are now draggable on a live graph, and the previous neutral values for Brightness/Contrast/Saturation moved to 0 (signed) so a Reset is truly neutral.

Validation passed: photo-adjustments **13/13**, canvas-shell **19/19**, editor-layers **20/20**, editor-pen-path **5/5**, editor-price **4/4**, and the full repository Node suite **77/77**; TypeScript passed; Next.js production build passed; ESLint **0 errors / 25 warnings** (none in changed files); `git diff --check` passed. Control semantics follow standard tone-control practice.

## 2026-11-18 — Pen and Shape drawing reuse the active layer
Pen and Shape gestures now append vector paths to the selected unlocked layer rather than creating a new layer for every completed drawing action. They keep the selected layer in place and do not automatically open the Layers panel; a locked or missing active layer blocks the drawing instead of creating one. Pen remains active after a path is committed, matching the concurrent Pen-continuity directive. Multiple Pen paths can coexist in one layer, and hit-testing, anchor insertion/removal, and Bézier-handle edits carry the path index so only the intended path changes. Explicit Add Layer remains available; text, image, and design insertions continue to create their own editable object layers. After integrating the latest `origin/main`, validation passed: all five relevant test suites **47/47**, TypeScript, Next.js production build, and OpenNext Cloudflare build. ESLint reported **0 errors and 25 warnings**, with no diagnostics in changed source files; `git diff --check` passed.

### 2026-11-19 — Editor Sidebar and Adjustments theme-color correction

Fixed the editor dock color inconsistency visible in the supplied screenshot. The Edit Sidebar rail and expanded panel now use the shared `bg`, `bg-surface`, `border`, and text theme tokens instead of a forced dark rail/light panel combination. The Adjustments dock and its title bar now use the same theme-aware tokens, so Light and Dark modes remain visually coherent with the rest of the editor and the existing Layers dock.

The circular control at the left edge of Adjustments is now explicitly the `Return to Layers` arrow while the panel is open. It has a matching accessible label, browser title, and `data-adjustments-return-arrow` state marker; clicking it continues to close Adjustments and reopen Layers. Desktop and coarse-pointer sizing remain unchanged.

Validation passed: canvas-shell **16/16**, editor-layers **18/18**, Next.js production build passed, and `git diff --check` passed.


### 2026-11-19 — Sidebar preview captions removed

Removed visible design/layer/file captions beneath preview cards in the Edit Sidebar. Designs, Elements, Text layer previews, and uploaded photo previews now show the artwork/image itself without the extra name, source-design, filename, or byte-size rows highlighted in the reference screenshot. The cards remain clickable and retain accessible `aria-label` values so interaction and accessibility behavior are unchanged. Search, Add Text, upload-size policy, and Image Create controls remain available.


### 2026-11-19 — Text transform hugs copy and supports line breaks

Text-only Free Transform selection bounds now use the measured glyph block directly instead of the generic artwork safety inset, so the box follows the actual text width and multi-line height. Text editing remains an inline `textarea`: Enter inserts line breaks, the editor grows with the number of lines, and the SVG canvas/mockup renderer draws each line independently from the same `\n` content. Desktop and coarse-pointer sizing retain the existing transform handles and touch behavior.


### 2026-11-21 — Print bundle, MH Delivery quote and mockup sets

Orders now leave the app as one self-contained bundle. The order drawer's **Print files ZIP** downloads `<order>-print-files.zip` with `README.txt`, the A4 press sheet, the A5 customer receipt, the per-line spec CSV, a per-layer measurement CSV (print area, units/cm, X/Y/width/height in cm, rotation, scale), `manifest.json`, the MH Delivery quote request and each design as a print-sized SVG plus its mockup-position diagram. `Doc/PRINT-BUNDLE.md` documents every column; `Doc/MH-DELIVERY.md` documents the JSON MH Delivery prices from. The receipt prints through the browser's own dialog, so no PDF library ships to the admin bundle, and it never invents a delivery fee.

Storage is split by consumer: `mockups/product/<slug>/<look>.<ext>` for catalogue photos (4:5), `mockups/editor/<garment-slug>/<look>.<ext>` for the editor panel (1:1, colour + GSM), and `mockups/3d/<slug>/<look>.<ext>` with `models/<slug>.glb` reserved for the 3D viewer. `mockupCandidates(..., { set })` and `editorMockupCandidates()` build the URLs; the pre-split flat layout is still a catalogue-only fallback so existing uploads keep working. Ready-made products (`is_customizable = 'none'`, e.g. the Nyein line) stay buyable but lose the Edit Design action and never paint an editor draft on the mockup; `/nyein` lists that line from `sub_brand`.

Remaining limitations: nothing is uploaded to R2 from the app yet (the editor draft still lives in `localStorage`), no quote request is sent to MH Delivery because the endpoint and token are not supplied, the editor panel still draws its own garment instead of the `editor/` photo, and there is no customer-facing checkout. The forward plan and its acceptance tests are in [`Plan/PLAN.md` → Forward plan: print, delivery and storage](../Plan/PLAN.md#print-delivery-storage-plan).

Validation: `node --test tests/*.test.cjs` **220/220** passing, TypeScript clean, Next.js production build passing. The bundle was verified end to end in headless Chromium: the downloaded ZIP holds nine entries, the measurements CSV matches `designLayerSize()`, and the delivery file carries the consignee address and phone.

### 2026-11-21 — Editor plan and editor documentation kept separate, written from the code

The editor plan and the editor documentation now live outside the main plan, on the owner's
instruction, and both are written from the code. No editor behaviour changed.

- the former editor plan file (now Part II of `Plan/PLAN.md`) is the editor plan: where each editor file lives, what works today (checked item
  by item in `apps/web/src`), the ten contracts that must not drift, the verified gaps, the next steps
  E1–E11 with files and acceptance, and six decisions for the owner.
- `Doc/EDITOR.md` documents the editor as built: layout, canvas and workspace, tools, layers, selection
  and transform, text, shapes, pen, brush and eraser, gradients, images, mockups, the header bar, the Edit
  sidebar, undo and state, phone behaviour, keyboard and pointer, and the test suites.
- The editor material that referenced other design products was removed, together with the editor
  specification that used to sit in `Plan/PLAN.md`; §6 there is now a short summary with links.
- What the code check found: Save and Buy are disabled and the editor never restores the browser draft it
  writes (`/create` always opens on one blank layer, and no order carries the artwork), undo covers
  layers only and has no keyboard shortcut, the `circle` text preset paints nothing, Shape Builder is
  limited to two axis-aligned rectangles, and align/tidy, flip, hover highlight, positional snapping, a
  context menu, glyph controls, per-character styling, extra products and the sidebar services are all
  absent.

Validation: documentation only — no source change.

### 2026-11-21 — Editor plan and doc written from the code; component renamed

The owner asked for the editor plan and documentation to describe only the code that works, and for
references to other design products to go. No editor behaviour changed.

- the former editor plan file (now Part II of `Plan/PLAN.md`) and `Doc/EDITOR.md` are the only editor plan and documentation; the older editor
  specification and notes were removed from `Plan/PLAN.md` and from `Doc/`.
- The canvas component is now `components/EditorCanvas.tsx` (the component is `EditorCanvas`, renamed
  from its previous name); `app/create/page.tsx` and the tests were updated, and code comments plus one
  panel sentence no longer name other products.
- The code check corrected the plan: the editor does write a browser draft (`saveDesignDraft`,
  `mh-fashion-design-draft-v1`, 400 ms debounce) and a design-editable product page renders it, but
  `/create` never reads it back, `clearDesignDraft` is never called, `/create` ignores `?product=`, and
  Save and Buy are disabled. Everything else the plan records was re-checked in the source.

Validation: TypeScript passed; ESLint exit 0 on the changed files; Next.js production build passed; the
full Node suite passed **343/343**.

### 2026-11-21 — Print quality checks in the print bundle

The register asked for print-file quality checks. The artwork side of it now ships; nothing in the
editor changed.

- `apps/web/src/lib/print-quality.ts` reads a saved `AdminOrderDesign` and returns issues: a layer that
  leaves the print area (`error`) and a sliver of artwork under 3 mm or 0.2 cm² (`warning`). The layer box
  is the rotated corner box, computed the way `designLayerSvg` draws the layer, so a turned layer that
  only reaches past the edge when rotated is caught.
- The list reaches the press three ways: a `Quality check` section in the archive README, a `quality`
  array in `manifest.json`, and a banner on the press sheet (`buildOrderPrintSheetHtml`). A clean order
  prints "Quality check passed" and shows no banner; layer names are escaped, so a name cannot inject
  markup.
- Thresholds were tuned against the seeded orders: a 5 mm wordmark on `#MH1086` was flagged by the first
  5 mm rule, so "tiny" now means a sliver. All 26 demo orders with a design report zero issues.
- Still open: a low-resolution photo warning (the layer model has no pixel size), DTF vs Sublimation
  colour/bleed rules, and opening the print-size export on a phone.

Validation: `tests/print-quality.test.cjs` **16/16**; the full Node suite **358/358**; TypeScript and
ESLint clean on the new module; Next.js production build passed.

### 2026-11-21 — Other Guide lists posts, and the filter header loses "Clear"

The extra row under the guide categories read "Other Guide" but still opened the editor-guide article, so it looked
nothing like the rows around it. It now behaves like every other guide: the row looks up a catch-all category in the
catalogue and links to that category's post list, and when the catalogue has no such category it links to the full
post list (`/guide#articles`). The article page's menu box follows the same rule, so the row is never a link to a
single article.

The `Clear` link that appeared beside "Latest Guides" when a search or category filter was active is removed; the
header keeps only "View All Posts". `tests/guide-card.test.cjs` covers both rules.

### 2026-11-25 — The asset store learns files, buckets and kind folders

The asset code could only carry text and had one store, so it could not hold a photo and would have published the
catalogue snapshots (whose `issues` list names what is broken). It now follows Plan §12.2.12:

- `AssetStore` gained `getObject`, `putObject(key, body, { contentType, cacheControl, customMetadata })` and `head`.
  `put` still writes JSON for `meta.json` and the snapshots. `assetCacheControl(key)` picks the cache class from the
  prefix: fonts, brushes and textures are immutable, the rest of the public bucket revalidates, the private bucket is
  `private, no-store`.
- The prefixes are split into `PUBLIC_ASSET_KEY_PREFIXES` and `PRIVATE_ASSET_KEY_PREFIXES`, and
  `isSafeAssetKey(key, "public" | "private")` refuses a key from the other bucket.
- `writeAssetCatalogue(source, snapshots, kind, now)` builds from the public bucket and writes the snapshot to the
  private one; `rebuildAssetCatalogues(buckets, ...)` passes both; `resolveAssetBuckets()` returns `null` unless
  `MH_FASHION_ASSETS` and `MH_FASHION_PRIVATE` are both bound.
- `buildMockupCatalogue` groups `mockups/<kind>/<slug>/<look>.<ext>`, so `product`, `editor` and `3d` are kinds and
  never product slugs. An older flat `mockups/<slug>/<look>` is still read as a `product` look and is listed as an
  issue so the shop can move it.
- A design stored as one file under `designs/` is listed as an issue; `Doc/R2-STORAGE.md` now documents the folder
  form (`designs/<slug>/design.svg` plus `meta.json`).

`tests/asset-store.test.cjs` is new (seven tests: bucket guards, cache classes, the binary API, the two memory
buckets), and the catalogue and rebuild tests cover the snapshot location, the kind grouping and the flat-key issue.

Keys are now built, never typed (Plan §12.2.3 rule 6). `apps/web/src/lib/asset-keys.ts` holds `ASSET_SHAPES` — one
entry per key pattern in §12.2.2, with its bucket, accepted extensions, size limit and path — plus `buildAssetKey(shape,
vars)`, the reverse `identifyAssetKey(key)` and `checkAssetFile(key, bytes)`. `npm run assets:check -- <folder>`
(`scripts/check-assets.cjs`, Plan §12.2.11) walks a copy of the bucket, checks every file against those shapes and then
runs the catalogue builders over it, so it fails on the same reasons the rebuild would report. `tests/asset-keys.test.cjs`
has a case per shape (build and recognise back, plus the refusals) and `tests/asset-check-script.test.cjs` runs the
script on a clean folder, a folder with an unshaped file and a licence-less font, and an oversized file.

Files are judged by their bytes (Plan §12.2.5). `apps/web/src/lib/asset-file-type.ts` has `sniffAssetType` (png, jpg,
webp, woff2, ttf, otf, glb, pdf, svg, json, csv, html), `imageSize` (PNG, JPEG, WebP headers) and `cleanSvg`, which
removes scripts, `on*` attributes and external `href`s while keeping the artwork. `checkAssetContent(key, bytes)` in
`asset-keys.ts` puts those together with the shape's size limit and its pixel limit (brush 512 px, texture 2048 px), so
a file named `.svg` that is really a PNG is refused, and an SVG that needs cleaning passes with the change named. The
check script reads bytes rather than text for this reason. `tests/asset-file-type.test.cjs` covers every signature, the
three image headers, the cleaner and the refusals, and the script test covers a mislabeled file and an oversized brush.

The rebuild can now be aimed (Plan §12.2.9). `apps/web/src/lib/asset-events.ts` holds `ASSET_SOURCE_RULES`, one
non-overlapping prefix per catalogue, with `kindForAssetKey(key)` and `kindsForAssetKeys(keys)` for a batch; the tests
assert no rule shadows another. `rebuildAssetCatalogues(buckets, now, log, kinds)` takes that list, so an R2 event
rebuilds one kind and leaves the other snapshots untouched, which is what the Worker's `queue` handler will pass.

The asset service itself is now written (Plan §12.1): `Worker/assets.ts` is the one file, exporting `fetch`, `queue` and
`scheduled`, with `wrangler.assets.jsonc` at the root (both R2 bindings, the queue, the hourly cron) and
`.github/workflows/deploy-assets-worker.yml` (kept in `Doc/ASSETS-WORKER-DEPLOY.md` until a token with the `workflow`
scope can create it). It answers the read routes, the admin write (`PUT /api/admin/assets`,
which builds the key, checks the bytes, writes the file and its `meta.json` and rebuilds that kind), the admin issues
route and the private file route; `asset-session.ts` verifies the Supabase token and `asset-access.ts` decides who may
read a private key. Customer photos go through `app/api/uploads` (`lib/asset-upload.ts`: the hourly quota, the temporary
key, `promoteUploads` on Save), and an order's frozen copy through `lib/order-assets.ts`, which names its documents as
`Doc/PRINT-BUNDLE.md` does and refuses a second write. `.github/workflows/backup-assets.yml` copies both buckets weekly.
`tests/assets-worker.test.cjs` (9 tests) and `tests/asset-upload.test.cjs` / `tests/order-assets.test.cjs` cover them,
and a `wrangler deploy --dry-run` bundles the Worker with its bindings.

### 2026-11-21 — The footer stays on the home page

The Nyein page had picked up the full `Footer` (brand, SHOP/HELP/LEGAL, newsletter, payment blocks) along with the
home page's layout. That is not the rule: the complete footer belongs to `/` only, and every other screen ends with
the compact copyright strip that `apps/web/src/app/layout.tsx` renders through `CopyrightBar`.

`/nyein` no longer mounts `Footer`. A pass that then put it on every shopper page was reverted as well, so the rule
is back to where the plan states it. Checked in Chromium: `/` shows the full panel, `/nyein`, `/cart`, `/guide`,
`/products` and `/faq` show only "© 2026 MH Fashion. All rights reserved."
`tests/nyein-page.test.cjs` asserts that `apps/web/src/app/page.tsx` is the only file that renders `<Footer />`, and
that the layout keeps `<CopyrightBar />`.

### 2026-11-21 — One product box for the shop and for Nyein

The home page and the Nyein page drew different product boxes. Home used `ProductCard` in the shop's frame; Nyein
used its own `NyeinPieceCard`, with a different add-to-cart pair. The same shopper saw two behaviours for the same
kind of shelf.

`components/ProductStrip.tsx` now owns the shelf: the same grid, the same bordered frame, `ProductCard` inside, and
an optional badge row for the home page's BEST SELLER / TRENDING / POPULAR labels. Both pages render it, so the
boxes look and behave the same: an image area, a wishlist heart, the name, the price range and one Buy link that
opens the product page. `NyeinPieceCard` is deleted.

What differs stays inside the product page, where it belongs. `isDesignEditable` now reads the brand as well as the
flag, so a Nyein piece is ready-made even when its catalogue row never set `is_customizable = 'none'`, and the page
shows no Edit design action and the ready-made note instead. The attributes the shopper fills in are the piece's
own. When the catalogue has no Nyein rows the page still falls back to `NYEIN_PIECES`, whose slugs are not in the
database, so `ProductCard` gained an optional `href` and that shelf points at `/products` rather than a 404.

Tests: `tests/nyein-page.test.cjs` (one shelf component, no editor path on either card) and
`tests/nyein-brand.test.cjs` (a Nyein row is not design-editable).

### 2026-11-21 — The guide menu stops repeating "Editor Guide"

The guide menu box listed every category, and `editor-guide` is one of them, and then added its own shortcut row
that also read "Editor Guide". Two identical rows sat one under the other on the desktop sidebar, and two identical
chips opened the phone strip.

The shortcut row is now labelled **Other Guide** in `app/guide/page.tsx` (sidebar and phone chip) and in
`app/guide/[slug]/page.tsx`. It keeps the `/guide/editor-guide` href and the `data-guide-editor` hook the tests use,
and the category row keeps its own name, so nothing else moves. `tests/guide-card.test.cjs` counts the label, so a
third copy or a relapse fails the suite.

### 2026-11-21 — A dotted pen path paints dotted, and its end markers sit on the path

The plan had claimed the pen's Line and Ends settings reached the paint. A pixel check found they did not.

A shape layer always resolves a shape style (`resolveEditorShapeStyle` never returns null), and the preview drew
`strokeDasharray={shapeStyle ? shapeDash : path.dash}`. Because `defaultEditorShapeStyle` hardcodes `solid`, every
drawn dashed or dotted path painted as a solid line on the canvas, in the mockup and in the exported PNG/SVG. The
preview now prefers the path's own dash and falls back to the shape preset, the pen's `lineStyle` is stored on the
path so the Shape box reads a dotted path back as dotted, and `defaultEditorShapeStyle` derives the style from the
dash string for artwork saved before that field existed.

Separately, `editorPenEndMarkers` returned the anchors in their stored 0..1 space while `editorPenPathData` paints
them in the 1000x1200 view, so every arrow, circle, square and bar was drawn in the canvas' top-left corner. Both
the markers and their facing angles are now mapped into the path view.

Measured at 1440x900 in Chromium, frame-differenced with the artwork hidden: 11 dots with nine 6 px gaps between
8 px-tall dots, and 22 px circle markers centred on both path ends, with nothing left at the corner. Console clean.
Tests: `tests/pen-end-shapes.test.cjs` (normalized anchors, markers in the path view) and
`tests/editor-tool-options.test.cjs` (the path's dash wins, the Shape box reads the style back).

### 2026-11-21 — One slider control for the whole editor, photo panel included

Plan E21 item 1 asks that every slider come with a number field. The Adjustments panel has had that since
2026-11-24, but the photo panel (`EditorPhotoAdjustments.tsx`) kept its own `Slider`: a bare range input with
the number printed beside it, no typing, no stepping, no reset, so the two halves of the panel looked and
behaved differently.

`RangeField` now lives in `components/EditorRangeField.tsx` and both panels import it, which leaves exactly one
`type="range"` in the editor source. All 48 photo adjustments use it, the five tone-curve points and the eight
colour-mixer bands included (they were plain range inputs inside a label), and each one double-clicks back to
Camera Raw's neutral rather than always to zero: white point 100, gamma 1, shadows hue 220, highlights hue 45,
blending 50, grain size 25, channel 100.

Verified in Chromium at 1440x900 with an uploaded photo: 13 sliders and 13 number fields in Basic, typing 1.5
into "Photo exposure value" moved the slider to 1.5, a double-click restored 0, Tone Curve showed 5 and Color
Mixer 8, console clean. `tests/editor-tool-options.test.cjs` holds the shared field to the only range input and
the photo panel to none of its own.

### 2026-11-21 — Nyein boxes carry Buy / Add to Cart, and the Guide page keeps its articles

Two owner reports, both fixed.

- **Nyein boxes were empty placeholders.** The strips now render `NyeinPieceCard`, which shows the piece, its price
  and two buttons — Buy (adds the piece and opens the cart) and Add to Cart (adds the piece and confirms with
  "Added to Cart"). Because the catalogue carries no Nyein rows yet, `lib/nyein-pieces.ts` supplies eight ready-made
  pieces with `isCustomizable: "none"`; the catalogue takes over, with product-page links, as soon as it has Nyein
  rows. Nothing on a card opens the editor. Verified in Chromium: 10 cards, each with both buttons; Add to Cart put
  "Nyein Oversized Tee" in `mh-fashion-cart-items` and the cart page listed it; Buy landed on `/cart` with the piece.
- **The Guide page listed only its categories.** Production had the guide tables but no published posts, and the
  loader treated that as a finished empty catalogue, so no article appeared. It now falls back to the built-in
  handbook (12 articles across six categories: Editor, Size, Product, Design, Payment, Delivery) whenever the live
  posts list is empty, and a live post still wins over the handbook when one exists. Production also returned 500 for
  every guide article, so the loader now asks Supabase for `select("*")` (a column the deploy expects but a drifted
  table lacks fails the whole query) and every failure — missing table, denied role, dropped connection, schema
  drift, unusable client — serves the handbook instead of an empty page. The live table turned out to be an old seed
  of the handbook: it lacks the size guide and the editor guide, and still publishes a retired "The planned editor
  flow" page. The catalogue now merges, keeping every live post first (it wins on its slug) and filling each slug the
  table does not answer from the handbook, so the shipped guides are never missing. Production went from zero
  articles to twelve, with every article page answering 200.

### 2026-11-21 — The footer shows on a phone, everywhere

The owner kept listing the footer blocks — FB/IG/TikTok/YT, SHOP, HELP, LEGAL, NEWSLETTER, MYANMAR PAYMENT,
DOWNLOAD OUR APP, INTERNATIONAL PAYMENT — as page content they could not see. The blocks were all present in
`Footer.tsx`; the footer itself was `hidden md:block`, so every phone hid it and the blocks read as missing.

- `Footer` is now shown at every width. The extra `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` keeps its last row
  clear of the fixed `MobileBottomNav`, and `md:pb-6` restores the desktop spacing.
- The `alwaysVisible` prop added earlier is gone; nothing has to opt in any more.
- Verified in Chromium at 390 × 844 and 1440 × 900 on both `/` and `/nyein`: all 36 blocks (including Contact Form,
  Shipping Info, Returns & Exchanges, KBZPay/Wave Pay/AYA Pay, App Store/Google Play, Visa/Mastercard) are painted
  and have non-zero boxes, and the bottom nav sits below the last row. `tests/nyein-page.test.cjs` now fails if the
  footer hides at any width or loses that padding.

### 2026-11-21 — The Nyein page wears the home page, but nothing on it can be edited

The owner asked for the Nyein destination to look and feel exactly like the home page while behaving differently:
its content is ready-made, so nothing there is editable.

- `/nyein` now uses the same chrome and rhythm as `/`: `Header`, the same green hero gradient and decorative
  shapes, `CategoryRow`, two product strips, the two promo tiles and `Footer`.
- It is deliberately not editable: no `AdSlotBanner` slots, no "Start Designing" button, no `/create` link, and the
  right-hand promo tile is a plain panel instead of a link. The strips list `getProductsBySubBrand(NYEIN_BRAND)`, so
  only ready-made pieces appear; five skeleton cards stand in while the catalogue is empty so the page still reads
  as home.
- `Footer` gained `alwaysVisible`: the home page keeps hiding the footer below `md` (the phone uses the bottom nav),
  while the Nyein page shows it at every width, because the owner listed its blocks as page content — FB/IG/TikTok/YT,
  SHOP, HELP, LEGAL, NEWSLETTER, MYANMAR PAYMENT (KBZPay, Wave Pay, AYA Pay), DOWNLOAD OUR APP, INTERNATIONAL PAYMENT
  (Visa, Mastercard).
- Verified in Chromium at 1440 × 900 and 390 × 844: HTTP 200, every footer block present at both widths, no sideways
  scroll, console clean. `tests/nyein-page.test.cjs` guards the parity, the read-only rules and the footer blocks.

### 2026-11-21 — Brushes leave the dashboard

The owner pointed out that brushes are working tools of the editor, not shop administration, and that the
dashboard was the wrong home for them.

- `/admin/brushes`, `AdminBrushes.tsx`, `lib/admin-brushes.ts`, the `brushes` list in the admin demo store and its
  test are removed; the module no longer appears in `ADMIN_MODULES` or the dashboard navigation, and the route
  returns 404.
- The editor keeps the whole brush: `EDITOR_BRUSH_PRESETS` (Hard round, Soft round, Spray, Chalk, Marker, Ink,
  Airbrush) and the Brush box's Tip, Size, Opacity, Softness, Feather, Spacing, Flow, Smoothing, jitter, Angle and
  blend controls. Nothing the admin screen offered was used by the editor, so no behaviour changed.
- `tests/brush-home.test.cjs` asserts both halves: the dashboard has no Brushes entry and the editor shelf is
  intact.

### 2026-11-24 — A closed pen path has its own fill

Closed paths were always filled with the pen colour and there was no way to say otherwise (plan E21 item 4).

- `EditorPenSettings.fillClosed` (default `true`, so existing drawings keep their look) and `fillColor`
  (default `null`, meaning the pen colour) are normalised with the rest of the pen options; a colour that is not a
  six-digit hex falls back to `null`.
- The canvas fills a closed path with `fillColor ?? foregroundColor` only when `fillClosed` is on, and leaves an open
  path unfilled.
- The Pen box carries a "Fill closed" toggle that hides the colour input when it is off.

### 2026-11-24 — Pen paths can carry end shapes

A drawn path had a cap, a join and a dash pattern, but its two ends were always plain. The pen now offers
`ends`: none, arrow, circle, square or bar (plan E21 item 4).

- `EditorPenSettings.ends` is normalized with the rest of the tool options (`none` default, unknown values fall back),
  so old saved settings keep drawing plain ends.
- `editorPenEndMarkers(path)` returns the two markers with the position, the angle pointing away from the path and a
  size that scales with the stroke width. A closed path, a single-anchor path and the `none` shape return none.
- The path records the chosen shape at draw time (`EditorShapePath.ends`), and `EditorLayerPreview` paints the markers
  from the same helper, so an existing drawing does not change when the pen options change later.

### 2026-11-24 — The handbook can finally be published to the database

The Guide page reads `guide_categories` / `guide_posts` whenever those tables exist, and nothing in the app ever wrote
them, so a deployed site rendered an empty handbook no matter what the code said. `guides.ts` deliberately keeps an
empty live catalogue empty (see "successful empty live catalog never resurrects starter posts"), so the fix is to seed
the tables rather than to resurrect the starter posts at render time.

- `apps/web/src/lib/guide-seed.ts` — `guideSeedRows(catalog, publishedAt)` maps the starter catalogue to the exact row
  shapes the loader parses, keeping the starter ids so re-running updates posts in place. A post pointing at an unknown
  category throws instead of writing an orphan.
- `scripts/seed-guide.cjs` (`npm run guide:seed`) upserts both tables with the service-role key. Without
  `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` it prints the rows and writes nothing; `--dry-run` does the same
  deliberately.

### 2026-11-24 — A gradient layer's angle is a number, not only a drag

The gradient axis could only be set by dragging, so nudging it to exactly 45° was guesswork.

- `editorGradientAngle(gradient)` reports the axis angle in degrees (clockwise from +x).
- `editorGradientWithAngle(gradient, degrees)` rotates the axis around its midpoint and keeps its length, then runs
  through `normalizeEditorGradient`, so the coordinates stay valid.
- The layer's gradient editor gains an "Angle" slider (`ariaLabel="Gradient angle"`) for every type that has an axis —
  linear, angle (conic) and reflected. Radial and diamond have no direction, so the control is hidden there.

### 2026-11-24 — The Text tool owns its default line height

Line height was only adjustable per layer, and the panel hard-coded the 1.2 fallback in two places, so a new text
layer always started at whatever the panel guessed.

- `EditorTextToolSettings` gains `lineHeight` (default `EDITOR_TEXT_DEFAULT_LINE_HEIGHT`, 1.2), normalised to 0.7-3.
  It sits in `EDITOR_TOOL_OPTIONS_DEFAULT.text`, so the Text tool's reset button restores it too.
- `addCanvasTextLayer` writes `lineHeight: textDefaults.lineHeight` into every new layer; existing text keeps its own
  value, so saved artwork is not reflowed.
- The Text box gains a "Line height" slider (`ariaLabel="Text tool line height"`), and the per-layer field now falls
  back to the shared constant instead of a literal `1.2`.

### 2026-11-24 — The handbook's subject order is fixed

The owner listed the handbook as it should read: Editor Guide, Size Guide, Product Guide, Design Guide, Payment Guide,
Delivery Guide — and the posts inside each subject in the order they were given.

- The catalogue is rendered in array order (no sorting), so the order lives in `GUIDE_STARTER_CATALOG` itself:
  the categories array and the posts array are both arranged to match.
- `tests/guides.test.cjs` pins that order, so a later reshuffle of the array fails a test instead of silently
  reordering the page.

### 2026-11-24 — The handbook is grouped by subject: Editor Guide and Size Guide

The handbook is the shop's post library, so the categories are subjects, not internal process names. Two categories
join Product, Design, Payment and Delivery.

- **Editor Guide** (`editor-guide`) holds the editor's own posts: "Editor Guide: make your first print" and
  "How the editor works: tools, layers and export". The Design Guide keeps the preview and mockup post.
- **Size Guide** (`size-guide`) holds the size posts: "How to read the size guide".
- A post is listed under the category whose subject it teaches, so the landing page's category row reads like the
  handbook's table of contents.

The starter catalogue now holds 6 categories and 12 posts; the guide tests that count them move with it.

### 2026-11-24 — Three more handbook posts: editor, print care, ordering

The handbook is the shop's post library, so the owner asked for the content a customer actually needs: sizes, the
editor, and the rest. Three posts join it, written the same way as the existing eight.

- `how-the-editor-works` (Design Guide, featured): the tools bar, print canvas, layers and mockup, then export and the
  photo-resolution warning.
- `print-methods-and-how-to-care-for-a-print` (Product Guide): which artwork suits direct-to-garment, vinyl or
  embroidery, and how to wash and iron a printed garment.
- `how-to-place-an-order-step-by-step` (Product Guide): product and options, design, mockup and size check, cart,
  delivery details, and keeping the order number.

The handbook now holds 12 posts. The guide tests that count the starter catalogue were updated with it.

### 2026-11-24 — A size-guide article joins the handbook

The guide catalogue had no size or fit article, so `/size-guide` (the chart page) was the only place sizing was
explained, and nothing in the handbook pointed at it.

- `GUIDE_STARTER_CATALOG` gains `how-to-read-the-size-guide` under Product Guide: measure a garment you already wear,
  compare it with the chart, and choose between two close sizes. It is a normal post, so it appears in the catalogue,
  the category filter and the article route like the other eight.
- The guide tests that count the starter handbook were updated (8 -> 9 posts, unique slugs and empty `productLinks`).

### 2026-11-24 — Shift and Alt shape the shape tool's drag, and the Shape box says so

Plan E21 item 5, the hint half. The Shape box only listed presets, and the canvas ignored the modifier keys a print
shop reaches for by habit.

- A shape drag now reads `shiftKey` (equal-sided: the longer side wins, direction kept) and `altKey` (the press point
  is the centre, so the shape grows both ways). Both are applied before `createEditorShapePaths`, so every preset
  benefits and the stored geometry is already what was drawn.
- The Shape box carries one line under the presets: press and drag, Shift for an equal-sided shape, Alt from the
  centre, and a click without a drag draws nothing (the canvas drops drags under 8 units).
- `tests/canvas-shell.test.cjs` asserts the sentence, so the words cannot drift from the behaviour again.

### 2026-11-24 — The Pen box joins corners and draws dashed or dotted lines

Plan E21 item 4, first half. The pen could only change its width and cap, so a dotted outline had to be drawn in
another app.

- `EditorPenSettings` gains `join` (round / miter / bevel) and `style` (solid / dash / dot); `normalizeEditorToolOptions`
  fills them in for saved settings and rejects anything else.
- A drawn path records `dash` and `lineJoin` on its `EditorShapePath`, and `EditorLayerPreview` paints them, so the
  canvas, the mockup and the PNG/SVG export stay in step. `penDashArray(style, width)` scales the pattern with the
  pen width, so a 24 px dotted line keeps the same rhythm as a 3 px one instead of reading as solid.
- The Pen box has a Join row and a Line row beside Cap.
- Verified: the Line row toggles to `aria-pressed="true"`; the dash maths, the normaliser and the renderer wiring are
  covered by `tests/editor-tool-options.test.cjs`. A drawn dotted path was not captured in the browser this turn, so
  a pixel check of the stroke is still worth doing.

### 2026-11-24 — New text wraps at the width the Text tool sets

Plan E21 item 6, the wrap half. The wrap width was a constant inside `EditorCanvas`, so a shop that prints narrow
chest prints could not make new text wrap sooner than 880 units.

- `EditorTextToolSettings` gains `wrapWidth`, defaulted from `DEFAULT_TEXT_WRAP_WIDTH` (880) and clamped to
  120–2000 by `normalizeEditorTextToolSettings`, so an old saved tool setting fills itself in.
- `addCanvasTextLayer` now writes `textDefaults.wrapWidth`; the constant moved to `lib/editor-layers.ts` beside the
  setting that uses it. A layer that already has a `wrapWidth` keeps it, so existing artwork does not reflow.
- The Text box has a "Wrap width" slider with the shared number field and a double-click reset to 880.
- Verified in Chromium at 1440 × 900: the field starts at 880, typing 320 then clicking the canvas creates a text
  layer whose inline editor is 320 units wide, console clean. `tests/editor-tool-options.test.cjs` covers the
  default, both clamps and the field.

### 2026-11-24 — The editor reads fonts from the asset service

Plan 12.1 part 6, the font half. The asset service (`/api/assets/fonts`) was built and unused: the editor still
read the bucket's public `fonts/manifest.json` straight from the browser.

- **Order.** `editorFontManifestSources(base)` in `lib/editor-fonts.ts` returns `/api/assets/fonts` first and
  `${base}/fonts/manifest.json` second (dropped when no bucket address is configured). `loadEditorFontManifest`
  walks them and keeps the first that names at least one font.
- **Why an empty answer is not a failure.** Until the R2 binding exists the route answers `{ fonts: [], skipped:
  [ … "the asset bucket is not bound in this environment" ] }`. Treating that as success would have emptied the
  picker in production, so an empty list falls through to the public file, and only then to the eight system fonts.
- **Nothing else moved.** Font files still load from the bucket's public address (`fontFileUrl`), because decision
  R2-1 keeps public files on the CDN; only the manifest moved.
- Checked on a running server: `/create` requests `/api/assets/fonts` and nothing else when no bucket address is
  set, the Text tool picker still lists the eight system fonts, console clean. `tests/editor-fonts.test.cjs` holds
  the source order and the shared parser.

### 2026-11-24 — Every slider in the Adjustments panel has a number field, and every tool box resets

Plan E21 items 1 and 8, the part that needed no new control family. The panel had four sliders that could only be
dragged; a brush size of 137 px was unreachable, and only the Brush/Pencil box could go back to its defaults.

- **One control.** `RangeField` in `EditorAdjustmentsPanel.tsx` is now the only `type="range"` in the panel. It
  draws the label, a number field and the slider, so all 34 slider uses (Brush, Pencil, Eraser, Pen, Gradient,
  Text, Appearance) gained the field at once.
- **Typing is safe.** The field keeps what is typed in a draft until blur, so clearing "100" to type "40" is not
  read as 0 and written back; every value passes `snap`, which bounds it to the slider's range and lands it on the
  slider's step. Typing 999 into brush size stores 400.
- **Keys and mouse.** ArrowUp / ArrowDown step by one `step`; Shift steps ten times. Double-click returns the field
  to the tool's default (brush 52 px, eraser 120 px, pen 5 px, text 110 px, opacity and fill 100%). The tooltip says
  so, and the slider follows the field while it changes.
- **Reset on every box.** Pen, Eraser, Gradient and Text now have the same "Reset … to default" button the Brush
  and Pencil box already had; each writes the shared `EDITOR_TOOL_OPTIONS_DEFAULT` group, so a reset cannot drift
  from the factory value.
- **Phone.** The number field is 64 × 44 px under `pointer: coarse` (27 px on a mouse), and the 256 px panel keeps
  it inside its edge with no horizontal overflow.
- Verified in Chromium at 1440 × 900 and 390 × 844 touch: 12 sliders, 12 matching number fields, no slider without
  one; brush size 52 → 53 with ArrowUp → 63 with Shift+ArrowUp → 53 with Shift+ArrowDown; 999 clamped to 400;
  double-click back to 52; all four resets present; console clean. `tests/editor-tool-options.test.cjs` asserts one
  range input, the `${ariaLabel} value` field, the Shift ×10 step, the double-click reset and the four reset buttons;
  `tests/canvas-shell.test.cjs` now finds the pen width by its `ariaLabel` prop.

### 2026-11-22 — Download my design (PNG at 300 dpi, and SVG)

The customer had no copy of the artwork: the press bundle was the only file, and it is an admin document.
The editor now has a Download chip at the end of the tools bar, next to Undo and Redo, with two choices.

- **PNG · 300 dpi (print)** — 4500 × 5400 px, which is 38.1 × 45.72 cm at 300 dpi: exactly the print area of
  `PRINT_CANVAS_SPEC`, so the numbers match the press sheet and the layer-measurement CSV.
- **SVG · vector** — the same artwork as `<svg width="38.1cm" height="45.72cm" viewBox="0 0 1000 1200">`, so
  it opens at the physical print size in any vector tool.
- **Only the artwork.** `EditorDesignExport` renders the same `EditorArtworkLayers` into a hidden `<svg>`
  without the transform box, guides, resize handles or inline text editor, and `serializeArtworkSvg` copies
  that group. There is no second drawing path to drift from the canvas.
- **Honest failures.** An empty canvas says "Add something to the canvas before downloading"; a rasterise
  error says the download failed instead of saving a broken file.
- Verified in Chromium at 1440 × 900 and 390 × 844 touch: the menu items are 44 px tall on a phone and stay
  inside the viewport, the brush stroke and a text layer land in the PNG where they sit on the canvas, and the
  SVG holds no `foreignObject`, handle or outline node. `tests/design-export.test.cjs` covers the size maths
  (`exportPixelSize`, `pixelsToCentimetres`), the document, the file name and the data URL.

### 2026-11-22 — One shop clock, a reprint record, a phone-sized sheet, a durable limiter

Four register items closed, each with tests.

- **One clock (`Asia/Yangon`).** `adminDayKey`, `formatAdminDate`, `formatAdminDateTime`,
  `adminDayLabel` and `revenueByDay` in `lib/admin-demo-data.ts` now read and print in Myanmar time
  instead of the device's zone, so a phone that travelled, a laptop in Yangon and the server render
  agree. Ad windows (`lib/admin-ads.ts`) and promotion windows parse their date inputs at
  `00:00 +06:30` and store UTC, so "21 Nov" means the same day everywhere. `tests/admin-orders.test.cjs`
  proves the answer does not change with `process.env.TZ`.
- **Reprint record.** `AdminOrder.reprints` keeps one entry per run of the press sheet (time, admin
  name, last 20). The sheet prints "First print · 21 Nov, 14:30 by QA Admin" or "Reprint 2 · …", and the
  order drawer shows "Press sheet: 2× · …" with the button reading "Reprint sheet". `recordOrderReprint`,
  `orderPrintRuns`, `lastOrderReprint` and `replaceOrder` are pure; `tests/admin-order-print.test.cjs`
  covers the record and the sheet line.
- **A sheet that fits a phone.** Both printable documents carry a viewport meta and a
  `max-width: 640px` block that stacks the spec table, the artwork and the receipt header instead of
  laying the page out at 980 px. If the browser refuses the popup (iOS does when the tap is not the
  first thing that happens) the file is saved as `.html` instead of nothing happening;
  `openOrderPrintSheet`/`openOrderInvoice` return `"opened" | "downloaded"`. Verified in real Chromium
  at 390 × 844 touch: `scrollWidth === innerWidth === 390`, the spec line stacks, and the blocked case
  writes `print-sheet-mh1086.html`.
- **Durable limiter.** `lib/rate-limit.ts` keeps the module-memory limiter as the default and adds a
  `RateLimitStore` seam with `kvRateLimitStore(kv)`, so a Cloudflare KV namespace can hold the counters
  across isolates. `enforceRateLimit` is now async and the four payment routes await it;
  `tests/rate-limit.test.cjs` shows a counter that survives a memory reset and still refuses the fourth
  call. Connecting a real KV namespace is a deployment step, not a code change.

### 2026-11-21 — Register audit: what the code already does

Checked the remaining-work register against the source and corrected the entries that had drifted.

- Rate limiting is done, not open: `lib/rate-limit.ts` is a fixed-window limiter and `enforceRateLimit`
  guards `intent`, `status`, `simulate` and `webhook`. The caveat is that it is per isolate, not a global
  quota.
- The order QR is shipped on the press sheet (`lib/order-qr.ts`); the reprint flow followed on
  2026-11-22, so only the refund-request flow remains in that item.
- Uploaded SVG never renders inline: every path is an `<img src="data:image/svg+xml, ...">`, where a
  script cannot run. The rule for any future inline render is written into the register.
- The forward plan's open question "is there a checkout today?" was stale: `/checkout`, `placeOrder`, the
  payment intents and the verified webhook all exist. What is left is the provider accounts and moving
  intents out of memory.

### 2026-11-21 — Guide cards sized like product cards, and an Editor Guide

- `components/guide/GuideCard.tsx` is a square tile now: `aspect-square`, the product card's
  `rounded-xl border bg-bg-surface p-1.5 sm:p-2.5` shell, a cover with the category pill and the read
  time on it, a two-line title and one meta row. The `aspect-[1.9/1]` cover band and the excerpt are
  gone, so a guide card is the same box as a product card instead of twice as tall.
- The guide grid in `app/guide/page.tsx` is the product grid: `grid-cols-2 sm:grid-cols-3
  xl:grid-cols-4`. Phones used to get one full-width row per post.
- `lib/guide-starter.ts` now carries `editor-guide`, "Editor Guide: make your first print", written from
  the editor that ships: the print canvas, the tool column, text wrapping, the Layers panel, the free
  transform handles, the front and back mockups, the draft that saves in the browser, and the fact that
  the Save and Buy boxes are not connected yet. It replaced `the-planned-editor-flow`, so the Guide no
  longer shows a plan beside the real thing; `Doc/DOCUMENTATION.md`'s SQL examples were updated to the
  new slug.
- The article banner and the Design Guide category blurb lost their "planned" wording: the banner now
  reads "Where a feature is still being built, this article says so", which is true for every article.
- Verified in Chromium at 1440x900 and 390x844 (deviceScaleFactor 2): square cards in both, the article
  page renders its five sections and "On this page" list, and `/guide?q=editor` returns only the new
  article. `tests/guide-card.test.cjs` (3 tests) guards the card geometry and the grid;
  `tests/guides.test.cjs` gains a test for the article's content and the retired slug. Full Node suite
  **363/363**; `tsc --noEmit` clean; Next.js production build passed.

### 2026-11-21 — Editor Guide in the guide menu, shorter guide hero

- `app/guide/page.tsx` links `/guide/editor-guide` from the desktop menu box (a row after the category
  links) and from the phone shortcut row (second chip, visible without scrolling). Both anchors carry
  `data-guide-editor`.
- The guide hero is smaller: `min-h-[96px] sm:min-h-[124px] lg:min-h-[132px]`, heading
  `text-lg sm:text-2xl lg:text-[26px]`, and the decorative egg, shirt and "Your Style" art reduced to
  match. The 196px desktop banner and the `lg:text-5xl` heading are gone (320px → 200px at 1440px wide).
- `tests/guide-http.test.cjs` strips `data-guide-editor` anchors before counting article links, so the
  always-present menu link does not inflate the category-filter assertions; it also asserts the menu link
  is on the page. `tests/guide-card.test.cjs` guards the two menu entries and the compact hero heights.
  Full suite **365/365**; `tsc --noEmit` clean; production build passed.

### 2026-11-21 — Icon language and currency switchers

- `components/SwitcherIcons.tsx` (new): `FlagIcon` draws a 14x10 Union Jack (`en`) or Myanmar tricolour
  (`my`) as inline SVG, `CurrencyIcon` returns `Banknote` for `Ks` and `CircleDollarSign` for `USD`, and
  `LANGUAGE_LABEL` / `CURRENCY_LABEL` name each value for `aria-label` and `title`.
- `HeaderActions.tsx`: the `EN / MM` and `Ks / $` pills were replaced by two 22px circle buttons that
  toggle on tap. The icon is the state, so the header always shows the active language and currency;
  `data-header-language` and `data-header-currency` expose it to tests.
- `MobileNav.tsx`: the drawer's Language row shows both flags (`aria-pressed`, accent ring on the active
  one) and the Currency row keeps its label with the state in the icon.
- Verified in Chromium: clicking the flag switches the UI to Myanmar and the flag becomes the tricolour;
  clicking the currency button turns the banknote into the dollar coin; the phone drawer (390x844, 2x,
  touch) shows the ringed flag pair and the money icon.
- `tests/canvas-shell.test.cjs` covers both controls and the drawer. Full suite **366/366**;
  `tsc --noEmit` clean; ESLint clean; production build passed.

### 2026-11-21 — Checkout does not ask for an address that is already on file

- New `apps/web/src/lib/delivery-address.ts`: stores one complete address in `localStorage`
  (`mh-fashion-delivery-address-v1`), validates it (`isCompleteAddress`), formats it for display
  (`addressSummary`) and can read the newest order this browser placed (`lastOrderAddress`) as a fallback.
- `CheckoutClient.tsx` fills the address once on mount and renders a card ("Min Thu Aung · 09 …",
  "No 12, Baho Road, Sanchaung, Yangon", "Already on file — this parcel ships here unless you change it.")
  with a **Change** button instead of five empty fields. `Change` opens the prefilled fields with a
  **Keep the saved address** link; placing an order re-saves the address that was used.
- Data attributes: `data-checkout-saved-address`, `data-checkout-saved-address-line`,
  `data-checkout-address-change`, `data-checkout-address-cancel`.
- The customer account does not exist on the server yet, so the address is per device, not per login.
- Verified in Chromium at 1440x1000 and 390x844 (2x): card, prefilled edit form, phone layout; plus the
  storefront e2e (desktop + phone). Full suite **367/367**, `tsc` clean, ESLint 0 errors, build passed.

### 2026-11-21 — MH Fashion categories are icons, without counts

- `/mh-fashion` renders its category row as six round icon buttons (All = Sparkles, T-Shirts = Shirt,
  Kids = Smile, Phone Covers = Smartphone, Bags = ShoppingBag, Cups = Coffee), 44px, matching the home
  page strip; the selected category is filled with the accent colour.
- The text labels and the stale counts (48/22/9/7/6/4) are gone from both the row and the sidebar filter.
  Each button keeps `aria-label` and `title` so the name is still available, plus `data-category`.
- Verified in Chromium at 1440x560 and 390x600 (2x); the e2e asserts the row is icons only.

### 2026-11-21 — Ads module (banner photo / animation video) and the Jersey tab inside Posts

**What an ad is**
- One piece of media — a banner photo or an animation video — plus the window it runs. No headline, body or
  button: the artwork carries the message. An optional link makes the banner clickable.
- Two slots: **Home hero** (replaces the green hero while live) and **Home strip** (under the category row).
  Both crop to fill, so keep the subject centred; phones crop the sides.

**Admin** (`/admin/ads`, `AdminAds.tsx`, `lib/admin-ads.ts`)
- Add a photo by path (`/ads/hero.jpg`), by `https://` URL, or by picking a file up to 900 KB (stored with the
  ad as a data URL). A video needs a URL (`.mp4` / `.webm`) and can carry a poster photo; uploads belong in R2,
  which is not connected yet, so a file committed under `apps/web/public/ads/` works today.
- Status is derived: Disabled → Scheduled → Expired → Live. Pause/Enable, Edit and Delete persist in the demo
  store (`mh-fashion-admin-demo-data-v1`), and the home page picks the change up on the next load (or through
  the `storage` event when both tabs are open).
- `activeAdFor(ads, slot)` is the only rule for "what shows now": the newest live ad, otherwise nothing.

**Storefront** (`components/AdSlotBanner.tsx`, `lib/storefront-ads.ts`)
- `<AdSlotBanner slot="home-hero" variant="hero">` wraps the default hero as its fallback; a live ad replaces it.
  `<AdSlotBanner slot="home-strip" />` renders nothing when the slot is empty.
- Photos render as `<img alt=…>`; videos as `<video autoplay muted loop playsinline>` with the poster as the
  first frame. The alt text from the admin is what screen readers and search engines see.

**Jersey inside Posts**
- Posts tabs: Guide posts, T-shirt posts, Nyein posts, Jersey mapping. The panel keeps every control but no
  longer has a sidebar entry; `/admin/jersey` redirects to `/admin/posts?tab=jersey`.

Verified: `node --test` 373/373, tsc clean, ESLint 0 errors, `next build` OK, storefront e2e (desktop + phone)
including hero-ad replace/restore, and Chromium checks of the admin table, the drawer with a picked photo, the
home hero photo, the video branch, and hero + strip ads at 1440x1000 and 390x844.

### 2026-11-21 — Short animations as animated GIF/WebP (no video upload needed)

A loop of a few frames does not need a video file or R2: an animated **GIF or WebP** is an image, so
"Banner photo" accepts it — pick it from the computer (≤ 900 KB), or point at `/ads/loop.gif` or an `https://`
URL. `<img>` loops it natively, so the home hero plays it exactly like a still photo.

- A 6-frame 1600x600 banner GIF measured **19 KB**, so the 900 KB inline limit is generous for this.
- The admin labels these: the table's media column shows **GIF** and the preview header shows *animated photo*.
- `looksAnimatedMedia(url)` (`.gif` / `.webp`, including `data:image/gif…`) and `adMediaKind(ad)` are the only
  places that decide the label — nothing in the storefront special-cases animation.
- The **Animation video** option stays for `.mp4` / `.webm` links once R2 is connected; a data URL is refused
  for video because it would blow the localStorage budget.

### 2026-11-21 — Fit: fill the box, or show a ready-made banner whole

A ready-made leaderboard (728x90 and friends) is a very different shape from the hero, so an ad now carries
`fit`:

| Fit | Renders | Use it for |
|---|---|---|
| **Fill the box** (default) | `object-cover` inside the slot's height/aspect | artwork designed at the slot size (1600x600 / 1600x240) |
| **Show the whole banner** | the image at its own aspect (`block h-auto w-full`), no fixed box | a bought/borrowed template such as a 728x90 GIF |

With *Show the whole banner* a 728x90 GIF appears whole — 1350x167 in the desktop hero, 358x44 on a phone —
with no cropping and no dark letterbox bands. The drawer's preview header says *whole banner* or *filled*, and
the banner carries `data-ad-fit` so the choice is testable.

### 2026-11-21 — One board for every banner place

| Place | Page | Where |
|---|---|---|
| `home-hero` | `/` | replaces the green hero while a banner is live |
| `home-strip` | `/` | under the category row |
| `home-lower` | `/` | between New Arrivals and the promo cards |
| `new-top` | `/new` | under the Fresh Looks hero, above the grid |
| `products-top` | `/products` | above the product grid |
| `guide-top` | `/guide` | under the guide header, above the articles |

`/admin/ads` lists every place as one row — its page, position, artwork, status and window — with
**Change**, **Pause**, **Clear** on the row and **Add banner** on an empty one. Nothing has to be opened on the
page itself.

**Adding a place** (developer step, two lines): add an entry to `AD_SLOTS` in `lib/admin-demo-data.ts` and mount
`<AdSlotBanner slot="<id>" />` where it should appear. `AdSlotId` is derived from that array, so the type, the
board row and the drawer's slot list all follow.

The board edits the ad `adForSlot()` returns (live, else next scheduled, else newest on file); the storefront
only ever renders `activeAdFor()`, so a scheduled banner never shows early and a paused one stays editable.

### 2026-11-21 — Many banners in one place, and they change with time

A place is not limited to one banner. `/admin/ads` lists every banner filed under a place, each with its own
dates, and **Add banner** stays available on every row.

What a place shows, and when:

| Situation | What the visitor sees |
|---|---|
| no banner inside its dates | nothing — the page keeps its own markup |
| one live banner | that banner, for as long as it runs |
| several live banners | they take turns, one every *N* seconds |
| a banner starts later | it joins the turn on its start date |
| a banner is paused or expired | it leaves the turn, and comes back if re-enabled |

The turn length is set once on the Ads screen ("Change banner every …"), stored as `adsRotationSeconds`
(default 8 s, clamped 2–120). The turn is derived from the clock (`floor(now / period) % live.length`), so a
reload never restarts the cycle and every visitor sees the same banner at the same moment.

`liveAdsFor()` answers "which banners may this place show now"; `adForMoment()` answers "which one is up".
The board uses `adsForSlot()` (everything filed) so paused and scheduled banners stay editable.

## Work record carried over from the former TODO file

The TODO file was folded into this one on 2026-11-23 so the repository keeps one plan file and one work log. Its work records follow unchanged.

### Work record — 2026-11-21

- [x] **Guide cards sized like product cards.** `GuideCard` is a square tile on the product grid
  (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`); the tall cover band and the excerpt are gone.
- [x] **Many banners per place, changing with time.** A place keeps every banner filed under it; with more
  than one live banner they take turns every N seconds (one setting on the Ads screen), and each banner's own
  dates decide when it joins or leaves the turn.
- [x] **Every banner place on one screen.** `/admin/ads` is a slot board: six places across `/`, `/new`,
  `/products` and `/guide`, each edited in place; adding a place is one `AD_SLOTS` entry plus one mount.
- [x] **Ready-made banners fit.** A per-ad *Fill the box / Show the whole banner* choice, so a 728x90 GIF
  template (e.g. the Gifer one) shows whole instead of losing its edges.
- [x] **Short loops need no video.** An animated GIF/WebP picked as a photo loops in the hero (a 6-frame
  1600x600 file is ~19 KB); the video option stays for when R2 is connected.
- [x] **Ads in the admin menu bar.** `/admin/ads` takes a banner photo or an animation video (path, URL or a
  picked file) plus a run window for the home hero and the home strip; the live hero ad replaces the green hero
  on the home page.
- [x] **Jersey moved into Posts.** A "Jersey mapping" tab holds the mapping panel; `/admin/jersey` redirects.
- [x] **MH Fashion categories as icons.** The "All MH Fashion 48 / T-Shirts 22 …" strip is now six round
  icon buttons with no counts, like the home page.
- [x] **Checkout reuses the saved address.** The address from the last order is shown as a card with a
  Change button, so a returning customer never retypes it (`lib/delivery-address.ts`). 1 unit + e2e.
- [x] **Icon language/currency switchers.** `EN / MM` and `Ks / $` pills replaced by flag + money icons
  that change with the state (`SwitcherIcons.tsx`), in the header and the phone drawer. 2 tests.
- [x] **Editor Guide in the menu box.** Desktop menu box row + phone shortcut chip (`data-guide-editor`).
- [x] **Guide hero shortened.** 320px → 200px on desktop, 126px → 113px on a phone; smaller heading and art.
- [x] **Editor Guide added.** `editor-guide` ("Editor Guide: make your first print") is written from the
  editor that ships and replaced the stale "planned editor flow" article; the "planned" banner wording
  is corrected. 4 new tests; full suite 363/363.


- [x] **Print quality checks in the print bundle.** `lib/print-quality.ts` flags artwork past the print
  area (error) and slivers under 3 mm / 0.2 cm² (warning); the list appears in the archive README, the
  manifest and a press-sheet banner. 16 new tests; full suite 358/358. Editor untouched.
- [x] **Register audit.** Rate limiting, the order QR, the SVG render paths and the checkout entry were
  re-checked against the code and the register corrected; the stale "is there a checkout?" question was
  answered in place.

### Current direct owner request — 2026-11-18

- [x] **Text Free Transform hugs the glyph ink (2026-11-18).** The owner reported again that the Free Transform box was still wrong (the more obvious of the two text defects). Root cause: `editorTextCanvasBounds` used the font **line box** (`fontBoundingBoxAscent`/`Descent` = 102 + 26 = 128 units at the 110px default), while the drawn capitals only reach ~84 units of ink, so the outline was ~44 units too tall (~11px empty above, ~12px below). Fix: `editorTextLineMetrics` now measures both the font line box (still used to align the inline editor caret) and the glyph **ink** box (`actualBoundingBoxAscent`/`Descent`); `editorTextMetrics` unions each line's ink box around its own baseline and ignores blank lines; `editorTextCanvasBounds` returns the ink box. Result: the single-line box is 35px tall on screen (was 47.8px) with symmetric ~5px padding, and a two-line `AAAA`/`gggg` box is 273 units, matching the model. Verified desktop 1280×900 and phone 390×844; re-entry still writes downward (`"ONE"` → Enter → `"ONE\nTWO"`). Node tests **108/108**, `guide-http` **5/5**. See `Doc/DOCUMENTATION.md#work-log`.

- [x] **Text: write downward on re-entry, and a box that truly hugs the glyphs (2026-11-18).** Follow-up to the earlier text fixes after the owner reported both defects still present, with the box the more obvious one. Root causes: the box used the cap-height ink box and floored the height at `fontSize`, so its top sat ~20 units *below* the drawn text top and cut through the caps; and re-entering a layer focused the inline `textarea` with the caret at position 0, so Enter inserted a line *above* the text (the "cannot write downward" symptom). Fixes: `editorTextCanvasBounds` now returns the exact SVG `<text>` box (`y = baseline − ascent`, `height = (lines − 1) × lineHeight + ascent + descent`, no floor/padding) and `editorTextLineMetrics` prefers the font's `fontBoundingBoxAscent`/`Descent`; re-entry places the caret at the end (`textAreaRef` + focus effect); the textarea baseline is aligned to the drawn text; tapping the inline Font size/Color controls keeps the editor open; and the Free Transform box is hidden while the Text tool is active so its handles cannot block re-entry. The line-box part of this entry is superseded by the ink-hugging fix above. See `Doc/DOCUMENTATION.md#work-log`.


- [x] **Restore text-layer fixes and correct the Pen cursor (2026-11-18).** Three owner reports fixed. (1) Multi-line typing: the inline editor is a growing `textarea`, Enter starts a new line (Escape commits), and the artwork renders one `tspan` per line. (2) Text + Free Transform: the transform box hugs the glyphs via `editorTextCanvasBounds`, and a text layer stays text-only (Pen/Brush/Pencil/Eraser/Shape refuse to draw on it). The box now measures the real font with `CanvasRenderingContext2D.measureText`, because the old fixed per-character estimate was too narrow for wide glyphs (a `SAMPLE` label measured 0.76em/char, so the box cut through the text); `MockupArtwork` shares the same measured bounds. These were a reverted change (`432ac36` reverted `c974e3c`) and are re-applied. (3) Pen cursor: the hotspot moved from the icon's tail (`15 22`) to the nib (`2 2`). Implemented across `EditorCanvas.tsx`, `EditorLayerPreview.tsx`, `MockupArtwork.tsx`, `editor-layers.ts`; verified live on desktop and phone. See `Doc/DOCUMENTATION.md#work-log`.

- [x] **Brush tool: desktop editors brush engine, adjustments, presets, and eraser accuracy (2026-11-18).** The Brush tool's options are now a full brush engine. `ArtworkStroke`/`EditorBrushSettings` gained spacing, flow, smoothing, size/opacity jitter, jitter floor, nib angle/roundness, scatter, angle jitter, roundness jitter, fade-out, and a dab blend mode (normal/multiply/screen). `brushDabPoints` resamples the pointer path into spaced dabs along a `smoothBrushPoints` stabilizer with deterministic hashed jitter and a dab cap; `brushDabBlurRadius` scales softness with nib size. `EditorArtworkLayers` renders the dab runs (per-dab square-nib angle/roundness, fade-out, `mix-blend-mode`); the Adjustments panel groups the controls into Presets/Nib/Paint/Edge/Shape dynamics/Blending and ships seven `EDITOR_BRUSH_PRESETS` (hard round, soft round, spray, chalk, marker, ink, airbrush). The eraser now tests the pass against stroke segments via `segmentDistancePx` instead of only vertices, fixing a fast-drag miss, and its settings gained mode/shape/hardness/opacity/flow/spacing/angle/roundness with brush-style erasure passes. Verified: Node suite **93/93** (editor-layers **33/33**, canvas-shell **21/21**), TypeScript, Next.js production build, ESLint **0 errors / 25 warnings**, and **27/27** headless-Chromium checks. See `Doc/DOCUMENTATION.md#work-log`.
- [x] **Photo layers are non-drawable; sectioned Photo Adjustments; separate AI/service box (2026-11-18).** Brush, Pencil, Pen, Eraser, Shape, and Gradient no longer act on a photo layer: `EditorCanvas` ignores them while a photo layer is selected, `chooseTool` falls back to Move, and `EditorToolsBar` greys the drawing buttons out via a new `drawingToolsDisabled` prop. Photo Adjustments is now split into independent photo-editor sections — Basic, Tone Curve, Color Mixer, Color Grading, Levels, Selective Color, Channel Mixer, Detail, Effects, Optics, and Calibration — and Upscale, Remove Background, AI Enhance, Smart Filter, and the layer mask controls live in their own `Photo services` box. Color Mixer gained a Hue/Saturation/Luminance mode with an eight-band per-color row; Color Grading gained Blending and Balance; Tone Curve gained Highlights/Lights/Darks/Shadows regions; Detail gained Color Noise Reduction; Optics and Calibration are new. The new math (parametric curve regions, per-band mixer, calibration, optics, color noise reduction) lives in `photo-adjustments.ts` and feeds the existing single tone table, colour matrix, and CSS filter. Verified: full Node suite **83/83** (canvas-shell **20/20**, photo-adjustments **18/18**), TypeScript, Next.js production build, ESLint **0 errors / 25 warnings**. See `Doc/DOCUMENTATION.md#work-log`.

- [x] **professional photo-editor-style Photo Adjustments (2026-11-18).** Photo Adjustments now mirrors a professional photo editor as collapsible groups: White Balance, Light (Exposure in EV plus Contrast/Highlights/Shadows/Whites/Blacks), Presence (Texture/Clarity/Dehaze/Vibrance/Saturation/Hue), Tone Curve with a draggable graph, Levels, Color Mixer (HSL), Color Grading, Selective Color, Channel Mixer, Effects (Vignette/Grain/Grain size), Detail (Sharpen/Noise reduction/Blur), and Smart & AI, plus Auto and Reset. The math lives in the pure `apps/web/src/lib/photo-adjustments.ts` module (exposure in stops, documented tonal zones, one tone transfer table, one color matrix, gradient/turbulence overlays); `EditorPhotoAdjustments.tsx` renders the UI and `EditorLayerPreview.tsx` applies it. Values stay immutable on `EditorImageContent`. Verified: full Node suite **77/77** (photo-adjustments **13/13**, canvas-shell **19/19**), TypeScript, Next.js production build, ESLint **0 errors / 25 warnings**. See `Doc/DOCUMENTATION.md#work-log`.

- [x] **Per-tool options for brush, pencil, eraser, and pen (2026-11-18).** Each drawing tool now carries its own settings instead of the editor using fixed constants. The Adjustments panel has a `Tool Options` section that follows the active tool and opens on it by default: Brush/Pencil expose tip shape, size, opacity, and softness/feather, Eraser exposes its radius, and Pen exposes stroke width and cap. The eraser's hit radius reads `toolOptions.eraser.size` (was a hard-coded `radiusPx = 180`) and a committed Pen path uses `toolOptions.pen.width` (was a fixed `strokeWidth: 5`). Each brush/pencil stroke stores its own look so strokes within one layer can differ, and the Free Transform box hides while a stroke is in progress. Implemented in `EditorCanvas.tsx`, `EditorAdjustmentsPanel.tsx`, `EditorArtworkLayers.tsx`, `EditorLayersPanel.tsx`, and `editor-layers.ts`; verified with headless Chromium and `node --test tests/*.test.cjs` **64/64**. See `Doc/DOCUMENTATION.md#work-log`.

- [x] **Free-transform handles: bigger, constant-size, hover arrows (2026-11-18).** Handles keep a ~10px on-screen size (measured via `ResizeObserver`) instead of shrinking with the fitted canvas; hovering a handle shows the two-sided resize glyph on its axis and the matching resize cursor on any active tool, while the rotate handle keeps its own circular-arrow glyph and a grab cursor. Implemented in `EditorCanvas.tsx`; measured live at ~14px on desktop and phone.

- [x] **Shape tools: compact reference-style picker beside the chip (2026-11-18).** The Shape chip shows the selected shape's icon; clicking it opens a small icon-only three-column picker beside the chip (28px desktop / 40px touch options, no hint line, shape names kept as tooltip/`aria-label`). Choosing an option closes the box, keeps Shape active for immediate drawing, and updates the chip icon. The picker is closed on load. Implemented in `EditorToolsBar.tsx`; measured live at 106x106 desktop and 142x142 phone.

- [x] **desktop-editor-style layer creation for Text (confirmed rule, 2026-11-18).** The Text tool must not create a layer on every click. Confirmed behavior, exactly as in a desktop editor:
  - If the **selected layer is a text layer**: the Text tool edits that layer's own text in place. No new layer is created.
  - If the **selected layer is not a text layer** (artwork / shape / image), or nothing is selected: the Text tool creates **one** new text layer and types into it.
  Current code (`EditorCanvas.tsx` `startArtworkStroke`) calls `addCanvasTextLayer(undefined, …)` on every canvas click regardless of the selected layer's kind, so each click spawns a new `Text N` layer; the Sidebar `Add Text` button and each Text/Element card also call `addCanvasTextLayer` and auto-open the Layers panel via `revealLayersStack`. Pen and Shape already follow the correct rule by appending to the selected layer (`appendEditorShapePaths(current, selectedLayer.id, …)`). Fix: make the Text tool branch check `selectedLayer.kind === "text"` and open the in-place editor on that layer instead of creating a new one; only fall through to creating a text layer when the selection is missing or is not a text layer. Keep the explicit `Add Layer` action as the only other way to add a layer.
  Implementation plan: edit the `activeTool === "text"` branch in `EditorCanvas.tsx` (around `startArtworkStroke`), reuse the existing `editingTextLayerId` in-place editor, add a canvas-shell test for both branches, then build / typecheck / lint / run `node --test tests/*.test.cjs`, and verify Web + Phone with headless Chromium. Implemented 2026-11-18 in `EditorCanvas.tsx`; verified on desktop 1280×900 and phone 390×844 (selected text layer → in-place edit, no new layer; selected non-text layer → one new text layer). See `Doc/DOCUMENTATION.md#work-log`.

### Current direct owner request — 2026-11-17

- [x] Header Bar 2 fields: keep the no-`Choose` Product selector defaulted to `T-Shirt` and the no-`Choose` GSM selector defaulted to `160 GSM`; Product/GSM/Color/Size/Save/Buy boxes use the same fully rounded `80×32px` desktop / `80×44px` touch proportions and green app-accent fill. The `Color` box shows its selected theme swatch with a down-arrow; clicking the arrow opens a fully rounded green dropdown with Background/Surface/Accent choices. The `Size` box defaults to `XL` and offers `XS` through `3XL`. Place `Price —` immediately to the left of `Save`. On phones, hide field labels and separate price text so only the horizontally scrollable boxes remain; retain accessible names and selections. `Save`/`Buy` remain placeholders because `/create` has no connected price source or save/checkout handler.
- [x] Pen tool — desktop-editor-like continuity: keep the same Pen-nib cursor on the viewport and print canvas while Pen is selected, from the first anchor through curve creation, Cancel, Finish/Close, and after path commit. Finishing or closing a path must leave Pen selected and ready for another path, not switch automatically to Move. Preserve existing point/handle editing under Move and all other tools' cursor behavior; do not add unrequested Pen modes.
- [x] Pen tool — desktop-editor-style Bézier and visual refinement: click creates a corner anchor; click-drag creates a smooth anchor with visible paired Bézier handle guides and endpoints; existing handle points can be adjusted in path-edit mode, with Alt breaking the mirrored tangent. Keep the live preview and committed Pen path thin (about 1.5px at default canvas size). Remove the “Click: corner · drag: curve · Shift: snap · click start: close” instruction popup and do not show an empty hint box while Pen is idle. Keep the functional Finish/Close path/Cancel controls while a path is active.
- [x] Product-dependent rules: `T-Shirt` supports Front/Back and shows GSM/Size. `Phone` switches to disabled Brand/Model placeholders, keeps Color, and permits only one visible Front Mockup; the Back Mockup is hidden while Phone is selected and restored when switching back.
- [x] Layers panel placement: dock on the **right** edge, start collapsed, and open/close with a small round toggle; use the existing app accent/theme colors and remain responsive.
- [x] Add an `Edit sidebar` opposite the Layers panel on the **left**; start collapsed and show/hide it with a small round arrow like the Layers panel. Temporarily list template-like `Design`, `Elements`, `Text`, `Brand`, `Uploads`, `Draw`, `Projects`, and `Apps`; keep them disabled until the owner defines their actual behavior. Both panels may be open on desktop; on narrow screens opening one closes the other, and resizing into the narrow breakpoint closes both to prevent overlap.
- [x] Keep the compact desktop-editor-inspired panel proportions. Remove the unused `Channels`, `Paths`, top `Menu`, and `Kind` rows; retain the functional Layers title, blend/opacity, Lock/Fill, layer/mask rows and bottom actions. The toggle uses the app's Light/Dark accent token; desktop is 28px round and coarse-pointer touch keeps a 44px target. Keep the 16rem maximum panel width, 11px row labels, and existing accessible layer operations.
- [x] Functional desktop-editor-inspired Layers slice: the right panel remains initially collapsed and toggleable; its stack supports add/select/rename/reorder/show-hide/lock/duplicate/delete, opacity and blend mode. Drawing targets the selected unlocked artwork layer. The owner confirmed `Mark` means the desktop editor's **Layer Mask**; masks can be added/removed/selected and painted black to hide or white to reveal without deleting source artwork. Preserve the shared artwork source, independent Front/Back mockup transforms, transferable 3500/1500 px tier, responsive/touch behavior, and Header Dark/Light theme.
- [ ] Continue additional desktop-editor-style operations only as the owner specifies them step by step. This slice uses vector artwork/masks and page-memory state; it does not claim desktop-editor parity, raster-image masks, history, or persistence.
- [x] Editor Header Bar: reuse the existing web-app Header Bar above the Editor; preserve its current responsive mobile and desktop design rather than creating or redesigning a separate Editor header.
- [x] Phone editor parity: retain the working desktop design and the shared 3500/1500 px rule. On phones, both Front and Back artwork groups must be independently movable and resizable, either side may use the large tier, and source artwork/outer mockup positions must not change during overlay edits. Make existing controls finger-usable, allow scrolling through the stacked workspace without moving a mockup accidentally, and provide touch-accessible view pan/zoom without requiring a keyboard or mouse. Do not implement unrelated Editor roadmap features.

Evidence (2026-11-17): merged `main` production build passed; lint completed with 0 errors / 25 warnings; `node --test tests/*.test.cjs` passed **55/55**; canvas-shell passed **16/16**; and `git diff --check` passed. Focused post-merge CDP at 1280×900 desktop and 390×844 phone confirmed all green box fills, Price-before-Save, equal box geometry, chevron-opened fully rounded green dropdown, Background/Surface/Accent selection by touch, and mobile label/price hiding. The broader `tests/editor-touch.cjs` completed H2 checks then stopped at the existing unrelated Edit sidebar selector on line 330, left untouched. Physical-device checks remain outstanding; see `Doc/DOCUMENTATION.md#work-log`.

Evidence (Pen follow-up, 2026-11-17): production build passed; lint completed with 0 errors / 25 warnings; `node --test tests/*.test.cjs` passed **55/55**, including canvas-shell **16/16**; and `git diff --check` passed. Focused Chromium confirmed the same Pen cursor/hotspot before the first anchor, after each anchor, and after both Finish and Close path; Pen stayed selected and began a new path after either completion.

Evidence (Pen Bézier visual refinement, 2026-11-18): production build passed; lint completed with 0 errors / 25 warnings; all repository Node tests passed **55/55**; Pen geometry and canvas-shell tests passed **21/21**; and `git diff --check` passed. Focused production Chromium confirmed no idle instruction box, visible in/out Bézier endpoints on a drag-created anchor, a 1.5px live preview with Finish/Close/Cancel actions, and a saved-path handle drag changing the cubic SVG path data.

The delivery fee is quoted, not guessed (Plan §16 P1-5). `apps/web/src/lib/delivery-quote.ts` posts the payload
`delivery.ts` already built to `<MH_DELIVERY_URL>/quote` with `MH_DELIVERY_TOKEN`, and when the courier is not
configured, too slow (8 s), or answers a body without `feeKs`, it answers from `DELIVERY_FEE_TABLE` with
`source: "table"` and a note naming the reason, so checkout always has a number. `POST /api/delivery/quote` is the
route, rate limited to 30 calls a minute. `tests/delivery-fee.test.cjs` runs the courier path against a real local
HTTP server (including a `"3,200"` fee string and a 50 ms timeout) and the table path for every band.

The rate limiter now reaches for a durable counter itself: `enforceRateLimit` resolves the Worker's `RATE_LIMIT_KV`
namespace once per isolate (`ensureDurableStore`) and keeps module memory only when the binding is absent, so the
existing `kvRateLimitStore` starts working as soon as the namespace exists. The upload route (40 a minute) and the
delivery quote route (30 a minute) are guarded beside the payment routes.

## Product page: the buying box and the option boxes follow the post (2026-11-21)

A product page shows one box per attribute the admin ticked when the post was created, and a ready-made
piece sells with two buttons only.

**The box under the product name.** A product that is not design-editable — `is_customizable = 'none'`, or
any row whose `sub_brand` is `Nyein` — hides `Edit Design`, so the action row is `Buy Now` and
`Add to Cart` on a two-column grid. The "Ready-made design — sold as shown" line lives in the
**Product Details** tab (`[data-ready-made]`), not in the buying box.

**The option boxes.** `apps/web/src/lib/product-options.ts` is the rule set:

| Situation | What the page shows |
| --- | --- |
| The product has rows in `product_attribute_types` | exactly those attributes, each with the values from `attribute_values`, ordered by `attribute_types.display_order` |
| A configured attribute has one value | the box renders with that value already chosen |
| An attribute was not ticked | no box, and nothing to answer before Add to Cart |
| No rows at all, design-editable product | the shop defaults — Size, Color, Material, Fit Type, Sleeve, GSM |
| No rows at all, ready-made piece | the **Size** box alone |

`getProductOptionGroups(productId)` in `apps/web/src/lib/products.ts` reads those three tables for the
page; `optionKeyForAttributeName` maps the admin's wording onto the keys the cart already stores
(`Fabric Type` → `material`, `MH Cuttings` → `cutting`, …), so a renamed attribute still becomes the box
the page expects. Attributes outside the six cart fields travel with the line through
`CartVariant.extras`, which `variantLabel` and `cartItemKey` include.

**SQL.** `SQL/0008_product_options_public_read.sql` grants anon SELECT on `product_attribute_types`;
`0004` granted the value and pricing tables but not the join table, so a logged-out visitor could not
learn which attributes a post sells on.

**Nyein pieces open their own page.** While the catalogue carries no Nyein rows the Nyein page renders
stand-in pieces (`lib/nyein-pieces.ts`); the product route resolves the same slug, so a card now opens the
piece's buying box instead of a 404 or the whole catalogue.

Evidence: `tsc --noEmit` clean; ESLint reports only the two pre-existing warnings; `node --test
tests/*.test.cjs` → **838 passing, 0 failing** (8 new in `tests/product-options.test.cjs`, covering the
key mapping, blank-option and duplicate handling, the admin rows winning, the two fallbacks, the one-option
pre-selection, and the "only real choices are required" rule). Chromium at 1440×1000 and 390×844 against the
built server: `/products/nyein-oversized-tee` → `h3` groups `["Size"]`, buttons `["Buy Now", "Add to Cart"]`,
no `Edit Design`, no `[data-ready-made]` in the buying section. A temporary preview page (deleted after the
check) rendered the same component twice: with `optionGroups={null}` the groups were Size, Color, Material,
Fit Type, Sleeve, GSM; with an admin subset the groups were Size, Color (single value, preselected),
Print Method and MH Cuttings, with no Material/Fit/Sleeve/GSM box at all.
