# Guide page implementation

Source of scope: `docs/PROJECT_PLAN.md` sections 1, 3, 7, 10 and 11.

- [x] Categorized public Guide pages
  - Guide contains categorized content (Product Guide, Payment Guide, …).
  - `/guide` lists articles, supports category selection and text search, and links to readable `/guide/[slug]` articles.
  - Reuse the existing floating header, mobile navigation, desktop-only footer, dark/light theme and neon-lime streetwear styling. UI copy remains English.
  - Guide article content and metadata render on the server. Unknown article slugs return not found.
  - Evidence: four starter categories/eight articles; five raw-HTTP tests confirm SSR content, combined category/search filters, article metadata, real HTTP 404 and the complete route manifest.
- [x] Content data foundation
  - Guide posts and categories are prepared for management by Post Admin with SEO fields and publish/draft state.
  - Supabase reads expose only published posts in published categories. No public write access or unverified admin role is introduced.
  - Add a migration for the owner to apply manually, following the existing project workflow. Do not mutate the production database during this task.
  - Until Supabase is configured or guide tables exist, show explicit starter guides derived from the project plan; successful live queries replace starter data, including when no posts are published.
  - Evidence: nine unit tests pass; migration applies in isolated embedded PostgreSQL, all seeds match starter content, rerun preserves owner edits, malformed content is rejected, and both public roles cannot read drafts/future posts or write content.
- [x] Safe repository handoff
  - Validate TypeScript and production build using the project's toolchain; run affected route/content checks.
  - Save code on `feat/guide-page`, not auto-deployed `main`. Do not deploy or apply SQL automatically.
  - Evidence: final TypeScript and Next.js production build pass; nine unit and five raw-HTTP route tests pass. Code is isolated on the feature branch for review, and no deployment or production database mutation was performed.
- [ ] Future Post Admin module (outside this page request)
  - Authenticated Post Admin can manage Guide posts, categories, SEO fields, publish/draft.
  - The repository currently has no admin authentication or permission-management system; a secure admin UI must be implemented with that module before enabling editor writes.

## Editor Elements library

Source of scope: `docs/PROJECT_PLAN.md` section 6.

- [x] Canva-inspired Elements library for `/create`
  - Browse original SVG graphics by category and search by names or tags.
  - Choose a color, click a graphic to add it centered on the active canvas, or drag it onto a placement point.
  - Added graphics become individual editable layers and remain in the browser-local draft.
  - Keep the local manifest and SVGs under `apps/web/public/elements/v1/`; include future R2 keys in the manifest, but do not connect, create, expose, or upload to R2 until requested.
  - Evidence: 25 original SVG catalog items are present; manifest paths and future R2 keys match; all SVGs parse; category/search, color, click, canvas-drop and Recent flows are implemented; production build passes.
- [ ] Future R2 migration (explicitly deferred)
  - Later move `elements/v1/manifest.json` and `elements/v1/{slug}.svg` to the private `mh-fashion-assets` bucket and serve them through same-origin editor API routes.

## Canva-style Text tools

Source of scope: `docs/PROJECT_PLAN.md` section 6.

- [x] Canva-like text insertion and typography controls in `/create`
  - Add heading, subheading, and body text from the Text panel; allow users to type custom copy before insertion.
  - Search and browse font choices by style category; show live font previews and ready-made paired text/font designs that add as grouped, separately editable layers.
  - For selected text, change font family, size, color, bold, italic, underline, alignment, and letter/line spacing. Preserve text editing, transforms, Undo/Redo, and browser-local draft storage.
  - Use browser/system fonts in this phase; keep versioned font and text-style manifests with future R2 keys. Do not fetch, copy, or upload font binaries before license review and the R2 phase.
- Evidence: the editor builds with three text-size presets, searchable category-based font previews, four grouped font combinations, and persisted Fabric text formatting; all 12 font IDs and seven preset/combo references validate against local manifests.
- [ ] Future typography R2 migration (explicitly deferred)
  - Later place license-cleared font files at `fonts/v1/{font_id}.woff2` and text-style metadata/previews under `text-styles/v1/`; serve those private assets through same-origin routes. Do not connect R2, create a bucket or binding, expose a public bucket, or upload files now.

## Editor Products panel removal

Source of scope: owner request to remove Products below Elements in the editor.

- [x] Remove the Products entry and browser from `/create`, along with the editor-only products endpoint and query helper.
- [x] Keep storefront product browsing/detail pages and the editor's bottom Product attribute selector unchanged.
- [x] Normalize older drafts that saved a catalog item name into the Product attribute selector back to the default product type.
- Evidence: no Products panel/library or `/api/editor/products` route remains in the editor; storefront product routes are untouched, and restored drafts only keep valid Product attribute options.

## Canvas tool palette

Source of scope: `docs/PROJECT_PLAN.md` section 6 and the `/create` toolbar.

