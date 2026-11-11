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
- [x] On narrow phones, center the product photo and thumbnails in a compact 200px gallery; keep purchase details full-width below it.
- [x] Add a Product details box formatted as a compact table using the real product type and customization fields. The catalog has no free-form description column; do not invent material/specification claims.
- [x] Keep the Reviews title and rating summary visible, but collapse review cards by default so the section does not dominate page height.
- Evidence: the wrapper is `w-full max-w-none` with 6–8px side gutters; the gallery uses 280px/360px tracks at larger breakpoints and a centered 200px cap on narrow phones. The Product details card is a semantic table with description, type, and customization rows, built from existing catalog data; review cards are inside a closed-by-default `<details>`. Production `npm run build` passes.

## MH Fashion admin dashboard and frontend demo session

Source of scope: owner request and supplied Google Drive dashboard references (`MH Fashion Admin Dashboard-1.png` and `MH Fashion Admin Dashboard-2.png`).

- [x] Build an `/admin` dashboard with a dark left navigation, light main workspace, top search/profile bar, KPI cards, sales/order visualizations, top-selling products, recent orders, and an activity feed inspired by the references.
- [x] Make the dashboard usable on desktop and mobile, and clearly label local sample metrics as preview data rather than live store analytics.
- [x] The earlier prototype provided `/admin/login` and `/admin/register`, but latest `main` closes public self-registration: the `/admin/register` page and its login link are removed. Do not re-open registration without an explicit request.
- [x] Keep the demo account/session in browser local storage only, gate the preview dashboard client-side, and state clearly that this is not secure authentication: no Supabase, server-side authorization, email verification, or live data is connected. Warn users not to use a real or reused password.
- [x] Keep admin routes out of search indexing and retain mobile behavior without the storefront bottom navigation.
- Evidence: responsive `/admin` route has a collapsible mobile sidebar, stacked narrow-screen cards/tables, and a search input that filters sample products/orders. The earlier demo-account flow was browser-tested and the disposable account/session was removed. Current `main` keeps `/admin/login` as a local demo session, removes `/admin/register` from the route manifest, and labels dashboard data as preview-only. Migration `0007_create_super_admin_roles.sql` prepares a Supabase role schema; Supabase Auth and server-side authorization are not yet connected, so this UI is not production security.

## Permanent website publishing (historical snapshot, 2026-11-10; superseded by the current status below)

- [x] Install dependencies with `npm ci` from the committed root lockfile and build the Cloudflare Worker with `npm run cf:build --workspace=apps/web` (Next.js 15.5.29, OpenNext Cloudflare 1.20.16).
- [x] Validate the generated Worker with `npx wrangler deploy --dry-run` (about 1.16 MiB gzip) and local Cloudflare preview: `/`, `/admin/login`, `/admin/register`, `/admin`, and `/manus-routes.json` returned HTTP 200 with Supabase keys absent.
- [x] Make the public catalog loader return an empty result rather than throwing when Supabase URL/key are not configured; the storefront already displays “Products will appear here soon.”
- [ ] Deploy is blocked until Cloudflare credentials are available and a deploy trigger is configured: the previous GitHub Actions deploy run failed at the required-secret check for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no deploy workflow is present on current `main`, and this environment's Wrangler is unauthenticated.
- [ ] Connect Supabase and run the project migrations/seeds to show real products. Until then the storefront shell works, but catalog sections stay empty.
- [ ] Resolve production dependency security advisories before public launch. `npm audit --workspace=apps/web --omit=dev` reports 8 advisories, including high-severity Fabric SVG-export XSS and a critical `tar` transitive advisory. The dry-run fix proposes breaking upgrades (`fabric` 6 → 7.4.0 and `next` → 16.4.6); update and regression-test the Fabric.js editor before deploying.
- Evidence: OpenNext worker build and Wrangler dry-run passed after clean lockfile install; local Worker preview returned 200 on all listed routes. Production publication has not yet occurred.


## Security-upgrade validation (pre-push snapshot, 2026-11-11; rollout status follows)

