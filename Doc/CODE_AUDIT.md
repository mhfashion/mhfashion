# MH Fashion Repository Code Audit

- **Repository:** `mhfashion/mhfashion`
- **Reviewed baseline:** `main` at commit `90dc398` (2026-11-13)
- **Review type:** Read-only source review plus local build/test/dependency checks. No application code, database, or production deployment was changed.

## Executive summary

The review covered five independent areas: storefront routes/shared UI, editor canvas/document model, editor panels and mobile interactions, admin/Supabase/data flows, and deployment configuration/tests. It confirmed **13 actionable issues: 1 high, 11 medium, and 1 low**. The highest-impact issue is that `/create` is currently a placeholder workspace, not an operational design editor. The detailed editor capabilities in older project notes describe historical/planned behavior and do not match the audited source at this commit.

The local unit tests, corrected production-server HTTP tests, Next.js build, and Cloudflare Worker build pass. Production dependencies have no reported advisories, but the full development/build dependency tree has 14 advisories. No production deployment, Supabase migration, or live account operation was performed.

## Findings

### High

#### 1. `/create` is a placeholder, not an editable or persistable design editor

**Evidence:** `apps/web/src/app/create/page.tsx:3-8` mounts only `KittlCanvas`. In `apps/web/src/components/KittlCanvas.tsx:129-136`, the design area is an empty `div`; component state covers only mockup visibility, zoom, pan, and gesture handling. The adjacent mockup is explicitly a placeholder (`KittlCanvas.tsx:154-179`). There is no editor document model, artwork operation, history, serializer, or persistence call wired to the route. Although `supabase/migrations/0001_initial_schema.sql:89-95` defines `user_designs.canvas_state`, this route does not use it.

**Recommendation:** Build and mount a typed document model, editing operations, selection/history, layer and property controls, validation/serialization, and persistence before presenting `/create` as an operational design editor. Treat the detailed editor plan as forward-looking until each capability is implemented and tested.

### Medium

#### 2. Storefront navigation points to missing routes

**Evidence:** `apps/web/src/app/page.tsx:37-40` links to `/products`, `/products?new=true`, and `/categories/t-shirts`. `apps/web/src/components/CategoryRow.tsx:28-30,49-51` links to `/categories` and `/categories/{slug}`. `apps/web/src/components/Footer.tsx:26-29` links to `/products` and `/best-sellers`. The audited route tree has no products index, categories route, or best-sellers route; available product pages use `/products/[slug]`, with `/new` and `/popular` as separate pages.

**Recommendation:** Point navigation at implemented destinations or add the intended index/category pages, including handling for their query parameters.

#### 3. Header search controls do not perform a search

**Evidence:** `apps/web/src/components/HeaderActions.tsx:47-74` renders desktop and responsive text inputs without a form submission handler, search state, or results navigation. Typing a query has no observable search effect.

**Recommendation:** Connect both inputs to one shared search action and implemented results route, or remove/disable the affordance until search is available.

#### 4. Collection category links are ignored

**Evidence:** `apps/web/src/components/Header.tsx:8-14` navigates to `/collections?category=...`, but `apps/web/src/app/collections/page.tsx:19-21` always loads the same collection products and does not read `searchParams`. Collection cards also point to the same `#collection-products` anchor.

**Recommendation:** Validate and apply the category query parameter to the catalog, or route those links to real category-specific destinations.

#### 5. Product option selections are discarded and cart prices use only the minimum

**Evidence:** `apps/web/src/components/ProductOptions.tsx:14-17,22-31` stores size/color/product-type choices locally. Those choices are not passed to `ProductDetailActions.tsx:13-14`; `addItem` receives the unchanged product. `apps/web/src/components/CartPageClient.tsx:12,18-20` computes cart display and subtotal from `priceMinKs`, so the selected variant and applicable price are not represented.

**Recommendation:** Lift selected options into the add-to-cart operation, persist the selected variant and unit price in each cart item, and calculate line totals/subtotal from that selected price.

#### 6. “Best Sellers” is not ranked by sales or popularity

**Evidence:** `apps/web/src/lib/products.ts:83-101` notes that sales-count data is unavailable, filters to `is_new=false`, and sorts by `created_at` ascending. `apps/web/src/app/popular/page.tsx:10-14` presents the result as best sellers/popular products.

**Recommendation:** Use a verified popularity metric, or label the listing as a placeholder/curated selection until that data exists.

#### 7. Account page presents shared hard-coded sample data as an account

