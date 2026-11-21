# R2 storage — what to put in the bucket and how

MH Fashion serves product mockups, design files and post artwork from one Cloudflare R2
bucket. This is the contract the code already expects; follow it and nothing has to change in
the app.

- Bucket: **`mh-fashion-assets`**
- Public origin (no trailing slash): `NEXT_PUBLIC_R2_PUBLIC_URL`, e.g.
  `https://assets.mhfashionmm.com` or the `https://pub-<hash>.r2.dev` URL
- Everything is public-read. Writes happen from the dashboard, the CLI, or a Worker binding.

## 1. Create the bucket

Dashboard → R2 → **Create bucket** → name `mh-fashion-assets` → location *Automatic*.

CLI equivalent:

```bash
npx wrangler r2 bucket create mh-fashion-assets
```

## 2. Make it readable by the site

Pick one:

- **Custom domain (recommended)** — R2 → bucket → Settings → Custom domains → add
  `assets.mhfashionmm.com`. Cloudflare adds the DNS record for you.
- **Public dev URL** — R2 → bucket → Settings → Public access → *r2.dev subdomain* → allow.
  Fine for testing, rate limited, do not use for production traffic.

Then set the origin on the Worker:

```bash
# Cloudflare dashboard → Workers → mhfashion → Settings → Variables
NEXT_PUBLIC_R2_PUBLIC_URL = https://assets.mhfashionmm.com
```

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy after changing it.

## 3. Folder layout

```
mh-fashion-assets/
├── mockups/<product-slug>/<look>.<webp|png|jpg>     ← product photos per colour/fit/sleeve
├── designs/<design-slug>.svg                        ← design library source files
├── posts/<post-slug>.svg                            ← T-shirt post artwork
└── orders/<order-id>/<file>.svg                     ← copies of what the press received
```

### 3.1 Mockups — `mockups/<product-slug>/<look>.webp`

`<look>` is built from the colour, the fit and the sleeve; **size is deliberately left out**
(the same photo covers M and XL). The app looks for the most specific name first and falls
back step by step, so you only upload what differs:

| Selection | Files tried, in order |
|---|---|
| Black · Oversized · Short Sleeve | `black-oversized-short-sleeve`, `black-oversized`, `black-short-sleeve`, `black`, `default` |
| Black · Oversized (no sleeve chosen) | `black-oversized`, `black`, `default` |
| Colour not chosen | `oversized-short-sleeve`, `oversized`, `short-sleeve`, `default` |

Naming rules (from `mockupSegment()` in `apps/web/src/lib/product-mockup.ts`):

- lowercase, spaces and symbols collapse to `-`, leading/trailing `-` stripped
- extensions are tried in this order: `webp`, `png`, `jpg`
- the slug is the catalogue `slug`, e.g. `chaos-theory`

Example:

```
mockups/chaos-theory/default.webp
mockups/chaos-theory/black.webp
mockups/chaos-theory/black-oversized-short-sleeve.webp
mockups/chaos-theory/white-oversized-short-sleeve.webp
mockups/chaos-theory/green.webp
mockups/hoodie-x/default.webp
```

Photo spec:

- portrait **4:5** (e.g. 1200 × 1500 px), WebP, ≤ 200 KB
- garment flat and centred, plain light background
- the printable area sits at **30% from the left, 22% from the top, 40% wide, 46% tall**
  (`PRODUCT_PRINT_AREA`) — keep the chest inside that band or the artwork will land off-garment

### 3.2 Designs — `designs/<design-slug>.svg`

- one SVG per design, artwork space 1000 × 1200 units
- each element must be its own `<g id="...">` so the editor can list it as a layer
- no external fonts or images: convert text to paths or embed the font
- file name = design slug (`street-wave.svg`)

### 3.3 Posts — `posts/<post-slug>.svg`

- the SVG the admin uploads on `/admin/posts`; today it is stored inline as a data URL in the
  browser, and moves here when the upload is wired
- ≤ 2 MB (`MAX_POST_SVG_BYTES`)

### 3.4 Orders — `orders/<order-id>/...`

Optional server-side copy of the "Print files ZIP" contents, so a job survives a browser
reset: `<order-id>/<design-file>.svg`, `<design-file>-mockup.svg`, `manifest.json`.

## 4. Uploading files

### Dashboard (a few files)

R2 → `mh-fashion-assets` → **Upload** → drag the folders in. Keep the folder names exact.

### CLI (single file)

```bash
npx wrangler r2 object put "mh-fashion-assets/mockups/chaos-theory/black.webp" \
  --file ./assets/mockups/chaos-theory/black.webp --content-type image/webp
```

### Bulk sync

```bash
# with rclone (configure an S3 remote for R2 first)
rclone sync ./assets r2:mh-fashion-assets --progress

# or with the AWS CLI
aws s3 sync ./assets s3://mh-fashion-assets \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

`assets/` mirrors the layout above, so `assets/mockups/chaos-theory/black.webp` lands in
`mockups/chaos-theory/black.webp`.

## 5. Check it

```bash
curl -I https://assets.mhfashionmm.com/mockups/chaos-theory/black.webp
# expect: HTTP/2 200, content-type: image/webp
```

Then open a product page: the mockup should switch with the colour, and a missing file should
fall back to `default` and finally to the catalogue image instead of showing a broken image.

## 6. Server-side uploads (later)

When the editor or the checkout needs to write files, add a binding instead of exposing keys:

```jsonc
// apps/web/wrangler.jsonc
"r2_buckets": [
  { "binding": "MH_FASHION_ASSETS", "bucket_name": "mh-fashion-assets" }
]
```

A Worker route can then `env.MH_FASHION_ASSETS.put(key, body)`. Only fall back to the S3 API
with `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` if you need a tool outside Cloudflare.

## 7. CORS (only if the browser uploads directly)

If the admin uploads straight to R2 with a presigned URL, allow the site origin:

```json
[
  {
    "AllowedOrigins": ["https://mhfashion.mhfashionmm.workers.dev"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply it in R2 → bucket → Settings → CORS policy (or `npx wrangler r2 bucket cors put`).