- [x] Upgrade the web stack to Next.js 16.4.6, React/React DOM 19.3.1, Fabric.js 7.4.0, OpenNext Cloudflare 1.20.16, and Wrangler 4.158.0; update the Next.js 16 TypeScript and ESLint configuration/commands.
- [x] Migrate canvas pointer reads to Fabric 7 `getScenePoint`, preserve left/top positioning for temporary selection overlays, and disable middle-click canvas gestures explicitly.
- [x] Regression-test the editor in browser: add an SVG Starburst, create a rectangle with the Shape tool, confirm object counts 1 → 2, Undo 2 → 1, Redo 1 → 2, verify Save confirmation, then clear the disposable design. No Fabric runtime errors were reported.
- [x] Run `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` (zero production advisories), `npm run test:guide` (9/9), Next.js production build, standalone TypeScript check, `npm run test:guide:http` against the production server (5/5, including `/cart` in the route manifest), `npm run cf:build --workspace=apps/web`, and `npx wrangler deploy --dry-run` (about 1.21 MiB gzip). Lint exits successfully with 41 compatibility warnings.
- [ ] Resolve full-tree build/lint-tool advisories before treating the entire dependency tree as clean. The current full audit reports 4 high and 10 moderate findings in build/lint tooling; automatic fixes propose incompatible major downgrades to OpenNext 0.3.0, eslint-config-next 15.5.29, or ESLint 9.39.5. No forced downgrade was applied.
- [x] Add `.github/workflows/deploy-cloudflare.yml` for main pushes and manual dispatch, with Node 22, unit and production HTTP tests, production audit, typecheck, Next/OpenNext build, Wrangler dry-run, and deploy. Secret presence is checked without displaying values; actual Cloudflare credentials are scoped to the main-branch deploy step only.
- [ ] Push the workflow and upgrade to `main`, then verify the GitHub Actions run against the existing production URL, `https://mhfashion.mhfashionmm.workers.dev`. The base site is live (`curl` returned HTTP 200), but this upgrade has not deployed. Current `main` has no workflow; the new workflow remains on this branch. The owner reports adding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, but `gh secret list` returns HTTP 403, so the workflow's own check must establish their availability.
- [ ] Connect Supabase and apply catalog migrations/seeds before claiming real product listings; until then the storefront shows its empty-catalog state.
- Evidence: final Next.js and Cloudflare builds, dry-run, 9 unit tests, and 5 production HTTP tests passed. The existing public homepage returned HTTP 200 via curl; the security upgrade still awaits deployment.


## Cloudflare deployment follow-up (2026-11-12)

- [x] Push the security-upgrade code and Cloudflare deployment workflow to `main` as commit `9cb5e21`.
- [x] Recheck the production workflow after the owner reported adding secrets. The push-triggered run and its rerun both stopped before CI at the required-secret check; GitHub Actions evaluated `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing. The existing production site remains reachable, but the upgrade was not deployed.
- [ ] Add those exact names as repository-level Actions secrets in `mhfashion/mhfashion` → Settings → Secrets and variables → Actions → Repository secrets. If stored as Environment secrets, identify the Environment name so the workflow can reference it. Never send secret values in chat.
- [ ] After GitHub exposes both values to Actions, rerun the workflow and verify its CI checks, Cloudflare deploy, and the public Worker response.
- Evidence: workflow run [#42882789084](https://github.com/mhfashion/mhfashion/actions/runs/42882789084), attempt 2, stopped at the secret-presence step; no GitHub-hosted tests/build/deploy ran. Local production audit, tests, typecheck, Next/OpenNext builds, Wrangler dry-run, and editor browser regressions passed.


## Product detail recommendations (2026-11-12)

- [x] On `/products/[slug]`, keep each item under “You may also like” in its own visible card with an independent outline, inset spacing, and separation from neighboring items. Preserve the shared recommendation section and leave other product grids unchanged.
- Evidence: Next.js 16 production build passed; `npm run test:guide` passed 9/9; lint exited with 0 errors and 41 existing warnings; `git diff --check` passed.
