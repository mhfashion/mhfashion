# MH Fashion — Project Plan

Print-on-demand platform (web app first, mobile app later). This is the single
source of truth for scope and decisions. It supersedes the early draft in
`docs/architecture.md`.

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

### 4.6 Product detail presentation

- Use the full available page width with minimal side gutters; do not constrain the
  page to a narrow centered column or leave broad empty margins.
- Keep the desktop product gallery compact (about 280px at tablet widths and
  capped near 360px on desktop); let purchase details use the remaining width.
  Stack the regions on small screens, with the image fitting the viewport width.
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

**Standalone editor plan:** [`docs/EDITOR_PLAN.md`](./EDITOR_PLAN.md). This is
the canonical, independently maintained editor document. Keep the full editor
specification, Fabric.js implementation logic, future updates, milestones, and
acceptance criteria there; this product plan keeps only this short reference so
the two plans do not drift or become unnecessarily duplicated. These are planned
capabilities, not a claim that all of them are already implemented.

- Layout: left rail (Upload, Elements, Text, Effects, AI) with the tools
  palette stacked below it; Canva-style flyout panel on click; layers panel on
  the right; Front and Back canvases side by side (transparent background);
  attribute bar along the bottom.
- Top bar: Undo/Redo, live price, Save / Add to Cart / Buy Now.
- Drawing workspace (owner-requested Canva-inspired pass): keep the work area
  light and the artboard white regardless of site theme, with the transparency
  grid optional and off by default. The selection bar becomes contextual: text
  exposes font/size/color/emphasis/alignment, shapes expose geometry/fill, and
  selected artwork exposes duplicate/delete actions.
- Canvas engine (current prototype): Fabric.js 7.4.0 renders browser-side editable
  objects with selection, move, scale, rotate, in-place text editing, zoom, and
  hand-pan. The Pen tool now draws vector paths. Transform and path edits are
  stored as object data and enter Undo/Redo and browser-local Save/restore.
- Canvas tools (implemented in this prototype): Move, Marquee, Lasso, Magic Wand,
  Eyedropper, Shape, Pen, Path Select, Clone Stamp, Gradient, Eraser, Ruler,
  Rotate View, Hand, and Zoom are all active. Marquee uses rectangular multi-select;
  Lasso selects object centers within a freeform outline; Magic Wand selects
  vector/text objects by sampled fill-color tolerance and explicitly reports a
  whole-image selection on raster artwork (not matching pixel ranges). Path Select
  selects/transforms a complete Pen path; anchor-node editing remains later. Shape
  drag creates the chosen vector geometry; Pen draws configurable editable strokes;
  Gradient creates editable fills for text/vector objects or a gradient rectangle.
  Clone Stamp duplicates unlocked objects and respects inherited group locks;
  Eraser removes artwork while keeping its layer available, not individual pixels;
  Eyedropper samples rendered canvas
  color. Ruler reports pixel distance/angle without saving its overlay. Rotate View
  changes only the viewport; Hand pans; Zoom click/Shift-click adjusts scale and
  Reset View restores orientation/zoom. These are usable object-level editor tools,
  not a claim of Photoshop's pixel/retouch engine.
