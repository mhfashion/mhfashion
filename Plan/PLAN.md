# MH Fashion — Master Plan

**Canonical planning file:** `Plan/PLAN.md`
**Consolidated from:** the former project, editor vision, editor implementation, legacy architecture, deployment notes, and TODO sources. Their full planning/specification/history content is preserved below. Operational guidance and audit records are consolidated in [`Doc/DOCUMENTATION.md`](../Doc/DOCUMENTATION.md).
**Repository baseline at consolidation:** `mhfashion/mhfashion`, branch `main`, commit `90dc398` (2026-11-13). Re-check code and deployment before treating dated status statements as current.
**Contents:** Part I is the project plan (sections 1 to 19 and the dated updates below; §19 holds the system architecture and operations); Part II is the editor plan, at the end of this file ([Part II — Editor plan](#part-ii--editor-plan)). `Plan/` holds this one file only.

## Owner directives and maintenance rules

1. **UI/UX must cover Web and Phone together.** Whenever a UI/UX feature is planned or changed, specify, design, implement, and verify both Web/Desktop and Phone/Mobile in the same plan and work item. Include responsive layout, interaction differences, accessibility/touch behavior, important states, and acceptance checks for both form factors. Do not plan Web alone and leave Phone behavior undefined.
2. After each website-related implementation task, record completed work, evidence, and remaining limitations in the [Work Log](../Doc/DOCUMENTATION.md#work-log); use the [Code Audit](../Doc/DOCUMENTATION.md#code-audit) section for repository-wide or focused code-review findings.
3. If implementation work reveals missing or changed scope, update this master plan and its Change Log before treating that scope as approved. Keep current requirements here; preserve dated history as history.
4. This is the single source of truth for plans, product direction, detailed editor requirements, the legacy architecture snapshot, and the migrated task register. Do not recreate separate planning files.
5. **Push repository work directly to GitHub.** After writing and basic validation of requested repository changes, commit and push them directly to the repository default branch (`main`) immediately, without asking the owner again. Do not create a compare/pull-request workflow unless the owner explicitly requests one. A GitHub push is not a production deployment; deployments and production data changes remain separate actions.
6. **The file layout is fixed.** See *Repository layout and file rules* below: `Plan/` holds one file, `Doc/` holds documents only, `SQL/` holds SQL only, `Worker/` holds one Worker file. Finished work is recorded in `Doc/DOCUMENTATION.md`, never in a new file.

## Repository layout and file rules  *(owner, 2026-11-23)*

The repository is kept in a fixed shape so nothing is scattered. `tests/repo-layout.test.cjs` fails when it drifts.

| Place | Holds | Rule |
|---|---|---|
| `Plan/` | `PLAN.md` | **Exactly one file.** Part I is the project plan, Part II is the editor plan. No second plan, no TODO, no notes file. |
| `Doc/` | `README.md` (the index), `DOCUMENTATION.md` (work log), `EDITOR.md`, `PRINT-BUNDLE.md`, `MH-DELIVERY.md`, `R2-STORAGE.md` | Documents only, Markdown only, one topic per file. Every file is listed in `Doc/README.md`. No plans, SQL or scratch files. |
| `SQL/` | numbered `NNNN_name.sql` files | SQL only: no README, no JSON. Numbers rise without repeats. The owner applies them in order in the Supabase SQL Editor. A file is never edited after it has been applied; a new number is added instead. |
| `Worker/` | `assets.ts` | **Exactly one Worker file.** The folder is created when the R2 asset Worker is built (section 12.1) and does not exist before. Its configuration is `wrangler.assets.jsonc` at the repository root. |
| `apps/web/` | the site | Its own `wrangler.jsonc`. |
| `tests/`, `scripts/` | tests and helper scripts | |
| repository root | `README.md` (the repository map), `AGENTS.md` (agent rules), `package.json`, `package-lock.json`, `.gitignore`, `.github/` | Nothing else. No loose plans, notes or TODO files. |

Rules that follow from this:
1. A new top-level file or folder needs the owner's word.
2. Finished work is recorded in `Doc/DOCUMENTATION.md`, never in a new file.
3. A new document is added to `Doc/README.md` in the same change.
4. SQL files move only forwards: add `NNNN_name.sql`, never rename or reorder.
5. The old `SQL/` folder no longer exists; the Supabase CLI is not used, so the folder name is free.

## Source-of-truth precedence

- The current project overview, decisions, and build/deployment status are maintained in the **Project Plan** section below; reconcile stale dated statements against its latest status and the live repository.
- The **editor plan** is **Part II of this file** ([Part II — Editor plan](#part-ii--editor-plan)): the detailed contract for editor behavior, implementation, and acceptance tests. `Doc/EDITOR.md` documents the behaviour as built.
- The **Deployment Upgrade and Publishing Notes**, **Legacy Architecture Reference**, and **Historical TODO Register** are retained for traceability; they are archival where they conflict with current sections or current code.

---

<a id="project-plan"></a>
## Project Plan (consolidated from `docs/PROJECT_PLAN.md`)

Print-on-demand platform (web app first, mobile app later). This is the single
source of truth for scope and decisions. It supersedes the early draft in
`Plan/PLAN.md#legacy-architecture-reference`.

**How to edit this file:** each section is self-contained. When a decision
changes, edit it in place and add a line to the Change Log at the bottom.
Anything not yet decided lives in section 13 (Open / Deferred).

---

## 1. Overview

- Two kinds of products: customizable (user designs artwork in the editor) and
  fixed-design (user picks an existing design).
- Dark mode is the default theme; light mode via toggle. Visual direction: bold
  streetwear (reference template "VOID"), neon-lime accent `#d4ff3f`.
- Language: UI copy ships in **English and Myanmar (EN/MM)**; the switcher sits in the header
  pill and in the mobile drawer. (Owner decision, 2026-11-21.)

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 16.4.6 (App Router) + React 19.3.1 + TypeScript 5.9.3 + Tailwind CSS 3.4.19 |
| Editor engine | Fabric.js 7.4.0 (vector + raster hybrid) |
| Backend | Next.js server layer only — App Router server components and route handlers calling `@supabase/supabase-js` / `@supabase/ssr`. No separate NestJS or Express service exists in the repo. |
| Database / Auth | Supabase (PostgreSQL, Auth, RLS) |
| Storage | Cloudflare R2 (contracted, not connected yet — see sections 12 and 13) |
| Hosting | Cloudflare Workers via `@opennextjs/cloudflare` 1.20.16 + Wrangler 4.158.0 |
| Node runtime | Node.js 22 (the deploy workflow pins `node-version: 22`) |
| AI | Hugging Face (Remove Background, Upscale); own GPU server via API (image generation, later) |
| Mobile (provisional) | React Native |
| Email (provisional) | Resend |

Fonts: woff2 for web, otf for the future mobile app.

Versions above are the installed resolutions in `package-lock.json` (verified
2026-11-12); `apps/web/package.json` holds the matching semver ranges. Update
this table whenever a dependency major/minor changes.

## 3. Dev Workflow

- The AI coding assistant (Claude / Manus) writes all code (web + app); no Cursor.
- GitHub: `mhfashion/mhfashion`. Production deploys run through the committed
  GitHub Actions workflow `.github/workflows/deploy-cloudflare.yml` on pushes to
  `main` that touch `apps/web/**`, `package.json`, `package-lock.json`, or the
  workflow itself (plus manual dispatch). Cloudflare's own Git integration is not
  deploying current `main` either — the live build predates the current HEAD — so
  this workflow is the path to fix. As of 2026-11-12 every run stops at the
  secret-presence check, and pushes to `main` do not reach production.
- The workflow runs, in order: secret check → `npm ci` → production audit →
  `npm run test:guide` → `npm run build --workspace=apps/web` →
  `npm run test:guide:http` against a local production server → `tsc --noEmit`
  → `npm run cf:build --workspace=apps/web` → `wrangler deploy --dry-run` →
  `wrangler deploy` (main only). It needs the repository secrets
  `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- Supabase: the AI assistant writes SQL migrations (`SQL/`); the
  owner runs them in the SQL Editor. Migrations `0001`–`0007` are committed.
- Current build toolchain: Next.js 16.4.6, React 19.3.1, Fabric.js 7.4.0,
  `@opennextjs/cloudflare` 1.20.16, Wrangler 4.158.0, ESLint 10.14.0 (flat
  config). Keep the lockfile aligned with these versions; the OpenNext Worker
  build is validated with `npm run cf:build --workspace=apps/web`.
- Standalone Cloudflare Worker scripts are NOT committed to the repo; the
  assistant hands over the code and the owner deploys it in Cloudflare.
- Secrets (`.env.local`, API keys, tokens) never go into GitHub.

## 4. Product & Attribute System

- Hierarchy: Product → Style → Color; all counts dynamic, never hardcoded.
- `is_customizable`: `full`, `none`, or `partial` (locked base template, only
  overlay fields editable).
- Attributes are admin-configurable per product type from a Super Admin
  "Attribute Management" module: product types, attribute types, value lists,
  and cascading rules — no code changes needed.
- Top-level selector is named **Product** (T-shirt, Streetwear, Hoodie, Cup,
  Phone Cover, more later).

### 4.1 T-shirt / Hoodie / Streetwear selection chain

`Product → Print Method → Fabric Type → Knit/Fabric Structure → GSM → Color → MH Cuttings → Size`

- Print Method: DTF | Sublimation
- Fabric Type: Combed Cotton | Compact Combed Cotton | Polyester (flat list)
- Knit/Fabric Structure: Single Jersey | Interlock | Air Layer
- GSM: admin preset list (e.g. 160 / 180 / 200 / 240)
- MH Cuttings: cut styles (Crew Neck, V-Neck, …)

**Cascading rule:** each earlier choice filters every later attribute, not only
the next one. Unavailable options are hidden entirely (not greyed out).
Example: Sublimation → Fabric Type narrows to Polyester only, and Knit
Structure / GSM options narrow too. Color, Cutting and Size are not filtered.
Rules are set by the Super Admin.

**Attribute names are final (owner decision, 2026-11-21):** Print Method, Fabric Type, Knit
Structure, MH Cuttings. Pricing and Posts screens must use these names rather than the older
Material / Fit Type / Sleeve / Print wording.

**Answered (owner, 2026-11-21): the Posts labels are renamed, not mapped.** The Posts module now
carries `Print Method`, `Fabric Type`, `Knit Structure`, `MH Cuttings` and `Color`, with the 4.1
option values, and the Editor Header Bar 2 shows the same chain. The stored keys (`material`,
`cutting`, `print`, …) are unchanged so saved posts keep their combinations; posts saved with the
old option words (Cotton, Standard, Screen Print, …) are mapped onto the 4.1 vocabulary on read by
`normalizeTshirtPostOptions` (`lib/admin-demo-data.ts`). The chain lists and cascade live in
`lib/editor-attributes.ts` and are shared by both screens.

**Implemented cascade (2026-11-21):** Sublimation → Fabric Type = Polyester only; Polyester →
Knit Structure = Interlock | Air Layer; cotton → Single Jersey | Interlock. GSM, Color, MH
Cuttings and Size are not filtered. A selection the cascade drops falls back to the first option
still offered instead of staying on screen.

**The cascade is admin-driven (2026-11-22).** The rules are data in `data.attributeCascade`
(`lib/attribute-rules.ts`: `{ target, source, value, allowed }`), seeded with the four documented
rules, and Attribute Management (§16) edits them as one table per source → target pair: every cell is
"Offered" or "Hidden" for one source value, so the Super Admin sees the whole matrix instead of a rule
form. The pricing grid enumerates combinations through the same rules (`combinationsFor(…, rules)`), so
an admin change and the price book cannot disagree — offering Combed Cotton under Sublimation takes
Mandalay Nights Tee from 3 to 6 priced combinations, and Reset puts the four rules back. A change is
refused when it would hide every value ("switch the attribute off instead") or orphan a price row
("Peacock Line Tee still prices 1 row that this rule removes"). An empty rule list is a real choice
(nothing is narrowed); only a store saved before the field existed reads as the documented cascade. The
chain's column order does not decide what narrows what — the rules do — so reordering the chain cannot
silently change the cascade. The design editor keeps its built-in cascade (owner directive 1) and the
screen says so.

### 4.2 Phone Cover

Brand (iPhone / Android) → Model. If the model supports wireless charging, an
extra choice appears (with cutout / regular); otherwise it is hidden. Quality
or material attribute comes later.

### 4.3 Sub-brands (category tags, not permission systems)

Sticker (shown as "MH Fashion"), Singular (not customizable), Kids, Streetwear,
Sport (full customization), Accessories.

### 4.4 Football Jersey (MH Sport)

- Full editing, same layer/group editor as T-shirt.
- Design is a panel-based SVG (front-left, front-right, back, sleeves, collar).
- Preview is auto-generated: admin sets one worn-jersey photo plus mapping
  zones per panel; the same setup serves the catalog preview and the
  post-edit mockup. Mockup attach is automatic (panels map 1:1 to garment
  regions).
- MVP uses a simple perspective warp per panel; displacement-map realism is a
  later upgrade.

### 4.5 Pricing

Price belongs to one **full valid combination** of the chain in 4.1 — not to a size, and not to a
base price with deltas. Admin enters every price by hand in the Pricing Management module (4.5.1).
Product cards show a range (lowest–highest); once a full combination is chosen on the detail page,
show the exact price. Other product types get their own attribute sets and pricing rules.

**Google Sheet price import is removed** (owner decision, 2026-11-21). The link field, the
server-side CSV fetch and the "the sheet defines the attributes" rule are gone; 4.5.1 replaces
them. Prices are still one hand-entered amount per valid combination, with no base price, no
derived delta, and unlisted combinations not sold.

Current product-detail prototype behavior: the page shows the catalog price
range until all required variant choices—Size, Color, Material, and GSM—are
selected. Only after the complete set is selected does the displayed value
switch to one exact-looking price using the current client-side variant
calculation. The selected variant and
its calculated price are not yet persisted into the cart item; real
admin-configured combination pricing remains a follow-up data task. The detail
selector uses **GSM** rather than Print Style; quantity multiplies the displayed
unit/variant amount and the same selected quantity is added to the cart by the
Buy Now/Add to Cart actions.

#### 4.5.1 Pricing Management — UI/UX spec (Web and Phone)

Proposed 2026-11-21; Web and Phone are specified together (owner directive 1).

**Status (2026-11-21): the Web grid is built** (`/admin/pricing`, `components/admin/AdminPricing.tsx`,
`lib/admin-pricing.ts`, `lib/pricing-combinations.ts`). Shipped: scope picker (T-shirt post or
product) with a priced/unpriced summary, one row per valid combination with one column per
attribute and an editable Price column (sticky header and first column), one filter per attribute
plus search and an "Unpriced only" toggle with the filtered count, row selection with select-all-
filtered and shift-click ranges, a bulk bar (set exact price / copy from the first selected row)
that states "n rows will change", staged edits with a sticky save/discard bar, per-row price
history, and CSV export (BOM, so Excel reads Myanmar text) plus file-import preview that classifies
every line as new / changed / unchanged / invalid with a reason before writing. Prices accept
`24000`, `24,000` and `Ks 24,000`; 0, negative, over-limit and non-numeric values are rejected with
a message. A stale save (older row version) is rejected instead of overwriting. Post scope writes
the post's own price rows, so the Posts editor and the grid share one source of truth; product
scope writes one row per stocked size, seeded from the catalogue price.

**Phone cards (built 2026-11-21):** below 640 px the table is replaced by grouped cards. Two
selects pick the grouping (default **Print Method → Fabric Type**); each section header collapses
and shows `n/total priced`; a card shows the remaining attributes as chips, a 44 px price field
(`inputmode="numeric"`, so the keypad opens), an `Unpriced` badge and a 44 px history button.
Filters and bulk actions open as bottom sheets ("Filters (n)", "Bulk (n)") with "n rows will
change" still stated before anything is written, and the staged-save bar is sticky above the
safe-area inset so it is never covered. Verified in headless Chromium at 390 px and 320 px: no
horizontal page scroll (`scrollWidth === clientWidth`), every touch target ≥ 44 px, and the phone
flow (select → bulk set → save) writes the same rows as the web grid. The search field in the
admin header needed `min-w-0` to stop it forcing 370 px of page width at 320 px.

**Admin sidebar colour fixed (2026-11-26).** The dark sidebar was split by the platform's light grey
scrollbar (measured `rgb(159,159,159)` down its right edge against the panel's `rgb(17,23,27)`), and the
"Create. Print. Wear." card sat inside the scroll area, so the fold cut it in half. The nav now scrolls
with a dark bar (`.admin-scroll-dark`: thin, transparent track, `rgba(255,255,255,.18)` thumb — measured
`rgb(59,64,68)` after the change) and the card is pinned under the nav, above the user row. Two latent
layout bugs in the same panel are gone with it: the user row's name block carried a stray
`md:ml-[224px]` that pushed the name and email out of the 224 px panel (only the avatar showed), and the
drawer a11y test read the toggle by its "Open navigation" label, which flips to "Close navigation" on
open — it now reads `[data-admin-nav-toggle]`, and its first-visible-"Open "-button lookup no longer
picks the sidebar toggle instead of an order row.

**Attribute Management (built 2026-11-21, cascade added 2026-11-22):** `/admin/attributes` edits the
chain — order, labels, option lists and on/off state — in `data.attributeChain`, and now the cascade
rules themselves in `data.attributeCascade` (§4.1). Guards refuse a change that would orphan
prices ("Combed Cotton still prices 3 rows in Peacock Line Tee"), a duplicate or empty label, or
switching off an attribute that prices rows. The chain supplies the pricing grid's column order and
labels, the vocabulary a new post draft starts from, and the "no valid combinations → Open Attribute
Management" link in the pricing empty state. Stored posts keep the options they were published with,
and the design editor still uses the built-in list (owner directive 1), which the screen states.

**Rules.** Price belongs to one full valid combination. Only combinations the cascading rules allow
exist as rows, so pricing can never create an invalid combination (Sublimation with Combed Cotton,
for example). A valid combination with no price is **not sold** and shows as "Unpriced" in admin.
Prices are whole Ks integers, above 0 and under Ks 10,000,000. Typed input accepts `24000`,
`24,000` and `Ks 24,000`.

**Data.** `price_combinations` holds scope (product or post), one value per attribute (Print
Method, Fabric Type, Knit Structure, GSM, Color, MH Cuttings, Size), `price_ks`, `updated_by`,
`updated_at` and a version, unique per scope + combination. `price_history` records combination,
old price, new price, who and when. Saves carry the row version, so a stale save is rejected with a
message instead of overwriting someone else's change.

**Web / Desktop.** A scope picker (product or post) with a summary line (total valid combinations,
priced, unpriced); a price table with one row per valid combination, one column per attribute and
an editable Price column, with sticky header and first column inside its own scroll container; one
multi-select filter per attribute plus text search and an "Unpriced only" toggle with the filtered
count always visible; row checkboxes, "select all filtered" and shift-click range selection; a bulk
bar that appears with a selection offering *Set exact price* and *Copy price from…*, both stating
"n rows will change" and requiring confirmation (no percentage or +/- tools, to keep the no-derived-
delta rule); arrow keys between cells, Enter to edit, Esc to cancel, Tab to the next row's price;
staged edits with a sticky "n unsaved changes — Save all / Discard" bar; a per-row history icon.

**Phone / Mobile.** Same data and rules, presented as grouped cards instead of a wide table: group
by a chosen attribute (default Print Method → Fabric Type) with collapsible sections, each row a
card showing the remaining attributes as chips and one large price field; filters and bulk actions
in bottom sheets behind a sticky "Filters (n)" button and an "Unpriced only" toggle; selection mode
by long-press or a Select button; a numeric keypad (`inputmode="numeric"`) with thousands separators
and 44 px minimum targets; a sticky save bar clear of the phone navigation; no horizontal page
scroll at 320 px and 390 px.

**CSV export / import.** Export all rows or the current filter as UTF-8 with BOM (so Excel opens
Myanmar text correctly), one column per attribute plus `Price`. Import is a file upload, not a live
link: the app previews will-change / unchanged / invalid rows with reasons and writes nothing until
the admin confirms; rows that match no valid combination are reported, never silently dropped;
limits are set in settings (proposal: 5,000 rows, 2 MB). Import works on Web and Phone.

**States.** Loading, empty (no valid combinations — link to Attribute Management), unpriced,
invalid price, unsaved changes, saving, saved, version conflict, permission denied.

**Permissions and audit.** Requires the Pricing module permission; every change lands in
`price_history`.

**Acceptance checks (both form factors).** Every valid combination appears exactly once and no
invalid combination can be created; an unpriced combination is flagged and is not purchasable;
`24,000`, `Ks 24000` and `24000` all save as 24000 while 0, negative, over-limit and non-numeric
values are rejected with a message; bulk set and copy touch only the selected rows and state the
count before saving; unsaved changes survive a filter change and warn before leaving; a stale save
is rejected without overwriting; exporting then importing an unchanged file produces zero changes;
Web keyboard-only entry works, and Phone has no horizontal overflow at 320/390 px, shows the
keypad, keeps 44 px targets and an uncovered save bar; a change made on Web is visible on Phone
after reload and the reverse.

#### 4.5.2 Price Table — one box per spec, prices set only here  *(owner request, built 2026-11-21; reshaped three times the same day)*

The owner asked for a Price Table and that posting a product never asks for a price. Two rejected
shapes came first — a **size-by-category matrix**, then a price **per product**. The built shape is
what the owner described last: a **T-shirt card**, and inside it a **box per spec** —
`Product, Type, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color` — where
*"Combed Cotton မဟုတ်တော့ပဲ Cotton ဆိုတာမျိုး … ဈေးကလဲ ပြောင်းလဲသွားမယ်"*: a different fabric is a
different box with different prices. `components/admin/AdminPriceTable.tsx` + `lib/price-table.ts`.

**Cards and boxes.** `productSheets` draws one card per **product type** — apparel by category
(T-Shirt, Hoodie, Polo, Jersey, Cap), everything else by its name (Phone Cover, Tote Bag) — and
`specBoxes` fills each card with one box per **spec**: `productSpecKey` is
`printMethod|fabric|knitStructure|cuttings|gsm|colors`. Two products made to the same spec share a
box (`boxMembers`); a T-shirt in Combed Cotton 180 GSM and one in Cotton 220 GSM are two boxes on the
same T-shirt card, each with its own price per size.

**A price is never set on a product.** Save expands each staged cell onto **every product of its box**
through `saveProductSheet` → `applyPriceChanges`, so versions are checked, `priceHistory` is written,
and each product's listed price becomes its box's lowest size. The product form has no price input: it
shows the box of the spec being posted as chips (`data-product-price-from-table`),
`draftWithTablePrice` saves that box's lowest price, and the new product's rows are seeded from it. The
Pricing grid's **From Price Table** uses the same box.

**Seed and migration.** `seedPriceForSpec` starts a box at the category's size price plus Ks 100 per
GSM above 160, so two specs of one type never start identical. A store saved before the spec fields
existed takes the seed spec and any missing price row on read, and keeps the prices it already had.

**Acceptance checks (verified 2026-11-21).** A fresh store renders 7 cards / 28 size prices; the
T-shirt card holds *Combed Cotton · 180 GSM* (14,000–18,000) and *Cotton · 220 GSM* (18,000–22,000);
typing 17,500 into the Combed Cotton box's XL saved that cell only and left the Cotton 220 box at
21,000 (CDP, survives reload); the phone layout shows one card at a time; the post form shows the
box's chips and has no price input; `node --test tests/*.test.cjs` reports 944 tests, 0 failures.

#### 4.5.3 Saved account address fills checkout  *(owner request, built 2026-11-21)*

The owner asked that a customer who opened an account and entered an address get that address filled
in automatically when paying, while still being allowed to change it.

**Where the address lives.** `apps/web/src/lib/account-profile.ts` keeps the customer's own record
(`{ email, delivery }`) on the device under `mh-fashion-account-profile-v1` — there is still no
customer table on the server, so nothing is uploaded. `accountDeliveryAddress()` only returns a
**complete** address, so a half-saved record never makes checkout look filled when it cannot ship.

**The account form is real.** Account → Profile (now a sidebar section, and what the dashboard's
*Edit Profile* tile opens) captures name, email, phone, township, city and street; *Save changes*
writes the record and confirms "Saved. Checkout fills this address for you." The green account card
shows the saved name and `@handle`.

**Checkout** fills in this order: account address → the address this device kept → the newest order.
The card names its source and keeps **Change**, which swaps the summary for the same editable
fields; the customer can always edit the address for this parcel. Placing the order saves the address
used back into the account, but only when an account already exists (a guest is never given one), and
an incomplete edit never overwrites a good saved address.

Verified end to end in headless Chromium at 1440x900 and 390x844 — save on the account, checkout
shows the account card, Change → edit → place order, and the account copy follows the edit.
Tests: `tests/checkout-account-address.test.cjs`.

#### 4.5.4 Pricing Management — manual price per variant  *(owner spec 2026-11-21)*

Pricing Management (`/admin/pricing`, `components/admin/AdminPricingManagement.tsx` over
`lib/pricing-variants.ts`) manages every product from one screen. Its navigation is the spec's five
tabs: **Overview, Product Pricing, Price Table, Price History, Attribute Management**; the toolbar
carries product search, a category filter, a status filter and **Add product pricing**.

**A variant is one specification combination, size included, with its own price.** Nothing is derived:
no base price plus surcharges, no percentage by attribute. Because the owner can add attributes and
options, the attribute values live in each row's `options` map rather than in columns, so a new
attribute becomes new rows and a new column with no schema change (`SQL/0012_pricing_management.sql`
holds the matching `attributes` / `attribute_values` / `product_attributes` / `product_variants` /
`variant_options` / `variant_prices` / `price_history` tables and the transactional
`set_variant_price` function with its version check).

**Product Pricing.** Choosing a product shows which attributes it prices (`data-pricing-attribute`
checkboxes; Size is always on, the rest start off so the seeded size prices keep working). A
segmented control switches **Table View** — a compact, sticky-header row per variant with dynamic
columns, inline price, Incomplete/Active/Disabled status, duplicate/enable/delete per row, bulk
select + enable/disable, CSV export and 25-row pagination — and **Matrix View** — pick one
specification, then its sizes in one column with copy-to-all-sizes, add/remove size, save all and
clear. Both views write the same `productPrices` rows, so the table, the matrix, the Price Table and
the storefront never disagree.

**Guards.** A price must be a whole number above zero; an empty one is Incomplete, never sold; a
disabled variant keeps its price but is not offered; a save carrying a stale version is reported as a
conflict instead of overwritten; a change that would duplicate a combination is refused; deleting
asks for confirmation and keeps the history. Every applied change appends a `priceHistory` row
(product, specification, previous price, new price, who, when), read back in the Price History tab.

**Attribute Management.** Rename, add/edit/delete options, enable/disable and reorder attributes;
a change that would orphan priced rows is refused with the reason. A brand-new attribute key can be
added and is then switched on per product. The post-level combination grid stays at
`/admin/pricing/combinations`.

**Verified 2026-11-21** in Chromium at 1440x900 and 390x844: five tabs render; the Classic T-shirt
lists 5 size variants; switching **Color** on adds the Colour column and 25 Incomplete rows; pricing
White/S at 9,900 saves as Active, writes one history row, and the matrix shows S Active with M/L
Incomplete; `tests/pricing-management.test.cjs` (9 tests) is green.

#### 4.5.5 Advanced Price Table — MMK + USD, availability, stock  *(owner spec 2026-11-21, part 2)*

The Price Table (`/admin/pricing`, `AdminPricingManagement.tsx`, `lib/pricing-variants.ts`) now prices
every variant in **both currencies**, holds its **availability** and optional **stock**, and offers the
owner's views: **All prices · Table · Matrix · Missing prices · Out of stock · Disabled variants**,
with Price History and Attribute Management as their own tabs.

**Prices.** MMK is a whole number; USD takes two decimals. They are stored separately and neither is
converted into the other — the demo seed's USD values are sample data, not arithmetic on the Ks price.
A variant with one currency missing is **Missing price** (red border, its own view and filter) and is
never sold. The Table edits both inline; the Matrix shows one specification as a two-dimensional grid
(row attribute × size) with an MMK and a USD input in every cell, plus copy-to-cells, add/remove size
and a missing-price indicator.

**Availability vs status.** Every variant carries an availability — *Available, Out of Stock,
Temporarily Unavailable, Disabled* — separate from its Active/Disabled status, so an Active variant can
be out of stock. The product as a whole and each attribute option (say one colour) can be switched
off too; `effectiveAvailability` folds the row, the option switch and the product switch into what the
customer sees, and `variantSellable` requires both prices plus *Available*.

**Stock.** Tracking is opt-in per product. When it is on, a quantity of zero reads as Out of Stock
whatever the manual state says; the editor holds quantity, low-stock threshold, restock quantity, SKU,
note and disable reason.

**Table tools.** Search (product, SKU, spec, price), category/status filters, availability filter,
missing-price filter, MMK minimum and USD maximum, sort by MMK/USD/Updated, column visibility, bulk
selection with bulk availability, CSV export (both currencies, availability, SKU, updated) and CSV
import that stages prices before any save.

**History** records both currencies and the availability change, with actor and time.

**Verified 2026-11-21** at 1440x900 and 390x844: S = 14,000/$3.80; editing to 9,900/$4.65 saved both
(currencies recorded in the history), M switched to Out of Stock left the others selling, the "Out of
stock" view listed only M, and the Matrix showed 9 colours × 5 sizes with 45 MMK and 45 USD cells.
Tests: `tests/pricing-management.test.cjs` (17).

#### 4.5.6 One Price Table, wired to posts, attributes, the shop and a sale  *(owner request 2026-11-21, part 3)*

The owner asked that Price Table and Pricing be **one screen**, that a **Product Post be connected to
it**, that **Attribute Management** feed it, and that this work for **every category**, not only the
T-shirt. Everything below is built and tested.

**One screen.** `/admin/pricing` is *Price Table* — the sidebar has a single entry and the old
`/admin/price-table` route only `redirect("/admin/pricing")`. Its **Price Table** tab now hosts the
per-specification sheet (`<AdminPriceTable embedded />`, which skips the admin shell) beside the five
tabs of 4.5.4.

**Post → Price Table.** A T-shirt post gained `productId`: the editor's **Sold as** select lists every
product with its category, and picking one turns on exactly the specifications that product prices
(`productAttributeKeys`). On publish, `syncPostPricing(data, post)` in `lib/pricing-variants.ts` seeds
the post's combinations into the product's variants — one row per stocked size, carrying the post's
MMK price and a **null USD price**, so the row appears as *Missing price* until the owner types the
dollar figure. A price that already exists is never overwritten, and a Draft post leaves the table
untouched. The editor shows the live state ("Accessory · 1 variant in the Price Table, 0 missing a
USD price") and links to the merged screen; the post list shows which product each post is sold as.

**Attributes → everything.** `createSeedAttributeChain` now carries the specs the other product types
need — Phone Brand, Phone Model, Case Type, MagSafe Support, Cup Type, Capacity, Bag Size — in the same
chain as Size/Fabric/GSM/Print. Every attribute is *available*; which ones a product prices is chosen
per product in Pricing, and a new post starts on the four T-shirt defaults with the rest one tick away.
Renaming or adding an option in Attribute Management therefore reaches the post editor and the price
grid with no second model, and turning a spec on for a phone cover builds its grid
(`phoneBrand × caseType × size`).

**Shop reads the stored price.** `SQL/0012_pricing_management.sql` adds
`product_variant_prices(p_product_id)` returning signature, options, both prices and availability;
`getProductVariants` in `lib/products.ts` reads it into `Product.variants`, and `ProductDetailClient`
prices the picked combination from the matching row. `formatPrice` in `lib/currency-context.tsx` only
**chooses a column**: Ks shows the stored MMK, USD shows the stored USD, and a missing currency shows
the one that exists — never `amountKs / exchangeRate`. A combination that is unpriced, out of stock or
switched off cannot be added to the cart and says why (`variantNotice`).

**A sale moves variant stock.** `applyVariantStockForOrder` takes each ordered line's variant stock on
a paid order and gives it back on a refund or cancellation, once per order (`variantStockConsumedAt` /
`variantStockRestoredAt`), called from `syncStockWithStage` beside the Inventory movement.

**Verified 2026-11-21** in Chromium 1440x900 against a production build: the post editor listed seven
products across five categories, picking *Phone Cover · Accessory* switched the summary to
"Accessory · 1 variant in the Price Table, 0 missing a USD price"; `/admin/pricing` showed the five
tabs and the merged sheet with all seven product types (T-Shirt, Hoodie, Polo, Jersey, Cap, Tote Bag,
Phone Cover); `/admin/price-table` redirected to `/admin/pricing`. Tests:
`tests/pricing-connections.test.cjs` (8) and the full suite — 969 tests, 0 failures.

#### 4.5.7 Attributes and the Price Table for every category  *(owner request 2026-11-21, part 4)*

The owner asked that **Attribute Management and the Price Table also cover the other categories** —
phones, kids' T-shirts, football kits, bags and cups — not only the T-shirt.

**Six specification packs, one chain.** `CATEGORY_POST_ATTRIBUTES` in `lib/admin-demo-data.ts` now
carries the whole range: Phone Brand / Phone Model / Case Type / MagSafe Support, Cup Type / Capacity
/ **Lid Type**, Bag Size / **Bag Type** / **Bag Material**, **Kit Type / Jersey Print / Sleeve Patch**
(football), **Kids Age Band / Kids Pack**, and **Cap Style**. Attribute Management groups the chain
under a heading per pack (`data-attribute-pack`, from `attributePackLabel`), so the owner sees which
specs belong to which product instead of one flat list of 25 attributes.

**A product starts on its category's preset.** `SPEC_PRESETS` names the specification each kind of
product is priced by — T-shirt (size only), Kids T-shirt (pack + age band + size), Football kit (kit
type + shirt print + size), Phone cover (brand + case type + size), Cap (style + size), Bag (type +
size + size band) and Cup (type + capacity + size). `specPresetForProduct` resolves it from the
category, telling the accessories apart by name ("Phone Cover" vs "Tote Bag"). The seed applies the
preset to every product, and the Pricing screen shows one **preset** button
(`data-pricing-preset`) that ticks the whole set in one click.

**New categories and their own sizes.** `AdminProductCategory` gained **Kids T-Shirt** and **Cup**;
`KIDS_SIZES` (1-2Y … 13-14Y) is what a kids' tee stocks, and the product picker offers both. The seed
adds *Kids T-shirt* and *Ceramic Cup*, and seeds one price row per preset combination in **both**
currencies — so a cup opens at Cup Type × Capacity and no variant is red for a missing dollar figure.

**Verified 2026-11-21** in Chromium 1440x900 against a production build, from a cleared demo store:
the Price Table listed nine types (… Kids T-shirt, Ceramic Cup, Phone Cover); picking *Kids T-shirt*
showed preset `kids` with Kids Pack and Kids Age Band ticked, *Football Jersey* `football` with Kit
Type and Jersey Print ticked, *Phone Cover* `phone`, *Ceramic Cup* `cup`, *Tote Bag* `bag`,
*Cap* `cap`; Attribute Management showed the headings Phone cover, Cup, Bag, Football kit, Kids
T-shirt, Cap over 25 attributes. Tests: `tests/pricing-connections.test.cjs` (11); full suite 972
tests, 0 failures.

#### 4.5.8 Customer records and password management  *(owner request 2026-11-21, part 5)*

The owner asked to **see every customer's details** and to **change and manage their passwords**.

**A record per customer.** `AdminDemoData.customerAccounts` holds one `AdminCustomerAccount` per order
email (`lib/customer-accounts.ts`): name, email, phone, account status, the password hash, when and by
whom it changed, and whether the customer must change it at next sign-in. The seed creates them from
the order queue and `normalizeCustomerAccounts` adds accounts for new order emails while keeping every
password already saved, so an older store upgrades in place.

**Details.** Clicking a row on `/admin/customers` opens a drawer with the contact details, the delivery
addresses the orders used, the recent orders with pieces and totals, the first/last order dates, the
lifetime spend and average order value, beside the segment (New / Repeat / VIP).

**Passwords.** The password is stored only as **PBKDF2-SHA256, 210 000 iterations, per-account salt**
(`createCustomerPassword` / `verifyCustomerPassword`, constant-time hex compare). The screen shows the
state — *No password set*, *Set <date> · by <owner>*, *Temporary password*, *Sign-in blocked* — never
the hash. The owner can **Generate** a 16-character password, type one (policy: 8+ characters, a letter
and a number, not the customer's name or email, not a common password, entered twice), **set** it, and
the plaintext is shown **once** with a Copy button. They can also flag *Change at next sign-in* and
**block** or **allow** sign-in; `canCustomerSignIn` requires an active account with a password.

#### 4.5.9 The customer changes their own password, and only while signed in  *(owner request 2026-11-21, part 6)*

The owner asked to **connect** the customer side to the accounts, and to make sure **a visitor who is
not signed in cannot change a password at all**.

**Sign-in.** `lib/customer-session.ts` verifies the email and password with the same PBKDF2 hash the
admin screen writes (`signInCustomer`), refusing an unknown email, a blocked account, an account with
no password yet and a wrong password with a distinct message each. Success writes a 12-hour session
(`mh-fashion-customer-session-v1`); `readCustomerSession` deletes and ignores an expired, empty or
malformed one, so a tampered storage value is treated as signed out.

**Change.** `changeOwnPassword(accounts, session, current, next, confirm)` returns
`reason: "signed-out"` **before** it touches anything when there is no session — that is the guard the
owner asked for, and it lives in the library, not only in the screen. Signed in, it still requires the
current password, the two new entries to match, the same policy as the owner's panel
(`passwordIssues`), and a password different from the current one. Only that customer's record changes,
`passwordUpdatedBy` records `<name> (self)`, and `mustChangePassword` clears.

**The screen.** Account Settings on `/account` carries **AccountPasswordPanel**: signed out it says
*"You are not signed in, so no password can be changed on this device."* and shows the sign-in form
only; the change fields and the Save button are not rendered at all. Signed in it names the account,
shows the temporary-password notice when the owner set one, and offers current / new / repeat plus
Sign out.

**Known limit.** There is no customer table on the server yet, so the account list still lives in the
browser store: the sign-in and the guard are real code paths, but a customer on another device does not
see the same records until the accounts move to Supabase. The admin drawer earned the same note.

**Verified 2026-11-21** in Chromium at 1440x900 against a production build: signed out the panel
refused and no Save button existed; signing in with a password-less account said *"This account has no
password yet"*; after the owner set a temporary password the customer signed in, saw the temporary
notice, was refused with *"The current password does not match."* for a wrong current password, then
changed it — the stored record went to a 64-hex hash at 210 000 iterations with
`passwordUpdatedBy: "Aung Ko (self)"` and `mustChangePassword: false`; signing out restored the refusal.

#### 4.5.10 A post for every product category, with bilingual tags  *(owner request 2026-11-21, part 7)*

The owner asked that posting stop being a T-shirt-only screen: **every category must be able to hold
posts**, posts must be **kept apart by category** rather than mixed in one list, and each post must carry
**tags written in English and in Burmese**.

**Model.** `AdminTshirtPost` gains `category: AdminProductCategory` and `tags: AdminPostTag[]`, where a
tag is `{ en, my }`. `POST_CATEGORIES` is the single ordered list (T-Shirt, Kids T-Shirt, Hoodie, Polo,
Jersey, Cap, Cup, Accessory); `postCategoryOf` reads a stored category or follows the linked product;
`groupPostsByCategory` returns only the categories that hold posts, in board order. `normalizeTshirtPostOptions`
fills a category and cleans tags on read, so a browser that stored posts before this change keeps them.
Validation requires a category and checks each tag (`POST_TAG_LIMIT` 8, `POST_TAG_MAX_LENGTH` 24, English
required, Burmese falls back to English).

**Board.** The Posts tab is now **Product posts**. A category chip row (with counts) filters the table, and
the rows are grouped under category headings, each with its own "New in <category>" button that opens the
drawer already filed and linked to that category's first product. A Tags column shows `English · မြန်မာ`
for every post, and search matches title, description, category and both languages of every tag.

**Drawer.** Category is chosen first; the "Sold as" product list only offers products of that category, and
changing the category drops a product that belongs elsewhere. A tag editor adds pairs by hand (English and
မြန်မာ inputs, Enter or Add tag), offers `POST_TAG_SUGGESTIONS` as one-click chips, and removes tags with ×.

**Bilingual data contract (applies to every field the owner types in two languages).** A tag stores
**both** languages in one record, `{ en, my }`; English is required because it is the fallback, and a
missing Burmese side copies the English rather than rendering blank. The storefront picks the side it is
rendering (`postTagLabel`), search reads both (`postTagsText`), and a screen never invents a translation.
Any future bilingual field (a category label, a promotion description, an ad headline) follows the same
shape and the same fallback rule instead of adding a second column or a lookup table.

**Seed.** Posts now cover T-Shirt (2), Kids T-Shirt, Hoodie, Cap and Cup, each with bilingual tags, so the
grouped board is visible on first open.

**Verified 2026-11-21** in Chromium 1440x900 against a production build: five category groups rendered with
counts and their own "New in …" buttons; creating a post from the Cup group opened the drawer on Cup with
only the Ceramic Cup product offered; a hand-typed tag (`Jasmine` / `စံပယ်ပန်း`) and the `Gift` suggestion
were stored as `[{en:"Jasmine",my:"စံပယ်ပန်း"},{en:"Gift",my:"လက်ဆောင်"}]` under `category:"Cup"`; the table
showed both languages; the Cup chip narrowed the board to Cup; searching `စံပယ်ပန်း` found the post. The
headless container has no Myanmar system font, so the screenshot shows boxes where a customer's device
renders the Burmese glyphs.

### 4.6 Product detail presentation

**Gallery sizing is settled as built** (owner decision, 2026-11-21): keep the current column and
photo-box sizes; do not re-specify them.

- Use the full available page width with minimal side gutters; do not constrain the
  page to a narrow centered column or leave broad empty margins.
- Keep the desktop product gallery compact (about 280px at tablet widths and
  capped near 280px in the current implementation); let purchase details use
  the remaining width. Stack the regions on small screens, with the gallery
  capped near 280px and centered rather than occupying the full phone width.
- Keep photo frames and thumbnail outlines to subtle 1px borders. The active
  thumbnail may use the accent color, but should not become a thick frame.
- On narrow phones, center the main photo and thumbnail row in a compact 200px
  gallery rather than letting a square image occupy the full viewport width.
- Present product information in a compact, accessible table using the actual
  catalog `product_type` and `is_customizable` fields. The current products
  schema has no free-form description column, so do not invent
  fabric/specification claims.
- Keep the Reviews heading and rating summary visible, but collapse the review
  cards by default so they do not dominate the page height.

## 5. Mockup / Preview System

- Grayscale recolor: one base image per style/angle; colors applied
  programmatically (no per-color photography).
- Preview = 3 layers: background → product mockup → design SVG overlay.
- Mockup images carry a type flag: `composite` (design overlay) or `detail`
  (fabric close-ups, no overlay).
- Typical gallery: Front + Back for 2 colors plus 2 detail shots; picking a
  color swaps the main image.
- Front SVG only ever appears on the Front mockup, Back only on Back.
- Size guide: weight/height range for adult sizes, age range for kids sizes,
  shown under the Size selector.

## 6. Editor (`/create`)

**Status: built; changed only on the owner's word.** The editor has its own plan because it is large, but there
is still **one plan file**: it is **Part II of this file** ([Part II — Editor plan](#part-ii--editor-plan)). Part II
holds the contracts that must not drift, the verified gaps, the proposals E1 to E23 with their acceptance checks,
the decisions, and the order of work. The behaviour documentation is `Doc/EDITOR.md`, written from the source.

This section stays a summary. Editor requirements, status and work items are written in Part II and nowhere else,
and the remaining-work register (section 16) carries no editor items.

## 7. Storefront Pages

- **Header:** sticky floating pill. Logo, New, Popular, Collections dropdown,
  Guide; inline search, notification dropdown, wishlist, Ks/$ switch,
  dark/light toggle, Create Design (pencil), cart with count, account.
- **Mobile/tablet:** hamburger + logo + search + notifications on top; a
  partial-width drawer slides in below the header (scrollable) holding nav, the
  footer groups (Shop, Help, Legal, newsletter, payments, app links) and
  Account. The full Footer panel is hidden on these sizes; the separate
  copyright strip remains visible on storefront views. The `/create` editor is
  intentionally excluded.
- **Homepage:** Hero (doubles as admin ad slot, falls back to the default
  banner) → Shop by Category (auto-scrolling marquee, loops seamlessly) → New
  Arrivals → Best Sellers → Shop by Collection → Footer.
- **Footer (desktop, Home only):** brand, Shop, Help, Legal, newsletter;
  Myanmar payment (KBZPay, Wave Pay, AYA Pay), app download links and
  international payment (Visa, Mastercard).
- **Copyright:** a separate strip at the very bottom of every non-editor web app
  view on desktop and mobile, including non-Home routes; `/create` is excluded.
- **Product card:** compact image, name, price range, wishlist heart on every
  card.
- **Product detail:** breadcrumb, gallery, all attribute selectors, price,
  rating, quantity, Add to Cart / Buy Now / Edit Design, description,
  shipping & returns, reviews, related products. A ready-made product
  (`is_customizable = 'none'`, e.g. the Nyein line) keeps Buy Now / Add to Cart
  and drops Edit Design, with a "sold as shown" note.
- **Product preview (built 2026-11-21):** the media column shows the garment
  mockup for the chosen colour / fit / sleeve from
  `mockups/product/<slug>/<look>.<ext>`, walking down to `default` and then the
  catalog image, with the design drawn on top inside `PRODUCT_PRINT_AREA`. A
  colour rail on the left selects the colour; hover zooms on desktop and a tap
  opens a full-screen zoom on phone. Gallery sizes are as built (4.6) and must
  not be re-specified.
- **Cart:** items with mockup-incomplete warnings, discount code, subtotal /
  delivery / total.
- **Checkout:** address auto-filled from account, provider auto-detected,
  payment choice, order summary, terms.
- **Account (`/account`):** profile with a single delivery address, order
  history with status timeline, My Designs, wishlist, AI points, settings.
- **Category page:** filter sidebar (cascading attributes), sort, product grid.
- **Guide:** categorized content (Product Guide, Payment Guide, …), managed by
  Post Admin.
- **Support:** live chat when logged in; contact form otherwise.

## 8. Commerce

- Payments: Visa plus KBZPay, Wave Pay, AYA Pay behind a Payment Provider
  interface. No cash on delivery; payment must complete before an order
  confirms.
- Shipping: MH Delivery (domestic) and DHL (international) behind a Delivery
  Provider interface. Delivery fee is calculated from the moment an item is
  added to the cart and combined with the product total; the user only ever pays
  MH Fashion, which settles with the courier separately (Delivery Settlement
  Report in admin).
- Order status (MH Fashion's own workflow): Pending Payment → Confirmed →
  Processing → Printing → Ready to Ship → Handed to Delivery → Out for Delivery
  → Delivered, plus Cancelled/Refunded. Stages may be adjusted later.
- Currency: prices stored in Ks; Super Admin sets a fixed exchange rate for USD
  display; checkout shows the user's chosen currency.
- Refunds only for MH Fashion production errors. Copyright liability for user
  content rests with the user (stated in the Terms).
- Production export per order is one bundle (`Doc/PRINT-BUNDLE.md`): `README.txt`,
  the A4 press sheet, the A5 customer receipt, the per-line spec CSV, the
  per-layer measurement CSV (print area, units/cm, X/Y/W×H in cm, rotation,
  scale), `manifest.json`, the MH Delivery quote JSON, and every design as a
  print-sized SVG plus its mockup-position diagram. Nothing is invented in the
  bundle: the delivery fee is priced by MH Delivery (`Doc/MH-DELIVERY.md`).

### 8.1 Copyright and takedown (owner policy, 2026-11-21)

- **Ownership:** MH Fashion holds only the right to advertise and sell a design;
  it does not claim ownership of user-submitted designs.
- **Claims:** if someone says a design is theirs, MH Fashion accepts the claim
  and takes the design down (hide or delete) where needed.
- **Terms of Use wording (for legal review, not legal advice):** the user grants
  MH Fashion the right to advertise and sell the design; the user is responsible
  for holding the rights to what they submit; MH Fashion may remove a design
  after a claim.
- **Claim channel (built 2026-11-21):** `/contact` is the single channel, linked from the Terms, the
  Guide and the footer. It explains what a claim must include, states the paid-order rule, and builds
  a `mailto:` with the topic, order number, design and message, so the claim reaches the inbox without
  a server. The address comes from `NEXT_PUBLIC_CONTACT_EMAIL` (the fallback is a placeholder the owner
  must replace). A server-side inbox is not built; the mail app is the delivery path.
- **Admin action:** Designs module → Hide / Delete, with a short record (design,
  who claimed, date, admin).
- **Answered (owner, 2026-11-21): a takedown never stops an order that is already paid.** The
  paid order is produced and delivered as normal; the takedown only stops new sales of the design
  (it is hidden/removed from the storefront and the editor).
- **Built (2026-11-21):** Designs → **Takedown** opens a drawer for the claimant and a claim note,
  then hides the design and appends a record (`designId`, `designName`, `claimant`, `note`,
  `admin`, `at`) shown on the row as a `Claim` badge and listed in the drawer. `recordDesignTakedown`
  never touches `orders`, which is the owner's rule encoded in the store; `tests/admin-takedown.test.cjs`
  asserts the orders are byte-identical after a takedown. Deleting a design stays separate and
  still needs the two-step confirm.

## 9. Promotions, Loyalty & AI Points

- Discount codes: admin-created with type, value, limits, validity, scope.
- Milestone rewards: admin sets threshold and trigger type per rule (quantity,
  orders, or spend).
- AI points: 300 granted daily (unused ones expire), 100 per generated image,
  +50 per purchased product (never expire). Daily points are spent first.

**The customer's points are real (2026-11-22).** `/admin/loyalty` configures the economy and
`lib/loyalty-ledger.ts` is the ledger it acts on — one entry per event, never a running total, stored in
`data.loyaltyLedger`. The daily 300 is granted once per **Yangon** day (a UTC day boundary would hand it
out twice to a shopper in Yangon) and carries an expiry from `dailyExpiryHours`; buying earns
`purchasePointsPerUnit` per piece with no expiry and **once per order**, so a replayed payment cannot earn
twice; a refund removes exactly that order's entries, because the points follow the money — `applyPaymentStatus`
writes both, so the checkout, the webhook and the admin refund path cannot disagree. The account page no
longer prints a hardcoded 250: the sidebar badge, the stat card and the rewards ring read the live balance
(daily + permanent, with the lapse time), the "AI Points" tab shows the split, the tier and what the next
tier needs (lifetime spend of kept orders only — pending, cancelled and refunded are excluded), the
milestone progress and the history with expired daily entries struck through. Checked in Chromium: the
grant lands once and a reload adds nothing, a bought order shows beside it, and the tab reads
"42,000 Ks kept · Silver starts at 100,000". Spending (100 per AI image) waits for the AI image action,
which is still a stub. `tests/loyalty-ledger.test.cjs` covers the Yangon day, the once-per-order award,
the refund reversal, expiry, tiers, milestones and the read repair.

## 10. Admin System

**Built modules (2026-11-21).** `/admin` is no longer a dashboard preview: `ADMIN_MODULES` holds
**fifteen** modules and every one is a real page — `dashboard`, `orders`, `products`, `posts`, `ads`,
`pricing` (Price Table), `attributes` (Attribute Management), `settlements`, `loyalty`, `customers`,
`inventory`, `promotions`, `reports`, `messages` (contact inbox) and `settings`. They share one typed
browser-local store
(`lib/admin-demo-data.ts` over `useSyncExternalStore`, persisted to `localStorage` under
`mh-fashion-admin-demo-data-v1`), and that store also holds the orders the storefront checkout
actually writes, not only seed data. Orders have stage chips, search, a Today card, date presets, a
From/To range, a sort select, an Orders-by-day strip and a detail drawer with items, timeline,
print-desk note, cancel/refund, production CSV, the A4 print sheet, the A5 receipt, the print
bundle ZIP and the MH Delivery quote JSON. Products have a validated create/edit drawer, archive and
two-step delete; Inventory has per-size stock with low/out filters; Customers groups the orders by
email with VIP/repeat/new segments **and** carries one `customerAccounts` record per customer with a
salted PBKDF2 password — hash only, never rendered — that the owner can set, generate, force a change
on or block (§4.5.8); the customer signs in with that password on `/account` and can change it only
while signed in (§4.5.9); Designs can be published, hidden or deleted;
Promotions validate codes, value, minimum spend, limits and window; Reports show revenue buckets,
top products, payment mix, pipeline and low-stock; Settings hold the store profile, the team with
per-module permissions, and a demo-data reset. Posts live at `/admin/posts` with Guide, Product and
Nyein tabs; a product post is filed under one product category (every category can hold posts), carries a
title, description, one attached SVG, bilingual English/Burmese tags, and one hand-typed price per full
attribute combination (no base price, no derived delta, unlisted combinations not sold). The board groups
posts by category and filters by it.
This remains a preview, not a security boundary — Supabase Auth, RLS and server-side role checks are
still required before live admin data is exposed.

- Super Admin has full access and creates all other admins, assigning each
  one's permissions individually (module checklist: Product, Order, Pricing,
  Content/Guide, Print/Production, Discount/Loyalty, Delivery Settlement).
- Post Admin: Guide posts, categories, SEO fields, publish/draft.
- Print Admin: order queue and detail (attributes, SVG download, coordinates),
  status updates, Jersey mapping setup, mockup uploads, settlement report.
- Both lists are expected to grow as the app gets used.

**Admin dashboard UI (`/admin`, first visual pass):** follow the supplied MH
Fashion references with a dark left navigation, light dashboard workspace, top
search/profile bar, KPI cards, sales and order-status visualizations, top-selling
products, recent orders, and activity feed. Use responsive layouts and clearly
identify local sample metrics as preview data. This UI shell does not establish
secure admin authentication, authorization, or live analytics. The frontend
`/admin/login` page may use one browser-local demo account/session to preview the
flow, with explicit warnings and no real/reused passwords; public registration is
closed and no `/admin/register` route exists. This
client-only gate is bypassable and is not a security boundary. Replace it with
Supabase Auth and server-side role checks before handling real admin accounts or
data; connect live analytics only after that secure foundation exists.

## 11. Growth & Notifications

- SEO with structured data and clean URLs; verified-purchase reviews (no admin
  moderation).
- Notifications: in-app first (web and app); email only when an address is on
  file. The customer notification channel and the email provider are decided
  later (owner decision, 2026-11-21).
- Analytics/tracking integrations are built in but optional.

## 12. Cloudflare R2 Layout

**One key pattern, chosen 2026-11-21.** The earlier `mockups/{product_id}/{style_id}/{color_id}_front.png`
form is retired; the pattern below is the only one, and `Doc/R2-STORAGE.md` is its contract.

**Only admins upload, through the admin dashboard** (owner decision 7). Nobody uploads by hand and
no upload path exists in the storefront or the editor. The upload form generates the key from the
product, the look and the file type, so a key is never typed and cannot drift from the pattern.

**The complete list of every key, in both buckets, is the tables in 12.2.2.** The key rules and the look rule
below apply to all of them.

`<look>` is the attribute combination that actually changes the picture: for the catalogue
`colour[-fit][-sleeve]`, for the editor `colour[-gsm]`. **Size is never part of a look** — the same
photo serves M and XL. The lookup walks from the most specific key down to `default`, trying
`webp`, `png` then `jpg`; a look with no file falls back to `default` and then to the catalog image.
The two sets are separate on purpose: a 4:5 catalogue photo does not fit the square editor panel.

### 12.1 R2 asset service — a Worker reads R2 and returns JSON  *(owner decision, 2026-11-22; not built)*

**Rule.** The browser never lists, parses or hunts for files in R2 by itself. A Worker (`Worker/assets.ts`, one file) reads the
bucket through an R2 binding, turns what is in it into JSON, and the app calls that JSON and builds every file
address from it. This replaces the earlier "future private serving contract" (`/api/editor/fonts`,
`/api/editor/text-styles`, `/api/editor/assets/[...assetKey]`): the routes below take their place.

**Today (checked in the code, 2026-11-22).**
- `apps/web/wrangler.jsonc` has no `r2_buckets` entry (it is a comment), and the only API routes are the payment
  routes.
- The editor fetches `${NEXT_PUBLIC_R2_PUBLIC_URL}/fonts/manifest.json` straight from the browser
  (`lib/editor-font-library.ts`) and builds file addresses with `fontFileUrl(base, file)`.
- Product pages try candidate mockup addresses one after another, so a missing look costs a failed request.
- The editor's Designs and Elements library is a placeholder (`DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"`),
  and T-shirt post artwork is a data URL in the demo store.

**Parts.**
1. **One Worker, one file (owner rule, 2026-11-23).** The service is a separate Cloudflare Worker whose whole code is
   `Worker/assets.ts`; nothing else lives in `Worker/`. It exports `fetch` (the admin and private routes, and the read routes
   once it takes them over), `queue` (the rebuild on an R2 event) and `scheduled` (the hourly safety net). The builders are named exports of that file so tests can import them. It may import the
   app's pure rules by relative path (for example `../apps/web/src/lib/editor-fonts.ts` and
   `../apps/web/src/lib/search-text.ts`), which wrangler bundles, so each rule exists once. Its configuration is
   `wrangler.assets.jsonc` at the repository root (the site's own stays in `apps/web/wrangler.jsonc`) and holds the
   `r2_buckets` binding `MH_FASHION_ASSETS`, the cron trigger and its variables; its own workflow,
   `.github/workflows/deploy-assets-worker.yml`, deploys it when `Worker/**` changes. Local development uses
   wrangler's local R2 simulation with a small fixture bucket.
2. **`AssetStore` interface** (`list(prefix, cursor)`, `get(key)`, `put(key, body, meta)`, `delete(key)`). The
   R2 binding is the implementation today; an S3 implementation can follow if the site moves to AWS (owner
   decision, 2026-11-21: keep R2 access portable). Nothing else in the app touches the binding.
3. **Catalogue builders**, one pure function per kind: fonts, designs, elements, brushes, text styles and mockups.
   Each reads the folders for its kind plus a small `meta.json` beside each asset, validates it with the same
   rules the app already uses (for fonts `parseEditorFontManifest`, the bucket-relative `.woff2` rule and the
   optional `outline` file from editor decision D14), and returns `{ version, generatedAt, items, issues }`.
   A bad entry is skipped and listed in `issues` with its key and the reason; it never breaks the list.
4. **Snapshots.** A builder writes its result to `catalog/<kind>.json` in the bucket, and every reader fetches that
   one object. A live scan would list the folder and read one `meta.json` per asset, and a Worker request may
   make only a limited number of subrequests (the limit depends on the plan; to be checked), so the snapshot is
   required rather than an optimisation. A builder writes only when the result changed.
5. **When a snapshot is rebuilt:** (a) at once after any admin upload or delete that goes through the Worker;
   (b) on a scheduled trigger every few minutes, which picks up files the shop dropped into R2 by hand, as it does
   for fonts and brush tips today; (c) from an admin "Rescan" button.
6. **Read routes** (public, cacheable): `GET /api/assets/fonts`, `/designs`, `/elements`, `/brushes`,
   `/text-styles`, and `GET /api/assets/mockups/<product-slug>`, which lists the looks that really exist so the
   page picks the right file without probing. For fonts the JSON has the shape `parseEditorFontManifest` already
   accepts, so the editor changes only the address it reads from. The Worker serves the routes at the address in
   `NEXT_PUBLIC_ASSETS_API_URL` and answers cross-origin calls from the site with an `Access-Control-Allow-Origin`
   header for the site's address only.
7. **File serving** (decision R2-1): public, non-sensitive files (fonts, mockups, designs, elements, brushes)
   keep being served from the bucket's public address (`NEXT_PUBLIC_R2_PUBLIC_URL`), cached by the CDN, and the
   bucket carries a CORS rule for the site because fonts are used across addresses. Private files (saved designs,
   customer uploads, press bundles, licence documents) are never public: they are read only through the Worker,
   which checks who is asking.
8. **Admin writes** (after Supabase Auth, P0): `PUT /api/admin/assets` takes the file and its fields, checks the
   type and size for its kind, generates the key (a key is never typed), writes the file and its `meta.json`
   through the binding, and rebuilds the snapshot. SVG is cleaned first (scripts, event attributes and external
   references removed). Until Auth exists these routes are not enabled; the shop uploads by hand and the
   scheduled trigger picks the files up. The browser needs no R2 keys and no upload CORS rule. The Worker checks the caller's Supabase access token and
   the admin role itself; it never trusts the browser.
9. **Caching.** JSON: `Cache-Control: public, max-age=60, stale-while-revalidate=600` with an `ETag`, and the
   cached copy is dropped when a snapshot is rebuilt. Files: versioned file names, `immutable`.
10. **Issues panel.** `GET /api/admin/assets/issues` (admin only) lists every skipped entry with the reason
    ("font padauk: outline file missing"), so the shop sees why something does not appear.
11. **Security.** Every route works from an allow-list of key prefixes; `..`, absolute addresses and full URLs are
    refused (the font loader already refuses them); the content type comes from the object, never from the
    request; each kind has a size ceiling; write routes are rate limited; private prefixes have no listing route.
12. **Observability.** Each rebuild logs the kind, the item count and the issue count through the Workers
    logging that `wrangler.jsonc` already enables.
13. **Tests.** The builders are pure and tested against an in-memory `AssetStore`: a valid asset, a missing
    `meta.json`, a missing file, a duplicate slug, an unsafe key and a listing longer than one page. Route tests
    check the allow-list, the headers and the caching. `scripts/check-font-manifest.cjs` becomes a thin wrapper over
    the same builder, so what the shop checks before an upload is what the Worker will accept.

**Built 2026-11-22 (the pure core of parts 2, 3, 4, 11 and 13).**
`lib/asset-store.ts` holds the `AssetStore` interface (`list` with a cursor, `get`, `put`, `delete`), the
allow-list of key prefixes, `isSafeAssetKey` (refuses a scheme, an absolute path, `..`, a backslash, an
empty segment, an unknown prefix and a key over 512 characters) and `createMemoryAssetStore` with a
small `pageSize` so a listing has to follow the cursor.
`lib/asset-catalogue.ts` holds one pure builder per kind — fonts through the editor's own
`parseEditorFontManifest`, designs/elements/brushes/text-styles through one folder shape, mockups as the
looks that exist — each returning `{ version, kind, generatedAt, items, issues }`. A bad entry is skipped
and named in `issues` (broken or missing `meta.json`, a file the bucket does not hold, a duplicate slug,
an unsafe key); `writeAssetCatalogue` stores `catalog/<kind>.json` and writes nothing when only
`generatedAt` would change.
`tests/asset-catalogue.test.cjs` (15 tests) covers every case part 13 lists, including a listing longer
than one page.
**Read routes built 2026-11-22 (parts 6 and 9).** `lib/asset-routes.ts` shapes the answer and owns the
cache contract: `Cache-Control: public, max-age=60, stale-while-revalidate=600`, an `ETag` over the body,
and a `304` for a matching `If-None-Match` (a weak or listed value matches too). Fonts answer as
`{ fonts, skipped }`, the shape `parseEditorFontManifest` already accepts; every other kind answers the
catalogue itself; `mockups/<slug>` answers one product's files, `404 no_mockups` when there are none and
`400 invalid_slug` for an impossible slug. `lib/asset-store-r2.ts` implements `AssetStore` over the
`MH_FASHION_ASSETS` binding through `getCloudflareContext`, and returns `null` when the binding is absent
(local `next start`, tests) — the route then answers an empty catalogue whose single issue says the bucket
is not bound, so the editor keeps its system fonts and nothing crashes. Routes:
`app/api/assets/[kind]/route.ts`, `app/api/assets/mockups/[slug]/route.ts`.
`tests/asset-routes.test.cjs` (10 tests) covers the shapes, the headers, the 304 paths, the unbound and
empty-snapshot answers, the mockup 404/400 and the kind allow-list. Checked live on `next start`: fonts
200 with the cache header and an `ETag`, the same request with `If-None-Match` 304, an unknown kind 404, a
missing mockup 404.
**Rebuild and the check script built 2026-11-22 (parts 5 and 13).** `lib/asset-catalogue-rebuild.ts`
runs one pass over all six kinds, writes only the snapshots that changed and logs one line per kind
(`assets: fonts rebuilt, 1 item, 0 issues`), which is the observability in part 12. A second pass over an
unchanged bucket writes nothing. `scripts/check-font-manifest.cjs` is now the same builder over a local
folder: a folder with `meta.json` per font is checked with exactly the rules the Worker applies (and a
file it names but does not hold fails), the legacy single `manifest.json` layout still gets the old audit
plus a note that the service wants `meta.json`, and an unknown folder is refused instead of crashing.
`tests/asset-rebuild.test.cjs` (3 tests) and `tests/check-font-manifest.test.cjs` (5 tests) cover both.
**Issues route shipped 2026-11-22 (part 10, read half):** `GET /api/assets/issues` answers one report for
every kind — how many items the last snapshot holds, when it was built, and every issue it recorded (a
folder with no `meta.json`, a file the meta names but the bucket does not hold). It reads the snapshots
the rebuild already wrote, so it cannot drift from what the editor is served; a kind with no snapshot
says "no snapshot has been built yet" and an unbound bucket says so per kind, instead of pretending the
kind is empty. The body carries no timestamp of its own (each kind carries `builtAt`), so a revalidation
can answer 304, and the route keeps the same 60-second cache. The static `issues` segment wins over
`[kind]`, and `/api/assets/fonts` still answers (checked on a running server: issues 200 with six kinds,
fonts 200, mockups 404 without a bucket, revalidate 304).
**Editor switched to the service 2026-11-24 (part 6, font half).** `editorFontManifestSources(base)` in
`lib/editor-fonts.ts` lists `/api/assets/fonts` first and the bucket's public `fonts/manifest.json` second, and
`loadEditorFontManifest` keeps the first source that names at least one font. The empty answer the route gives
while the bucket is unbound is not treated as a failure, so a deploy without the binding keeps exactly the fonts
it loads today; when the binding lands the same code reads the service with no further change. Checked on a
running server: `/create` requests `/api/assets/fonts` only (no `/fonts/manifest.json` when no bucket address is
configured), the picker still lists the eight system fonts, console clean; `tests/editor-fonts.test.cjs` holds the
source order.
**The assets Worker built 2026-11-25 (parts 1, 5, 8, 10, 11 and 12 of this section).** `Worker/assets.ts` is the one
file: `fetch` answers the read routes (the same JSON as the app's routes, plus the site's CORS header), the admin
routes (`PUT /api/admin/assets`, `GET /api/admin/assets/issues`) and the private route (`GET /api/private/<key>`);
`queue` rebuilds the kinds an R2 event names, `scheduled` does the hourly full pass. Every rule is imported by relative
path from `apps/web/src/lib/asset-*.ts`, so the Worker and the site cannot disagree. `wrangler.assets.jsonc` at the
root holds both `r2_buckets` bindings, the queue consumer and producer, the hourly cron and the variables;
`.github/workflows/deploy-assets-worker.yml` deploys on `Worker/**` or a library change (the file is kept in
`Doc/ASSETS-WORKER-DEPLOY.md` until a token with the `workflow` scope adds it — the session token is refused). The admin check is the Worker's
own: `asset-session.ts` verifies the Supabase access token against `/auth/v1/user`, and `asset-access.ts` decides who
may read a private key (the owner of `uploads/`, `saved/`; an admin for everything). `tests/assets-worker.test.cjs`
(9 tests) drives `handleRequest`, `handleQueue` and `handleScheduled` over memory buckets: the read route and its 304,
the unbound answer, an admin upload that builds the key and writes the file and its `meta.json`, the 401/403/409/400
refusals, an SVG stored cleaned, the private file for its owner and an admin only, and the queue rebuilding one kind.
A `wrangler deploy --dry-run` bundles it (48 KiB) with both bindings, the queue and the cron. Every write and every
private read is rate limited per caller (30 and 120 a minute, counted in the isolate — `WORKER_RATE_LIMITS`), which is
what part 11 asks; `tests/assets-worker.test.cjs` exhausts the allowance and checks the 429 and that a second admin
keeps its own.

**Customer uploads, order files and the backup built 2026-11-25 (12.2.5 items 3 and 4, 12.2.7, 12.2.8).**
`lib/asset-upload.ts` holds the hourly quota (`uploads/tmp/<user>/quota.json`, twenty an hour), the temporary key
builder and `checkUpload`, which applies the same byte, size and pixel rules as the Worker; `promoteUploads` moves a
saved design's photos from `tmp` to `uploads/<user>/` and refuses any key that is not the caller's.
`app/api/uploads` and `app/api/uploads/promote` are the routes, both behind the Supabase token.
`lib/order-assets.ts` names an order's documents as `Doc/PRINT-BUNDLE.md` does (`print-sheet-<order>.html`,
`manifest.json`, `designs/<design>-<look>.svg`) through the key builder, and `writeOrderFiles` refuses a second write.
`.github/workflows/backup-assets.yml` copies both buckets weekly to `mh-fashion-backup` and keeps four copies (also
kept in `Doc/ASSETS-WORKER-DEPLOY.md` until the token can create it). The
public `/api/assets/issues` route is now admin-only, as §12.2.12 item 2 requires.

**Still to build:** the buckets themselves and the two bindings in `apps/web/wrangler.jsonc` (needs the bucket names),
the Queue, the event rules and the lifecycle rule in the dashboard, and the `CLOUDFLARE_API_TOKEN` /
`CLOUDFLARE_ACCOUNT_ID` secrets the two deploy workflows wait for. Supabase Auth must be configured (and an admin role
set) before the write and private routes answer anything but 401.

**Rollout.**
1. Read-only service for fonts, brushes, designs and elements, with hand uploads and the scheduled rebuild.
2. The mockups listing, which ends the probing for missing looks.
3. Admin writes and the issues panel, after Supabase Auth.
4. Private files: saved designs, customer uploads and press bundles (editor E1, order hand-off), through the Worker
   with authorisation.
5. An S3 `AssetStore` only if the site moves to AWS.

**Decisions.**

| # | Question | Recommendation |
|---|---|---|
| R2-1 | Are public files served by the bucket's own address or through the Worker? | **Decided 2026-11-23:** public files from the bucket address with a CORS rule for the site; the Worker for the JSON and for every private file |
| R2-2 | How often does the scheduled rebuild run? | **Decided 2026-11-23:** every five minutes, plus the admin "Rescan" button for an immediate refresh *(Superseded by R2-9 in 12.2.14 once events are on: the cron becomes an hourly safety net.)* |
| R2-3 | Where does an asset's description (`meta.json`) live? | **Decided 2026-11-23:** beside the asset in R2 for now; it moves into the database with the rest of the admin data |
| R2-4 | Where does the Worker live and how is it addressed? | **Decided 2026-11-23, clarified 2026-11-24:** `Worker/assets.ts` (one file), configured by `wrangler.assets.jsonc` at the root and deployed by its own workflow. It holds what the site's own Worker cannot (the `scheduled` and `queue` handlers, the admin writes and the private routes). The read routes already built under `/api/assets/` in the app keep serving the same JSON from the site's own address (no CORS) until the Worker takes them over; both use the same libraries, so the answers are identical. When the Worker serves them it is addressed by a subdomain of the site (for example `assets.<site-domain>`), or by its workers.dev address until a domain is set, in `NEXT_PUBLIC_ASSETS_API_URL` |

**Depends on:** the R2 binding, the cron trigger and the variables in `wrangler.assets.jsonc`; the workflow
`deploy-assets-worker.yml`; and Supabase Auth with a server-side admin check for the write and issues routes.

Naming: lowercase, hyphens; UUIDs for system-generated assets, slugs for
catalog-facing items.

### 12.2 R2 storage plan — what is stored, where and how  *(decided 2026-11-24)*

This is the complete plan for every byte the platform keeps in R2: which files exist, which bucket they sit in,
who writes and reads them, how they are named, how long they are kept, how they are backed up and checked. It
replaces the key list that used to sit in section 12. `Doc/R2-STORAGE.md` stays the how-to for the shop; where it
differs from this section, this section is the target and the document is updated when the change is built.

**What was checked (2026-11-24).**
- R2 public access is switched on **per bucket** (a custom domain or the r2.dev address), not per folder. A public
  bucket exposes everything in it, so nothing private can sit beside the public mockups.
- Cloudflare's price list: storage $0.015 per GB-month; Class A operations (writes and **lists**) $4.50 per million;
  Class B operations (reads) $0.36 per million; free every month: 10 GB, 1 million Class A and 10 million Class B;
  data leaving R2 is free.
- R2 can send a message to a Queue when an object is created or deleted, filtered by prefix and suffix; two rules
  for the same event may not overlap. R2 also has lifecycle rules that expire objects under a prefix after a number
  of days. No object versioning appeared in the pages reviewed, so none is relied on.
- In the built code (`apps/web/src/lib`): `AssetStore` handles text only (`get` returns a string, `put` takes a
  string); the catalogue builders read `<kind>/<slug>/meta.json` for fonts, designs, elements, brushes and text
  styles; `buildMockupCatalogue` takes the first folder under `mockups/` as the product slug; the rebuild writes
  its snapshots (`catalog/<kind>.json`, issues included) into the same store it lists.

#### 12.2.1 Three buckets

| Bucket | Public? | Holds | Reached by |
|---|---|---|---|
| `mh-fashion-assets` | Yes, through a custom domain: cached by Cloudflare, CORS for the site | files every visitor may fetch | browsers directly; code through the binding `MH_FASHION_ASSETS` |
| `mh-fashion-private` | **Never**: no custom domain, no r2.dev | anything about a customer, an order, a licence, and the service's own snapshots | only code holding the binding `MH_FASHION_PRIVATE`, after an access check |
| `mh-fashion-backup` | Never | copies written by the backup workflow only | the backup workflow; the owner when restoring |

Local development uses wrangler's local R2 simulation, so no development buckets exist in the cloud.

#### 12.2.2 Every prefix

**Public bucket `mh-fashion-assets`** (nothing in it is secret; a visitor may guess any key).

| Key pattern | What it is | Accepted file | Written by | Cache class |
|---|---|---|---|---|
| `mockups/product/<product-slug>/<look>.<webp\|png\|jpg>` | catalogue photo, 4:5 | WebP up to 200 KB (PNG, JPG up to 400 KB) | admin form, or by hand until the form exists | revalidate |
| `mockups/editor/<garment-slug>/<look>.<webp\|png\|jpg>` | editor panel photo, square, flat | same | same | revalidate |
| `mockups/editor/<garment-slug>/meta.json` | the garment's design areas (editor plan E23) | JSON up to 20 KB | admin tool of E23 | revalidate |
| `mockups/3d/<product-slug>/<look>.<webp\|png\|jpg>` | 3D render (reserved) | same | same | revalidate |
| `models/<product-slug>.glb` | 3D garment model (reserved) | GLB up to 5 MB | by hand | revalidate |
| `fonts/<font-slug>/<style>.woff2` | the font the browser shows | woff2 up to 1 MB | by hand, later the admin form | immutable |
| `fonts/<font-slug>/<style>.ttf` or `.otf` | the outline file for the text bend (editor plan D14) | up to 5 MB | same | immutable |
| `fonts/<font-slug>/meta.json` | name, shelf, styles, scripts, licence, on/off | JSON up to 20 KB | same | revalidate |
| `fonts/manifest.json` | the older hand-edited font list, honoured until every font has a `meta.json` | JSON | by hand | revalidate |
| `designs/<design-slug>/design.svg` + `meta.json` | design library artwork; each element is a top-level `<g id>` so it lists as a layer | SVG up to 2 MB, cleaned | admin form, or by hand | revalidate |
| `elements/<element-slug>/element.svg` + `meta.json` | one reusable shape | SVG up to 200 KB, cleaned | same | revalidate |
| `photos/<photo-slug>/photo.<webp\|png\|jpg>` + `thumb.webp` + `meta.json` | a library photo for the editor's Photos section: the full picture, a small picture for the grid, and its description | photo: WebP or JPEG up to 8 MB and 4000 px on the long side (PNG, or WebP with transparency, only for a cut-out); thumb: WebP up to 40 KB and 512 px | the owner, by hand; later the admin form | revalidate |
| `patterns/<pattern-slug>/pattern.svg` + `meta.json` | a pattern layer for the Patterns section: an SVG that already covers the 1000 × 1200 artwork space, as the nine built-in patterns do | SVG up to 200 KB, cleaned | the owner, by hand; later the admin form | revalidate |
| `brushes/<brush-slug>/tip.png` or `tip.svg` + `meta.json` | a brush tip | PNG up to 512 × 512 px and 200 KB, or SVG up to 100 KB | the owner, by hand | immutable |
| `text-styles/<style-slug>/meta.json` | a text style is data: its effect stack; it is painted live, so there are no image files | JSON up to 20 KB | admin | revalidate |
| `textures/<texture-slug>/texture.png` + `meta.json` | a grain mask for the Distress effect (editor plan E18, later) | PNG up to 2048 px and 1 MB | by hand | immutable |
| `posts/<post-slug>.svg` | T-shirt post artwork | SVG up to 2 MB, cleaned | admin form | revalidate |
| `jersey-mockups/<jersey-style-slug>/worn_photo.png` and `mapping_zones.json` | the Jersey mapping tool's photo and zones | PNG up to 1 MB, JSON up to 50 KB | admin | revalidate |
| `site/categories/<slug>.webp`, `site/banners/<id>.webp` | category and banner pictures | WebP up to 300 KB | admin | revalidate |

**Private bucket `mh-fashion-private`.**

| Key pattern | What it is | Accepted file | Written by | Read by |
|---|---|---|---|---|
| `catalog/<kind>.json` | the snapshot for `fonts`, `designs`, `elements`, `photos`, `patterns`, `brushes`, `text-styles`, `mockups`, with its `issues` list | JSON | the rebuild only | the asset routes; the admin issues route; the public route strips `issues` |
| `tmp/<user-id>/<upload-id>.<webp\|jpg\|png>` and `tmp/<user-id>/quota.json` | a customer photo that is not yet part of a saved design, and the hourly upload counter | the compressed working copy, up to 6 MB (3000 px on a phone) | the upload route | the same customer |
| `users/<user-id>/uploads/<upload-id>.<webp\|jpg\|png>` | the photo once a design that uses it is saved | same | promoted from `tmp` on Save | the same customer; the press through the order copy |
| `users/<user-id>/designs/<design-id>/thumbnail.webp` | the My designs thumbnail | WebP up to 100 KB, about 600 px | the browser at Save, through the route | the same customer |
| `orders/<order-id>/<file>` | the frozen copy of what the press receives: `print-sheet-<order>.html`, `invoice-<order>.html`, `print-spec-<order>.csv`, `measurements-<order>.csv`, `manifest.json`, `delivery-<order>.json`, and per design `designs/<design>-<look>.svg` and `...-mockup.svg` (the names in `Doc/PRINT-BUNDLE.md`) | the files themselves; the ZIP is not stored | the server at Buy, once | admins and the press, through the Worker |
| `licences/<fonts\|photos>/<slug>/<file>.pdf` | proof of the right to use a font or a library photo commercially | PDF up to 5 MB | the owner | admins |

A `meta.json` is the description of its folder; the catalogue builder reads it and lists the folder without it as an
issue.

`<user-id>` is the Supabase account UUID. The shop's **Photos library** (`photos/`, public, chosen by the shop) and a
**customer's own uploads** (`users/<user-id>/uploads/`, private, chosen by the customer) are different things and never
share a prefix. `photos/<slug>/meta.json` carries: the name in English and Myanmar, tags and aliases, the pixel width
and height, whether the picture has transparency, the licence (name, source address, `commercialPrintAllowed`, the
credit line) and on/off. `patterns/<slug>/meta.json` carries: the name in English and Myanmar, tags, `ink`
(`dark`, `light` or `color`, which decides the card's background) and on/off.

#### 12.2.3 Key rules

1. Lower-case ASCII `a-z`, `0-9`, `-`, `.`, `_` only. No spaces, no accents, no Myanmar script in a key; the Myanmar
   name of anything lives in its `meta.json`, so a key never depends on how a browser encodes a URL.
2. A slug matches `^[a-z0-9]+(-[a-z0-9]+)*$`. A key is at most 200 characters (the built `isSafeAssetKey` allows 512;
   the rule here is stricter and is what the admin form produces).
3. The extension is the real type: `.webp`, `.png`, `.jpg`, `.svg`, `.woff2`, `.ttf`, `.otf`, `.glb`, `.json`, `.pdf`,
   `.csv`, `.html`.
4. No personal data in a key: no name, phone or address. Customers are identified by their UUID only.
5. `..`, a leading or doubled `/`, a backslash and a URL are refused everywhere (`isSafeAssetKey`).
6. The upload form, the Worker and the pre-upload check all build keys from **one function**, so no key is typed and
   none can drift. It is a pure function with a test per pattern in the tables above.
7. A replaced file whose old copy may still be cached gets a new name (`regular-2.woff2`, as `Doc/R2-STORAGE.md`
   already says), or its cache class is `revalidate`.
8. A customer's folder is named by the account **UUID**, never by the account name: a name can change, repeat, contain
   Myanmar script or personal data, and a key must not depend on any of that. The name is shown from the profile, not
   from the key.

#### 12.2.4 Cache classes

| Class | `Cache-Control`, set when the file is written | Used for |
|---|---|---|
| immutable | `public, max-age=31536000, immutable` | fonts, brush tips, textures: a changed file gets a new name |
| revalidate | `public, max-age=300, stale-while-revalidate=86400` | mockups, designs, elements, posts, `meta.json`, site pictures: a replaced file shows within about five minutes |
| catalogue JSON | `public, max-age=60, stale-while-revalidate=600` (built in `asset-routes.ts`) | the JSON the routes return |
| private | `private, no-store` | everything in `mh-fashion-private` |

#### 12.2.5 How a file gets in

1. **Admin upload (after Supabase Auth).** The admin form sends the file and its fields to the Worker route
   `PUT /api/admin/assets`. The Worker checks the admin role, checks the type by the file's first bytes, checks the
   size and (for images) the pixel size, cleans SVG (scripts, event attributes, external references removed),
   builds the key from the fields (rule 6), writes the file with its content type and cache class, records a
   `sha256` and the uploader in the object's custom metadata, writes `meta.json`, and the rebuild refreshes the
   catalogue. A key that already exists is refused unless the form says "replace".
2. **By hand (until the admin form exists).** The owner puts files into the public bucket by following
   `Doc/R2-STORAGE.md`. Before uploading, the owner runs the pre-upload check (`npm run assets:check <folder>`, the
   fonts check extended to every kind), which uses the same key function and the same validators as the Worker. The
   rebuild picks the files up (12.2.9).
3. **Customer files (private).** The browser re-encodes a photo (which drops its EXIF data, including any location)
   and sends it to `POST /api/uploads` with the customer's token. The Worker checks the type by its first bytes,
   the size and the pixel size, limits the number of uploads per customer per hour, and writes it under
   `tmp/<user-id>/`. Save promotes the files a design uses to `users/<user-id>/uploads/`; the rest of `tmp` expires
   after 24 hours (12.2.7).
4. **Order files (private).** At Buy the server writes each file of `orders/<order-id>/` **once**. The Worker refuses
   a second write to an existing order key. Each carries its `sha256`, which is checked when it is read.
5. **Snapshots (private).** Only the rebuild writes `catalog/<kind>.json`, and only when the result changed (the
   built rebuild already does this).
6. **Large files.** Every file here is far below the single-request limit, so no multipart upload is needed; the size
   limits in the tables are the rule.

#### 12.2.6 How a file is read

- **Public files** are fetched by the browser from the custom domain, cached by Cloudflare. Reading a public file
  costs a Class B operation only on a cache miss.
- **Catalogue JSON** comes from the asset routes (section 12.1), which read the snapshot (one read) and cache it.
  Nothing lists the bucket while a visitor waits: a listing is a Class A operation and a live scan would also read
  one `meta.json` per asset.
- **Private files** are returned only by the Worker, after it has checked who is asking: a customer gets their own
  uploads, thumbnails and designs; an admin gets order files and licences. There are no presigned links, so no key
  ever leaves the server. Every admin read of a customer's file under `users/` is written to the admin audit log (who,
  which key, when), so support access is always visible.
- **The press bundle ZIP** is built on request (in the Worker or the browser) from the stored order files, never
  stored, so there is one copy of each file.

#### 12.2.7 Kept for how long, and deleting

| What | Kept | Then |
|---|---|---|
| `tmp/` | 24 hours | a lifecycle rule on the prefix expires it (to be set in the dashboard when the bucket exists) |
| `users/<user-id>/` | while the design that uses a file exists | a design deleted by the customer is soft-deleted; its files are purged after 30 days (editor plan E1) |
| `orders/<order-id>/` | for the life of the order, and for the legal retention period | the owner sets the period with the legal review (editor plan, "Inputs only the owner can supply"); until then nothing is deleted |
| `licences/` | as long as the font is in use, then kept | never purged automatically |
| public assets | until an admin turns them off | switching off sets `enabled: false` in `meta.json` and keeps the file; **permanent delete** is a separate admin action offered after 30 days |
| `catalog/` | until the next rebuild | overwritten |

Account deletion removes the whole prefix `users/<user-id>/` in one operation, after checking that no open order still
needs a file; paid orders keep their own copies under `orders/`.

#### 12.2.8 Backups

R2 versioning is not relied on (12.2 "What was checked"), so a deleted or overwritten file is gone unless it was
copied.
- A **weekly scheduled workflow** (`.github/workflows/backup-assets.yml`) copies both live buckets to
  `mh-fashion-backup` with `rclone`, keeping the last four weekly copies; the workflow is the only writer.
- `orders/` and `licences/` are also copied **monthly to a place outside the Cloudflare account** (decision R2-8),
  because the same account can lose both the live and the backup bucket.
- An admin delete of any public asset is soft (12.2.7), which covers the usual accident.
- Restoring is a documented procedure in `Doc/R2-STORAGE.md`, written when the workflow is built, with a restore
  test once before launch.

#### 12.2.9 What triggers a catalogue rebuild

1. **A change event.** R2 event notifications on `mh-fashion-assets` send a message to the Queue
   `mh-fashion-asset-events` when an object is created or deleted. There is one rule per source prefix (`fonts/`,
   `designs/`, `elements/`, `photos/`, `patterns/`, `brushes/`, `text-styles/`, `mockups/`) so the rules never overlap, and the Worker's
   `queue` handler rebuilds that kind, so a new file appears within seconds. Snapshots live in the other bucket, so
   a rebuild cannot trigger itself.
2. **The admin "Rescan" button**, for an immediate refresh.
3. **A safety-net cron, hourly**, in case an event is lost.
This replaces the five-minute rhythm of R2-2 once the events are on.

#### 12.2.10 Cost

At today's prices (12.2 "What was checked"): public assets are a few hundred megabytes, which sits inside the free
10 GB, and reads are cached so Class B stays far below the free 10 million a month. Reading a snapshot instead of
listing keeps Class A low. As an assumption to check against real orders: 5,000 orders at about 12 MB each is about
60 GB, which is about $0.90 a month of storage; at 100 GB stored the bill is about $1.50 a month. Bandwidth is free.
The risk is not the bill but a loop that lists the bucket on every request, which the snapshot design prevents.

#### 12.2.11 Checks

- `npm run assets:check <folder>` (before an upload): key rules, file types and sizes, `meta.json` fields, a licence
  entry for every font and every photo, a thumbnail for every photo, duplicates.
- The issues route and panel (section 12.1): every skipped entry with its key and reason.
- A weekly size report per prefix (a handful of list operations) in the admin, so growth is seen early.
- Tests: the key function, the file-type check, the SVG cleaner, the access rules (a customer cannot read another
  customer's key; an admin can read an order), and the lifecycle of an upload from `tmp` to promoted.

#### 12.2.12 What the built code must change

Written from reading `apps/web/src/lib` on 2026-11-24, so the next session knows exactly what differs:
1. **`AssetStore` is text-only.** Images, fonts and photos are binary. It needs `getObject(key)` (a stream with its
   content type, size and ETag), `putObject(key, body, { contentType, cacheControl, customMetadata, sha256 })` and
   `head(key)`, while the text methods the catalogue uses stay.
2. **Two stores.** The rebuild must read sources from the public bucket and write snapshots to the private one;
   today it uses one store for both, and the snapshot (with its `issues`) would be public.
3. **`ASSET_KEY_PREFIXES`** must also cover `models/`, `textures/`, `posts/`, `jersey-mockups/` and `site/` in the public
   bucket, and `uploads/`, `saved/`, `orders/`, `licences/` in the private one, each with its own allow-list.
4. **`buildMockupCatalogue` groups on the first folder only**, so it would list `product`, `editor` and `3d` as product
   slugs. It must group on the kind folder, then the product or garment slug, then the look.
5. **Designs use the folder form.** `Doc/R2-STORAGE.md` still says `designs/<design-slug>.svg`; the builder expects
   `designs/<design-slug>/meta.json`. The folder form is the target; the checker lists any single-file design so it can
   be moved.
6. **The R2 store's `put`** writes every object as `application/json`; it must take the content type and cache class
   from the caller.
7. **`Doc/R2-STORAGE.md`** claims everything is public and lists `orders/` in the public tree; it is corrected now
   (see the note at its top) and rewritten when the private bucket exists.

**Built so far (2026-11-25):** items 1, 2, 3, 4, 5 and 6 of the list above are in the code.
`asset-store.ts` has `getObject` / `putObject` / `head` beside the text methods, with `assetCacheControl(key)` choosing
the cache class and the caller supplying the content type; `PUBLIC_ASSET_KEY_PREFIXES` and
`PRIVATE_ASSET_KEY_PREFIXES` split the allow-lists and `isSafeAssetKey(key, "public" | "private")` enforces them;
`writeAssetCatalogue(source, snapshots, kind, now)` builds from the public bucket and writes the snapshot to the
private one (`rebuildAssetCatalogues(buckets, ...)`, `resolveAssetBuckets()` requiring both bindings);
`buildMockupCatalogue` groups `mockups/<kind>/<slug>/<look>.<ext>` and still reads a flat `mockups/<slug>/<look>`
as a `product` look, listing it as an issue; a single-file design is listed as an issue and `Doc/R2-STORAGE.md`
describes the folder form. `tests/asset-store.test.cjs` covers the bucket guards, the cache classes and the binary
API, and the catalogue tests cover the snapshot location and the grouping. Rule 6 of §12.2.3 is built too:
`apps/web/src/lib/asset-keys.ts` holds `ASSET_SHAPES` with `buildAssetKey` / `identifyAssetKey` / `checkAssetFile`, one
shape per key pattern in 12.2.2, and `npm run assets:check -- <folder>` (§12.2.11) checks a copy of the bucket with
those rules before an upload. The type check of §12.2.5 is built as well: `asset-file-type.ts` sniffs a file by its
first bytes (png, jpg, webp, woff2, ttf, otf, glb, pdf, svg, json, csv, html), reads the pixel size of a PNG, JPEG or
WebP, and `cleanSvg` removes scripts, event attributes and external references; `checkAssetContent(key, bytes)` applies
them with the brush 512 px and texture 2048 px limits, and the check script reports a cleaning as a note and a
mislabeled or oversized file as a problem. The event side of §12.2.9 is prepared: `asset-events.ts` holds
`ASSET_SOURCE_RULES` (one non-overlapping prefix per kind), `kindForAssetKey` and `kindsForAssetKeys`, and
`rebuildAssetCatalogues(..., kinds)` rebuilds only the kinds a queue message names. Remaining: the bindings, the Queue and
the event rules (12.2.9), the upload and order routes, and the backup workflow — all of which need the buckets to exist.

**To build for Photos, Patterns and the `users/` layout (decided 2026-11-26).** None of this is in the code yet:
1. `asset-keys.ts`: new shapes `photo` (webp, png or jpg, up to 8 MB and 4000 px), `photo-thumb` (`thumb.webp`, up to
   40 KB and 512 px), `photo-meta`, `pattern` (svg, up to 200 KB) and `pattern-meta`; the private shapes `upload-tmp`,
   `upload` and `saved-thumbnail` become `tmp/<user>/…`, `users/<user>/uploads/…` and
   `users/<user>/designs/<design>/thumbnail.webp`; the licence shape becomes `licences/<fonts|photos>/<slug>/<file>.pdf`.
2. `asset-store.ts`: `PUBLIC_ASSET_KEY_PREFIXES` gain `photos/` and `patterns/`; `PRIVATE_ASSET_KEY_PREFIXES` swap
   `uploads/` and `saved/` for `users/` and `tmp/`.
3. `asset-access.ts`: the owner of a private key is the second segment of `users/<id>/…` and `tmp/<id>/…`; an admin still
   reads everything, and each admin read of `users/` is logged.
4. `asset-upload.ts`: the quota file and the temporary keys move to `tmp/<user>/`, `promoteUploads` copies to
   `users/<user>/uploads/`, and `app/api/uploads`, `app/api/uploads/promote` and the Worker's private route follow.
5. `asset-catalogue.ts` and `asset-events.ts`: the kinds `photos` and `patterns` (a folder with `meta.json`, like designs),
   their routes `/api/assets/photos` and `/patterns`, and a non-overlapping event rule for each prefix. A photo whose
   `meta.json` lacks the licence fields, or whose licence document is missing, is listed as an issue and not offered.
6. `editor-photo-library.ts` and `editor-pattern-library.ts`: the sidebar reads the two catalogues. The nine built-in
   patterns stay in code and are shown first; the Lorem Picsum placeholder photos, the `placeholder` flag and the status
   constants go when the first licensed photos are uploaded.
7. The tests that pin the old paths (`asset-keys`, `asset-upload`, `assets-worker`, `asset-store`) change with the code;
   the backup workflow and `Doc/R2-STORAGE.md` list the new prefixes, and the lifecycle rule targets `tmp/`.
Nothing customer-related has been written to R2 yet, so the rename moves no data.

**Built (2026-11-21): items 1 to 7 above are in the code, and the tests follow.**
`asset-keys.ts` has the shapes `photo`, `photo-thumb`, `photo-meta`, `pattern` and `pattern-meta`; the private shapes
are `tmp/<id>/<file>`, `users/<id>/uploads/<file>` and `users/<id>/designs/<design>/thumbnail.webp`; the licence shape
is `licences/<kind>/<slug>/<file>.pdf` and `{kind}` is a closed list (`LICENCE_KINDS = fonts, photos`), so a licence
cannot land under an invented kind. `PUBLIC_ASSET_KEY_PREFIXES` gain `photos/` and `patterns/`, and
`PRIVATE_ASSET_KEY_PREFIXES` hold `catalog/`, `users/`, `tmp/`, `orders/`, `licences/`; `asset-access.ts` resolves the
owner from `users/<id>/` and `tmp/<id>/`, and `isAdminCustomerFileRead` marks an admin read of either for the audit line
the Worker writes (`assets: audit admin-read admin=… key=… at=…`). `asset-upload.ts` writes `tmp/<user>/<file>` and
`tmp/<user>/quota.json` and promotes to `users/<user>/uploads/`. `asset-catalogue.ts` builds the `photos` and
`patterns` catalogues: a photo is offered only with `photo.<ext>`, `thumb.webp`, a name, its pixel size and a licence
whose `commercialPrintAllowed` is `true`, and — when the rebuild passes the private bucket — a PDF under
`licences/photos/<slug>/`; anything less is an issue naming the key. A pattern needs `pattern.svg`, a name and an `ink`
of `dark`, `light` or `color`. The rebuild writes eight snapshots. `asset-events.ts` maps `photos/` and `patterns/` to
their kinds. In the editor, `editor-photo-library.ts` maps a catalogue photo to a `PhotoLibraryEntry` (placeholders stay
until the first licensed photo arrives, and only then is the note shown), `editor-pattern-library.ts` fetches each
`pattern.svg` and reads it with `editor-svg-shapes.ts` into the same `EditorShapePath` list the nine built-ins use —
`viewBox` scaled onto 1000 × 1200, `translate`/`scale`/`matrix` composed, strokes scaled with the path, and a gradient,
filter, image, text or rotation reported as an issue instead of painted — and the built-ins stay first with their card
ink from `meta.json`. `tests/asset-photo-pattern.test.cjs`, `tests/editor-svg-shapes.test.cjs` and
`tests/editor-catalogue-client.test.cjs` cover the new rules; the browser check shows nine placeholder photos with the
note, nine built-in patterns, and no console errors.

**The rest of the list, built (2026-11-21, second pass).** The 24-hour rule of §12.2.7 is now code as well as bucket
configuration: `asset-tmp-sweep.ts` walks `tmp/` page by page, deletes a file whose write time is older than a day, and
keeps — and names — a file the bucket cannot date, because a customer's photo is never deleted on a guess. The Worker's
hourly `scheduled` pass rebuilds every catalogue and then sweeps, returning both counts
(`handleScheduled` → `ScheduledSummary.sweptTmp`). `AssetObject`/`AssetObjectHead` carry `uploadedAt`, filled from R2's
own `uploaded` date (or the upload route's `uploadedAt` metadata) and from the memory store's write clock, so the sweep
and its tests agree. The Photos grid loads `thumb.webp` and only fetches the full picture when the photo is added
(`PhotoLibraryEntry.thumbUrl`); a pattern's Myanmar name and tags are searchable beside its English name
(`PatternLibraryEntry.keywords`). `npm run assets:check` now reads a pattern SVG with the editor's own reader and fails
on an element a shape cannot carry, and prints the licence path each photo still needs in the private bucket.
`Doc/R2-STORAGE.md` documents both libraries (sections 3.5 and 3.6) and the private bucket's layout (3.7).

#### 12.2.13 Moving from today

1. Create `mh-fashion-private` and bind it as `MH_FASHION_PRIVATE`; create `mh-fashion-backup`. Nothing customer-related
   has been written to R2 yet, so there is nothing to move.
2. Keep reading `fonts/manifest.json` and any flat mockup keys until the shop has uploaded in the new form.
3. Move each single-file design into its folder (`designs/<slug>/design.svg` plus a `meta.json`) with the checker's list.
4. Apply the changes in 12.2.12 in the order 1, 2, 3, 4, 6, then 5.
5. Add the event rules and the Queue (12.2.9), the lifecycle rule for `tmp/`, and the backup workflow.
6. Upload the first licensed photos and patterns in the new form (`photos/<slug>/…`, `patterns/<slug>/…`), check them with
   `npm run assets:check`, and then switch the sidebar from the placeholders.

#### 12.2.14 Decisions

| # | Question | Decision |
|---|---|---|
| R2-5 | One bucket or separate buckets for public and private files? | **Decided 2026-11-24:** separate. R2 makes a bucket public as a whole, so customer and order files get `mh-fashion-private`, never public, reachable only through a Worker after an access check. |
| R2-6 | Where do the catalogue snapshots live? | **Decided 2026-11-24:** in the private bucket, so the `issues` list is never public. |
| R2-7 | Is a customer's original photo kept? | **Decided 2026-11-24:** no. Only the compressed working copy is kept (editor plan D8); an original is stored only if the press asks for originals. |
| R2-8 | How are backups made? | **Decided 2026-11-24:** weekly copy of both buckets to `mh-fashion-backup`, monthly copy of `orders/` and `licences/` to a place outside the Cloudflare account; the owner picks that place. |
| R2-9 | How is a catalogue refreshed after a change? | **Decided 2026-11-24:** by an R2 event to a Queue and the Worker's `queue` handler, with an hourly cron as the safety net and the admin Rescan button; this replaces R2-2's five-minute rhythm once the events are on. |
| R2-10 | Is the design folder named by file format (`svg/`) or by purpose? | **Decided 2026-11-26:** by purpose: `designs/` stays. A folder named after a format becomes a dumping ground for PNG previews and JSON, and the built keys, catalogue and tests already use `designs/`. |
| R2-11 | How are the shop's photos stored? | **Decided 2026-11-26:** one folder per photo, `photos/<slug>/` with the picture, `thumb.webp` (up to 40 KB, 512 px, the only file the grid loads) and `meta.json` (pixel size, licence). Ordinary photos are WebP or JPEG; PNG or WebP with transparency only for a cut-out; up to 8 MB and 4000 px. |
| R2-12 | How are patterns stored? | **Decided 2026-11-26:** `patterns/<slug>/pattern.svg`, an SVG that already covers the artwork space (no editor change), up to 200 KB, with `ink` in its `meta.json`. A repeating tile that the editor tiles itself is a later option. The built-in code patterns stay and come first. |
| R2-13 | How are customers' files laid out? | **Decided 2026-11-26:** in the private bucket, under `users/<account-uuid>/uploads/` and `users/<account-uuid>/designs/<design-id>/`, with unsaved photos in `tmp/<account-uuid>/` (expires in 24 hours). The folder is the account UUID, never the name. `orders/` stays separate, because an order outlives the account. Admin reads are logged. |
| R2-14 | Which photos may be listed? | **Decided 2026-11-26:** only photos the shop may print and sell: its own, bought stock with a commercial or merchandise licence, or public-domain and CC0. Each `meta.json` records the licence name, source address and `commercialPrintAllowed`, and the licence document is kept in `licences/photos/<slug>/`. A photo without them is not offered. The Lorem Picsum placeholders are not licensed for this and are removed when real photos arrive. |

**Depends on:** the two bindings and the Queue in `wrangler.assets.jsonc`; the event rules and the lifecycle rule created in
the dashboard; Supabase Auth for every private route and for the admin writes; the owner's choice of an off-account
backup place.

## 13. Open / Deferred

- MH Sport template organization (provisional: "Template Category" tags).
- Exact print-area canvas sizes (T-shirt ≈ 30×40 cm placeholder; Cup, Bag,
  Pillow, Phone Cover are rough placeholders).
- Pillow and Sling Bag attributes and mockups.
- Payment gateway API details; DHL integration (waiting on DHL).
- Legal page content (Myanmar-specific clauses). **Draft pages exist (2026-11-21):** `/terms`,
  `/privacy` and `/cookie-policy` render from `lib/storefront-info.ts` with a visible "draft for legal
  review" banner. The Myanmar-specific clauses still need a lawyer's review.
- Private R2 connection and uploads for Elements, licensed fonts, text-style
  previews, and mockup assets remain deferred (the Worker-and-JSON design is in section 12.1). The editor uses its local
  Elements catalog and browser/system font fallbacks; the storefront continues
  to use its existing Supabase product data. Product, editor and 3D mockups are
  read from the public bucket, but **uploading them is admin-only and not built
  yet** (section 12, section 16 P1).
- Further editor tools and layer-panel features; further admin permissions.
- Refund request flow; mobile app scope; email provider.
- **Customer accounts are browser-local (2026-11-21).** `customerAccounts` and the 12-hour customer
  session live in `localStorage` (P0-1), so a customer's password signs them in only in the browser that
  holds the record. Owner-visible consequence: a customer on another phone cannot sign in yet, and the
  owner cannot manage an account from a second device either. Do not describe this as a working account
  system until the table lands.
- **A published post has no storefront page (2026-11-21).** See P1-11: `tshirtPosts` is read by the admin
  board and the Price Table only, so a post cannot be seen, bought or searched by a customer yet.

**Owner answers (2026-11-21) — all five questions closed**

1. **Posts labels:** renamed to the 4.1 names (Print Method, Fabric Type, Knit Structure, MH
   Cuttings), not mapped. Implemented; see §4.1.
2. **Deploy:** keep the current rule — every push to `main` deploys. No staging branch for now, so
   directive 5 stands unchanged.
3. **Inventory:** raw (blank) garment stock, as assumed in §16. It does **not** cap sellable
   quantity, so no stock decrement on sale — this stays the **default** (2026-11-22: the rule exists in
   `lib/stock-movement.ts` behind `settings.deductStockOnSale`, which ships **off**; switching it on makes
   a paid order consume its pieces and a refund or cancellation put them back, once each, with a shortage
   recorded on the order instead of being hidden by a clamp at zero).
4. **Takedown:** a paid order for a taken-down design is **not** stopped; it is produced and
   delivered. See §8.1.
5. **Pricing Management (4.5.1):** spec approved as written; design the **Web grid first**, then
   the Phone cards.

## 14. Build Status

**Status snapshot 2026-11-21 — read this line first; every dated snapshot below it is history.**

- `main` is at `daf4efb`. `node --test tests/*.test.cjs` reports **1001 tests, 1000 pass, 0 fail**
  (one is skipped on purpose) with a server on port 3000; `npx tsc -p apps/web/tsconfig.json --noEmit`
  is clean and `npm run build --workspace=apps/web` compiles.
- The admin workspace is a real, typed, browser-local application with **fifteen modules** (§10),
  including the Price Table, Attribute Management, Posts, Ads, Loyalty, Settlements and the Messages
  inbox. It is still **not** a security boundary (P0-1, P0-2).
- The editor is **built**, not a shell: §6 and Part II hold its contracts and its status. The 2026-11-13
  audit line below described the shell that existed then; it no longer describes `/create`.
- Checkout, the payment intent/webhook contract, delivery quotes, search, wishlist, size charts, the
  contact inbox, SEO structured data, print-quality checks, CSV hardening and the customer password flow
  are in the tree; §16 lists what remains.
- **Deployment:** the answer lives in "Deployment status" immediately below and nowhere else.

### Deployment status — the one place this question is answered *(2026-11-21)*

Four paragraphs elsewhere in this file describe the pipeline as it was on 2026-11-10, 2026-11-12 and
earlier on 2026-11-21. They are history; this block replaces them.

- Every push to `main` runs `.github/workflows/deploy-cloudflare.yml` (owner answer, §13 item 2). There
  is no staging branch.
- The job's **first step** checks that `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exist. If either
  is missing it exits 1 and every later step is skipped, so nothing is deployed and the Worker keeps
  serving the last successful build.
- The Actions-secret state is **unconfirmed**. AGENTS.md recorded "no secrets configured", yet a probe on
  2026-11-21 saw pages that only exist after `501e16b`, which means a deploy did run at some point. Do not
  repeat either claim: check GitHub → Settings → Secrets and variables → Actions, then record the answer
  here with the date it was checked.
- `Workers Builds: mhfashion` (the Cloudflare-side build, not the GitHub workflow) fails on every branch
  including `main`. It is not a regression from any change.
- A merge therefore does not prove production changed. After a deploy, re-probe `/`, `/nyein`,
  `/products/butterfly-effect` and `/admin/login`.

**Historical snapshots (kept for the record; superseded by the snapshot above).**

**Repository-source audit (2026-11-13, commit `90dc398`; production was not re-probed in this audit):** at that commit `/create` was only the EditorCanvas shell described in §6, with no editable canvas wired to the route. The detailed editor feature descriptions in this section were already historical then and did not match the audited code.

**Live in production** (status last externally probed on 2026-11-12; not re-probed during this code audit; mhfashion.mhfashionmm.workers.dev was then serving the pre-upgrade build described below): scaffold and Cloudflare deploy, the Supabase
schema migrations `0001`–`0007` (Guide content and Super Admin roles included;
whether each migration is applied is owner-managed), homepage with live product
data, sticky header, mobile drawer, footer, dark/light and Ks/$ toggles,
notification dropdown, category marquee, Guide listing and article pages, product
detail, and the cart page. Probed on 2026-11-12: `/`, `/new`, `/popular`,
`/collections`, `/mh-fashion`, `/nyein`, `/guide`, `/guide/how-apparel-options-narrow-down`,
`/products/butterfly-effect`, `/cart`, `/account`, `/create` and `/admin/login` return 200;
`/admin/register` returns 404.

**Historical deployment status (2026-11-12; superseded by "Deployment status" in this section):** the plan reported the Next.js 16.4.6 / React 19.3.1 / Fabric.js
7.4.0 upgrade, the restored Cloudflare deploy workflow, the related-product card
and section styling, and the Footer/CopyrightBar corrections (commits `9cb5e21`
through `47e63fb`). Every workflow run since `9cb5e21` stops at the
secret-presence check, so production keeps serving the last successful build.

**Product detail pages (`/products/[slug]`):** use the full available page width
with minimal gutters and a compact gallery (280px at tablet widths, capped near
360px on desktop) beside details that fill the remaining space. On narrow phones,
center the main image and thumbnails in a 200px gallery. Photo and thumbnail
borders remain subtle 1px. A Product details box summarizes the catalog's actual
product type and customization status; the current schema has no free-form
description field, so the page avoids unsupported material/specification claims.
The Reviews title and rating stay visible while the review cards start collapsed.

**Current editor-shell change (2026-11-13):** The storefront `Header` is temporarily
hidden on `/create`; the `EditorCanvas` workspace remains. Ctrl/Command+wheel is
prevented from zooming the browser while the web app is open. In the editor,
Ctrl/Command+wheel zooms only the view. Middle-button drag or Space+left-drag
pans the view, and unmodified wheel moves it vertically. Do not show pixel-size
labels or invent physical print dimensions; actual print dimensions belong to
product configuration. Preview box proportions follow the supplied reference.
The supplied reference is implemented as a blue `T-Shirt` design
box and purple `Mockup` box connected by a small dot/line; the dot toggles the
mockup box. Until the user provides mockup images in R2, the box uses neutral
placeholder image slots and print-area guides only; R2 is not connected. The
mockup box renders one slot per available product side (Front and Back for a
two-sided shirt, or only its supported side for a one-sided product). The blank
`/create` route currently defaults to Front and Back; selected-product data
wiring remains pending. The source audit also found that touchscreen pointers cannot use the existing middle-button/Space+left pan handler, and short phone heights can clip the stacked workspace; track both as open responsive issues in `Doc/DOCUMENTATION.md#code-audit`.
**Pan and pinch on a touch screen (2026-11-22):** the pan half of that finding was stale — a phone already pans with the `Pan view` toggle or the Hand tool, both of which set `touch-action: none`. What was missing is the gesture every phone user tries first: **pinch to zoom**. The viewport now listens for `touchstart` / `touchmove` / `touchend` and, on two fingers, zooms between 0.25× and 3× and pans at the same time, keeping the artwork that was under the fingers under them. The maths lives in `lib/editor-pinch.ts` (`pinchView`, `pinchFrameFrom`) so it can be tested: a phone scales about its **top centre**, so the transform origin has to enter the pan term or the artwork slides sideways by `originX × Δzoom` — 146 px, a third of the print canvas, which the first browser run caught and the unit test now pins. A second finger never hijacks a layer drag or a stroke (the handler bails when a drag ref is set), and one finger still belongs to the tools. Measured in Chromium with CDP touch events: at 390 × 844 and 820 × 1180 the anchored corner lands within **0 px** of where the pinch maths says it should, a two-finger drag pans by exactly the finger delta while holding the zoom, and the clamps stop at 3× and 0.25×. `tests/editor-pinch.test.cjs` covers the maths and the wiring; the existing touch suite (`tests/editor-touch.cjs`) still passes end to end, including one-finger strokes.
**Short phone heights (2026-11-22):** reproduced and fixed. At 320 × 480 and 320 × 568 the stacked workspace is taller than the viewport, and the floating Tools Bar covers the bottom of the print canvas: 146 px and 58 px of it could not be reached, because the workspace is centred with `my-auto` inside a scroller that had nothing to scroll. `lib/editor-viewport.ts` now measures the overlap and reserves that much room as a spacer inside the scroller, so the canvas can be scrolled clear of the bar. Two details mattered. The room has to be a **spacer, not padding on the scroller**: the scroller is absolutely positioned, so padding inflates its own box and pushed the whole editor 150 px under the bottom navigation (the landscape check in the touch suite caught it). And the measurement has to keep its last answer when either box is still empty, plus retry at 150/400/900 ms, because on a 320 × 480 first paint the bar has no height yet and the canvas would otherwise never get its room. Measured in Chromium at 320 × 480, 320 × 568 and 360 × 640: scrolled to the end, **0 px** of the print canvas stays under the bar (it was 146 / 58 / 23), no horizontal overflow at any size, and the verified 390 × 844, 820 × 1180 and 1280 × 900 layouts reserve nothing, so they are unchanged. `tests/editor-viewport.test.cjs` pins the geometry.

**Current `/create` implementation (verified 2026-11-13):** the route mounts a shell only. The design area is an empty `div`; the mockup is a static placeholder. No editable Fabric canvas, artwork tools, text/elements insertion, Layers/Properties panel, document state, undo/redo, serialization, browser draft, or account-backed save is wired to this route. The installed Fabric.js package alone does not mean these features are implemented. Historical editor notes below must be treated as dated snapshots, not current feature status.

**Earlier editor feature list (historical, not present in the audited current route):** Fabric.js 7.4.0 canvas with selectable, movable,
scalable and rotatable objects; in-place text editing and family/size/weight/
color formatting; freehand vector Pen paths; zoom and hand-pan; browser-local
image import; text/basic-shape insertion; Undo/Redo; Save and restore via local
storage; Front/Back draft state; layer visibility/lock, creation, duplication,
  grouping, reorder, deletion, inline rename, collapsible groups, drag/drop nesting,
  thumbnails, a desktop-editor-inspired compact selected-layer control strip with the
  blend/Opacity and Lock/Fill row arrangement, blend
  modes, opacity, per-layer Fill, Pass Through and isolated group compositing,
  flow under layer properties, effect toggles, alpha clipping masks, embedded
  raster Smart Object controls, and uniform mask strength. This is not a
  desktop-editor-equivalent panel or renderer. Designs remain browser-local and are
  not yet backed by Supabase or R2.
  The Elements flyout now includes category browsing, name/tag search, color
  choices, original SVG previews, click-to-add, and drag-to-canvas placement.
  Catalog data/assets are in `public/elements/v1` with future R2 object keys;
  R2 itself remains disconnected by request. The Text flyout now follows the template editor's
  heading/subheading/body and font-search flow, supplies text/font-combination
  presets and selected-text formatting, using system fonts only. The Products
  sidebar was removed by owner request; storefront product catalog and detail
  pages remain available. R2 remains disconnected; licensed custom fonts await
  the future typography phase.

**Built, using placeholder data:** Account page (`/account`).

**Editor implementation roadmap:** first implement the editable document model, canvas editing operations, selection/history, Layers/Properties UI, validated serialization, and draft persistence; then deliver the detailed capabilities and production integrations specified in the Editor Implementation Plan. Do not present the historical Fabric.js feature list above as the current implementation.

**Code-audit follow-up (2026-11-13):** see [Code Audit section](../Doc/DOCUMENTATION.md#code-audit) for line-level evidence and recommended fixes. Active follow-up areas are: (1) implement `/create` beyond its shell and satisfy Phone pan/short-viewport behavior; (2) repair storefront route targets, search/category behavior, selected variant/cart pricing, popularity labeling, and account demo-state labeling; (3) protect Supabase reward balances and platform settings with narrowly scoped policies; (4) fail safely when price-range lookup fails; and (5) smoke-test the built Cloudflare Worker runtime before deployment.

**Broader platform sequencing:** after the audit priorities are addressed, continue Supabase Auth and server-side Super Admin authorization, checkout/payment/order creation, R2, and the remaining editor production work.

---

**Earlier status snapshot 2026-11-21 (superseded by the snapshot at the top of this section; kept
because it records the one live probe):** `main` was then at `ca454da` and the suite passed 220/220.
The production Worker was probed on 2026-11-21: `/`, `/nyein`, `/admin/login` and
`/products/butterfly-effect` all returned 200, the removed delivery/support promises were absent from
the product page, and `/nyein` served the brand collection page — so the deploy pipeline has run at
least through `501e16b`. The secret question is answered in **Deployment status** above, not here.
Supabase migrations `0001`–`0007` remain owner-managed, and the admin workspace is still browser-local
(section 16 P0).

## Change Log

> **How to read this log.** Entries are appended in the order the work was recorded, and a `§4.5.x`
> section carries the date of the owner request that started it, which is not always the date the work
> was recorded. Where a section and an entry disagree about a date, the section is the detail and this
> log is the chronology; nothing here is a promise of when a feature shipped to production — that is
> "Deployment status" in §14.

- Initial consolidated plan created from the planning conversation.
- Editor page now shows the site Header bar at the top; removed it from "Next".
- `/create` now has browser-local Undo/Redo history and Save/restore; these do
  not replace account-backed design saving.
- Added local photo import (PNG/JPG/WebP) with browser-side resize and draft
  persistence; production R2 upload and AI image tools remain deferred.
- Connected the current layer controls to local editor state and Undo/Redo:
  visibility, locking, creation, duplication, grouping, reordering, deletion,
  blend/opacity/flow, preview effects, clipping preview, and uniform mask
  strength. True pixel merge and paintable masks remain dependent on Fabric.js.
- Added Text and Elements panel insertion for styled text and rectangle, circle,
  triangle, and star shapes. Inserted objects become individual layers and are
  saved/undone with the local editor draft; freeform vector path editing remains
  pending.
- Replaced the DOM-mock design area with Fabric.js 6 canvas objects. Added
  select/move/scale/rotate, in-place text editing, zoom, hand-pan, actual canvas
  stacking synchronized with layer order, and transform history persistence.
  Production masks, pixel merge, account-backed storage, and further tool support
  remain open work.
- Added freehand vector Pen strokes with Undo/Redo and browser-draft persistence;
  selected strokes support color and width changes. Added font-family selection
  at text insertion and selected-text controls for family, size, weight, and
  color. The Effects flyout now toggles selected-layer effects (shadow, stroke,
  glow; raster blur/sharpen). True paintable masks, pixel merge, and node editing
  remain pending.
- Upgraded the Layers box toward desktop-editor-style behavior: type-aware thumbnails,
  double-click inline rename, collapsible folder groups, drag reorder, and
  drag-into-group nesting. These actions update the Fabric layer stack and enter
  Undo/Redo. True layer masks, clipping, raster merge, and group transforms
  remain unimplemented.
- Expanded layer blending to standard Canvas modes including Color Dodge/Burn,
  Hard/Soft Light, Difference/Exclusion, Hue/Saturation/Color/Luminosity, and
  Linear Dodge (Add). Layer opacity now has both a live 0–100% slider and a
  numeric percentage field; nested group opacity cascades to child objects.
  the desktop editor's isolated group compositing and layer Fill remain future work.
- Added a separate 0–100% Layer Fill slider/number field and isolated folder
  compositing: group children render together to an offscreen surface, then the
  group's blend mode and Opacity apply to the combined result. This first version
  did not yet implement Pass Through or proper Fill-vs-effects alpha;
  those gaps were corrected in the subsequent Layers panel fidelity update.
- Reworked the Layers panel toward the desktop editor's actual panel structure: selected
  blend/Opacity controls above a larger layer stack, Fill directly below Opacity
  for individual layers only, compact rows with visibility/lock/thumb indicators,
  and layer-specific text/flow/effect settings tucked under selected properties.
  Groups now default to Pass Through and child blend modes remain individually
  active in that mode; choosing another group mode isolates/composites children
  as one image. Fill scales content alpha separately from overall object opacity.
  Advanced Blend If/channel options and exact effect-aware rendering
  remain unimplemented; this is desktop-editor-inspired, not desktop-editor-equivalent.
- Replaced the old inset-rectangle clipping preview with alpha clipping: a clipped
  layer now uses the nearest unclipped lower sibling as its base, so transparent
  pixels in the base hide the upper artwork. Clipped layers inherit base opacity
  and blend mode. The panel prevents clipping when no valid lower base exists.
- Added embedded raster Smart Objects for uploaded images. Conversion keeps the
  original image data in the artwork model and records a transform baseline;
  Replace Contents validates/resizes the new image while keeping its placement
  and transforms, Reset Transform restores the saved transform, and Rasterize
  removes the Smart Object metadata. This is not a PSD/PSB document container:
  editable internal contents, linked assets, multi-layer/vector Smart Objects,
  and Smart Filters remain future work.
- Replaced the four-shape Elements starter with a template-inspired, searchable SVG
  library: category tabs, keyword/tag matching, recent-use shortcuts, color
  selection, click-to-add and direct drag-and-drop placement. Added a versioned
  local asset manifest and original monochrome SVG collection. Prepared the
  future R2 key/route contract (`elements/v1/...`, `/api/editor/elements`) but,
  as requested, did not authenticate, create a bucket, add a Worker binding,
  enable public access, or upload objects. the template editor's documented Elements flow uses
  search/category browsing and selection followed by reposition/resize; this
  prototype follows that flow without copying template assets. [template-editor element guidance]
  [Cloudflare: Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/)
  [Cloudflare: Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- Researched current desktop-editor Layers panel guidance and refined the selected-layer
  controls to match its layout: blend mode and Opacity on the first line, Lock
  and Fill on the second, on-demand slider popovers, and visibility controls in
  the leading layer-row column before thumbnails. This is a closer layout match,
  not a claim of pixel-for-pixel equivalence.
- Expanded the Text flyout after researching the template editor's official Text tab and Font
  Library: heading/subheading/body insertion, font/category search, text styling,
  and ready-made font combinations are now the implementation model. Added live
  storefront product browsing to `/create` using the same public product and price
  data functions as the store, with a future private-R2 asset contract for licensed
  fonts, text-style previews, and product cards. No custom font files, R2
  credentials, bucket, binding, public access, or upload are included. This
  reproduces useful interaction patterns, not template assets or a pixel-identical
  editor. [template-editor text guidance]
  [template-editor formatting guidance]
  [template-editor text guidance]
- Activated all 14 non-Move canvas tools with tool-specific pointer behavior,
  color/width/tolerance settings, status feedback, and history-backed artwork edits.
  Ruler overlays are excluded from saved marks; Rotate View/Hand/Zoom operate only
  on the viewport. Path Select, Magic Wand, Clone Stamp, and Eraser explicitly
  remain object-level rather than pixel/anchor editing. The Next.js production
  build passed; a read-only review found no P0/P1 issues and its lock/raster-status
  findings were corrected before delivery.
- Stabilized the desktop-editor-style Layers Box after user feedback: the right dock
  remains visible from editor load, with its header, layer list, and fixed
  Blend/Opacity and Lock/Fill rows present before selection. Empty-state controls
  show neutral values and are disabled; selecting a layer updates their values
  without inserting rows or opening sliders. Slider popovers require their own
  explicit control, close on layer changes, and advanced properties remain
  collapsed unless the user opens them. Build validation passed.
- Fixed drawing on newly created layers: the first single object inserted into an
  unlocked selected blank layer now uses that layer's ID and preserves its layer
  settings; locked layers/ancestors and folders show explicit messages instead
  of silently redirecting artwork. Eraser clears the object but retains the now-
  blank layer for reuse; Undo/Redo keeps the pre-existing layer. Production build
  and whitespace checks passed.
- Removed the editor Products sidebar panel, its catalog component, and its
  editor-only products API/helper at the owner's request. Storefront catalog and
  product detail pages, plus the editor's bottom Product attribute selector,
  remain unchanged.
- Replaced the dark desktop-editor-like drawing surround with a theme-independent
  light workspace and white artboard, and made the selection bar contextual for
  text and shape formatting plus selected-object duplicate/delete. Production
  build and TypeScript checks passed.
- Added the initial `/admin` dashboard UI based on the supplied references:
  responsive dark navigation, light KPI/analytics workspace, sample-data label,
  order/product tables, and activity panels. Added `/admin/login` and
  `/admin/register` as frontend-only demo account pages backed by browser local
  storage, plus a client-side route gate and sign-out. These are not secure
  authentication/authorization and use no Supabase or live analytics. Production
  build passed; admin routes and the synchronized route manifest returned HTTP
  200. Browser QA verified create → dashboard → sign out → login and removed the
  disposable test account/session afterward.
- Plan accuracy sync (2026-11-12): replaced the provisional stack table and the
  §3 toolchain bullet with the versions actually installed in `package-lock.json`
  (Next.js 16.4.6, React 19.3.1, TypeScript 5.9.3, Tailwind CSS 3.4.19, Fabric.js
  7.4.0, `@opennextjs/cloudflare` 1.20.16, Wrangler 4.158.0, ESLint 10.14.0,
  Node 22). Recorded the real Next.js server-layer backend instead of the
  undecided NestJS/Express entry, and corrected the editor engine reference from
  Fabric.js 6 to 7.4.0.
- Build-status and deployment corrections (2026-11-12): §14 now separates what
  production actually serves from what is merged on `main` but undeployed, the
  migration range is `0001`–`0007`, and the "Next" list reflects the remaining
  work (Supabase Auth, secure admin authorization, checkout/payment/orders, R2).
  §15.6 records HEAD `47e63fb`, the eight workflow runs that stopped at the
  Cloudflare secret check, and the verified live route responses.
- Detailed Editor Plan added (2026-11-12): created `Plan/PLAN.md#editor-implementation-plan` and
  linked it from §6. It defines the planned MH Fashion editor system from Move
  tool behavior onward, including selection and transforms, snapping/guides,
  vector anchor editing and Shape Builder, raster selection roadmap, layers and
  non-destructive masks/Smart Objects, text transformations, effects, mockups,
  production export, shortcuts, persistence, accessibility, phased delivery,
  and acceptance criteria. It uses the official editor documentation
  documentation as behavioral references without copying proprietary assets or
  UI.
- Fabric implementation appendix added (2026-11-12): the former editor plan file (now Part II of `Plan/PLAN.md`) now
  specifies the Fabric.js 7.4.0 logic for Move gestures, scene/document
  coordinates, selection and lock guards, snapping, group transforms, pointer
  capture, keyboard nudges, transaction-safe Undo/Redo, and React/Fabric state
  synchronization. It also defines Text on Path as a linked text mark plus
  editable guide `fabric.Path`, with a custom glyph renderer, arc-length layout,
  alignment/offset/reverse-side behavior, hidden `IText` editing proxy,
  persistence/migration, export rules, performance guidance, and a test matrix.

- Product detail UI/UX update (2026-11-14): redesigned `/products/[slug]` from
  the compact initial detail page into the supplied marketplace-style reference
  direction. Added a responsive gallery, thumbnail controls, wishlist/share
  affordances, rating/price presentation, compact Size/Color/Material/Fit/
  Sleeve/Print selectors, quantity control, Buy Now/Add to Cart/Edit Design,
  service benefits, detail tabs, review summary, shipping copy, and related
  products. The main gallery was progressively reduced to a compact 280px
  desktop/mobile cap; the option groups intentionally have no outer wrapper
  boxes. Product cards retain their existing links.
- Variant-price interaction update (2026-11-14): product cards continue to show
  price ranges; the detail page shows the range before any Size, Color, or
  Material choice, then switches to one displayed price after a choice. This is
  currently client-side prototype pricing and is not yet carried into cart
  persistence. Mobile spacing, typography, gallery sizing, horizontal tabs,
  and the three action buttons were tuned together with desktop behavior.
- Validation for the product-detail changes: Next.js production build,
  TypeScript, and `git diff --check` passed. The application changes were pushed
  directly to `main` in commits `4d93a86`, `3620fe4`, `45b9935`, `caf13dd`,
  `6adf382`, `e6ab9ba`, `76323f3`, and `fc42b82`.
- Product-detail selector follow-up (2026-11-14): replaced the prototype Print
  Style group with GSM options (`160`, `180`, `200`, and `240 GSM`). GSM now
  participates in the displayed client-side variant amount. Quantity changes
  multiply the displayed range/single price, and Buy Now/Add to Cart add the
  selected quantity rather than one item. The compact control layout remains
  responsive on phone widths; production build and TypeScript passed.
- Price-display correction (2026-11-14): a single price is now shown only when
  Size, Color, Material, and GSM are all selected. If any required choice is
  still missing, the page continues to show the quantity-adjusted price range.
- Phone interaction audit and correction (2026-11-14): made the mobile header
  search icon open a real `/mh-fashion?q=...` search form; made Product Detail
  Share use the Web Share API with clipboard fallback, and connected Size Guide
  and review actions to their tabs. Fit Type and Sleeve controls now retain
  their selected state, and MH Fashion phone controls now navigate to category
  choices or execute the existing sort query instead of being no-op buttons.
  The global CopyrightBar is hidden below the desktop breakpoint so phone shows
  copyright only inside the mobile side drawer; desktop copyright behavior is
  unchanged. Build passed; lint reported no errors and only existing warnings.
- Phone Product Detail option/price verification (2026-11-14): exercised the
  X Marks flow at a 390×844 viewport. The initial value was `20,000 – 24,000 Ks`;
  selecting only Size kept the range; selecting Size, Color, Material, and GSM
  produced `24,000 Ks`; quantity 2 produced `40,000 – 48,000 Ks` while the
  variant was incomplete and `48,000 Ks` after the full set was selected. The
  option rows, gallery, and fixed phone navigation fit without horizontal
  overflow in the screenshot. No source change was required from this test.
- Phone gallery frame correction (2026-11-14): removed the extra Product
  Detail outer card border/background/shadow below the phone breakpoint so the
  main photo and thumbnail row share one aligned gallery edge without a second
  side frame protruding beyond them. Tablet and desktop retain the existing
  framed detail card.
- Editor Tools bar (2026-11-15): added the owner-requested compact, rounded, collapsible bottom-center dock with Move, Pen, Hand, Brush, Eraser, Text, Undo, and Remove BG. Pen/Brush, stroke erasing and bounded draw/erase Undo work on the current layer model; Text and Remove BG show notices until their object/image pipelines exist. Mobile placement clears navigation and hides behind open side panels. See `Doc/DOCUMENTATION.md#work-log`.
- Canvas options menu (2026-11-15): compacted the canvas-edge menu and replaced its single `Add Mockup` action with separate `Front Mockup` and `Back Mockup` entries, removed the `+` control from the Front Mockup box, and re-themed the circle and the canvas/mockup connector wires with the app accent tokens; the canvas node now stacks above the mockups while the menu is open so every entry stays clickable on Web and Phone. See `Doc/DOCUMENTATION.md#work-log`.
- Plan review (2026-11-21): recorded the owner decisions — Editor final as built (no further editor
  planning or changes), gallery sizes as built, EN/MM UI, attribute names fixed, notification
  channel deferred, Google Sheet pricing removed in favour of the Pricing Management UI/UX spec
  (4.5.1, Web + Phone, proposed), admin-only R2 uploads through the dashboard, and the copyright
  and takedown policy (8.1). Added the remaining-work register (16), fixed the R2 key pattern (12),
  folded the 2026-11-21 build updates into sections 7/8/10, and refreshed the status snapshot (14).
  Pending owner confirmation: Posts labels, deploy/staging, the meaning of Inventory, the takedown
  rule for open orders, and the Pricing spec itself (13).
- Owner answers + implementation (2026-11-21): all five open questions are closed (section 13).
  Posts labels renamed to Print Method / Fabric Type / Knit Structure / MH Cuttings with the 4.1
  option values (`lib/admin-demo-data.ts`, `normalizeTshirtPostOptions` maps saved posts onto the
  new words); the Editor Header Bar 2 now shows Product, Print Method, Fabric Type, Knit Structure,
  MH Cuttings, GSM, Color, Size with the §4.1 cascade (`lib/editor-attributes.ts`). The Google
  Sheet price import is deleted (`lib/sheet-prices.ts`, `app/api/admin/tshirt-prices/route.ts` and
  its panel), so prices are hand-entered only. Deploy rule unchanged (every `main` push deploys),
  Inventory is raw garment stock and does not cap sales, and a takedown never stops a paid order.
  Pricing Management is approved as written and the Web grid is designed first.
- Pricing Management Web grid + design takedown (2026-11-21): `/admin/pricing` is built against
  4.5.1 (scope picker, valid-combination table with filters, bulk set/copy, staged saves, row
  history, CSV export/import preview, stale-save rejection); the pure rules live in
  `lib/pricing-combinations.ts` and the store in `lib/admin-pricing.ts`. Post scope writes the
  post's own price rows, product scope one row per stocked size. Designs gained a Takedown drawer
  that records the claimant and hides the design without touching paid orders (8.1). The seeded
  Peacock post had a Sublimation + Combed Cotton row, which the cascade forbids; it is now DTF.
  Phone cards followed (grouped collapsible cards, bottom sheets, keypad fields, sticky save bar;
  verified at 390 and 320 px). Attribute Management followed: `/admin/attributes` edits the chain
  order, labels, options and on/off state with guards that refuse to orphan a price row; the chain
  drives the pricing grid's labels and column order and the vocabulary a new post starts from.
- 2026-11-22: Added §12.1, the R2 asset service: a Worker reads R2 through a binding and returns JSON catalogues (fonts, designs, elements, brushes, mockups), with snapshots, scheduled rebuilds, admin writes after Auth, private files only through the Worker, and an S3-ready store interface. Replaces the earlier future serving contract.
- 2026-11-23: Decided R2-1 to R2-3 (§12.1). Editor plan: decided D1, D2, D4 to D9, D14 and D15; designed the saved design and order hand-off (E1), the Hoodie (E9) and design areas (E23); added the order of work (5.1) and the list of inputs only the owner can supply.
- 2026-11-23: `Plan/` reduced to one file: the editor plan became Part II of this file and the separate editor plan file was removed. Added the repository layout and file rules (SQL only in `SQL/`, documents only in `Doc/`, one file in `Worker/` and in `Plan/`), the §17 search plan, and the Worker-file design in §12.1 (R2-4). Section 6 now points to Part II.
- 2026-11-24: Added §12.2, the R2 storage plan: three buckets (public, private, backup), every prefix with its file type, limit, writer, reader and cache class, key rules, how files get in and are read, retention, backups, rebuild events, cost, checks, the changes the built asset code needs, and decisions R2-5 to R2-9. The old key list in section 12 now points to it.
- 2026-11-21: the Photos and Patterns catalogues and the `users/` + `tmp/` customer layout are in the code (§12.2.2,
  §12.2.12 items 1-7); the sidebar reads both catalogues and keeps the placeholders and the nine built-in patterns
  until the first licensed photo or pattern is uploaded.
- 2026-11-21: the search screen speaks both languages (§17 S7): its labels, tabs, count sentence and empty
  states come from the dictionary through `components/T.tsx`, Esc clears the field, and `likePattern` escapes
  `%`, `_` and `\` before every `ilike` (§17 S10). The font stack now names each platform's Myanmar face and
  `html[lang="my"]` gives Burmese a 2.1 line box, because Noto Sans Myanmar's own line box is 2.17em and a
  Latin line height made two lines collide on a phone.
- 2026-11-21: **one Price Table wired to everything** (§4.5.6): a post's own price rows seed that
  product's variants, the editor header, the shop and the sale all read the same table, MMK and USD sit
  side by side, and an unlisted combination is not sold.
- 2026-11-21: **per-category attributes and presets** (§4.5.7): every category prices on its own
  specification preset (phone, cup, bag, jersey, kids, cap), all of them in one chain, switched on per
  product.
- 2026-11-21: **customer records and password management** (§4.5.8): `customerAccounts` stores a salted
  PBKDF2 hash only, and the admin drawer sets, generates, forces a change on, or blocks an account.
- 2026-11-21: **the customer signs in and changes their own password** (§4.5.9): `customer-session.ts`
  verifies the hash, keeps a 12-hour session, and refuses a change with no session before touching an
  account; `/account` Settings mounts `AccountPasswordPanel`.
- 2026-11-21: **a post for every product category, with bilingual tags** (§4.5.10): `category` and
  `tags: {en, my}` on a post, `groupPostsByCategory` on the board, a category filter and per-group "New"
  button, and a tag editor with suggestions; older stored posts load as T-Shirt with no tags.
- 2026-11-21: **§19 System architecture and operations** written at the owner's request: runtime topology,
  the one-way data migration, identity and authorization as a server-side system, the environment-variable
  table with what breaks without each, the pipeline and its five gaps, response security headers, abuse
  control, observability and the four incident playbooks, backup/restore/retention, and seven open system
  defects (S1–S7). Two register items were added from it: P1-12 (security headers) and P1-13 (configuration
  truth). Nothing there is approved to start.
- 2026-11-26: §12.2 now covers the editor's Photos and Patterns libraries (`photos/`, `patterns/`) and moves customers' files to `users/<account-uuid>/` and `tmp/<account-uuid>/`; decisions R2-10 to R2-14; the code changes this needs are listed in §12.2.12; Part II (II.2, E1, E10, the inputs list) and §17 search follow.



## Production publishing status snapshot (2026-11-10; superseded by "Deployment status" in §14)

> Historical record. The versions and audit results below were current on
> 2026-11-10 and are kept as written. The stack has since moved to Next.js
> 16.4.6 / React 19.3.1 / Fabric.js 7.4.0 (see section 2 and the security
> upgrade record below), and the dependency gate described here is closed.

- The lockfile installs Next.js 15.5.29 and OpenNext Cloudflare 1.20.16. After a clean `npm ci`, `npm run cf:build --workspace=apps/web` succeeded, and `npx wrangler deploy --dry-run` succeeded with a 1.16 MiB compressed Worker bundle. Local Worker preview returned HTTP 200 for `/`, `/admin/login`, `/admin/register`, `/admin`, and `/manus-routes.json` without Supabase keys.
- The catalog loader now degrades gracefully when Supabase URL/key are absent, so the visual storefront shell can render its existing empty-catalog message. Real product listings remain unavailable until Supabase is configured and migrations/seeds are applied.
- No live Cloudflare deployment has been made. Wrangler is unauthenticated in this environment. GitHub Actions run [42306302512](https://github.com/mhfashion/mhfashion/actions/runs/42306302512) stopped at a check for missing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no deployment workflow exists on current `main`, so the deploy trigger and credentials must be configured.
- Public launch is also gated on production dependency review: `npm audit --workspace=apps/web --omit=dev` reports 8 advisories, including Fabric.js SVG-export XSS and a critical transitive `tar` advisory. The suggested automatic fix requires breaking major upgrades (`fabric` 6 to 7.4.0 and `next` to 16.4.6); preserve the Fabric.js 6 editor behavior by doing an explicit upgrade and regression pass rather than forcing these changes during a dashboard task.

---

## 15. Current Implementation Addendum (audited 2026-11-10)

This section records the current repository state and overrides earlier draft bullets where they conflict with the implemented UI. It is the current source of truth for the storefront prototype.

### 15.1 Current route map

- `/` — full-width Home page with compact mobile Hero, circular auto-moving category marquee, Popular Products, New Arrivals, two promotional cards, and the full desktop Footer; the separate copyright strip appears at the end of every non-editor view.
- `/new` — latest products only; no filter controls; responsive product grid.
- `/popular` — best-selling products only; no filter controls; responsive product grid.
- `/collections` — collection/category browsing page with compact horizontal category cards on phone.
- `/mh-fashion` — MH Fashion collection page with category navigation, search/sort controls, responsive grid and sidebar filters. The Price Range fieldset/slider has been intentionally removed; Category, Size and In Stock controls remain presentational until filter behavior is connected.
- `/nyein` — separate Nyein destination. **Built 2026-11-21 (owner):** the page wears the home page's UI/UX —
  the same `Header`, hero gradient and shape, `CategoryRow`, two product strips, the two promo tiles and `Footer` —
  but nothing on it can be edited: no `AdSlotBanner`, no "Start Designing" and no `/create` link, the second promo
  tile is a plain panel, and the strips read `getProductsBySubBrand(NYEIN_BRAND)` so only ready-made pieces appear
  (five skeleton cards while the catalogue is empty, so the layout still reads as home). The footer shows at every
  width here (`<Footer alwaysVisible />`) because the owner listed its blocks — FB/IG/TikTok/YT, SHOP, HELP, LEGAL,
  NEWSLETTER, KBZPay/Wave Pay/AYA Pay, App Store/Google Play, Visa/Mastercard — as page content, and the home page
  hides the footer below `md`. Verified in Chromium: `/nyein` 200 at 1440 × 900 and 390 × 844, every footer block
  present at both widths, no sideways scroll, console clean; `tests/nyein-page.test.cjs` holds the parity, the
  read-only rules and the footer blocks.
  **Footer fix 2026-11-21 (owner):** the owner kept listing the footer blocks as missing. They were in `Footer.tsx`
  all along; the footer was `hidden md:block`, so a phone hid it. It now shows at every width (with
  `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` to clear `MobileBottomNav`), so `/`, `/nyein` and every other page
  carry FB/IG/TikTok/YT, SHOP, HELP, LEGAL, NEWSLETTER, KBZPay/Wave Pay/AYA Pay, App Store/Google Play and
  Visa/Mastercard at 390 px as well as 1440 px.
  **Buy / Add to Cart 2026-11-21 (owner):** every Nyein box carries Buy and Add to Cart (`NyeinPieceCard`). Eight
  ready-made pieces in `lib/nyein-pieces.ts` stand in until the catalogue carries Nyein rows; add-to-cart and buy
  were both verified in Chromium, and the cart page lists the Nyein line.
  **Guide listing 2026-11-21 (owner):** production showed only guide categories because its `guide_posts` table has
  no published rows. `getGuideCatalog` now falls back to the built-in handbook (12 articles across Editor, Size,
  Product, Design, Payment and Delivery) whenever live posts are empty, and a live post still wins when present.
  **Guide merge 2026-11-21:** the production table is a stale seed (no size guide, no editor guide, plus a retired
  planned-editor-flow page), so the catalogue merges live posts with the handbook gaps. Production serves 12
  articles, all 200.
- `/guide` and `/guide/[slug]` — server-rendered categorized Guide/blog listing and detail pages with Supabase/starter-data fallback, cover images, metadata and readable article layouts.
- `/products/[slug]` — compact marketplace-style product detail with gallery, actual catalog details table, options, reviews, related products and Buy Now/Add to Cart/Edit Design actions.
- `/create` — browser-local Fabric.js editor prototype with responsive desktop/phone workspace, tools, layers, text/elements, Product and separate Mockup controls. No site copyright strip or Footer is shown in this editor workspace.
- `/cart` — client-side cart page with persistent localStorage items, quantity controls, item removal, clear cart, subtotal/total and empty state.
- `/account` — responsive account page with dashboard, profile, orders (the orders this browser actually
  bought), designs, wishlist, points and settings. **Settings carries the password panel (2026-11-21):** the
  customer signs in with the password the owner set and can change it only while signed in (§4.5.9); signed
  out, the change fields do not render. Profile and points stay local until P0-1.
- `/checkout` — address, note and payment method (KBZPay / Wave Pay / AYA Pay / Visa), the terms gate and
  the delivery quote; `placeOrder` writes the order into the admin store with a `checkoutKey` (§16 P0-4).
- `/search?q=` — catalog search over name, line and product type, reached from the desktop field, the tablet
  dropdown and the phone field (§16, P1 item 10).
- `/wishlist` — the browser-saved products, with the snapshot that was saved and its save date.
- `/size-guide` — every Active style that has size-chart numbers, with a cm/in switch.
- Info pages: `/about`, `/faq`, `/shipping`, `/returns`, `/terms`, `/privacy`, `/cookie-policy` (bilingual
  through `lib/storefront-info.ts`) and `/contact`, whose "Send to the shop" writes the Messages inbox.
- `/admin/*` — fifteen modules behind the demo session: `dashboard`, `orders`, `products`, `posts`, `ads`,
  `pricing`, `attributes`, `settlements`, `loyalty`, `customers`, `inventory`, `promotions`, `reports`,
  `messages`, `settings` (§10).
- `/api/*` — `payments/intent`, `payments/status/[ref]`, `payments/webhook/[provider]`, `payments/simulate`,
  `delivery/quote`, `search`, `upload` and the R2 asset route (§12.1).

### 15.2 Global UI decisions that must not regress

- Use full-width layouts with only small responsive gutters; do not reintroduce broad empty side margins.
- Do not add the removed breadcrumbs to the Guide or storefront layouts.
- Preserve the existing Header/Footer text and links unless a later explicit request changes them.
- Desktop Footer is intentionally rendered on Home only; non-Home pages do not duplicate the full Footer.
- The copyright strip is separate from the full Footer and must appear at the very bottom of every non-editor web app view, on phone and desktop, including non-Home pages. `/create` and nested editor routes have no CopyrightBar.
- Canonical placement: mount `CopyrightBar` exactly once from `apps/web/src/app/layout.tsx`, after route content and before the fixed mobile navigation; do not implement it separately in page components or rely on drawer text. `CopyrightBar` returns `null` for `/create` and its nested routes. The root shell uses `min-h-screen flex flex-col`, route content uses `flex-1`, and the strip uses `mt-auto`: short views push it to the viewport bottom, while long views place it after the page content. Keep `pb-16 md:pb-0` on the root shell so the phone strip is not covered by the fixed bottom navigation. The copyright stays in normal document flow, not a fixed overlay.
- The full `Footer` belongs only in `apps/web/src/app/page.tsx` after Home content and remains desktop-only (`hidden md:block`). It must not be mounted from the root layout. Its information/payment panels sit above the separate global copyright strip on Home desktop.
- Phone bottom navigation owns Home, Popular, Create, Cart and Account. Do not duplicate those destinations in the phone side drawer. The drawer uses EN/MM and copyright text instead of a duplicate Account shortcut.
- Desktop Header retains the floating pill, navigation, search, notification, wishlist, $/Ks toggle, theme toggle, Create icon, cart count/box and account icon. Phone header does not show EN/MM; the language switcher belongs in the side drawer.
- English/Myanmar translation is implemented through the locale provider and localStorage persistence. Visible language control is EN/MM, not EN/မြန်မာ.
- Product image areas and complete product card boxes are 1:1 square on phone and desktop. Product cards remain marketplace-style grids: two columns on phone, three on tablet, and wider grids on desktop. Compact mobile typography/padding is intentional.
- Home and other page Hero banners use compact mobile heights (Home approximately 155px; catalog/Guide heroes use the aligned compact mobile rules) while desktop banners remain larger.

### 15.3 Guide-specific decisions

- Guide shortcut cards are compact on phone. `All Guides` is the first fixed card and the remaining categories/Points & Rewards are presented in the same compact row; desktop uses the sidebar navigation and does not duplicate the shortcut row.
- Guide search UI was intentionally removed from both desktop and phone. Category filtering/query support remains in the data layer only if needed for future content management, but the current visible search form must not be restored without an explicit request.
- Guide posts support cover images, categories, detail pages, metadata, starter fallback data, and Supabase published-content reads. Post Admin CRUD/auth remains future work.
- **Guide cards are square product tiles (2026-11-21).** The card is `aspect-square` with the same
  `rounded-xl border bg-bg-surface p-1.5 sm:p-2.5` shell as `ProductCard`, and the grid is the product
  grid (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`). The old cover-plus-excerpt card stood about twice
  as tall as a product tile. Do not reintroduce the `aspect-[1.9/1]` cover band or the excerpt.
- **Nyein sells through the shop's own product box (2026-11-21).** The Nyein page drew a home-made
  `NyeinPieceCard` (its own Buy / Add to Cart pair), so its boxes looked and behaved differently from the
  home page's. Both pages now render `components/ProductStrip.tsx`, which wraps `ProductCard` in the same
  frame: same image area, wishlist heart, price range and one Buy link that opens the product page. The
  Nyein-only card is deleted (`data-nyein-buy` / `data-nyein-cart` are gone). The difference stays where it
  belongs: inside the product page, a Nyein piece has no **Edit design** action (`isDesignEditable` reads
  `subBrand` as well as `isCustomizable`), and its own attributes are what the shopper fills in.
  When the catalogue has no Nyein rows the page still falls back to `NYEIN_PIECES`, whose slugs are not in
  the database, so `ProductCard` gained an optional `href` and the fallback shelf points at `/products`
  instead of opening a 404.
- **The Editor Guide sits in the guide menu box (2026-11-21).** `app/guide/page.tsx` links
  `/guide/editor-guide` from the desktop menu box (a row after the categories, marked `data-guide-editor`)
  and from the phone shortcut row (second chip, so it is visible without scrolling). The HTTP test counts
  only the article grid (`data-guide-editor` anchors are stripped) so the menu link cannot break the
  category-filter assertions.
- **The menu box no longer repeats "Editor Guide" (2026-11-21).** The `editor-guide` category was already
  a row in the menu box, so the extra shortcut row read "Editor Guide" twice (desktop sidebar and phone
  chip), which looks like a bug. That shortcut row is now labelled **Other Guide** in
  `app/guide/page.tsx` (both) and in `app/guide/[slug]/page.tsx`, and it keeps its `data-guide-editor`
  hook. It no longer opens an article (`/guide/editor-guide`): the owner wants every guide row to show
  **posts**, so the row resolves an "other" category from the catalogue (`otherGuide`) and lists its
  posts, falling back to the full post list (`/guide#articles`) when the catalogue has no such category.
  The article page follows the same rule, so a reload of that page lists posts too.
- **The guide filter header has no Clear control (2026-11-21).** The row above the post grid keeps only
  "View All Posts"; the owner did not want a "Clear" link, so do not add it back.
  `tests/guide-card.test.cjs` asserts the row is a listing (never `/guide/editor-guide`) and that no
  "Clear" control is rendered.
- **The guide hero is compact (2026-11-21).** `min-h-[96px]` on a phone, `sm:min-h-[124px]`,
  `lg:min-h-[132px]`, with the heading at `text-lg / sm:text-2xl / lg:text-[26px]`. The 196px desktop
  banner and the 5xl heading are gone; the banner is roughly 200px tall at 1440px wide.
- **The Editor Guide replaced the "planned editor flow" article (2026-11-21).** `editor-guide` is written
  from the editor that ships (print canvas, tools, Layers panel, free transform, mockups, draft save) and
  says plainly that the Save and Buy boxes are not connected yet. A "planned" article cannot sit beside
  the real editor.

### 15.4 Cart and commerce prototype state

- `CartProvider` is mounted at the root and persists `CartItem[]` to localStorage under `mh-fashion-cart-items`, with the legacy count key kept for compatibility.
- Cart actions currently implemented: add item, increment/decrement quantity, remove item, clear cart, item count badge, CartBox preview, full `/cart` page, subtotal/total display and empty state.
- Desktop Header cart icon opens `CartBox`; mobile bottom navigation links to `/cart`.
- Product detail Buy Now adds the product then navigates to `/cart`; Add to Cart stays on the detail page with confirmation state.
- Checkout, payment, delivery fee calculation, discount codes, address autofill, order creation and provider integrations are not implemented yet. The checkout button is a clearly marked UI placeholder and must not be described as a completed payment flow.
- Product-card Buy remains a link to the product detail page, not a direct cart action.

### 15.5 Editor current prototype state and boundaries

- `/create` uses Fabric.js 7.4.0 in the browser with local draft persistence, Front/Back state, Undo/Redo, Save/restore, image import, text presets/font search, original local SVG Elements catalog, responsive rails/flyouts, contextual toolbar, layers management, and separate Product/Mockup selection. Canvas pointer reads use `getScenePoint`; object-level tools were browser-regression-tested after the v7 upgrade.
- Current mockup workspace uses a linked T-Shirt design box and Mockup preview box. The connector dot shows/hides the Mockup box; the preview contains one R2-image placeholder per available side (Front and Back by default, or one supported side). R2 image loading and selected-product side wiring remain pending.
- The Products sidebar/library was removed by request; storefront product catalog/detail routes remain unchanged.
- Object-level editor tools are implemented, but this is not a desktop-editor-equivalent pixel editor. Pixel-level raster masks/merge/eraser, node-level path editing, complete production mockup rendering, account-backed drafts and R2 asset uploads remain deferred.
- Local Elements, fonts and text-style manifests are versioned under `public/`; R2 is explicitly not connected and no credentials/bindings/public bucket should be added until the R2 phase is requested.

### 15.6 Data, deployment and validation record

- Supabase migrations include `0001_initial_schema.sql` through `0007_create_super_admin_roles.sql`; migration 0007 defines the application-role table for Supabase Auth users. This task did not apply any migration. Guide content/cover-image schema is present and public reads use published-content rules with starter fallback.
- GitHub repository is `mhfashion/mhfashion`, working branch and deployment branch are `main`, and production is `https://mhfashion.mhfashionmm.workers.dev`.
- Production deployment is GitHub-to-Cloudflare Workers through OpenNext, driven by `.github/workflows/deploy-cloudflare.yml` (push to `main` or manual dispatch, Node 22). Production commits delivered before the deploy workflow broke include `2b29f96` (Home mobile Hero), `f7ac7f9` (Guide row/search), `2cff8f9` (remove Price Range), `dcb4bb7` (compact product cards), `d3af660` (compact Guide cards), and `0b9e4e3` (cart page/cart box).
- Current repository HEAD was `47e63fb` on `main` before this documentation sync (2026-11-11), and the sync commit `20a210a` follows it. The full range `9cb5e21` → `47e63fb` (Next 16 / Fabric 7 upgrade, restored deploy workflow, related-product styling, Footer and CopyrightBar fixes) is merged but **not deployed**: all eight workflow runs from `42306302512` to `43087062859` failed at `Check required Cloudflare secrets`, reporting `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing.
- The live Worker still serves the pre-upgrade build. Verified from the sandbox on 2026-11-12: every storefront route plus `/cart`, `/account`, `/create` and `/admin/login` returns HTTP 200, and `/admin/register` returns HTTP 404, which places the live build at or after the `0b9e4e3` era but before `9cb5e21`.

### 15.7 Remaining work explicitly recorded

- Complete real checkout/payment/order flow and connect it to the cart UI.
- Add authentication and account-backed design/cart/order persistence.
- Implement secure Post Admin and other admin modules.
- Connect production mockup assets, R2 private asset routes, licensed fonts/text assets and upload flows.
- Finish production-grade pixel editing, real masks/merge, node editing, AI tools and editor automated tests.
- Replace account data with finalized requirements. The Nyein page is built (see `/nyein` above); its
  products still need the Nyein brief and a real catalogue.
- Add final SEO/structured-data, accessibility and phone/desktop visual QA as pages evolve.


### 15.8 Audit follow-up

- The public `apps/web/public/manus-routes.json` has been synchronized with the complete App Router page set: Home, Account, Cart, Collections, Create, Guide, Guide Article, MH Fashion, New, Nyein, Popular and Product detail.
- The Guide HTTP fixture was synchronized with the current UI and catalog output: the visible filter action is `Clear`, the visible search form remains removed, and the current published/starter article title is asserted without requiring the old `Starter handbook` wording.
- Final audit evidence after a clean development-server restart: `npm run test:guide` passed 9/9, `npm run test:guide:http` passed 5/5, `npm run build` passed compile/lint/typecheck/static generation, and `git diff --check` passed. The initial HTTP failures were caused by testing before a server was running and then by a dev server sharing `.next` with a concurrent build; neither represented an application route failure.


### 15.9 Super Admin access hardening

- Public admin registration is closed. The `/admin/register` route and its login-screen link were removed, and the route manifest no longer exposes that page.
- Super Admin promotion is controlled by the Supabase `public.user_roles` table. Only a user created through the Supabase Auth administrator flow should be assigned `role = 'super_admin'`; passwords are never stored in `public` tables.
- The current `/admin/login` and `/admin` UI still use the inherited browser-local demo session and are not yet connected to Supabase Auth/RLS. This is explicitly not production security; the next implementation step is to replace the demo session with Supabase Auth and enforce `public.is_super_admin()` server-side before exposing live admin data.


## 16. Remaining-work register (2026-11-21)

Editor items are excluded by owner decision 1 — the editor is final as built. Priority below is a
proposal, not an approved order.

**The system-level work has its own section:** §19 states the runtime topology, the data model, identity,
configuration, the pipeline, security headers, abuse control, observability and backup as requirements with
acceptance checks. This register owns the work; §19 says what "done" means. Items P0-1, P0-2, P0-3, P1-9,
P1-12 and P1-13 (below) are the ones §19 defines in detail.

### P0 — foundation

1. **Real backend for admin data.** Orders, products, per-size stock, posts, promotions, designs,
   customer accounts, the contact inbox, ads and settings live in browser `localStorage`
   (`mh-fashion-admin-demo-data-v1`). Define Supabase tables and a one-time migration for `orders`,
   `order_items` (spec snapshot, design layout, print position), `products`, `attribute_chain` (the
   price specification chain and its presets), `tshirt_posts` **with its category and bilingual tags**
   (`post_tags`, or a JSONB column), `price_combinations`, `price_history`, `designs`, `promotions`,
   `stock`, `customer_accounts` (hash only, never the plain password), `contact_messages`, `ads` and
   `settings`. Until this lands, two things are preview-only and must be described as such: a customer
   password signs in **only in the browser that set it** (§4.5.9), and a published post is visible only
   in the admin board (P1-11).
2. **Supabase Auth + RLS + server-side role checks**, replacing the demo session (15.9). Module
   permissions must be enforced on the server, not only drawn as checkboxes.
3. **Fix the Cloudflare deploy pipeline** (secrets) and settle the staging question (13, item 2).
4. **Checkout, payment, order creation.** A Payment Provider interface, payment webhooks and
   idempotent order creation (no double charge), with payment status mapped onto order status.
   **Order creation shipped 2026-11-21:** `/checkout` collects the address, a note and the payment
   method (KBZPay / Wave Pay / AYA Pay / Visa — no cash on delivery), and `placeOrder` in
   `lib/checkout.ts` writes the order into the admin store with a `checkoutKey`. The same key returns
   the first order instead of a second one, so a double submit or a refresh cannot charge twice; a
   new order starts at **Pending Payment** and only a payment step moves it to **Confirmed**.
   **Payment provider interface and signed webhook shipped 2026-11-21:** `lib/payments.ts` holds the
   provider registry (KBZPay / Wave Pay / AYA Pay / Visa) with the environment variables each one
   needs, HMAC-SHA256 signing over `${timestamp}.${body}`, a 300-second replay window and
   `applyPaymentEvent`, the single order transition (paid → Confirmed, failed → Cancelled, refunded →
   Refunded; a replay changes nothing, a late event never rewinds a printed order, an amount mismatch
   never confirms). `POST /api/payments/webhook/<provider>` verifies the raw body and records the
   event once; `POST /api/payments/intent` creates the intent and names the missing keys instead of
   pretending a provider ran; `GET /api/payments/status/<ref>` reports it. `confirmPayment` is gone —
   the checkout calls the intent, then reads the status the verified callback left behind.
   **Checkout form fixed 2026-11-22:** an empty form now reports every missing field in one pass;
   the terms gate used to short-circuit the validation, so the customer ticked the box only to learn
   the name, phone and address were blank too. The whole path (seeded cart → order `#MH1101` with a
   `checkoutKey` → Pending Payment → cart emptied → account history) is driven by
   `tests/storefront-e2e.cjs` without a database.
   **Still open:** the provider accounts themselves (the keys above), the delivery fee quote, and
   moving intents from memory to Supabase. `PAYMENTS_ALLOW_MOCK=0` turns the demo provider off.

### P1 — before launch

5. **Delivery fee.** **Quote route shipped 2026-11-25:** `POST /api/delivery/quote` sends the payload
   `delivery.ts` already built to `<MH_DELIVERY_URL>/quote` with `MH_DELIVERY_TOKEN`, and answers
   `{ feeKs, service, etaDays, source, weightGrams }`. `lib/delivery-quote.ts` holds the whole rule: a
   billable weight in whole kilograms from the first one, the shop's own fee table (Yangon 2,500 Ks for
   the first kilogram and 1,000 Ks for each started one, 1–2 days; Mandalay and Nay Pyi Taw 3,500 +
   1,200; everywhere else 4,500 + 1,500; free from 150,000 Ks), and the fallback — a missing endpoint, an
   8-second timeout, a bad status or a body without `feeKs` all answer from the table with `source:
   "table"` and a note naming the reason, so checkout never blocks on the courier. The route is rate
   limited to 30 calls a minute. `tests/delivery-fee.test.cjs` covers the weight bands, every city
   band, the free threshold, the courier's answer (against a real local HTTP server, including the
   `feeKs: "3,200"` string form), the timeout, the 500, the empty body and the fallback note.
   **Still open:** the MH Delivery account and token (the route answers from the table until they are
   set), the confirmed response shape, and the township code question.
6. **Print file quality checks.** **Layer checks shipped 2026-11-21:** `lib/print-quality.ts` reads the
   saved design and reports artwork that cannot print as drawn — a layer past the print area (error;
   rotation is measured on the layer's real corner box) and a sliver of artwork under 3 mm or 0.2 cm²
   (warning). The list reaches the press three ways: a `Quality check` section in the archive README,
   `quality` in `manifest.json`, and a banner on the press sheet; `tests/print-quality.test.cjs` covers
   the geometry, the thresholds and all three outputs.
   **DTF vs Sublimation rules shipped 2026-11-22:** `lib/print-quality.ts` now reads the line's print
   method (`printMethodOf`, case- and space-tolerant) and applies `PRINT_METHOD_RULES`: DTF prints a
   white underlayer and holds a 1 mm edge margin; Sublimation prints **no white ink** (so a white design
   takes the garment colour — a warning that names the fix, "switch the method to DTF") and needs a 3 mm
   edge margin because the dye wicks. `inkIsWhite` reads `#fff`, `white`, `rgb()` and near-white hex
   alike. A layer inside the print area but inside the margin reports `edge-too-tight`; a layer past the
   edge is still the blocking `outside-print-area`, never both. The warnings reach the press the same
   three ways as before (sheet banner, `quality` in the manifest, README lines), and an order whose
   method the shop has not defined keeps only the plain checks; the seeded 26 orders gain no warnings.
   The margins are the shop's **starting defaults**, in one table, pending the press confirming its
   tolerances.
   **Thin-line rule shipped 2026-11-22:** the layer model now carries `strokeWidth` (artwork units), so
   `checkDesignQuality` reports `line-too-thin` when a painted line prints under the method's minimum —
   DTF 0.2 mm, sublimation 0.3 mm, one table with the margins. The editor shows the same number live in
   the Shape panel ("Line is 0.4 mm at print size"), using the strictest minimum until the run is known,
   because the line thins when the layer is scaled down — that is how a hairline reaches the press.
   The seeded orders gained no warning: their backdrop frame is 2 mm.
   **Low-resolution photo warning shipped 2026-11-22:** the press-side rule now exists —
   `layerPhotoPpi` reads a photo layer's own pixels (`pixelWidth`/`pixelHeight`, added to
   `AdminDesignLayer`) over the inches it covers, the lower axis winning, and
   `checkDesignQuality` reports `photo-too-soft` under the method's floor
   (`PRINT_METHOD_RULES.minPhotoPpi`: DTF 150, sublimation 200). An order that does not say how it
   prints is still checked at the DTF floor (`DEFAULT_MIN_PHOTO_PPI`), so a 51 ppi photo cannot pass
   just because the method is blank. The message names the ppi, the printed size and the fix ("use a
   larger image or print it smaller"), and it reaches the press the same three ways as every other
   check. The editor's readout (`editor-image-ppi.ts`, already live on the layer row and in the
   Adjustments panel) now also says what to do: "the press wants 150 ppi, so use a larger image or
   make this one smaller". Verified in Chromium by importing a real 200 × 150 px PNG through the
   Upload section: the layer row showed "17 ppi · very low" and the panel read
   "Print quality: 17 ppi · very low — the press wants 150 ppi, so use a larger image or make this one
   smaller." `tests/print-quality.test.cjs` covers the ppi maths, both method floors, the unknown
   method, the three press outputs and the seeded orders staying clean.
   **Still open:** the editor's Save box is disabled, so no design reaches an order yet; when that
   path lands it must copy `sourceWidth`/`sourceHeight` into the saved layer's
   `pixelWidth`/`pixelHeight`, or the press check stays silent. Also ~~opening the print-size export on a phone~~ —
   **checked 2026-11-22:** the press sheet opens in its own tab on a phone (`window.open` returns a
   window, a real click keeps the popup allowed), carries a viewport meta, a `@media (max-width: 640px)`
   stack and a "Print this sheet" button, and at 390x844 `scrollWidth === clientWidth` (390) with the
   widest element at 378 px, so nothing scrolls sideways. `tests/admin-order-print.test.cjs` now fails
   if any of that disappears.
7. **SVG handling.** Checked 2026-11-21: every uploaded or generated SVG reaches the page through
   `<img src="data:image/svg+xml, ...">` (`post-assets.ts`, `order-print.ts`, `designPreviewSrc`), and a
   script inside an `<img>` cannot run, so nothing needs stripping today. Keep the rule: if an SVG is
   ever inlined (or set through `dangerouslySetInnerHTML`), strip `<script>`, event attributes and
   `javascript:` URLs first. The only unsafe path left is a person opening a downloaded SVG in a
   browser, which is outside the app.
   **The same rule for spreadsheets, fixed 2026-11-22:** the orders and reports CSV exports carry
   customer-typed text (name, email, item names), and a cell starting with `=`, `+`, `-`, `@`, a tab or
   a carriage return is run as a formula by Excel, Numbers and Google Sheets. `lib/admin-csv.ts` now
   prefixes such a text cell with an apostrophe so it opens as text, while a real number (`-5`) and a
   phone number (`+95 9 123 456`) are left readable. Checked in Chromium: an order whose customer name
   is `=HYPERLINK("http://evil.example","Invoice")`, whose email starts with `+cmd|` and whose item is
   `@SUM(1+1)` exports inert, and ordinary rows are unchanged. `tests/admin-csv.test.cjs` covers the
   quoting rules, the inert cells, the numbers that must stay numbers, and the BOM Excel needs.
8. ~~**Design takedown handling** per 8.1~~ — **done 2026-11-21**: Designs → Takedown records the
   claimant and note, hides the design, and leaves paid orders untouched (owner answer).
   **Claim channel built 2026-11-21:** `/contact` (see 8.1) is linked from the Terms, the Guide and
   the footer.
9. ~~**Rate limiting / abuse protection**~~ — **done 2026-11-21**: `lib/rate-limit.ts` is a fixed-window
   limiter held in module memory, and `enforceRateLimit` guards every payment route (`intent`, `status`,
   `simulate`, `webhook`). **Durable counter wired 2026-11-25:** `kvRateLimitStore` already existed; the
   limiter now resolves the Worker's `RATE_LIMIT_KV` namespace itself (`ensureDurableStore`, once per
   isolate) and keeps module memory only when the binding is absent, so the allowance holds across
   isolates as soon as the namespace is created and bound. The upload route (`RATE_LIMITS.upload`, 40 a
   minute) and the new delivery quote route (30 a minute) are guarded too. **Still open:** creating the
   `mh-fashion-rate-limit` KV namespace and uncommenting the binding in `apps/web/wrangler.jsonc`.
10. **Testing.** **Automated coverage shipped:** `checkout`, `payments`, `admin-pricing`,
    `admin-orders`, `order-archive`, `order-qr`, `rate-limit`, `print-quality` and the storefront suites
    run under `node --test`, and `tests/storefront-e2e.cjs` drives the production build over CDP at
    1440x900 and 390x844 with touch. **Still open:** real-device checks on a physical Android and iPhone
    (also editor plan E2), and tests for the admin modules that only exist as demo data.
    **Admin sweep 2026-11-22:** all twelve admin routes (thirteen with Brushes) were loaded at 1440x900 and
    390x844 touch —
    no console error, no sideways scroll, a heading on every page. The sweep found one real defect:
    the Settings form seeded its state from the hydration snapshot (the seed data), so a saved store
    name or USD rate disappeared on reload and the next Save wrote the seed values back over it. The
    form now follows the stored settings until the admin types, and clearing it on save/reset keeps
    "Reset demo data" working.
    **Storefront pages built 2026-11-21:** every footer link resolves — `/about`, `/faq`, `/shipping`,
    `/returns`, `/size-guide`, `/terms`, `/privacy`, `/cookie-policy`, `/products` and `/contact` are
    new pages; `/best-sellers` redirects to the one ranked list at `/popular`.
    `tests/storefront-info.test.cjs` fails if a footer link has no route.
    **Contact inbox built 2026-11-22:** `/contact` no longer only builds a mailto — "Send to the shop"
    records the message in `contactMessages` with a reference (`#MSG-1`), the customer is told where it
    went, and Admin → Messages lists the inbox with New / Read / Answered, a topic filter and a reply
    that quotes the original with the reference in the subject. A claim without the design is refused
    before it is stored, and a claim still points at the takedown flow in Designs. The message is still
    a browser-local record, not email: delivery needs the server side of §12.1.
    **Size charts built 2026-11-22:** `lib/size-chart.ts` stores chest / length / shoulder / sleeve per
    size in centimetres (snapped to the half centimetre a tape reads), `AdminProduct.sizeChart` holds
    it, the Products drawer measures each size, and `/size-guide` lists every Active style that has
    numbers with a cm/in switch. Nothing is seeded: an unmeasured style says so, and the product page's
    Size tab shows the same panel — it reads the chart by product id, so it starts working when the
    catalog and the admin store share ids (P0-1).
    **Search built 2026-11-21:** `/search?q=` queries the catalog through `searchProducts` (name, line
    and product type in one PostgREST `or()`), and the header reaches it from three places — the
    desktop field, the tablet dropdown and the phone field in `MobileNav` (which used to submit to
    `/mh-fashion`). The term is reduced to letters, marks, digits and a few safe symbols before it
    reaches the query, so commas, brackets and `%` cannot rewrite the filter. A Myanmar term keeps its
    combining marks. `tests/search.test.cjs` covers the normaliser, the real query against a stub
    PostgREST server, and the three entry points.
    **Wishlist built 2026-11-21:** the heart on a product card saves the product to
    `mh-fashion-wishlist` in the browser, the header heart links to `/wishlist` with a count badge, and
    the account tab renders the same list. The saved page shows the snapshot that was saved and says so
    — the product page is where the current price lives. Saving is a toggle, a stored entry without an
    id, slug or name is dropped, duplicates collapse and the list stops at 100. `tests/wishlist.test.cjs`
    covers the store, the card, the header, the page and the account tab.
    **Account orders built 2026-11-21:** the Orders tab and the dashboard counter read the orders the
    checkout actually wrote (`checkoutKey` set) and ignore the seeded admin demo orders, so a customer
    sees only what this browser bought. Each order shows its id, Yangon date, stage badge, payment
    method, the print detail of every line and the total. `tests/account-orders.test.cjs` covers the
    filter, the totals, the date formatter and the stage tones. Points and the wallet are still demo
    numbers: they need a ledger in Supabase.
    **SEO structured data built 2026-11-21:** `lib/structured-data.ts` builds Organization and WebSite
    (with the SearchAction for `/search`), Product (an `AggregateOffer` in MMK, because the catalog
    carries a price range), BreadcrumbList, FAQPage and Article nodes; `components/JsonLd.tsx` renders
    them and escapes `<`, `>` and `&` so a product name cannot close the script tag. Absolute URLs only
    appear when `NEXT_PUBLIC_SITE_URL` is set to a clean https origin — nothing is guessed from a
    preview host. `tests/structured-data.test.cjs` covers every node, the escaping and the origin
    policy; the rendered pages were checked in Chromium (4 nodes on a product and a guide article, 3 on
    `/faq`, 2 on the home page, no relative URL, no `undefined`).

11. **A published post reaches no storefront page.** A post is created, given a category and bilingual
    tags, priced, and published in `/admin/posts`; its prices seed the Price Table (§4.5.6) and the board
    groups it by category (§4.5.10). That is where it stops: **no public route reads `tshirtPosts`**, so a
    customer cannot see, buy or search a design from a post, and "Publish" today only changes the admin
    board and the Price Table. Decide the surface (a `/drops` listing, the category pages, or a home
    strip), how a category group becomes a page, and whether the tags become filters — then build it on
    the backend of P0-1. Record the decision here before building, because the page shape decides what
    the post document must carry.

12. **Security headers and a content policy** (§19.6). The site currently sends the platform defaults: no
    `Strict-Transport-Security`, no `X-Content-Type-Options`, no `Referrer-Policy`, no `Permissions-Policy`,
    no `frame-ancestors`, no CSP — there is no `middleware.ts` and `next.config.*` sets only
    `images.remotePatterns`. Add the five headers and a CSP that still lets the canvas work (inline styles,
    `data:`/`blob:` images for every design preview, the Supabase host in `connect-src`, the R2 public host
    when it exists), and a test (`tests/security-headers.test.cjs`) that asks a running server for `/` and
    fails when a header disappears. Check the editor, a product page and `/admin/posts` afterwards at 1440
    and 390, because a CSP that breaks a data-URL preview breaks the whole editor.

13. **Configuration truth** (§19.4). `apps/web/.env.example` names variables the code never reads
    (`MH_DELIVERY_API_URL`, `MH_DELIVERY_API_KEY`, the S3-style `R2_*` quartet, three AI keys) and omits five
    it does (`PAYMENT_WEBHOOK_SECRET`, `PAYMENTS_ALLOW_MOCK`, `NEXT_PUBLIC_MH_DELIVERY_URL`,
    `NEXT_PUBLIC_R2_PUBLIC_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`). Regenerate it from §19.4 and add
    `tests/env-example.test.cjs`, which fails when a name is read by the code but missing from the example, or
    listed there and never read. Also list the Worker secrets (`wrangler secret put`) in the same table, so the
    two lists cannot drift apart again.

### P2 — later

12. **Posts ↔ Product relationship** as a data model (how a T-shirt post relates to
    Product → Style → Color and to fixed-design products). The Nyein brief is still pending.
    **Product posts (2026-11-21):** a post now names one **category** from `POST_CATEGORIES` and the
    product it is sold as, its prices seed that product's variants (§4.5.6), the board groups and filters
    it by category, and it carries bilingual tags (§4.5.10). **Still open:** the Nyein brief itself, the
    storefront surface for a published post (P1-11), and turning tags into storefront filters.
    **The part that does not need the brief shipped 2026-11-22:** a guide post now names the products it
    sells, in the order it mentions them, each with an optional "as shown" note
    (`lib/guide-products.ts`, column `guide_posts.product_links`). The post page shows **Shop this look**
    with a card per product — name, the note (else the catalogue line), the price in the reader's currency
    — and renders **nothing at all** when the post names none or none still exist, so no article changed
    shape. Slugs are tidied and refused if they are really a path (`/products/x`, `two words`), a repeat is
    one card, and the list stops at six. All of a post's products come back in **one** query
    (`getProductsBySlugs`), not one per slug. The admin's Guide posts tab shows each post's links, or "No
    products linked". Verified in Chromium at 1440x900 and 390x844 touch with a probe page of three
    products: 3-up grid on desktop, stacked cards on a phone, 0 px sideways scroll, correct hrefs, and a
    real post with no links renders no section; `tests/guide-products.test.cjs`.
    **Still open, and the reason the brief matters:** a link is currently a *product* only. Style, colour
    and fixed-design variants, and editing the links from the admin (the guide posts come from the
    starter catalogue or Supabase, while the admin Posts module edits a separate demo model) wait for the
    Nyein brief.
13. ~~**Admin modules not yet built:** Brush Management only.~~ **Brush Management shipped 2026-11-22:**
    `/admin/brushes` lists the brushes the editor picker will offer. Each brush carries the id that is also
    its bucket folder (`brushes/<id>/texture.png`, shown on every row because R2 is not connected), a name,
    one of five shelves, a round or square tip, size, spacing, opacity and softness, and an on/off switch;
    the list order is the picker order. An id must be lowercase words joined by -, and it cannot change once
    the brush exists (the texture lives in that folder); a duplicate id, a missing name or a number outside
    its range is refused with the reason, in one pass. A saved brush that cannot be drawn with is dropped on
    read and a missing number takes the editor default. A small SVG sample shows the tip, opacity and
    softness, the table becomes cards on a phone, and delete asks twice. Verified in Chromium at 1440x900
    and 390x844 touch: add, duplicate refusal, switch off, move up, edit (id locked), delete, and 390/390
    with no sideways scroll; `tests/admin-brushes.test.cjs` covers the seed, the read repair, every
    validation rule, upsert/remove/toggle/move and the module registration.
    **Removed 2026-11-21 (owner):** "brushes are things that should work from behind the editor", so the module
    left the dashboard. `/admin/brushes`, `AdminBrushes.tsx`, `lib/admin-brushes.ts`, the `brushes` data in the demo
    store and `tests/admin-brushes.test.cjs` are gone; `tests/brush-home.test.cjs` keeps the dashboard free of it and
    the editor's brush shelf present. The editor's Brush box already owns the whole brush: Tip (round/square), Size,
    Opacity, Softness, Feather, Spacing, Flow, Smoothing, jitter, Angle, blend and seven presets (Hard round, Soft
    round, Spray, Chalk, Marker, Ink, Airbrush), so nothing was lost. Verified in Chromium: `/admin` lists no Brushes
    and `/admin/brushes` returns 404, while the Brush box shows the seven presets, Round pressed and size 52.
    **Pricing Management (web grid + phone cards), Attribute Management, the Delivery Settlement
    Report and Loyalty rules shipped 2026-11-21** (4.5.1, §9, §16); Brush Management stays blocked on
    the editor. `/admin/loyalty` holds the §9 economy (300 daily that expire after 24h, 100 per AI
    image, +50 per purchased piece kept forever, daily spent first), the membership tiers (lifetime
    spend → discount) and the milestone benefits (trigger on pieces, orders or spend). A tier that
    demo customers sit in cannot be deleted, a duplicate tier name or milestone threshold is refused,
    and a "Check a shopper" panel shows the tier, the points and the milestones a basket would earn
    without writing anything. `/admin/jersey` is the §4.4 mapping setup: one worn photo per style plus
    a quad per panel (front left, front right, back required; sleeves and collar optional), edited as
    corner percentages over a garment preview and exported as `mapping_zones.json` for
    `jersey-mockups/<id>/`. The catalog preview and the post-edit mockup read the same zones; R2 is not
    connected, so the photo path is shown instead of an upload.
    The settlement report lives at `/admin/settlements`: period / courier / status / settlement
    filters, fee against courier cost with the margin per row and per courier, "Mark settled" as a
    batch that never overwrites an existing stamp, "Reopen", and a CSV sheet with a total block.
    Returns keep their cost, so a returned parcel shows a negative margin instead of hiding it.
14. **Order operations:** **order QR shipped** — `lib/order-qr.ts` prints a vector QR of the order link
    on the press sheet (`tests/order-qr.test.cjs`). **Reprint flow shipped:** every run of the press
    sheet is recorded on the order (`AdminOrder.reprints`, `recordOrderReprint`), the sheet prints
    "First print" or "Reprint N" with who ran it, and the order drawer shows the count and switches its
    button to "Reprint sheet".
    **Refund requests shipped 2026-11-22:** the customer asks from Account → Order History → "Request a
    refund" on the order itself (`lib/order-refunds.ts`), so the claim sits with the garment instead of a
    second inbox. The reasons are exactly what `/returns` covers — misprint, wrong colour or size we sent,
    damaged, never arrived — and **not** a change of mind, which the form says out loud. An order can ask
    once while a request is open; an unpaid, cancelled or already-refunded order says why it cannot. The
    admin order drawer lists the requests ("1 waiting"), approves or declines, and a decline needs a reply
    the customer then sees under the request. Approving moves the order to `Refunded`, the stage the revenue
    figures already exclude, and records who decided and when. `/returns` now points at the flow. Checked in
    Chromium end to end: request from the account page, the drawer shows it, an empty decline is refused,
    and approving leaves `stage: Refunded` with the decision stamped. `tests/order-refunds.test.cjs` covers
    the reasons against the published policy, the blockers, one-open-request, approve/decline, the queue
    order and the read repair.
    **Barcode shipped 2026-11-22:** the press sheet now carries the order id as **Code 128B** bars beside the
    QR (`lib/order-barcode.ts`), because the packing bench scans with a laser, not a camera. The value is the
    id without its display `#`, the quiet zone is ten modules a side, every bar is one path with
    `crispEdges`, and anything outside printable ASCII is refused rather than mangled. The bars were decoded
    back from their own widths in `tests/order-barcode.test.cjs`, and the rendered sheet was measured in
    Chromium (28 drawn runs, first bar at the quiet zone, total width = modules + both quiet zones).
    If a particular scanner wants another symbology (Code 39, EAN), the encoder is one table away.
15. **Operations:** error monitoring, Supabase backups. **Timestamps are done:** everything is stored
    as UTC ISO strings and every admin screen and printable document shows them in `Asia/Yangon`
    (`YANGON_TIME_ZONE`), so the device clock cannot change an hour or move an order to another day.
    **Error monitoring, first step shipped 2026-11-22:** the site now has its own crash page
    (`app/error.tsx`, and `app/global-error.tsx` for a root-layout failure) instead of Next's bare
    "Application error", and every crash is written to the device that saw it
    (`lib/error-log.ts`, key `mh-fashion-client-error-log`, newest 25, identical message+path collapsed
    into one row). A window listener (`CrashReporter`) catches what a React boundary cannot — a throw
    inside an event handler, which is how "the editor froze" actually arrives — and ignores
    `Script error.` and `ResizeObserver loop` noise. The admin reads it under
    **Settings → Crash log** (`AdminCrashLog`, live via `useSyncExternalStore`, with the stack behind a
    tap and a Clear button). Verified in Chromium: a thrown handler error recorded itself on `/faq`,
    appeared in the open Settings table without a reload, and Clear emptied both the table and the key.
    **Still open:** a *server-side* feed, so a crash on a customer's phone reaches the owner — that needs
    a provider (Sentry or a Supabase table plus an endpoint) and therefore a decision and a key.
16. **Mobile app decision:** PWA first vs React Native. The editor cannot be ported to React
    Native directly, so **the PWA is what shipped 2026-11-22**: `app/manifest.ts` (standalone, 192/512
    icons plus a maskable tile drawn as real PNGs), `public/sw.js`, an install prompt that only appears
    where Chrome offers it (`PwaInstall`), and an offline page. The rule the worker keeps is that a shop
    page may come from the cache but **the editor and the admin never do** (`/admin`, `/create`, `/api`,
    `/auth`, `/checkout`, `/account` go to the network and fall back to the offline page, never to a
    cached copy). Verified in a clean Chromium profile with the HTTP cache disabled and the server
    stopped: an unvisited page, `/create` and `/admin` show "You are offline"; `/faq`, opened online
    first, opens in full; nothing under `/create` is ever written to a cache. `tests/pwa.test.cjs`.
    Still open: an app-store build (Capacitor/Tauri) if the owner wants one, and a push channel.
17. **Customer notification channel** (13, owner decision 5).

**Assumption — Inventory:** the Inventory module (stock per product × size) means **blank garment
stock**. *Owner to confirm; if it means a sellable-quantity cap instead, the stock-decrement rules
change.*

## Security upgrade technical record (pre-push snapshot, 2026-11-11; current deployment status follows)

The web stack is upgraded on this work branch from Next.js 15/Fabric.js 6 to Next.js 16.4.6, React/React DOM 19.3.1, and Fabric.js 7.4.0, while retaining OpenNext Cloudflare 1.20.16 and Wrangler 4.158.0. The Next.js 16 TypeScript setup and ESLint CLI/flat configuration were updated. Fabric pointer reads now use `getScenePoint`; temporary selection overlays preserve their intended `left`/`top` coordinates, and middle-click canvas gestures are explicitly disabled.

Validation passed: Next.js production build and standalone TypeScript check; `npm run test:guide` (9 tests); `npm run test:guide:http` against the production server (5 tests); `npm run cf:build --workspace=apps/web`; and `npx wrangler deploy --dry-run` (about 1.21 MiB gzip). Browser regression added a Starburst and a rectangle through the Shape tool, confirmed object counts 1 → 2, Undo 2 → 1, Redo 1 → 2, verified Save, then cleared the disposable canvas. No Fabric runtime errors were reported. The final route manifest includes `/cart` and excludes the closed `/admin/register` route. Lint exits successfully with compatibility warnings.

The production-only audit is clear: `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` reports zero vulnerabilities. The full tree still reports 4 high and 10 moderate findings in build/lint tooling, including OpenNext's transitive minifier/glob chain and ESLint/TypeScript-ESLint dependencies. No forced audit fix was applied because npm proposes incompatible major downgrades (OpenNext Cloudflare 0.3.0, `eslint-config-next` 15.5.29, or ESLint 9.39.5); full build-toolchain remediation remains open.

The current project plan records production at `https://mhfashion.mhfashionmm.workers.dev`; an unauthenticated `curl` request from the sandbox returned HTTP 200. The upgraded code has not yet been deployed. The latest remote `main` has no deploy workflow, so `.github/workflows/deploy-cloudflare.yml` was restored on `chore/secure-fabric7-next16`. It triggers on app/lockfile changes to `main` or manual dispatch, uses Node 22, and runs production audit, guide unit/HTTP tests, typecheck, Next/OpenNext builds, Wrangler dry-run, then deploys. Secret presence is checked without printing values; the actual Cloudflare token/account ID are scoped only to the main-branch deploy step. The owner reports adding both secrets, but `gh secret list` returns HTTP 403 in this environment; the workflow must confirm access after push.

Latest `main` also closes public `/admin/register` and adds migration `0007_create_super_admin_roles.sql`. This task preserves those changes and does not reopen registration or apply the migration. The admin UI still uses a browser-local demo session, not Supabase Auth/server-side authorization; the real product catalog also remains dependent on Supabase configuration and applied migrations/seeds.



## Cloudflare deployment follow-up (2026-11-12; superseded by "Deployment status" in §14)

Commit `9cb5e21` is now on `main`, and the Cloudflare workflow is active. The base production site, `https://mhfashion.mhfashionmm.workers.dev`, responds with HTTP 200. Both the push-triggered run and its rerun stopped at the safe secret-presence check: GitHub Actions saw `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing. The hosted unit/build/deploy steps did not run, so the upgrade is not yet live; the existing production version remains in service. The CLI cannot inspect repository secret metadata (HTTP 403), and no secret values were read. Add both names under the repository's Settings → Secrets and variables → Actions → Repository secrets, or provide the GitHub Environment name if they were added as environment-scoped secrets, then rerun the workflow. Local audit, typecheck, guide tests, Next build, Worker build and dry-run passed.


## Product detail recommendation card treatment (2026-11-12)

On `/products/[slug]`, each product in “You may also like” now renders with its own outer border, contrasting inset background, padding and visible grid gap. The card treatment is opt-in on `ProductCard`, so other product grids retain their existing appearance. The Next.js production build passed, the existing guide tests passed 9/9, and lint reported zero errors (41 existing compatibility warnings).


The card-source update was pushed as `b6501ef`; its automatic Actions run [#43080318814](https://github.com/mhfashion/mhfashion/actions/runs/43080318814) also stopped at the Cloudflare secret-presence check. Therefore the independent-card styling is available in `main` but is not yet on the live site; production remains on the previous version until Actions can read the required repository secrets and a deployment succeeds.


## Unframed recommendation section refinement (2026-11-12)

Following the supplied Popular Products reference, the shared “You may also like” section no longer has an outer border, surface panel, or inset padding. Its heading and grid sit directly in the page flow; individual product cards retain their own subtle outline and spacing. The Next.js 16 production build passed after the change.


The final no-outer-frame adjustment was pushed as `28867d9`. Its automatic deployment run [#43081587376](https://github.com/mhfashion/mhfashion/actions/runs/43081587376) confirmed the two Cloudflare repository secrets are still unavailable to GitHub Actions and stopped before build/deploy; production has not received this visual correction.


## Footer and copyright placement clarification (2026-11-12)

The requirements are separate: the full links/payment Footer remains on `/` only and is hidden on phones; a compact copyright strip appears at the very bottom of every non-editor web app view, including non-Home routes and phone views. `/create` is an explicit exception and displays neither Footer nor CopyrightBar. `CopyrightBar` is mounted after route content; on Home desktop it follows the full Footer. The full Footer no longer renders its own copyright row, preventing duplication.

### Implementation details and task record

`apps/web/src/components/Footer.tsx` remains the complete brand/navigation/newsletter/payment panel, rendered only by the Home page (`apps/web/src/app/page.tsx`) and hidden below the desktop breakpoint. Its former copyright row was removed. `apps/web/src/components/CopyrightBar.tsx` owns the dynamic-year copyright text and localized rights label; `apps/web/src/app/layout.tsx` mounts it once after route content except when the path is `/create` or nested beneath it. The Home desktop strip removes its extra top border/padding where it follows the full Footer; on Home phones and other non-Home routes it remains the only footer-like strip. The root flex shell keeps the strip at the bottom of short pages and after the content of long pages, with mobile-nav clearance. The editor is intentionally free of any site CopyrightBar.

Work history: the first attempt (`54ee3ed`) incorrectly moved the entire Footer to every route. That was reverted (`0cdcf92`) to honor the Home-only full-Footer rule.

The same mistake came back twice on 2026-11-21: `93d8ffe` mounted the full Footer on `/nyein` as part of "wear the home page's UI", and a later pass mounted it on every shopper route. Both were removed (`434e451` reverts the sweep), and `tests/nyein-page.test.cjs` now fails if any page other than `/` renders `<Footer />`. The final implementation separates the copyright into `CopyrightBar` (`24cb280`); the latest user clarification excludes the `/create` editor from this otherwise global strip. The editor-exclusion correction passed `npm run build` on Next.js 16.4.6 and `git diff --check`, and was pushed as `6de8616`. Actions run [#43087062859](https://github.com/mhfashion/mhfashion/actions/runs/43087062859) stopped at `Check required Cloudflare secrets` before deployment; no secret values were inspected or handled.


## Plan accuracy sync (2026-11-12)

This pass did not change scope or decisions. It corrected places where the plan
described an older state than the repository and the deployed site.

**Sources checked:** `apps/web/package.json` and `package-lock.json` for installed
versions; `apps/web/src/app/**/page.tsx` and `apps/web/public/manus-routes.json`
for the route set; `SQL/` for the migration range;
`.github/workflows/deploy-cloudflare.yml` for the deploy path; `gh run list` and
`gh run view --log-failed` for CI outcomes; and HTTP probes of
`https://mhfashion.mhfashionmm.workers.dev` for what production currently serves.

**What changed**

| Area | Was | Now |
|---|---|---|
| Stack table (§2) | Next.js/Tailwind unversioned, Fabric.js unversioned, backend "NestJS or Express — decided at implementation" | Installed versions recorded; backend described as the Next.js server layer with Supabase clients, since no separate service exists |
| Toolchain (§3) | Next.js 15.5.29 | Next.js 16.4.6, React 19.3.1, Fabric.js 7.4.0, ESLint 10.14.0, Node 22; deploy path described as the committed Actions workflow |
| Editor engine (§6) | "Fabric.js 6 renders browser-side editable objects" | Fabric.js 7.4.0 |
| Admin (§10) | `/admin/login` and `/admin/register` demo pages | `/admin/login` only; public registration closed, no register route |
| Build status (§14) | Everything listed as "Done and live"; migrations `0001`–`0004`; "Next" listed product detail and cart, which already exist | Live build vs. merged-but-undeployed split, migrations `0001`–`0007`, current remaining work |
| Deployment record (§15.6) | HEAD `0b9e4e3`; deployment described as working | HEAD `47e63fb`; range `9cb5e21`→`47e63fb` merged but not deployed; live build identified by route probes |

**What deliberately stayed as written:** the dated snapshots and Change Log
entries keep the versions that were true when they were written, because they are
the audit trail. They are labelled historical where the numbers no longer apply.
`Plan/PLAN.md#legacy-architecture-reference` remains the early draft that section 1 says this plan
supersedes; it was not rewritten.

**Still open after this sync:** the Cloudflare repository secrets
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are not visible to Actions, so
no commit after `9cb5e21` is live; `Plan/PLAN.md#legacy-architecture-reference` still describes the
pre-build architecture; and section 15.8 keeps the test counts from its own run
date rather than tracking the latest build.


- 2026-11-13: Repository audit found that `/create` is a placeholder shell rather than the previously described Fabric.js editor. Updated §6 and §14, corrected the editor implementation baseline below, and added the code-audit remediation list; see `Doc/DOCUMENTATION.md#code-audit`.


---

<a id="unified-editor-vision"></a>
<a id="editor-implementation-plan"></a>
<a id="editor-plan-from-audit"></a>
## Editor plan and specification (moved to Part II of this file)

The editor plan now lives in [Part II of the plan](#part-ii--editor-plan) and the editor behaviour in
[`Doc/EDITOR.md`](../Doc/EDITOR.md). This project plan keeps only the short summary in §6 and the dated
records of what was built; do not add editor detail here. The anchors above are kept so existing links
still resolve.

<a id="legacy-architecture-reference"></a>
## Legacy Architecture Reference (archived from `docs/architecture.md`)

> Historical planning reference retained for traceability. The current architecture and implementation status in the Project Plan and repository take precedence.

Print-on-demand platform. This doc mirrors the full requirements gathered
during planning. Update it as decisions change during development.

## Tech Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS
- Editor engine: Fabric.js (vector + raster hybrid)
- Backend: Node.js (NestJS or Express) — to be decided at implementation time
- Database: PostgreSQL via Supabase
- Storage: Cloudflare R2
- AI: Hugging Face (Remove Background, Upscale — Phase 1); MH Fashion's own GPU
  server via API (AI image generation — later)
- Mobile: React Native (provisional, for code reuse with the web stack)
- Hosting: Cloudflare (Phase 1, flexible later)
- Email: Resend (provisional)

## Dev Workflow
Claude acts as the developer directly (no Cursor). GitHub access is provided
directly to Claude. Cloudflare Worker code and Supabase SQL are written by
Claude; the user deploys/applies them manually with Claude's guidance.

## Product & Attribute System
- Product types: T-shirt, Streetwear, Hoodie, Cup, Phone Cover, Football
  Jersey, and more added over time.
- Attributes are admin-configurable per product type (not hardcoded) via a
  Super Admin "Attribute Management" module: attribute types, their value
  lists, and cascading/filtering rules between them.
- T-shirt/Hoodie/Streetwear final attribute order:
  Product → Print Method (DTF | Sublimation) → Fabric Type (Combed Cotton |
  Compact Combed Cotton | Polyester, flat list) → Knit/Fabric Structure
  (Single Jersey | Interlock | Air Layer) → GSM → Color → Cutting
  ("MH Cuttings") → Size.
- Cascading is sequential along that order — each earlier selection filters
  ALL later attributes' available options, and unavailable combinations are
  fully hidden (not just disabled). Example: Print Method = Sublimation →
  Fabric Type narrows to Polyester only, plus narrows Knit Structure and GSM
  options too.
- Pricing = f(all selected attributes), not flat — admin sets price per
  combination via a Pricing Management module.
- is_customizable has 3 levels: full, none, partial.
- Sub-brands: Sticker (shown as "MH Fashion"), Singular (not customizable),
  Kids, Streetwear, Sport (full — see Jersey below), Accessories.

## Football Jersey (MH Sport)
- Full editing (same Layer/Group editor as T-shirt), not partial.
- Panel-based SVG (front-left, front-right, back, sleeves, collar).
- Catalog Preview is auto-generated (not a separately uploaded PNG) by
  reusing the same panel-to-region mapping needed for Mockup Attach: admin
  sets a worn-jersey mockup photo + mapping zones once, and that's used both
  for the catalog Preview and for the confirmation mockup after editing.
- Mockup Attach is automatic for Jersey (panels have fixed correspondence to
  garment regions) — no manual placement needed, unlike T-shirt.
- MVP uses simple perspective/corner-anchor warp per panel; a
  displacement-map-based warp is a possible later upgrade for full realism.

## Editor
- 4-panel-ish layout: left column combines an icon stack (Upload, Elements,
  Text, Effects, AI) with a desktop-editor-style selectable Tools Palette (Move,
  Marquee, Lasso, Eyedropper, Shape, Pen, Gradient, Eraser, Hand, Zoom, plus
  Path/Direct Selection, Magic Wand, Clone Stamp/Healing Brush,
  Ruler/Measurement, Rotate View); Layers panel on the right (Blend Mode +
  Opacity + Flow in one row, per-layer Lock, New/Duplicate/Merge/Mask/
  Clipping Mask/Effects); Front+Back canvases shown side by side; top bar
  has Undo/Redo, live price, Save/Add to Cart/Buy Now; bottom bar has the
  attribute selectors.
- Original admin-uploaded SVGs are immutable; "Edit Design" creates the
  user's own copy.
- Element panel aggregates all admin SVGs platform-wide, shows only
  pre-rendered raster thumbnails (never raw SVG) for security+performance;
  actual SVG is served via an authenticated endpoint only at insert-time.
- Save limit: 3 designs (admin-configurable), full-flow-completion only.
- Buy Now / Add to Cart disabled until mockup attach is completed.
- Brush assets: single grayscale PNG per brush (same file for stroke
  rendering and thumbnail) in R2 under `brushes/{brush_id}/texture.png`.

## Commerce
- Cart: delivery fee calculated and combined with product total starting
  when an item is added to cart (not just at checkout). Buy Now/Add to Cart
  blocked per-item if that item's mockup isn't attached yet.
- Checkout: address auto-filled from account (single saved address only);
  delivery provider auto-detected by country (MH Delivery domestic, DHL
  international — DHL integration pending their side); payment methods:
  Visa + KBZPay + Wave Pay + AYA Pay; no COD.
- Order Status (MH Fashion's own workflow, not provider-mirrored): Pending
  Payment → Confirmed → Processing → Printing → Ready to Ship → Handed to
  Delivery → Out for Delivery → Delivered (+ Cancelled/Refunded).
- MH Fashion settles delivery fees back to MH Delivery separately (B2B);
  user only ever pays MH Fashion.
- Currency: base price in Ks; Super Admin sets a fixed exchange rate for
  USD display; checkout shows whichever currency the user selected.
- Refunds: MH Fashion production errors only.

## Promotions & Loyalty
- Discount codes: admin-created, type/value/limits/validity/scope.
- Milestone rewards: admin-configurable threshold + trigger type (quantity/
  orders/spend) per rule.
- AI points economy: 300 points auto-granted daily (expires if unused),
  100 points per AI image generation (=3 free/day baseline), +50 points per
  purchase (persistent). Daily points spent first, then purchase points.

## Admin System
- Super Admin: full access, creates all other admin accounts and assigns
  permissions individually per account (module-based checklist: Product Mgmt,
  Order Mgmt, Pricing, Content/Guide, Print/Production, Discount/Loyalty,
  Delivery Settlement).
- Post Admin: Guide (blog) CRUD, categories, SEO fields, publish/draft.
- Print Admin: order queue + detail (attributes + clean SVG + placement
  coordinates), status updates, Jersey mapping setup, mockup uploads,
  Delivery Settlement Report.

## Pages
- Homepage: Header → Hero (doubles as admin ad slot) → Shop-by-category row
  (moderate icon size, scroll/wrap allowed) → per-category product grids →
  Footer (with Copyright, payment icons, About/FAQ links).
- Product Card: image, name, price range (or exact price once a full
  attribute combination is selected on the detail page), wishlist heart.
- Product Detail Page: full attribute selectors, breadcrumb, quantity,
  description, shipping/returns, reviews, related products.
- Cart / Checkout / Account / Category pages per the structure above.

## Visual Direction
- Dark mode is the default theme (light mode available via toggle).
- Reference: a bold/dark streetwear template ("VOID") — neon-lime (#d4ff3f)
  accent color, heavy display typography, dark surfaces (#0d0d0d / #1a1a1a).

## Deferred / Provisional (revisit during development)
- MH Sport template organization — provisionally "Template Category" tags.
- Exact print-area canvas sizes for Cup/Bag/Pillow/Phone Cover (rough
  placeholders in place; T-shirt canvas size also still a rough placeholder,
  exact values to come from the user).
- Payment Gateway and DHL API-level integration detail.
- Legal page content (Myanmar-specific clauses).
- Detailed DB schema (to be defined as tables are actually built).


---

<a id="deployment-notes"></a>
## Deployment Upgrade and Publishing Notes (archived from `docs/PRODUCTION_DEPLOYMENT_NOTES.md`)

> Historical deployment evidence and next steps retained for traceability. Re-check the current workflow, secrets availability, and production state before acting.

## Security reference material

- Fabric.js 7 migration guide: https://fabricjs.com/docs/upgrading/upgrading-to-fabric-70/
- Fabric.js stored-SVG XSS advisory: https://github.com/advisories/GHSA-hfvx-25r5-qc3w
- Fabric.js gradient SVG serialization advisory: https://github.com/advisories/GHSA-w22m-hvvm-xmwx
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
- Next.js security release reference: https://nextjs.org/blog/november-2026-security-release
- OpenNext Cloudflare deployment guide: https://opennext.js.org/cloudflare

Fabric.js 7 changes object-origin defaults and removes legacy Canvas pointer/dimension methods. The project upgrade uses Fabric.js 7.4.0, which includes the cited SVG serialization fixes; app pointer reads use `getScenePoint`, transient overlays preserve their intended `left`/`top` positioning, and middle-click handling is explicit. Next.js 16.4.6 and React/React DOM 19.3.1 build with the updated app type configuration.

## Verified upgrade and regression results (2026-11-11)

- `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` reports zero production vulnerabilities. The complete dependency tree still reports 4 high and 10 moderate build/lint-tool findings; no forced major downgrade was applied.
- `npm run test:guide` passed 9/9. `npm run test:guide:http` passed 5/5 against the production Next server, including SSR, search, 404 behavior, and the synchronized route manifest (`/cart` included, closed `/admin/register` excluded).
- Clean Next.js production build and standalone TypeScript check passed. OpenNext Cloudflare build and Wrangler dry-run passed; Worker bundle was 5,901.89 KiB (1,237.12 KiB gzip). Wrangler reports the configured `compatibility_date` of 2025-04-01 is old and emits non-fatal duplicate-key warnings in generated Fabric/OpenNext output; these remain separate follow-up items.
- Browser regression added a vector SVG element and created a rectangle with the Shape tool, verified object count 1 → 2, Undo 2 → 1 and Redo 1 → 2, confirmed Save, then cleared the disposable test canvas. No Fabric runtime errors were reported.

## Publishing state (updated 2026-11-12)

The existing production site is `https://mhfashion.mhfashionmm.workers.dev`; a `curl` request from this sandbox returned HTTP 200. Commit `9cb5e21` was pushed to `main` with the security upgrade and `.github/workflows/deploy-cloudflare.yml`.

The push-triggered GitHub Actions run and its rerun both stopped in **Check required Cloudflare secrets**. GitHub Actions evaluated both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing (`false`). Therefore Actions did not run its CI/build steps and did not deploy this upgrade. The current production site remains the pre-upgrade version.

Add both values as **repository-level Actions secrets** at `mhfashion/mhfashion` → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**. The names must match exactly: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not send either value in chat. If they were created as Environment secrets instead, tell us the GitHub Environment name so the workflow can reference it. `gh secret list` is unavailable to the current CLI due GitHub API HTTP 403, but the workflow's own safe check verified that Actions cannot currently see these values. Once configured at a scope visible to this workflow, rerun the existing workflow; deploy credentials are passed only to the final main-branch deploy step.

## Current-main application boundary

Latest `main` closes public `/admin/register` and includes `SQL/0007_create_super_admin_roles.sql`. The upgrade preserves that change and does not apply the migration. The admin dashboard still uses its browser-local demo session, not Supabase Auth or server-side authorization. Supabase catalog credentials and migrations/seeds remain unverified, so real product listings are not guaranteed by this upgrade.


---

<a id="historical-todo"></a>
## 17. Search  *(decided 2026-11-23)*

How searching works today, what is wrong with it, and how every search will work. The decisions are the plan
author's, taken on the owner's instruction to decide everything.

### 17.1 What exists (checked in the code, 2026-11-23)

| Where | How it works today | Code |
|---|---|---|
| Storefront `/search?q=` | Server-rendered. `normalizeSearchQuery` keeps letters, combining marks, digits, spaces and `' & . + -`, cuts the text at 60 characters and needs 2 characters. `searchProducts` asks Supabase for `ilike %term%` on `name`, `sub_brand` and `product_type`, ordered by name, at most 40 products, with a price range per product. With no hit the page shows popular products. The header search form goes to this page. | `lib/products.ts`, `app/search/page.tsx`, `components/HeaderActions.tsx` |
| Guide `/guide?q=&category=` | Server-side. The text is normalised and matched with `includes` over each article's searchable fields; it composes with the category filter. | `lib/guides.ts` |
| Editor | In the browser. The Edit sidebar search (Designs, Elements, Photos, Patterns, Text) and the font picker filter their lists with `matchesSearchQuery` from `lib/search-text.ts` (S1, S2, S5), over the name plus the Myanmar name, tags and aliases. | `EditorEditSidebar`, `EditorAdjustmentsPanel`, `lib/search-text.ts` |
| Admin | In the browser, over the demo data. Each list (orders, products, posts, customers, designs, availability, promotions, settlements, the pricing grid, ads, messages) filters one joined text through `matchesSearchQuery`, so the query and the text fold the same way; orders use id, customer, email and more. | `components/admin/*`, `lib/pricing-combinations.ts`, `lib/search-text.ts` |

Verified gaps:
1. Matching is a plain substring and nothing is ranked; the storefront simply orders by name.
2. Every screen has its own text clean-up and none cleans Myanmar text: zero-width characters, the order of
   medial and vowel signs, and look-alike letters are not handled, so two spellings of the same Burmese word may
   not find each other.
3. `/search` finds products only, not guides or designs.
4. A Latin typo finds nothing.
5. A search with no result leaves no trace, so the shop never learns what customers wanted.
6. Admin search runs over demo data in the browser; it will not scale to Supabase.
7. The allow-list in `normalizeSearchQuery` removes `%`, `_` and `,`, which protects the database filter today,
   but the protection is an accident of one regular expression, not a tested rule.

### 17.2 Decisions

| # | Decision |
|---|---|
| S1 | **One shared text normaliser**, `normalizeSearchText`, in `apps/web/src/lib/search-text.ts`, used for the query and for what is searched, everywhere (storefront, guide, editor, admin, the Worker). It applies Unicode NFC, removes zero-width characters (ZWSP, ZWNJ, ZWJ, BOM), collapses spaces, folds Latin letters to lower case, and puts Myanmar medial and vowel signs into their standard order. Zawgyi is not converted (decision D10 in Part II: Unicode only). The fold list for look-alike letters is settled on real shop data and starts empty. The Worker imports the same file by relative path so the rule exists once. |
| S2 | **Matching and ranking.** A Latin query is split on spaces and every word must match as a prefix or a substring. A Myanmar query has no spaces, so it matches as a substring after normalising. Results rank: exact name, then name starts with, then name contains, then other fields; ties break by popularity, then name. Phase 1 fetches up to 80 rows with `ilike` and ranks them in code, returning 40. |
| S3 | **Typo tolerance** comes in phase 3 with the `pg_trgm` extension: a trigram index on the normalised search text and a similarity threshold of about 0.3. Postgres full-text search (`tsvector`) is not used because it has no usable Burmese configuration. |
| S4 | **One search column.** Each searchable record (products, posts, designs, guides) gets a normalised `search_text` made from its names in English and in Myanmar, aliases, tags, brand and type, so a customer finds it in either language. The text is built when the record is written, and that column is what `ilike` and the trigram index read. The migration is a numbered file in `SQL/`. |
| S5 | **Where filtering runs is decided by size, not by screen.** A list that comes from the database or may exceed about 200 rows is filtered in SQL (products, posts, orders, customers, designs). A small list already in memory is filtered in the browser (the editor's font, design, element, photo, pattern, text-style and brush libraries, and the pricing grid). The editor libraries search the catalogue JSON that the asset Worker returns (section 12.1), over name, tags, shelf, scripts and aliases, using S1. |
| S6 | **The storefront search page is grouped:** Products (default), Guides and Designs, each with a count and a cap (products 40, guides 10, designs 12), as tabs on a phone, with `?q=` and `?type=` in the address. The header search shows up to 5 suggestions while typing, after a 200 ms pause, and announces the count. |
| S7 | **Interface rules.** `type="search"` inside `role="search"`, labelled in English and Myanmar; at least 2 characters after normalising, at most 60; Esc clears; the typed text stays after an error; the empty state offers popular products and a clear button; 44 px targets on a phone; the result count is announced to screen readers. |
| S8 | **Misses are recorded.** When a storefront search returns nothing, the normalised query is counted in a table `search_misses` (no user id, no address), kept 90 days, and the admin shows the top misses each week. |
| S9 | **Admin search** uses S1 and adds fields: orders also search phone, township, tracking number and payment reference; customers search phone. When the data comes from Supabase it is filtered in SQL and paged 50 at a time. |
| S10 | **Database filter safety.** User text never goes into a filter string unescaped: each column is matched with its own parameterised `ilike`, `%` and `_` are escaped explicitly, and a test feeds `,` `(` `)` `.` `%` `_` `*` and `\`. |

### 17.3 Rollout

1. ~~`search-text.ts` with its tests, and every existing search moved onto it.~~ **Done 2026-11-21:**
   `apps/web/src/lib/search-text.ts` (`normalizeSearchText`, `searchWords`, `matchesSearchQuery`) and
   `tests/search-text.test.cjs` (8 tests). The Edit sidebar's five lists, the font picker, the storefront's
   `normalizeSearchQuery` (now folded by the same normaliser before its allow-list), the guide search and all
   eleven admin screens use it. The guide keeps phrase matching on purpose: a guide is long prose, and word-wise
   matching would let any two common words pull in every article. Verified in Chromium at 1440 × 900: `street`
   finds 2 photos, `street portrait` finds 1, `street hoodie` finds none and shows the empty note.
2. ~~Ranking and the `search_text` columns (a `SQL/` migration).~~ **Done 2026-11-21:**
   `SQL/0009_search_text.sql` adds `public.normalize_search_text(text)` (the same fold as the app, in SQL),
   `search_text` on `products` and `guide_posts`, the `name_my` / `aliases` / `tags` columns a Myanmar name needs,
   `before insert or update` triggers that rebuild the column, a backfill and a `text_pattern_ops` index.
   `apps/web/src/lib/search-rank.ts` ranks exact name → name prefix → name contains → other field, ties break by
   popularity then name. `searchProducts` now fetches up to 80 rows with `ilike` on `search_text`, ranks them in
   code and returns 40; a shop that has not run the migration yet falls back to the three old columns, so the
   storefront keeps working between the deploy and the migration. Verified against a real Postgres 17 with every
   earlier migration applied (`tests/search-sql.test.cjs`, skipped unless `SEARCH_SQL_TEST_URL` is set).
3. ~~`pg_trgm` typo tolerance.~~ **Done 2026-11-21:**
   `SQL/0010_search_trigram.sql` installs `pg_trgm`, adds a GIN trigram index on both `search_text` columns and
   the `public.search_products_fuzzy(p_term, p_limit)` function the app calls when the exact search found
   nothing. It compares the term with the best matching *word* (`word_similarity`, `<%`) at a threshold of 0.4:
   `similarity()` against a whole column diluted "buterfly" to 0.16, while the word form scores 0.73. The ranked
   answer keeps those rows last (`SEARCH_RANK_APPROXIMATE`), and the page says they are close matches. Verified
   in PostgreSQL 17: `buterfly` → Butterfly Effect, `yangn street` → Yangon Street Tee, nonsense and two-letter
   terms find nothing, and `explain` shows the GIN index answering the filter.
4. ~~The grouped `/search` page, the header suggestions and the `search_misses` table.~~ **Done 2026-11-21:**
   `apps/web/src/lib/search-caps.ts` holds the caps (products 40, guides 10, designs 12) and the `?type=` rules;
   the page renders three `role="tab"` groups with their counts, keeps `?q=`/`?type=` in the address, shows
   guides as article cards and the editor's design templates as a third group, and falls back to products for an
   unknown `type`. The header suggests while typing: `/api/search/suggest` answers with at most five rows
   (3 products, 1 guide, 1 design) after a 200 ms pause, the count is announced through `aria-live`, and the
   panel is wired into all three header fields (desktop inline, compact popover, phone drawer). A search that
   finds nothing calls `record_search_miss` (`SQL/0011_search_misses.sql`): the folded term and a count, no
   user, dropped after 90 days. The admin dashboard reads the week's misses through
   `/api/admin/search-misses`, which needs `SUPABASE_SERVICE_ROLE_KEY` because `top_search_misses` is granted to
   `service_role` only.
5. ~~Admin search, with paging.~~ **Done 2026-11-21:** the admin lists search the handles a desk actually
   holds — an order by number, buyer, phone, delivery name/phone/address/township/city, stage, payment method,
   payment reference, tracking number, print-desk note and items; a customer by name, email and phone.
   `matchesSearchQuery` now compares a second time with every space removed, so a phone typed as `09771234567`
   finds `09 771 234 567`. Orders and customers render 50 rows at a time with a "Show N more" footer, and a new
   search or sort starts the list over at 50. The order drawer gained the tracking number and payment reference
   (both saved to the order and searched). The lists still read the browser demo store, not Supabase — the
   filtering and paging live in `lib/admin-order-search.ts`, so moving them to SQL later is a swap of that one
   module plus the query.

6. ~~The interface rules (S7) and filter safety (S10).~~ **Done 2026-11-21:** the search screen reads its
   labels from the dictionary — `components/T.tsx` renders a translated label inside the server-rendered page,
   `SearchField` owns the `type="search"` input (Esc clears it without submitting the old term) and `SearchTabs`
   owns the three tabs and the group-empty note, so English and Myanmar both read as whole sentences with the
   term substituted. `escapeLikePattern` / `likePattern` in `search-text.ts` escape `%`, `_` and `\` before any
   `ilike`, so a typed wildcard cannot widen the pattern. Two typography fixes came out of the phone
   screenshots: the font stack names each platform's Myanmar face (`Noto Sans Myanmar`, `Myanmar Sangam MN`,
   `Myanmar Text`, `Padauk`, `Pyidaungsu`), and `html[lang="my"]` raises the line box to 2.1 because Noto Sans
   Myanmar reports a 2.17em line box against Latin's 1.42em — at 1.6 two Burmese lines ran into each other.
   `tests/myanmar-typography.test.cjs` keeps both. The dictionary is now complete: the last 38 labels (nav,
   footer, account, editor and guide) are translated and the test refuses any label that is missing or still
   carries its English text, so a new screen cannot ship half-translated. The account settings panel also read
   its four sentences from hard-coded English while the dictionary already held them; it now reads `t()`.

### 17.4 Acceptance

- Two spellings of the same Burmese word (with and without a zero-width character, with the medial signs in a
  different order) return the same results. *(Both halves are tested: `tests/search-text.test.cjs` folds the
  query, and `tests/search-sql.test.cjs` finds the row through `search_text` with a zero-width character in the
  query.)*
- The Burmese test strings မြန်မာ, ကြောင်, ပြည်ထောင်စု and သင်္ကြန် each find their record by a part of the word.
  *(Tested in `tests/search-sql.test.cjs` against Postgres 17: `မြန်`, `ကြော`, `ထောင်` and the full `သင်္ကြန်`
  each return only their own row, stacked consonants included.)*
- An English name and its Myanmar name find the same record. *(Same test: `papillon` and `လိပ်` both return
  `papillon-tee`.)*
- A one-letter Latin typo finds the product: `buterfly` returns Butterfly Effect through
  `search_products_fuzzy` (`tests/search-sql.test.cjs`), and the page says they are close matches.
- Exact name matches come before partial ones.
- The filter-safety test passes with every special character in the list.
- Every search works at 1440 × 900 and 390 × 844, in English and Myanmar, in dark and light. *(Driven over CDP
  in Chromium at both sizes: the title, the count sentence, the tab labels, the field's label and placeholder,
  the empty states and the group-empty note all switch language and theme, nothing overflows sideways, and the
  phone's three tabs wrap onto two rows instead of scrolling off the edge.)*

**Depends on:** decision D10 (Unicode only); the asset Worker for the editor catalogues (section 12.1); and a `SQL/`
migration for `search_text` and `search_misses`.

## Historical TODO Register (migrated from `TODO.md`)

> This is a dated task-history snapshot preserved verbatim except that plan links now point to this master file. Confirm status against the current Project Plan and code before acting on any unchecked historical item. New backlog entries belong in the current Project Plan, not in a separate TODO file.

# Guide page implementation

Source of scope: `Plan/PLAN.md#project-plan` sections 1, 3, 7, 10 and 11.

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

Source of scope: `Plan/PLAN.md#project-plan` section 6.

- [x] template-inspired Elements library for `/create`
  - Browse original SVG graphics by category and search by names or tags.
  - Choose a color, click a graphic to add it centered on the active canvas, or drag it onto a placement point.
  - Added graphics become individual editable layers and remain in the browser-local draft.
  - Keep the local manifest and SVGs under `apps/web/public/elements/v1/`; include future R2 keys in the manifest, but do not connect, create, expose, or upload to R2 until requested.
  - Evidence: 25 original SVG catalog items are present; manifest paths and future R2 keys match; all SVGs parse; category/search, color, click, canvas-drop and Recent flows are implemented; production build passes.
- [ ] Future R2 migration (explicitly deferred)
  - Later move `elements/v1/manifest.json` and `elements/v1/{slug}.svg` to the private `mh-fashion-assets` bucket and serve them through same-origin editor API routes.

## template-style Text tools

Source of scope: `Plan/PLAN.md#project-plan` section 6.

- [x] template-like text insertion and typography controls in `/create`
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

Source of scope: `Plan/PLAN.md#project-plan` section 6 and the `/create` toolbar.

- [x] Make every toolbar tool besides Move perform a useful action on `/create`
  - Marquee drag-selects multiple objects; Lasso draws a freeform outline and selects enclosed object centers; Magic Wand selects vector/text objects whose fill colors match the sampled target within an adjustable tolerance, while a raster-image click selects that entire image and reports that pixel-level selection is unavailable; Path Select selects and moves an entire Pen path.
  - Eyedropper samples the visible canvas pixel into the current tool color. Shape drag-creates the chosen editable shape; Pen draws editable freehand vector strokes with configurable color/width; Gradient drag-creates a gradient rectangle or applies an editable linear fill to eligible text/vector objects.
  - Clone Stamp duplicates the selected or clicked unlocked source object at the stamp point and remains undoable; it refuses sources locked directly or by a parent group. Eraser removes the clicked whole artwork object while leaving its layer row empty and usable (pixel-level erasing is not included).
  - Ruler drag displays a transient pixel-distance and angle measurement. Rotate View drag rotates the canvas view without changing artwork; Reset View restores orientation/zoom. Hand pans; Zoom click magnifies and Shift-click reduces, with existing zoom buttons retained.
  - Show tool-specific cursor/status/options; keep added design changes in layers/history/drafts and keep navigation/measurement overlays out of saved artwork. Document the vector/object-level limits rather than claiming raster behavior.
- Evidence: `npm run build` passed; no inactive-tool placeholder messages remain; a read-only review found no P0/P1 issues. The review's Clone Stamp lock gap and Magic Wand raster-status ambiguity were corrected. Ruler visuals are transient overlays and are not included in saved marks/history; pixel-level raster selection/erasing and path-anchor editing remain out of scope.

## Cloudflare Worker build compatibility

Source of scope: Cloudflare's Workers Build check rejected the previous Next.js version before compiling the application.

- [x] Upgrade Next.js to the patched 15.5.29 release, OpenNext Cloudflare to 1.20.16, and Wrangler to 4.158.0; keep the application on Next.js 15.
- [x] Update the lockfile and verify a clean install produces the same Cloudflare build.
- Evidence: `npm ci --no-audit --no-fund`, `npm run cf:build --workspace=apps/web`, `npm run build`, and `npm run test:guide` pass; no unsupported-version bypass flag is used. The existing compatibility-date warning is unchanged.

## template-style workspace and selection toolbar

Source of scope: owner request to remove the dark desktop-editor-like backing from the drawing area and make the red-circled bar work like the template editor.

- [historical; superseded by §6 owner-specified fixed print canvas] The prior editor iteration used a white artboard and an optional transparency grid. The current blank preview uses a transparent canvas buffer with a presentation-only checkerboard.
- [x] Make the selection bar contextual: text exposes font, size, color, emphasis, and alignment; shapes expose type and fill; selected artwork exposes duplicate/delete actions.
- [x] Remove developer-facing canvas-engine labeling from the drawing workspace footer.
- Evidence: production build and TypeScript checks pass; selected artwork edits route through the existing history-backed update callback.

## Persistent desktop-editor-style Layers Box

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
- [x] (2026-11-21) The remaining modules — Orders, Products, Inventory, Customers, Designs, Promotions, Reports and Settings — are implemented as separate `/admin/*` pages over one browser-local demo store. See "2026-11-21 Implementation Update — Super Admin modules" at the end of this plan.

## Permanent website publishing (historical snapshot, 2026-11-10; superseded by the current status below)

- [x] Install dependencies with `npm ci` from the committed root lockfile and build the Cloudflare Worker with `npm run cf:build --workspace=apps/web` (Next.js 15.5.29, OpenNext Cloudflare 1.20.16).
- [x] Validate the generated Worker with `npx wrangler deploy --dry-run` (about 1.16 MiB gzip) and local Cloudflare preview: `/`, `/admin/login`, `/admin/register`, `/admin`, and `/manus-routes.json` returned HTTP 200 with Supabase keys absent.
- [x] Make the public catalog loader return an empty result rather than throwing when Supabase URL/key are not configured; the storefront already displays “Products will appear here soon.”
- [ ] Deploy is blocked until Cloudflare credentials are available and a deploy trigger is configured: the previous GitHub Actions deploy run failed at the required-secret check for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`; no deploy workflow is present on current `main`, and this environment's Wrangler is unauthenticated.
- [ ] Connect Supabase and run the project migrations/seeds to show real products. Until then the storefront shell works, but catalog sections stay empty.
- [x] Resolve production dependency security advisories before public launch. **Done 2026-11-22:** the breaking upgrades were taken — `next` 16.4.6 and `fabric` 7.4.0 — and `npm audit --workspace=apps/web --omit=dev` now reports **0 vulnerabilities**, so the Fabric SVG-export XSS and the `tar` advisory are gone from what ships. Re-run that command before any release; it is the check that decides this item.
- Evidence: OpenNext worker build and Wrangler dry-run passed after clean lockfile install; local Worker preview returned 200 on all listed routes. Production publication has not yet occurred.


## Security-upgrade validation (pre-push snapshot, 2026-11-11; rollout status follows)

- [x] Upgrade the web stack to Next.js 16.4.6, React/React DOM 19.3.1, Fabric.js 7.4.0, OpenNext Cloudflare 1.20.16, and Wrangler 4.158.0; update the Next.js 16 TypeScript and ESLint configuration/commands.
- [x] Migrate canvas pointer reads to Fabric 7 `getScenePoint`, preserve left/top positioning for temporary selection overlays, and disable middle-click canvas gestures explicitly.
- [x] Regression-test the editor in browser: add an SVG Starburst, create a rectangle with the Shape tool, confirm object counts 1 → 2, Undo 2 → 1, Redo 1 → 2, verify Save confirmation, then clear the disposable design. No Fabric runtime errors were reported.
- [x] Run `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` (zero production advisories), `npm run test:guide` (9/9), Next.js production build, standalone TypeScript check, `npm run test:guide:http` against the production server (5/5, including `/cart` in the route manifest), `npm run cf:build --workspace=apps/web`, and `npx wrangler deploy --dry-run` (about 1.21 MiB gzip). Lint exits successfully with 41 compatibility warnings.
- [ ] Resolve full-tree build/lint-tool advisories before treating the entire dependency tree as clean. Re-checked 2026-11-22: `npm audit` reports **13 findings (4 high, 9 moderate)**, all in dev/lint tooling — `eslint` (which depends on a vulnerable `minimatch`), `@typescript-eslint/*`, and their transitive `brace-expansion`/`micromatch` chain. Nothing there ships: the production audit above is clean. `npm audit fix` has no non-breaking route (the reported fix jumps to `eslint` 10.14.0 and `@typescript-eslint` 8.x majors), and `--force` proposes the same majors, so no forced upgrade was applied. It stays open until the lint stack can move together.
- [x] Add `.github/workflows/deploy-cloudflare.yml` for main pushes and manual dispatch, with Node 22, unit and production HTTP tests, production audit, typecheck, Next/OpenNext build, Wrangler dry-run, and deploy. Secret presence is checked without displaying values; actual Cloudflare credentials are scoped to the main-branch deploy step only.
- [ ] Push the workflow and upgrade to `main`, then verify the GitHub Actions run against the existing production URL, `https://mhfashion.mhfashionmm.workers.dev`. The base site is live (`curl` returned HTTP 200), but this upgrade has not deployed. Current `main` has no workflow; the new workflow remains on this branch. The owner reports adding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, but `gh secret list` returns HTTP 403, so the workflow's own check must establish their availability.
- [ ] Connect Supabase and apply catalog migrations/seeds before claiming real product listings; until then the storefront shows its empty-catalog state.
- Evidence: final Next.js and Cloudflare builds, dry-run, 9 unit tests, and 5 production HTTP tests passed. The existing public homepage returned HTTP 200 via curl; the security upgrade still awaits deployment.


## Cloudflare deployment follow-up (2026-11-12; superseded by "Deployment status" in §14)

- [x] Push the security-upgrade code and Cloudflare deployment workflow to `main` as commit `9cb5e21`.
- [x] Recheck the production workflow after the owner reported adding secrets. The push-triggered run and its rerun both stopped before CI at the required-secret check; GitHub Actions evaluated `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing. The existing production site remains reachable, but the upgrade was not deployed.
- [ ] Add those exact names as repository-level Actions secrets in `mhfashion/mhfashion` → Settings → Secrets and variables → Actions → Repository secrets. If stored as Environment secrets, identify the Environment name so the workflow can reference it. Never send secret values in chat.
- [ ] After GitHub exposes both values to Actions, rerun the workflow and verify its CI checks, Cloudflare deploy, and the public Worker response.
- Evidence: workflow run [#42882789084](https://github.com/mhfashion/mhfashion/actions/runs/42882789084), attempt 2, stopped at the secret-presence step; no GitHub-hosted tests/build/deploy ran. Local production audit, tests, typecheck, Next/OpenNext builds, Wrangler dry-run, and editor browser regressions passed.


## Product detail recommendations (2026-11-12)

- [x] On `/products/[slug]`, keep each item under “You may also like” in its own visible card with an independent outline, inset spacing, and separation from neighboring items. Preserve the shared recommendation section and leave other product grids unchanged.
- Evidence: Next.js 16 production build passed; `npm run test:guide` passed 9/9; lint exited with 0 errors and 41 existing warnings; `git diff --check` passed.


## Card update publishing status (2026-11-12)

The recommendation-card fix is on `main` as `b6501ef`. GitHub Actions run [#43080318814](https://github.com/mhfashion/mhfashion/actions/runs/43080318814) again stopped at the required-secret gate: both Cloudflare secrets were unavailable to the workflow. Production continues to return HTTP 200 but still serves the prior version. The fix will become live only after the secrets are added at the repository Actions scope and the deployment workflow passes.


## Unframed recommendations section (2026-11-12)

- [x] Match the supplied Popular Products reference: “You may also like” itself has no surrounding border, surface panel, or inset padding; the heading sits above separate recommendation cards, each retaining its own subtle border and gap.
- Evidence: Next.js 16 production build passed and `git diff --check` passed.


## Latest unframed-section publication result (2026-11-12)

The no-outer-frame correction is on `main` as `28867d9`. Its deployment run [#43081587376](https://github.com/mhfashion/mhfashion/actions/runs/43081587376) again found `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` unavailable and stopped before build/deploy. The live page is therefore unchanged until those secrets are available to the workflow.


---

## Master Plan Update Log

- 2026-11-13: Consolidated all existing project/editor plans, editor vision, deployment notes, legacy architecture draft, and task register into this file. Added the owner directive requiring Web/Desktop and Phone/Mobile UI/UX planning and acceptance together.
- 2026-11-13: Corrected the editor implementation status after the source audit and linked the verified remediation backlog to `Doc/DOCUMENTATION.md#code-audit`.
- 2026-11-13: Recorded the owner instruction to commit and push requested repository changes directly to `main` after validation, without reconfirmation or a compare/pull-request workflow unless explicitly requested.
- 2026-11-13: Consolidated the work log, code audit, Guide content runbook, and Admin Dashboard reference notes into `Doc/DOCUMENTATION.md`; obsolete docs-directory copies were retired after confirming no code references.
- 2026-11-13: Added the owner-requested first usable editor scope for shared Web/Desktop and Phone/Mobile behavior, correcting E0 to build the verified-missing canvas/document model and explicitly remove mobile navigation spacing from `/create`.
- 2026-11-13: At the owner's request, reverted editor commits `4ccc60a` and `a571080` and restored `/create` to its pre-editor shell at `007f286`. The editor scope remains a forward plan only; implementation claims were rolled back and validation results were recorded in `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-13: Production still serves the prior `/create` build. The rollback's GitHub Actions run failed before deployment because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are unavailable; deploy only after authorized credentials are configured. See `Doc/DOCUMENTATION.md#work-log`.

- 2026-11-13: Implemented the website-wide browser zoom shortcut/wheel guard and suppressed page context menus per owner request; preserved mobile pinch zoom and unrelated keyboard shortcuts. Added regression coverage and CI execution. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-13: Updated only the `/create` canvas shell to a blank fixed 4500×5400 px transparent PNG-target preview, with 300-DPI target metadata, no T-Shirt placeholder, and a presentation-only transparency checkerboard. PNG export and embedded DPI metadata remain future work. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-14: Owner instructed that Editor implementation follow direct user directions rather than infer work from the Plan. Updated the existing canvas shell so Front and Back Mockup boxes and artwork previews are the same size; this Plan now records the requested behavior. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-14: At the owner's next direct instruction, made the complete mirrored stroke overlay independently movable and resizable on each Front/Back Mockup, without altering the source Canvas strokes or outer Mockup boxes. Added interaction regression coverage and recorded transient-state limits. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-14: Initially implemented fixed Front 3500 px and Back 1500 px artwork caps. This side assignment is historical and was superseded by the owner's later clarification that the large tier must be transferable. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-14: Recorded and implemented the owner's corrected one-large/one-small rule: whichever mockup claims the provisional 3500 px tier leaves the other capped at 1500 px. The large tier is not reserved for Front. Regression tests verify transfer, release, and either-side ownership; see `Doc/DOCUMENTATION.md#work-log`.

- 2026-11-16: Following the owner's direct request, expanded Text Adjustments to a configurable, reorderable SVG effect stack (Shadow, Outline, Glow, Offset, Echo, Extrude, Stripe) with live shared canvas/mockup rendering, while preserving existing legacy Shadow/Outline text data. Removed the Text button and direct canvas-click insertion route from the bottom Tools bar; Edit sidebar `Add Text` remains the insertion path. Added Phone/Mobile-safe controls and regression checks. This current implementation supersedes the historical 2026-11-15 instruction that the bottom Text tool should insert at the clicked canvas position. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-16: Following the owner's direct Header Bar 2 request, made Product/GSM/Color/Size/Save/Buy controls consistent fully rounded 80×32px desktop and 80×44px touch boxes; retained T-Shirt and 160 GSM defaults, set Size to XL, added theme-token color swatches, hid field labels and the price text on phone layouts, and added the desktop `Price —` placeholder beside Save. Save/Buy remain disabled until their services exist. Build, 44 Node tests, lint, and focused Header Bar 2 desktop/phone CDP checks passed; broader old Editor browser assertions remain untouched because they target the unrelated Sidebar. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-17: Applied the owner's Header Bar 2 correction: `Price —` is immediately left of Save; all six Product/GSM/Color/Size/Save/Buy boxes have the same fully rounded green `bg-accent` fill and desktop/touch dimensions; Color is a selected-swatch/down-chevron trigger with a fully rounded green Background/Surface/Accent dropdown. On merged `main`, build passed; lint had 0 errors / 25 warnings; 55 Node tests and 16 canvas-shell contracts passed, along with focused post-merge desktop/phone CDP checks. The broader legacy Editor CDP run stops after the H2 checks at its unrelated Edit sidebar selector, which was left untouched. See `Doc/DOCUMENTATION.md#work-log`.
- 2026-11-18: Applied the owner's Header Bar 2 follow-up. The opened dropdown is now a `rounded-2xl` green panel sized to the box it opens from (80px wide, not the old 176px overlay; option rows use the box height) with `rounded-full` options, and the sides are rounded instead of `rounded-full` clamping the tall menu into a capsule. Every field box pins its chevron to the right edge (`right-1.5`, vertically centred) so the arrow sits in the same place on Product, GSM, Color, and Size, and the Color swatch is a 20×20px rounded square rather than a small dot. The unit and integration tests assert the rounded panel, the box-width menu, the uniform chevron position, and the box-shaped swatch. Build, TypeScript, lint (0 errors / 25 warnings), 61/61 Node tests, and focused production Chromium at desktop 1280×900 and phone 390×844 passed. See `Doc/DOCUMENTATION.md#work-log`.


- 2026-11-16: Following the owner's direct request, expanded the Pen tool into a reference-inspired Bézier workflow: click/drag nodes, Shift snapping, close/finish/cancel controls, persisted editable anchor metadata, double-click node editing, segment insertion, handle dragging, and node deletion. Updated the Pen behavior section to distinguish shipped behavior from remaining snapping/style scope. Added geometry/model/UI regression tests; production build and focused tests passed. See `Doc/DOCUMENTATION.md#work-log`.

## 2026-11-17 Directive Update — Tools Bar first

Pause unfinished Subpath/Node Editing, Fill/Stroke properties, and Bézier-handle work. Finalize the visible Tools Bar structure first: Move, Hand tool, Pan tool, Pen tool, Brush, Eraser tool, Shape tools, Gradient tool, Color switch tool, Undo, and Redo. Implement each tool one at a time only after this structure is accepted. Keep the Pen direction desktop-editor-inspired and do not modify the Layer Box.

## 2026-11-17 Directive Update — Free Transform visual language

Keep the existing Free Transform behavior, but make its visual treatment reference-inspired: a thin selection line, compact resize handles, and a small rotation control using MH Fashion theme colors instead of blue. Preserve all eight resize points, rotation, move behavior, and separate touch hit areas for Phone/Mobile.

## 2026-11-17 Directive Update — Pen icon and selected-tool cursor

Use a desktop-editor-style pen-nib icon for Pen, based on the owner's reference. When a tool is selected, keep the Canvas cursor in that tool's own form instead of always showing a Hand/grab cursor: Pen/Brush crosshair, Eraser cell, Shape/Gradient crosshair, Move move-cursor, and Hand/Pan grab-cursor.

## 2026-11-17 Directive Update — Pencil/ Pen distinction and Text tool

The former `Pan` label was incorrect. It means **Pencil tool**, which must remain separate from the vector **Pen tool**. Give Pencil its own Pencil icon, label, cursor, and freehand drawing behavior; keep Pen as the nib/path tool. Add a visible Text tool to the Tools Bar. Selecting Text and clicking the canvas must create a text layer and enter the direct typing workflow. Hand alone owns viewport-pan behavior.

## 2026-11-17 Directive Update — blue rotating Free Transform

Make Free Transform thinner and reference-like with a blue outline and rotation control. When the selected layer rotates, the entire Free Transform control group must rotate with it. Display the current rotation degree in a small live label near the rotation handle. Preserve all resize, move, rotate, and responsive touch behavior.

## 2026-11-17 Directive Update — Tool-shaped cursors

Do not show one generic plus/crosshair cursor for every tool. The Canvas cursor must visually match the selected tool: Pen nib, Pencil, Brush, Eraser, Move arrows, Hand, Text I-beam, Shape, and Gradient. Keep the same cursor state on the viewport and print canvas while preserving touch behavior on Phone/Mobile.

## 2026-11-17 Directive Update — Circular rotation handle

The Free Transform rotation control should be a small white circular button with a circular rotate-arrow icon, matching the supplied reference. Remove the protruding connector stem entirely. Keep the larger invisible hit area and the small live degree label.

- 2026-11-16: Following the owner's direct request to make Shape tools functional like the reference Rectangle with selectable options, replaced the Shape placeholder with nine presets and drag-to-draw SVG preview/creation (Rectangle, Rounded rectangle, Ellipse, Triangle, Diamond, Line, Arrow, Star, Hexagon). Created geometry is stored as an editable shape layer, selected on the canvas, and shared with the mockup renderer. Added regression coverage; custom path editing and independent fill/stroke controls remain future scope. See `Doc/DOCUMENTATION.md#work-log`.


## 2026-11-17 Directive Update — desktop-editor-like Free Transform mechanics
The owner accepts desktop-editor-style behavior in place of exact replication; reliable, intuitive transform behavior is the priority. Keep the previously approved thin blue selection outline, eight resize points, compact circular rotate-arrow handle, live degree badge, and mobile hit areas. Corner drags scale proportionally by default; Shift permits independent X/Y scaling; Alt/Option scales from the center; Shift snaps rotation to 15-degree increments. Resize math must follow the selected object's rotated local axes and pivot; group rotation/scaling must move the selected artwork together without altering unselected layers. Keep the Plan as the source of editor requirements; this direct owner instruction supersedes pixel-identical exact-replication expectations.

## 2026-11-17 Directive Update — desktop-editor-like Pen continuity

Keep the existing vector Pen path workflow and make its cursor/tool state consistent: use the same Pen-nib cursor on the viewport and print canvas from the first anchor through curve creation, path editing, Cancel, Finish/Close, and after path commit. Finishing or closing a path must leave Pen selected and ready to start another path, not switch automatically to Move. Preserve other tools' cursors and existing Bézier, snapping, close, finish, cancel, and point-edit behavior. Implement only this slice; wait for the owner's step-by-step direction before adding other desktop-editor-specific Pen modes.

## 2026-11-18 Implementation update — desktop-editor-style Pen Bézier handles

Following the owner's direct request, click-dragged Pen anchors now show paired guides and visible handle endpoints; saved-path handles can be dragged to change the cubic curve, and Alt still breaks the mirrored tangent. The live preview uses a 1.5px stroke, the committed path is thin at default canvas size, and the “Click: corner…” instruction plus empty idle hint panel are removed. Finish/Close/Cancel remain available during drawing. Handle motion is tracked globally while dragging so the edit survives SVG redraws; listeners are removed on pointerup, pointercancel, or unmount.

Evidence: production build passed; `node --test tests/*.test.cjs` passed **55/55**; Pen geometry and canvas-shell tests passed **21/21**; lint had **0 errors / 25 warnings**; and focused production Chromium verified visible endpoints, thin preview, hint removal, and saved-handle movement changing the path data. See `Doc/DOCUMENTATION.md` for the work-log entry.
## 2026-11-18 Directive Update — Cursor shapes must match Tools Bar

Canvas cursors must use the same visual icon shapes as the corresponding Tools Bar icons, not separate approximations. Pen, Pencil, Brush, Move, Hand, Text, Shape, and Gradient must match their toolbar icon geometry. Eraser is the only exception: show a small circular cursor instead of the Eraser icon.

## 2026-11-18 Directive Update — Text typing, transform box, and Pen cursor fixes

The owner reported three regressions. (1) Multi-line text was broken: the inline editor committed on Enter instead of starting a new line. It is now a growing `textarea`, Enter adds a line (Escape commits), and `EditorLayerPreview` renders one `tspan` per line so the drawn text matches what is typed. (2) Text and Free Transform had stopped working together: the transform box spanned the artwork like an image. It now hugs the glyphs via `editorTextCanvasBounds`, and a text layer is text-only again (the Pen, Brush, Pencil, Eraser, and Shape tools refuse to draw on it). The box measures the real font with `CanvasRenderingContext2D.measureText`, because the earlier fixed per-character estimate was too narrow for wide glyphs and the box cut through the text; `MockupArtwork` shares the same measured bounds. These two were a reverted change (`432ac36` reverted `c974e3c`) and are re-applied. (3) The Pen nib-tip cursor was off-target: the hotspot sat on the pen icon's tail (`15 22`), so it now sits on the nib (`2 2`), matching every other tool's anchor.

## 2026-11-18 Directive Update — Photo layer Adjustments

When an uploaded photo layer is selected and Adjustments is opened, show a compact Photo section with color controls and action boxes for Remove background and Upscale. Brightness, Contrast, Saturation, and Blur must render live on the photo and persist immutably. Keep the Remove background/Upscale controls ready for real image-service endpoints; until those endpoints are connected, preserve their active state without pretending that backend processing has completed.

## 2026-11-18 Directive Update — professional photo-editor-style photo controls

Extend Photo Adjustments beyond basic color sliders with RAW-style controls: Temperature, Tint, Exposure, Highlights, Shadows, Vibrance, Hue, Vignette, and independent Red/Green/Blue channel controls. Render the adjustments live and keep each value immutable on the image layer. Use compact grouped controls so the panel remains usable on Desktop and Phone/Mobile.

## 2026-11-18 Directive Update — Photo Curves and Levels

Add Curves and Levels to Photo Adjustments. Levels must provide Black point, White point, and Gamma. Curves must provide a compact live graph with editable points. Both controls must render live, persist immutably on the image layer, and remain usable on Desktop and Phone/Mobile.

## 2026-11-18 Directive Update — Selective Color, HSL, AI Enhance, and Smart Filters

Add Selective Color and HSL controls to Photo Adjustments, including per-component color sliders and HSL Hue/Saturation/Lightness. Add AI Enhance and Smart Filters with intensity/preset controls. Keep the behavior non-destructive and live on the photo layer, with the AI actions ready for a future connected service.

## 2026-11-18 Directive Update — Photo layers are non-drawable; sectioned Photo Adjustments

The owner asked for three changes. First, Brush, Pencil, Pen, Eraser, Shape, and Gradient must not work on a photo layer: a photo is edited only through the Photo Adjustments panel. The canvas now ignores those tools when the selected layer is a photo, tool selection falls back to Move, and the Tools bar greys the drawing buttons out. Second, Photo Adjustments must be organised as separate photo-editor sections, each opening on its own: Basic, Tone Curve, Color Mixer, Color Grading, Levels, Selective Color, Channel Mixer, Detail, Effects, Optics, and Calibration. Third, Upscale, Remove Background, AI Enhance, Smart Filter, and the layer mask controls move into their own separate service box, kept outside the adjustment sections.

The owner also listed the exact controls for each section, and those are the ones implemented. Basic keeps Temperature, Tint, Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Texture, Clarity, Dehaze, Vibrance, Saturation. Color Mixer now offers a Hue / Saturation / Luminance mode with an eight-band per-color row (red, orange, yellow, green, aqua, blue, purple, magenta) so each colour can be edited on its own. Color Grading carries Shadows, Midtones, and Highlights (hue and saturation each) plus Blending and Balance. Tone Curve carries Highlights, Lights, Darks, Shadows plus the draggable point graph. Detail carries Sharpening, Noise Reduction, and Color Noise Reduction. Effects carries Vignette and Grain. Optics carries Remove Chromatic Aberration and Lens Corrections. Calibration carries Red, Green, and Blue Primary (hue and saturation each). Because SVG filters cannot isolate a single hue per pixel, the per-color and primary controls are folded into a weighted global hue/saturation shift — a documented approximation, not a claim of pixel-level parity.

## 2026-11-18 Directive Update — professional photo-editor-style Photo Adjustments

The owner asked for a real professional photo-editor-style Photo Adjustment set rather than a flat slider list. Photo Adjustments now mirrors a professional photo editor as collapsible groups: White Balance, Light (Exposure in EV plus Contrast/Highlights/Shadows/Whites/Blacks), Presence (Texture/Clarity/Dehaze/Vibrance/Saturation/Hue), Tone Curve, Levels, Color Mixer (HSL), Color Grading, Selective Color, Channel Mixer, Effects (Vignette/Grain), Detail (Sharpen/Noise reduction/Blur), and Smart & AI, with Auto and Reset. All control math lives in the pure `photo-adjustments.ts` module: exposure in stops, documented tonal zones for Highlights/Shadows/Whites/Blacks, one luminance transfer table for the tone stage, one `feColorMatrix` for the color stage, and gradient/turbulence overlays for split toning, vignette, and grain. Values remain immutable instructions on the image layer so previews, mockups, and the print canvas stay identical and non-destructive. Controls must remain usable on Desktop and Phone/Mobile.

## 2026-11-18 Directive Update — Photo Layer Mask and Blend Modes

Photo layers must expose Add/Edit/Remove Layer Mask controls and Blend Modes in the editing workflow. Reuse the existing non-destructive black-hide/white-reveal mask brush system and apply Blend Modes to the photo rendering group. Keep the controls available on Desktop and Phone/Mobile.



## 2026-11-18 Directive Update — Header Bar 2 uniform boxes, shared dropdown, and live price

The owner asked for the Editor Header Bar 2 icon boxes to share one shape, for the dropdown opened from each box's chevron to be rounded on its sides, and for the price to appear once an option is chosen. Product, GSM, Color, and Size now all render through a single `BoxDropdown` control built on the same `FIELD_BOX`/`TRIGGER_BOX` geometry as the Save/Buy `ACTION_BOX` boxes, so the whole bar reads as one uniform set and every field opens the identical green dropdown panel (no native `select`). The chevron on each box opens that panel; it matches the box fill, is pinned to the same right-edge position on every box, and is portal-mounted so the scrollable bar cannot clip it. The panel is only as wide as the box it opens from and its sides are rounded (`rounded-2xl` panel with `rounded-full` options), not `rounded-full`, which clamps a tall menu into a capsule. The Color swatch is a 20×20px rounded square rather than a dot. The Save-adjacent price is now live: it shows the provisional Ks amount as soon as the product's required selections exist and updates immediately on every Product/GSM/Size change, reading `Price —` only while a required choice is missing. Save/Buy remain placeholders because no price source or save/checkout handler is connected.

## 2026-11-18 Directive Update — Shape adjustments (desktop-editor-like and reference-like)

The owner asked for desktop-editor-like shape adjustments with a reference feel. A shape layer now carries an `EditorShapeStyle` with independent **Fill** (color, enable, opacity) and **Stroke** (color, width, and a solid/dash/dot line style) channels — the fill/stroke separation — plus a `cornerRadius` and two reference-style effects: a drop shadow (offset X/Y, blur, opacity) and an outer glow (spread, opacity). New shapes seed their style from their own geometry so the panel always has real values, and the style is stored on the shape content, preserved by Shape Builder operations and duplication, and clamped on every edit. The Adjustments panel gained a `Shape` section for these controls; the print canvas, the Layers thumbnail, and the mockup previews all render the same resolved style through `EditorLayerPreview`, and the drag preview on the canvas shows the target layer's live style. This is a focused first slice, not full parity: one fill and one stroke per shape (no gradient fill or stacked appearance), no per-path styling inside a single shape layer, and no dash-gap or cap/join controls yet.

## 2026-11-18 Directive Update — Bigger Free-transform handles with hover arrows

The owner asked that the Free Transform corners and edge handles be a little bigger, and that hovering them show the two-sided resize icon plus the rotate tool's own icon regardless of which tool is active. The handles now keep a constant on-screen size (about 10px, measured from the SVG scale with a `ResizeObserver` instead of a fixed unit size), so they no longer shrink to a few pixels on a fitted canvas. Hovering a handle reveals a double-headed arrow glyph aligned to that handle's axis and switches the pointer to the matching resize cursor (`nwse`/`nesw`/`ns`/`ew`) with no tool switch needed. The rotate handle keeps its distinct circular-arrow glyph, is enlarged to match, and shows a grab cursor.

## 2026-11-18 Directive Update — Compact reference-style Shape picker beside the chip

The owner asked that selecting the Shape tool must not raise a large box. The Shape chip in the tools bar now shows the currently selected shape's icon; clicking it activates the Shape tool and opens a small reference-style picker right beside the chip. The picker is a compact three-column popover of icon-only buttons (28px square on desktop, 40px square on coarse pointers), with the "Choose a shape, then drag on the canvas" hint removed and each shape name kept only as `title`/`aria-label`. Choosing an option closes the box, leaves the Shape tool active so drawing can start immediately, and switches the chip's icon to the chosen shape. The picker stays closed on load. This is a presentation change only; the Shape tool still draws into the selected unlocked layer and does not create a layer per gesture.

## 2026-11-18 Directive Update — Text tool follows the layer rule

The owner asked that working on a layer must not keep calling up new layers, and that a layer is created only when the user asks for one. Confirmed rule for the Text tool: when the selected layer is a text layer, the Text tool edits that layer's own text in place and creates no new layer; when the selected layer is not a text layer (artwork/shape/image) or nothing is selected, it creates exactly one new text layer and types into it. This matches the existing Pen and Shape behavior, which already append to the selected unlocked layer. The canvas-click Text tool branch in `EditorCanvas.tsx` now checks `selectedLayer.kind === "text"`, reopens the in-place editor for that layer (with a lock notice), and only calls `addCanvasTextLayer` for a missing or non-text selection. The explicit Sidebar `Add Text` action and the `Add layer` control remain the deliberate ways to add a layer.

## 2026-11-18 Directive Update — Pen and Shape reuse the active layer
Update the earlier Shape-tool note: every Pen or Shape gesture appends its vector path to the currently selected unlocked layer; it must not create a new layer per action or automatically open the Layers panel. Missing or locked active layers block drawing instead of triggering implicit layer creation. Multiple Pen paths in one layer remain individually editable by path index. Preserve the current Pen-continuity behavior: finishing or closing a path leaves Pen active. Keep Add Layer explicit; text/image/design insertions may still create their own editable object layers.

## 2026-11-18 Directive Update — Per-tool options for brush, pencil, eraser, and pen

The owner asked that each drawing tool carry its own settings instead of the editor using fixed constants. The Adjustments panel now has a `Tool Options` section that follows the active tool and opens by default when the panel is opened. Brush and Pencil expose tip shape (round/square), size, opacity, and softness/feather; Eraser exposes its radius; Pen exposes stroke width and cap. The eraser's hit radius reads `toolOptions.eraser.size` (was a fixed `radiusPx = 180`) and a committed Pen path uses `toolOptions.pen.width` (was a fixed `strokeWidth: 5`). Each brush/pencil stroke stores its own `width`, `opacity`, `shape`, and `softness` so strokes within one layer can differ; strokes without stored values keep the previous 52px / 0.68-opacity brush look. Square tips use `stroke-linecap: butt` and non-zero softness applies a Gaussian blur. The Free Transform box now hides while a freehand stroke is in progress so the selection outline does not sit under the pointer. The bottom Adjustments action is enabled with no selected layer so the tool options stay reachable. Values live in page memory only, consistent with the rest of the editor's current state handling.

## 2026-11-18 Directive Update — desktop-editor-style Gradient tool

The owner asked for a desktop-editor-style Gradient tool that can draw and re-aim gradient layers and edit them fully. The editor now has a `gradient` layer kind (`editor-layers.ts`) that holds an `EditorGradient` — a gradient shape (`linear`, `radial`, `angle` conic, `reflected`, `diamond`), a drag axis (`x1/y1` → `x2/y2` in the 1000×1200 artwork space), and a stop list (id, offset 0–100, hex colour, opacity 0–1, capped at eight). Helpers: `defaultEditorGradient`, `normalizeEditorGradient`, `sortEditorGradientStops`, `sampleEditorGradient` (ramp sampling for the conic/diamond shapes), `editorGradientGeometry`, `editorGradientConicWedges` (120 flat wedges, because SVG has no native conic paint), `editorGradientDiamondFacets` (four facets), `editorGradientFromToolSettings`, `createEditorGradientLayer`, `setEditorLayerGradient`, and `updateEditorGradientSettings`/`setEditorGradientStops`. The Gradient tool carries its own shape/preset in `EditorToolOptions.gradient`.

On the canvas, a Gradient drag paints a full-canvas fill: a drag over a selected gradient layer re-aims that layer's axis, and a drag elsewhere drops a new gradient layer; a tap falls back to a full-width horizontal axis through the point. A live preview overlay draws during the drag. `GradientPreview` renders every shape from the shared 1000×1200 artwork space, so the print canvas, the Layers thumbnail, and both mockups look identical. The Adjustments panel gained a `Gradient` tool-options section (shape and preset pickers with live ramp previews) and a `Gradient` layer section (type select, draggable stop handles, add/remove stop, per-stop colour/position/opacity, and the axis Start/End fields). Controls stay usable on Desktop and Phone/Mobile. This is a vector gradient fill, not a raster or mesh gradient; per-stop midpoint/bias and noise/dither options are not included.

## 2026-11-19 Directive Update — Editor dock colors and Adjustments return arrow

Keep the Edit Sidebar rail/panel and Adjustments box visually consistent with the active MH Fashion Light/Dark theme; do not force a dark rail or hard-coded light/dark dock colors that drift from the shared theme tokens. The circular arrow at the Adjustments edge must clearly represent returning to the Layers box, with accessible label/title/state while preserving the existing desktop and Phone/Mobile touch sizing.


## 2026-11-19 Directive Update — Sidebar preview cards are caption-free

Edit Sidebar preview cards must not show the design name, layer name/source design, uploaded filename, or uploaded byte-size captions beneath the preview image. Apply this consistently to Designs, Elements, Text layers, and Upload photo previews. Keep the preview cards clickable, retain accessible labels, and keep the search, Add Text, upload-limit behavior, and Image Create controls.


## 2026-11-19 Directive Update — Text bounds and line-separated typing

A text layer's Free Transform box must follow the text's measured glyph width and total multi-line height, not an artwork-sized or padded box. Inline text editing must support Enter/newline-separated typing; every line must render consistently on the canvas and mockups. Keep the behavior usable on Desktop and Phone/Mobile.


## 2026-11-21 Implementation Update — Super Admin modules

> Folded into section 10; kept here as the dated record.

The `/admin` workspace is no longer a single dashboard preview: every module in the left navigation is now a real page backed by one browser-local demo data store.

- **Routes:** `/admin` (dashboard), `/admin/orders`, `/admin/products`, `/admin/inventory`, `/admin/customers`, `/admin/designs`, `/admin/promotions`, `/admin/reports`, `/admin/settings`. All are listed in `apps/web/public/manus-routes.json` and keep `robots: noindex, nofollow`.
- **Shared store:** `apps/web/src/lib/admin-demo-data.ts` holds the typed demo data (orders, products, per-size stock, designs, promotions, team members, settings) plus pure helpers for stage transitions, totals, revenue buckets, customer aggregation, stock adjustments, draft validation, promotion status/discounts and module permissions. `admin-demo-store.ts` exposes `useAdminDemoData()` over `useSyncExternalStore`; writes persist to `localStorage` under `mh-fashion-admin-demo-data-v1`, so stage changes, stock edits, new products and settings survive a reload.
- **Orders:** stage filter chips with counts, search, advance-to-next-stage per row, detail drawer with items, pipeline timeline, print-desk note, cancel/refund and a production CSV export.
- **Products:** create/edit drawer with validation (name, fabric, price, apparel GSM), archive/restore, two-step delete, status filters.
- **Inventory:** stock row per product and size with −/+/+10 and direct entry, low-stock and out-of-stock filters driven by the settings threshold.
- **Customers:** grouped from the order queue by email (orders, units, lifetime spend, last order) with VIP/repeat/new segments and sorting.
- **Designs:** publish/hide/delete with status filters and download counts.
- **Promotions:** code creation with validation, percent or fixed amount, minimum spend, usage limits, validity window, enable/disable, and a live discount preview.
- **Reports:** 7/30/90-day revenue bars, top products, payment mix, pipeline distribution, low-stock watch list and CSV export.
- **Settings:** store profile (name, support contact, USD rate, low-stock and free-delivery thresholds, default print note), team list with role plus per-module permission checkboxes, demo-data reset and sign out.
- **First run:** `/admin/register` stays closed, but a browser with no demo account now gets the single local account setup form on `/admin/login` (same warnings, no real passwords). Without it the preview was unreachable on a fresh browser.
- **Validation:** `npm run test:admin-data` (13 tests) covers the data layer; the full `node --test tests/*.test.cjs` suite passes 135/135 against a production build; headless Chromium drove first-run setup, order advancement, product creation, stock adjustment, promotion creation, settings save, team add, reload persistence and every module page with no console errors.
- This remains a preview, not a security boundary. Supabase Auth, RLS and server-side role checks are still required before live admin data is exposed.

## 2026-11-21 Implementation Update — Posts module (Guide / T-shirt / Nyein)

> Folded into sections 7 and 10; kept here as the dated record. The Google Sheet price import
> described below is removed — see 4.5.1.

Posting lives in the admin workspace at `/admin/posts` with three tabs, because posting is split into three kinds of content.

- **Tabs:** Guide posts (lists the published guide catalog with a link to `/guide/:slug`), T-shirt posts (the working module), Nyein posts (placeholder until the Nyein brief arrives).
- **T-shirt post fields:** title, description, one attached **SVG** file (preview, size, replace/remove), the attributes the drop varies in, and one hand-typed price per attribute combination.
- **Price follows the whole combination, not the size.** A post ticks the attributes it sells — Size, Material, Fit Type, Colour, Sleeve, GSM, Cutting, Print — and each price row names one full combination: XL · Cotton · Regular · Black · DTF can cost Ks 24,000 while XL · Cotton · Regular · Navy · Sublimation costs Ks 29,500. There is no base price and no derived delta anywhere; unlisted combinations are simply not sold.
- **Attributes default to Size, Material, Fit Type and Colour**; Sleeve, GSM, Cutting and Print are one tick away when a drop needs them. Unticking an option drops it from the rows so a combination never keeps a value that is no longer offered.
- **Validation:** title required (≤ 80 chars), SVG required, at least one attribute option, at least one combination, every row complete, every price above zero and under Ks 10,000,000, no repeated combination, at most 40 rows.
- **SVG storage:** `apps/web/src/lib/post-assets.ts` reads the file and returns a data URL that the browser-local demo store can hold. The R2 route is not provisioned yet, so this is the single seam to replace with the Cloudflare R2 upload; the return shape (`url`, `fileName`, `sizeBytes`) stays the same.
- **Persistence:** posts live in the same demo store (`tshirtPosts`), so they survive a reload. Entries saved by the earlier per-size module are converted on read (`normalizeTshirtPost`: sizes × colours become combinations with the colour surcharge folded into the price), and a store without posts is backfilled with the seeds.

## 2026-11-21 Implementation Update — Product page preview (mockup + design)

> Folded into sections 7 and 12; kept here as the dated record.

The product page at `/products/:slug` now previews the exact thing the customer is buying instead of a static photo.

- **Bigger image.** The media column grew from 280 px to 440 px on desktop and runs full width on a phone (374 px at 390 px wide, no horizontal overflow).
- **The mockup follows the selection.** Colour, fit and sleeve resolve to an R2 object (`mockups/<slug>/<look>.<ext>`), walking from the most specific look down to `default` and then to the catalog image. Size is left out of the key because the same garment photo serves M and XL; a bucket only needs the looks that visually differ.
- **The design sits on top.** The artwork is placed in `PRODUCT_PRINT_AREA` (30% / 22% / 40% / 46% of the image box) and comes from `?design=`, the product's own `designSvgUrl`, or the design currently open in the editor (kept in `localStorage` by `EditorCanvas`). Draft layers are drawn with the editor's own renderer, so the preview and the canvas cannot drift.
- **Config:** set `NEXT_PUBLIC_R2_PUBLIC_URL` to the bucket's public origin at build time; without it the page still works, showing the catalog image with the design overlaid.

## 2026-11-21 Implementation Update — Orders detail + Google Sheet pricing

> Folded into section 10; kept here as the dated record. The Google Sheet pricing half is removed.

**Orders** — the list already showed every order; it now also answers "what came in today" and "what came in on a given day":

- A **Today** card (orders, revenue, units) beside the all-time figures.
- Date presets (Today / 7 days / 30 days / All), a hand-typed From/To range and a sort select (newest, oldest, highest, lowest total).
- An **Orders by day** strip: each day shows its order count, units and revenue, and clicking one narrows the list to that day.
- Stage chips, the summary line and the CSV export all follow the chosen range, and the order drawer now lists the placed date, the day, item lines, units, unit prices and the total.

Orders are filed by the admin's local day. The old dashboard buckets used UTC day keys, which in UTC+6:30 pushed every order one day later on the chart; that is fixed.

**T-shirt post prices: Google Sheet import removed (owner decision, 2026-11-21).** The sheet link
field, the server-side CSV fetch and the "the sheet defines the attributes" rule are gone. Prices
are entered by hand in the Pricing Management module — see 4.5.1. The post editor keeps one price
per full attribute combination; nothing else about posts changed.

## 2026-11-21 Fix — product page preview (thumbnails, phone height, zoom)

The previous change removed the image strip under the product photo and left the box empty when no mockup existed. Both are fixed:

- **The strip is back** and is now meaningful: one tile per colour. A tile shows that colour's mockup photo when one exists and its colour swatch when it does not, so the strip is never blank — even before the R2 mockups are uploaded. Tapping a tile chooses that colour (price and swatches follow).
- **Phone no longer loses the screen to the photo**: the preview box is 240 px tall on phones instead of a full-width square, with the colour strip in one row (57 px) under it.
- **Web gets a larger photo** (480 px column) plus **hover zoom**: pointing at the photo magnifies it around the cursor at 2.4x; clicking or tapping opens a full-screen zoom view that closes with X, the backdrop or Escape. The design on the shirt zooms with it.
- With no photo at all (the current production state for most products) the box shows the chosen colour and "Mockup photo coming soon" instead of an empty rectangle.

### Follow-up — landscape photo, thumbnails on the side

The photo box is now landscape instead of square (200 px tall on phones, 4:3 on desktop) and the colour thumbnails moved into a rail on the left, so nothing is added below the photo: the media block is exactly one photo tall. The column widened to 560 px, the box is white while a photo shows (mockups are shot on white), and the `NEW` badge moved to the top right so it no longer sits on the rail.

### Follow-up — guide density, wider product photo

- Guide: phone cards became a 90px thumbnail row (they were 368px tall with a full-width cover), the phone category row scrolls instead of squeezing seven labels into one line, and the hero/cards shrank on desktop too (370 → 319px).
- Product: the photo box widened again to a 640px column with a 16:10 box (576×360 on desktop, 326×170 on phones) and the caption tightened to one small line.

## 2026-11-21 — Order print sheet

> Folded into section 8 (production export); kept here as the dated record.

Opening an order in the admin now hands the print desk everything it needs to run the job:

- Each line lists colour, size, material, GSM, fit, sleeve, print method, placement and print size in cm, next to the product name and quantity.
- Each line carries its **design file**: an artwork thumbnail, the file name and a download button, plus a "Design files" list on the printable sheet.
- The shipping address is shown with the customer details.
- "Print sheet" opens a standalone A4 document (identity, ship-to, spec per line, artwork, file list, totals, note) and sends it to the print dialog; "Print spec CSV" exports the same columns for a spreadsheet.
- Orders saved before this change are backfilled on read, so no order opens with an empty spec.
- Designs are saved as SVG at real print size, with the layer layout recorded: print area in cm, artwork units per cm, and every layer's X/Y/W×H in cm, rotation and scale. The drawer, the printable sheet and the CSV all show those measurements.

## 2026-11-21 — Print position on the mockup, separate cart lines

> Folded into section 8; kept here as the dated record.

- Every order line now records where the print area sits on the garment: the mockup name, the flat garment size in cm, and the print-area origin (cm from the top-left). The A4 sheet draws the garment with the print area and the layer boxes, so the press can align the job without guessing.
- Adding to the cart with a different size, colour, material, GSM, fit or sleeve now creates a separate line instead of overwriting the previous one; identical combinations still just increase the quantity. Each line shows its own variant and price.

### Print files ZIP
- One button in the order drawer downloads everything for a job: the printable sheet (HTML), the spec CSV, `manifest.json` and each design as a print-sized SVG plus its mockup-position diagram. The archive is written by a small stored-ZIP writer in `lib/zip.ts`, so no new dependency ships to the admin bundle.

### Product page: static promises removed
- Dropped the Free Delivery / Secure Payment / Easy Returns / 24/7 Support / Seol Support row from the product page and the icons it needed. Delivery will come from the MH Delivery API, so a hard-coded "orders over 50K" promise would contradict whatever the API returns.

### Nyein brand and R2 storage
- Nyein is a ready-made catalogue line: `is_customizable = 'none'` products stay buyable but lose the **Edit Design** action and never paint an editor draft on the mockup. `/nyein` now lists that line from `sub_brand` instead of the placeholder card.
- `Doc/R2-STORAGE.md` is the storage contract: bucket `mh-fashion-assets`, `mockups/product|editor|3d/<slug>/<look>.<ext>` for photos and renders, `models/<slug>.glb` for 3D, `designs/`, `posts/`, `orders/`, plus the upload commands and the photo spec.
- Still open: the design → order link (the editor draft lives only in localStorage), R2 uploads from the app, checkout, and PNG/PDF export.

### Two mockup sets
- R2 now carries `mockups/product/<slug>/<look>.<ext>` (catalogue, 4:5) and `mockups/editor/<garment-slug>/<look>.<ext>` (editor panel, 1:1) as separate sets. `mockupCandidates(..., { set })` picks the folder and `editorMockupCandidates()` builds the editor URLs from colour + GSM; the flat pre-split layout is still a catalogue-only fallback.
- Open: the editor panel still draws its own garment shape, so the `editor/` photos are not shown yet — see P3 below.

### Delivery quote and print bundle
- `delivery-<id>.json` (new, also inside the ZIP) is the MH Delivery quote request: consignee name, phone, email, address line, township, city, per-line size/colour/quantity/weight, parcel totals, COD amount. `Doc/MH-DELIVERY.md` documents the shape and what is still unknown (endpoint, auth, response fields).
- `invoice-<id>.html` joins the bundle: an A5 receipt the browser prints to PDF, with a "Quoted by MH Delivery" line instead of an invented fee.
- Drawer now has **Delivery JSON** and **Receipt** buttons next to the ZIP and print sheet.
- `mockups/3d/` + `models/<slug>.glb` are reserved in R2 for the 3D mockup viewer, with the look keys and print-area convention documented.

### Print bundle completeness
- The ZIP is now self-describing: `README.txt` indexes it, `measurements-<id>.csv` gives one row per design layer (print area, units/cm, X/Y, width/height in cm, rotation, scale), and `Doc/PRINT-BUNDLE.md` explains every column for the press.
- Bundle order: README, press sheet, receipt, line CSV, measurements CSV, manifest, delivery JSON, then `designs/`.

---

## 2026-11-21 — Editor plan and editor documentation kept separate, written from the code

The owner asked for the editor plan and the editor documentation to be kept apart from the project plan,
written from the code that works, and for the editor material that referenced other design products to be
removed. No editor behaviour changed.

- the former editor plan file (now Part II of `Plan/PLAN.md`) is the editor plan, written from the source: where the editor lives (file by
  file, with sizes), what works today item by item, the ten contracts that must not drift, the verified
  gaps with evidence, the next steps E1–E11 with files and acceptance, six decisions for the owner, and
  the change policy.
- `Doc/EDITOR.md` documents how the editor behaves today: layout, canvas and workspace, the nine tools,
  layers, selection and transform, text, shapes, pen, brush and eraser, gradients, images, mockups, the
  header bar, the Edit sidebar, undo and state, phone behaviour, keyboard and pointer, and the tests.
- `Plan/PLAN.md` §6 is now a short summary that links to those two files, and the editor specification
  that used to sit here was removed with the rest of the editor material, as the owner asked. The old
  anchors stay so existing links resolve.
- The code check recorded in the plan: `circle` is selectable but paints no transform, Shape Builder
  handles only the first two axis-aligned rectangles, the editor writes a browser draft but never
  restores it and no order carries the artwork, and there is no align/tidy, flip, hover highlight,
  positional snapping, context menu, glyph panel, per-character styling, artboard, keyboard undo, extra
  product or working Save/Buy; text wrapping, the seven text effects, decorations, node editing, font
  search and per-layer effect thumbnails all exist.

## 2026-11-21 — Rate limiting on the payment API

The four payment routes were open to a script that could hammer them:

- `lib/rate-limit.ts` is a fixed-window counter keyed by `bucket + client address`, with the address taken from `cf-connecting-ip` (Cloudflare), then `x-forwarded-for`, then `x-real-ip`.
- `enforceRateLimit(request, bucket, rule)` returns a `429` with `Retry-After` and `{ "error": "rate_limited" }`, or `null` to let the request through. Each route calls it **before** reading the body.
- Budgets: intent 10/min, simulate 20/min, status 120/min, webhook 60/min. Creating an intent is the expensive path, so it is the tightest; a provider retry must not be mistaken for abuse, so the webhook is the loosest.
- The map sweeps expired buckets once it passes 5,000 keys, so a flood of addresses cannot grow it without bound.
- Verified over HTTP: 120 allowed, then `429` with `Retry-After: 59`, while a second address still got through.

**Limitation:** the counter lives in the worker instance's memory, so it is per-instance, not global. That is enough to stop a single client hammering one instance; a durable limit needs KV or a Durable Object.

## 2026-11-21 — QR on the print sheet

- `lib/order-qr.ts` encodes `orderQrPayload(order.id)` as a single-path SVG (`qrcode` library, error correction M, 4-module quiet zone). No canvas, no data URL, nothing to fetch, crisp at print resolution.
- The sheet header carries the code on the right with the caption "Scan to open this order".
- The code links to `/admin/orders?order=<id>`, so a phone on the shop floor opens the order itself. Without `NEXT_PUBLIC_SITE_URL` it falls back to `MH Fashion order <id>` as text, because a relative URL is useless to a scanner.
- `AdminShell` now keeps the requested admin URL in `/admin/login?next=…`, and `AdminAuthPanel` returns there after sign-in (`safeAdminNext` only accepts `/admin…`, so the parameter cannot redirect off-site).
- Verified by decoding the printed code with a real decoder (jsQR) straight from the generated sheet: it returns `https://mhfashion.mhfashionmm.workers.dev/admin/orders?order=%23MH1101`, and the sign-in flow lands on `/admin/orders?order=%23MH1101` with the drawer open.

## 2026-11-21 — Storefront E2E at desktop and phone widths

`tests/storefront-e2e.cjs` drives the production build over CDP and asserts the whole purchase path:

- Desktop 1440x900: home, search (`noindex`), wishlist, FAQ (sections + `FAQPage` markup), guide index, checkout, and the account page with the order just placed (id, stage, item line, total) plus the layout JSON-LD nodes.
- Phone 390x844 with touch: bottom navigation, no sideways scroll on home/checkout/order history, the same total, a placed order, and both orders listed with cards narrower than the viewport.
- It clears the browser store first (order history, cart, checkout key) so the counts are exact and a second run behaves the same, and it fails on any page exception.

Found and fixed while writing it: `useAdminDemoData` passed the browser snapshot as its own server snapshot, so the first client render (with saved orders) disagreed with the server HTML (seeded data). React threw the tree away and re-rendered it, which appended a second copy of the root layout's JSON-LD scripts on `/account`. The hook now has a separate cached `readSeedSnapshot` for the server and hydration render.

<a id="print-delivery-storage-plan"></a>
## 2026-11-21 — Forward plan: print, delivery and storage

The work log above records what shipped. This section is the plan for what is left, in the order
it should be built. Each phase has a single acceptance test that decides whether it is done; a
phase is not "done" because the code compiles.

### Current state (shipped, `main` at `4e6acdc`)

| Area | State |
|---|---|
| Print bundle | `print-files.zip` = README, press sheet, A5 receipt, line CSV, layer-measurement CSV, manifest, delivery JSON, design SVGs + mockup diagrams (`Doc/PRINT-BUNDLE.md`) |
| Delivery | `delivery-<id>.json` is the MH Delivery quote request; nothing is POSTed yet (`Doc/MH-DELIVERY.md`) |
| Storage | R2 layout fixed: `mockups/product`, `mockups/editor`, `mockups/3d`, `models/`, `designs/`, `posts/`, `orders/` (`Doc/R2-STORAGE.md`) |
| Catalogue | Nyein is a ready-made line (`is_customizable = 'none'`) — buyable, no editor; `/nyein` lists it |
| Tests | 220 passing; bundle contents and the quote payload are covered by `tests/order-archive.test.cjs` and `tests/delivery-quote.test.cjs` |

### P1 — Design → order link (highest value, unblocks everything else)

Today the editor draft lives only in `localStorage`, so an order can carry a design the press
cannot fetch, and the ZIP is the only copy of the artwork.

| Task | File |
|---|---|
| Upload the design SVG to R2 on save, keyed by design id | `app/api/designs/route.ts` (new), `lib/r2.ts` (new) |
| Store `design_url`, `design_id` on the order item, not just the file name | migration `0008`, `lib/types.ts` |
| Send `designId` with the cart line, so checkout and the editor agree on one design | `lib/cart-items.ts`, editor save path |
| Drawer: show the R2 link next to each design and fail loudly when a file is missing | `components/admin/AdminOrders.tsx` |

**Acceptance:** place an order from the editor, then delete the browser profile — the design still
opens from the admin drawer, and the ZIP's `designs/*.svg` is byte-identical to the R2 object.

### P2 — MH Delivery fee at checkout

| Task | File |
|---|---|
| `POST /api/delivery/quote` server route; the token never reaches the browser | `app/api/delivery/quote/route.ts` (new) |
| Map the quote response onto the order (`deliveryFeeKs`, `deliveryService`, `etaDays`) | migration `0009`, `lib/types.ts` |
| Cart/checkout: township picker, then the fee appears before payment | `components/cart/*` |
| Receipt: print the real fee instead of "Quoted by MH Delivery" | `lib/order-print.ts` |

**Acceptance:** two townships produce different fees in the same session; the client bundle contains
no delivery token; a failed quote blocks checkout with a readable message rather than a silent 0.

**Blocked on:** endpoint URL, auth scheme, response fields (`Doc/MH-DELIVERY.md` → "Still to confirm").

### P3 — Editor mockup photos

| Task | File |
|---|---|
| Editor reads `?product=<slug>&colour=&gsm=` so it knows its garment | `app/create/page.tsx` |
| Panel shows `editorMockupCandidates()` behind the artwork, falling back to the drawn garment | `components/MockupArtwork.tsx` |
| Print frame aligned to the photo's chest, verified at 1:1 | same |

**Acceptance:** with a photo uploaded, the artwork lands inside the photo's print area on web and
phone; with no photo, the panel looks exactly as it does today.

**Blocked on:** the owner's decision between one photo set per garment type (`t-shirt`, `phone`) and
one per catalogue product.

### P4 — 3D mockup viewer

| Task | File |
|---|---|
| Load `models/<slug>.glb`, project the design onto the `print-area` node | `components/ProductMockup3D.tsx` (new) |
| Poster frame from `mockups/3d/<slug>/<look>.webp` until the model is ready | same |
| Lazy-load the renderer so the catalogue bundle does not grow | `app/products/[slug]/page.tsx` |

**Acceptance:** the model loads in under 3 s on a mid-range phone over 4G, the design sits on the
chest in the same place as the flat mockup, and a missing model silently falls back to the photo.

**Open:** renderer choice (`three` + `model-viewer` vs a WebGL-lite path) and whether 3D ships per
product or per garment type.

### P5 — Customer export (PNG/PDF) — **shipped 2026-11-22**

| Task | File | State |
|---|---|---|
| "Download my design" as PNG at print resolution and as SVG | `lib/design-export.ts` (new) | done |
| Same file set the press gets, minus the internal sheet | `lib/order-print.ts` reuse | done: the export reuses the editor's own renderer (`EditorArtworkLayers`) instead of a second drawing path |

- **Where:** a Download chip at the end of the editor tools bar with a menu of "PNG · 300 dpi (print)" and
  "SVG · vector"; disabled when every layer is hidden. `EditorDesignExport` holds the artwork-only `<svg>`
  the files are cut from.
- **Sizes:** the SVG is `38.1cm × 45.72cm` (`viewBox 0 0 1000 1200`); the PNG is 4500 × 5400 px, which
  `pixelsToCentimetres()` reads back as 38.1 × 45.72 cm — the same numbers the press sheet and the
  layer-measurement CSV quote.
- **Acceptance met:** measured in Chromium — a brush stroke and a text layer both land in the exported PNG at
  the same place they sit on the canvas, the file is 4500 × 5400 px at 300 dpi, and the SVG contains no
  editor chrome (`foreignObject`, handles, outlines). `tests/design-export.test.cjs` covers the size maths,
  the document, the file name and the data URL.
- **Not done, deliberately:** a PDF. The plan already keeps a PDF library out of scope; the browser prints
  the SVG/PNG, and a print-quality raster already exists.

### P6 — Bundle to R2

| Task | File |
|---|---|
| Write the finished bundle to `orders/<id>/` so the press can fetch a link | `app/api/orders/[id]/archive/route.ts` (new) |
| Store the link on the order and show it in the drawer | `components/admin/AdminOrders.tsx` |

**Acceptance:** the press opens the link with no login and gets the same files as the ZIP.

### Open questions for the owner

1. Editor mockups per garment type or per catalogue product? (P3, changes how many photos to shoot)
2. ~~Is there a checkout today, or does P2 build it?~~ Answered 2026-11-21: `/checkout` and
   `placeOrder` exist, and the payment intents and webhook are wired. What is left is the provider
   accounts themselves (KBZPay, Wave Pay, AYA Pay, Visa keys) and moving intents from memory to
   Supabase.
3. 3D: per product or per garment type, and which renderer? (P4)
4. Real per-item weights from MH Delivery, so `UNIT_WEIGHT_GRAMS` stops being an estimate.

### Deliberately out of scope

- Raster mockups inside the ZIP — they are catalogue assets, not print files.
- A PDF library — the receipt and the sheet print through the browser, which keeps the admin
  bundle free of a font/raster pipeline.
- Per-size mockup photos — size never changes the silhouette, so it is not a look key.

## 2026-11-21 — Guide cards, and an Editor Guide written from the editor

The Guide page's boxes were about twice the height of a product tile, and the only editor article was
the old "planned editor flow" text. Both were fixed without touching the customer editor.

- `components/guide/GuideCard.tsx` is now the product card's geometry: a square tile with a cover, a
  two-line title and one meta row (category pill and read time sit on the cover). The tall cover band and
  the excerpt are gone, so a guide card no longer stands twice as tall as a product card.
- The guide grid matches the product grid: two columns on a phone, three from `sm`, four from `xl`
  (`app/guide/page.tsx`). The phone list used to be one full-width row per post.
- `editor-guide` replaces `the-planned-editor-flow` in the starter catalog: open the editor, draw and
  type, arrange layers (reorder, hide, lock, blend/opacity/fill), the free transform handles (Shift to
  stretch, Alt to scale from the centre, Shift+rotate to snap 15°), the front and back mockups, and the
  draft that saves in the browser — with the honest note that Save and Buy are not connected yet.
- The article banner no longer says the guide is "planned": it reads "Where a feature is still being
  built, this article says so", and the Design Guide category blurb lost its "planned" wording.
- Verified in Chromium at 1440x900 and 390x844 (2x): square cards on both, the article page with its
  "On this page" list, and `?q=editor` returning only the new article. `tests/guide-card.test.cjs` guards
  the card geometry and the grid; `tests/guides.test.cjs` guards the article's content and that the old
  slug is gone. Full suite 363/363.

### Follow-up — Editor Guide in the menu box, shorter hero

- The desktop menu box (`Guide categories` nav) gained an **Editor Guide** row after the categories, and
  the phone shortcut row gained the same chip as its second item so it is reachable without scrolling.
  Both carry `data-guide-editor`; `tests/guide-http.test.cjs` strips those anchors before counting
  article links, otherwise the always-present menu link broke the `?category=payment-guide` assertion.
- The guide hero dropped from a 196px desktop banner with a 5xl heading to `min-h-[132px]` with a 26px
  heading (96px / `text-lg` on a phone, 124px / `text-2xl` at `sm`), and the decorative egg, shirt and
  "Your Style" art shrank with it. Measured at 1440x780: 320px → 200px; at 390x844: 126px → 113px.
- Verified in Chromium at both sizes; `tests/guide-card.test.cjs` now also guards the two menu entries and
  the compact hero heights. Full suite **365/365**.

## 2026-11-21 — Language and currency switchers are icons

The owner asked for the header's `EN / MM` and `Ks / $` pills to become little icons.

- `components/SwitcherIcons.tsx` (new) holds the two hand-drawn 14x10 flags (Union Jack for English, the
  Myanmar tricolour with its white star), the currency icons (`Banknote` for Ks, `CircleDollarSign` for
  USD) and the label maps.
- `HeaderActions.tsx`: two 22px circle buttons that toggle on tap and show the **active** state in the
  icon itself, with `aria-label` + `title` naming the current value ("Language: English — switch to
  မြန်မာ") and `data-header-language` / `data-header-currency` for tests.
- `MobileNav.tsx`: the drawer's Language row shows both flags with `aria-pressed` and an accent ring on
  the active one; the Currency row keeps its label and the icon carries the state. `DollarSign` import
  dropped.
- This replaces the old rule ("never an icon"): that rule was about one icon that looked the same in
  every state. These icons change with the state, so the header still shows which language and currency
  are active — verified by clicking both in a real browser (flag flips to the Myanmar tricolour, the
  banknote flips to the dollar coin) and by the phone drawer screenshot.
- `tests/canvas-shell.test.cjs` now guards the icon contract (no letter labels, distinct flags, distinct
  currency icons, the data attributes and the toggles) plus the drawer. Full suite **366/366**.

## 2026-11-21 — Checkout reuses the address the customer already gave

The owner: "on /checkout, if the customer is signed in and has already entered an address, do not ask for it
again."

- `lib/delivery-address.ts` (new) keeps one complete delivery address per device
  (`mh-fashion-delivery-address-v1`), with `isCompleteAddress`, `readSavedAddress`, `saveDeliveryAddress`,
  `lastOrderAddress(orders)` (newest order this browser placed) and `addressSummary`.
- `CheckoutClient.tsx` hydrates the form once on mount from the saved address, falling back to the last
  order on the device, and shows a compact "Delivery address" card instead of the fields. `Change` opens
  the fields (already prefilled) and `Keep the saved address` puts the card back. A successful order
  re-saves whatever address was used, so a change sticks for next time.
- There is still no customer account on the server (`my-orders.ts`: "There are no accounts yet"), so the
  address lives on the device; when real accounts land, this prefill is the single place to read from.
- `tests/checkout.test.cjs` covers the lib and the card markers; `tests/storefront-e2e.cjs` now asserts
  that the second checkout shows the saved address with the fields closed (desktop and phone), and its
  `fillCheckout` clicks `Change` first. Full suite **367/367**, e2e PASS on desktop and phone.

## 2026-11-21 — MH Fashion category row is icons only

The owner: the "All MH Fashion 48 / T-Shirts 22 / Kids 9 / Phone Covers 7 / Bags 6 / Cups 4" strip on
`/mh-fashion` should be icons, like the home page, without the numbers.

- `app/mh-fashion/page.tsx`: the category nav is now six 44px round icon buttons (Sparkles, Shirt, Smile,
  Smartphone, ShoppingBag, Coffee) with the active one filled with the accent colour, exactly the shape of
  the home page strip. No labels and no counts are rendered; each link keeps `aria-label` + `title` and
  `data-category`, so it is still readable by a screen reader and by tests.
- The hard-coded counts were also dropped from the sidebar filter list (they were stale: the page can show
  "0 MH Fashion Products" while the list claimed 22 T-shirts) and the `count` field was removed from
  `CATEGORIES`.
- `tests/storefront-e2e.cjs` asserts six icon links, no text, an accessible name on each and 40-48px boxes.
  Full suite **367/367**, e2e PASS desktop + phone.

## 2026-11-21 — Ads module (banner photo / animation video), and Jersey moves into Posts

The owner: an **Ads** entry in the admin menu bar, jersey kept inside **Posts**, and — clarified the same day —
an ad is **only media**: a banner photo or an animation video, shown as the **home hero banner**.
("Plan ပြောင်းမှာပါ" — the plan will change later, so this is the current shape.)

### Ads (`/admin/ads`)
- `lib/admin-demo-data.ts`: `AdminAd` / `AdMediaType` / `AdSlotId`, two slots (`home-hero`, `home-strip`),
  the `ads` store field (older headline-based ads are dropped on read), `"ads"` in `AdminModuleId` /
  `ADMIN_MODULES`. `createSeedAds()` is empty — the artwork is the owner's.
- `lib/admin-ads.ts`: `adStatus` (Live / Scheduled / Expired / Disabled), `activeAdFor(slot)` (newest live ad,
  otherwise nothing), `validateAdDraft` (name, media URL — `/`, `https://` or a picked `data:image/…`, poster,
  description ≤ 120, optional link, window), `adFromDraft`, `upsertAd` / `toggleAd` / `removeAd`,
  `readImageFile` (≤ 900 KB picture → data URL, so a photo works before R2 is connected).
- `components/admin/AdminAds.tsx`: live/scheduled/slots-filled/videos totals, the ad table with a media
  thumbnail, the slot map, and a drawer with a Banner photo / Animation video switch, URL or file pick,
  optional poster for video, description, optional link, window and a live preview.
- `lib/storefront-ads.ts` + `components/AdSlotBanner.tsx`: the home page asks for `home-hero` and `home-strip`;
  a live ad renders as `<img>` or a muted looping `<video>`, inside a link only when a link is set. With no
  live ad the green hero and the normal page flow come back untouched.

### Jersey inside Posts
- `AdminJersey.tsx` exports `AdminJerseyPanel` (body only); Posts renders it under a **Jersey mapping** tab and
  reads `?tab=` through `useSearchParams` inside a `Suspense` boundary.
- The sidebar no longer lists Jersey; `/admin/jersey` redirects to `/admin/posts?tab=jersey`.

### Verification
- `tests/admin-ads.test.cjs`: statuses, slot picking, media validation (data URL only for photos), store round
  trip, empty seeds, nav/route, and that the home page mounts both banners with the image/video markers.
- `tests/storefront-e2e.cjs`: seeds a live hero ad, checks it replaces the hero without sideways scroll, then
  clears it and checks the green hero returns — on desktop and phone.
- Full suite **373/373**, `tsc` clean, ESLint 0 errors, build passed. Chromium: admin table + drawer with a
  picked photo, the photo as the home hero, the video branch (`<video autoplay muted loop playsinline>`), and
  hero + strip ads at 1440x1000 and 390x844.

### 2026-11-21 (later) — a few frames is enough
Owner: R2 gets connected later, and the animation does not need to be big — a few frames is enough.
So a short loop needs no video infrastructure at all:
- An animated **GIF/WebP** is just an image: it can be picked from the computer (≤ 900 KB), stored with the ad,
  and `<img>` loops it in place. Measured: a 6-frame 1600x600 hero GIF is **19 KB**.
- `looksAnimatedMedia()` / `adMediaKind()` label such an ad "GIF" in the table and "animated photo" in the
  preview, and the drawer says so under the media switch; the video option stays for when R2 is wired.
- Verified in Chromium: pick `hero-anim.gif` → drawer says "animated photo" → save → table shows GIF → the home
  hero renders it and two screenshots 260 ms apart differ inside the banner (it really animates).

### 2026-11-21 (later) — ready-made banners: fit the box or show the whole thing
Owner sent a template: `https://mnamin24.github.io/gifer-gif-animated-banner-template/images/728x90.gif`
(728x90, 2 frames, 32 KB). Pasting that URL works — it shows as **GIF** and loops in the hero — but a
728x90 leaderboard in a 1361x300 hero is cropped: "NEW BRAND" and "SAVE 25%" were cut off.
- `AdminAd.fit: "cover" | "contain"` (default `cover`), chosen with a **How it fits the box** select in the
  drawer; `AD_FITS` carries the wording.
- `contain` renders the artwork at its own aspect (`block h-auto w-full`) and drops the fixed height/aspect
  wrapper, so nothing is cropped and no letterbox bands appear: the leaderboard shows whole at 1350x167 in
  the hero and 358x44 on a phone.
- Verified with that GIF in both slots at 1440x900 and 390x844; suite 375/375, e2e desktop + phone pass.

### 2026-11-21 (later) — every banner place in one screen
Owner: slots are not on one page — home has three, /new has one, /guide has one, and more will come, so all of
them must be visible and editable together, each with its own name and place.
- `AD_SLOTS` (in `admin-demo-data.ts`) is now the single registry: `home-hero`, `home-strip`, `home-lower`
  (`/`), `new-top` (`/new`), `products-top` (`/products`), `guide-top` (`/guide`). `AdSlotId` is derived from
  it, so adding a place is one array entry plus one `<AdSlotBanner slot=… />`.
- `/admin/ads` is a **slot board**: one row per place with its page, position and size, the banner in it, its
  status and window, and Change / Pause / Clear in place; empty places offer **Add banner**.
- `adForSlot()` decides what the board edits (live → next scheduled → newest), while the storefront keeps using
  `activeAdFor()`, so a scheduled banner stays off the site.
- The guide rail was a 220px column; it became `guide-top`, full width above the articles.
- Verified in Chromium: 6 rows on the board at 1440 and 390 (no sideways scroll), and the banner renders on
  `/` (3), `/new`, `/products` and `/guide` (1136x140 desktop, 358x44 phone). Suite 377/377, e2e passes.

### 2026-11-21 (later still) — many banners per place, changing with time
Owner: a place should not hold a single banner but many, and the place should change banner by time.
- A place keeps every banner filed under it; the board row lists them all with Edit / Pause / Delete and an
  **Add banner** button that is always there, not only when the place is empty.
- `liveAdsFor()` is the set a place may show (enabled, inside its dates, oldest first). `adForMoment()` picks
  one: with a single live banner it simply stays; with several they take turns, and the turn index is
  `floor(now / period) % live.length` — a function of the clock only, so a reload does not restart the cycle
  and two visitors asking at the same moment see the same banner.
- The turn length is one setting on the Ads screen ("Change banner every N seconds", 4/6/8/12/20/30, stored as
  `adsRotationSeconds`, clamped 2-120), applied wherever a place has more than one live banner.
- `useStorefrontAd()` re-reads the store on `storage` and wakes up on the next turn boundary (not every second),
  so a page with one banner does no work at all.
- Verified in Chromium with three live hero banners and a 2 s turn: the hero cycled 3 → 1 → 2 without a reload
  while a place with one live and one paused banner never changed; no console errors.

### 2026-11-21 — Editor Adjustments: arrange, text styles, photo frames, swatches
The owner: the editor's Tools / Adjustments should be fuller on the design side.
- **Arrange** (new section, any layer): align left/centre/right and top/middle/bottom to the print
  artboard, centre on canvas, flip across, flip down, rotate 90°, rotate 180°, reset rotation, reset size,
  duplicate. Alignment recomputes the layer's canvas offset from its *painted* box (`placedLayerBounds`
  composes offset, scale and rotation), so a scaled or turned layer still lands flush, and pressing the
  same button twice does not drift it. The section also reads out rotation and size.
- **Text styles** (new section): Neon, Sticker, Retro, Chrome, Outline, Shadow, Echo, Striped. Each is only
  an effect stack (`EDITOR_TEXT_STYLES` → `textStyleEffects`), so the layer stays live text and the stack
  stays editable, reorderable and removable.
- **Frame** (new section, photo layers): corner radius and border width/colour, painted *inside* the image
  box so the transform outline keeps hugging the photo. `EditorImageContent` gained `cornerRadius`,
  `borderWidth`, `borderColor`.
- **Brand swatches** beside the colour pickers for text, shape fill, shape stroke and the photo border
  (`EDITOR_DESIGN_SWATCHES`), so a design stays on palette without a colour wheel.
- Verified in Chromium at 1440 and 390: align right puts the outline's right edge on the artboard edge
  (866 px = 866 px), centre lands at dx 0 / dy 0, flip reads -100%, reset size 100%, duplicate adds a
  layer, and Neon writes two Glow effects that paint on the canvas. Phone: panel 256 px, buttons 44 px, no
  sideways scroll. Suite 386/386, tsc clean, ESLint 0 errors, e2e desktop + phone pass.

---

## 19. System architecture and operations *(owner request 2026-11-21: strengthen the system side)*

Sections 1 to 18 plan what the shop **does**. This section plans what **runs** it: where each piece lives,
who owns each piece of data, how it is configured, deployed, watched, backed up and recovered. Every block
below has the same three parts — **Now** (what the repository actually contains, checked 2026-11-21),
**Target** (what it must be before real customers and real money), and **Acceptance** (the check that proves
it, written so a command or a test can fail).

Nothing here is approved to start except the items the register (§16) already lists; this section states the
requirement, and each block names the register item that owns it.

### 19.1 Runtime topology — what runs where

**Now.**

| Concern | Where it lives today | Binding / file |
| --- | --- | --- |
| Web app | Next.js 16 App Router, built by OpenNext into a Cloudflare Worker | `apps/web/wrangler.jsonc` → `.open-next/worker.js` |
| Static assets | Worker `ASSETS` binding from `.open-next/assets` | same file |
| Worker logs and metrics | `observability.enabled: true` (Cloudflare dashboard only) | same file |
| Catalogue, guide, search, search misses, staff roles | Supabase Postgres + RPCs, migrations `0001`–`0012` | `SQL/` |
| Asset service | a second Worker that answers asset JSON | `Worker/assets.ts`, `.github/workflows/deploy-assets-worker.yml` |
| Object storage | **nothing bound yet** — both R2 bindings are commented out | `apps/web/wrangler.jsonc` (commented) |
| Rate-limit counter | **module memory** (per isolate) until the KV namespace exists and is bound | `lib/rate-limit.ts` → `RATE_LIMIT_KV` |
| Admin data: orders, products, stock, posts, prices, promotions, designs, customer accounts, contact messages, ads, settings | the customer's own browser, `localStorage["mh-fashion-admin-demo-data-v1"]` | `lib/admin-demo-data.ts` |
| Cart, wishlist, customer session, crash log | browser, own keys | `lib/cart-store.ts`, `lib/wishlist.ts`, `lib/customer-session.ts`, crash log |

Two consequences follow, and both are visible to the owner: **an order exists only in the browser that placed
it**, and **the admin workspace is empty on a new device**. That is a property of the topology, not a bug to
paper over.

**Target.** One owner per concern, and no row above may say "the browser" except drafts, cart and wishlist.
Money, orders, stock, posts and prices live in Supabase; pictures and design files live in R2; counters live in
KV; the browser keeps only what is disposable — a design draft, the cart, the wishlist, the theme, the
language.

**Acceptance.** This table is kept current and read in review. Any row whose "today" column has not changed is
a known gap, and a new feature may not add a new browser-owned store of business data.

### 19.2 Data model and the one-way migration

**Now.** The shapes exist in TypeScript (`AdminOrder`, `AdminTshirtPost`, `AdminProduct`, `PriceRow`,
`AdminDesign`, `AdminPromotion`, `CustomerAccount`, `ContactMessage`, `AdminAd`, `AdminSettings`) and in
`localStorage`. The database holds the catalogue, guide, search and staff-role tables only. Nothing migrates
one into the other, and the demo seed rebuilds itself in any empty browser.

**Target.**

- Tables mirror the TypeScript shapes one for one (P0-1), `tshirt_posts.category` and its tags included, so no
  field is invented at the edge.
- Ids are stable and shared: a post's product link, a product's size chart and the Price Table all use the
  **same** `products.id` the catalogue serves, or none of them line up (the size chart already waits on this).
- `orders.checkout_key` is a **unique index**. The client already sends the key; unique is what makes a double
  submit safe at the database, not only inside `placeOrder`.
- Money is an integer in Ks (never a float), every timestamp is a UTC ISO string, and text a person typed is
  length-capped in the database as well as in the form.
- The demo seed writes only into a database it can prove is empty (`settings.dataset = 'demo'`), so it can never
  overwrite a shop that has traded.
- Deletion is soft wherever money or printing touched the row (designs, orders, price history): a `deleted_at`
  column, never a `DELETE`.

**Acceptance.** A migration runs from an empty database to the full schema; running it twice is a no-op; the
seed refuses a non-empty dataset; a duplicate `checkout_key` insert leaves exactly one order.

### 19.3 Identity and authorization — the system, not the checkboxes

**Now.** Two independent, browser-local identities: the admin demo session, and the customer account with a
salted PBKDF2 hash in `localStorage` (§4.5.8, §4.5.9). No server route reads either one, so **every `/admin/*`
page is public HTML to anyone who types the URL**, and the numbers on it are that browser's own data. Module
permissions are drawn as checkboxes and enforced only by the page that draws them.

**Target.**

- **Customers** use Supabase Auth: email and password, verified email, reset by email. The local PBKDF2 hash
  cannot be exported, so the honest migration is that each customer sets a password **once** on their first
  sign-in after the switch. The owner should be told before it happens, because customers will see one extra
  step.
- **Staff** use Supabase Auth too, with a `staff` row carrying the module list; a claim or a lookup puts the
  role in the token. The Super Admin creates staff exactly as today, but the record survives the device.
- Every server route resolves the caller through **one** helper and compares it with a per-route rule; the
  matrix of route × caller (anonymous, customer, staff) is written down here and in the tests.
- RLS is the floor, not the ceiling: the catalogue is public read; an order is readable by its owner or by
  staff; posts and prices are staff-only to write; `contact_messages` is insert-only for the public and
  readable by staff.
- The demo session survives only as an explicit preview mode that cannot write to Supabase, or it is removed.

**Acceptance.** A test signs in as the three callers and calls every route expecting the matrix's answer; any
unexpected 200 fails. Visiting `/admin/orders` while signed out redirects or returns 401, not a table.

### 19.4 Secrets and configuration

**Now.** The variables the code actually reads, and what stops working without each:

| Variable | Scope | Read by | Without it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | catalogue, search, guide, assets | empty catalogue; the search panels say "not connected" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | same | same |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | `/api/admin/search-misses` | search-miss panel reports "not connected" |
| `PAYMENT_WEBHOOK_SECRET` | **secret** | `lib/payments.ts` | the mock secret is used and a real provider callback is rejected |
| `PAYMENTS_ALLOW_MOCK` | server | `/api/payments/simulate` | mock callbacks stay **on** — set `0` in production |
| `NEXT_PUBLIC_MH_DELIVERY_URL` | public | delivery quote client | quote answers from the shop's own fee table |
| `MH_DELIVERY_TOKEN` | **secret** | `/api/delivery/quote` | same fallback, with the reason printed |
| `NEXT_PUBLIC_SITE_URL` | public | structured data, canonical | relative URLs only, no canonical origin |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | public | asset URLs | placeholders instead of pictures |
| `NEXT_PUBLIC_CONTACT_EMAIL` | public | footer, contact page | the built-in address is used |
| `RATE_LIMIT_KV` | **binding** | `lib/rate-limit.ts` | the limiter is per isolate |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | **Actions secrets** | the two deploy workflows | the deploy stops at its first step |

**Known drift, fix with the next configuration change:** `apps/web/.env.example` still names
`MH_DELIVERY_API_URL`, `MH_DELIVERY_API_KEY`, the S3-style `R2_*` quartet and three AI keys the code never
reads, and it is missing `PAYMENT_WEBHOOK_SECRET`, `PAYMENTS_ALLOW_MOCK`, `NEXT_PUBLIC_MH_DELIVERY_URL`,
`NEXT_PUBLIC_R2_PUBLIC_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`. A person following it would configure the wrong
names and discover it only when payments or delivery fail.

**Target.** The example file is generated from this table, or checked against it by a test; Worker secrets go
in through `wrangler secret put` and never into `wrangler.jsonc`; the deploy secrets are the only ones GitHub
holds; rotation is one paragraph — change the value in both places, redeploy, revoke.

**Acceptance.** `tests/env-example.test.cjs` fails when a name is read by the code but absent from
`.env.example`, or listed there and never read.

### 19.5 The pipeline

**Now** (`.github/workflows/deploy-cloudflare.yml`, on a push to `main` that touches `apps/web`,
`package*.json` or the workflow itself): secret presence check → checkout → Node 22 with the npm cache →
`npm ci` → `npm audit --omit=dev --audit-level=moderate` → five suites (`guide`, `browser-guards`,
`canvas-spec`, `canvas-shell`, `guide:http` against a local server) → `next build` → `tsc --noEmit` →
`cf:build` → `wrangler deploy --dry-run` → `wrangler deploy`. A second workflow deploys the asset Worker; a
third copies the buckets weekly and needs five further secrets.

**Gaps, in the order they matter.**

1. **The suite that exists is not the suite that runs.** 1001 tests live in `tests/*.test.cjs`; CI runs five
   named files, so everything written since those five were chosen merges unverified.
2. ESLint never runs in CI, although the repo counts "ESLint 0 errors" as part of done.
3. Nothing probes the deployed Worker, so a deploy that answers 500 everywhere is still a green run.
4. There is no rollback step and no record of which Worker version a run deployed.
5. No preview deployment: a branch cannot be looked at before merge, so layout work is verified locally only.

**Target.** A `main` push runs install → audit → the **full** `node --test tests/*.test.cjs` → lint → tsc →
build → HTTP tests → `cf:build` → dry-run → deploy → **smoke**, where `/`, `/nyein`, `/products/<a known
slug>` and `/admin/login` must return 200 and the workflow fails naming the URL it probed. A failed build or
smoke leaves the previous version serving, and the run records the Worker version it deployed.

**Acceptance.** Break one page on purpose; the pipeline must go red **after** the deploy, not green.

### 19.6 Edge security policy

**Now.** No security headers are set: there is no `middleware.ts`, and `next.config.*` carries only
`images.remotePatterns`. The site is served with the platform defaults.

**Target.** Response headers, set once at the edge: `Strict-Transport-Security`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` limited to what the editor
uses, `frame-ancestors 'none'`, and a CSP whose directives name what actually loads — the Supabase host in
`connect-src`, `data:` and `blob:` in `img-src` (every design preview and uploaded photo is a data URL), the R2
public host once it exists, `'self'` for scripts. Inline styles must be allowed for the canvas geometry, or that
geometry has to move off inline styles first.

**Acceptance.** `tests/security-headers.test.cjs` asks a running server for `/` and asserts each header, so a
framework upgrade cannot silently drop them.

### 19.7 Abuse control

**Now.** `enforceRateLimit` guards `payments/intent`, `payments/status`, `payments/simulate`,
`payments/webhook`, `uploads` (40 a minute) and `delivery/quote` (30 a minute); the counter is per isolate
until the KV binding exists. `search/suggest` and `admin/search-misses` are unguarded.

**Target.** Any unauthenticated route that writes, costs money, or queries with a user-supplied string carries
a limiter, and its test fails when the limiter is removed. Uploads keep verifying the signed-in user and letting
the bytes decide the type, as they already do.

**Acceptance.** `lib/rate-limit.ts` lists every guarded route, and a test imports the route modules and fails
when a route is missing from the list.

### 19.8 Observability and incident handling

**Now.** Worker observability is on, so Cloudflare keeps request logs and metrics. The client crash log is
written to `localStorage` and never leaves the device (P2-15 records that gap). There is no uptime check, no
alert to the owner, and no written runbook.

**Target.**

- A server-side crash sink, so a crash on a customer's phone reaches the owner.
- An uptime check on `/` and `/nyein` every five minutes, alerting the owner's own channel — a Telegram bot
  message is the cheapest option that works on a phone in Myanmar.
- A runbook in `Doc/DOCUMENTATION.md` with four short playbooks: **site down** (check the Worker deployment,
  `wrangler rollback`, re-run the smoke), **bad deploy** (name the last good version, roll back, fix forward),
  **payments silent** (webhook secret, replay window, the recorded event), **R2 403** (binding name, bucket
  policy, clock skew on a signed URL).
- A stated log-retention window, so nobody assumes last year's logs exist.

**Acceptance.** One named person, one channel, one page; the runbook commands are copy-pasteable and have been
run once.

### 19.9 Backup, restore, retention

**Now.** Supabase takes its own daily backup on whatever plan the shop pays for (unverified from here). The R2
copy workflow exists and is **not armed** — it needs five secrets. Browser data has no backup and needs none,
because it is demo data today.

**Target.** A restore that has been **performed once**, not merely planned: one table and one object restored
into a scratch project, with a date and a note. Retention stated per class — temporary uploads 30 days
(`tmp/`), order and print files kept for the period the shop's accountant names, design drafts until the
customer deletes them, contact messages twelve months — and implemented by the bucket lifecycle rules §12.2.7
already decided.

**Acceptance.** A dated line in `Doc/DOCUMENTATION.md`: what was restored, from when, into where, how long it
took, and what came back missing.

### 19.10 System defects found in this pass *(2026-11-21, all open)*

| # | Defect | Why it matters | Smallest fix | Owner item |
| --- | --- | --- | --- | --- |
| S1 | `GET /api/admin/search-misses` checks only that the service-role key exists, never who is calling | Anyone who learns the URL reads the search terms customers typed and found nothing for | Require a staff session (P0-2); until then return 401 unless a server-only token matches | P0-2 |
| S2 | CI runs five test files, not the 1001-test suite; ESLint never runs | Most of what ships has never been run by CI | Add the two steps in §19.5 | P0-3 |
| S3 | No security headers | A defect that stays invisible until it is exploited | §19.6 | P1-12 (new) |
| S4 | `apps/web/.env.example` names variables the code does not read and omits five it does | A setup that looks right and silently loses payments and delivery | Regenerate it from §19.4 | P1-13 (new) |
| S5 | R2 and KV bindings are commented out in `wrangler.jsonc` | Uploads have nowhere to land; the rate limiter resets per isolate | Create the namespace and the buckets, then uncomment | P1-9 |
| S6 | No post-deploy smoke and no rollback step | A green run can mean a broken shop | §19.5 | P0-3 |
| S7 | `/admin/*` is public HTML with browser-local data behind it | The owner may read a dashboard that is not the shop's | P0-1 and P0-2; until then the preview banner must stay | P0-1 |

The two register items this section adds:

- **P1-12 Security headers and a content policy** (§19.6): the five headers plus a CSP that still lets the
  canvas, data-URL previews and fonts work, with a test that fails when one of them disappears.
- **P1-13 Configuration truth** (§19.4): `.env.example` matches the names the code reads, checked by a test,
  and the Worker secret list matches it name for name.

---

<a id="part-ii--editor-plan"></a>
## Part II — Editor plan (`/create`)

**Status: as built, changed only on the owner's word.** This part records what the editor code does, what it
does not do, the work that could come next, and the order of work. It is a plan: nothing in it changes behaviour
by itself, and an item starts only when the owner says so (items marked done or approved are released).

**Where it sits (owner, 2026-11-23):** `Plan/` holds one file, this one. Part I is the project plan and Part II is
the editor plan. This replaces the 2026-11-21 instruction to keep the editor plan in a separate file. The rule that
the plan is written from the code, not from other products' editors, still stands. The behaviour documentation is
`Doc/EDITOR.md`, written from the source. Section numbers in this part are written II.1, II.2 and so on, so they
cannot be confused with Part I.

**Checked against the source on 2026-11-21** in `apps/web/src`, and refreshed on 2026-11-22 against `main` after the
commits that added per-tool option boxes, text styles, 3D text materials, the effects gallery, the brush pack
folder, keyboard undo, the resolution warning, flip, the Shape Builder booleans and the design download.

### II.1 Where the editor lives

| Piece | File | Lines |
|---|---|---|
| Route shell: site header, Header Bar 2, workspace | `app/create/page.tsx` | 29 |
| Canvas: tools, selection, layers, mockups, undo | `components/EditorCanvas.tsx` | 3,157 |
| Layer model, text metrics, shapes, gradients, masks | `lib/editor-layers.ts` | 2,044 |
| Layers box | `components/EditorLayersPanel.tsx` | 355 |
| Adjustment box | `components/EditorAdjustmentsPanel.tsx` | 676 |
| Tool bar | `components/EditorToolsBar.tsx` | 330 |
| Header bar: Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size, price, Save, Buy | `components/EditorHeaderBar2.tsx` | 386 |
| Edit sidebar | `components/EditorEditSidebar.tsx` | 338 |
| Layer painting | `components/EditorArtworkLayers.tsx` | 332 |
| Layer thumbnails | `components/EditorLayerPreview.tsx` | 364 |
| Photo adjustments | `components/EditorPhotoAdjustments.tsx` | 261 |
| Mockup mirror of the artwork | `components/MockupArtwork.tsx` | — |
| Pen path geometry | `lib/editor-pen-path.ts` | 198 |
| Transform maths | `lib/editor-transform.ts` | 132 |
| Canvas spec | `lib/editor-canvas-spec.ts` | 9 |
| Artwork tiers | `lib/editor-artwork-tiers.ts` | 38 |
| Upload limits and compression | `lib/editor-upload.ts` | 101 |
| Price table | `lib/editor-price.ts` | 45 |
| Product and GSM defaults | `lib/editor-product.ts` | 4 |
| Print attributes | `lib/editor-attributes.ts` | 72 |
| Design library placeholder | `lib/editor-design-library.ts` | 181 |

### II.2 What works today

Checked item by item in the source.

| Area | State |
|---|---|
| Print canvas | 4500 × 5400 px at 300 dpi, transparent, blank on open, frozen spec; the element lays out at 900 × 1080 (`PRINT_CANVAS_BACKING_SPEC`) because nothing is drawn into its bitmap, and the print size stays in the spec and the `data-canvas-*` attributes |
| Workspace | pasteboard around the canvas, zoom 0.25×–3×, pan by wheel / Space / Hand tool, grid toggle |
| Tools | Move, Hand, Pencil, Pen, Text, Brush, Eraser, Shape, Gradient; options normalised on load |
| Tool options | every tool has a `Tool Options · <tool>` box at the top of the Adjustments panel (Brush/Pencil, Eraser, Pen, Text, Shape, Move, Gradient); a box writes one field at a time and merges into the stored settings |
| Layers | five kinds; drag reorder; folders with nested children; rename, hide, lock; opacity, fill, blend mode; duplicate, delete |
| Groups and links | group/ungroup with folder rows; link/unlink as transform membership |
| Masks | non-destructive mask strokes (black hides, white reveals), painted with the brush, add/remove, thumbnail |
| Eraser | brush mode and whole-stroke mode, stored as erasure passes, clearable |
| Selection | content-derived box, eight resize handles, rotate handle, hit radius scaled to the box, 15° rotation snap |
| Move | pick-and-drag, group drag, linked drag, arrow-key nudge, layers can be parked off-canvas and still grabbed |
| Text | inline editor with wrapping, caret panning, per-layer styling, a font picker fed by the R2 manifest (search, recents, shelves) with the eight system fonts as fallback, each name painted in its own face, an effect stack of thirteen kinds (shadow, outline, glow, offset, echo, extrude, stripe, blur, gradient, pattern, hollow, bevel, gloss), three decorations, Plain/Arch/Wave warp (Arch and Wave are slants, see II.4) |
| Text styles | 31 one-click looks on Classic, Fill and 3D shelves (including Chrome 3D, Gold, Ice, Lava, Balloon, Jelly, Wood, Marble, LED); every tile and every effect row paints its own live preview through the canvas renderer; a style only writes an effect stack, so every part stays editable |
| Text bounds | ink-based, grows with effects and decorations; verified to ≤1.1 px in browser frame differencing |
| Shapes | nine presets, stroke/fill/line style/rounding/shadow/glow, builder select/merge/subtract/intersect/exclude over any path data (`booleanPathData`), not just rectangles |
| Pen | anchors with Bézier handles, drag handles (Alt breaks symmetry), insert and remove nodes, finish with Enter, discard with Escape |
| Brush | per-tool options box: preset chips painted as rows of dabs, nib (tip, size, angle, roundness), paint (opacity, flow, spacing, smoothing), edge (softness, feather), shape dynamics (size, opacity, angle and roundness jitter, scatter, fade-out), dab blend, reset; strokes smoothed as drawn |
| Gradients | five types, up to eight stops, presets, on-canvas axis, thumbnails |
| Images | client-side compression (2 MB, 2000 px), nine photo-adjustment groups, non-destructive values, masks |
| Mockups | Front and Back boxes with connectors, artwork mirror clipped to the print area, independent overlay transforms, shared 3500 px tier |
| Header Bar 2 | eight selection boxes (Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size), live price; Save and Buy disabled |
| Edit sidebar | Designs, Elements, Photos, Patterns, Text, Uploads, Image Create; rail stays visible; additions land in the Layers box; Photos and Patterns are placeholders and code-made until their R2 libraries exist (E10) |
| Browser draft | the layers are written to `localStorage` (`mh-fashion-design-draft-v1`) 400 ms after a change; `/create` restores them on load and says "Restored the design from your last visit"; a design-editable product page renders that draft too |
| Undo / redo | 30 snapshots of the layer list, covering paint, pen, shape and gradient edits plus add, delete, duplicate, rename, reorder, group, mask and visibility/lock toggles; Ctrl+Z / Ctrl+Shift+Z (⌘ on macOS) through `lib/editor-shortcuts.ts`; viewport, mockup overlay and the opacity/fill sliders stay outside it |
| Download | "Download my design" saves a 38.1 × 45.72 cm SVG (300 dpi PNG too) with the used fonts inlined as base64 `@font-face` rules |
| Fonts | the picker reads `fonts/manifest.json` from R2 (`lib/editor-fonts.ts`, `lib/editor-font-library.ts`); bad entries are skipped by name; the eight system fonts stay the fallback |
| Flip | horizontal and vertical, about the selection's own centre (`flipLayerPlacement`); the buttons sit in the Tools bar today and move to the Adjustments panel (E22) |
| Hover | the canvas outlines the layer under the pointer and the Layers row highlights with it |
| Image resolution | a photo that would print below the press resolution is flagged in the Photo panel (`lib/editor-image-ppi.ts`) |
| Phone | 44 px targets, Pan view mode, view-only zoom, second finger cannot hijack a gesture, no panel overlap; 25 layers, the 30-step undo floor and a portrait→landscape rotation are covered by `denseDesign()` in `tests/editor-touch.cjs` |

### II.3 Contracts that must not drift

Each of these was a real defect once. Keep them when changing the editor.

1. A text transform box hugs the painted ink plus effects and decorations, never the font line box.
2. A pure text layer gets no grab margin; strokes, shapes and images get 18 units.
3. `editorTextLines` is the only source of painted lines.
4. The inline editor's box follows the wrapped line count, not the newline count.
5. Handle hit radius scales with the box; the rotate handle stays clear of the resize handles.
6. Move, resize and rotate use the unclamped point; drawing tools stay on the canvas.
7. A press on the selection re-picks a different layer underneath before dragging.
8. Mockup artwork is clipped to the print area.
9. Print geometry (4500 × 5400 px, `unitsPerCm`, layer records) is a contract with the press.
10. The shared header's language and currency pills always show the active option.
11. A new text effect kind needs a default in `effectSample` and `EffectTile`, or its tile paints empty; the renderer and the bounds share `editorTextEffects` and `editorTextPaintPadding`, so a new kind must extend the padding too.

### II.4 Verified gaps

What the code does not do, with the evidence.

| Gap | Evidence |
|---|---|
| No Save, and no design outside the browser | Save and Buy are `disabled` in `EditorHeaderBar2`. The browser draft is restored on load (`readDesignDraftSnapshot` in `lib/design-draft.ts`), but nothing reaches a database, `clearDesignDraft` is never called, and `/create` ignores the `?product=` it is given. Waiting on decision D1 |
| No design hand-off to an order | the editor never writes a design; the admin order record is built from the demo store, not from `/create` |
| Undo is layer-only | `undoStack`/`redoStack` hold `EditorArtworkLayer[][]`; viewport zoom/pan, the mockup overlay transforms and the opacity/fill sliders are outside it, so those changes cannot be undone |
| Every layer can be deleted | `deleteEditorLayer` filters the list without a floor, so deleting the last layer leaves an empty design. Add layer recovers it, and since 2026-11-22 a stroke on the empty design says "Add a layer before drawing." (it used to return silently). Owner decision still needed: keep one layer, or leave it deletable |
| Arch and Wave do not bend text | `editorTextPresetMatrix` returns one shear matrix for the whole text block (6° for Arch, 4° for Wave); no glyph follows a curve. The `circle` option is no longer offered and survives only as a legacy stored value |
| No Myanmar font until the bucket is filled | the picker reads `fonts/manifest.json` from R2 and falls back to the eight system fonts, but the shop has not uploaded a manifest yet, so today's list is still Inter, Arial, Georgia, Impact, Courier New, Trebuchet MS, Verdana and Times New Roman |
| Brush packs are a contract only | `public/brushes/README.md` defines `brushes.json` and tip files, `brushes.json` is empty, and no code reads it |
| No stylus or finger pressure | no `pressure` in the source |
| No eyedropper | none in the source |
| No tool shortcut keys beyond undo/redo | `lib/editor-shortcuts.ts` maps Ctrl/⌘+Z and Ctrl/⌘+Shift+Z; the other shortcuts are Space, arrows, Enter and Escape; no tool letters and no brush-size cursor |
| No align or tidy control | `lib/editor-align.ts` (`alignOffset`, `tidyDeltas`) and its 8 unit tests exist, but no panel control calls them: the target area waits on the per-mockup design-area decision |
| No positional snapping | only `snapEditorRotationDelta` (15°); no guides, no edge or centre snapping |
| No context menu | no right-click menu on the canvas or the Layers box |
| No glyph, uppercase or ligature controls | none in the text controls |
| Styling is per text layer | one font, size and colour for the whole layer |
| Only two products | Hoodie, Cup, Kids and Bag are disabled; product and GSM do not change the mockup art or the price table beyond what `editor-price.ts` lists |
| Design library is a placeholder | `DESIGN_LIBRARY_STATUS = "pending-r2-endpoint"` |
| Image Create has no pipeline | the prompt field exists; nothing generates or inserts an image |
| No artboards | one print canvas plus mockups |
| Phone verified by emulation only | `tests/editor-touch.cjs` runs Chromium with touch emulation |
| Header choices are fixed in code | `lib/editor-attributes.ts` holds the option lists (Print Method, Fabric Type, Knit Structure, MH Cuttings) and the narrowing rules as constants, as its own header comment says; the admin attribute chain (`lib/admin-attributes.ts`, `AdminAttributes.tsx`) is edited separately and the editor does not read it |

### II.5 Plan — next steps

Ordered by what the shop needs first. Each item is a separate decision: the editor is final as built, so
the owner approves an item before it starts.

| # | Item | Why | Files | Size |
|---|---|---|---|---|
| E1 | Save the design, then hand it to the order | Save and Buy are dead buttons, the browser draft is never restored, and no order carries the artwork | `EditorHeaderBar2`, `EditorCanvas`, `lib/design-draft.ts`, the order payload | large |
| E2 | Real-phone QA — **source half done 2026-11-22** (the Edit-sidebar crash is fixed and the suite passes 16/16; the canvas is bounded to 972k px; items 5–7 verified in emulation) | phone is the shop-floor tool; the known test failure hides regressions | `tests/editor-touch.cjs` | small |
| E3 | Settle the `circle` preset — **done 2026-11-22** | a control that does nothing reads as a bug | `lib/editor-layers.ts`, `EditorAdjustmentsPanel` | small |
| E4 | Align to the print canvas, tidy spacing | layers are placed by eye; alignment is the most-requested layout help | new `lib/editor-align.ts`, panel controls | medium |
| E5 | Flip horizontal and vertical — **done 2026-11-22; moves out of the Tools bar into the Adjustments panel (owner, 2026-11-22, see E22)** | mirrored artwork is a normal request for a print shop | `lib/editor-transform.ts`, `EditorToolsBar`, Adjustments panel | medium |
| E6 | Snap guides while dragging | free placement drifts off the print area | `EditorCanvas` drag paths | medium |
| E7 | Hover highlight between canvas and Layers — **done 2026-11-22** | finding the row for a shape on a busy canvas is slow | `EditorCanvas`, `EditorLayersPanel` | small |
| E8 | Shape Builder for `exclude` and arbitrary paths — **done 2026-11-22** | the builder only merges rectangles today | `lib/editor-path-boolean.ts`, `applyEditorShapeBuilderOperation` | medium |
| E9 | Enable the remaining products | Hoodie, Cup, Kids and Bag are visible but dead | `EditorHeaderBar2`, mockups, `editor-price` | medium |
| E10 | Connect the sidebar library and image generation | Designs, Elements, Photos, Patterns and Image Create are placeholders or hand-written lists | `editor-design-library`, R2 endpoint, image service | large |
| E11 | Per-character styling, glyphs, artboards | only if the catalogue needs them | text model migration, renderers, export | large |
| E12 | Required selections before Buy | an order must carry every choice; Save stays open | `EditorHeaderBar2`, new gate helper, order payload | small |
| E13 | Keyboard Undo / Redo — **done 2026-11-22** | desktop users expect Ctrl+Z; only the tool-bar buttons exist | `lib/editor-shortcuts.ts`, `EditorCanvas` | small |
| E14 | Image resolution warning — **done 2026-11-22** | a photo enlarged past what the press can print sharply is only discovered after printing | `lib/editor-image-ppi.ts`, `editor-layers`, `EditorCanvas`, Layers box, Adjustment box | small |
| E15 | Header choices come from the admin dashboard | the shop must be able to change, add and remove the choices behind the header boxes without a code change | `lib/editor-attributes.ts`, `lib/admin-attributes.ts`, `EditorHeaderBar2`, `AdminAttributes` | medium — **step 1 done 2026-11-22** (one vocabulary); the admin-driven chain still waits for the database |
| E16 | Download my design — **done 2026-11-22** | the customer had no copy of the artwork; the press bundle was the only file | `lib/design-export.ts`, `EditorDesignExport`, `EditorToolsBar` | small |
| E17 | Font library, including Burmese fonts — **approved 2026-11-22; steps 1–5 done** (manifest picker, download embedding, upload check, list previews, and 2026-11-24 the editor reading `/api/assets/fonts` with the public file as fallback); the press bundle waits on E1 | eight system fonts and no Myanmar font; the printed font depends on the device | `EditorAdjustmentsPanel`, font loading, R2, design export, print export | medium |
| E18 | Text effects, round 2 | more looks and finer control for the effect stack | `editor-layers`, `EditorLayerPreview`, `EditorAdjustmentsPanel` | medium |
| E19 | A real text bend — **approach decided 2026-11-22** (outline warp with HarfBuzz) | Arch and Wave only slant the text | `editor-layers`, `editor-fonts`, renderer, bounds, print | medium |
| E20 | Brushes, round 2 | brush packs, pressure, stabiliser and a size cursor | Brush box, `public/brushes`, `EditorCanvas` | medium |
| E21 | Tool adjustments, polish | numeric entry, reset, shortcuts, eyedropper (**done 2026-11-26**), richer Pen and Shape boxes, phone layout | `EditorAdjustmentsPanel`, `EditorToolsBar`, `EditorCanvas` | medium |
| E22 | Adjustments panel: complete, compact and beautiful | the panel has no numeric position or size, no align, flip or rotate, no colour system, and every label is 9 to 10 px | `EditorAdjustmentsPanel`, `EditorPhotoAdjustments`, `EditorToolsBar`, shared controls | large |
| E23 | Design areas per mockup | align, snap and the outside-the-area warning need to know where artwork may go | admin, mockup `meta.json`, `EditorCanvas`, `lib/print-quality.ts` | medium |

#### II.5.1 Order of work  *(set 2026-11-23)*

| Phase | What | Needs first |
|---|---|---|
| 0 — ready now | E22 visual mock-up for the owner; E17 read-only service for fonts and the `outline` field; E21 items that do not need new controls; E2 real-device pass; the E12 notice logic and the "which selections are missing" function (Buy stays disabled) | nothing |
| 1 — accounts | E1 (a) to (c): `0008` migration, Save, My designs, private photos; admin writes and the issues panel of the asset service | Supabase Auth and a server-side admin check |
| 2 — payment | E1 (d) and (e): Buy, the E12 gate live, the order snapshot, the press bundle from the snapshot | the payment and order work |
| 3 — owner inputs | E23 design areas, then E4 and E6; the font shelf with licences (E17); brush tips (E20); the Hoodie data (E9) | the inputs listed below |
| 4 — polish | E22 build, E21, E19 (bend), E18 (effects), E20 (brushes) | E22 shared controls, E17 `outline` files |

Dependencies that decide the order: E19 needs the `outline` font files from E17; E21 reuses the controls E22 builds;
E9 needs E15; E4 and E6 need E23; E1 (d) needs E12 and payment.

#### E1 — Save and order hand-off

- Restore the draft the editor already writes, so a reload continues the same artwork, then make Save
  write the design (layers, canvas, product, GSM, colour, size, price) somewhere it survives a browser
  change; Buy turns the same payload into an order line.
- Acceptance: reload keeps the artwork; a placed order shows the design in the admin order view with the
  print sheet and mockups; a browser with storage disabled shows a clear message instead of losing work.
- Blocked on the decision in II.6 D1 (where the design lives) and on the payment/order work.
- **Step 1 done 2026-11-21: the draft is restored on load.** `lib/design-draft.ts` stores each layer's
  move/scale/rotate beside the layers (`readDesignDraftSnapshot`), `EditorCanvas` restores it after mount
  and shows "Restored the design from your last visit", and a browser that refuses storage says so once.
  Reload keeps the artwork; the order hand-off and Save still wait on D1.
- **A refused draft write is now covered (2026-11-22).** `storageRefused` makes `setItem` throw a
  `QuotaExceededError` for the draft key only, adds a layer, and reads the `role="status"` text: the
  editor says "This browser is not saving your design. Keep this tab open until you order." It then
  restores `setItem` and checks the next change writes the draft again. The message already worked;
  nothing in the suite asserted it, so a silent regression could have shipped.
- **Bug fixed 2026-11-22: a corrupt draft blanked the editor.** Reading the draft back put whatever was in
  `localStorage` in front of the renderer, so three shapes killed `/create` with "This page couldn't load"
  until the visitor cleared storage: a `null` layer (`Cannot read properties of null (reading 'strokes')`),
  a stroke whose `points` was not a list (`e.points.map is not a function`), and a shape path of `null`
  (`Cannot read properties of undefined (reading 'flatMap')`). `readDesignDraftSnapshot` now runs every
  layer through `sanitizeDesignDraftLayers`: a layer without an id, or whose declared kind has no usable
  content, is dropped; unusable strokes and shape paths are dropped and the rest of the layer is kept;
  numbers are coerced and clamped; an unknown kind from an older build is treated as plain artwork. A
  layer that paints nothing is still kept, because that is the editor's own blank layer. Verified with
  ten corrupt drafts in Chromium (every one now opens the canvas with no console error) and
  `tests/design-draft.test.cjs` (3 new tests, 10 in the file).

#### E1 — design of the saved design and the order hand-off  *(decided 2026-11-23)*

What exists: a table `user_designs` (`user_id`, `product_id`, `canvas_state jsonb`, `mockup_attach_status`) and
`order_items` (`design_id`, `attribute_selection`, `design_svg_url`, `placement_coordinates`). Neither has been
used by the editor yet, and the editor's draft is browser-only.

1. **Saved design (migration `0008_saved_designs.sql`).** `user_designs` gains `name`, `garment`
   (`t-shirt` or `phone`; the editor works on a garment, not a catalogue product, so `product_id` becomes
   optional), `selections jsonb` (the header choices, including Fit Type when it is on), `schema_version`,
   `thumbnail_key`, `size_bytes`, `updated_at` and `deleted_at`. `canvas_state` holds
   `{ schemaVersion, canvas: { width, height, dpi }, layers, placements }`. `mockup_attach_status` is left
   unused. The number of designs per customer is capped by the existing "Max saved designs" setting in
   `platform_settings`.
2. **No pictures inside the row.** Today an image layer carries its photo as a data URL, which is too large for
   a row and for browser storage. Before a design is saved, each photo is sent to private R2 through the Worker
   (`tmp/<user-id>/` and, once the design is saved, `users/<user-id>/uploads/<upload-id>.<ext>`, Part I §12.1 and §12.2, rollout step 4) and the layer keeps only that key.
   Fonts are stored by slug, never as files.
3. **Who may see it.** Row-level security lets a customer select, insert and update only rows with their own
   `user_id`, with a `with check` on writes; nobody else can read a design. The admin order view and the press
   read through the server, not through the customer's policy. The earlier note about `profiles` columns applies:
   nothing a customer may edit may decide who is allowed to see a design.
4. **Guest and account.** A guest keeps the browser draft. When someone signs in with a draft in the browser, the
   editor offers "Save this as my design"; saving claims the draft and the browser copy remains as crash cover.
5. **Save, autosave and conflicts.** Save names the design. While signed in, changes are autosaved to the open
   design about five seconds after the last change. The header shows "Saving…", "Saved 12:04" or "Not saved:
   offline". A save carries the `updated_at` it started from; if the stored copy is newer (another device), the
   editor asks "Keep this version or load the other one" instead of overwriting.
6. **My designs.** A list with a thumbnail, name and date, with open, duplicate and delete, in the account area
   and in the Edit sidebar. The thumbnail is drawn in the browser at Save (about 600 px) and stored privately at `users/<user-id>/designs/<design-id>/thumbnail.webp`.
   Delete is soft; the row and its files are purged after 30 days.
7. **Buy hand-off (after payment and E12).** Buy creates an order item that owns an **immutable copy**:
   `design_snapshot jsonb` (layers and selections at purchase), `design_svg_key` (the print SVG with the fonts
   embedded or the text outlined, kept privately at `orders/<order-id>/`), `placement_coordinates` and
   `print_checks jsonb` (the E14 ppi of each photo and the other checks from `lib/print-quality.ts`).
   `design_id` still points at the saved design for reference. Editing or deleting the saved design afterwards
   never changes a paid order, and the press bundle is built from the snapshot. `design_svg_url` becomes a key,
   because a URL suggests a public file.
8. **The server decides, not the browser.** On Buy the server repeats the E12 rule, looks the chosen combination
   up in the price table and in Availability, computes the unit price itself, validates the design structure
   with the same cleaning as `sanitizeDesignDraftLayers`, cleans the SVG, and rejects a design above the layer,
   stroke and size limits. The client's price is never trusted.
9. **Takedown and privacy.** Saved designs are private. A design under a copyright claim is hidden (policy in
   Part I §8.1); a paid order whose design is taken down waits for the owner's review before printing.
   Deleting an account deletes designs that no order uses; orders keep their snapshot.
10. **Order of work.** (a) accounts and the `0008` migration with its row-level-security test; (b) Save, open and
    My designs for a signed-in customer; (c) photos and thumbnails to private R2 through the Worker; (d) Buy with
    the E12 gate and the order snapshot, after payment; (e) the admin order view and press bundle read the
    snapshot.
- Acceptance: a customer on a second device opens the same design; customer A cannot read customer B's design
  (a test with two accounts); a paid order is unchanged after its design is edited, duplicated or deleted; a
  design holding photos saves and reopens without a data URL in the row; a stale save is refused with the
  choice dialog; the server refuses a payload with a missing selection, an unpriced combination or a hidden
  one, and ignores the price the client sent.

#### Built: E3 the `circle` text preset (2026-11-22)

- Settled by removal from the control: the Adjustment box offers Plain / Arch / Wave, the three presets
  that paint. A circle baseline would need a per-glyph placement pass in every renderer (canvas, inline
  editor, mockup, print sheet) for a look the catalogue does not ask for.
- `textTransform: "circle"` stays in the type and in `editorTextPresetMatrix` as a **legacy stored value**:
  artwork saved with it renders as plain text with the ink box unchanged, instead of breaking.
- Verified: `tests/editor-layers.test.cjs` (a circle layer renders plain, its box equals the plain box) and
  `tests/editor-arrange.test.cjs` (the tile list is exactly Plain / Arch / Wave).

#### E2 — Phone QA

- Fix the `null` `getBoundingClientRect` in the Edit-sidebar section so the suite runs to the end, then
  run the flow on at least one physical Android and one iPhone.
- Acceptance: `tests/editor-touch.cjs` passes end to end, and a written note records the devices, OS
  versions and what was checked.
- Owner decision (2026-11-21): this item is done by testing on real devices and fixing what is found, not by emulation alone.
- **Source half done 2026-11-22: the canvas limit is bounded.** Checklist item (1) is a real risk in the code:
  the print canvas was a `<canvas width=4500 height=5400>`, a 24.3 million pixel backing store (~97 MB), and
  older iOS refuses a canvas above 16.7 million pixels. Nothing draws into that bitmap — the artwork paints in
  the SVG layers above it — so the element now takes `PRINT_CANVAS_BACKING_SPEC` (900 x 1080, 972k px) and keeps
  the print size in `PRINT_CANVAS_SPEC` and the `data-canvas-*` attributes. Verified in Chromium at 1440x900 and
  390x844: backing store 900x1080, `data-canvas-width/height/dpi` still 4500/5400/300, the on-screen box
  unchanged at 292x350 (ratio 0.834). The physical-device pass still has to confirm it on hardware.
- **Emulation pass 2026-11-22: checklist items 5, 6 and 7 are verified in Chromium, and the checks are now
  part of the suite.** A new `denseDesign()` section in `tests/editor-touch.cjs` (14 sections, all pass) proves:
  25 added layers sit beside the blank one and each add lands in well under a second; 35 pencil strokes then 40
  `Ctrl+Z` presses leave exactly 5 strokes, so the undo floor is the documented 30 snapshots; a second finger
  placed mid-stroke does not start a second stroke or extend the line (the tallest ink stays at the pencil width,
  because every pointer handler already rejects a non-primary pointer); and a rotation to 844x390 keeps the
  canvas width, adds no horizontal scroll at page or viewport level, and leaves the canvas reachable through the
  viewport's own scroll.
- **Every one of those paths was then checked in Chromium (1440 x 900) with the console guard on:** add
  (1 to 2 rows, undo back to 1), rename (label becomes `Renamed Layer`, undo restores `Layer 1`), hide and
  show, lock and unlock, mask add and remove, reorder, group, and delete (2 to 1, undo back to 2) each
  return to the previous state with no console error. Deleting both layers leaves an empty list; a stroke
  on it used to paint nothing and say nothing, and now says "Add a layer before drawing." — the same
  treatment the Pen tool already gave a missing layer.
- **Layer housekeeping is now undoable.** `deleteLayer`, `addLayer`, `duplicateLayer`, `renameLayer`,
  `moveLayer`, `moveLayerToIndex`, `groupSelectedLayers`, `ungroupSelectedLayers`, `createLayerMask`,
  `deleteLayerMask`, `toggleLayerVisibility` and `toggleLayerLock` all call `rememberLayerSnapshot()`. Before
  this, a mis-tapped delete could not be undone, and `Ctrl+Z` silently reverted an older paint operation instead.
- **Checked at five viewports on 2026-11-22** (768 x 1024, 1024 x 768, 820 x 1180, 414 x 896, 360 x 800;
  touch emulation on the three under 900 px): no horizontal overflow (`scrollWidth - innerWidth` is 0 at
  every size), the print canvas sits inside the viewport with the header above it and the tools bar below
  it, all ten header boxes are present, and no console error is logged. The only elements wider than the
  viewport are the header's own horizontal scroll container and the docked panels' scroll strips, which is
  what they are for. A tablet (768 x 1024) is therefore covered by the layout rules, not just the two
  sizes II.7 names.
- **Bug fixed 2026-11-22: a long Burmese word broke inside its syllables.** A word wider than the
  wrap limit was split per code point, so `"မြန်မာနိုင်ငံ"` painted lines that began with `"ာ"` and `"်"` —
  vowel signs and the asat hanging off nothing, and the artwork broke at different places than the
  textarea. The split now runs over grapheme clusters (`editorTextGraphemes`, `Intl.Segmenter`) and merges
  a cluster that opens with a combining mark back into the previous one, because UAX #29 gives a Myanmar
  spacing mark its own cluster. Verified with `tests/editor-layers.test.cjs` (Myanmar and joined-emoji
  cases) and in Chromium: a 130-code-point Burmese word at the default 110px/880 wrap paints 10 lines,
  rejoins to the original string, and no line starts with a mark, on the canvas, the mockup and the preview.
- **The bar and canvas hold in landscape and on a tablet (2026-11-22).** `landscapeAndTablet` loads
  844 × 390, 480 × 320, 768 × 1024 and 1024 × 768 touch and asserts the tools bar is fully in view,
  all 16 tools are present and tappable (nothing overlapping them), the mobile navigation starts at or
  below the bar's bottom, the print canvas is on screen, and the page does not scroll sideways. All
  four pass. The existing `phone landscape` section only checked that the touch controls survive the
  desktop breakpoint; this adds the tappability rule the 320 × 480 section uses.
- **Checklist item 2 is covered for effects (2026-11-22).** `burmeseEffects` types a Burmese layer,
  then reloads it once per effect (shadow, outline, glow, extrude, gradient) through the saved draft and
  checks the Burmese text still paints, no painted copy is truncated, and the effect's own signature
  reaches the painted SVG (the shadow colour, a stroked `<text>` for the outline, a filter for the glow,
  the extrude colour, a gradient definition). It then reads `[data-editor-export-artwork]` — the group
  the customer's SVG download and the press sheet are serialized from — and requires the Burmese text
  there too and a longer document than the plain layer, so an effect cannot survive on screen and vanish
  from the file that prints. All five pass, so no fix was needed. Fonts other than the default are still
  only covered by the audit in `tests/editor-font-audit.test.cjs`.
- **Checklist item 6 is covered at the tightest size (2026-11-22).** At 320 × 480 the `short phone bar`
  section finds all 16 bar buttons hit-testing to themselves (none covered, none off screen), the bar
  ending above the `Mobile navigation` bar, and the print canvas scrolling clear above the bar. No bug
  was found; the check now guards the clearance work on the smallest screen the shop supports.
- **Checklist item 3 is now covered in emulation and fixed in the source (2026-11-22).** A phone keyboard
  shrinks the *visual* viewport without shrinking the layout box, so the caret could sit below the last
  visible pixel with nothing re-panning it: measured on 390 × 844, after six lines the caret line sat at
  y 490–529 while the visible area ended at 334. `keepTextCaretVisible` now clamps to
  `visualViewport` (`offsetTop` + `height`) instead of the layout box, and it re-runs on `resize`,
  `orientationchange` and the visual viewport's own `resize`/`scroll`, not only on a text change. Same
  measurement after the fix: caret 264–302 inside 153–334, and it stays in view when the screen returns
  to 844. The new `keyboard caret` section in `tests/editor-touch.cjs` pins it (19 sections, all pass).
  A real keyboard still has to confirm it on hardware, which is what E2 itself requires.
- Checklist for the real-device pass: (1) iPhone Safari opens `/create`, draws and holds many layers on the 4500 × 5400 canvas without the page reloading (browser canvas limits are not verified in the source); (2) Burmese text typed with the Text tool, in several fonts and with effects, renders correctly on the canvas, the mockup and the print sheet; (3) the on-screen keyboard never hides the text box or caret; (4) uploads from the gallery and camera, including photos over 10 MB; (5) every tool with one finger, a second finger never taking over, Pan view, `+` / `−` / Reset view; (6) the Layers box and Edit sidebar never overlap, and the bottom navigation and safe areas never cover the editor; (7) portrait to landscape, dark and light, 20 to 30 layers, and the 30-step undo limit; (8) a reload loses the working canvas today (E1) and is recorded as such.

#### E4 — Align and tidy

- Align the selection to the print canvas (left, centre, right, top, middle, bottom) and tidy the spacing
  of three or more layers.
- Constraint: moves layer origins, never scales, treats a linked set as one unit.
- Owner decision (2026-11-21): the alignment targets are the design areas the shop defines for each mockup, not always the canvas centre. This item starts after the mockup design-area discussion.
- **Helper only 2026-11-21:** `lib/editor-align.ts` (`alignOffset`, `tidyDeltas`) and its 8 unit tests are
  written; it is not wired to any control yet, because the target area is the decision above.
- Acceptance: unit tests on the helper against `PRINT_CANVAS_SPEC`; a canvas test that the artwork lands
  inside the print area.

#### E5 — Flip

- Horizontal and vertical flip on the selection, mirrored in the mockup and the print export.
- Acceptance: the printed PNG is the mirror of the unflipped one and the transform box still hugs the
  ink (a flipped italic moves its ink).
- **Owner decision (2026-11-22): Flip does not belong in the Tools bar.** The two buttons live in the
  Adjustments panel's Arrange section (E22). `flipLayerPlacement` and `flipSelectedLayers` stay as they are; only
  the buttons move, and the Tools bar loses its `canFlip` and `onFlip` props.

#### E6 — Snap guides

- While dragging, snap to the canvas edges and centre, and to other layers' edges and centres, with a
  visible guide line; a modifier key suspends snapping.
- Owner decision (2026-11-21): the snap targets include the design areas defined per mockup. This item starts after the mockup design-area discussion.
- **Helper only 2026-11-21:** `lib/editor-snap.ts` (`snapTargetLines`, `snapBoxToLines`, `offsetBox`) and
  its 8 unit tests are written and take the target area as a parameter; the drag is not wired to it yet.
- Acceptance: a drag within the snap distance lands exactly on the guide, the guide disappears on release,
  and touch dragging keeps working.

#### E7 — Hover highlight — **built 2026-11-22, acceptance covered**

- Hovering a canvas layer highlights its Layers row; hovering a row outlines its canvas layer. No
  selection change. Implemented in `EditorCanvas.tsx` (`hoveredLayerId`, `hoveredBounds`, the
  `[data-editor-hover-outline]` dashed box) and `EditorLayersPanel.tsx` (`onHoverLayer`, the row ring
  and `data-layer-hovered`). The outline is only drawn for a layer that is **not** selected, so it never
  doubles the solid transform box.
- Acceptance met: the new `hover highlight` section in `tests/editor-touch.cjs` drives a real mouse in
  Chromium at 1280 × 900 and asserts both directions and both clears — hover the artwork, then the row
  of the same layer, then away — with the selection unchanged in every step, and a 390 × 844 touch tap
  that leaves no outline. Suite now 17 sections, all pass.

#### E8 — Shape Builder

- `exclude` plus boolean operations on any closed path, not just the first two rectangles.
- Acceptance: merge, subtract, intersect and exclude on rotated shapes and pen paths produce one path
  that prints, with bounds following the result.

#### E9 — Products  *(order decided 2026-11-23: Hoodie first)*

- Enable Hoodie, then Cup, Kids and Bag only if the catalogue sells them, each with its mockups, design areas
  (E23), price table and weight.
- **Hoodie** comes first and only after E15, because its attribute set is not the T-shirt's. The header boxes,
  the Buy gate (E12), the price table and the post form all read the managed chain, so the shop defines the
  hoodie's attributes (fabric, weight, colours, sizes, print methods) in the admin and nothing is fixed in code.
- **Design areas:** the hoodie's front area sits above the pocket, so it is shorter than the T-shirt's; the back
  area is the full back. Both are set in E23.
- **Mockups:** `mockups/editor/hoodie/<look>` and `mockups/product/<slug>/<look>` follow `Doc/R2-STORAGE.md`; the
  service lists the looks that exist (Part I §12.1).
- **Delivery:** the weight of each hoodie is measured by the shop and entered, as for the T-shirt.
- **Needs from the owner:** the hoodie's attribute lists and prices, its photos, and its measured weights.
- Acceptance: the hoodie renders its mockup, prices from its own table, prints on its own areas, passes the Buy
  gate with its own attributes, and a T-shirt design opened on a hoodie keeps every layer inside the hoodie's
  front area or says which layers are outside it.

#### E10 — Sidebar services

- Designs and Elements read the real design library; Upload stores its images; Image Create generates and
  inserts an image.
- **Through the R2 asset service (owner, 2026-11-22; Part I §12.1):** Designs and Elements read
  `GET /api/assets/designs` and `/elements`, whose JSON the Worker builds from the folders in R2 and a small
  `meta.json` per asset (name, category, tags). The `pending-r2-endpoint` placeholder in
  `lib/editor-design-library.ts` is replaced by that response. A design's layers stay individually selectable.
  Uploaded photos are private: they go to R2 through the Worker and come back only to their owner.
- **Photos and Patterns (owner, 2026-11-26):** the Photos and Patterns rail sections read `GET /api/assets/photos` and `/patterns` the same way (Part I §12.2.2). A photo shows its `thumb.webp` in the grid and loads the full picture only when it is added; it then enters the canvas through `addCanvasPhoto` and `imageLayerBox` as it does today, and its pixel size comes from `meta.json`, so the E14 resolution warning needs no extra download. A pattern is an SVG that already covers the artwork space and enters as a shape layer through `patternToDesignLayer`; the nine built-in patterns stay in code and appear first. Both lists search name, tags and aliases in English and Myanmar (Part I §17, S5). The Lorem Picsum placeholder photos are removed when the first licensed photos are uploaded. Uploads (the customer's own photos) stay a separate section and a separate private prefix.
- Acceptance: a design added from the sidebar survives a reload (once E1 lands) and appears in the print
  bundle.

#### E12 — Required selections before Buy  *(owner decision, 2026-11-21)*

- **Rule:** Buy is allowed only when all eight header selections hold a value: Product, Print Method,
  Fabric Type, Knit Structure, MH Cuttings, GSM, Color and Size. **Save is always allowed**, whatever is or
  is not chosen.
- **Today:** the header opens with a value in every box except Color (owner, 2026-11-21). A box counts as
  chosen when it holds a value, a pre-filled default included (decision D7).
- **Buy with something missing:** the Buy button stays clickable, because a disabled button cannot say why.
  Clicking it shows a small notice that names every missing selection (for example "Choose Color before
  buying"), outlines each missing box, and scrolls or focuses the first one. The notice is non-blocking, is
  announced to screen readers (`role="status"`), and clears as soon as the last missing box is filled.
- **Wording:** the notice reads in English and Myanmar with the active UI language, and names fields with
  their header labels. The owner reviews the Myanmar wording.
- **Web and Phone:** on Web the notice sits under the Buy button and does not cover the canvas; on Phone it
  sits under the header row, above the bottom navigation, the header row scrolls the first missing box into
  view, targets stay about 44 px, and the notice never overlaps the Layers box or Edit sidebar.
- **Server check:** the order endpoint repeats the rule and rejects a payload that lacks a required
  selection, and it also rejects a combination that has no price or is hidden in Availability. The button is
  never the only guard.
- **Scope:** T-Shirt. The Phone product's required set is decided when Phone ordering is built.
- **Helper and the bar's report built 2026-11-24 (phase 0, Buy still disabled).**
  `lib/editor-required.ts` holds `EDITOR_REQUIRED_SELECTIONS` (the eight boxes in bar order, English and
  Myanmar labels), `missingEditorSelections` (blank, whitespace, `null` and an absent key all count as not
  chosen; a pre-filled default counts, decision D7) and `editorSelectionNotice` ("Choose Color and Size
  before buying", "အရောင် နှင့် အရွယ်အစား ကို ရွေးပါ"). The notice sorts by bar order and de-duplicates, so
  a caller's own order cannot leak into the sentence. `EditorHeaderBar2` computes the list from its own
  eight boxes — three different states feed it (props for Product and GSM, `attributes` for the four
  attribute boxes, local state for Color and Size) — and exposes it as `data-editor-missing` and
  `data-editor-missing-notice`. Verified: `tests/editor-required.test.cjs` (6 tests), the header source
  assertions in `tests/canvas-shell.test.cjs`, and `/create` in Chromium with every default chosen
  (`data-editor-missing=""`, no console error, Buy still disabled).
- **Order of work:** the gate ships with Buy (E1, after payment). Until then Buy stays disabled.
- Acceptance: with Color empty, Buy shows a notice naming Color, the Color box is outlined and in view; Save
  works with Color empty; choosing Color clears the notice and outline at once; with everything chosen Buy
  proceeds; Enter and Space on Buy behave like a click and move focus to the first missing box; the notice is
  announced and shows in English and Myanmar, dark and light, at 1440 × 900 and 390 × 844; a unit test covers
  the pure "which selections are missing" function; a server test rejects a payload with a missing selection,
  an unpriced combination and a hidden one.

#### E13 — Keyboard Undo / Redo  *(owner decision, 2026-11-21)*

- `Ctrl+Z` (`Cmd+Z` on Mac) undoes; `Ctrl+Shift+Z`, `Cmd+Shift+Z` and `Ctrl+Y` redo. `Cmd+Y` is left alone.
- It runs the same undo and redo functions as the tool-bar buttons and keeps the same scope: layer changes
  only, 30 snapshots; zoom, pan and mockup positions stay outside the history.
- **Fields keep the browser's own Undo:** while the focus is in an input, textarea, select, a contenteditable
  element or a `role="textbox"` element (the inline text editor, the Edit-sidebar search, number fields), the
  shortcut does nothing, so typing is never rolled back by layer history.
- **Burmese and other non-Latin layouts:** when the pressed key is not a Latin letter, the physical key is
  used, so the shortcut works on a Myanmar keyboard. On a Latin layout that moves the letters (AZERTY), the
  letter wins.
- Ignored: any Alt combination (AltGr types characters on some layouts) and keystrokes made while an input
  method is composing text.
- The shortcut works whether the tool bar is expanded or collapsed and while the Layers or Adjustment box is
  open.
- Phone: no keyboard, so the buttons stay the way to undo.
- Acceptance: a unit test covers the key matrix and the field check; a browser test undoes and redoes a layer
  change with the tool bar collapsed and with the Layers box open; typing in the text editor and pressing the
  shortcut changes the text only; `Doc/EDITOR.md` §17 gains the new rows.

#### E14 — Image resolution warning  *(owner decision, 2026-11-21: add it)*

- **Facts checked in the source:** layers live in a 1000 × 1200 artwork space that maps to the 4500 × 5400 px
  canvas at 4.5 px per unit; an uploaded photo is reduced to at most 2000 px on its long edge (`UPLOAD_MAX_EDGE`)
  and inserted centred, fitted inside 80 % of the artwork width and height (`imageLayerBox`); an image layer
  stores its box and byte size but not the photo's own pixel size.
- **Measure:** effective ppi = 300 × (photo pixels along an axis) ÷ (pixels that axis covers on the print
  canvas). Rotation and masks do not change it. A photo stretched on one axis only takes the lower value. By
  this formula a 2000 px photo at the default size lands between about 139 ppi (a portrait photo) and 167
  ppi (a landscape or square one), and a 1000 px photo between about 69 and 83 ppi.
- **Needs:** the photo's source pixel size stored on the layer at upload, or measured by loading the image for
  layers saved without it.
- **Applies to** image layers only; text, shapes and strokes are vector.
- **Levels:** good, low, very low. The thresholds come from the print desk's minimum acceptable ppi; 150 and
  100 are placeholders to test with.
- **Where:** a small badge on the image row in the Layers box, a "Print quality: N ppi" line with its level in
  the Adjustment box, and a quiet on-canvas notice when resizing drops a layer to a lower level. Phone shows an
  icon (about 44 px) that opens the detail. English and Myanmar, dark and light.
- **Never blocks:** Save and Buy stay available. Whether "very low" needs a confirmation at Buy is decided in
  E1. Optionally the ppi of each image layer is stored on the order item so the print sheet shows it
  (`lib/print-quality.ts` already carries the other print checks).
- Open decision D8: the 2000 px upload cap decides whether the warning is useful (see II.6).
- Acceptance: unit tests for the formula (a 2000 px photo shown 2000 px wide gives 300; shown 3500 px wide gives
  about 171; rotation and masks leave it unchanged; a one-axis stretch takes the lower value); the badge and
  line update live while resizing; undo history is untouched; checked at 1440 × 900 and 390 × 844.

#### E15 — Header choices managed from the admin dashboard  *(owner decision, 2026-11-21)*

- **Rule:** the shop can change the choices behind the header boxes from the admin dashboard — rename, add,
  remove and reorder the options of Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Size and
  Color — and the narrowing rules between them (today Sublimation allows Polyester only, Polyester allows
  Interlock and Air Layer, cotton allows Single Jersey and Interlock). Nothing the shop is expected to change
  stays fixed in code.
- **Same source everywhere:** the editor header, the admin pricing table and the T-shirt post form read the
  same managed chain. Today the editor reads constants and the admin edits its own copy, so the two can
  disagree.
- **Removing an option:** an option already used by a priced combination, a post or an order is hidden from
  new choices, not deleted, so existing records keep their meaning.
- **Order of work:** the managed chain must live where the editor and the server can both read it (the
  database, after the Supabase work); until then the admin copy and the constants stay in step by hand.
- Acceptance: adding an option in the admin makes it appear in the editor header and the pricing table after
  a reload; removing one hides it from new choices and leaves existing orders readable; a changed narrowing
  rule changes what the header offers; a unit test covers the fall-back to the first valid option when a
  choice stops being offered; checked on Web and Phone.

#### E16 — Download my design (done 2026-11-22)

- **Where:** a Download chip at the end of the editor tools bar, beside Undo and Redo, with a two-item menu:
  "PNG · 300 dpi (print)" and "SVG · vector". It is disabled while every layer is hidden.
- **What it writes:** only the artwork. `EditorDesignExport` renders the same `EditorArtworkLayers` into a
  hidden `<svg>` with no transform box, guides, handles or inline text editor, and
  `serializeArtworkSvg` copies that group into a standalone document. A file the press opens therefore looks
  like the canvas and not like the editor.
- **Size:** the document is `width="38.1cm" height="45.72cm"` with `viewBox="0 0 1000 1200"`, i.e. the print
  area of `PRINT_CANVAS_SPEC` (4500 × 5400 px at 300 dpi). The PNG is rasterised through an `<img>` and a
  canvas at `exportPixelSize()` — 4500 × 5400 px — so `pixelsToCentimetres()` recovers the same 38.1 × 45.72 cm
  the press sheet and the layer-measurement CSV quote.
- **No webfont risk:** the project loads no webfont (`EDITOR_TEXT_FONT_FAMILY` is `'Inter', system-ui, …`), so
  the rasterised SVG resolves the same system fonts as the page. If a webfont is ever added, it must be inlined
  into the export or the PNG text will fall back.
- **Failure:** an empty canvas reports "Add something to the canvas before downloading"; a rasterise error
  reports "The design could not be downloaded. Try again." rather than saving a broken file.
- Verified in Chromium at 1440 × 900 and 390 × 844 touch: the menu items are 44 px tall on a phone, both files
  download, the PNG is 4500 × 5400 px with the artwork in the same place as on the canvas, and the SVG holds
  no `foreignObject`, handle or outline node.

#### Built: E15 step 1 — one vocabulary for the header and the price book (2026-11-22)

- `lib/editor-attributes.ts` now holds every list the header offers: print method, fabric, knit, MH
  cuttings, GSM (`160/180/200/240`), size (`XS`–`3XL`) and the colours, each with its label and swatch.
  `COLOR_LABELS` is the label list the price book keys on.
- `TSHIRT_POST_ATTRIBUTES` in `lib/admin-demo-data.ts` is built from those lists instead of repeating them,
  so the editor header and the admin pricing table cannot offer different sizes or colours again. This is
  the interim step the plan asks for while the managed chain waits for the database; the admin still cannot
  *change* the list, only read the same one.
- What drifted and is now settled: the price book offered `S`–`2XL` and six colours while the header
  offered `XS`–`3XL` and eight. The union is the shared list — sizes `XS`–`3XL`, colours White, Black, Navy,
  Red, Blue, Green, Yellow, Grey, Sand (Sand is a real garment colour the price book already sold). The
  header's price table already covered every size, so no price changed.
- Verified: `tests/editor-attributes.test.cjs` pins the admin seed chain to the shared lists and checks the
  size/GSM price tables cover exactly what is offered; `tests/canvas-shell.test.cjs` fails if the header
  grows a private copy again; the phone and desktop header checks in `tests/editor-touch.cjs` pass with the
  nine-colour menu.

#### Built: E13 keyboard Undo / Redo (2026-11-22)

- `lib/editor-shortcuts.ts` resolves the key: `Ctrl+Z` / `Cmd+Z` undo, `Ctrl+Shift+Z`, `Cmd+Shift+Z` and
  `Ctrl+Y` redo, `Cmd+Y` left to the browser, Alt combinations and composing keystrokes ignored.
- A focused text field (input, textarea, select, contenteditable, `role="textbox"`) keeps the browser's own
  undo, so typing is never rolled back by the layer history.
- A non-Latin layout falls back to the physical key (`KeyZ`), so a Myanmar keyboard works; a Latin letter
  wins over the position, so AZERTY keeps its letter.
- `EditorCanvas` binds it to the same `undoCanvasAction` / `redoCanvasAction` as the tool bar, through a
  ref rebuilt every render, so it works with the tool bar collapsed and either box open.
- Verified: `tests/editor-shortcuts.test.cjs` (6 cases) and a browser check in `tests/editor-touch.cjs`
  that undoes and redoes a stroke with the tools collapsed and the Layers box open, then confirms a
  focused rename field leaves the layers alone.

#### Built: E14 image resolution warning (2026-11-22)

- `lib/editor-image-ppi.ts`: effective ppi = 300 × the photo's own pixels ÷ the print pixels its box
  covers (4.5 print px per artwork unit), taking the lower axis so a one-axis stretch counts. Levels step
  at 150 and 100 ppi (placeholders from the print desk). Rotation and masks do not change the value, and a
  layer without a stored pixel size reports nothing instead of a guess.
- `EditorImageContent` gained `sourceWidth` / `sourceHeight`, written by the upload path from the retained
  pixel size, so the number is measured, not estimated.
- Where it shows: a badge on the image row in the Layers box (which also opens the Adjustment box, and is
  a 44 px target on touch), and a "Print quality: N ppi · level" line at the top of the Adjustment box.
  When a resize drops a photo a level, the editor says it once in the tool-bar notice. Save and Buy are
  never blocked.
- Verified: `tests/editor-image-ppi.test.cjs` (the 300 / 171 / 139 / 167 / 69 / 83 ppi cases, the level
  steps, the null cases) and a Chromium check: a 1200 px upload shows "100 ppi · low", and resizing it up
  1.5× turns the badge to "67 ppi" and the notice to "upload-1200.png: print quality dropped to 67 ppi".

#### Built: E8 Shape Builder booleans (2026-11-22)

- `lib/editor-path-boolean.ts` is the geometry: an SVG path walker (M, L, H, V, C, S, Q, T, Z, absolute and
  relative; an arc falls back to a straight line to its endpoint) that flattens curves into closed rings,
  a split-and-classify boolean that keeps the pieces each operation wants, and a chain walk that rebuilds
  rings. Endpoints within a hundredth of a unit of each other are merged first, because the crossing of
  edge A with edge B is computed twice and the two results differ in the last bits.
- Rings are oriented by nesting depth, so a hole cuts the right way under the nonzero fill rule.
- `applyEditorShapeBuilderOperation` now folds every path on the layer (the first is the base for
  subtract) into one path, and leaves the artwork alone when the result would be empty.
- The Adjustment box offers Select / Merge / Subtract / Intersect / Exclude.
- Verified: `tests/editor-path-boolean.test.cjs` (areas, ring counts, curves, rotated shapes, pen paths,
  relative commands, fractional coordinates, empty results) and a Chromium run that draws two overlapping
  rectangles on one layer and clicks each mode: merge gives one 8-point ring, subtract one 6-point ring,
  intersect one 4-point ring, exclude one path of two 6-point rings, and the transform box shrinks and
  grows with the result (210x251 → 190x191 → 90x91 → 210x251 px).

#### E17 — Font library, including Burmese fonts  *(approved 2026-11-22; the font files live in R2)*

- **Facts checked in the source:** the font list is eight names, all system fonts; none is a Myanmar font; no
  font file is loaded anywhere, so the font a layer paints with depends on the device. `Doc/PRINT-BUNDLE.md`
  says text stays text in the print SVG and is converted to outlines only if the press lacks the font.
- **Approved:** a hosted font library. The font files live in R2 and are put there by the shop (owner,
  2026-11-22). The editor, the mockups and the print sheet all load the same files, so all three show the same
  letters. Fonts sit on shelves (Sans, Serif, Display, Script, Burmese). Only fonts in use are loaded. The
  admin dashboard takes over adding and removing fonts later, as E15 does for the header choices.
- **In R2:** follows the folder pattern of `Doc/R2-STORAGE.md`:
  - `fonts/<font-slug>/<style>.woff2` (for example `regular`, `bold`, `italic`), woff2 only, with a version in
    the file name when a font is replaced so a cached copy is never served stale.
  - The font list is **built by the R2 asset service** (Part I §12.1, owner decision 2026-11-22): the Worker
    reads the font folders and a small `meta.json` per font (display name, shelf, files by weight and style, the
    scripts it covers, the licence name and link, whether it is on) and returns `GET /api/assets/fonts`. The JSON has
    the shape `parseEditorFontManifest` already accepts, so the editor changes only the address it reads from. A
    bad entry is skipped and listed as an issue the admin can see, as for the brush tips. A hand-edited
    `fonts/manifest.json`, if one exists, is still honoured while the shop moves over. The font list is expected to
    move into the database later (D13).
  - The base address of the font files comes from the same public R2 address the mockups use, never hard-coded, so a
    later move to AWS S3 changes one setting.
  - A browser only uses a font served from another address if R2 allows that site with an
    `Access-Control-Allow-Origin` header, so the bucket needs a CORS rule for the site (`Doc/R2-STORAGE.md` §7);
    that is the price of serving fonts from the public bucket address (decision R2-1 in Part I §12.1).
  - Myanmar fonts are large: load one only when a layer uses it, and split Latin and Myanmar with a
    `unicode-range` if a file is big.
- **Export (a dependency of E16):** the design download draws the SVG through an `<img>`, which does not load
  fonts from the network, so the export must embed the fonts the artwork uses inside the SVG (base64 woff2) or
  turn the text into outlines; otherwise the PNG falls back to a system font. The E16 section already warns of
  this. The press SVG and the press bundle follow the same rule.
- **Licence:** every manifest entry carries its licence and a link; the owner confirms that commercial print
  use is allowed before a font is switched on.
- **Burmese:** a few open-licence Myanmar families offered as a shelf; the licence of each font is checked
  before it ships (open-licence fonts such as Padauk and the Noto Myanmar families are the usual candidates).
  Unicode is the only supported encoding; Zawgyi text is not supported or converted (owner decision,
  2026-11-22, D10).
- **Print:** at export time the text is converted to outlines, or the font file is embedded, so the press
  never lacks a font.
- **Step 1 done 2026-11-22: the manifest and the loader.** `lib/editor-fonts.ts` parses
  `fonts/manifest.json` (shelf, scripts, weights, styles, licence, `enabled`), refuses a file that is not a
  bucket-relative `.woff2` or an entry without a licence, and skips a bad entry by name instead of failing.
  `lib/editor-font-library.ts` fetches the manifest once, builds `@font-face` rules with a Latin and a
  Myanmar `unicode-range`, and loads only the fonts a text layer uses. The picker lists the manifest's fonts
  shelf by shelf and falls back to the eight system fonts when there is no manifest, so nothing on screen
  changed until fonts are uploaded. Documented in `Doc/R2-STORAGE.md` §3.2b and `Doc/EDITOR.md` §6.
  Verified: `tests/editor-fonts.test.cjs` (10 tests) and the browser suite, which still lists the eight
  system fonts. Checked again against a manifest served from a local bucket: the picker listed the hosted
  font only (the bad entry was skipped), picking it injected both weights, and the browser downloaded only
  the weight the layer used; the missing font file fell back without an error.
- **Step 3 done 2026-11-24: the `outline` field (decision D14).** `EditorFontFile.outline` names the
  `.ttf`/`.otf` beside a woff2, validated by the same bucket-relative rule (an absolute URL, `..` or any
  other extension is dropped, and a bad value costs the bend, never the font). `canBendFont` and
  `outlineFontFile(font, weight, style)` answer from those files, so E19 has one place to ask. The asset
  service's font builder reports a named outline that is not in the bucket as an issue and leaves the font
  in the list with the field removed, which is the "removing the outline file turns the bend off" rule in
  E19's acceptance. `auditFontLibrary` gained `bendable` and `missingOutlines`, so
  `npm run fonts:check` prints the fonts that can be bent and exits 1 while a named outline is missing.
  Verified: `tests/editor-fonts.test.cjs`, `tests/asset-catalogue.test.cjs`, `tests/editor-font-audit.test.cjs`
  (756 unit tests, all pass), and the checker run on a local folder with and without the `.ttf`.
- **Step 2 done 2026-11-22: the download keeps the font.** "Download my design" now inlines the used fonts
  as base64 `@font-face` rules in a `<defs><style>` block (`designExportFontCss` → `designExportDocument`),
  because the 300 dpi PNG is rasterised through an `<img>`, which fetches nothing. A file that cannot be
  downloaded is left out, so a broken bucket never blocks the export. Verified in Chromium against a local
  manifest: the downloaded `mh-fashion-t-shirt.svg` held `<defs><style><![CDATA[@font-face{...data:font/woff2;base64,...`
  with the chosen family; `tests/editor-fonts.test.cjs` and `tests/design-export.test.cjs` cover the rules
  and the CDATA guard.
- **Step 3 done 2026-11-22: a pre-upload check.** `npm run fonts:check -- path/to/fonts`
  (`lib/editor-font-audit.ts` + `scripts/check-font-manifest.cjs`) reads a local copy of the folder with the
  editor's own parser and prints the picker order, every entry the editor would drop and why, any listed file
  that is not in the folder, and any file over 1 MB; it exits 1 while something is wrong, so the owner can
  gate the upload on it. Verified on a good folder, a missing weight, a folder passed as either the bucket
  root or `fonts/`, and an entry without a licence.
- **Step 4 done 2026-11-22: the list paints each font.** The picker already asked for `font-family: <name>` per
  row, but a hosted face was never loaded until the font was chosen, so the labels painted in the fallback.
  Opening the Font section now loads one file per enabled font (`previewFontFile`: the regular, else the first)
  through the same single `<style>`, keyed `<slug>#preview` so a later full load still adds the other weights.
  Verified against a local manifest: nothing was loaded while the section was closed; opening it injected one
  400-weight rule and fetched only `regular.woff2`; the row carries `font-family: Padauk`.
- **Still open:** upload the manifest and the font files to R2 and add the site origin to the bucket's CORS
  rule; check each licence for commercial print; embed (or outline) the used fonts in the **press bundle**
  SVG, which is the remaining E16 dependency; move the font list into the admin dashboard as E15 does;
  confirm Burmese shaping on a real device.
- Acceptance: Burmese text shows correct shaping (stacked consonants, medial signs, vowel order) on the canvas,
  the mockup and the print sheet, with and without effects; a font switched off still renders on existing
  designs; the editor does not load fonts it does not use; the fonts load from R2 with the CORS rule in place;
  the downloaded PNG and SVG show the chosen font, not a fallback; a font whose file is missing falls back
  quietly and the editor says so once; a bad manifest entry is skipped; checked on Web and Phone, EN and MM.

#### E18 — Text effects, round 2  *(proposed, 2026-11-22)*

Today an effect holds colour, a second colour, offset, blur, width, count, distance, angle and opacity, and the
stack has thirteen kinds. Proposed additions, each with its own tile, row thumbnail, default and paint padding
(contract 11):

1. **Inner shadow and inner glow** — depth inside the letters, the missing piece of many 3D looks.
2. **Outline options** — position (outside, centre, inside), join (round, mitre) and a second outline for a
   double-outline look. An outline has only colour and width today.
3. **Backdrop plate** — a rounded rectangle or pill behind the text with padding, radius and colour, for
   label and sticker looks.
4. **Image or texture fill** — the glyphs show a photo or texture instead of a flat colour.
5. **Distress** — a grain mask removes parts of the letters for the vintage apparel look; the textures arrive
   through a drop folder like the brush packs.
6. **Pattern controls** — size, spacing and angle for dots, grid and checker, plus stripes, diagonals, stars
   and waves, and a halftone dot that changes size across the letters.
7. **Per-effect blend mode** (opacity already exists).
8. **Stack tools** — duplicate an effect, copy a stack from one text layer to another, and save the current
   stack as "my style".
9. **More styles** on the shelves for the new kinds (for example a Retro, a Neon and a Distress shelf). A glitch
   or RGB-split look needs no new kind; it is a preset of existing offsets.
- **Print caution:** effects that rely on soft transparency (large blur, glow, soft shadow) can print
  differently on a dark garment depending on the print method. Ask the print desk which effects are safe, and
  consider previewing the design on a dark and a light garment colour.
- Acceptance: for each kind the tile paints, the row thumbnail paints, the transform box contains all paint
  (frame differencing, ≤1.1 px), the effect survives save and reload (once E1 lands), Burmese text keeps its
  clusters intact under the effect, and it works at 1440 × 900 and 390 × 844.

#### E19 — A real text bend  *(approach decided 2026-11-22; the owner delegated D11; not yet approved to start)*

- **Fact:** `editorTextPresetMatrix` returns one shear matrix (6° Arch, 4° Wave). The whole block leans; nothing
  curves. The Warp tiles therefore preview a slant.
- **Goal:** real bends — Arc up and down, Circle, Wave, Flag, Rise, Bulge and Pinch — each with a Bend amount
  from −100 to +100; Plain stays, and Bend 0 equals Plain.
- **Decided method: outline warp.** The text is shaped, turned into glyph outlines, and every outline point is
  moved by the bend function. Nothing is left to the browser's text layout.
  1. **Shape** the text with HarfBuzz (`harfbuzzjs`, MIT, WebAssembly). HarfBuzz documents a dedicated Myanmar
     shaping model, so stacked consonants, medial signs and vowel order come out as the font intends.
  2. **Outline:** `font.glyphToPath(glyphId)` gives each glyph's outline as SVG path data.
  3. **Bend:** each outline point is mapped through the chosen bend; long segments are subdivided first so the
     edges curve smoothly.
  4. **Paint:** the result is one path per text layer. The canvas, the Warp tiles, the mockup mirror, the print
     SVG and the PNG export all paint that same path, so the bend is identical everywhere and needs no font at
     export time.
  5. **Source of truth:** the text and the bend settings stay on the layer, and the outline is derived data,
     cached by (text, font file, size, bend). Plain text keeps today's text renderer, wrapping and caret; the
     inline editor edits the unbent text and the bend shows live on the canvas.
- **Why this over the alternatives:**

  | Method | Burmese | Same result on every surface | Effects | Verdict |
  |---|---|---|---|---|
  | SVG text path | the browser decides how clusters are placed on a curve; old engines dropped clusters on a path (Mozilla bug 621918) and the W3C gap notes for Indic scripts show vowel signs and conjuncts still behave differently between engines | no: depends on each browser, and the PNG export | stroke effects cut joined glyphs apart | not chosen |
  | Per-character transforms | splitting a Burmese syllable into characters breaks it; grapheme segmentation does not reliably keep a syllable whole | partly | as above | not chosen |
  | **Outline warp** | shaped by HarfBuzz, whose Myanmar model is documented | **yes: one path painted everywhere** | effects run on one path; contours can be merged first | **chosen** |

- **Effects and seams:** glyph outlines overlap inside a Burmese syllable, so stroking each glyph separately
  shows seams (the W3C gap analyses list "text stroke cuts joining glyphs apart" for Indic scripts; Myanmar is
  not named there, so it is checked on real text). The outline is therefore merged into one shape with
  `booleanPathData(paths, "merge")` from `lib/editor-path-boolean.ts` before outline, hollow, bevel and extrude
  effects use it. The layer's transform box follows the bent ink (contract 1).
- **Needs the font file, and the manifest only lists woff2:** HarfBuzz's documented formats are TrueType and
  OpenType (`.ttf`, `.ttc`, `.otf`); woff2 is not among them, and `lib/editor-fonts.ts` refuses any file that is not a bucket-relative `.woff2`.
  Decision D14: each manifest style gets an optional `outline` field naming a `.ttf` or `.otf` kept next to the
  woff2; the editor keeps loading the woff2 for display, and a font without an `outline` file simply cannot be
  bent. The same R2 CORS rule covers the second file.
- **System fonts cannot be bent:** the eight system fonts have no file the editor can read, so the bend is
  offered for hosted fonts only; the control says so on a system font.
- **Weight:** the HarfBuzz module is loaded only when a layer first uses a bend; its download size is to be
  measured before it ships. Shaping and bending a few hundred glyphs is quick, and the cache keeps it off the
  drawing path.
- **Burmese specifics:** the line breaker must never split a syllable (break only between clusters), the bend
  is checked on real Burmese strings such as မြန်မာ, ကြောင်, ပြည်ထောင်စု and သင်္ကြန်, and the same strings are
  checked with and without effects.
- Acceptance: each bend paints identically on the canvas, the tile, the mockup, the downloaded PNG and SVG, and
  the press SVG; the box contains the ink (frame differencing, ≤1.1 px); Bend 0 equals Plain; the Burmese
  strings above keep every stacked consonant, medial sign and vowel in the right place at several bend amounts;
  an outline effect on bent Burmese text shows no seams; removing a font's `outline` file turns the bend off for
  that font instead of failing; checked on Web and Phone, EN and MM.

#### E20 — Brushes, round 2  *(proposed, 2026-11-22)*

- **Fact:** the Brush box already has presets, nib, paint, edge and shape-dynamics controls. The brush pack
  contract (`public/brushes/README.md`) exists but nothing reads it yet.
- **Wire the brush pack:** the Brush box builds its gallery from `brushes.json` (a bad row is skipped, not
  fatal), shelved by `group`, with PNG stamp tips tinted to the brush colour and SVG vector tips.
- **Where the tips live (owner, 2026-11-22):** the owner finds the tips and puts them in R2, as with the fonts.
  The `brushes.json` contract in `public/brushes/README.md` then applies to a `brushes/` folder in R2. The R2 asset
  service (Part I §12.1) builds the list the Brush box reads, `GET /api/assets/brushes`, from that folder
  and the `brushes.json` the shop wrote; the repo folder stays a template. The R2 CORS rule covers the tip files.
  The pre-upload check for brushes uses the same builder as the fonts check.
- **A starter set:** Ink (pen, marker), Dry media (chalk, charcoal, pencil), Airbrush, Splatter, Texture (grain,
  sponge) and Shape (stars, leaves), found and uploaded by the owner; each licence is checked before a tip is
  switched on.
- **Pressure:** the pointer's pressure drives size and opacity when a stylus or pressure-capable screen
  reports it, with an on/off switch per brush; no pressure is read today. Fingers report none, so the feature
  is optional.
- **Stabiliser:** a smoothing-by-lag slider for shaky hands, mostly useful on a phone.
- **Nib cursor:** a circle or tip outline at the real size for the current zoom while the Brush, Pencil or
  Eraser is active.
- **Colour dynamics:** hue, saturation and brightness jitter alongside the existing jitters.
- **My brushes:** save the current settings as a named preset; a symmetry (mirror) mode may follow.
- Acceptance: a dropped pack appears without a code change and a malformed entry is skipped; a stamp brush
  draws the tip at the right size, spacing and angle; the Eraser can use the same tips; pressure, stabiliser and
  cursor work on Web and Phone; strokes still print identically to the canvas.

#### E21 — Tool adjustments, polish  *(proposed, 2026-11-22)*

1. **Number fields:** every slider gets a number field, step arrows, a per-field reset (double-click) and
   arrow-key stepping (Shift for ×10); the value shows while dragging.
   *Built 2026-11-24.* `RangeField` is now the panel's only `type="range"`, so its 34 uses (Brush, Pencil,
   Eraser, Pen, Gradient, Text, Appearance) all carry a `${ariaLabel} value` number field. Typing is held in a
   draft until blur (clearing "100" is not read as 0), and every value passes `snap`, which bounds it and lands
   it on the slider's step; 999 typed into brush size stores 400. ArrowUp/ArrowDown step once, Shift steps ten,
   double-click returns the field to that tool's default. The field is 44 px tall on touch. Verified in Chromium
   at 1440 × 900 and 390 × 844.
   *The photo panel joined the same control 2026-11-21.* `RangeField` now lives in
   `components/EditorRangeField.tsx`, so the Adjustments panel and `EditorPhotoAdjustments.tsx` share one
   implementation and there is exactly **one** `type="range"` in the editor's source. All 48 photo adjustments
   use it, including the five tone-curve points and the eight colour-mixer bands (previously bare range inputs),
   and every field carries a double-click reset to Camera Raw's neutral (`levelsWhite` 100, `levelsGamma` 1,
   grading shadows hue 220, highlights hue 45, blending 50, grain size 25, channel 100, the rest 0).
   Verified in Chromium at 1440 × 900 with an uploaded photo: 13 sliders and 13 number fields in Basic, typing
   1.5 into "Photo exposure value" moved the slider to 1.5, a double-click put it back to 0, the Tone Curve and
   the Color Mixer render 5 and 8 of each, and the console stayed clean.
2. **Shortcut keys:** V Move, H Hand, B Brush, N Pencil, P Pen, T Text, E Eraser, U Shape, G Gradient, I
   Eyedropper, `[` and `]` for brush size, X to swap colours, D for the default colours; each is shown in the
   tool tooltip and is ignored while a field has focus (the same rule as E13).
   *Built 2026-11-24 (the part that needs no new control).* `editorToolShortcut` in `lib/editor-shortcuts.ts`
   maps V H B N P T E U G, `[`/`]` and X/D, and `EDITOR_TOOL_SHORTCUTS` is the one list the tooltips read.
   No modifier is allowed (Ctrl+B stays the browser's), and a text field, a composition or AltGr is left
   alone, exactly like E13's undo keys; the canvas keeps the current state in `toolShortcutHandlerRef` so a
   rebuilt handler always sees the live tool and nib. `stepBrushSize` moves a tenth, clamped to 1–500.
   X calls the same `swapColors` the bar's swap button uses, and D restores `EDITOR_DEFAULT_FOREGROUND` /
   `EDITOR_DEFAULT_BACKGROUND`, which are now also the editor's initial colours. Each tool button prints its
   key in the tooltip and in `aria-keyshortcuts`. Verified in Chromium: all nine letters pick their tool,
   `]` took the brush from 52 to 57 px, X swapped #202124/#ffffff and D restored them, typing "v" in the
   header search left the Brush active, and the console stayed clean. I (eyedropper) followed on 2026-11-26 with
   the tool itself (see item 3).
3. **Eyedropper:** pick a colour from the canvas or the mockup; the browser's EyeDropper API where it exists,
   canvas sampling elsewhere.
   *Built 2026-11-26.* The tools bar carries an **Eyedropper** (lucide `Pipette`) with the **I** shortcut, and
   `lib/editor-colour-sample.ts` holds the whole colour path. On press the canvas asks `nativeEyeDropper()`
   first: where the browser has `window.EyeDropper` (Chrome, Edge) the platform picker opens, so the mockup
   and anything else on screen can be read too; otherwise the artwork is serialised through the existing
   export renderer (`serializeArtworkSvg` → `designExportDocument` → `svgDataUrl`), drawn into a
   1000 x 1200 canvas and the pixel under the pointer is read, so the colour is what is *painted* — effects,
   gradients and photos included — not a layer's declared fill. `hexFromRgba` blends a transparent pixel over
   the white paper, so empty canvas reads `#FFFFFF` rather than black. The pick lands in the foreground swatch,
   the notice says `Picked #RRGGBB`, and the canvas hands itself back to the tool that was active before
   (`toolBeforeEyedropperRef`). Because the transform box and the pasteboard both sit over the artwork, the
   press is also read in `startSelectionBoxPress` and `startCanvasLayerResize`, and `eyedropper` joined
   `CANVAS_OUTSIDE_TOOLS`; without those three the tool was dead whenever a layer was selected or a drawing
   tool had painted the pasteboard. Verified in Chromium at 1440 x 900 with `window.EyeDropper` removed to
   force the sampling path: a rectangle filled `#202124` was drawn, the swatch was read back as `#202124` after
   a pick, the bare paper read `#FFFFFF` and updated the swatch, the tool returned to Shape tools, and the
   console stayed clean. `tests/editor-colour-sample.test.cjs` covers the pixel maths, the pointer mapping and
   the wiring; `tests/editor-shortcuts.test.cjs` now pins `I`.
4. **Pen box:** join style, line style (solid, dashed, dotted), end shapes for open paths, and a separate fill
   for closed paths. Today it holds width, width presets and cap.
   *Join and line style built 2026-11-24.* `EditorPenSettings` gains `join` (round / miter / bevel) and `style`
   (solid / dash / dot), both normalised so old settings fill in; the Pen box has a Join and a Line row. A drawn
   path stores `dash` (`penDashArray`, which scales the pattern with the pen width so a fat dotted line keeps its
   rhythm) and `lineJoin`, and `EditorLayerPreview` paints them, so the canvas, the mockup and the PNG/SVG export
   all agree. Verified: the Line row toggles (`aria-pressed`), `tests/editor-tool-options.test.cjs` holds the
   dash maths, the normaliser and the renderer wiring. A drawn dotted path was not captured in the browser this
   turn (the probe never got a layer selected), so a pixel check of the stroke is still worth doing.
   *End shapes and closed-path fill built 2026-11-24.* `EditorPenSettings` gains `ends` (none / arrow / circle /
   square / bar) and `fillClosed` + `fillColor`, all normalised so old settings keep their plain, filled behaviour.
   `editorPenEndMarkers(path)` is the only source of marker geometry: it returns both ends with a size that scales
   with the stroke and an angle pointing away from the path, and returns none for a closed, single-anchor or
   `none` path. A drawn path records `ends` and its fill, so changing the pen afterwards leaves it alone; a closed
   path fills with `fillColor`, or the pen colour when none is picked, and `none` when "Fill closed" is off. The Pen
   box now reads Path width, presets, Cap, Join, Fill closed, Ends, Line.
   Verified in Chromium at 1440 × 900: the Pen box renders the two rows, `Pen end shape circle` presses and clears
   `none`, and "Fill closed" turns off and removes the colour input, console clean.
   *Pixel check done 2026-11-21, and it found two bugs.* Drawing a Dot path with Circle ends at pen width 24 through
   CDP (three clicks, Enter) and diffing a frame against the same frame with the artwork hidden showed the stroke
   painting **solid** and both markers parked in the canvas' top-left corner. Causes: a shape layer always resolves
   a style, so `EditorLayerPreview` preferred the shape's preset dash over the path's own; and `editorPenEndMarkers`
   returned the anchors' normalized 0..1 coordinates while `editorPenPathData` paints them in the 1000×1200 view.
   Fixed by letting `path.dash` win (`strokeDasharray={path.dash ?? …}`), storing the pen's `lineStyle` on the path
   so the Shape box reads a dotted path back as dotted (`defaultEditorShapeStyle`, with a dash-string fallback for
   older artwork), and mapping the markers into the same view. Re-measured: 11 dots with 9 gaps of 6 px between
   8 px-tall dots, circle markers 22 px across at both ends, nothing left in the corner, console clean.
5. **Shape box:** defaults for fill, stroke, width and corner radius, star points and polygon sides, and a hint
   for the modifier keys (Shift keeps proportions, Alt draws from the centre). Today it holds only the presets.
   *Hint and modifiers built 2026-11-24.* The canvas honoured neither key before: a shape drag now makes the shape
   equal-sided when Shift is held and grows it from the press point as its centre when Alt is held, and the Shape
   box says so in one line under the presets. `tests/canvas-shell.test.cjs` keeps the sentence honest.
6. **Text box:** a default text style for new text, default line height and wrap width, next to size, font,
   weight, alignment, spacing and colour.
   *Wrap width built 2026-11-24.* `EditorTextToolSettings.wrapWidth` (default `DEFAULT_TEXT_WRAP_WIDTH` = 880,
   clamped 120–2000) is now what `addCanvasTextLayer` writes into a new layer, instead of a constant in the canvas;
   the Text box carries a "Wrap width" slider with a number field, so the shop sets how wide new text runs before
   it wraps. Verified in Chromium: the field starts at 880, typing 320 gives a new text layer whose inline editor is
   320 units wide, console clean.
   *Default line height built 2026-11-24.* `EditorTextToolSettings.lineHeight` (0.7-3, default
   `EDITOR_TEXT_DEFAULT_LINE_HEIGHT` = 1.2) is normalised with the rest of the group, the Text box carries a
   "Line height" step field next to "Wrap width", and `addCanvasTextLayer` writes it into a new layer, so item 6
   is complete.
7. **Gradient box:** an angle field and the stop editor reachable from the tool box, plus opacity.
   *Built 2026-11-26.* `EditorGradientToolSettings` gained `angle` (0-360, clamped) and `opacity` (1-100), both
   normalised so old tool settings fill in at 0° and 100%. `editorGradientFromToolSettings` now rotates the new
   layer's axis to the tool angle (`editorGradientWithAngle`, so the 500-unit length is kept), and a press
   without a drag lays a centred ramp at that angle through `editorGradientClickAxis` — it used to be horizontal
   whatever the angle field said. A drag still sets its own axis, and a click on an **existing** gradient keeps
   that layer's angle instead of snapping it back to 0°. A new layer starts at the tool's opacity. The box
   reads Angle, Opacity and, when a gradient layer is selected, the **same** stop editor the Gradient section
   uses (`GradientEditor`), so stops are editable without scrolling; Reset returns the whole group.
   Verified in Chromium at 1440 x 900: angle 90 + opacity 50 then a click on the canvas gave a selected layer
   whose Gradient section read 90° and whose Appearance read 50%; a horizontal drag re-aimed it to 0° and a
   follow-up click kept 0° (not 90°); the tool box carried the two stop handles and Add stop. On a phone
   (390 x 844 touch) both fields sit inside the panel with their number fields. Console clean.
   `tests/editor-tool-options.test.cjs` holds the clamps, the angle on a new layer, the click-axis maths and the
   wiring on both sides.
8. **Reset everywhere:** every box gets a reset to its tool defaults; the Brush/Pencil box has one today and
   the other boxes list none.
   *Built 2026-11-24.* Pen, Eraser, Gradient and Text have the same "Reset … to default" button, each writing the
   shared `EDITOR_TOOL_OPTIONS_DEFAULT` group. The Shape box has no settings of its own (it picks the next shape),
   and the Move box only nudges, so neither has anything to reset.
9. **Presets and recents:** the shop's own saved presets per tool (save, rename, delete) and the last six
   colours and fonts.
   *Built 2026-11-26.* `lib/editor-presets.ts` is the whole store: a preset is `{ id, group, name, settings }`
   for one of Brush, Pencil, Eraser, Pen, Gradient, Text, names are trimmed, single-spaced and capped at 40
   characters, a clash gets a ` (2)` suffix, and each tool keeps up to `EDITOR_PRESET_LIMIT` (24). Everything is
   tolerant on read — a junk entry, an unknown group or half-written JSON is dropped, a storage that throws is
   ignored — so a broken browser profile cannot take the editor down. The Adjustments panel gained two
   sections: **Presets** (apply, rename inline, delete, and "Save current settings") and **Recents** (the last
   six colours and fonts, newest first, de-duplicated with hex compared case-insensitively). A recent colour
   paints the foreground swatch; a recent font sets the Text tool and any selected text layer.
   Storage keys are `mh-fashion-editor-presets-v1` and `mh-fashion-editor-recents-v1`, read lazily on first
   render (the panel is closed then, so no hydration mismatch) and written on every change. Only a *change*
   is recorded, so the tool's starting colour and font never fill the list. This answers the persistence
   half of item 11 for presets and recents; the tool settings themselves still reset on reload.
   Verified in Chromium at 1440 x 900: saving "Chalk 40" while the brush size was 52, dragging the size to
   200, then applying the preset put it back to 52; renaming to "Soft chalk" and deleting returned the empty
   state; an eyedropper pick of the paper was recorded as `#FFFFFF` and a font change as `Georgia`, both in
   the Recents section and in `localStorage`, and both survived a reload. On a phone (390 x 844 touch) the
   section fits the panel (156-320 px) and the Save button is 44 px tall. Console clean.
   `tests/editor-presets.test.cjs` (11 tests) holds the naming, capping, rename, delete, storage and recents
   rules plus the panel/canvas wiring.
10. **Phone:** a tool's options open as a bottom sheet with large sliders, one box at a time, never hiding the
    canvas, 44 px targets.
    *Built 2026-11-26.* The panel decides for itself, from `(max-width: 767px)` read through
    `useSyncExternalStore`, whether it renders docked (`data-dock-side="right"`) or as a sheet
    (`data-dock-side="bottom"`, `data-adjustments-sheet="true"`). The sheet is a **flow child** of the workspace
    column, not an overlay: the column became `flex flex-col` and the viewport `max-md:relative max-md:inset-auto
    max-md:min-h-0 max-md:flex-1`, so opening the sheet shrinks the canvas area instead of covering it. It is
    capped at `max-h-[32vh]`, carries a grab handle and a 44 px `ChevronDown` close button, and has a
    `rounded-t-2xl` top edge. It stops above the floating tools bar through the measured `toolsBarInset` used as
    its `marginBottom`; that inset is measured from the sheet's own column, because measuring from the scroller
    inside it (which the sheet shrinks) made the answer circular. Opening the sheet then scrolls the print canvas
    back into the room that is left. The sections stay the one-open accordion, so one box is open at a time, and
    every slider keeps its 44 px number field on touch.
    Verified in Chromium at 390 x 844 touch: the sheet measured 270 px tall at y 420-690, the tools bar stayed at
    690-770 untouched, the print canvas sat at 58-408 **fully visible with nothing hidden**, exactly one section
    was open, the close button returned to the Layers panel, and the docked "Return to Layers" arrow was gone
    while the sheet was open. At 1440 x 900 nothing changed: the same component still docks right at 256 px with
    the return arrow. Console clean at both sizes. `tests/canvas-shell.test.cjs` pins the media query, the flow
    classes, the margin, the close button and the hidden arrow; `tests/editor-viewport.test.cjs` keeps the
    tools-bar spacer honest.
11. **Persistence (decision for the owner):** whether tool settings survive a reload.
   *Partly answered 2026-11-26:* saved presets and recents persist per browser (item 9). Whether the live
   tool settings survive a reload by themselves is still the owner's call.
- Acceptance: each item works with mouse, touch and keyboard; the values stay in range after typing; settings
  are never lost when another field changes (`updateToolOptions` merges per field); Web at 1440 × 900 and Phone
  at 390 × 844; the Tool Options tests grow with each box.

#### E22 — Adjustments panel: complete, compact and beautiful  *(proposed, 2026-11-22; owner request)*

The owner wants the Adjustments panel to be more complete, tighter, and good to look at, and wants Flip in it
rather than in the Tools bar.

- **Facts checked in the source (`EditorAdjustmentsPanel.tsx`, 682 lines):**
  - The panel is 16 rem wide (`PANEL_WIDTH = "min(16rem, 86vw)"`) and is a one-open-at-a-time accordion.
  - Text is 9 px in 41 places and 10 px in 41 places; nothing is 12 px or larger. Myanmar script, which has tall
    stacked marks, is hard to read at those sizes.
  - Controls: 11 native colour inputs, 4 native selects, 4 range sliders and 5 number inputs, so colour, choice
    and number controls look and behave differently from each other and from the header's own dropdown.
  - **Appearance** holds only blend mode, opacity and fill.
  - There is **no numeric X, Y, width, height or rotation**, no align, no rotate and no reset; the only
    placement controls are the nudge pad in the Move tool options and the on-canvas handles.
  - Flip and Download sit in the Tools bar, not in the panel.
  - Text has bold, italic and underline toggles but no letter-case control.
  - The existing `aria-label` strings are what the tests find controls by.

**What the panel still needs**

1. **Arrange section** (every layer kind): X and Y, width and height shown in centimetres (the press unit,
   `unitsPerCm`) with the pixel size beside them, rotation in degrees, a lock-proportions toggle,
   align to the design area (E4, E6) or to the print canvas, rotate 90°, reset transform, and for a multi-selection
   distribute. **Flip horizontal and flip vertical are here** (owner decision, 2026-11-22), enabled whenever a
   layer is selected, with the same `flipSelectedLayers` behaviour.
2. **One colour control** for all eleven places: a swatch that opens a small popover with the shop's palette,
   the last six colours, a hex field and an eyedropper (E21). The shop palette comes from the admin like the
   header choices (E15).
3. **Text:** letter case (as typed, UPPER, lower, Capitalised), and the text controls already listed in E21;
   the hosted font's weights as a choice, not only a bold toggle.
4. **Photo:** a reset per group, a before/after toggle, a Basic view (exposure, contrast, saturation,
   temperature) and an Advanced view (the rest), crop, replace image, and a couple of one-tap looks with live
   previews. Background removal stays "not connected" until the image service exists (E10).
5. **Whole panel:** a reset on every section header, copy and paste of a layer's style, and remembering which
   sections the shop keeps open for each kind of layer.

**Design direction**

1. **Structure:** a sticky header with the selected layer's thumbnail, name and kind, then a row of icon tabs
   that depends on the kind (Arrange, Style, Effects, Photo, Layer). Several sections may be open at once.
2. **One control family:** a 32 px row with the label on the left and the control on the right; a slider always
   comes with a number field; two related values (X/Y, W/H) share a row; two to four choices are a segmented
   control; on/off choices are icon toggles with a tooltip; native selects are replaced by the same dropdown the
   header already uses.
3. **Type and space:** body text 12 px and captions 11 px at least, section titles 14 px, line height 1.5 so
   Myanmar marks are not clipped, a 4 / 8 px spacing scale, and the site's existing colour tokens, radius and
   focus ring, so the panel looks like the rest of the editor in dark and light.
4. **Width:** 18 to 20 rem on desktop, scrolling only inside the panel; labels may wrap in Myanmar instead of
   being cut.
5. **Feel:** previews inside presets (the text styles already paint live tiles; photo looks and shadows follow),
   clear hover, pressed and disabled states, short transitions that respect reduced-motion.
6. **Phone:** the panel opens as a bottom sheet with a drag handle and three heights, one section group at a
   time, 44 px targets, and it never covers the object being edited.

- **Order of work:** the owner reviews a visual mock-up (desktop and phone, dark and light, English and Myanmar)
  before any code. Then the shared controls (row, slider with number, colour field, dropdown, segmented) are
  built once and the sections move onto them one at a time. E21 reuses these controls, so E22 comes first or
  together with it.
- **The mock-up is built: `/editor-adjustments-mockup.html`** (`apps/web/public/`, one self-contained file, no
  network requests, so it opens from the site or straight from disk). Switches at the top set English or
  Myanmar, dark or light, desktop or phone, and the phone sheet has Peek / Half / Full. It shows the sticky
  layer header, the five tabs, the Arrange, Style, Text, Effects, Photo and Layer sections, the one colour
  popover (shop palette, last six, hex, eyedropper), the before/after photo toggle, and the section resets.
  Measured in headless Chromium at 1440 × 900 and 390 × 844: nothing under 11 px, no clipped label in either
  language, no horizontal overflow, a 320 px (20 rem) desktop panel, and sheet heights 132 / 434 / 708 px.
  `tests/editor-adjustments-mockup.test.cjs` holds the file to the controls and sizes this item lists. The
  Myanmar wording is a first pass for the layout check and still needs the shop's copywriter (open question 6).
- **Tools bar after the change:** Flip leaves it. **Flip moved 2026-11-22** (the owner had already decided it, so
  it did not wait for the mock-up): both buttons now sit at the top of the panel's Appearance section, keep their
  `Flip horizontal` / `Flip vertical` labels, and are disabled while the layer is locked. The rest of E22 still
  waits for the mock-up. Download also sits in the Tools bar today; whether Download moves to the header next to
  Save and Buy is the owner's call (decision D15).
- **Contracts:** the panel keeps the existing `aria-label` strings the tests rely on, keeps the Undo and Redo
  behaviour unchanged, and keeps the Layers and Adjustments boxes from overlapping.
- Acceptance: a selected layer of each kind shows its Arrange section; typing a width in centimetres resizes the
  layer and matches the on-canvas box; Flip works from the panel and the Tools bar no longer has it; every
  colour field in the panel is the same control; no text in the panel is smaller than 11 px; Myanmar labels do
  not clip; the panel reads well at 1440 × 900 and 390 × 844, in dark and light; the existing editor tests
  pass; a screenshot per layer kind is attached to the change.

#### E23 — Design areas per mockup  *(proposed 2026-11-23; the owner places the areas)*

The owner decided that artwork may be placed freely inside areas the shop defines for each mockup, not always the
centre, and that the details are discussed later. This item is the design that discussion can start from.

- **Idea:** a design area is a rectangle (x, y, width, height in artwork units) per garment and per side (Front,
  Back). Artwork inside it is printable; artwork outside it is flagged. One area per side to begin with; named
  extra areas (sleeve, neck label) can follow with the same data.
- **Where it is stored:** next to the editor mockup in R2 (`mockups/editor/<garment>/meta.json`), read through the
  asset service (Part I §12.1); it moves into the database with the rest of the admin data. Nothing
  about it is in code.
- **How the shop sets it:** in the admin, over the mockup photo: drag and resize a rectangle, see the size in
  centimetres (`unitsPerCm`), save. The jersey mapping-zones tool is the pattern to follow.
- **What uses it:** the on-canvas frame (today a fixed print frame), alignment (E4), snap guides (E6), the
  "outside the print area" check in `lib/print-quality.ts`, and the clipping of the mockup overlay.
- **No area defined:** the whole print canvas, which is today's behaviour, so nothing breaks before the shop sets
  its areas.
- **One question only the owner can answer:** does the printed size change with the garment size (does an XL
  get a bigger print than an S)? Until the owner says so, one artwork size serves every size.
- Acceptance: the shop moves an area in the admin and the editor frame, align, snap and the warning follow after
  a reload; a layer dragged outside the area is flagged on the canvas and in the order's `print_checks`; with no
  area defined everything behaves as it does today; checked on Web and Phone.

### II.6 Decisions for the owner

| # | Question | Recommendation |
|---|---|---|
| D1 | Where does a saved design live — browser storage, the database, or only the order? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): the database.** A saved design is a row of `user_designs` owned by the customer; an order item keeps its own frozen copy. The browser draft stays as the guest and crash cover. Detail in E1. |
| D2 | Do Save and Buy ship before payments are finished? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): Save ships first**, as soon as accounts exist (Supabase Auth); Buy ships after the payment flow. Until accounts exist, a guest keeps the browser draft and Save says "Sign in to save". |
| D3 | Fix `circle` or remove it? | Remove it now, add it back with a real transform later |
| D4 | Which product comes after T-Shirt and Phone? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): Hoodie**, after E15 (managed attributes), because its attribute set differs from the T-shirt's. Cup, Kids and Bag follow only if the catalogue sells them. |
| D5 | Alignment and snapping, or keep free placement? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): both**, inside the design areas of E23: snap while dragging (E6) and align as a button in the Arrange section (E4, E22). |
| D6 | Per-character text styling? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): not now.** Per-layer styling covers the catalogue. |
| D7 | Do the pre-filled header defaults count as chosen for the Buy gate (E12)? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): yes.** A pre-filled default counts as chosen. |
| D8 | Raise the 2000 px upload cap (E14)? | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): raise the cap** to 4000 px on the long edge and 6 MB on desktop, and 3000 px on a phone (starting values, confirmed in the real-device pass of E2). Only the compressed working copy is kept, not the original, unless the press asks for originals. At the default size a 4000 px photo then lands at about 278 ppi (portrait) to 333 ppi (landscape or square), and a 3000 px photo at about 208 to 250 ppi. |
| D9 | Fit Type is a priced post attribute but has no box in the editor header. Where does the customer choose it, and is it required before Buy? (Owner, 2026-11-21: Sleeve has not been decided to be added, so it is outside this question.) | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): Fit Type becomes a header box when the shop switches it on for the T-shirt in the admin (E15), and it joins the Buy gate (E12).** Sleeve is not in the editor: it stays an attribute the shop can switch on later and is off by default; Sleeve values already stored on posts are kept in the data and not shown until it is switched on. |
| D10 | Zawgyi: **resolved 2026-11-22** — Unicode only, Zawgyi is not supported. Burmese fonts: **confirmed 2026-11-22** — a short list of open-licence Unicode fonts, each licence checked, files put in R2 by the shop (E17) | — |
| D11 | How is the text bend built? (E19) | **Resolved 2026-11-22 (owner delegated the choice):** outline warp — HarfBuzz shapes the text, the glyph outlines are bent and painted as one path everywhere; see E19 |
| D12 | Who supplies the starter brush tips? (E20) | **Resolved 2026-11-22:** the owner finds them and puts them in R2; each licence is checked |
| D13 | Until the database exists, where does the font list live? (E17) | **Resolved 2026-11-22, then refined the same day:** in R2. The Worker builds the JSON from the folders and each font's `meta.json` (Part I §12.1); it is expected to move into the database later |
| D14 | How does the bend get a font file HarfBuzz can read? (E19) | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): yes.** Each manifest style may name an `outline` file (`.ttf` or `.otf`) beside its woff2; a font without one cannot be bent. |
| D15 | Does Download leave the Tools bar too and sit in the header next to Save and Buy? (E22) | **Decided 2026-11-23 (the owner asked the plan author to decide every open question): yes.** Download leaves the Tools bar and becomes a menu on the Save button in the header (Save, then Download PNG and Download SVG); until Save exists the button is just Download. |

#### Inputs only the owner can supply  *(listed 2026-11-23)*

The plan author has decided every open design question above. These are facts the plan cannot invent:

1. The Burmese and other font files, and the licence of each (E17, D10).
2. The print desk's smallest acceptable resolution in ppi, for the good, low and very low levels of E14 (150 and 100
   are placeholders).
3. The design areas on each mockup, or approval to use the admin tool of E23 to set them, and whether a bigger
   garment size gets a bigger print.
4. The Hoodie's attributes, prices, photos and measured weights (E9).
5. The brush tips and their licences (E20).
6. A review of the Myanmar wording for the Buy notice (E12), the panel labels (E22) and the checkout messages.
7. Real devices for the E2 pass: at least one Android phone and one iPhone.
8. Which effects the press confirms print safely on dark garments (E18).
9. The legal review of the terms, privacy and cookie pages (Part I §13).
10. The place outside the Cloudflare account for the monthly backup of order files and licences (R2-8), and the legal retention period for order files (Part I §12.2.7).
11. The licensed photos and the patterns for the Photos and Patterns sections, with the licence document of each photo (Part I §12.2, R2-11 to R2-14).

#### Owner decisions recorded (2026-11-21)

1. Keyboard Undo / Redo is approved (E13).
2. Save and the order hand-off (E1) is the most important item. Save comes first, once accounts exist; Buy
   follows the payment work.
3. Align and snap guides (E4, E6) work inside design areas that the shop defines for each mockup, not always
   the centre. The mockup details are discussed later and E4 and E6 wait for that.
4. The image resolution warning is approved (E14); the upload-cap question is open (D8).
5. Phone QA (E2) is real-device testing followed by fixes.
6. Required selections before Buy (E12): all eight header selections; Save always allowed; Buy shows what is
   missing.
7. The header holds eight selection boxes, as listed in II.2.
8. The choices behind the header boxes, and the rules between them, must be changeable from the admin dashboard, not fixed in code (E15).
9. More text effects, more brushes and better tool adjustments are wanted (owner request, 2026-11-22). E18 to E21 are proposals; none is approved to start.
10. The font library (E17) is approved. The font files live in R2 and the shop puts them there (owner, 2026-11-22).
11. Burmese text is Unicode only; Zawgyi is not supported. The font list stays in `fonts/manifest.json` in R2 for now and is expected to move into the database later (owner, 2026-11-22).
12. The Burmese font approach is confirmed: a short list of open-licence Unicode fonts, licences checked, files put in R2 by the shop (owner, 2026-11-22).
13. The text bend is built as an outline warp (E19); the owner left the choice to the plan author. Whether D14 (a `.ttf`/`.otf` file beside each woff2) is accepted is still to be confirmed.
14. The brush tips are found and uploaded to R2 by the owner (E20, D12).
15. Flip does not belong in the Tools bar; it moves into the Adjustments panel — **done 2026-11-22**. The Adjustments panel should be more complete, tighter and good to look at (E22, owner request, 2026-11-22). E22 is a proposal; the owner reviews a visual mock-up first.
16. Files in R2 are read through a Worker that turns them into JSON, not by the browser directly (owner, 2026-11-22). The design is Part I §12.1; E10, E17 and E20 use it.
17. 2026-11-23: the owner asked the plan author to decide every remaining open question and write it all down. The decisions are in II.6 (D1, D2, D4 to D9, D14, D15), Part I §12.1 (R2-1 to R2-3), and the order of work in II.5.1. What only the owner can supply is listed under "Inputs only the owner can supply". Nothing is approved to start by this entry; each item still begins on the owner's word.
18. 2026-11-26: the owner added the Photos and Patterns sections to the Edit sidebar and asked for advice on the R2 folders; the plan author decided R2-10 to R2-14 in Part I §12.2.14 (`designs/` stays; `photos/` and `patterns/` folders; customers' files under `users/<account-uuid>/` and `tmp/<account-uuid>/`; a photo needs a licence record).

### II.7 Verification and change policy

- The editor is final as built. Behaviour changes only on an explicit owner instruction, one item at a
  time, and the item's acceptance in II.5 is met before it is called done.
- Every change is checked at desktop 1440 × 900 **and** phone 390 × 844 touch.
- Anything that paints is checked by frame differencing: hide the glyphs, diff two screenshots, require
  ≤1.1 px of ink outside the transform box.
- Any layer change is checked against the print sheet and the mockup, not only the canvas.
- `node --test tests/*.test.cjs` must stay green, and `tests/editor-touch.cjs` is run against a live
  server for anything interactive.
- Documentation: `Doc/EDITOR.md` is updated in the same change as the behaviour; this plan is updated
  when an item starts or finishes.

### II.8 Test coverage today

Counted on 2026-11-22 from the files themselves (each file run on its own, passing), not from memory.

| Suite | Tests |
| --- | --- |
| **Editor** | **245** |
| `tests/browser-guards.test.cjs` | 1 |
| `tests/canvas-shell.test.cjs` | 30 |
| `tests/canvas-spec.test.cjs` | 2 |
| `tests/design-draft.test.cjs` | 10 |
| `tests/design-export.test.cjs` | 7 |
| `tests/editor-align.test.cjs` | 8 |
| `tests/editor-arrange.test.cjs` | 8 |
| `tests/editor-attributes.test.cjs` | 12 |
| `tests/editor-flip.test.cjs` | 7 |
| `tests/editor-font-audit.test.cjs` | 5 |
| `tests/editor-fonts.test.cjs` | 12 |
| `tests/editor-image-ppi.test.cjs` | 11 |
| `tests/editor-layers.test.cjs` | 49 |
| `tests/editor-path-boolean.test.cjs` | 10 |
| `tests/editor-pen-path.test.cjs` | 6 |
| `tests/editor-pinch.test.cjs` | 11 |
| `tests/editor-price.test.cjs` | 4 |
| `tests/editor-shortcuts.test.cjs` | 6 |
| `tests/editor-snap.test.cjs` | 8 |
| `tests/editor-tool-options.test.cjs` | 12 |
| `tests/editor-viewport.test.cjs` | 8 |
| `tests/photo-adjustments.test.cjs` | 18 |
| **Admin** | **165** |
| `tests/admin-ads.test.cjs` | 12 |
| `tests/admin-attributes.test.cjs` | 10 |
| `tests/admin-brushes.test.cjs` | 13 |
| `tests/admin-cascade.test.cjs` | 10 |
| `tests/admin-csv.test.cjs` | 9 |
| `tests/admin-demo-auth.test.cjs` | 4 |
| `tests/admin-demo-data.test.cjs` | 13 |
| `tests/admin-jersey.test.cjs` | 10 |
| `tests/admin-loyalty.test.cjs` | 10 |
| `tests/admin-modules.test.cjs` | 11 |
| `tests/admin-order-print.test.cjs` | 12 |
| `tests/admin-orders.test.cjs` | 7 |
| `tests/admin-posts.test.cjs` | 13 |
| `tests/admin-pricing.test.cjs` | 16 |
| `tests/admin-settlements.test.cjs` | 8 |
| `tests/admin-takedown.test.cjs` | 7 |
| **Storefront and shared** | **295** |
| `tests/account-orders.test.cjs` | 6 |
| `tests/asset-catalogue.test.cjs` | 15 |
| `tests/asset-rebuild.test.cjs` | 3 |
| `tests/asset-routes.test.cjs` | 14 |
| `tests/cart-lines.test.cjs` | 9 |
| `tests/check-font-manifest.test.cjs` | 5 |
| `tests/checkout.test.cjs` | 10 |
| `tests/client-error-log.test.cjs` | 15 |
| `tests/contact-messages.test.cjs` | 8 |
| `tests/delivery-quote.test.cjs` | 5 |
| `tests/delivery-fee.test.cjs` | 5 |
| `tests/guide-card.test.cjs` | 5 |
| `tests/guide-http.test.cjs` | 5 |
| `tests/guide-products.test.cjs` | 17 |
| `tests/guides.test.cjs` | 10 |
| `tests/loyalty-ledger.test.cjs` | 7 |
| `tests/nyein-brand.test.cjs` | 5 |
| `tests/order-archive.test.cjs` | 9 |
| `tests/order-barcode.test.cjs` | 9 |
| `tests/order-qr.test.cjs` | 5 |
| `tests/order-refunds.test.cjs` | 8 |
| `tests/payments.test.cjs` | 9 |
| `tests/print-quality.test.cjs` | 40 |
| `tests/product-mockup.test.cjs` | 14 |
| `tests/product-trust-row.test.cjs` | 4 |
| `tests/pwa.test.cjs` | 7 |
| `tests/rate-limit.test.cjs` | 9 |
| `tests/search.test.cjs` | 5 |
| `tests/size-chart.test.cjs` | 7 |
| `tests/stock-movement.test.cjs` | 7 |
| `tests/storefront-info.test.cjs` | 8 |
| `tests/structured-data.test.cjs` | 8 |
| `tests/wishlist.test.cjs` | 7 |
| **All suites** | **705** |

`tests/editor-touch.cjs` is the browser suite (22 sections, run against a live server): the draft
reload, 25 layers, the 30-step undo floor, a second finger mid-stroke, a rotation, a long Burmese word
wrapping between grapheme clusters, Burmese text under all five painted effects, an upload that cannot
be decoded, the hover highlight in both directions, the caret above a shrinking (keyboard-sized)
viewport, the 320 × 480 tools bar, the bar and canvas at 844 × 390, 480 × 320, 768 × 1024 and
1024 × 768, a browser that refuses the draft, and a console guard that fails the run on any uncaught
exception or `console.error`.

`tests/storefront-e2e.cjs` drives the purchase path over CDP at 1440 × 900 and 390 × 844 touch, and
asserts that every control on the home, editor and checkout pages has an accessible name, that each of
those pages has exactly one `<h1>`, that the header search field shows its focus on the pill, that every
checkout field carries `aria-invalid` and its own message after a failed submit, that the cart button
names its count, that the order confirmation takes focus, that the first Tab reaches a skip link which
lands on the page heading, that every header control shows a focus ring, that the closed phone drawer is
inert and Escape hands the focus back from it and from the cart panel, that every text token in both
themes reaches WCAG AA against both page backgrounds, that the category strip stops when the system asks
for reduced motion, that the product page marks the chosen size/colour and announces the price and
quantity, that removing a cart line hands the focus to the next line and says what left, that the notification
panel is a dialog with a state, an unread count and Escape, that un-hearting a wishlist card hands the
focus to the next card and says what left, that the account section nav marks the current section and
hands the focus to its heading, that every route keeps one h1, named controls, alt text, unique ids and an
ordered outline, that the contact form announces its issues, marks the bad field and hands the focus to
its confirmation, that the admin drawers, the pricing bottom sheet and the product image lightbox move
the focus in, keep Tab inside and give it back on Escape, that the phone admin sidebar is inert while
closed and takes the focus when open, and that all 18 admin dashboard routes hold the same structural
bar (one h1, named controls, unique ids, ordered outline) at 1440 and 390, and that `<html lang>` follows the language switcher (English, then Myanmar, and back across a reload).

The last full run (`node --test tests/*.test.cjs`) reported **705 passing, 0 failing**, against a server
on port 3000 (`guide-http` needs it; it fails with ECONNREFUSED otherwise), and both browser suites
passed on the same build.


#### Checks run 2026-11-22 (shop side, admin, routing)

| Check | Result |
|---|---|
| Unknown slug on `/products`, `/guide`, `/collections`, `/admin/orders` | 404, no stack trace |
| Reflected input: `/search?q=<script>`, `/guide?q=<img onerror>`, `/products?design=javascript:` | rendered escaped, no payload in the HTML |
| Demo admin: register → `/admin` ("Good morning, Owner") → `/admin/pricing` | 24 combination rows, prices shown in Ks, no console error |
| Admin pages without a session | redirect to `/admin/login`, so the guard holds |
| Layer rename to `""` or whitespace | keeps the old name (`updateEditorLayer` trims and falls back) |
| Upload a renamed non-image (`.heic`, `.png` with text inside) | no crash; the notice now names the file and suggests JPG/PNG/WebP (it used to show only Chrome's "The source image could not be decoded.") |
| Upload a real 8×8 PNG | image layer added, "Upload reduced to 762 B and added to the canvas." |
| Checkout with a seeded cart (no Supabase needed) | line + total 42,000 Ks, order `#MH1101` written with a `checkoutKey`, stage Pending Payment, cart emptied, no console error |
| Checkout submit on an empty form | used to report only the terms; now lists name, phone, address, township, city and terms together |
| Pen / shape / eraser with a single click (no drag) | no junk layer, no console error |
| Press sheet from `/admin/orders` at 390x844 | opens its own tab (real click keeps the popup), 390/390 scroll, print button present |
| Admin settings save → reload | used to show the seed values again and the next Save reverted the stored ones; now the saved name/rate survive a reload and a second save, and Reset demo data still restores the seed |
| Every admin route at 1440x900 and 390x844 | 24 loads, no console error, no sideways scroll, a heading on each |
| Admin orders at 390x844 (touch) | 390/390 scroll; a tap on "Advance #MH1086 to Printing" moves the order Processing → Printing; the drawer opens with the print button and the note field; printing records a `reprints` entry so the button reads "Reprint the press sheet" |
| Delivery fee on checkout | by design the fee is quoted later; "Total today" is the subtotal and the panel says so |

The shop catalogue and the checkout cannot be exercised in this workspace: products come from
Supabase and `NEXT_PUBLIC_SUPABASE_URL` is unset, so every product list is empty and there is nothing
to add to a cart. Those flows need the database (E15) before they can be tested end to end.

## 2026-11-21 — The app (`App/`): Flutter for iOS and Android

The shop now has a phone app. It is a Flutter project in `App/` (Flutter 3.50.1 / Dart 3.14), built for
Android and iOS from one code base, and it shares the web shop's backend rather than copying it:

- **Catalogue** — `SupabaseCatalogRepository` reads the same Supabase project with the public anon key,
  over the same PostgREST queries `apps/web/src/lib/products.ts` makes (`products`, then
  `product_price_ranges` merged by id). A product the admin edits on the web is in the app on the next
  refresh; there is no second catalogue, no sync job and no cache to invalidate.
- **Delivery** — `SiteDeliveryRepository` posts to the existing `POST /api/delivery/quote`, and falls
  back to the shop's own fee table (the same bands as `DELIVERY_FEE_TABLE`) when the courier cannot be
  reached, so the cart always shows a fee.
- **Money and dates** — grouped kyat (`Ks` / `ကျပ်`), dollars at `usd_rate_ks`, dates in Yangon time.
- **Screens** — Home (new arrivals), Shop (search + sub-brand filter), Product, Cart, Checkout (address,
  live quote, total), Account (language EN/MM, currency Ks/$, orders on this phone, wishlist).
- **State** — one `ChangeNotifier` (`lib/state/app_state.dart`) with the cart, wishlist, orders and the
  two preferences, written through `KeyValueStore` (`SharedPreferences` on a device, `MemoryStore` in
  tests), so a cart survives a restart.
- **Orders** — the web shop has no order endpoint yet, so the app does not invent one: it keeps the
  order with the shop's `MH…` reference and offers the order text for copying. `PlacedOrder`,
  `DeliveryAddress` and `OrderLine` already carry what an endpoint needs.

Verification: `cd App && flutter test` → **39 tests passing** (formatting, product parsing, PostgREST
query shape and search escaping, fee table, quote call and its fallback, cart, order series, restart
persistence, and the four tabs driven as real widgets), and `dart analyze` → no issues. The Android and
iOS binaries need the Android SDK / Xcode, which this workspace does not have, so the APK/IPA build is
the owner's step (documented in `App/README.md`).

`App` is now an allowed repository-root entry in `tests/repo-layout.test.cjs`, and the app is described
in `Doc/APP.md`.

## 2026-11-21 — Edit sidebar: Photos and Patterns join Designs, Elements, Text, Uploads and Image Create

The owner asked for two more categories in the Edit sidebar rail, so the rail now reads **Designs,
Elements, Photos, Patterns, Text, Uploads, Image Create** (the old "Upload" label became "Uploads" to
match the rest of the list).

- **Photos** (`lib/editor-photo-library.ts`, `MH_PHOTO_LIBRARY`) — nine thumbnail cards with a search
  field. Adding one calls `addCanvasPhoto` in `EditorCanvas`, which builds an image layer from the
  photo's URL and pixel size through `imageLayerBox`, so it lands fitted to the print area exactly as an
  upload does, is selected, and reveals the Layers stack. The entries are placeholder stock (Lorem
  Picsum, fixed seeds, `placeholder: true`) until licensed photographs are bought; the panel says so, and
  the migration is "point `url` at the R2 object and clear the flag".
- **Patterns** (`lib/editor-pattern-library.ts`, `MH_PATTERN_LIBRARY` / `MH_PATTERN_LAYERS`) — nine
  generated fills: dots, micro dots, diagonal stripes, hairlines, grid, waves, checker, crosses,
  terrazzo. Each is a `d` string that already tiles the 1000 x 1200 artwork space, wrapped by
  `patternToDesignLayer` into a shape layer, so it enters the canvas through the existing element path
  and can be moved, scaled and rotated with the normal tools. The tiles are trimmed to the canvas
  rectangle: the first diagonal-stripe version drew unclipped parallelograms whose bounds reached from
  -1200 to 2194, which would have hung the transform box a canvas-width off each side.

Checks: `npx tsc -p apps/web/tsconfig.json --noEmit` clean, `eslint` clean on the four changed files,
`node --test tests/*.test.cjs` **829 passing, 0 failing** (the shell test now pins the rail order and the
new panels; the touch test expects the seven rail buttons). The nine pattern tiles were rendered in
Chromium and inspected as an image: every tile covers its canvas, and the wave rows span the full width
(the first version only reached a quarter of it).

## 2026-11-21 — Guide: "See more" under the post boxes, related posts under an article

The owner asked for two changes to the Guide section:

1. **No "View All Posts" link.** The link sat at the top-right of the "Latest posts" heading, above the
   grid, and looked like a second navigation row. It is gone. The grid now shows eight cards and a
   **See more** pill sits centred under the boxes, carrying the number of posts still hidden; each press
   reveals another eight and the pill disappears when nothing is left. The grid moved into
   `components/guide/GuidePostGrid.tsx` (client) with `GUIDE_GRID_PAGE_SIZE = 8`.
   Every card is still server-rendered into the HTML — the cards past the first page carry
   `data-guide-card="more"` and the `hidden` class — so crawlers and the category pages keep every
   article link, and a `<noscript>` style in `app/guide/page.tsx` shows them all when JavaScript is off.
   Switching category or running a search remounts the grid (`key`), so the count starts again from
   eight instead of carrying the previous reveal depth.
2. **Related post boxes under an article.** The section under an article used to list only posts from
   the same category, capped at three, so the newest post in a thin category showed nothing and every
   article in a full one repeated the same three cards. `relatedGuidePosts(posts, post, limit)` in
   `lib/guides.ts` now ranks same-category posts first, then posts that sell the same products, then
   anything else, drops the article itself, and takes four. The article grid uses the same square card
   and the same 2 / 4 column rhythm as the landing grid.

Checks: `tsc --noEmit` clean; `eslint` clean on the changed files (two pre-existing warnings only);
`node --test tests/*.test.cjs` **830 passing, 0 failing** — the guide HTTP test now pins the eight-card
first page, the See more control, the `<noscript>` fallback, the absence of "View All Posts", and that
an article's related cards are neither the article itself nor duplicated; `tests/guides.test.cjs`
covers the ranking with the starter catalogue. In Chromium at 1440x900 and 390x844 (touch) the landing
grid showed 8 of 12 cards with a "See more 4" pill that expanded to all 12 and then disappeared, and
`/guide/payment-options-at-checkout` showed four different related cards under "Keep exploring".

## 2026-11-21 — Guide posts carry photos, one shared banner, and the article takes the full width

Three owner requests turned into one pass over the Guide section:

1. **Photos in the posts.** `GuideSection.images?: GuideImage[]` (`{ url, caption }`) is parsed from the
   `sections` JSON in `lib/guides.ts`, so a post written in Supabase can carry photos too, and every one
   of the twelve starter posts now has a **cover photo** (the card and the top of the article) plus one
   captioned photo inside its first section. The URLs are Picsum **placeholder stock** with hand-picked
   ids (desks, devices, flat lays, shoes) so the subject is not nonsense; `Doc/DOCUMENTATION.md` and the
   starter note say a licensed photo replaces the URL. Captions are the alt text.
2. **One banner for the landing page and every article.** `components/guide/GuideBanner.tsx` is the green
   gradient banner the landing hero already used: eyebrow, `<h1>`, lead, meta row and an action slot. The
   article's old two-column cover card (photo left, title right) is gone, so a post opens with the same
   banner as the Guide page, carrying the category as the eyebrow, the title, the excerpt, the reading
   time and two buttons ("More in …", "All guides").
3. **No box beside the article.** The "On this page" table of contents — and with it the 230 px side
   column — is removed, so the article spans the whole content column. The section headings keep their
   `id`s, and the article's bullet lists got `list-disc` back (Tailwind's preflight had left them with no
   markers).

Checks: `tsc --noEmit` clean; `eslint` clean apart from the two `<img>` warnings the repo already lives
with; `node --test tests/*.test.cjs` **830 passing, 0 failing**. In Chromium at 1440x1000 and 390x844
(touch) all twelve landing cards load a photo, an article shows two `data-guide-figure` photos with a
caption, the article box measures exactly the content width (1117 px desktop, 358 px phone) and the page
has no "On this page" text and no horizontal overflow.

## 2026-11-21 — The buying box follows the post: only Buy Now and Add to Cart, and only the options the admin ticked

The owner opened a Nyein piece and asked for two things: the card under the product name holds **Buy Now
and Add to Cart only** (no Edit Design), and the option boxes — Colour, Size, Material, Fit Type, Sleeve,
GSM, and whatever else a drop sells — must come from **what the admin set when the post was created**, so
a piece with no colour choice shows no colour box and a piece with no sizes shows no size box.

1. **The buying box.** A ready-made piece (`is_customizable = 'none'`, or any `sub_brand = 'Nyein'`) is
   never design-editable, so the box is Buy Now + Add to Cart on a two-column grid. The
   "Ready-made design — sold as shown" line moved out of the box into the **Product Details** tab, so the
   box contains only the two buttons.
2. **The boxes come from the catalogue.** `lib/product-options.ts` owns the rules: the product's
   `product_attribute_types` rows (name + values, ordered by `display_order`) are the page's boxes, an
   attribute the admin left unticked simply is not rendered, a one-option box opens already chosen, and
   only real choices (two or more options) are required before Add to Cart. `getProductOptionGroups`
   reads the rows in `lib/products.ts`; a product with **no** rows keeps the shop's defaults so an
   unconfigured catalogue still sells, and a ready-made piece with no rows falls back to the **size box
   alone**. Further attributes (Print Method, Knit Structure, MH Cuttings) travel with the cart line
   through `CartVariant.extras`.
3. **Nyein pieces open their own page.** When the catalogue carries no Nyein rows the page shows stand-in
   pieces; those cards used to link to `/products`, and the detail page 404'd. The product route now
   resolves the same stand-in slug, so the buying box can be tried before the rows exist.
4. **SQL.** `SQL/0008_product_options_public_read.sql` grants anon SELECT on `product_attribute_types`,
   which `0004` missed — without it a logged-out visitor cannot learn which attributes a post sells on.

Checks: `tsc --noEmit` clean; `eslint` clean apart from the two pre-existing warnings; `node --test
tests/*.test.cjs` **838 passing, 0 failing** (8 new in `tests/product-options.test.cjs`). In Chromium at
1440x1000 and 390x844: `/products/nyein-oversized-tee` shows the Size box and exactly Buy Now + Add to
Cart, with no Edit Design and no ready-made line in the box; a preview page rendered the same component
with the default groups (Size, Color, Material, Fit Type, Sleeve, GSM) and with an admin subset (Size +
one-colour Color + Print Method + MH Cuttings), confirming an unticked attribute leaves no box behind.

## 2026-11-21 — Jersey mapping removed; the dashboard's sidebar hides behind a menu button (owner request)

1. **Jersey mapping is gone for now.** The owner wants jersey panels uploaded with the post itself later,
   so the mapping screen, its tab inside Posts, its route and its helpers were deleted:
   `app/admin/jersey/page.tsx`, `components/admin/AdminJersey.tsx`, `lib/admin-jersey.ts`,
   `tests/admin-jersey.test.cjs`, the `jersey` module in `ADMIN_MODULES`, and the `/admin/jersey` entry in
   `public/manus-routes.json`. **To be specified by the owner:** the future shape — a panel quad per
   garment region attached to a T-shirt post, with the worn photo uploaded alongside the post artwork. The
   seed types (`JerseyStyle`, `JerseyPanel`, `jerseyStyles` in `lib/admin-demo-data.ts`) are kept as data
   only; no screen reads them until the owner describes the upload flow.
2. **The dashboard hides its navigation behind the menu icon, the way a video site does.** `AdminShell`
   is rebuilt around one full-width top bar: **☰ · MH FASHION. / SUPER ADMIN · PREVIEW · search · account
   actions**. The bar is sticky and spans the window, so it does not move, shift or resize when the sidebar
   opens — the 224 px panel slides underneath it (`top: 64px`) and the content slides aside by the same
   224 px. The brand block left the sidebar: it now sits between the menu button and the search, where the
   owner wants it. The ☰ toggles on every width (it used to be phone-only), Escape closes the panel and
   returns focus to the button, the closed panel is `inert`, and the panel starts closed.
3. **Scope correction.** The first attempt put the menu on the *storefront* header (a `SiteMenu` drawer in
   `Header.tsx`); the owner asked for the **admin dashboard** only, so that drawer was deleted and the
   storefront header/mobile drawer were restored to their previous commit. Nothing on the shop surface
   changed.
4. **One nav list.** `lib/admin-nav.ts` (`ADMIN_NAV`) feeds the shell's sidebar rows and matches
   `ADMIN_MODULES`, the permission list, one-to-one; `AdminShell` keeps only the icon map.

Checks: `tsc --noEmit` clean; `eslint` 0 errors (one pre-existing warning); `node --test
tests/*.test.cjs` **832 passing, 0 failing**, including `tests/admin-menu.test.cjs` (the toggle, the
`inert` panel, the two nav lists matching, and Jersey mapping deleted without a trace). In Chromium at
1440x900 on `/admin/posts` the top bar measures the same rect open and closed (`0,0,1425x64`; ☰ at x=28,
brand 75-210, search from x=275, brand before search), the sidebar sits at y=64 in both states and stays
there through a 400 px scroll, and its width goes 0 → 224 → 0. At 390x844 the drawer opens below the header
(`0,64,224x780`) with the header still on screen. Escape closes and returns focus to the ☰; picking a row
navigates and leaves the panel closed. `/admin/jersey` answers **404**.

## 18. The storefront speaks Myanmar — all of it, not just the dictionary

The dictionary was complete after §17, yet the home page still read English end to end: the hero, the
two product strips, both promo cards, the category heading, the cart header, the guide banner, the phone
drawer and the `NEW` badge on every card each carried their own copy in JSX. Those are the pages a visitor
lands on, so the half-translated dictionary never showed.

### 18.1 What moved into the dictionary
| Area | Keys |
|---|---|
| Home hero | `home.heroTitle1/2`, `home.heroSub`, `home.heroCta`, `home.heroMark1/2` |
| Home strips | `home.popular`, `home.newArrivals`, `home.viewAll`, `home.emptyStrip` |
| Home promo cards | `home.promoTitle/Sub/Cta`, `home.rewards`, `home.rewardsTitle1/2`, `home.rewardsSub`, `home.rewardsCta` |
| Category row | `home.categoryHeading`, `home.categoryViewAll`, `category.<slug>` for the five default chips |
| Cart | `cart.subtitle` (the title already had `cart.title`) |
| Guide chrome | `guide.heroTag`, `guide.lead`, `guide.earnTitle1/2`, `guide.earnSub`, `guide.joinNow`, `guide.learnCreate1/2`, `guide.browseAll`, `guide.noGuidesMatch`, `guide.allGuides` |
| Phone drawer | `nav.tShirts`, `nav.cups`, `nav.phoneCovers`, `nav.bags`, `nav.hoodies`, `nav.language` (the rest reuse `nav.*`) |
| Product card | the `NEW` badge reads `nav.new` |

`MobileNav`'s four link arrays now carry `labelKey` instead of a label and `LinkRow` translates them, so a
drawer row cannot be English while the dictionary holds the same word. `CategoryRow` became a client
component and looks up `category.<slug>`, falling back to the catalogue name for a category the dictionary
does not know (the owner can add chips from the admin without waiting for a translation).

### 18.2 What is still English on purpose
Guide **articles** — titles, excerpts, bodies and category names — come from the `guide_posts` /
`guide_categories` rows seeded by `lib/guide-starter.ts`. That is editorial content, not chrome: the owner
writes the Myanmar version of a post the same way they write the English one. The chrome around it (banner,
lead, buttons, empty state, category shortcuts) is translated.

### 18.3 Checks
`tsc --noEmit` clean; `eslint` 0 errors; `node --test tests/*.test.cjs` **923 passing, 0 failing**. In
Chromium at 1440x900 and 390x844 in Myanmar mode, a scan for leftover English chrome returns nothing on
`/`, `/cart` and the guide landing page (only guide article titles remain); `overflowX` is 0 at 390 px; no
console errors. `tests/admin-ads.test.cjs` now asserts the hero copy comes from `home.heroTitle1` in the
dictionary rather than from a literal in the page.

### 18.4 The second and third sweeps: every screen behind the landing pages

The first sweep covered the pages a visitor lands on. The next two covered the rest.

| Screen | What moved |
|---|---|
| `/account` | order/wishlist empty states, the refund dialog (reason, detail, policy link, send, cancel, "we answer within one working day"), the loyalty card sentences, the four dashboard tiles, the points ledger rows, "History", "expired" |
| `/wishlist` | heading, clear button, empty state, "Browse products", both shortcut buttons |
| `/products`, `/checkout` | eyebrow, title, lead, empty-catalogue note |
| `/popular`, `/new`, `/collections` | the whole hero (eyebrow, two-line title, lead, CTA, the rotated mark), list headings, badge, empty note; the six collection tiles carry `collections.item.*` keys |
| `/mh-fashion` | filter title, `Category`/`Size` legends, `In Stock Only`, `Apply Filters`, `Sort`, `Categories`, the hero (eyebrow, both headline lines, lead, CTA, the `MH / FASHION` mark), list title/lead, empty note, and the six filter labels (`shop.*`, `mh.*`) |
| `/nyein` | hero title/lead/CTA, the `NYEIN / READY-MADE` mark, the "Printed / As Shown" stamp, both strip headings and their notes, the cotton card and the "Printed once / Kept forever" card (`nyein.*`) |
| `/products/[slug]` | the back link, the five policy tabs, `Size Guide`, `New`, `Quantity`, `In Stock · Ready to ship`, `Edit Design`, the details copy, every specification label, the size/reviews/shipping leads, `Based on 126 reviews`, `Related Products` (`product.*`) |
| `/guide/[slug]` | the sidebar card, `Back to all guides`, `FAQ`, `Keep learning / Keep creating`, `Create a design`, the breadcrumb label and the starter-post disclaimer (`guide.*`) |
| `/contact` | the eyebrow, title, lead, the copyright-claim block (title, paragraph, "Include", the three steps, the record note), "Faster answers" and its four links, and the whole form: heading, lead, six field labels, four topic options, the sent confirmation, "Write another message", "Send to the shop", "Open in your email app", copy/copied, the mail-app hint and "Subject:" |
| `/shipping`, `/returns`, `/size-guide` | the whole page, through `INFO_PAGES_MY` |
| `/about`, `/faq` | the whole page. `INFO_PAGES_MY` in `lib/storefront-info.ts` holds the Myanmar `eyebrow`/`title`/`lead`/`sections`, and `InfoPage` picks it when `locale === "my"` |
| `/offline`, `error.tsx`, `guide/error.tsx` | every sentence |

Implementation notes:

- The account page keeps a page-local `COPY = { en, my }` for its dashboard wording. The newer blocks
  (orders, refunds, points) had been written straight into JSX after that object existed, so they switch on
  `const my = locale === "my"`: their sentences interpolate counts, money and dates, which a flat dictionary
  key cannot express. `AccountOrderCard` had no `t` in scope; it now calls `useI18n()` itself.
- Server components use `<T k="..." />`; client components use `t("...")`. A few strings cannot move:
  `placeholder` takes a string, not a node (`/mh-fashion` search), and `global-error.tsx` must stay English
  because it replaces the root layout, so `LocaleProvider` is not mounted and `useI18n()` throws.
- `tests/nyein-page.test.cjs` and `tests/product-trust-row.test.cjs` asserted the English literals in the
  page source; they now assert the dictionary keys and the English text in `i18n.tsx`.

Still English by design: tier names (`Silver`, `Gold`), demo wallet/handle values, guide article bodies, and
`formatOrderDate`'s `28 Nov 2026` month names. Those are data or a date formatter, not chrome.

`InfoPage` is now a client component because it reads the locale, so `infoPageMetadata` moved to
`lib/storefront-info.ts`: a server page cannot call a function exported from a `"use client"` module
(`Attempted to call infoPageMetadata() from the server but infoPageMetadata is on the client` failed the
build for every info page).

The legal pages (`/privacy`, `/terms`, `/cookie-policy`, `/shipping`, `/returns`) are still English on
purpose. They carry a draft banner, and machine-translating a legal draft that the owner has not signed off
would read as a finished policy. They need a human translator and the owner's review in one pass.

`screenshots need a Myanmar font`: the container ships only DejaVu, so every Burmese glyph renders as a
tofu box and a screenshot looks broken even when the markup is right. Put Noto Sans Myanmar in
`~/.local/share/fonts` and run `fc-cache -f` before judging a picture; `document.textContent` and the
`scrollWidth` check still tell the truth without it.

## §18.5 Posting a product: tags and category reach the search

- `AdminProduct` carries `tags: string[]` and `AdminProductDraft` carries the raw `tags: string`. The editor
  turns the typed list into the stored one with `parseProductTags` (comma or new line, trimmed, spaces
  collapsed, case-insensitive de-duplication, capped at `PRODUCT_TAG_LIMIT` = 10), shows the parsed chips
  under the field, and validates both the count and `PRODUCT_TAG_MAX_LENGTH` = 24 per tag.
- The products table shows the tags under the product id and the table search matches them, so the owner can
  find a product by a tag they typed.
- The shop search reads them too: `searchCatalog` selects `tags`, adds them to the ranked text beside the
  name, sub-brand, product type and slug, and returns them on `Product`. `search_text` in the database
  (migration 0009) already folds `tags` and `product_type` in, so the same query answers from SQL and from
  the ranking pass.
- A shop that has not run 0009 yet is handled: the query is retried without `tags`, then without
  `search_text`, then without both. The first attempt that answers wins, so a deploy before the migration
  does not blank the search.
- Still open: the admin's product save writes to the local demo store, not to Supabase, so a posted product
  only becomes searchable in the shop once an admin write path exists. The table already has the column.

## §18.6 A design is posted with its product, not on its own

- The owner does not post designs separately, so there is no Designs module any more: the sidebar entry, the
  `/admin/designs` route, `AdminDesigns.tsx`, the module id and the dashboard's "Published Designs" stat are
  gone. `/admin/designs` answers 404 and the route manifest no longer lists it.
- The product editor carries the design instead: a **Design** block with a required `Design name` and an
  optional `Artwork file URL` (`AdminProduct.designName` / `designSvgUrl`). The products table shows the
  design name under the product name, so the artwork is visible where it is posted.
- The shop has no designs group either: `/search` answers Products and Guides, `SearchTabs` renders two
  tabs, `SEARCH_CAPS` is `{ products: 40, guides: 10 }`, `?type=designs` falls back to products, and
  `/api/search/suggest` returns `product` and `guide` suggestions only.
- The editor's built-in starter templates (`MH_DESIGN_LIBRARY`) are untouched: they are a starting point
  inside the editor, not a catalogue entry.
- Stored demo data saved before this change has no `designName`; the loader backfills it from the product
  name (and an empty `tags` list) so an old row can still be opened and saved. The loader now also stores
  the mapped `products` it builds — it previously spread `...parsed` over them, which silently dropped every
  product backfill.

## §18.7 A search answer is the product cards and nothing else

- The owner does not want the search page to announce itself over the answer: no "Shop" kicker, no "Search"
  title, no "3 results for “…”" sentence, no "matched on …" note, no group tabs and no "Popular right now"
  block. A query renders the product grid; nothing else sits above it but the search field.
- The query text is not echoed back anywhere on the page, including the empty state ("Nothing matched").
- Guides are no longer a search group: `SearchTabs.tsx`, `readSearchType`, `searchHref` and the unused
  `search.*` dictionary keys are gone, and `SEARCH_CAPS` is `{ products: 40 }`. A stale `?type=` link still
  answers (the parameter is ignored).
- The header's suggestion dropdown is unchanged: it still offers products and guide posts, so a guide is
  still one keystroke away.

## §18.8 One thin admin footer, and the sidebar stops above it

- The admin shell renders a single 32px bar pinned to the bottom of the viewport (`data-admin-footer`):
  "MH FASHION. · Admin preview · Sample data only" on the left, "© {year} MH Fashion. All rights reserved."
  on the right. It never scrolls, so the copyright stays put while the page moves.
- The sidebar is `fixed top-[64px] bottom-[32px]`, so it ends exactly at the bar's top edge and never runs
  behind it; the phone dimmer stops at the same line, so the bar stays visible while the menu is open.
- The site-wide `CopyrightBar` returns null under `/admin`, so there is only one copyright bar on those
  screens. `<main>` carries `pb-14` so the last row clears the pinned bar.

## §18.9 Switching language never resizes a control

- The Myanmar line box rule now has two halves: prose (`p, li, h1-h6, dd, dt, blockquote, figcaption,
  td, th, textarea`) keeps `line-height: 2.1`, and controls (`a, span, label, button, input, select`)
  keep `1.5` through `:where()` so an explicit `leading-*` utility still wins. Before this, every button,
  pill, nav link and input grew about 1em when the locale switched, so the header jumped 56 -> 65px.
- Chrome sizes are pinned rather than inherited: the header pill is `h-14`, the search field
  `h-[30px]` (`h-10` for the compact one), the language/currency pills 22px, payment badges `h-5`,
  app-store links `h-6`, the phone tab bar `h-[60px]` with `h-[52px]` items, the home/guide/account
  CTAs `h-6..h-10`, and menu rows `h-[42px]` / `h-[52px]` with a truncating label.
- Measured with Chromium at 1440x900 and 390x844 across `/`, `/create`, `/collections`, `/cart`,
  `/account`, `/search`, `/guide`, `/nyein`, `/checkout`: every control box keeps the same **height**
  in EN and MM. Widths still follow the label, because a Burmese label is a different length.
- Content blocks (the hero, the `min-h-[150px]` promo tiles) still grow with the copy; pinning them
  would clip Burmese text.

## §18.10 Admin sidebar: one white panel, navigation only

- The admin sidebar is the same white panel as the header bar (`bg-white`, `border-r border-[#e8ebef]`,
  text `#27303b`) instead of the old dark `#11171b` slab, so the top bar and the menu read as one surface.
  Nav rows: `#5b6672` with a `#f2f4f6` hover; the current row is `bg-[#eef7e3]` with a `#4cae22` left edge
  and `#3f7d12` text.
- The "Create. Print. Wear." promo card and its "Open design editor" link are gone, and so is the sidebar
  account row: the sidebar now holds the navigation and nothing else, so it is one flat colour from the
  first row to the last.
- The account and its sign-out appear once, in the header bar. They used to be duplicated in both places.
- `admin-scroll` (formerly `admin-scroll-dark`) paints a grey thumb, because a light-on-white scrollbar is
  invisible.

## §18.11 The customer dashboard has no wallet

- A wallet balance implies a prepaid balance the customer can top up, and there is no top-up in this shop:
  every order is paid at checkout (Visa or one of the three wallets as a *payment method*). The
  "Wallet Balance" card (a hard-coded Ks 12,500 with a fake "+Ks 2,000" credit) is removed from
  `/account`, and its label is gone from both dictionaries.
- The stat row is now three cards — Total Orders, My Points, Wishlist — on `sm:grid-cols-2 xl:grid-cols-3`,
  so they still fill the width evenly.

## §18.12 A language switch no longer resizes a box

Measured by dumping every painted box (background, border or radius) on `/`, `/create`, `/collections`,
`/cart`, `/account`, `/search`, `/guide`, `/nyein`, `/checkout`, `/new`, `/popular` and `/mh-fashion` in
both locales at 1440x900 and 390x844 and diffing width/height. Before this pass the home banner alone
went 340 -> 509px and the promo tiles 208 -> 263px.

- **Banners** (`data-hero`): the guide banner's height is the reference — every page banner is
  `h-[206px] sm:h-[250px] lg:h-[267px]`, and the guide banner itself `min-h-[206px] sm:min-h-[250px]
  lg:min-h-[267px]`. Burmese sets a 2.1em line box, so the headline is drawn smaller inside that height
  (`16px / 20px / 24px` by breakpoint), the `<br />` that splits the two English halves is dropped so
  the Burmese headline is one line, the copy column is wider (`84% / 66% / 52%`), the lead is clamped to
  two lines and the call to action is `h-8` from `sm` up. The account banner is `data-hero` too.
- **Tiles and cards** take the taller (Burmese) measure as a `min-h`, so both languages render them at
  one size: home promo tiles (`min-h-[168px]` / `h-[252px]`), collections tiles (`min-h-[172px]`,
  `w-[160px]` in the phone scroller, `sm:w-auto` in the grid), nyein tiles (`min-h-[266px]`), the cart
  empty state (`min-h-[390px] sm:min-h-[323px]`), the checkout empty state, the search cards
  (`min-h-[311px] sm:min-h-[212px]`), the account profile/points/stat/recent-order/settings/help cards,
  the guide sidebar cards and the mh-fashion aside.
- **Bars and lists**: `data-tight-line` keeps the Latin line box (1.5) in Myanmar for the copyright bar
  and the footer link lists, so those bars do not grow; the footer also carries `min-h-[862px]
  md:min-h-[349px]` for the wrapped copy.
- **Pills**: every CTA pill has a `min-w` equal to its wider (Burmese) label, so the pill does not
  change size on switch. The label is centred inside it.
- Verified: the only remaining size deltas are text containers (page titles, section wrappers), the
  guide card thumbnails inside a fixed square card, and a conditional count badge. Every banner keeps
  2-16px of slack for the Burmese copy at both widths, so nothing is clipped.
- `tests/myanmar-typography.test.cjs` pins the banner heights, the Myanmar type scale, the tight-line
  hook and the card `min-h` values.

## §18.13 What still moves on a language switch, and why

The §18.12 pass took every painted box on twelve routes to 0 px. Four rows were left in the diff on
purpose. This section records each one with its measured numbers and the decision, so the next agent does
not "fix" them and clip the Burmese copy.

| What | EN → MY (1440x900 / 390x844) | Decision |
|---|---|---|
| Page-title band on `/checkout` (87 -> 138), `/cart` (498 -> 549), `/account`, `/collections` (906 -> 952 / 746 -> 848), `/new` and `/popular` (622 -> 645), `/nyein` (1496 -> 1525), `/` (1153 -> 1182 / 1157 -> 1215) | +23 to +102 px, from the `<h1>` wrapping to two 2.1em lines | **Leave.** A page title is text, not a box: no fill, border or radius to hold still. Forcing one line would clip the Burmese title, and a fixed band would need the `data-hero` treatment (a smaller Burmese title), which is a design decision, not a bug fix. Ask the owner before doing it. |
| Guide card image (246x208 -> 246x200, 246x193 -> 246x177) | -8 / -16 px | **Leave.** The card is `aspect-square` and stays 246x246 in both languages; only the `flex-1` image gives room back as the Burmese caption grows. Pinning the image would push the caption out of the card. |
| Account order-count badge (31x20 in EN, absent in MY) | badge not rendered | **Leave.** The badge prints `orders.length`; the Burmese view of that fixture has one order fewer, so the element is not in the DOM at all. A data difference, not a size drift. |
| Guide category tag (23x20 -> 23x19) | -1 px | **Leave.** A 9px tag inside a 1.5 line box; sub-pixel rounding, under the 2 px bar the rest of the pass uses. |

Everything else — banners, promo tiles, collection tiles, empty states, account cards, the guide
sidebar, the footer, the copyright bar and every CTA pill — is 0 px at both widths.

### §18.13.1 Re-running the check

The check is a browser measurement, so it is not in the unit suite; do it on every layout change.

1. `npm run build --workspace=apps/web` and start the server on port 3000 (kill any old `next-server`
   first, or you measure the previous build).
2. `chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank`.
3. For each locale (`en`, `my`, set through `localStorage["mh-locale"]`, then reload) and each width
   (1440x900 desktop, 390x844 mobile), visit `/`, `/create`, `/collections`, `/cart`, `/account`,
   `/search?q=tee`, `/guide`, `/nyein`, `/checkout`, `/new`, `/popular`, `/mh-fashion` and record every
   element that has a background, a border or a radius, keyed by `tagName + className + text`, with its
   `getBoundingClientRect()` width and height.
4. Diff the two locale dumps per width. Acceptance: the table above is the *only* output.

### §18.13.2 Rules for a new box

1. A banner is `data-hero` plus a fixed height at every breakpoint (`h-[..] sm:h-[..] lg:h-[..]`). Never
   give a banner `min-h` — its copy then sets the height and the box grows on a language switch.
2. A tile or card takes the taller (Burmese) measure as `min-h`. A phone-only height goes in the base
   class and the desktop value behind `sm:` (`min-h-[390px] sm:min-h-[323px]`).
3. A one-line bar or a link list gets `data-tight-line`, which keeps the Latin 1.5 line box in Myanmar.
4. A pill with a fixed label gets `min-w` equal to its wider (Burmese) label and centres its text.
5. Add the new value to `tests/myanmar-typography.test.cjs` ("a language switch never resizes a banner,
   tile or card") so the contract cannot drift.
