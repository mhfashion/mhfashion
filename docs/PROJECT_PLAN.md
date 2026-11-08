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
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Editor engine | Fabric.js (vector + raster hybrid) |
| Backend | Node.js (NestJS or Express — decided at implementation) |
| Database / Auth | Supabase (PostgreSQL) |
| Storage | Cloudflare R2 |
| Hosting | Cloudflare Workers via OpenNext adapter (flexible later) |
| AI | Hugging Face (Remove Background, Upscale); own GPU server via API (image generation, later) |
| Mobile (provisional) | React Native |
| Email (provisional) | Resend |

Fonts: woff2 for web, otf for the future mobile app.

## 3. Dev Workflow

- Claude writes all code (web + app); no Cursor.
- GitHub: `mhfashion/mhfashion`. Cloudflare builds from `main` automatically
  (root directory `apps/web`, build `npx opennextjs-cloudflare build`, deploy
  `npx wrangler deploy`).
- Supabase: Claude writes SQL migrations (`supabase/migrations/`); the owner
  runs them in the SQL Editor.
- Standalone Cloudflare Worker scripts are NOT committed to the repo; Claude
  hands over the code and the owner deploys it in Cloudflare.
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

- Layout: left rail (Upload, Elements, Text, Effects, AI) with the tools
  palette stacked below it; Canva-style flyout panel on click; layers panel on
  the right; Front and Back canvases side by side (transparent background);
  attribute bar along the bottom.
- Top bar: Undo/Redo, live price, Save / Add to Cart / Buy Now.
- Canvas engine (current prototype): Fabric.js 6 renders browser-side editable
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
  Account. The full footer is hidden on these sizes.
- **Homepage:** Hero (doubles as admin ad slot, falls back to the default
  banner) → Shop by Category (auto-scrolling marquee, loops seamlessly) → New
  Arrivals → Best Sellers → Shop by Collection → Footer.
- **Footer (desktop):** brand, Shop, Help, Legal, newsletter; Myanmar payment
  (KBZPay, Wave Pay, AYA Pay), app download links, international payment
  (Visa, Mastercard); copyright.
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
products/{product_id}/card.webp (planned product image; metadata remains in Supabase)
products/categories/{slug}.png, products/banners/{id}.png
uploads/{user_id}/{upload_id}/original.jpg, upscaled.jpg
```

Future private serving contract (not implemented): `GET /api/editor/fonts`,
`GET /api/editor/text-styles`, and allow-listed `GET /api/editor/assets/[...assetKey]`
to read font, preview, product-card, and mockup objects through an R2 binding.
The current `GET /api/editor/products` route reads catalog metadata and prices
from Supabase; it does not connect to or proxy R2.

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
  previews, and product/mockup assets remain deferred. The editor uses its local
  Elements catalog and browser/system font fallbacks; the storefront continues
  to use its existing Supabase product data. No bucket, binding, or R2 upload is
  part of this stage.
- Further editor tools and layer-panel features; further admin permissions.
- Refund request flow; mobile app scope; email provider.

## 14. Build Status

**Done and live** (mhfashion.mhfashionmm.workers.dev):
scaffold and Cloudflare deploy, Supabase schema (migrations 0001–0004), homepage
with live product data, sticky header, mobile drawer, footer, dark/light and
Ks/$ toggles, notification dropdown, category marquee.

**Editor prototype (`/create`):** Fabric.js canvas with selectable, movable,
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
  pages remain available, while product assets and fonts stay outside R2 until
  that phase is requested.

**Built, using placeholder data:** Account page (`/account`).

**Still pending for a production editor:** additional tools and hardening,
editable mask painting/true clipping and pixel merge, group transforms/recolor,
node-level path editing, remaining tool implementations, server/account design
storage, production mockups, live price, Add to Cart, Buy Now, AI tools, and
editor-specific automated tests.

**Next:** Auth (email / Google / Facebook), product detail page, replace
placeholders with Supabase data, cart and checkout.

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
