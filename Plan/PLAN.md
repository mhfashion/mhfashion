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
- The **Editor Implementation Plan** is the detailed contract for editor behavior, implementation, and acceptance tests.
- The **Unified Editor Vision** defines product-level editor direction.
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
- Language: UI copy in English; Burmese support to be decided later.

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

Price depends on the full attribute combination (not flat). Admin sets prices
in a Pricing Management module. Product cards show a range (lowest–highest);
once a full combination is chosen on the detail page, show the exact price.
Other product types get their own attribute sets and pricing formulas.

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

### 4.6 Product detail presentation

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

**Detailed editor implementation plan:** [editor implementation plan](#editor-implementation-plan). This section is the canonical location for the editor specification, milestones, and acceptance criteria; this project section records only the verified current state and short roadmap.

**Owner direction (2026-11-14):** For Editor changes, follow the owner's direct instructions as the implementation scope; do not infer additional Editor work from this Plan. Update this Plan and the work log after the requested implementation so they record the owner-approved behavior.

**Current implementation state (2026-11-14):** `/create` mounts a shell with a blank fixed print canvas, optional grid, draggable canvas and temporary Front/Back Mockup boxes, connector wires, and transient freehand strokes mirrored to each mockup. Each mockup artwork overlay can be moved/resized independently. The provisional 3500 px large artwork tier is transferable: either side may claim it by growing beyond 1500 px, while the other side is limited to 1500 px. If both sides are at or below 1500 px, either may claim the large tier; it is never permanently assigned to Front or Back. These numeric caps are provisional, not final print specifications. Strokes and transforms remain in page memory. This route does not instantiate Fabric.js as an object-level editor and has no Layers/Properties panel, undo/redo, serialization, browser/account draft persistence, production export, or R2 assets. Older audits below describe their dated baselines, not the current source.

**Owner-specified blank print canvas (2026-11-13):** keep the current shell and set the native blank canvas to a fixed **4500 × 5400 px** with a **300-DPI PNG target** and transparent pixel buffer. Do not preload or draw any copy, including “T-Shirt.” The checkerboard and size/spec label are presentation-only UI outside the artwork; no resize control is provided. This is a canvas-spec update only and does not restore the reverted editor tools, document/history model, or persistence. PNG download and embedding 300-DPI metadata remain unsupported by the shell.

**Phone/Web limitations:** the canvas has mouse/keyboard pan gestures but no touch pan path, and the stacked phone layout can clip on short viewports because the workspace is hidden-overflow. All future editor UI/UX work must specify and validate Web/Desktop and Phone/Mobile together, including touch/keyboard operation and short viewport behavior.

The detailed editor feature list below is a **forward plan**, not a claim that those capabilities exist. Use the Editor Implementation Plan section later in this file for the full target design and acceptance contract.

**Owner request — make the editor usable on Phone like Web (2026-11-13):** the current Web route is also only a shell, so the first delivery must make the same core editor work on Web/Desktop and Phone/Mobile, rather than creating a phone-only mockup. Use one shared Fabric document state per garment side. The first usable slice includes adding and editing text, basic shapes, and uploaded images; selecting, moving, resizing, rotating, recoloring, and deleting objects; front/back documents; a layer list; undo/redo; and browser-local save/restore. On Phone, keep the canvas reachable in a single-column layout, hide the global mobile navigation and its reserved page padding on `/create`, provide 44px-or-larger controls and a compact bottom dock/sheet, support object editing by touch, provide an explicit Pan mode and visible zoom controls, and keep the same document, selection, and history state as Web/Desktop. Advanced Photoshop-style tools, production export, R2, and account-backed storage remain outside this first slice.

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
  shipping & returns, reviews, related products.
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
- Production export per order: Product, Fabric Type, Knit Structure, GSM,
  Print Method, Cutting, Color, Size, clean SVG and placement coordinates per
  print location.

## 9. Promotions, Loyalty & AI Points

- Discount codes: admin-created with type, value, limits, validity, scope.
- Milestone rewards: admin sets threshold and trigger type per rule (quantity,
  orders, or spend).
- AI points: 300 granted daily (unused ones expire), 100 per generated image,
  +50 per purchased product (never expire). Daily points are spent first.

## 10. Admin System

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
  file, provider chosen later.
- Analytics/tracking integrations are built in but optional.

## 12. Cloudflare R2 Layout

```
designs/{design_id}/original.svg
designs/{design_id}/layers/{layer_id}.svg
designs/{design_id}/thumbnails/{layer_id}.webp
mockups/{product_id}/{style_id}/{color_id}_front.png (and _back, detail_n)
jersey-mockups/{jersey_style_id}/worn_photo.png + mapping_zones.json
brushes/{brush_id}/texture.png
elements/v1/manifest.json, elements/v1/{slug}.svg (planned, R2 not connected)
fonts/v1/manifest.json, fonts/v1/{font_id}.woff2 (planned; license-cleared files only)
text-styles/v1/manifest.json, text-styles/v1/previews/{slug}.webp (planned)
products/categories/{slug}.png, products/banners/{id}.png
uploads/{user_id}/{upload_id}/original.jpg, upscaled.jpg
```

Future private serving contract (not implemented): `GET /api/editor/fonts`,
`GET /api/editor/text-styles`, and allow-listed `GET /api/editor/assets/[...assetKey]`
to read licensed font, text-style preview, and mockup objects through an R2
binding. No editor product-catalog API is defined.

Naming: lowercase, hyphens; UUIDs for system-generated assets, slugs for
catalog-facing items.

## 13. Open / Deferred

- MH Sport template organization (provisional: "Template Category" tags).
- Exact print-area canvas sizes (T-shirt ≈ 30×40 cm placeholder; Cup, Bag,
  Pillow, Phone Cover are rough placeholders).
- Pillow and Sling Bag attributes and mockups.
- Payment gateway API details; DHL integration (waiting on DHL).
- Legal page content (Myanmar-specific clauses).
- Private R2 connection and uploads for Elements, licensed fonts, text-style
  previews, and mockup assets remain deferred. The editor uses its local
  Elements catalog and browser/system font fallbacks; the storefront continues
  to use its existing Supabase product data. No bucket, binding, or R2 upload is
  part of this stage.
- Further editor tools and layer-panel features; further admin permissions.
- Refund request flow; mobile app scope; email provider.

## 14. Build Status

**Repository-source audit (2026-11-13, commit `90dc398`; production was not re-probed in this audit):** `/create` is currently only the KittlCanvas shell described in §6. The older detailed editor feature descriptions in this section are historical and do not match the audited code.

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
hidden on `/create`; the `KittlCanvas` workspace remains. Ctrl/Command+wheel is
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
  thumbnails, a Photoshop-inspired compact selected-layer control strip with the
  blend/Opacity and Lock/Fill row arrangement, blend
  modes, opacity, per-layer Fill, Pass Through and isolated group compositing,
  flow under layer properties, effect toggles, alpha clipping masks, embedded
  raster Smart Object controls, and uniform mask strength. This is not a
  Photoshop-equivalent panel or renderer. Designs remain browser-local and are
  not yet backed by Supabase or R2.
  The Elements flyout now includes category browsing, name/tag search, color
  choices, original SVG previews, click-to-add, and drag-to-canvas placement.
  Catalog data/assets are in `public/elements/v1` with future R2 object keys;
  R2 itself remains disconnected by request. The Text flyout now follows Canva's
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
- Upgraded the Layers box toward Photoshop-style behavior: type-aware thumbnails,
  double-click inline rename, collapsible folder groups, drag reorder, and
  drag-into-group nesting. These actions update the Fabric layer stack and enter
  Undo/Redo. True Photoshop masks, clipping, raster merge, and group transforms
  remain unimplemented.
- Expanded layer blending to standard Canvas modes including Color Dodge/Burn,
  Hard/Soft Light, Difference/Exclusion, Hue/Saturation/Color/Luminosity, and
  Linear Dodge (Add). Layer opacity now has both a live 0–100% slider and a
  numeric percentage field; nested group opacity cascades to child objects.
  Photoshop's isolated group compositing and layer Fill remain future work.
- Added a separate 0–100% Layer Fill slider/number field and isolated folder
  compositing: group children render together to an offscreen surface, then the
  group's blend mode and Opacity apply to the combined result. This first version
  did not yet implement Photoshop Pass Through or proper Fill-vs-effects alpha;
  those gaps were corrected in the subsequent Layers panel fidelity update.
- Reworked the Layers panel toward Photoshop's actual panel structure: selected
  blend/Opacity controls above a larger layer stack, Fill directly below Opacity
  for individual layers only, compact rows with visibility/lock/thumb indicators,
  and layer-specific text/flow/effect settings tucked under selected properties.
  Groups now default to Pass Through and child blend modes remain individually
  active in that mode; choosing another group mode isolates/composites children
  as one image. Fill scales content alpha separately from overall object opacity.
  Advanced Blend If/channel options and exact effect-aware Photoshop rendering
  remain unimplemented; this is Photoshop-inspired, not Photoshop-equivalent.
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
- Replaced the four-shape Elements starter with a Canva-inspired, searchable SVG
  library: category tabs, keyword/tag matching, recent-use shortcuts, color
  selection, click-to-add and direct drag-and-drop placement. Added a versioned
  local asset manifest and original monochrome SVG collection. Prepared the
  future R2 key/route contract (`elements/v1/...`, `/api/editor/elements`) but,
  as requested, did not authenticate, create a bucket, add a Worker binding,
  enable public access, or upload objects. Canva's documented Elements flow uses
  search/category browsing and selection followed by reposition/resize; this
  prototype follows that flow without copying Canva assets. [Canva: Add elements](https://www.canva.com/help/add-elements/)
  [Cloudflare: Upload objects](https://developers.cloudflare.com/r2/objects/upload-objects/)
  [Cloudflare: Public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- Researched Adobe's current Layers panel guidance and refined the selected-layer
  controls to match its layout: blend mode and Opacity on the first line, Lock
  and Fill on the second, on-demand slider popovers, and visibility controls in
  the leading layer-row column before thumbnails. This is a closer layout match,
  not a claim of pixel-for-pixel Photoshop equivalence.
- Expanded the Text flyout after researching Canva's official Text tab and Font
  Library: heading/subheading/body insertion, font/category search, text styling,
  and ready-made font combinations are now the implementation model. Added live
  storefront product browsing to `/create` using the same public product and price
  data functions as the store, with a future private-R2 asset contract for licensed
  fonts, text-style previews, and product cards. No custom font files, R2
  credentials, bucket, binding, public access, or upload are included. This
  reproduces useful interaction patterns, not Canva assets or a pixel-identical
  editor. [Canva: Add and edit text](https://www.canva.com/help/add-and-edit-text/)
  [Canva: Format text](https://www.canva.com/help/format-text/)
  [Canva Design School: Text and the Font Library](https://www.canva.com/design-school/resources/finding-fonts-and-using-text/)
- Activated all 14 non-Move canvas tools with tool-specific pointer behavior,
  color/width/tolerance settings, status feedback, and history-backed artwork edits.
  Ruler overlays are excluded from saved marks; Rotate View/Hand/Zoom operate only
  on the viewport. Path Select, Magic Wand, Clone Stamp, and Eraser explicitly
  remain object-level rather than pixel/anchor editing. The Next.js production
  build passed; a read-only review found no P0/P1 issues and its lock/raster-status
  findings were corrected before delivery.
- Stabilized the Photoshop-style Layers Box after user feedback: the right dock
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
- Replaced the dark Photoshop-like drawing surround with a theme-independent
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
  and acceptance criteria. It uses official Kittl, Photoshop, and Illustrator
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
- Object-level editor tools are implemented, but this is not a Photoshop-equivalent pixel editor. Pixel-level raster masks/merge/eraser, node-level path editing, complete production mockup rendering, account-backed drafts and R2 asset uploads remain deferred.
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
## Unified Editor Vision (consolidated from `docs/UNIFIED_EDITOR_VISION.md`)

**Status:** Canonical product direction for the next editor milestones
**Scope:** Kittl-inspired design workflow + Photoshop-inspired professional control + Canva-inspired template and brand workflow, adapted for apparel production.

## 1. What we are building

MH Fashion should not become three separate editors hidden behind three different interfaces. It should be one editor with three complementary modes of work:

1. **Create mode — Kittl + Canva strengths.** A fast, visual starting point with templates, ready-made text layouts, searchable assets, brand colors, font pairings, mockups, and one-click composition. Kittl's official editor documentation describes templates, asset search, text layouts, text transformations, effects, artboards, mockups, and a Layers panel as connected parts of the same workflow. [1]
2. **Pro mode — Photoshop strengths.** Precise object and pixel workflows with a Move tool, selection tools, vector paths, masks, groups, Smart Objects, Blend Modes, Opacity, Fill, History, keyboard shortcuts, and non-destructive editing. Photoshop's documented model keeps layer order, Move-tool selection, groups, masks, Smart Objects, and history as explicit controls rather than flattening them into a template operation. [2] [3]
3. **Production mode — MH Fashion's differentiator.** Apparel sides, garment mockups, print-safe areas, fabric and GSM attributes, color and cutting options, DPI/export validation, and a clean production package. Production mode must protect template and print constraints while still allowing approved design edits.

The result should feel approachable when a user starts from a template, powerful when a designer opens the Layers and History docks, and safe when the design is sent to apparel production.

The supplied Kittl project link was not publicly inspectable in this session because it opened an account/authentication screen. This plan therefore uses Kittl's public documentation for behavior, not an unsupported claim about the private project artwork.

## 2. Shared workspace shell

The global site Header and the existing editor command bar remain unchanged. Below them, every mode uses the same workspace shell:

- **Left rail:** Create panels and professional tools. The top group contains Templates, Uploads, Elements, Text, Brand, Mockups, and AI. A divider separates these from Move, Select, Pen, Shape, Eraser, Clone, Gradient, Measure, Hand, and Zoom.
- **Center stage:** the active artboard or apparel side, with zoom, pan, rulers, guides, print-safe overlays, and mockup preview. The stage never owns document truth; it renders the scene graph and dispatches typed commands.
- **Context bar:** selection-aware controls for typography, color, alignment, dimensions, transform, and quick effects. It changes with the selected object but does not hide core layer controls.
- **Right dock:** tabs for Layers, History, Design, and Production. Layers and History are always available. Design exposes the selected object's detailed properties. Production exposes mockup, print area, and export validation.
- **Bottom attributes strip:** product, print method, fabric, knit, GSM, color, cutting, and size. It remains separate from creative editing because changing a garment attribute can change print constraints.

The shell is canvas-first on phone. Left tools become an icon rail, Create assets open in bottom sheets, and Layers/History open as sheets or an overlay. The same scene graph and commands are used on desktop and phone; only panel placement changes.

## 3. Mode behavior

### 3.1 Create mode

Create mode is the fastest path from an empty design to a usable garment composition. It opens with template and asset discovery, not a blank technical panel. Users can search a catalog, filter by category, preview a template, apply it to the active side, and replace editable content without breaking the garment document.

A template is not a flattened image. It is a versioned package containing editable nodes, groups, font references, brand-token slots, print-area intent, and optional mockup placement. A user can enter Pro mode at any time and inspect the same nodes in Layers.

Create mode includes:

- template search by product, style, occasion, and print method;
- recent, liked, and organization-approved templates;
- asset library with upload, element, photo, graphic, and texture categories;
- predefined text combinations that remain separate editable text layers;
- one-click color theme and font pairing application;
- quick mockup preview;
- safe reset that returns to the template version without deleting the source project.

### 3.2 Pro mode

Pro mode exposes the professional tool and layer model without forcing every beginner to see it first. The Move tool supports Auto-select Off, Layer, and Group. Shift-click supports additive selection. Arrow keys nudge selected content, and locked ancestors reject edits with an explanation.

Pro mode keeps editing non-destructive whenever the source type supports it:

- text remains editable until explicit outline/rasterize conversion;
- SVG and vector paths remain editable nodes;
- images retain source metadata and placement transforms;
- Smart Objects preserve source content while allowing replacement;
- masks hide/reveal without deleting source pixels;
- effects are ordered appearance nodes;
- blend mode, opacity, fill, and flow have distinct meanings;
- History stores named document commands and supports undo/redo branches and snapshots.

Photoshop's official guidance describes combining Smart Objects, Smart Filters, adjustment layers, and masks to preserve editability. MH Fashion should adopt that principle while keeping the implementation compatible with the browser scene graph. [2]

### 3.3 Production mode

Production mode makes the document ready for apparel, not merely visually attractive. It displays Front, Back, and any supported garment panels as artboards with garment-specific print-safe geometry. It shows warnings when content is outside the print area, uses an unsupported font, has insufficient raster resolution, or depends on an unavailable source asset.

A production lock can protect mockup geometry, side coordinates, template branding, or approved text. Creative edits remain possible inside the allowed region. The export command produces clean artwork, preview, coordinates, source/version metadata, and warnings instead of a screenshot-only output.

## 4. Unified document model

The editor should evolve from parallel `CanvasMark[]` and `EditorLayer[]` arrays into a typed scene graph while preserving backward compatibility during migration:

```ts
type DesignDocument = {
  version: number;
  activeArtboardId: string;
  artboards: Artboard[];
  nodes: DesignNode[];
  brandTokens: BrandTokenSet[];
  templateSource?: TemplateSource;
  production: ProductionDocument;
  history: HistoryMetadata;
};

type DesignNode = {
  id: string;
  kind: "group" | "text" | "path" | "shape" | "image" | "smart-object" | "mask" | "effect" | "adjustment" | "mockup";
  parentId?: string;
  children?: string[];
  visible: boolean;
  locked: boolean;
  selectable: boolean;
  transform: TransformState;
  appearance: AppearanceState;
  source?: SourceReference;
  constraints?: ProductionConstraint[];
};
```

The important design rule is that a template, an imported image, a text preset, and a hand-drawn path all become nodes in the same document. Their editing affordances differ by `kind`, but selection, grouping, ordering, visibility, locking, history, and export use the same command system.

Commands should be typed and history-backed:

```ts
type EditorCommand =
  | { type: "insert-template"; templateId: string }
  | { type: "insert-node"; node: DesignNode }
  | { type: "update-node"; id: string; patch: Partial<DesignNode> }
  | { type: "move-nodes"; ids: string[]; delta: { x: number; y: number } }
  | { type: "reorder-nodes"; ids: string[]; targetId: string; position: "before" | "inside" | "after" }
  | { type: "apply-effect"; id: string; effect: EffectState }
  | { type: "set-brand-token"; tokenId: string; value: string }
  | { type: "validate-production" };
```

This command boundary is what lets a Kittl-like quick action and a Photoshop-like precise property edit produce the same reliable undo, autosave, collaboration, and export behavior.

## 5. Kittl, Photoshop, and Canva strengths to combine

### Kittl contribution

Use Kittl's design-first behavior for templates, artboards, assets, text layouts, vector creation, text transformations, effects, clipping masks, mockups, and approachable right-panel controls. Kittl documents layers with reorder, hide, lock, and grouped-object expansion, and documents editable text effects and mockup workflows. [1]

### Photoshop contribution

Use Photoshop's professional behavior for document truth: explicit layers/groups, Move Auto-select modes, drag reorder insertion lines, multi-layer movement, masks, Smart Objects, blend modes, non-destructive effects, and named history states. Photoshop documents that Shift-click can add layers to a selection and that selected content can move together. [3]

### Canva contribution

Use Canva's low-friction discovery and team workflow for templates, Brand Kits, and mobile-friendly layer access. Canva documents opening Layers from Position, selecting layers from the panel, drag-reordering with an insertion line, rearranging multiple layers, and Shift-selecting multiple layers. [4] Canva Brand Kits organize official logos, colors, fonts, and assets for use inside the editor, with Brand Templates and brand controls supporting consistency. [5]

### MH Fashion contribution

Add product-aware constraints that generic design tools do not own: front/back garment sides, print method, fabric and GSM, cuttings, mockup placement, print-safe boundaries, export validation, and production handoff. These rules are first-class constraints, not an afterthought added during checkout.

## 6. Panel information architecture

The right dock should use four tabs:

- **Layers:** scene tree, search/filter, multi-select, visibility, lock, groups, reorder, masks, clipping, Smart Object badges, Blend Mode, Opacity, Fill, and effects.
- **History:** named commands, Undo/Redo, snapshots, draft restore, and branch-clearing behavior after a new edit.
- **Design:** context properties for text, vectors, images, effects, transforms, alignment, and color.
- **Production:** active garment side, mockup, print area, DPI, warnings, and export package.

The left Create rail should use five user-facing sections: Templates, Assets, Text, Brand, and AI. Professional tools remain below a divider. This keeps Canva/Kittl discovery separate from Photoshop precision without building three competing sidebars.

## 7. Brand and template system

Brand assets need a reusable token layer rather than copied colors. A Brand Kit stores logos, color palettes, font families, graphics, usage guidelines, and approved templates. Applying a brand theme updates linked nodes only; a user can detach a node to preserve a deliberate exception.

Template slots should support locked, replaceable, and optional content:

- locked logo or production mark;
- replaceable headline text;
- replaceable image or graphic;
- optional badge/group;
- brand color token;
- garment-side placement constraint.

A template preview must explain what is editable before insertion. If a font or source asset is missing, the editor shows a substitution warning and keeps the node editable rather than silently converting it to a raster image.

## 8. Implementation roadmap

**U1 — Unified shell and mode state.** Add Create/Pro/Production mode state without duplicating the canvas. Add right-dock tabs for Layers, History, Design, and Production. Keep current Header and command bar unchanged.

**U2 — Scene graph adapter.** Introduce a node adapter around current `CanvasMark` and `EditorLayer` data. Serialize stable IDs, parent/child links, appearance, source metadata, and production constraints. Add migration tests for existing local drafts.

**U3 — Create system.** Add template records, searchable template cards, editable slots, recent/liked templates, brand token application, and template-safe reset.

**U4 — Pro system.** Complete multi-layer drag reorder, contiguous range selection, group isolation, keyboard movement, masks, Smart Object source states, appearance effects, and richer History snapshots.

**U5 — Production system.** Add garment-aware artboards, print-safe geometry, DPI/font/source validation, mockup linkage, and reproducible export manifests.

**U6 — Collaboration and AI.** Add comments/presence, permissions, version restore, AI generation as node insertion, and brand-safe AI guardrails. AI suggestions must create editable nodes or clearly labeled raster results; they must not silently replace the source design.

## 9. Non-negotiable product rules

The three inspirations must be combined at the document and command level, not by copying three visual shells. There must be one selection model, one layer tree, one history system, one autosave path, and one export validator.

Fast template actions must always be inspectable in Pro mode. Professional operations must not destroy template semantics without an explicit conversion. Production restrictions must be visible and explainable. Mobile must expose the same capabilities through sheets and compact controls rather than becoming a separate reduced document model.

## References

[1]: https://help.kittl.com/editing-and-design "Kittl Editing and design official documentation"
[2]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html "Adobe Photoshop Non-destructive editing techniques"
[3]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Adobe Photoshop Reorder and move layers"
[4]: https://www.canva.com/help/finding-and-arranging-layers/ "Canva Finding and arranging layers"
[5]: https://www.canva.com/help/brand-kit/ "Canva Set up Brand Kits"


---

<a id="editor-implementation-plan"></a>
## Editor Implementation Plan (consolidated from `docs/EDITOR_PLAN.md`)

**Status:** Detailed, continuously maintained editor plan section for `/create`

**Date:** 2026-11-12

**Parent-plan reference:** [project plan](#project-plan) §6

**Canonical owner:** This section of `Plan/PLAN.md` is the source of truth for editor-specific behavior, implementation logic, milestones, and acceptance criteria. Keep the short summary and link in the project plan section above; do not create a separate editor plan file.

**Implementation boundary:** This document defines the behavior MH Fashion should build. It does not claim that every item below is already implemented.

**Unified product direction:** [unified editor vision](#unified-editor-vision) is the canonical product-level synthesis of Kittl-style creation, Photoshop-style professional control, Canva-style templates/brand workflow, and MH Fashion production constraints. This file remains the detailed implementation contract.

## Editor section maintenance policy

Keep detailed editor work in this section of the single master plan. Add new editor tools, Fabric.js implementation details, interaction rules, data contracts, export behavior, performance constraints, and tests here. When a major editor milestone changes product status, update the short reference in the project plan section above; do not recreate standalone plan documents or duplicate the full editor specification elsewhere.

## 1. Product direction

MH Fashion should combine four useful editor patterns without copying any product's proprietary interface or assets:

- **Kittl-style accessibility:** quick canvas actions, direct manipulation, artboard-first workflows, contextual controls, simple alignment, useful text transformations, mockup attachment, and fast export. Kittl documents selection, move, rotate, scale, zoom, pan, undo/redo, layer management, alignment, text transformations, mockups, and export as connected editor workflows. [1] [2] [3] [4] [5] [6]
- **Photoshop-style non-destructive composition:** a predictable layer stack, groups, visibility, locking, opacity, blend modes, masks, Smart Objects, adjustment/effect ownership, and history-backed changes. Photoshop's documented model combines Smart Objects, Smart Filters, adjustment layers, and masks so edits can remain reversible. [7]
- **Canva-style discovery and brand workflow:** searchable templates, low-friction asset insertion, mobile-friendly Layers access, reusable brand logos/colors/fonts/assets, approved templates, and safe multi-layer rearrangement. Canva documents Layers access from Position, drag insertion lines, multi-layer selection, and Brand Kits for shared brand assets. [21] [22]
- **Illustrator-style vector precision:** object selection versus path selection, editable anchors and handles, Pen/Curvature workflows, Shape Builder operations, artboards, Smart Guides, snapping, measurements, and precise export. Illustrator separates object-level selection from anchor/path editing and exposes guides for alignment, spacing, measurements, and transformations. [8] [9] [10]

The result should feel like **MH Fashion Design Studio**: easy enough for a first-time T-shirt designer, but structurally reliable enough for production artwork and print export.

The three primary experiences must share one document model, one selection system, one Layer tree, one History system, one autosave path, and one production validator. Detailed mode behavior, template/brand tokens, scene-graph migration, and implementation phases are maintained in [unified editor vision](#unified-editor-vision).

## 2. Current implementation baseline

**Verified repository state (2026-11-14):** `/create` has a blank fixed print canvas, optional grid, independently draggable canvas and temporary Front/Back Mockup boxes, connector wires, and transient freehand strokes mirrored to each mockup. Front and Back boxes share responsive square dimensions and the same starting artwork scale. Each mockup's complete artwork overlay can be moved/resized independently. The provisional 3500 px large tier is shared and transferable: either side may claim it by growing beyond 1500 px; while one side owns it, the other is limited to 1500 px. If both are at or below 1500 px, either may claim the large tier. Reducing the owner to 1500 px or below or removing its mockup releases the tier. The numeric caps are provisional, not final print specifications. Strokes and transforms remain in page memory. This route does not instantiate Fabric.js as an object-level editor and has no Layers/Properties panel, undo/redo, serialization, browser/account draft persistence, production export, or R2 assets; `user_designs.canvas_state` is unused.

The implementation target described in this file is forward-looking. The current route must be described as a placeholder workspace, not as an object-level editor or a Photoshop-equivalent pixel editor. The previous notes about tools, Layers, text/Elements insertion, Smart Objects, masks, and local Save/restore are historical snapshots that do not match the audited source at this commit.

**Owner-directed Phone/Mobile parity (2026-11-14):** Desktop တွင် mouse/keyboard pan နှင့် wheel zoom ကို ဆက်ထိန်းထားသည်။ ဖုန်း/coarse-pointer တွင် `Pan view` ကို ဖွင့်ထားလျှင် လက်တစ်ချောင်းဖြင့် View တစ်ခုလုံးကို ရွှေ့နိုင်ပြီး၊ `+`/`−` နှင့် `Reset view` ခလုတ်များက viewport zoom/pan ကိုသာ ပြောင်းသည်။ Artwork နှင့် node အနေအထားများကို မပြောင်းပါ။ Pan mode ပိတ်ထားချိန်တွင် Canvas အတွင်း ဆွဲရေးခြင်း၊ Canvas အနားမှ node ရွှေ့ခြင်း၊ Mockup header မှ outer box ရွှေ့ခြင်း၊ Artwork bounds မှ group ရွှေ့ခြင်းနှင့် corner handle မှ resize ပြုလုပ်ခြင်းတို့ ဆက်လုပ်နိုင်သည်။ Mockup နေရာလွတ်ကို swipe လုပ်လျှင် stacked workspace ကို scroll လုပ်သည်။ ဖုန်း landscape အကျယ်တွင်လည်း touch controls နှင့် stacking မပျောက်ပါ။

ဖုန်း touch controls၊ resize/move hit area များကို 44 CSS px ခန့်ထားပြီး viewport zoom ပြောင်းလည်း လက်နှိပ်ဧရိယာကို ထိန်းထားသည်။ Pixel dimensions ကို ဖုန်းတွင် ဖတ်လို့ရသော badge ဖြင့် ပြသည်။ Primary touch တစ်ခုတည်းက drag ကို ပိုင်ဆိုင်ပြီး ဒုတိယ touch က gesture ကို အစားမထိုးနိုင်ပါ။ Editor အမြင့်တွင် bottom navigation ၏ တကယ့်အမြင့်/safe-area ကို ချန်ထားသည်။ Shared 3500/1500 px artwork tier၊ source strokes နှင့် independent transforms အလုပ်လုပ်ပုံကို မပြောင်းပါ။ Local Chromium touch emulation နှင့် regression tests ဖြင့် စစ်ဆေးထားသော်လည်း physical Android/iPhone စက်ပေါ်တွင် မစမ်းရသေးပါ။

The following broader capabilities remain future work: an editable typed document, object-level artwork operations on the source Canvas, selection/history for document objects, layer/property controls, validated serialization, browser/account persistence, production mockup rendering, AI tools, paintable masks, true pixel merge, and server-side production export.

**Direct owner instruction (2026-11-14):** Artwork mirrored from the Canvas onto each Mockup is manipulated as one whole overlay. Drag within its selection bounds to move it, and use its lower-right handle to resize it. The **provisional 3500 px large tier is shared and transferable**, not tied to Front: either side may claim it by growing beyond **1500 px**; while one side owns it, the other is limited to **1500 px**. If neither side exceeds 1500 px, either side may claim the large tier. The tier is released when its owner returns to 1500 px or below or its mockup is removed. Show live pixel dimensions while selected. Front and Back have independent overlay transforms; moving/resizing an overlay does not change the source Canvas strokes or outer Mockup box. Transforms are transient and reset when a Mockup is removed and added again.

## 3. Editor workspace and coordinate model

### 3.1 Workspace regions

The desktop editor should have the following stable regions:

1. **Top command bar:** document name, undo, redo, history/snapshot access, zoom readout, save status, price, Save, Add to Cart, and Buy Now.
2. **Left rail:** Upload, Elements, Text, Effects, AI, and the tool palette. Tools are grouped into Select, Draw, Modify, Navigate, and Measure rather than presented as an unstructured icon list.
3. **Flyout panel:** opens beside the left rail and never changes the artboard's coordinate system. Search, categories, presets, and settings live here.
4. **Center workspace:** Keep the current print canvas blank and fixed; do not add always-visible dimension, DPI, or format badges above it. Keep the smaller canvas-options circle slightly separated from the canvas edge at its vertical midpoint on both Web/Desktop and Phone/Mobile. Its menu contains **Show Grid** and **Add Mockup**. Show Grid toggles a layout grid over the canvas and all added mockup boxes. Do not display a mockup by default. Add Mockup creates a temporary Front Mockup; place the circular Back Mockup add control at the left edge, slightly below the connector wire, between the canvas and Front Mockup. Provide a close control on each mockup. Allow the canvas and mockup boxes to move independently with pointer/touch dragging and draw connector wires from the canvas to each mockup that track movement and responsive layout. Drawing a black freehand stroke inside the canvas mirrors it live to both mockups. Per the owner's direct instruction, Front and Back mockup boxes use identical width (`min(18.25rem, 78vw)`, square aspect ratio, and common initial `0.82` artwork scale). Keep the canvas interior for drawing and drag its border to reposition it. This limited stroke preview is temporary and does not add the full sticker library/object editor or persistence. Replace the temporary boxes with Cloudflare R2-backed assets after those are supplied.
5. **Right dock:** Layers panel, contextual properties, color, typography, effects, masks, and mockup controls. The Layers box must remain mounted even when no layer is selected.
6. **Bottom attribute bar:** Product, print method, fabric, structure, GSM, color, cutting, size, and mockup attachment state. Product selection remains separate from the editor's asset browser.

**Owner-directed Mockup interaction (2026-11-14):** The full set of strokes shown on each Mockup is one independently movable/resizable artwork group, separate from the Mockup box itself and from the source Canvas drawing. Provide a visible corner resize handle and support pointer/touch dragging. Enforce one shared, provisional **3500 px** large tier and one **1500 px** small tier: whichever side grows above 1500 px owns the large tier, and the other side is capped at 1500 px. Either side may claim the large tier; it is released when its owner returns to 1500 px or below.

### 3.2 Document coordinate system

Every design document has a document coordinate space independent of browser zoom and viewport pan:

- `documentWidth` and `documentHeight` describe the print area in design units.
- `viewportZoom`, `viewportPanX`, `viewportPanY`, and `viewportRotation` describe only how the user views the document.
- Each object stores local transform data: `x`, `y`, `width`, `height`, `scaleX`, `scaleY`, `rotation`, `skewX`, `skewY`, and `origin`.
- Front and Back are separate artboards/documents sharing the selected product attributes.
- Mockup placement uses a separate mapping transform. It must never rewrite the source artwork's document coordinates.
- All hit-testing converts pointer coordinates through `screen → viewport → document → object-local` space. This prevents browser zoom or Rotate View from corrupting print placement.

### 3.3 Artboard and print safety

The canvas must show three non-printing regions:

- **Trim boundary:** final print-area boundary.
- **Safe area:** recommended inset where important text and logos should remain.
- **Bleed/overflow area:** optional extra artwork area for production methods that need it.

The user can toggle these overlays. They are not exported into the clean SVG/PNG production output. Product-specific print-area dimensions come from the selected Product and attribute combination, not hardcoded editor defaults.

### 3.4 Responsive UI/UX layout contract

Current user-directed steps (2026-11-13): temporarily hide the storefront site `Header` on `/create`, while keeping the editor workspace. Prevent Ctrl/Command+wheel from zooming the browser; over the workspace it zooms the view. Pan with middle-button drag or Space+left-drag, and let unmodified wheel move the view vertically. Do not display a pixel-size label or invent physical print dimensions; product-specific print dimensions must come from product configuration. The preview boxes use responsive visual proportions from the supplied reference: a blue-outlined `T-Shirt` design box on the left, a purple-outlined `Mockup` box on the right, and a connector line with a small purple dot between them. The dot toggles the mockup box. Until real product mockup images are supplied in R2, render neutral placeholder image slots with a print-area guide; do not connect to or populate R2 now. Show one slot per available product side: Front and Back for a two-sided shirt, and only the supported side for a one-sided product. The blank `/create` editor currently defaults to Front and Back until selected-product configuration is wired. These pan gestures follow [Kittl Canvas essentials](https://help.kittl.com/editing-and-design/basic-handling) and [Kittl keyboard shortcuts](https://help.kittl.com/editing-and-design/keyboard-shortcuts). Apply only these requested behaviors; do not redesign other controls. Responsive work applies to the editor workspace: tools, asset flyout, canvas, Layers/Properties, mockup controls, and product attributes.

On **Web/Desktop**, the workspace uses a compact three-zone composition: a narrow left tool rail, an optional asset flyout, a flexible center canvas, and a right Layers/Properties dock. The right dock keeps the layer tree available without forcing a separate navigation page. Widths are constrained so the canvas remains the visual priority; long controls scroll inside their own panel instead of making the whole document scroll.

On **Phone**, the workspace is a single-column canvas-first view. The left rail becomes an icon-only 44–48px rail. Asset panels open as a bottom sheet with a rounded top edge, a visible drag/close affordance, a maximum height, and internal scrolling. Layers/Properties open as a separate bottom sheet or side overlay from a compact mobile dock; they must not permanently consume canvas width. Product attributes stay in a horizontally scrollable compact strip. The canvas must remain reachable without nested page scrolling.

All responsive panels use the same state and callbacks as desktop. Opening a sheet does not clear selection, alter document coordinates, or duplicate editor state. A sheet closes with its close button, backdrop tap where safe, or `Escape`; text inputs and file pickers keep focus until their action completes. Touch targets are at least 44px on phone, while the dense desktop panel may use smaller secondary controls. Selected, pressed, locked, hidden, loading, and disabled states must remain visible without hover.

The mobile dock exposes only the high-frequency actions: Assets, Layers, Mockup, and the active tool. Advanced properties remain inside the Layers sheet below the layer tree. The desktop header/command bar is not redesigned as part of this milestone; future header work requires a separate plan decision.

## 4. Selection architecture

Selection is the foundation for every tool. A selection is not only a Fabric active object; it is an application-level selection state that can refer to one object, many objects, anchors, path segments, a group, an artboard, or a mockup mapping.

```ts
type SelectionState = {
  kind: "none" | "object" | "multi" | "group" | "path" | "anchors" | "artboard" | "mockup";
  ids: string[];
  anchorIds?: string[];
  activeId?: string;
  sourceSide: "front" | "back";
};
```

### 4.1 Selection rules

- Single click selects the topmost eligible object under the pointer.
- `Shift`/`Ctrl` click adds or removes an object from the selection.
- Dragging on empty canvas creates a marquee. The default marquee mode selects objects fully inside; a preference can enable intersecting selection.
- Lasso selects objects whose hit region or configured center point falls inside the lasso. The current prototype uses center-point selection; production should offer object-intersection selection.
- Clicking a layer selects the corresponding object and scrolls the canvas object into view.
- Hovering a layer highlights its canvas object, and hovering an object highlights its layer row, following the useful Kittl layer-panel relationship. [2]
- A locked object cannot become an editable active object. It may still be visible, copied as a reference, or selected through a permitted parent operation.
- A hidden object cannot be selected from the canvas, but it remains selectable from Layers for reveal/unhide.
- Group selection has two levels: select the group as one transform unit, or enter isolation mode to edit children without losing the group context.
- Double-click on text enters text-edit mode. Double-click on a group enters isolation mode unless the pointer is directly over editable text.
- `Esc` exits text edit, path edit, group isolation, or mockup edit in that order, then clears selection.

### 4.2 Selection visual language

- Object selection: thin accent outline and transform handles.
- Multi-selection: one outer bounding box plus small member indicators.
- Path selection: visible anchors, direction handles, selected segments, and path direction.
- Locked object: lock badge, no transform handles, clear status message.
- Clipped object: clip badge and a visible relation to its base layer.
- Mockup edit: a distinct inner placement frame so users know they are moving artwork inside the mockup, not moving the mockup itself.

## 5. Move tool — first-class behavior

The Move tool is the default tool and must be the most predictable part of the editor. Photoshop's Move tool moves one or more selected layers, supports automatic layer/group selection, and uses 1 px and 10 px keyboard nudges. [11] Kittl similarly treats direct select-and-drag, right-click actions, locking, and keyboard modifiers as core canvas behavior. [1] [6]

### 5.1 Basic Move behavior

1. Activate with the Move tool button or `V`.
2. Click an eligible object to select it.
3. Drag inside the object to move it in document coordinates.
4. Drag a selected object when multiple objects are selected to move the complete selection as one unit.
5. Click empty canvas to clear selection unless marquee drag begins.
6. Hold `Shift` while dragging to constrain movement to the dominant horizontal or vertical axis.
7. Hold `Alt/Option` while dragging to duplicate the selection and move the duplicate.
8. Hold `Space` temporarily to pan instead of moving the artwork; release Space to return to Move.
9. Arrow keys nudge by 1 design pixel/unit. `Shift + Arrow` nudges by 10. The nudge amount must be configurable for physical print units.
10. `Ctrl/Cmd + Z` and `Ctrl/Cmd + Shift + Z` undo and redo the complete move as one transaction, not every pointer event.

### 5.2 Auto-select policy

The Move tool options must expose:

- **Auto-select: Off:** pointer selects only the currently selected layer or the layer explicitly chosen in Layers.
- **Auto-select: Layer:** clicking visible artwork selects the topmost eligible layer.
- **Auto-select: Group:** clicking a child selects its nearest editable group.
- **Select through transparent pixels:** off by default for raster images; when enabled, transparent pixels do not capture the click.
- **Ignore locked layers:** on by default.
- **Pick from all visible layers / current side:** current side by default, all visible layers as an explicit option.

This follows Photoshop's documented Layer versus Group auto-selection distinction while keeping MH Fashion's product workflow safer by default. [11]

### 5.3 Move snapping and guides

During Move, the editor may show:

- artboard center and edges;
- safe-area edges;
- print-area centerlines;
- object edges, centers, and equal-spacing guides;
- Front/Back alignment guides when the same placement should be reused;
- cursor position, delta X/Y, and distance to nearby objects;
- snap-to-grid, snap-to-guides, snap-to-object, and snap-to-artboard toggles.

Illustrator's Smart Guides distinguish object guides, alignment guides, anchor/path labels, object highlighting, measurement labels, spacing guides, distance guides, construction guides, and snapping tolerance. MH Fashion should expose these as a smaller understandable set, with an Advanced toggle for detailed control. [10]

Snapping must be reversible during a gesture: hold `Ctrl/Cmd` while dragging to temporarily disable snapping, matching the modifier pattern documented by Kittl. [6]

### 5.4 Move property editing

The contextual toolbar and right panel must support exact fields:

- X, Y position;
- W, H dimensions;
- lock/unlock aspect ratio;
- rotation;
- skew X/Y in Advanced mode;
- horizontal and vertical flip;
- align to artboard;
- align to selection;
- distribute with equal spacing;
- bring forward/backward and bring to front/send to back;
- duplicate, copy, paste, and paste in place;
- reset transform;
- convert to group or component where applicable.

Every numeric edit is a single history transaction. Invalid values are rejected with a visible message and do not partially mutate the object.

### 5.5 Move acceptance criteria

- A locked object cannot move through the canvas, keyboard, contextual toolbar, or drag-and-drop.
- A locked ancestor locks all descendants.
- Moving a group preserves child local coordinates.
- Moving a multi-selection preserves relative distances and rotations.
- Move does not alter the object's design color or source artwork.
- Undo returns every object to its exact prior transform.
- Front/Back mockup attachment never changes source placement coordinates.
- Move works identically at 25%, 100%, and 400% viewport zoom.

## 6. Transform system

Transform must be shared by Move, Rotate, Scale, Shear, and Free Transform rather than implemented separately for each tool.

### 6.1 Transform modes

- **Bounding-box transform:** move, scale, rotate, flip.
- **Free Transform:** independent corner movement with optional perspective/quad mode for approved mockup mapping.
- **Numeric Transform:** exact position, size, angle, skew, and origin fields.
- **Transform origin:** center by default; user can move the origin for rotation, reflection, and scaling.
- **Constrain:** Shift locks proportions/angles depending on the active gesture; an explicit toolbar toggle makes the behavior discoverable.
- **Scale from center:** `Alt/Option`.
- **Duplicate while transforming:** `Alt/Option` drag.
- **Reset Transform:** restores the saved transform baseline without deleting source artwork.

### 6.2 Product-specific transform restrictions

The selected product may impose a print-area boundary, maximum scale, minimum legibility size, or allowed rotation. The editor should warn before export rather than silently clamp the user's artwork. Admin-configured rules can later define whether an object may cross the trim boundary.

## 7. Vector drawing system

### 7.1 Pen tool

The Pen tool creates editable vector paths, not raster marks:

- click creates corner anchors;
- click-drag creates smooth anchors with direction handles;
- click an existing endpoint closes a path;
- `Alt/Option` temporarily changes the active handle behavior;
- `Esc` commits an open path;
- path properties include fill, stroke, stroke width, cap, join, dash, opacity, and blend mode;
- every path is stored as a path object with anchors, handles, closed/open state, fill, and stroke;
- a first Pen object can reuse an eligible blank layer under the current layer rules.

Illustrator's Pen documentation treats paths as editable anchor-and-handle geometry, and its tool family includes Add Anchor Point, Delete Anchor Point, Anchor Point, and Curvature tools. MH Fashion should adopt that model for production vector artwork. [9]

### 7.2 Path Select and anchor editing

Path Select must have two explicit modes:

- **Path Select:** selects and transforms the whole path.
- **Direct Path Edit:** selects anchors or segments and edits only their geometry.

Direct Path Edit must support:

- select one or more anchors;
- move anchors with snapping;
- convert corner ↔ smooth ↔ symmetric anchor;
- add/delete anchors without destroying neighboring curve intent;
- move a segment;
- break, join, close, and reverse a path;
- simplify path with a preview and undo;
- convert stroke to outline as a separate destructive command with a confirmation.

The current prototype's Path Select is whole-path only, so Direct Path Edit is a production milestone rather than an existing feature.

### 7.3 Shape Builder and Boolean operations

Add Illustrator-inspired vector construction tools:

- Shape Builder merges selected regions and removes selected regions.
- Boolean operations: Union, Subtract, Intersect, Exclude, Divide, and Outline.
- Operations preserve an editable operation record where feasible; otherwise they create an explicit derived vector object with source references in history.
- A preview highlights the region that will be added or removed before commit.
- Original source shapes remain recoverable through Undo and a non-destructive compound-shape representation.

Illustrator documents Shape Builder as a way to create complex shapes by merging and erasing simpler objects. [12]

### 7.4 Vector color and appearance

Vector objects need separate Fill and Stroke channels. Each channel supports solid color, gradient, opacity, and swatch reference. Appearance should be represented as an ordered stack so a later implementation can support multiple strokes/fills without changing the document model.

## 8. Raster and image system

### 8.1 Image import

Supported local input remains PNG, JPG, and WebP. Import must:

- preserve the original file bytes in the document or asset store;
- create a non-destructive image layer with a transform baseline;
- generate a thumbnail without replacing the source;
- show pixel dimensions and effective print DPI;
- warn when an image is too small for the selected print area;
- support Replace Contents while preserving the existing transform;
- support Reset Transform;
- support Rasterize only as an explicit destructive action.

### 8.2 Pixel selection roadmap

The production editor should eventually support:

- Rectangular/Elliptical Marquee;
- Lasso and Polygonal Lasso;
- Magic Wand with contiguous/non-contiguous modes, tolerance, anti-alias, and sample-all-layers options;
- Select Subject / Remove Background through the configured AI provider;
- inverse, expand, contract, feather, and save selection;
- selection channels or named reusable selections.

The current Magic Wand is intentionally object-level for raster images. Do not describe it as pixel selection until a real pixel buffer and mask pipeline exists.

### 8.3 Pixel editing roadmap

A later raster engine may support brush, pencil, paint bucket, clone brush, healing, blur, sharpen, dodge, burn, smudge, and pixel eraser. These operations require a tile-based or worker-backed raster surface, memory limits, progressive rendering, and a clear distinction between source image data and generated preview. They should not be simulated by deleting Fabric objects.

## 9. Layers, groups, masks, and non-destructive editing

### 9.1 Layer tree

The layer tree is the source of truth for composition order. Each layer has:

```ts
type EditorLayer = {
  id: string;
  name: string;
  kind: "text" | "shape" | "path" | "image" | "element" | "group" | "adjustment" | "mockup";
  parentId?: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  fillOpacity?: number;
  flow?: number;
  blendMode: BlendMode;
  clipping?: boolean;
  maskId?: string;
  effects: EffectState[];
  sourceRef?: string;
  transform: TransformState;
};
```

The current implementation infers some type behavior from layer names. Production must store `kind` explicitly and migrate old drafts safely.

### 9.2 Layer operations

Support create, rename, duplicate, delete, hide/show, lock/unlock, reorder, group, ungroup, nest, unnest, isolate, clip, link, and select. Layer reorder must use a clear insertion marker. The panel must show visibility and lock state even when the row is not hovered. Kittl's documented layer system provides a useful baseline for reorder, rename, hide, lock, group, nested artboard content, and export inclusion. [2]

### 9.3 Lock modes

The current all-or-nothing lock remains the first production step. Later, add Photoshop-style independent locks:

- lock transparent pixels;
- lock image pixels;
- lock position;
- lock all;
- lock children through group inheritance.

A lock reason must be shown when an action is rejected: object lock, ancestor lock, product-template lock, or system/mockup lock.

### 9.4 Masks

Implement masks as first-class non-destructive nodes:

- layer mask: grayscale alpha that reveals/hides pixels or vector render output;
- vector mask: path-based visibility boundary;
- clipping mask: upper layer uses the alpha of a lower base layer;
- group mask: masks the composited group result;
- mask link: linked mask moves with the layer; unlink allows independent movement;
- mask strength: preview opacity of the mask effect;
- edit mask mode: paint/edit mask without altering source artwork;
- invert, disable, apply, and delete mask actions with confirmations for destructive Apply.

Photoshop documents layer masks as a way to hide or reveal parts of a layer and non-destructive workflows as combinations of masks, Smart Objects, adjustment layers, and Smart Filters. [7] [13]

### 9.5 Blend, opacity, Fill, and Flow

Keep the current panel order: Blend Mode and Opacity first; Lock and Fill second. Add Flow only in Advanced properties. Distinguish:

- **Opacity:** transparency of the complete rendered layer, including effects where applicable.
- **Fill:** transparency of the base artwork before selected effects.
- **Flow:** accumulation/intensity for brush-like operations; for non-raster objects it may remain disabled.
- **Blend mode:** how the layer or isolated group composites with the layer below.

New groups default to Pass Through. Choosing another group blend mode composites children first, then blends the group result. This matches the current MH Fashion direction and the Photoshop-style distinction between layer opacity and blending. [14]

### 9.6 Smart Objects

The current embedded raster Smart Object metadata should become a formal source-container model:

- original source bytes or source asset key;
- source type: raster, SVG, text, or compound group;
- placement transform;
- content version;
- replace-content history;
- reset-transform baseline;
- rasterize conversion record.

Future linked Smart Objects may reference private R2 assets, but missing-link states must be explicit and must never silently render a blank layer. Photoshop documents embedded and linked Smart Objects, replacing contents, resetting transforms, and rasterizing as separate operations. [7] [15]

### 9.7 Photoshop-style Layers box contract

The Layers box should borrow Photoshop's interaction model without copying Adobe's visual assets or proprietary implementation. The panel is a composition control surface, not merely a list of objects. Its stack order is explicit, its row state is always visible, and every destructive or non-destructive operation maps to an application-state transaction.

**Layer row anatomy:** each row contains a visibility control, an optional expand/collapse control, a thumbnail, a human-readable name, a type or group badge, and lock/mask/effect/clipping indicators. Visibility and lock are persistent row controls rather than hover-only affordances. Selecting the thumbnail/name selects the layer; double-clicking the name enters rename mode. A group row selects the group at the first level, while its disclosure control expands children without changing selection. Photoshop exposes visibility, locking, stacking, grouping, and layer selection as separate layer-panel operations. [16] [17]

**Panel header:** the header keeps the active side and item count visible. Under it, MH Fashion adds a search field and a type filter for All, Text, Shape, Path, Image, Group, Smart Object, Mask, and Effect. Filtering is presentation-only: it must never change document order, selection, visibility, export inclusion, or persisted layer data. If a group contains a matching descendant, the group remains visible as context. A clear action restores the complete tree.

**Selection and multi-selection:** clicking a row selects it; `Shift` selects a contiguous range and `Ctrl/Cmd` toggles non-contiguous rows. The application stores selected IDs separately from Fabric's active object so a panel selection remains stable when the canvas is re-rendered. A locked or hidden layer can be selected from the panel for reveal/unlock, but it cannot become an editable canvas target until the restriction is removed.

**Visibility and lock semantics:** the eye icon controls rendering only. It does not delete content and it does not change the source mark. The lock icon blocks canvas transforms, keyboard nudges, numeric property edits, reordering when the operation would violate a locked ancestor, and destructive actions. A group lock applies to descendants. When an action is rejected, the status message identifies whether the cause is the selected layer, an ancestor group, the product template, or a mockup/system layer.

**Stacking and drag behavior:** the panel renders the topmost layer first, matching the canvas compositor's order. Dragging a row displays a before/inside/after insertion marker. Dropping into a group changes `parentId`; dropping before/after changes sibling order. A group cannot be nested inside its own descendant, a content layer cannot be inserted into a locked group, and invalid drops are no-ops with an explanatory status message. Keyboard layer order commands use `Alt/Option + [` and `]` for selection movement and `Ctrl/Cmd + [` and `]` for stack movement, with MH Fashion shortcuts documented in the help surface. [18]

**Group isolation:** double-clicking a group row or group artwork enters isolation mode. The panel keeps the group context visible, dims unrelated rows, and routes canvas clicks only to the group's descendants. `Esc` exits isolation before clearing selection. Group blend mode defaults to Pass Through; choosing another mode composites children first and then blends the group result with the layer below.

**Non-destructive property strip:** Opacity applies to the complete rendered layer; Fill applies to base artwork before selected effects; Flow is reserved for brush/raster tools; Blend Mode controls compositing. Numeric changes are clamped, validated, and committed as one history transaction. The panel must never silently rasterize a vector, text, or Smart Object to make a property possible. Photoshop documents opacity and blending as layer-panel properties and distinguishes non-destructive masks, Smart Objects, and Smart Filters. [14] [19]

**Smart Object and mask affordances:** a Smart Object row shows a source badge and preserves its placement transform when contents are replaced. A mask row is represented as a child/companion node with its own selected state, visibility, density, link, disable, invert, apply, and delete commands. The first MH Fashion implementation may expose metadata and preview controls while pixel mask painting remains a later raster milestone; the UI must label that boundary instead of implying unsupported Photoshop parity. [15] [20]

**MH Fashion design adaptation:** use the existing compact right-dock language—dark text, pale surfaces, lime accent, dense but readable rows—and add Photoshop's information hierarchy rather than reproducing its desktop chrome. The row should preserve a minimum 36px hit target, keyboard focus ring, tooltip/aria label, and visible selected/hover/drop states. On narrow screens, properties collapse below the layer tree; the layer search/filter remains available.

### 9.8 Photoshop-inspired tool behavior contract

The tool palette is organized by behavior: Select, Draw, Modify, Navigate, and Measure. The Move tool is first-class. Its options bar exposes Auto-select Off, Layer, or Group; locked-layer ignoring; current-side versus all-visible-layer scope; and optional transparent-pixel picking for raster images. Photoshop documents Layer and Group as distinct Auto Select modes, and arrow keys as layer nudges. [11] [16]

For the current Fabric object editor, these options apply to object selection and group context rather than pixel selection. Auto-select Off keeps canvas hit-testing on the selected layer; Layer selects the topmost eligible object; Group selects the nearest editable parent context. `Shift` constrains a drag to its dominant axis, `Alt/Option` duplicates on drag, `Space` temporarily pans, `Ctrl/Cmd` temporarily bypasses snapping, and `V` activates Move. A raster-only behavior is explicitly marked unavailable until the tile-based pixel engine exists.

Selection tools follow Photoshop's separation between selecting a layer/object and editing its contents. Marquee and Lasso select objects in the current milestone; later raster selections will produce masks or alpha selections rather than deleting pixels. Magic Wand remains vector color matching until a real raster selection buffer is implemented. Eraser and Clone Stamp must continue to report their object-level behavior instead of claiming pixel parity.

### 9.9 Implementation mapping

The canonical model remains `EditorLayer[]` plus `CanvasMark[]`, with Fabric objects carrying a stable `data.id`. The Layers box owns presentation state (`query`, `filter`, collapsed groups, hover, focus, drop hint); the document owns composition state (`visible`, `locked`, `parentId`, `childIds`, `opacity`, `fillOpacity`, `flow`, `blendMode`, masks, effects, and source metadata). Canvas event handlers consult the document state before setting `selectable` or `evented`. Every row action calls `commitDocument`, so visibility, lock, reorder, group, mask metadata, and property changes share Undo/Redo and local-draft persistence.

The first implementation slice now includes Move Auto-select controls, selected-layer policy in Fabric hit testing, Layers-box search/type filtering, Shift multi-selection, bulk hide/lock actions, group-aware multi-delete, and history-backed state updates. The next slice will add contiguous range selection, group isolation, keyboard stack movement, independent lock modes, and mask companion nodes. Pixel brushes, pixel masks, and Photoshop-compatible PSD import are not implied by this plan.

### 9.10 History and appearance implementation milestone

The editor now exposes a compact History panel in the dock. Each document transaction records a user-facing label, the current state, undo count, and redo count. Undo moves the current label to the redo branch; a new edit clears the redo branch; restoring a draft starts a fresh history session. The existing top command-bar Undo/Redo buttons and the dock buttons call the same transaction functions, so they cannot diverge.

Layer appearance controls are grouped in the Layers dock: Blend Mode uses the selected layer/group's allowed mode list, Opacity applies to the whole rendered layer, and Fill applies to base artwork while remaining disabled for groups. Numeric fields clamp to 0–100 and the expandable slider provides a touch-friendly adjustment path. Each appearance change is an undoable history transaction.

Layer rows are draggable with before/inside/after insertion feedback. Locked sources, locked targets, and locked ancestors reject a reorder without mutating document state. The drop operation preserves `parentId`, updates group `childIds`, and records a `Reorder layer` history entry. Locked rows expose a not-allowed cursor and cannot be dragged.

## 10. Text and typography system

Text must remain editable until the user explicitly converts it to outlines or rasterizes it.

### 10.1 Text object levels

Use two levels of editing:

- **Text-box level:** transform, font family, overall size, box width/height, alignment, line height, letter spacing, fill, stroke, shadow, curve/warp, and effects.
- **Character level:** selected ranges can change font, weight, size, color, letter spacing, uppercase, underline, italic, and ligatures.

Kittl explicitly separates text-box-level and character-level editing and supports font, weight, size, letter spacing, line height, alignment, uppercase, ligatures, and transformed text. [5]

### 10.2 Typography features

Roadmap features:

- point text and area text;
- text on path;
- curved text with live editable curve;
- arch, circle, angle, rise, wave, flag, and custom transformations;
- font search by family, style, weight, and license status;
- variable font axes where licensed fonts support them;
- paired typography presets;
- text auto-fit with minimum readable size warnings;
- outline text as a derived vector copy, preserving the original hidden text layer;
- font substitution warning when a saved design's font is unavailable.

The current prototype has heading/subheading/body insertion and basic selected-text formatting. Custom licensed fonts remain deferred until the typography/R2 phase.

## 11. Effects and appearance

Effects must be editable properties, not baked pixels, until export or explicit rasterization.

### 11.1 Initial effects

- shadow: offset, blur, spread, color, opacity;
- stroke/outline: width, join, color, opacity;
- glow: color, size, intensity;
- blur and sharpen for raster images;
- gradient fill;
- texture overlay;
- color overlay and recolor;
- displacement/warp as a future mockup-only effect.

### 11.2 Effect order

Each layer stores an ordered effect list. The renderer documents whether an effect acts before or after Fill, Opacity, Blend, and Mask. The UI must show a compact list with visibility toggles, reorder, duplicate, reset, and “convert to pixels” only as an explicit destructive action.

### 11.3 Kittl-inspired text decoration

Add text decoration presets for apparel design—outline, shadow, offset, cut, stripe, and texture—but keep them represented as editable text effects. Kittl documents decoration and transformation effects that can work together while character styling remains editable. [3] [5]

## 12. Alignment, guides, rulers, and measurements

Provide a single Alignment panel for:

- align left/center/right/top/middle/bottom to artboard;
- align selected objects to each other;
- distribute horizontal and vertical spacing;
- tidy three or more objects;
- equal width/height;
- center in print area;
- match Front placement to Back where allowed.

Kittl's alignment model distinguishes one object aligned to the artboard from multiple objects aligned to each other and offers equal spacing for three or more objects. [4]

The Ruler tool remains a non-printing measurement overlay. Production adds persistent guides, guide labels, unit switching, angle/distance readouts, and measurement annotations that can be saved as non-printing document metadata.

## 13. Mockup and product preview system

### 13.1 Mockup object model

A mockup is a linked preview node with:

- source product/style/color/angle;
- placement zone or panel mapping;
- artwork source side and layer filter;
- transform or perspective mapping;
- color/recolor parameters;
- render status and asset version.

The source design remains independent. Updating the design refreshes every attached mockup.

### 13.2 Apparel and jersey behavior

- T-shirt/hoodie: design is clipped to the selected print zone and composited over the product mockup.
- Front and Back are separate source sides. Front placement copies to Back only when print-area types match.
- Jersey: panel-based SVG zones map front-left, front-right, back, sleeves, collar, and any future panels. MVP uses perspective warp; displacement maps are later.
- Product color changes update all attached compatible mockups, but never recolor the design artwork itself.
- Mockup edit mode moves/scales the design inside the mapped frame. Selecting the mockup itself edits mockup properties.

Kittl's documented mockup workflow also keeps the design linked to the selected artboard, allows repositioning/scaling inside the mockup, separates mockup color from artwork color, and supports multiple mockups with a shared source design. [3]

### 13.3 Commerce gate

Add to Cart and Buy Now remain disabled until:

1. a valid Product and required attributes are selected;
2. a valid print area is selected;
3. the mockup attachment is complete;
4. artwork passes size, overflow, and unsupported-font checks;
5. a production export can be generated or queued.

## 14. Export and production handoff

### 14.1 User export

Provide Quick Export for the current selection and a full Export panel for production settings. Kittl distinguishes quick selection export from full export settings such as size, DPI, format, color, transparency, and multiple artboards. [6]

Supported targets:

- transparent PNG for preview and digital use;
- SVG for clean vector artwork;
- PDF for print handoff when the print workflow supports it;
- JPEG only when transparency is not needed;
- mockup PNG/JPEG for storefront preview;
- ZIP for multiple sides, colorways, or mockups.

### 14.2 Production export package

The production worker/exporter must produce:

```text
order-export/
  manifest.json
  front.svg
  back.svg
  panels/*.svg
  previews/front.png
  previews/back.png
  mockups/*.png
  coordinates.json
  warnings.json
```

`manifest.json` records Product, Fabric Type, Knit Structure, GSM, Print Method, Cutting, Color, Size, document dimensions, export version, source design ID, font IDs, and asset checksums. `coordinates.json` records clean SVG placement coordinates per print location. No browser-only preview transform should be accepted as production coordinates without conversion and validation.

### 14.3 Export validation

Before export:

- verify all referenced assets are available;
- verify fonts are licensed/embedded or converted according to policy;
- flag raster images below effective DPI threshold;
- flag artwork outside the allowed print region;
- flag unsupported blend/effect features that cannot be represented in clean SVG;
- verify front/back and panel IDs;
- render a thumbnail and compare it with the editor preview;
- store export version and warnings for Print Admin.

## 15. Keyboard and pointer conventions

Use familiar shortcuts where they do not conflict with browser behavior:

- `V` Move/Selection;
- `T` Text;
- `P` Pen;
- `H` Hand;
- `Z` Zoom;
- `I` Eyedropper;
- `R` Rectangle/Shape;
- `E` Eraser;
- `Ctrl/Cmd + Z` Undo;
- `Ctrl/Cmd + Shift + Z` Redo;
- `Ctrl/Cmd + D` Duplicate;
- `Ctrl/Cmd + G` Group;
- `Ctrl/Cmd + Shift + G` Ungroup;
- `Ctrl/Cmd + S` Save;
- `Ctrl/Cmd + E` Export;
- `[` / `]` move layer backward/forward;
- `Shift + [` / `Shift + ]` send to back/bring to front;
- `Space + drag` pan;
- `Alt/Option + drag` duplicate;
- `Shift + drag` constrain;
- `Alt/Option + scroll` zoom;
- `Esc` exit current edit mode.

The shortcut panel must be searchable, show Mac and Windows variants, and explain conflicts. Kittl's official shortcut list provides a practical baseline for editor, view, layer, arrangement, text, and modifier shortcuts. [6]

## 16. Undo, redo, history, and persistence

Every user-visible mutation is a command with:

```ts
type EditorCommand = {
  id: string;
  type: string;
  timestamp: number;
  side: "front" | "back" | "document";
  targetIds: string[];
  before: SerializedEditorState;
  after: SerializedEditorState;
  description: string;
};
```

Rules:

- pointer drags coalesce into one command on pointer-up;
- text typing coalesces by short idle interval, with an explicit commit on blur;
- layer reorder, visibility, lock, mask, effect, and transform each create one command;
- undo never writes a partially restored canvas;
- redo is invalidated after a new mutation;
- snapshots are named read-only restore points;
- browser-local Save remains available, but account-backed Save becomes the production source of truth;
- autosave uses a debounced local draft and later a server draft with conflict/version checks.

## 17. Accessibility and safety

- Every tool has a tooltip, shortcut, keyboard focus state, and plain-language status message.
- Color-only state must also have an icon, label, or pattern.
- Locked, hidden, clipped, masked, and unavailable objects must be distinguishable without relying on color alone.
- Keyboard users can navigate rail, flyout, Layers, properties, and canvas selection.
- Destructive actions—Rasterize, Apply Mask, Outline Text, Merge, Delete Layer—require an explicit confirmation or an immediately recoverable history command.
- Disable page zoom shortcuts and Ctrl/Cmd+wheel browser zoom on the website, and suppress page-level right-click/context menus. Keep unrelated shortcuts working, preserve mobile touch pinch zoom, and make site actions available through visible controls and keyboard paths. Browser chrome menus and toolbar zoom remain outside website control.
- Terms acceptance, watermark, copyright responsibility, and user-content policy remain required before first use.

## 18. Implementation phases

### Phase E0 — First usable shared editor (Web + Phone)

- The verified `/create` route is a shell, so build the actual Fabric.js canvas and shared per-side document state; do not assume an existing object model or local draft behavior.
- Deliver the owner-requested initial artwork operations and responsive controls described in §6 on both Web/Desktop and Phone/Mobile, preserving one selection/document/history state across desktop panels and phone sheets.
- Hide the global mobile navigation and remove its reserved bottom-page spacing on `/create`; keep the full-height editor canvas and phone dock inside the viewport.
- Centralize document-to-viewport coordinate conversion and transform commands so pan/zoom never modify artwork coordinates.
- Add editor-specific tests for insertion, selection/move, transform conversion, undo/redo, local save/restore, Front/Back, and responsive state parity. Keep broader selection, lock inheritance, layer reorder, export, and advanced tools in later phases.
- Add the searchable shortcut/help panel after the core editor flow is usable.

### Phase E1 — Professional Move and selection

- Auto-select Layer/Group modes.
- Multi-select, marquee intersection preference, lasso intersection mode.
- 1/10 unit nudges, exact X/Y/W/H/rotation fields.
- Snap toggles, guides, spacing readouts, align/distribute panel.
- Transform origin, constrained scale, duplicate-on-drag, flip, and reset transform.

### Phase E2 — Vector precision

- Direct Path Edit and anchor handles.
- Add/delete/convert anchors and segment operations.
- Shape Builder and Boolean operations.
- Separate fill/stroke appearance model.
- Text on path and vector outline conversion with original-text preservation.

### Phase E3 — Layers and non-destructive effects

- First-class masks and editable mask mode.
- Full lock modes, linked layers, group isolation, and layer search/filter.
- Formal Smart Object container and replace-content UI.
- Effect stack, effect ordering, mask-aware effects, and export warnings.

### Phase E4 — Raster production engine

- Worker/tile-backed pixel buffer.
- Real pixel selections, paintable masks, pixel eraser, clone brush, and raster filters.
- AI Remove Background and Upscale for uploaded photos.
- Memory/performance limits and progressive rendering.

### Phase E5 — Product, mockup, and export production

- Private R2 assets and same-origin asset routes.
- Production mockup mappings for T-shirt, hoodie, streetwear, and jersey panels.
- Clean SVG and print export worker.
- Export manifest, coordinates, warnings, previews, and Print Admin handoff.
- Supabase Auth, account-backed designs, saved versions, and design limits.

### Phase E6 — Collaboration and advanced automation

- Server draft versions and conflict resolution.
- Comments/review states.
- Multi-artboard design sets and colorway variations.
- Batch mockup/export.
- AI-assisted layout, recolor, background removal, and image generation, each with explicit point cost and user confirmation.

## 19. Definition of done for the production editor

The editor is production-ready only when all of the following are true:

- Move, selection, snapping, exact transforms, and keyboard nudges are deterministic at every viewport zoom.
- Every object mutation is undoable, restorable, and serialized without losing source data.
- Vector paths remain editable; raster images remain replaceable; text remains editable until explicitly outlined.
- Masks, clipping, opacity, Fill, Blend, groups, and effects render consistently in canvas preview, mockups, and production export.
- Locked and hidden objects cannot be accidentally edited or exported incorrectly.
- Front, Back, and jersey panel coordinates pass print-area validation.
- Production export has a manifest, clean artwork, preview, coordinates, warnings, and reproducible version metadata.
- Account-backed drafts, R2 asset access, role checks, and order linkage are secure before public launch.
- Automated tests cover the editor's state machine and critical pointer/keyboard flows.
- The editor can explain every unsupported feature instead of silently producing an inaccurate print file.

## References

[1]: https://help.kittl.com/editing-and-design/basic-handling "Kittl Canvas essentials"
[2]: https://help.kittl.com/editing-and-design/using-layers "Kittl Use layers"
[3]: https://help.kittl.com/editing-and-design/mockup-generator "Kittl Use the mockup generator"
[4]: https://help.kittl.com/editing-and-design/alignment "Kittl Align elements"
[5]: https://help.kittl.com/editing-and-design/text-settings-editing "Kittl Edit and style text"
[6]: https://help.kittl.com/editing-and-design/download-settings "Kittl Export your design"
[7]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/create-layer-compositions/non-destructive-editing-techniques.html "Photoshop Non-destructive editing techniques"
[8]: https://helpx.adobe.com/illustrator/using/tools-in-illustrator.html "Illustrator Tools in Illustrator"
[9]: https://helpx.adobe.com/illustrator/using/tool-techniques/pen-tool.html "Illustrator Draw shapes and paths using the Pen tool"
[10]: https://helpx.adobe.com/illustrator/desktop/measure-and-align/grids-and-guides/smart-guides-options.html "Illustrator Smart Guides options"
[11]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Photoshop Reorder and move layers"
[12]: https://helpx.adobe.com/illustrator/using/creating-shapes-shape-builder-tool.html "Illustrator Create shapes using the Shape Builder tool"
[13]: https://helpx.adobe.com/photoshop/desktop/create-masks/layer-masks/add-layer-masks.html "Photoshop Add and edit layer masks"
[14]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html "Photoshop Set layer opacity and blending modes"
[15]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/smart-objects-overview-and-benefits.html "Photoshop Smart Objects overview and benefits"
[16]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/transform-manipulate-layers/reorder-and-move-layers.html "Photoshop Reorder and move layers"
[17]: https://helpx.adobe.com/il_en/photoshop/using/create-layers-groups.html "Photoshop Create layers and groups"
[18]: https://helpx.adobe.com/cn/photoshop-elements/desktop/keyboard-shortcuts/keys-layers-panel.html "Photoshop Layers panel keyboard shortcuts"
[19]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html "Photoshop Set layer opacity and blending modes"
[20]: https://helpx.adobe.com/photoshop/desktop/create-manage-layers/smart-objects/create-embedded-smart-objects.html "Photoshop Create embedded Smart Objects"
[21]: https://www.canva.com/help/finding-and-arranging-layers/ "Canva Finding and arranging layers"
[22]: https://www.canva.com/help/brand-kit/ "Canva Set up Brand Kits"


## Appendix A — Fabric.js implementation logic

This appendix converts the product behavior above into a concrete Fabric.js 7.4.0 implementation strategy. The examples are TypeScript-oriented pseudocode: names may be adapted to the existing `FabricDesignCanvas.tsx`, but the state boundaries and event ordering should remain stable.

### A.1 Fabric object and application-state contract

Fabric objects are the rendering and pointer-interaction layer; `CanvasMark[]` and `EditorLayer[]` remain the application source of truth. Do not use Fabric's internal object index or object identity as a persisted layer ID. Every editable Fabric object must carry a stable application record:

```ts
type FabricData = {
  id: string;                 // same ID as CanvasMark and EditorLayer
  side: "front" | "back";
  kind: "Text" | "TextOnPath" | "Shape" | "Pen" | "Image" | "Element" | "Clone";
  layerId: string;
  sourcePathId?: string;      // TextOnPath -> linked guide path
  transient?: boolean;        // overlays are never persisted
};

type TransformState = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  skewX: number;
  skewY: number;
  originX: "left" | "center" | "right";
  originY: "top" | "center" | "bottom";
};
```

`CanvasMark` stores normalized document values for persistence, while Fabric stores scene-space values for rendering. The conversion must be centralized:

```ts
function markToFabric(mark: CanvasMark, fabric: typeof import("fabric")) { /* ... */ }
function fabricToMark(object: FabricObject, previous: CanvasMark): CanvasMark { /* ... */ }
```

The conversion must include `left`, `top`, `scaleX`, `scaleY`, `angle`, `skewX`, `skewY`, `originX`, and `originY`. Do not reconstruct a transform only from a bounding rectangle: doing so loses rotation, skew, and the difference between object dimensions and scaled dimensions.

Every object inserted into a canvas receives `object.data = { id, side, kind, layerId }`. Every object rebuilt from state receives the same data before it is added to the canvas. `data` is used for lookup only; serialized state is still generated from the application model so transient Fabric controls, clip previews, and selection objects cannot leak into drafts.

### A.2 Move tool state machine

The Move tool should have an explicit gesture state instead of relying on scattered booleans:

```ts
type MoveGesture = {
  phase: "idle" | "pressed" | "dragging" | "duplicating";
  pointerId?: number;
  startScene: Point;
  lastScene: Point;
  startTransforms: Map<string, TransformState>;
  activeIds: string[];
  duplicateIds?: string[];
  startedAt: number;
  historyCommitted: boolean;
  snapDisabled: boolean;
  axis?: "x" | "y";
};
```

The state machine is important because `mouse:move` fires many times. The editor must not push one history entry or React state update for every pointer event. On pointer-down, capture the selected objects' starting transforms. During pointer-move, update Fabric objects for immediate feedback. On pointer-up, serialize the final transforms once and commit one command.

Recommended event flow:

1. `mouse:down` receives a `TPointerEventInfo<...>` and converts the browser pointer into scene coordinates with `canvas.getScenePoint(event.e)`. This is the correct coordinate source when viewport zoom/pan is active; do not use raw `offsetX`/`offsetY`.
2. Resolve the target object using the active Auto-select policy. Ignore `transient`, hidden, locked, and locked-ancestor objects. If the target is different from the current selection, update the application selection before starting a drag.
3. Create `MoveGesture` with the selected object IDs and exact starting transforms. Store a deep copy; a reference to mutable Fabric values is not sufficient for undo.
4. If `Alt/Option` is pressed, clone the selected marks and layers once, assign new IDs, attach cloned Fabric objects, and switch the gesture to `duplicating`. The original selection must remain unchanged.
5. Set `phase = "pressed"`. Do not yet write a history command. A click without meaningful movement should only select.
6. On `mouse:move`, calculate `sceneDelta = currentScene - startScene`. Divide by viewport scale only if the chosen scene coordinate API returns viewport coordinates; never divide twice. Apply axis constraint, snapping, and group transform to the starting values.
7. Write the preview transforms directly to the Fabric objects, call `setCoords()` on each, and call `canvas.requestRenderAll()`. React state may be throttled with `requestAnimationFrame`; the source model should not be rewritten on every raw event.
8. Once movement exceeds a small scene-space threshold, for example 2 document units, change to `dragging` and show the contextual delta/guide overlay.
9. On `mouse:up`, finalize the transforms from Fabric, convert them to `CanvasMark` values, update `EditorLayer.transform` if the layer model owns the transform, and push one `EditorCommand` containing all affected IDs. Clear the gesture and transient guides.
10. If the pointer leaves the canvas, use pointer capture or a window-level pointer-up listener so a drag cannot remain stuck in `dragging` state. Cancel safely on `Escape` by restoring `startTransforms` and removing duplicate objects if a duplicate gesture was active.

Use Fabric's selection events only to synchronize selection, not to implement the entire Move gesture:

```ts
canvas.on("selection:created", syncSelection);
canvas.on("selection:updated", syncSelection);
canvas.on("selection:cleared", clearSelection);
canvas.on("object:moving", renderMovePreview);
canvas.on("object:modified", commitFabricModification);
```

`object:modified` is useful for handle-based scale/rotate operations, but it must not create a second history entry after a custom Move gesture has already committed one. Keep a `suppressModifiedCommitRef` or a gesture transaction ID. The same transaction guard is required when application state re-renders Fabric objects after a drag.

### A.3 Selection and locked-object guards

Centralize all edit permission checks. Do not duplicate slightly different lock checks in Move, Text on Path, Layers, and the toolbar:

```ts
function canEditObject(
  object: FabricObject,
  layers: EditorLayer[],
): { ok: true; layer: EditorLayer } | { ok: false; reason: string } {
  const id = (object as DataObject).data?.id;
  let layer = findLayer(layers, id);
  if (!layer) return { ok: false, reason: "This artwork is not editable" };
  while (layer) {
    if (!layer.visible) return { ok: false, reason: "This layer is hidden" };
    if (layer.locked) return { ok: false, reason: "This layer or its parent is locked" };
    layer = layer.parentId ? findLayer(layers, layer.parentId) : undefined;
  }
  return { ok: true, layer: findLayer(layers, id)! };
}
```

A locked object may still be visible and should be able to participate in a selection marquee as a non-editable candidate only if the user enabled “show locked in selection.” It must never receive Fabric transform controls. Set `object.selectable = false`, `object.evented = false`, and render a lock indicator in the layer row/overlay. When a locked target is clicked, do not silently select a different object underneath; show “Layer locked” and allow the user to choose the underlying object deliberately with the documented selection-through behavior.

For multi-selection, filter out locked members before constructing `fabric.ActiveSelection`. If the user selects a mix of editable and locked objects from Layers, either keep the locked objects as non-transforming members with a clear warning or reject the group transform. The first production version should reject the transform rather than produce a partial, surprising move.

### A.4 Move coordinate, snapping, and group math

All Move calculations happen in document scene space. The algorithm is:

```ts
const rawDelta = subtract(currentScene, gesture.startScene);
const constrained = constrainAxis(rawDelta, nativeEvent.shiftKey);
const delta = nativeEvent.metaKey || nativeEvent.ctrlKey
  ? constrained
  : snapDelta(constrained, snapContext);
```

`snapDelta` must compare candidate positions derived from the starting geometry, not the already-snapped preview. Otherwise repeated pointer events can accumulate rounding error. Candidates include each selected object's left/center/right and top/center/bottom against artboard, safe-area, guide, and nearby object candidates. Use a tolerance in document units derived from a screen-pixel preference:

```ts
const toleranceScene = snapToleranceScreenPx / currentViewportZoom;
```

For a group or ActiveSelection, calculate the selection bounds once at gesture start. Apply one snapped delta to every member so relative distances remain exact. Do not snap each child independently. For nested groups, transform the group's parent coordinate and preserve each child's local transform.

When a group has rotation, use the group's scene-space bounding box for guides but apply translation in scene space. Translation should not modify child angle, scale, skew, or local coordinates. When exact numeric X/Y is entered, bypass visual snapping and write the requested document coordinate directly.

### A.5 Move preview versus committed state

During drag, Fabric is the low-latency preview surface. The React model is committed at gesture boundaries. This avoids a feedback loop where `onMarksChange` causes the canvas effect to remove and recreate objects during a pointer drag. The existing `callbacksRef` pattern is appropriate: keep current callbacks and settings in a ref, while the Fabric event listeners are installed once.

On commit:

```ts
const before = serializeTransforms(gesture.startTransforms, gesture.activeIds);
const after = serializeFromFabric(gesture.activeIds);
if (!sameTransform(before, after)) {
  onMarksChange(applyTransforms(callbacksRef.current.marks, after));
  pushHistory({ type: "move", targetIds: gesture.activeIds, before, after });
}
```

Use a numeric epsilon when comparing floating-point values, but persist rounded values consistently, for example to 1/100 document unit. The displayed position may be rounded; the internal transform must not be repeatedly rounded during the drag.

### A.6 Keyboard Move implementation

Attach one document-level keydown handler while the editor is focused, but ignore it when an input, textarea, select, or active text-editing Fabric object owns the event. For a selected editable object:

```ts
const step = event.shiftKey ? 10 : 1;
const delta = {
  x: event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
  y: event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0,
};
```

Apply one nudge command per keydown. If key repeat is enabled, coalesce repeated nudges within a short interval into one history command while still rendering each step. `Alt/Option + Arrow` may use a configurable fine step later; do not overload it until the shortcut is documented.

`V` changes the active tool only when the user is not typing. `Space` temporarily enables pan and must not be interpreted as a text-space insertion outside Fabric text-edit mode. `Escape` cancels active transformation first, then exits group/path/text editing, then clears selection.

### A.7 Fabric Text on Path architecture

Fabric.js provides `Text`, `IText`, and `Textbox`, but a production-grade editable text-on-path feature should not depend on a browser-only SVG `<textPath>` as the persisted source. SVG textPath support varies across export/render paths, and a collection of independent character objects creates too many layers and makes editing/selection awkward.

Use three linked records:

```ts
type TextOnPathMark = CanvasMark & {
  kind: "TextOnPath";
  text: string;
  pathId: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: "normal" | "italic";
  fill: string;
  charSpacing: number;       // Fabric-style 1/1000 em units
  startOffset: number;       // document units along path
  alignment: "left" | "center" | "right";
  baselineOffset: number;    // perpendicular distance from path
  side: "normal" | "reverse";
  pathStart: number;
  pathEnd?: number;
  keepUpright: boolean;
};

type TextPathLink = {
  textId: string;
  pathId: string;
  visibleInExport: boolean;
  showGuideWhenSelected: boolean;
};
```

The guide path is a normal editable `fabric.Path` with its own stable ID and layer. The text object is a custom `FabricTextOnPath` display object with the text mark in `object.data`. The guide path may be hidden in normal preview and shown when the text or path is selected. The guide path is not merged into the text layer and is excluded from clean export unless the user explicitly requests “include guides.”

### A.8 Custom FabricTextOnPath rendering

Implement `FabricTextOnPath` as a custom `FabricObject` or a carefully isolated subclass of `Fabric.Text`. It should own the source string and typography properties, but render glyphs along the flattened path in `_render(ctx)`.

The render pipeline is:

1. Resolve the linked guide path by ID from a path registry. If the path is missing, render the text in a visible error state and add an export warning; never silently place it at the origin.
2. Convert the Fabric path commands into a flattened polyline/arc-length table. Each sample stores `{ distance, x, y, tangentAngle }`. Cache this table by `pathId + pathGeometryVersion`.
3. Use the browser canvas context or Fabric's text measurement logic to measure each grapheme cluster, not each UTF-16 code unit. This avoids breaking emoji, combining marks, and some Myanmar text sequences.
4. Add letter spacing after each measured glyph according to the documented unit conversion. For Fabric-style `charSpacing`, use the same conversion as the selected font renderer and keep it in the mark so re-rendering is deterministic.
5. Compute total line width. For `left`, begin at `startOffset`; for `center`, begin at `startOffset - width / 2`; for `right`, begin at `startOffset - width`. Clamp or warn if the text exceeds `pathStart/pathEnd`.
6. For each glyph, find the midpoint distance on the path, interpolate its point and tangent, and calculate the baseline position using `baselineOffset` along the path normal.
7. Save the context, translate to the glyph point, rotate by tangent angle, flip by 180 degrees for reverse side, and draw the glyph at its local baseline. Restore the context for the next glyph.
8. Apply Fabric fill, stroke, opacity, shadow, and blend properties consistently. Effects that depend on a single continuous text outline may require a raster/vector export fallback warning.
9. Render a selection outline and path guide only when selected. These are transient overlays and must never become part of the exported artwork.

A simplified renderer shape is:

```ts
_render(ctx: CanvasRenderingContext2D) {
  const layout = this.getGlyphLayout();
  ctx.save();
  applyFabricPaint(ctx, this);
  for (const glyph of layout) {
    ctx.save();
    ctx.translate(glyph.x, glyph.y + glyph.normalX * this.baselineOffset);
    ctx.rotate(glyph.angle + (this.side === "reverse" ? Math.PI : 0));
    drawGlyph(ctx, glyph.text, -glyph.width / 2, 0, this.keepUpright, this.side);
    ctx.restore();
  }
  ctx.restore();
}
```

The real implementation must account for the font's ascent/descent, italic overhang, stroke width, shadow padding, retina scaling, and the text object's own transform. The guide path is evaluated in document space first; the Fabric object's transform is applied after the glyph positions are calculated. This makes moving, rotating, and scaling the whole text-on-path object predictable.

### A.9 Text on Path editing behavior

The user experience should have two modes:

- **Text edit mode:** double-click the text; show an HTML/Fabric text editor or a hidden `IText` proxy for caret, selection, IME, and keyboard input. The proxy is not the visual export object. Changes update `TextOnPathMark.text` and invalidate glyph layout.
- **Path edit mode:** select the guide path with Path Select/Direct Path Edit; the text follows the path in real time. Anchor edits are one history transaction on pointer-up, and the linked text remains selected as a dependent preview if the user enabled that option.

The right panel must expose text, font, weight, size, fill, stroke, letter spacing, alignment, start offset, baseline offset, normal/reverse side, and keep-upright. Add handles on the guide path for:

- start offset;
- center/anchor position;
- baseline offset;
- path end clamp;
- reverse direction.

Dragging a start-offset handle changes only `startOffset`, not the path or text transform. Dragging the baseline handle changes only `baselineOffset`. Moving the whole selected text object changes its object transform and keeps the text-to-path relationship intact. Moving the guide path changes the path and therefore moves the text, but the text object's own transform remains unchanged.

For circular or closed paths, normalize distances modulo total path length. For open paths, clamp to the available path range and show an overflow warning. A `keepUpright` option should flip glyphs when the tangent would make text upside down; the user can disable it for artistic reverse lettering.

Do not silently support multiline Text on Path in the first version. Either convert line breaks into a new separate path-linked text object or reject them with a clear message. A later version can support multiple baselines using one path per line or an offset curve.

### A.10 Text on Path persistence and serialization

A Text on Path draft must serialize the text and guide path independently:

```ts
{
  id: "text-path-123",
  kind: "TextOnPath",
  text: "MH FASHION",
  pathId: "path-456",
  fontFamily: "Arial",
  fontSize: 32,
  charSpacing: 0,
  startOffset: 12,
  baselineOffset: 0,
  alignment: "center",
  side: "normal",
  pathStart: 0,
  keepUpright: true,
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  angle: 0
}
```

On restore, load all paths before dependent Text on Path objects, build the path registry, then create text objects. If a path is missing, retain the text mark and its `pathId`, render a non-printing missing-path badge, and block production export until the user repairs or removes the link. Draft migration must preserve ordinary `Text` marks as ordinary text; never reinterpret an old text mark as Text on Path because its name contains “path.”

Fabric's own `toObject()` may be used for debugging or a temporary browser draft, but the canonical MH Fashion serializer must explicitly include `pathId`, typography, offsets, side, and link metadata. Transient guide overlays, HTML editing proxies, and cached glyph tables must be excluded.

### A.11 Text on Path undo/redo transactions

Use separate command types so history descriptions are meaningful:

- `text-path-create`: text and guide path created together;
- `text-path-edit-text`: source string changed;
- `text-path-edit-style`: font, size, fill, stroke, spacing, or alignment changed;
- `text-path-move-offset`: start/baseline offset changed;
- `path-modified`: guide geometry changed and dependent text reflowed;
- `text-path-unlink`: text converted to ordinary text at its current visual placement;
- `text-path-delete`: linked text or guide deleted with a recoverable relationship record.

Typing should coalesce into one command after a short idle period. Dragging a path or offset handle should commit once on pointer-up. Undoing a path edit restores the path geometry and automatically re-renders every dependent text mark. Deleting a guide path must not silently delete text; offer “unlink and keep text,” “delete linked text,” or “cancel.”

### A.12 Text on Path export logic

For SVG export, generate a standards-compliant `<path>` and `<textPath>` only when the export renderer can preserve the selected font, direction, baseline offset, and effects. Otherwise, convert the glyph layout to vector outlines or a high-resolution raster fallback according to the print method, and record the conversion in `warnings.json`.

For PNG/mockup export, render the same glyph layout used by the Fabric preview onto an offscreen canvas at the requested export scale. Do not screenshot the browser canvas at its current zoom. The export renderer must use document dimensions and export scale, then apply the mockup mapping separately.

A clean production export must never include the editing guide path, selection controls, start-offset handles, missing-path badge, or text editing proxy. If the guide is intentionally part of the artwork, the user must duplicate/convert it to an ordinary visible path layer first.

### A.13 Fabric performance rules

- Cache flattened path samples and invalidate them only when the guide path geometry, scale, or relevant transform changes.
- Do not create a Fabric object per glyph for normal editing; use one custom Text on Path object.
- Render guides and measurement labels as transient objects in a separate overlay collection.
- Batch `requestRenderAll()` through `requestAnimationFrame` during pointer moves.
- Avoid calling `canvas.loadFromJSON()` for every React state update; update existing objects in place when IDs and kinds match.
- Use `object.setCoords()` after transform changes and before hit-testing or selection bounds are read.
- Keep `callbacksRef.current` current, as in the current prototype, so Fabric listeners do not close over stale React state.
- Mark linked dependents dirty when a path changes, but recalculate their layout lazily if they are outside the viewport.
- Add a maximum text length/path sample budget and show a non-destructive warning for unusually large designs.

### A.14 Implementation test matrix

The Move tool tests must cover single object movement, multi-selection, group movement, locked object rejection, locked ancestor rejection, Auto-select Layer/Group, Alt duplication, Shift axis constraint, Ctrl/Cmd snap bypass, arrow nudges, undo/redo, pointer cancellation, zoom 25/100/400%, rotated viewport, hidden layers, and Front/Back isolation.

Text on Path tests must cover creation from an open path, creation from a closed path, left/center/right alignment, start and baseline offsets, reverse side, keep-upright behavior, font/size/spacing changes, Unicode grapheme clusters, text editing through the IME proxy, path anchor movement, path deletion/unlink, missing path restore, undo/redo, SVG export, PNG export, mockup export, and exclusion of guide/selection overlays.

A visual regression fixture should render the same document at 25%, 100%, 400%, 1x export, and 4x export. The glyph positions and object transforms should remain identical in document coordinates. A serialization round-trip test must compare the canonical `CanvasMark`/`EditorLayer` state before and after Fabric reconstruction, not merely compare screenshots.

### A.15 Recommended implementation order

1. Extract transform conversion and edit-permission helpers from `FabricDesignCanvas.tsx`.
2. Add a `useFabricEditorController` or equivalent controller module for gesture transactions, selection synchronization, and history boundaries.
3. Finish Move tool snapping, exact fields, duplicate-on-drag, keyboard nudging, and transaction guards.
4. Add explicit `kind: "TextOnPath"` and `pathId` to the canonical mark schema and add migration tests.
5. Implement path flattening, glyph layout, and a custom Text on Path renderer with a hidden `IText` editing proxy.
6. Add offset/path handles, path dependency invalidation, serialization, and undo/redo commands.
7. Add SVG/PNG export parity and missing-path/export warning behavior.
8. Add performance and visual regression tests before enabling the feature for production users.

Until steps 4–7 are complete, the editor should label Text on Path as experimental and should not promise editable text-on-path production export. Until steps 1–3 are complete, Move should remain the only default selection tool and numeric transform edits should continue to use the existing guarded application-state path.


---

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
  Text, Effects, AI) with a Photoshop-style selectable Tools Palette (Move,
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

- [x] Canva-inspired Elements library for `/create`
  - Browse original SVG graphics by category and search by names or tags.
  - Choose a color, click a graphic to add it centered on the active canvas, or drag it onto a placement point.
  - Added graphics become individual editable layers and remain in the browser-local draft.
  - Keep the local manifest and SVGs under `apps/web/public/elements/v1/`; include future R2 keys in the manifest, but do not connect, create, expose, or upload to R2 until requested.
  - Evidence: 25 original SVG catalog items are present; manifest paths and future R2 keys match; all SVGs parse; category/search, color, click, canvas-drop and Recent flows are implemented; production build passes.
- [ ] Future R2 migration (explicitly deferred)
  - Later move `elements/v1/manifest.json` and `elements/v1/{slug}.svg` to the private `mh-fashion-assets` bucket and serve them through same-origin editor API routes.

## Canva-style Text tools

Source of scope: `Plan/PLAN.md#project-plan` section 6.

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

Source of scope: `Plan/PLAN.md#project-plan` section 6 and the `/create` toolbar.

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

- [historical; superseded by §6 owner-specified fixed print canvas] The prior editor iteration used a white artboard and an optional transparency grid. The current blank preview uses a transparent canvas buffer with a presentation-only checkerboard.
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
