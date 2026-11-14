# TODO register — consolidated

The standalone task register has been consolidated into [Plan/PLAN.md](Plan/PLAN.md#historical-todo). Use the current project plan for active priorities and `Doc/DOCUMENTATION.md#work-log` for completed website work.

## Current direct owner request — 2026-11-14

- [x] Editor Header Bar 2: keep the Product dropdown compact with no `Choose` option and default to `T-Shirt`; allow `T-Shirt` and `Phone`, and show other product choices as inactive until their rules are specified. The `GSM` dropdown has no `Choose` option and defaults to the first value (`160 GSM`). Keep `Color`; `Size`, `Save`, and `Buy` remain placeholders; the Header's Dark/Light control still affects the Editor.
- [x] Product-dependent rules: `T-Shirt` supports Front/Back and shows GSM/Size. `Phone` switches to disabled Brand/Model placeholders, keeps Color, and permits only one visible Front Mockup; the Back Mockup is hidden while Phone is selected and restored when switching back.
- [x] Layers shell: keep it on the left side, initially collapsed, with an arrow that opens/closes it. The shell exists, but Photoshop-style layer operations have not been implemented yet.
- [ ] Functional Photoshop-style Layers system requested: include new-layer, mask, delete, and other layer operations. Clarify whether the owner's term `Mark` means a layer `Mask`, and define how layers should map to artwork shared across the print canvas and Front/Back mockups before wiring these controls to real artwork behavior.
- [x] Editor Header Bar: reuse the existing web-app Header Bar above the Editor; preserve its current responsive mobile and desktop design rather than creating or redesigning a separate Editor header.
- [x] Phone editor parity: retain the working desktop design and the shared 3500/1500 px rule. On phones, both Front and Back artwork groups must be independently movable and resizable, either side may use the large tier, and source artwork/outer mockup positions must not change during overlay edits. Make existing controls finger-usable, allow scrolling through the stacked workspace without moving a mockup accidentally, and provide touch-accessible view pan/zoom without requiring a keyboard or mouse. Do not implement unrelated Editor roadmap features.

Evidence: `tests/editor-touch.cjs` local Chromium touch checks passed for 390×844 and 320×740, landscape 740×390/844×390, tiny artwork, tier transfer/release, pan/zoom and cancellation. All 24 Node tests, TypeScript, modified-file ESLint and Cloudflare/OpenNext build passed. Physical Android/iPhone testing remains unavailable; see `Doc/DOCUMENTATION.md#work-log`.
