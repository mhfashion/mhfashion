# MH Fashion — Master Plan

**Canonical planning file:** `Plan/PLAN.md`
**Consolidated from:** the former project, editor vision, editor implementation, legacy architecture, deployment notes, and TODO sources. Their full planning/specification/history content is preserved below. Operational guidance and audit records are consolidated in [`Doc/DOCUMENTATION.md`](../Doc/DOCUMENTATION.md).
**Repository baseline at consolidation:** `mhfashion/mhfashion`, branch `main`, commit `90dc398` (2026-11-13). Re-check code and deployment before treating dated status statements as current.

## Owner directives and maintenance rules

1. **UI/UX must cover Web and Phone together.** Whenever a UI/UX feature is planned or changed, specify, design, implement, and verify both Web/Desktop and Phone/Mobile in the same plan and work item. Include responsive layout, interaction differences, accessibility/touch behavior, important states, and acceptance checks for both form factors. Do not plan Web alone and leave Phone behavior undefined.
2. After each website-related implementation task, record completed work, evidence, and remaining limitations in the [Work Log](../Doc/DOCUMENTATION.md#work-log); use the [Code Audit](../Doc/DOCUMENTATION.md#code-audit) section for repository-wide or focused code-review findings.
3. If implementation work reveals missing or changed scope, update this master plan and its Change Log before treating that scope as approved. Keep current requirements here; preserve dated history as history.
4. This is the single source of truth for plans, product direction, detailed editor requirements, the legacy architecture snapshot, and the migrated task register. Do not recreate separate planning files.
5. **Push repository work directly to GitHub.** After writing and basic validation of requested repository changes, commit and push them directly to the repository default branch (`main`) immediately, without asking the owner again. Do not create a compare/pull-request workflow unless the owner explicitly requests one. A GitHub push is not a production deployment; deployments and production data changes remain separate actions.

## Source-of-truth precedence

- The current project overview, decisions, and build/deployment status are maintained in the **Project Plan** section below; reconcile stale dated statements against its latest status and the live repository.
- The **editor plan** (`Plan/EDITOR_PLAN.md`) is the detailed contract for editor behavior, implementation, and acceptance tests; `Doc/EDITOR.md` documents the behaviour as built. This file does not carry editor detail.
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
- Supabase: the AI assistant writes SQL migrations (`supabase/migrations/`); the
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

**Status: final as built (owner decision, 2026-11-21).** The editor is built as the owner asked, and its
behaviour does not change on its own: the remaining-work register (section 16) contains no editor items,
and no other section of this plan may assign editor work.

**The editor plan and the editor documentation are separate files (owner instruction, 2026-11-21).**

| File | Contents |
|---|---|
| [`Plan/EDITOR_PLAN.md`](EDITOR_PLAN.md) | the editor plan: what the code does today, the contracts that must not drift, the verified gaps, the next steps with acceptance, and the owner's decisions |
| [`Doc/EDITOR.md`](Doc/EDITOR.md) | how the editor behaves today, written from the source |

Do not add editor detail to this file: it links to the editor plan instead. An item from that plan ships
only when the owner approves that item.

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

**Built modules (2026-11-21).** `/admin` is no longer a dashboard preview: every module in the left
navigation is a real page — `/admin` (dashboard), `orders`, `products`, `inventory`, `customers`,
`designs`, `promotions`, `posts`, `reports`, `settings`. They share one typed browser-local store
(`lib/admin-demo-data.ts` over `useSyncExternalStore`, persisted to `localStorage` under
`mh-fashion-admin-demo-data-v1`). Orders have stage chips, search, a Today card, date presets, a
From/To range, a sort select, an Orders-by-day strip and a detail drawer with items, timeline,
print-desk note, cancel/refund, production CSV, the A4 print sheet, the A5 receipt, the print
bundle ZIP and the MH Delivery quote JSON. Products have a validated create/edit drawer, archive and
two-step delete; Inventory has per-size stock with low/out filters; Customers are grouped from the
orders by email with VIP/repeat/new segments; Designs can be published, hidden or deleted;
Promotions validate codes, value, minimum spend, limits and window; Reports show revenue buckets,
top products, payment mix, pipeline and low-stock; Settings hold the store profile, the team with
per-module permissions, and a demo-data reset. Posts live at `/admin/posts` with Guide, T-shirt and
Nyein tabs; a T-shirt post carries a title, description, one attached SVG and one hand-typed price
per full attribute combination (no base price, no derived delta, unlisted combinations not sold).
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

```
mockups/product/<product-slug>/<look>.<webp|png|jpg>    catalogue photos, 4:5
mockups/editor/<garment-slug>/<look>.<webp|png|jpg>     editor panel photos, 1:1
mockups/3d/<product-slug>/<look>.<webp|png|jpg>         3D renders (reserved)
models/<product-slug>.glb                               3D garment models (reserved)
designs/<design-slug>.svg                               design library artwork
posts/<post-slug>.svg                                   T-shirt post artwork
orders/<order-id>/...                                   copy of the print bundle
jersey-mockups/{jersey_style_id}/worn_photo.png + mapping_zones.json
brushes/{brush_id}/texture.png
elements/v1/manifest.json, elements/v1/{slug}.svg (planned, R2 not connected)
fonts/v1/manifest.json, fonts/v1/{font_id}.woff2 (planned; license-cleared files only)
text-styles/v1/manifest.json, text-styles/v1/previews/{slug}.webp (planned)
products/categories/{slug}.png, products/banners/{id}.png
uploads/{user_id}/{upload_id}/original.jpg, upscaled.jpg
```

`<look>` is the attribute combination that actually changes the picture: for the catalogue
`colour[-fit][-sleeve]`, for the editor `colour[-gsm]`. **Size is never part of a look** — the same
photo serves M and XL. The lookup walks from the most specific key down to `default`, trying
`webp`, `png` then `jpg`; a look with no file falls back to `default` and then to the catalog image.
The two sets are separate on purpose: a 4:5 catalogue photo does not fit the square editor panel.

### 12.1 R2 asset service — a Worker reads R2 and returns JSON  *(owner decision, 2026-11-22; not built)*

**Rule.** The browser never lists, parses or hunts for files in R2 by itself. The site's own Worker reads the
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
1. **Binding.** Add `r2_buckets: [{ binding: "MH_FASHION_ASSETS", bucket_name: "mh-fashion-assets" }]` to
   `wrangler.jsonc`; route handlers reach it through the Cloudflare context; local development uses the local R2
   simulation with a small fixture bucket.
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
   accepts, so the editor changes only the address it reads from.
7. **File serving** (decision R2-1): public, non-sensitive files (fonts, mockups, designs, elements, brushes)
   keep being served from the bucket's public address (`NEXT_PUBLIC_R2_PUBLIC_URL`), cached by the CDN, and the
   bucket carries a CORS rule for the site because fonts are used across addresses. Private files (saved designs,
   customer uploads, press bundles, licence documents) are never public: they are read only through the Worker,
   which checks who is asking.
8. **Admin writes** (after Supabase Auth, P0): `PUT /api/admin/assets` takes the file and its fields, checks the
   type and size for its kind, generates the key (a key is never typed), writes the file and its `meta.json`
   through the binding, and rebuilds the snapshot. SVG is cleaned first (scripts, event attributes and external
   references removed). Until Auth exists these routes are not enabled; the shop uploads by hand and the
   scheduled trigger picks the files up. The browser needs no R2 keys and no upload CORS rule.
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
**Still to build:** the R2 binding in `wrangler.jsonc` (needs the bucket name), the scheduled trigger that
calls `rebuildAssetCatalogues` (the Worker entry needs a `scheduled` export first), the editor reading
`/api/assets/fonts` instead of the public manifest URL (only once the binding exists, or production would
lose the fonts it loads today), and the admin writes (after Supabase Auth).

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
| R2-1 | Are public files served by the bucket's own address or through the Worker? | Public files from the bucket address with a CORS rule for the site; the Worker for the JSON and for every private file |
| R2-2 | How often does the scheduled rebuild run? | Every five minutes, plus the admin "Rescan" button for an immediate refresh |
| R2-3 | Where does an asset's description (`meta.json`) live? | Beside the asset in R2 for now; it moves into the database with the rest of the admin data |

**Depends on:** the R2 binding in `wrangler.jsonc`, a scheduled-trigger entry, and Supabase Auth with a server-side
admin check for the write and issues routes.

Naming: lowercase, hyphens; UUIDs for system-generated assets, slugs for
catalog-facing items.

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

**Repository-source audit (2026-11-13, commit `90dc398`; production was not re-probed in this audit):** `/create` is currently only the EditorCanvas shell described in §6. The older detailed editor feature descriptions in this section are historical and do not match the audited code.

**Live in production** (status last externally probed on 2026-11-12; not re-probed during this code audit; mhfashion.mhfashionmm.workers.dev was then serving the pre-upgrade build described below): scaffold and Cloudflare deploy, the Supabase
schema migrations `0001`–`0007` (Guide content and Super Admin roles included;
whether each migration is applied is owner-managed), homepage with live product
data, sticky header, mobile drawer, footer, dark/light and Ks/$ toggles,
notification dropdown, category marquee, Guide listing and article pages, product
detail, and the cart page. Probed on 2026-11-12: `/`, `/new`, `/popular`,
`/collections`, `/mh-fashion`, `/nyein`, `/guide`, `/guide/how-apparel-options-narrow-down`,
`/products/butterfly-effect`, `/cart`, `/account`, `/create` and `/admin/login` return 200;
`/admin/register` returns 404.

**Recorded deployment status (2026-11-12; not re-probed during this code audit):** the plan reported the Next.js 16.4.6 / React 19.3.1 / Fabric.js
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

**Status snapshot 2026-11-21 (re-checked, replaces the 2026-11-12 line):** `main` is at `ca454da`
and the repository test suite passes 220/220 (`node --test tests/*.test.cjs`), TypeScript is clean
and the Next.js production build passes. The production Worker was re-probed on 2026-11-21:
`/`, `/nyein`, `/admin/login` and `/products/butterfly-effect` all return 200, the removed
delivery/support promises are absent from the product page, and `/nyein` serves the new brand
collection page — so the deploy pipeline has run at least through `501e16b`. That contradicts the
earlier "no Actions secrets configured" note in `AGENTS.md`; treat the secret state as
**unconfirmed** and verify in GitHub → Settings → Secrets before relying on either statement.
Supabase migrations `0001`–`0007` remain owner-managed, and the admin workspace is still
browser-local demo data (section 16 P0).

## Change Log

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
- Fabric implementation appendix added (2026-11-12): `EDITOR_PLAN.md` now
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



## Production publishing status snapshot (2026-11-10; superseded by the current follow-up below)

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
- `/nyein` — separate Nyein destination placeholder awaiting its final content/layout direction.
- `/guide` and `/guide/[slug]` — server-rendered categorized Guide/blog listing and detail pages with Supabase/starter-data fallback, cover images, metadata and readable article layouts.
- `/products/[slug]` — compact marketplace-style product detail with gallery, actual catalog details table, options, reviews, related products and Buy Now/Add to Cart/Edit Design actions.
- `/create` — browser-local Fabric.js editor prototype with responsive desktop/phone workspace, tools, layers, text/elements, Product and separate Mockup controls. No site copyright strip or Footer is shown in this editor workspace.
- `/cart` — client-side cart page with persistent localStorage items, quantity controls, item removal, clear cart, subtotal/total and empty state.
- `/account` — responsive account prototype with profile, order/design/wishlist/points/settings presentation using placeholder/local state where backend data is not yet connected.

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
- **The Editor Guide sits in the guide menu box (2026-11-21).** `app/guide/page.tsx` links
  `/guide/editor-guide` from the desktop menu box (a row after the categories, marked `data-guide-editor`)
  and from the phone shortcut row (second chip, so it is visible without scrolling). The HTTP test counts
  only the article grid (`data-guide-editor` anchors are stripped) so the menu link cannot break the
  category-filter assertions.
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
- Replace placeholder Nyein content and account data with finalized requirements.
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

### P0 — foundation

1. **Real backend for admin data.** Orders, products, per-size stock, posts, promotions, designs and
   settings live in browser `localStorage` (`mh-fashion-admin-demo-data-v1`). Define Supabase
   tables and a one-time migration for `orders`, `order_items` (spec snapshot, design layout, print
   position), `tshirt_posts`, `price_combinations`, `price_history`, `designs`, `promotions`,
   `stock` and `settings`.
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

5. **Delivery fee.** The MH Delivery API contract, behaviour when the API is down, per-product
   weight and package size, the Myanmar region/township address structure, and the DHL placeholder.
   The payload already exists (`Doc/MH-DELIVERY.md`); nothing is sent yet.
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
   tolerances; a thin-line rule waits for the layer model to carry a stroke width.
   **Still open:** a low-resolution photo warning
   (the order layer model stores no pixel size, so the editor's save path must carry it — owner
   approval), and ~~opening the print-size export on a phone~~ —
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
   `simulate`, `webhook`). It bounds one isolate per client, not a site-wide quota: a durable counter
   (KV or Durable Objects) is still needed for that, and the upload/AI/contact paths are not public yet.
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

