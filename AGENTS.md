# AGENTS.md

Repository memory for AI agents working on **mhfashion/mhfashion**.

## Stack
- Monorepo (`npm` workspaces). App lives in `apps/web`.
- Next.js 16 (App Router) + React 19, Fabric.js 7, Supabase, deployed as a Cloudflare Worker via OpenNext (`npm run cf:build --workspace=apps/web`).
- Node 22 (needed for the built-in `WebSocket` used by the CDP-based browser tests).

## Commands
- Build: `npm run build --workspace=apps/web`
- Type-check: `npx tsc -p apps/web/tsconfig.json --noEmit`
- Lint (run from the workspace, not the repo root): `cd apps/web && npx eslint <file>`
- Unit + spec tests: `node --test tests/*.test.cjs`
- Integration tests (`tests/guide-http.test.cjs`, `tests/editor-touch.cjs`) need a server first:
  `npm run start --workspace=apps/web -- --port 3000` then run the test file.
  `tests/editor-touch.cjs` reads `EDITOR_TEST_ORIGIN` (default `http://127.0.0.1:3000`).

## Testing notes
- `node --test tests/*.test.cjs` reports 108 tests, all passing when a server is running on port 3000. The `guide-http` tests fail with `ECONNREFUSED 127.0.0.1:3000` when no server is running — that is environmental, not a code failure. Start the server (above) and they pass.
- `tests/editor-touch.cjs` has a known pre-existing failure in its phone **Edit sidebar** section (a `null` `getBoundingClientRect`); it is unrelated to the Editor Header Bar 2 work. Assertions that run earlier in the file still execute.
- Production-UI checks can be driven headlessly with Chromium + CDP:
  `chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank`,
  then connect to `http://127.0.0.1:9222/json` over the Node 22 `WebSocket`.
  Note `Emulation.setTouchEmulationEnabled` requires `maxTouchPoints` between 1 and 16.
