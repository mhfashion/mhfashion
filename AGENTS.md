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