### P2 — later

11. **Posts ↔ Product relationship** as a data model (how a T-shirt post relates to
    Product → Style → Color and to fixed-design products). The Nyein brief is still pending.
12. ~~**Admin modules not yet built:** Brush Management only.~~ **Brush Management shipped 2026-11-22:**
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
13. **Order operations:** **order QR shipped** — `lib/order-qr.ts` prints a vector QR of the order link
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
    order and the read repair. Still open: any barcode a specific scanner needs.
14. **Operations:** error monitoring, Supabase backups. **Timestamps are done:** everything is stored
    as UTC ISO strings and every admin screen and printable document shows them in `Asia/Yangon`
    (`YANGON_TIME_ZONE`), so the device clock cannot change an hour or move an order to another day.
15. **Mobile app decision:** PWA first vs React Native. The editor cannot be ported to React
    Native directly.
16. **Customer notification channel** (13, owner decision 5).

**Assumption — Inventory:** the Inventory module (stock per product × size) means **blank garment
stock**. *Owner to confirm; if it means a sellable-quantity cap instead, the stock-decrement rules
change.*

## Security upgrade technical record (pre-push snapshot, 2026-11-11; current deployment status follows)

The web stack is upgraded on this work branch from Next.js 15/Fabric.js 6 to Next.js 16.4.6, React/React DOM 19.3.1, and Fabric.js 7.4.0, while retaining OpenNext Cloudflare 1.20.16 and Wrangler 4.158.0. The Next.js 16 TypeScript setup and ESLint CLI/flat configuration were updated. Fabric pointer reads now use `getScenePoint`; temporary selection overlays preserve their intended `left`/`top` coordinates, and middle-click canvas gestures are explicitly disabled.