- Text-layer geometry: the Free Transform box comes from `editorTextCanvasBounds` in `editor-layers.ts`. It must hug the painted **glyph ink**, not the font line box: `editorTextLineMetrics` measures the ink box (`actualBoundingBoxAscent`/`Descent`) alongside the font line box, and `editorTextMetrics` unions each line's ink box around its own baseline (ignoring blank lines, including a trailing one). Using `fontBoundingBoxAscent`/`Descent` instead makes the box ~44 units taller than the capitals at the 110px default. A reported ink descent of exactly `0` is a real measurement (caps have no descender), so only fall back to the 0.2em estimate when the browser reports no font line box at all. `layerCanvasBounds` adds an 18-unit grab margin to strokes/shapes/images but **0 for a pure text layer**, so the text outline lands on the ink. Verify by comparing the `[data-transform-outline]` rect to `[data-editor-text-content]`'s `getBoundingClientRect()`; measured padding is 1-4px (outline stroke plus handle), and pixel scans of a screenshot agree.
- Transform handle hit areas: `handleHitRadiusPx = Math.min(15, Math.max(5, shortestSide * 0.3))`. A fixed 15px radius swallowed a ~24px one-line text box entirely, so dragging the text resized it instead of moving it. The rotate handle sits `rotateOffset = Math.max(58, (handleHitRadiusPx + rotateHitRadiusPx + 10) / unitScale)` below the box; a fixed 58-unit drop put its circle on top of the bottom-centre resize handle on short boxes.
- Typing past the viewport edge: `keepTextCaretVisible` pans the workspace by the caret's own line (`editorTop + caretLine * lineHeight`), not by the textarea box. The textarea grows taller than the viewport after ~12 lines, so following its box made the pan oscillate and left the caret off-screen. Calls are coalesced through `caretPanFrameRef`, otherwise the value effect and the caret listeners each shift in the same frame and the pan overshoots by a full line. Verified on desktop/laptop/phone at 26 lines: the caret line stays inside the viewport.
- Re-entering an existing text layer must place the caret at the end (the overlay's `textAreaRef` effect); otherwise Enter inserts a line above the text and typing overwrites the start.
- Pushing to GitHub from this environment is blocked: the injected `GITHUB_TOKEN` authenticates as the `mhfashion` user and can read the repo, but every write path (`git push`, `POST /git/refs`, `gh api`) returns `403 Resource not accessible by integration`. The commits are prepared locally on the branch; a human or a token with `contents: write` must push them.

## Deployment (important)
- Production deploys run through `.github/workflows/deploy-cloudflare.yml` on push to `main`.
- The job's **first step** verifies the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. If either is missing it exits 1 and every later step is skipped, so **the Cloudflare Worker is never deployed**.
- As of 2026-11-18 the repository has **no Actions secrets configured**, so every `main` deploy has failed at that step. A merged change does not reach production until those two secrets are added in GitHub → Settings → Secrets and variables → Actions.

## CI notes
- The `Workers Builds: mhfashion` check fails on **every** branch, including `main` (`f0b20ab`) and every PR branch. It is a Cloudflare-side build, not the GitHub workflow above, and it fails identically on unmodified commits. Do not treat it as a regression from your change.
- `npm run cf:build --workspace=apps/web` succeeds locally, so the failure is in the Cloudflare build environment (secrets/account), not in the source.
- `Validate and deploy MH Fashion` on `main` also fails for the missing-secrets reason described above.
- The session `GITHUB_TOKEN` is **read-only** on this repo (`Resource not accessible by integration`): push, PR edits, and comments all return 403. Ask the owner for a PAT with `contents: write` when a push is required; it works for `git push` but not for PR body edits or comments unless it also has `pull_requests: write`.

## Text Free Transform box (`apps/web/src/lib/editor-layers.ts`)
- `editorTextBounds` / `editorTextCanvasBounds` must contain everything the layer paints, not just the glyph ink. `editorTextPaintPadding(text)` returns how far each painted effect (outline stroke, shadow/echo offset, glow, extrusion) and the strike-through/cut/oblique decoration reaches past the ink; the bounds grow by it on all four sides.
- `editorTextEffects(text)` resolves the painted effect list (explicit `effects`, else the legacy `textEffect` preset) for both the renderer and the bounds — keep them sharing it, or the box and the paint drift apart again.
- `editorTextDecoration(text)` is the same contract for decorations: it returns the painted line/rect geometry in absolute layer units and **both** `EditorLayerPreview` and the padding read it. Never re-derive a decoration's extent from a `fontSize` multiple — a decoration is laid out from the anchor, not the ink edge, so a guessed multiple overshot the real rule by ~50 px a side.
- Verified by frame differencing (hide the text group, diff the two screenshots) in real Chromium at 1440x900 and 390x844 touch: plain, multi-line, arch/wave/circle presets, all five effects, line/cut/oblique decorations, scaled, rotated, and dragged-outside-canvas states all leave ≤1.1 px of ink outside the box (sub-pixel antialiasing).

## Text typing downward
- Typing goes into a `foreignObject` textarea whose line box is aligned to the drawn SVG baseline; its height is `lines * lineHeight + 4` so it grows with every line instead of scrolling the caret out of view. Verified to 42 lines.
- Re-entering an existing text layer with the Text tool focuses the textarea with the caret at the **end** (`selectionStart === value.length`), so Enter appends a line below the last glyph. `commitEditingText` switches the tool back to `move`, so re-entry needs the Text tool picked again.
- Typing is verified end to end with CDP: `Input.insertText` for text and `Input.dispatchKeyEvent` with `text: "\r"` for Enter (a keyDown without `text` does not insert a newline).
- Beware pixel probes that scan for "dark" or "lime" pixels: the docked sidebars (uniform `#0c0c0c`) and the t-shirt mockup both produce large false positives. Hide `[data-dock-side]` elements, or diff a frame with the layer hidden.

## Header switchers (`apps/web/src/components/HeaderActions.tsx`, `MobileNav.tsx`)
- The language control is a labelled `EN / MM` pill and the currency control a `Ks / $` pill. **Both must show the active option**, by adding `text-accent` to the selected segment; `data-header-language` / `data-header-currency` carry the state for tests.
- Do not replace them with a single icon (`Languages`, `Coins`): an icon that looks the same in every state reads as decoration, and the user cannot tell which language or currency is selected. That regression shipped once and had to be reverted.
- The currency pill previously read a static `$/Ks` with a chevron, which never changed either — it now renders `Ks` and `$` separately and highlights the active one.

## Pushing from this workspace (important)
- The `GITHUB_TOKEN` and the git credential helper token are the **same GitHub App
  installation token** (`x-oauth-client-id: Iv23lizrrwLGm04hszl7`), and it has **read-only
  Contents**. `git push` fails with `403 ... denied to mhfashion`, and the REST write
  endpoints (`POST /git/refs`) also return `403 Resource not accessible by integration`.
- `git fetch` and the read APIs work fine, so local branches can be kept current with
  `origin/main`, but a push needs a token with `Contents: write` (or a human pushing).

## Editor Header Bar 2 (`apps/web/src/components/EditorHeaderBar2.tsx`)
- Shared geometry constants keep the Product / GSM / Color / Size / Save / Buy boxes uniform: `FIELD_BOX`, `TRIGGER_BOX`, `ACTION_BOX`, `MENU_BOX`, `MENU_OPTION`, `COLOR_SWATCH`.
- `BoxDropdown` renders its panel through `createPortal` (so the scrollable bar cannot clip it) and sizes the panel to the trigger box width, clamped to the viewport.
- The chevron is absolutely positioned at `right-1.5` and vertically centred so it sits in the same place on every box.
- The Color swatch is a 20x20px rounded square (`rounded-md`), used in both the trigger and the dropdown options.
- Selecting an option updates the price immediately (`data-editor-price`).

## Editor layers outside the print canvas
- Move/resize/rotate on the print canvas use `toCanvasPointUnclamped` in `KittlCanvas.tsx`; the drawing tools keep using the clamped `toCanvasPoint`, so strokes stay on the canvas.
- A transparent `<rect aria-label="Move selected layer">` overlays the selection outline so a layer parked off-canvas is still grabbable (the artwork itself renders `pointerEvents="none"`).
- `CANVAS_LAYER_TRAVEL_LIMIT` (2400 artwork units) bounds how far a layer can be dragged, so it stays reachable.
- `MockupArtwork` now receives `layerOffsets`/`layerScales`/`layerOrigins`/`layerRotations` and mirrors the canvas, then clips the artwork to the print area with a `clipPath` in overlay coordinates (`printScale = BASE_ARTWORK_SCALE * safeTransform.scale`). A layer dragged off-canvas therefore disappears from the mockup exactly as it would print.

## Testing pitfalls
- `next start` keeps the port after a rebuild: a stale `next-server` will serve an old build. Kill the process holding port 3000 (`/proc/*/cmdline` contains `next-server`) before restarting, or your CDP probes test stale code.
- When measuring on-screen glyph ink against the transform box, hide `[data-editor-transform-controls="true"]` first; the resize-handle squares otherwise pollute the dark-pixel bbox.
- In CDP drag tests, check the target point is not covered by another panel (e.g. the mockup panel on the right of the canvas). Use `document.elementFromPoint` to confirm.
- `getBoundingClientRect()` on `[aria-label="Move selected layer"]` returns the **axis-aligned** box of a *rotated* rect, so it is legitimately larger than the ink's own AABB. On a rotated layer assert containment only; tightness is only meaningful at rotation 0.
- A phone screenshot is in device pixels when `deviceScaleFactor: 2`, so multiply the CSS rects by `screenshotWidth / window.innerWidth` before comparing them with pixel scans.
- Hide `[data-editor-transform-controls]` in **both** shots of a frame difference, and toggle only the glyph `<text>` elements. Toggling the whole layer group also repaints the Layers-panel thumbnail, and rotating a layer promotes a compositing layer whose anti-aliasing shifts across the entire canvas, either of which swamps the glyph diff.
- Resize handle names are `top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right` on `[data-resize-handle]`; there is no `right-center`.
- On a phone the Layers dock is closed, so there are no `aria-pressed` rows to read. Identify the selection from the `[aria-label="Move selected layer"]` box geometry instead.

## Layer picking (canvas and pasteboard)
- A press picks the layer under the pointer, then drags it: `hitTestLayerAt` maps the point back through each layer's own move/scale/rotate (top-first, visible only), and `pickLayerAt` selects then calls `beginLayerDrag`.
- The transform box is a **solid** `rect` over the selected layer's whole area, so it also intercepts presses. `startSelectionBoxPress` hit-tests on that press too: a hit on a layer that is not already selected re-picks it, anything else drags the current selection. Without this, any layer sitting under the box could only be selected from the Layers panel.
- Both paths must keep working together. A press on the selection itself has to still drag it, so the box handler only re-picks when `!selectedLayerIds.includes(hitId)`.

## Text layers: downward writing, wrapping, and the ink-hugging box
- `editorTextLines(text)` in `apps/web/src/lib/editor-layers.ts` is the single source of painted lines: it splits on `\n` and then soft-wraps each line to `text.wrapWidth`, breaking at spaces and falling back to a per-character split for a word wider than the limit. Fit is measured on `advance` (not ink `width`) so artwork line breaks match the browser's textarea wrapping.
- Every renderer must use it: `EditorLayerPreview.tsx` and the inline editor in `KittlCanvas.tsx` both do. Do **not** reintroduce `text.value.split("\n")` — that paints a long line as one unbroken run straight off the canvas.
- New text gets `wrapWidth: DEFAULT_TEXT_WRAP_WIDTH` (880) from `addCanvasTextLayer`. Older layers have no `wrapWidth` and stay unwrapped, so existing artwork is not reflowed.
- The inline editor's `foreignObject` height uses the wrapped line count and its width uses `wrapWidth ?? TEXT_EDIT_BOX_WIDTH`. Sizing from the newline count clipped soft-wrapped lines below the box, which read as "typing stopped working".
- The inline editor is wrapped in `<g transform={editingTextLayerTransform}>` because it is a sibling of the artwork layers and must carry the same move/scale/rotate.
- `editorTextCanvasBounds` composes wrapping with effects (`editorTextPaintPadding`) and decorations (`editorTextDecoration`), so shadows/outlines stay inside the transform box.

## Testing notes (headless CDP pixel checks)
- Measure ink against the **white print canvas only**: the page around it is near-black, so any padding in the screenshot clip is read as ink and inflates the box.
- Load a fresh page per measured layer; leftover layers from an earlier step join the measured ink.
- The editor has no tap-empty-space-to-deselect gesture (it never did), so do not assert it.
