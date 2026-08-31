# MH Fashion — Architecture & Spec

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
