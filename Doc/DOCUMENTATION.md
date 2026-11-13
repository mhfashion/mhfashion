# MH Fashion — Project Documentation

**Canonical documentation file:** `Doc/DOCUMENTATION.md`
**Planning file:** [`Plan/PLAN.md`](../Plan/PLAN.md)

This file consolidates the website work log, code audit, Guide content maintenance instructions, and Admin Dashboard visual-reference notes that previously lived in separate `Doc/` and `docs/` files. The plan remains a separate, canonical file in `Plan/`.

## Contents

- [Website Work Log](#work-log)
- [Repository Code Audit](#code-audit)
- [Guide Content Operations](#guide-content-operations)
- [Admin Dashboard Visual Reference](#admin-dashboard-reference)

<a id="work-log"></a>
## Website Work Log

This log records completed website-related changes in the connected repository. Add an entry after each completed implementation or documentation task, with the date, scope, files, validation evidence, and known limitations. Code-review findings are detailed in [Code Audit section](#code-audit).

### 2026-11-13 — Correct mockup control placement and close actions

- Removed the `Front` and `Add Mockup` text row above the canvas. The canvas remains blank until **Add Mockup** is selected from the canvas-edge menu. The circular **Add Back Mockup** control now sits beside the **Front Mockup** title; clicking it adds **Back Mockup**. Each mockup box has its own `×` control and can be dismissed independently.
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
- **Reviewed baseline:** `main` at commit `90dc398` (2026-11-13)
- **Review type:** Read-only source review plus local build/test/dependency checks. No application code, database, or production deployment was changed.

### Executive summary

The review covered five independent areas: storefront routes/shared UI, editor canvas/document model, editor panels and mobile interactions, admin/Supabase/data flows, and deployment configuration/tests. It confirmed **13 actionable issues: 1 high, 11 medium, and 1 low**. The highest-impact issue is that `/create` is currently a placeholder workspace, not an operational design editor. The detailed editor capabilities in older project notes describe historical/planned behavior and do not match the audited source at this commit.

The local unit tests, corrected production-server HTTP tests, Next.js build, and Cloudflare Worker build pass. Production dependencies have no reported advisories, but the full development/build dependency tree has 14 advisories. No production deployment, Supabase migration, or live account operation was performed.

### Findings

#### High

##### 1. `/create` is a placeholder, not an editable or persistable design editor

**Evidence:** `apps/web/src/app/create/page.tsx:3-8` mounts only `KittlCanvas`. In `apps/web/src/components/KittlCanvas.tsx:129-136`, the design area is an empty `div`; component state covers only mockup visibility, zoom, pan, and gesture handling. The adjacent mockup is explicitly a placeholder (`KittlCanvas.tsx:154-179`). There is no editor document model, artwork operation, history, serializer, or persistence call wired to the route. Although `supabase/migrations/0001_initial_schema.sql:89-95` defines `user_designs.canvas_state`, this route does not use it.

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

##### 8. Short phone viewports can clip the stacked editor workspace

**Evidence:** `apps/web/src/components/KittlCanvas.tsx:105-120,124-160` uses `overflow-hidden`; below `md` the canvas/mockup stack vertically but retains width-derived heights and a 48px separator. The page uses an `h-dvh` container (`apps/web/src/app/create/page.tsx:5-8`), so on short phone viewports the lower content can extend beyond the available height without a scroll path.

**Recommendation:** Add vertical scrolling or a viewport-fit mode, then verify short phone heights and landscape layouts as part of the required Web/Desktop + Phone acceptance checks.

##### 9. Touch pointers cannot pan the canvas on phones

**Evidence:** `KittlCanvas.tsx:68-71` accepts only middle-button drag or Space+left-button drag. A touchscreen primary pointer does not meet either condition, and the viewport is `overflow-hidden` (`KittlCanvas.tsx:115`), leaving no touch pan route.

**Recommendation:** Add a deliberate touch pan gesture (and pinch zoom if supported), with appropriate touch-action/pointer handling and accessible alternatives. Test on phone and preserve interactions for controls.

##### 10. Users can update their own reward-point balances

**Evidence:** `supabase/migrations/0001_initial_schema.sql:17-18` defines `daily_points` and `purchase_points`. The `profiles` policy at lines 139-141 grants `FOR ALL` when `auth.uid() = id`; row-level filtering does not constrain which columns the user may update.

**Recommendation:** Replace the broad write policy with column-limited updates or a trusted database function. Reward balances should be writable only through controlled server-side logic.

##### 11. `platform_settings` lacks row-level security or API-role restrictions

**Evidence:** `supabase/migrations/0001_initial_schema.sql:81-87` creates settings including saved-design limits and the exchange rate. The migration enables RLS on several user tables at lines 134-137 but not on `platform_settings`; no later migration in the reviewed set enables RLS or revokes API-role access. If the Supabase API roles have table grants, the settings may be directly accessible or modifiable.

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

The owner should run [`supabase/migrations/0005_guide_content.sql`](../supabase/migrations/0005_guide_content.sql) manually in the Supabase SQL Editor after migrations `0001` through `0004`. This task does not apply database changes. The migration is safe to re-run for its seed rows: category and post inserts use stable slugs with `ON CONFLICT (slug) DO NOTHING`, so existing owner edits are not overwritten.

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
where slug = 'the-planned-editor-flow';
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
where slug = 'the-planned-editor-flow';
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
