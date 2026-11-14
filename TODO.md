# TODO register — consolidated

The standalone task register has been consolidated into [Plan/PLAN.md](Plan/PLAN.md#historical-todo). Use the current project plan for active priorities and `Doc/DOCUMENTATION.md#work-log` for completed website work.

## Current direct owner request — 2026-11-14

- [x] Editor Header Bar 2: make the second bar a little smaller; provide an arrow dropdown beside `Product` with `T-Shirt`, `Phone`, `Hoodie`, and other product choices, and let `GSM` select from other GSM values the same way. Keep `Color` in the bar. Ensure the Header's Dark/Light control affects the Editor; keep Bar 2 ready for later detail and additional items. `Size`, `Save`, and `Buy` remain placeholders until specified.
- [x] Editor Header Bar: reuse the existing web-app Header Bar above the Editor; preserve its current responsive mobile and desktop design rather than creating or redesigning a separate Editor header.
- [x] Phone editor parity: retain the working desktop design and the shared 3500/1500 px rule. On phones, both Front and Back artwork groups must be independently movable and resizable, either side may use the large tier, and source artwork/outer mockup positions must not change during overlay edits. Make existing controls finger-usable, allow scrolling through the stacked workspace without moving a mockup accidentally, and provide touch-accessible view pan/zoom without requiring a keyboard or mouse. Do not implement unrelated Editor roadmap features.

Evidence: `tests/editor-touch.cjs` local Chromium touch checks passed for 390×844 and 320×740, landscape 740×390/844×390, tiny artwork, tier transfer/release, pan/zoom and cancellation. All 24 Node tests, TypeScript, modified-file ESLint and Cloudflare/OpenNext build passed. Physical Android/iPhone testing remains unavailable; see `Doc/DOCUMENTATION.md#work-log`.
