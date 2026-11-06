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
