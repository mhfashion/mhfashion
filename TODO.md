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

## Canva-style Text and Products browser

Source of scope: `docs/PROJECT_PLAN.md` section 6.

- [x] Canva-like text insertion and typography controls in `/create`
  - Add heading, subheading, and body text from the Text panel; allow users to type custom copy before insertion.
  - Search and browse font choices by style category; show live font previews and ready-made paired text/font designs that add as grouped, separately editable layers.
  - For selected text, change font family, size, color, bold, italic, underline, alignment, and letter/line spacing. Preserve text editing, transforms, Undo/Redo, and browser-local draft storage.
  - Use browser/system fonts in this phase; keep versioned font and text-style manifests with future R2 keys. Do not fetch, copy, or upload font binaries before license review and the R2 phase.
- Evidence: the editor builds with three text-size presets, searchable category-based font previews, four grouped font combinations, and persisted Fabric text formatting; all 12 font IDs and seven preset/combo references validate against local manifests.
- [x] Products browser for `/create`
  - Fetch actual store product entries and price ranges from the existing public catalog source; display product images, names, and prices; support search, open the product detail page, and select a product as the editor's current target.
  - Persist the current product choice in the browser-local draft. Keep mockup selection separate until product-to-mockup mapping is validated.
- Evidence: `/api/editor/products` is included in the production build and calls the shared storefront query with price ranges; the UI displays image/price data, supports search/filter/details/select, restores the selected product from the existing draft selection field, and handles API unavailability without breaking the editor. The local production-server smoke test returned 503 because this Sandbox lacks the Supabase URL runtime setting, so live data retrieval still needs confirmation in the configured project runtime.
- [ ] Verify live Products API data with the project's existing Supabase runtime configuration. No R2 connection is needed for this check.
- [ ] Future typography and product-asset R2 migration (explicitly deferred)
  - Later place licensed font files at `fonts/v1/{font_id}.woff2`, text-style metadata/previews under `text-styles/v1/`, and product card/mockup imagery under the planned `products/` and `mockups/` keys; serve private assets through same-origin routes. Do not connect R2, create a bucket or binding, expose a public bucket, or upload files now.