- Layers (current `/create` prototype): a Photoshop-inspired stack with type-aware
  thumbnails, selection, inline rename, show/hide, lock/unlock, create/duplicate,
  sibling reorder, drag/drop reorder, and drop into a folder group. Groups expand
  and collapse; grouping/reordering, visibility, locking, and deletion are part
  of Undo/Redo. Blend mode, opacity, flow, and effect toggles are stored per
  layer. Blend modes include Normal, Multiply, Screen, Overlay, Darken, Lighten,
  Color Dodge/Burn, Hard/Soft Light, Difference, Exclusion, Hue, Saturation,
  Color, Luminosity, and Linear Dodge (Add); opacity can be set by slider or a
  numeric 0–100% field. New groups default to Pass Through, so child layers keep
  blending individually; choosing another group mode composites the group once
  before blending it with the rest of the canvas. Fill is available only for
  individual layers and is separate from overall opacity. The right-side Layers
  Box is mounted at editor load, including before any layer is selected. Its
  blend/Opacity and Lock/Fill rows keep fixed positions; without an eligible
  selection they show neutral defaults and remain disabled. Selecting a layer
  changes values only: it must not insert/expand these rows or open a popover.
  Opacity/Fill sliders open only through their explicit chevrons and close when
  selection changes; the advanced properties accordion stays closed until the
  user opens it. Layer visibility is placed before each thumbnail. Locking
  is still a single all-or-nothing toggle; Photoshop's separate transparent-
  pixel, image-pixel, position, and all-lock modes are not yet implemented. Adobe
  documents the blend menu at the top and Fill below Opacity; see [Set layer
  opacity and blending modes](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/apply-layer-effects/set-layer-opacity-and-blending-modes.html)
  and [Work with the Layers panel](https://helpx.adobe.com/photoshop/desktop/create-manage-layers/get-started-layers/work-with-the-layers-panel.html).
  Fill scales text/shape/path color alpha and raster image alpha;
  advanced Photoshop layer-style interactions are still approximate. Shadow,
  stroke, and glow are simplified canvas effects; blur and sharpen apply to
  raster images. Clipping masks use the nearest unclipped lower sibling's alpha;
  uniform mask strength remains a preview rather than a paintable mask. Photoshop's
  Blend If, channel controls, and full layer-style dialog are not implemented.
- Drawing on a new layer: the first single-object insertion (freehand Pen,
  canvas Shape/Gradient, single text, image, or Elements content) reuses the selected
  unlocked, empty, non-group layer's ID and keeps its existing layer settings.
  Creating a blank layer selects it and prompts the user to choose Pen, Shape,
  or Gradient. A locked target or locked ancestor rejects the edit with a message. Eraser
  removes that layer's artwork but leaves the layer itself available as an empty
  target; the Layers delete action removes the layer node. The current object
  model still places each subsequent independent object on its own layer.
- Text tools (`/create`): add heading, subheading, and body text; browse/search
  fonts by style category; insert typography presets and paired font-combination
  designs as grouped, individually editable text layers. Selected text exposes
  font family, size, color, weight, italic, underline, alignment, and spacing
  controls. Text objects participate in Undo/Redo, transform controls, in-place
  editing, and browser-local drafts. The prototype uses browser/system fonts only;
  custom font files are not bundled before the font licensing and R2 phase.
- Product browser removal: at the owner's request, `/create` no longer has a
  Products sidebar panel or fetches/selects a catalog product from that panel.
  Storefront product pages/catalog and the editor's bottom Product attribute
  selector remain unchanged. Drafts containing a former catalog name that is not
  a valid Product attribute option restore with the default product type.
- Text catalog data lives in local versioned manifests at
  `apps/web/public/fonts/v1/manifest.json` and
  `apps/web/public/text-styles/v1/manifest.json`, with future R2 keys recorded.
  No font or text-style asset is uploaded to R2 in this stage.
- Text and Elements panels insert text plus colored rectangle, circle, triangle,
  or star objects on the active side. Each inserted object gets its own layer and
  participates in Undo/Redo and the browser-local draft. Objects can be dragged,
  resized, and rotated with Fabric controls. Node-level vector path editing
  remains pending.
- Elements library (`/create` prototype): browse a catalog of original SVG
  graphics by category, search names/tags, choose a color, click an asset to add
  it centered on the active canvas, or drag it from the library onto a placement
  point. The local catalog manifest and files live at
  `apps/web/public/elements/v1/`; inserted vectors become editable image layers
  and are embedded in the browser-local draft. This first stage is local only.
  R2 connection and uploads are explicitly deferred; no R2 bucket or binding is
  created in this stage.
- Production layer work remains: real pixel merge, paintable per-pixel masks,
  group transforms/recolor, and full vector/raster editing require further
  implementation on top of the Fabric.js canvas engine. Clipping masks now use
  the nearest unclipped lower sibling's alpha. Embedded raster Smart Objects
  retain source image data and transform metadata, support Replace Contents with
  transforms preserved, Reset Transform, and Rasterize. Editing Smart Object
  contents in a separate document, linked Smart Objects, vectors/multi-layer
  Smart Object contents, and Photoshop Smart Filters are not implemented.
- Editable units are Layer and Group only. Flat layers move/rotate/scale but
  keep their color. Nested layers allow per-group recolor via swatches.
- Layer type (text vs element) is decided by whether the layer name contains
  "text".
- Clicking a canvas scopes the layers panel to that side and shows a small
  mockup preview under it.
- Original admin SVGs are immutable; "Edit Design" creates the user's own copy.
- Planned R2 asset contract for the Elements catalog: `elements/v1/manifest.json`
  plus `elements/v1/{slug}.svg` objects in the future `mh-fashion-assets` bucket;
  keep the bucket private and serve through same-origin Worker routes
  `GET /api/editor/elements` and `GET /api/editor/elements/{slug}`. The local
  asset paths and manifest mirror this key layout. Do not add credentials,
  bindings, public-bucket access, or uploads until the R2 phase is requested.
- Mockup attach: Front placement copies proportionally to Back only when the
  print-area types match. Color changes apply to Front and Back together.
- Buy Now / Add to Cart stay disabled until the mockup is attached.
- Production Save: default limit 3 designs (admin-configurable); saved to the
  user's account only after the full flow completes; reusing artwork on another
  product counts separately. The current prototype's Save stores a single draft
  in this browser's local storage and does not sync to an account.
- Brushes: one grayscale PNG per brush (used for strokes and thumbnail) in R2.
- AI: Remove Background and Upscale (Hugging Face) work only on user-uploaded
  photos and live in the top contextual toolbar. Image generation is later.
- Terms acceptance on first use; watermark; right-click disabled.
- The current `/create` prototype accepts user PNG/JPG/WebP photos locally,
  resizes them in the browser, and includes them in the browser draft. Upload to
  R2, account sync, Remove Background, and AI Upscale remain production/Phase 2
  work and must be gated/configured before public launch.

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

**Live in production** (mhfashion.mhfashionmm.workers.dev, currently serving the
pre-upgrade build described below): scaffold and Cloudflare deploy, the Supabase
schema migrations `0001`–`0007` (Guide content and Super Admin roles included;
whether each migration is applied is owner-managed), homepage with live product
data, sticky header, mobile drawer, footer, dark/light and Ks/$ toggles,
notification dropdown, category marquee, Guide listing and article pages, product
detail, and the cart page. Probed on 2026-11-12: `/`, `/new`, `/popular`,
`/collections`, `/mh-fashion`, `/nyein`, `/guide`, `/guide/how-apparel-options-narrow-down`,
`/products/butterfly-effect`, `/cart`, `/account`, `/create` and `/admin/login` return 200;
`/admin/register` returns 404.

**In `main`, not yet deployed:** the Next.js 16.4.6 / React 19.3.1 / Fabric.js
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
Space+left-drag pans the view without moving artwork, ordinary wheel/trackpad
scroll pans the view, and Alt/Option+wheel zooms the canvas. This follows the
documented Kittl canvas gestures and leaves other editor controls intact.

**Editor prototype (`/create`):** Fabric.js 7.4.0 canvas with selectable, movable,
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

**Still pending for a production editor:** additional tools and hardening,
editable mask painting/true clipping and pixel merge, group transforms/recolor,
node-level path editing, remaining tool implementations, server/account design
storage, production mockups, live price, Add to Cart, Buy Now, AI tools, and
editor-specific automated tests.

**Next:** Supabase Auth (email / Google / Facebook), replace the browser-local
admin demo session with real Super Admin authorization and server-side checks,
then checkout / payment / order creation on top of the existing cart, followed by
the R2 phase and the remaining editor production work.

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
- Detailed Editor Plan added (2026-11-12): created `docs/EDITOR_PLAN.md` and
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
- Mockup selection is intentionally deferred until the separate Mockup control is selected. Product selection remains a separate bottom attribute control. Attaching a mockup displays the selected mockup placement preview.
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
`docs/architecture.md` remains the early draft that section 1 says this plan
supersedes; it was not rewritten.

**Still open after this sync:** the Cloudflare repository secrets
(`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are not visible to Actions, so
no commit after `9cb5e21` is live; `docs/architecture.md` still describes the
pre-build architecture; and section 15.8 keeps the test counts from its own run
date rather than tracking the latest build.