**Evidence:** `apps/web/src/app/account/page.tsx:42-46,179-208` includes a fixed profile/contact identity, orders, point totals, balance, designs, and wishlist. It does not load signed-in user data, and the Save control has no handler.

**Recommendation:** Connect the page to authenticated, user-scoped data and persist profile edits. Until then, clearly label all data as a demo and avoid presenting sample identity/contact information as a real account.

#### 8. Short phone viewports can clip the stacked editor workspace

**Evidence:** `apps/web/src/components/KittlCanvas.tsx:105-120,124-160` uses `overflow-hidden`; below `md` the canvas/mockup stack vertically but retains width-derived heights and a 48px separator. The page uses an `h-dvh` container (`apps/web/src/app/create/page.tsx:5-8`), so on short phone viewports the lower content can extend beyond the available height without a scroll path.

**Recommendation:** Add vertical scrolling or a viewport-fit mode, then verify short phone heights and landscape layouts as part of the required Web/Desktop + Phone acceptance checks.

#### 9. Touch pointers cannot pan the canvas on phones

**Evidence:** `KittlCanvas.tsx:68-71` accepts only middle-button drag or Space+left-button drag. A touchscreen primary pointer does not meet either condition, and the viewport is `overflow-hidden` (`KittlCanvas.tsx:115`), leaving no touch pan route.

**Recommendation:** Add a deliberate touch pan gesture (and pinch zoom if supported), with appropriate touch-action/pointer handling and accessible alternatives. Test on phone and preserve interactions for controls.

#### 10. Users can update their own reward-point balances

**Evidence:** `supabase/migrations/0001_initial_schema.sql:17-18` defines `daily_points` and `purchase_points`. The `profiles` policy at lines 139-141 grants `FOR ALL` when `auth.uid() = id`; row-level filtering does not constrain which columns the user may update.

**Recommendation:** Replace the broad write policy with column-limited updates or a trusted database function. Reward balances should be writable only through controlled server-side logic.

#### 11. `platform_settings` lacks row-level security or API-role restrictions

**Evidence:** `supabase/migrations/0001_initial_schema.sql:81-87` creates settings including saved-design limits and the exchange rate. The migration enables RLS on several user tables at lines 134-137 but not on `platform_settings`; no later migration in the reviewed set enables RLS or revokes API-role access. If the Supabase API roles have table grants, the settings may be directly accessible or modifiable.

**Recommendation:** Enable RLS, revoke direct `anon`/`authenticated` access, and expose only narrowly scoped reads or administrative changes through trusted server-side operations.

#### 12. CI HTTP smoke tests do not exercise the Cloudflare Worker artifact

**Evidence:** `.github/workflows/deploy-cloudflare.yml:70-111` starts `npm run start --workspace=apps/web` and runs the HTTP tests against the Next.js Node server (around line 101), then builds the OpenNext Worker and runs Wrangler dry-run (around lines 107-111). It does not start the built Worker/OpenNext preview and send HTTP requests to that runtime.

**Recommendation:** After `cf:build`, run the Worker locally through Wrangler/OpenNext preview and execute smoke tests against that target before deploy. Keep Next.js smoke tests only if they are intended to validate a separate runtime.

### Low

#### 13. Price-range lookup failures can make products appear free

**Evidence:** `apps/web/src/lib/products.ts:42-45,59-60` returns an empty price-range map when the query fails; `toProduct` then assigns `priceMinKs` and `priceMaxKs` as `0` when no range is found.

**Recommendation:** Represent price-data lookup failure explicitly and show an unavailable-price state unless zero is a verified price.

## Dependency and lint observations

- `npm audit --workspace=apps/web --omit=dev`: **0 vulnerabilities/advisories** in production dependencies at audit time.
- Full `npm audit`: **14 findings (4 high, 10 moderate)**, in build/lint dependencies including OpenNext/minifier/glob and ESLint/TypeScript-ESLint dependency chains. npm's suggested fixes include incompatible major changes (for example OpenNext Cloudflare `0.3.0`, `eslint-config-next` `15.5.29`, or ESLint `9.39.5`), so no automatic fix was applied.
- `npm run lint` completed with **0 errors and 24 warnings**. Warnings include unused imports/values, internal navigation anchors, raw `<img>` usage, and synchronous state-setting effects.
- The Cloudflare build emitted a non-blocking warning that `workerd compatibility_date` is `2025-04-01`.

## Validation performed

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

## Scope limitations

This was a source review and local validation, not a production deployment or live service audit. No production URL, authenticated account, Supabase project, RLS behavior against a live database, or Cloudflare Worker preview was exercised. These findings describe the reviewed source at `90dc398`; confirm against the target commit before remediation.