Validation passed: Next.js production build and standalone TypeScript check; `npm run test:guide` (9 tests); `npm run test:guide:http` against the production server (5 tests); `npm run cf:build --workspace=apps/web`; and `npx wrangler deploy --dry-run` (about 1.21 MiB gzip). Browser regression added a Starburst and a rectangle through the Shape tool, confirmed object counts 1 → 2, Undo 2 → 1, Redo 1 → 2, verified Save, then cleared the disposable canvas. No Fabric runtime errors were reported. The final route manifest includes `/cart` and excludes the closed `/admin/register` route. Lint exits successfully with compatibility warnings.

The production-only audit is clear: `npm audit --workspace=apps/web --omit=dev --audit-level=moderate` reports zero vulnerabilities. The full tree still reports 4 high and 10 moderate findings in build/lint tooling, including OpenNext's transitive minifier/glob chain and ESLint/TypeScript-ESLint dependencies. No forced audit fix was applied because npm proposes incompatible major downgrades (OpenNext Cloudflare 0.3.0, `eslint-config-next` 15.5.29, or ESLint 9.39.5); full build-toolchain remediation remains open.

The current project plan records production at `https://mhfashion.mhfashionmm.workers.dev`; an unauthenticated `curl` request from the sandbox returned HTTP 200. The upgraded code has not yet been deployed. The latest remote `main` has no deploy workflow, so `.github/workflows/deploy-cloudflare.yml` was restored on `chore/secure-fabric7-next16`. It triggers on app/lockfile changes to `main` or manual dispatch, uses Node 22, and runs production audit, guide unit/HTTP tests, typecheck, Next/OpenNext builds, Wrangler dry-run, then deploys. Secret presence is checked without printing values; the actual Cloudflare token/account ID are scoped only to the main-branch deploy step. The owner reports adding both secrets, but `gh secret list` returns HTTP 403 in this environment; the workflow must confirm access after push.