- [x] Make every toolbar tool besides Move perform a useful action on `/create`
  - Marquee drag-selects multiple objects; Lasso draws a freeform outline and selects enclosed object centers; Magic Wand selects vector/text objects whose fill colors match the sampled target within an adjustable tolerance, while a raster-image click selects that entire image and reports that pixel-level selection is unavailable; Path Select selects and moves an entire Pen path.
  - Eyedropper samples the visible canvas pixel into the current tool color. Shape drag-creates the chosen editable shape; Pen draws editable freehand vector strokes with configurable color/width; Gradient drag-creates a gradient rectangle or applies an editable linear fill to eligible text/vector objects.
  - Clone Stamp duplicates the selected or clicked unlocked source object at the stamp point and remains undoable; it refuses sources locked directly or by a parent group. Eraser removes the clicked whole artwork object while leaving its layer row empty and usable (pixel-level erasing is not included).
  - Ruler drag displays a transient pixel-distance and angle measurement. Rotate View drag rotates the canvas view without changing artwork; Reset View restores orientation/zoom. Hand pans; Zoom click magnifies and Shift-click reduces, with existing zoom buttons retained.
  - Show tool-specific cursor/status/options; keep added design changes in layers/history/drafts and keep navigation/measurement overlays out of saved artwork. Document the vector/object-level limits rather than claiming raster Photoshop behavior.
- Evidence: `npm run build` passed; no inactive-tool placeholder messages remain; a read-only review found no P0/P1 issues. The review's Clone Stamp lock gap and Magic Wand raster-status ambiguity were corrected. Ruler visuals are transient overlays and are not included in saved marks/history; pixel-level raster selection/erasing and path-anchor editing remain out of scope.

## Cloudflare Worker build compatibility

Source of scope: Cloudflare's Workers Build check rejected the previous Next.js version before compiling the application.

- [x] Upgrade Next.js to the patched 15.5.29 release, OpenNext Cloudflare to 1.20.16, and Wrangler to 4.158.0; keep the application on Next.js 15.
- [x] Update the lockfile and verify a clean install produces the same Cloudflare build.
- Evidence: `npm ci --no-audit --no-fund`, `npm run cf:build --workspace=apps/web`, `npm run build`, and `npm run test:guide` pass; no unsupported-version bypass flag is used. The existing compatibility-date warning is unchanged.

## Canva-style workspace and selection toolbar

Source of scope: owner request to remove the dark Photoshop-like backing from the drawing area and make the red-circled bar work like Canva.

- [x] Use a light neutral workspace and white artboard regardless of site dark mode; keep the transparency grid optional and off by default.
- [x] Make the selection bar contextual: text exposes font, size, color, emphasis, and alignment; shapes expose type and fill; selected artwork exposes duplicate/delete actions.
- [x] Remove developer-facing canvas-engine labeling from the drawing workspace footer.
- Evidence: production build and TypeScript checks pass; selected artwork edits route through the existing history-backed update callback.

## Persistent Photoshop-style Layers Box

Source of scope: user clarification that the Layers Box must exist from editor start and that selecting a layer must not make Opacity/Fill controls appear.

- [x] Keep the right-side Layers Box mounted and visible at editor load, before any layer is selected; show the Layers header and empty layer list immediately.
- [x] Keep blend/Opacity and Lock/Fill controls in fixed rows from the start; show neutral values and disable controls with no eligible layer. Selecting a layer may update values but must not insert, expand, or open the rows.
- [x] Open the Opacity/Fill slider popovers only from their explicit controls; close any open slider when selection changes. Keep advanced properties collapsed until the user explicitly opens them.
- Evidence: the right dock is visible from editor load at tablet/desktop widths; without a selection, the fixed two-row controls show neutral 100% values and are disabled. Selecting a layer only updates the values, keyed controls close any open slider, and the advanced properties disclosure remains collapsed. Production build passes.

## Drawing on a newly created layer

Source of scope: user report that a new layer could be created but artwork could not be drawn on it.

- [x] When an unlocked, empty, non-group layer is selected, the first single-object canvas mark—including Pen, Shape, Gradient, single-text insertion, image upload, or Elements insertion—uses that selected layer's existing ID and preserves its visibility, position, blend, opacity, and Fill settings rather than creating a duplicate layer. Multi-object paired text presets remain grouped insertions.
- [x] Creating a blank layer automatically selects it and gives clear guidance to choose Pen, Shape, or Gradient to add artwork.
- [x] If the selected empty layer or one of its parent groups is locked, reject the edit and show a clear message instead of silently creating artwork elsewhere. A group itself is not a drawable layer.
- [x] Eraser removes the artwork while retaining the now-empty layer row so it can be drawn on again; the Layers delete action still removes the layer and its contents.
- [x] Undo/Redo removes/restores the artwork without accidentally deleting/replacing the pre-existing blank layer. With no selection or a populated ordinary layer selected, retain the current object-per-layer insertion behavior.
- Evidence: `addMark` now checks the selected side's layer tree, reuses the selected unlocked blank layer ID, and leaves its layer record/settings intact; it reports locked ancestors/groups instead of silently writing elsewhere. Eraser removes only the mark and Undo/Redo store complete document states. Production build and `git diff --check` pass.

## Product detail spacing and photo frames

Source of scope: user screenshot and request to remove excess side space and thin the frame around the product photo area.

- [x] Use the full available page width with minimal gutters and no narrow max-width; avoid broad empty side margins.
- [x] Keep the gallery compact—280px at tablet widths and capped at 360px on desktop—while purchase details use the remaining space. On small screens, stack sections and fit the image to the viewport.
- [x] Use subtle 1px image-frame and thumbnail borders; keep the active thumbnail accent but remove the thick outline. Preserve product controls, purchase actions, review section, and related-product behavior.
- Evidence: the wrapper is `w-full max-w-none` with 6–8px side gutters; the gallery uses fixed 280px/360px tracks from tablet/desktop breakpoints and details fill the rest. The main photo and thumbnails retain 1px borders with no `border-2`. `npm run build` and `git diff --check` pass.
