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
- Tools palette: Move, Marquee, Lasso, Magic Wand, Eyedropper, Shape, Pen,
  Path Select, Clone Stamp/Healing Brush, Gradient, Eraser, Ruler, Rotate View,
  Hand, Zoom. More tools will be added over time.
- Layers: blend mode + opacity + flow in one row, per-layer lock, new /
  duplicate / merge / layer mask / clipping mask / effects.
- Editable units are Layer and Group only. Flat layers move/rotate/scale but
  keep their color. Nested layers allow per-group recolor via swatches.
- Layer type (text vs element) is decided by whether the layer name contains
  "text".
- Clicking a canvas scopes the layers panel to that side and shows a small
  mockup preview under it.
- Original admin SVGs are immutable; "Edit Design" creates the user's own copy.
- Element panel shows raster thumbnails only (never raw SVG); the actual SVG is
  served through an authenticated endpoint at insert time.
- Mockup attach: Front placement copies proportionally to Back only when the
  print-area types match. Color changes apply to Front and Back together.
- Buy Now / Add to Cart stay disabled until the mockup is attached.
- Save: default limit 3 designs (admin-configurable); saved only after the full
  flow completes; reusing artwork on another product counts separately.
- Brushes: one grayscale PNG per brush (used for strokes and thumbnail) in R2.
- AI: Remove Background and Upscale (Hugging Face) work only on user-uploaded
  photos and live in the top contextual toolbar. Image generation is later.
- Terms acceptance on first use; watermark; right-click disabled.
- User photo upload and AI upscale are built behind feature flags (off by
  default) so Phase 2 only flips the flags.

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
products/categories/{slug}.png, products/banners/{id}.png
uploads/{user_id}/{upload_id}/original.jpg, upscaled.jpg
```

Naming: lowercase, hyphens; UUIDs for system-generated assets, slugs for
catalog-facing items.

## 13. Open / Deferred

- MH Sport template organization (provisional: "Template Category" tags).
- Exact print-area canvas sizes (T-shirt ≈ 30×40 cm placeholder; Cup, Bag,
  Pillow, Phone Cover are rough placeholders).
- Pillow and Sling Bag attributes and mockups.
- Payment gateway API details; DHL integration (waiting on DHL).
- Legal page content (Myanmar-specific clauses).
- Further editor tools and layer-panel features; further admin permissions.
- Refund request flow; mobile app scope; email provider.

## 14. Build Status

**Done and live** (mhfashion.mhfashionmm.workers.dev):
scaffold and Cloudflare deploy, Supabase schema (migrations 0001–0004), homepage
with live product data, sticky header, mobile drawer, footer, dark/light and
Ks/$ toggles, notification dropdown, category marquee.

**Built, using placeholder data:** Editor page (`/create`), Account page
(`/account`).

**Next:** Auth (email / Google / Facebook), product detail page, replace
placeholders with Supabase data, cart and checkout.

---

## Change Log

- Initial consolidated plan created from the planning conversation.
- Editor page now shows the site Header bar at the top; removed it from "Next".