Latest `main` also closes public `/admin/register` and adds migration `0007_create_super_admin_roles.sql`. This task preserves those changes and does not reopen registration or apply the migration. The admin UI still uses a browser-local demo session, not Supabase Auth/server-side authorization; the real product catalog also remains dependent on Supabase configuration and applied migrations/seeds.



## Cloudflare deployment follow-up (2026-11-12)

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

Work history: the first attempt (`54ee3ed`) incorrectly moved the entire Footer to every route. That was reverted (`0cdcf92`) to honor the Home-only full-Footer rule. The final implementation separates the copyright into `CopyrightBar` (`24cb280`); the latest user clarification excludes the `/create` editor from this otherwise global strip. The editor-exclusion correction passed `npm run build` on Next.js 16.4.6 and `git diff --check`, and was pushed as `6de8616`. Actions run [#43087062859](https://github.com/mhfashion/mhfashion/actions/runs/43087062859) stopped at `Check required Cloudflare secrets` before deployment; no secret values were inspected or handled.


## Plan accuracy sync (2026-11-12)

This pass did not change scope or decisions. It corrected places where the plan
described an older state than the repository and the deployed site.

**Sources checked:** `apps/web/package.json` and `package-lock.json` for installed
versions; `apps/web/src/app/**/page.tsx` and `apps/web/public/manus-routes.json`
for the route set; `supabase/migrations/` for the migration range;
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
## Editor plan and specification (moved to `Plan/EDITOR_PLAN.md`)

The editor plan now lives in [`Plan/EDITOR_PLAN.md`](EDITOR_PLAN.md) and the editor behaviour in
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

Latest `main` closes public `/admin/register` and includes `supabase/migrations/0007_create_super_admin_roles.sql`. The upgrade preserves that change and does not apply the migration. The admin dashboard still uses its browser-local demo session, not Supabase Auth or server-side authorization. Supabase catalog credentials and migrations/seeds remain unverified, so real product listings are not guaranteed by this upgrade.


---

<a id="historical-todo"></a>
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

- `Plan/EDITOR_PLAN.md` is the editor plan, written from the source: where the editor lives (file by
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
