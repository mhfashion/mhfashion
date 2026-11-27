# R2 storage — what to put in the bucket and how

> **Plan in progress (2026-11-24):** this document describes the public bucket `mh-fashion-assets`. Customer and order files will
> live in a second, private bucket, `mh-fashion-private`, because R2 makes a bucket public as a whole. The full prefix list,
> key rules, retention and backups are in `Plan/PLAN.md` section 12.2. Do not put anything about a customer or an order in the
> public bucket.
>
> **Added 2026-11-21:** the editor's Photos and Patterns libraries (`photos/<slug>/`, `patterns/<slug>/`) and a customer's files under
> `users/<account-uuid>/` (private bucket) are built and checked: `npm run assets:check -- <folder>` now reads a photo's licence and a
> pattern's SVG, and the two sections below (3.5 and 3.6) say exactly what to upload. A photo is only offered in the editor once its
> licence document is in `mh-fashion-private` under `licences/photos/<slug>/`.

MH Fashion serves product mockups, design files and post artwork from Cloudflare R2. This is the
contract the code already expects; follow it and nothing has to change in the app. The catalogue
snapshots (`catalog/*.json`) are **not** in this bucket: they are written to `mh-fashion-private`,
because their `issues` list names what is broken.

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
├── mockups/
│   ├── product/<product-slug>/<look>.<webp|png|jpg>   ← catalogue photos (product page, cards)
│   ├── editor/<garment-slug>/<look>.<webp|png|jpg>    ← editor panel photos (square, flat)
│   └── 3d/<product-slug>/<look>.<webp|png|jpg>        ← 3D renders (reserved, see 3.1d)
├── models/<product-slug>.glb                          ← 3D garment models
├── fonts/
│   ├── manifest.json                                  ← the font list the editor reads (3.2b)
│   └── <font-slug>/<style>.woff2                      ← one file per weight and style
├── designs/<design-slug>/design.svg                   ← design library artwork
├── designs/<design-slug>/meta.json                    ← its name, shelf and files (3.2)
├── photos/<photo-slug>/photo.<webp|png|jpg>           ← the editor's Photos section (3.5)
├── photos/<photo-slug>/thumb.webp                     ← the grid thumbnail, ≤ 512 px
├── photos/<photo-slug>/meta.json                      ← name, size, tags and licence (3.5)
├── patterns/<pattern-slug>/pattern.svg                ← the editor's Patterns section (3.6)
├── patterns/<pattern-slug>/meta.json                  ← name, ink and tags (3.6)
└── posts/<post-slug>.svg                              ← T-shirt post artwork
```

The two mockup sets are separate on purpose: the catalogue shows a styled 4:5 photo, the editor
panel shows one flat, straight-on garment in a square. Uploading a catalogue photo into the
editor folder (or the other way round) makes the garment sit at the wrong scale.

### 3.1 Catalogue mockups — `mockups/product/<product-slug>/<look>.webp`

`<product-slug>` is the catalogue slug (`chaos-theory`). `<look>` is the colour plus whatever
changes the silhouette — fit and sleeve. **Size is deliberately left out** (the photo of a black
oversized tee is the same for M and XL), so you only upload what actually differs. The lookup
walks from the most specific name down to `default`:

| Selection | Files tried, in order |
|---|---|
| Black · Oversized · Short Sleeve | `black-oversized-short-sleeve`, `black-oversized`, `black-short-sleeve`, `black`, `default` |
| Black · Oversized (no sleeve chosen) | `black-oversized`, `black`, `default` |
| Colour not chosen | `oversized-short-sleeve`, `oversized`, `short-sleeve`, `default` |

Naming rules (from `mockupSegment()` in `apps/web/src/lib/product-mockup.ts`):

- lowercase, spaces and symbols collapse to `-`, leading/trailing `-` stripped
- extensions are tried in this order: `webp`, `png`, `jpg`

Photo spec: portrait **4:5** (1200 × 1500), WebP ≤ 200 KB, garment flat and centred on a plain
light background, printable chest inside **30% left / 22% top / 40% wide / 46% tall**
(`PRODUCT_PRINT_AREA`).

### 3.1b Editor mockups — `mockups/editor/<garment-slug>/<look>.webp`

`<garment-slug>` is the **garment the editor is working on**, not a catalogue design: `t-shirt`,
`phone`. `<look>` is the colour plus the fabric weight, because GSM changes the drape:

| Editor state | Files tried, in order |
|---|---|
| Black · 180 GSM | `black-180-gsm`, `black`, `180-gsm`, `default` |
| White, GSM not chosen | `white`, `default` |
| Nothing chosen | `default` |

Photo spec: **square 1:1** (1200 × 1200), WebP ≤ 200 KB, one garment shot straight on, no model,
no props, even light, transparent or plain background. The print frame the editor draws sits in
the middle of the panel, so keep the chest clear there.

`editorMockupCandidates()` in `apps/web/src/lib/product-mockup.ts` builds these URLs; the editor
never falls back to the catalogue layout because a 4:5 photo does not fit a square panel.

### 3.1d 3D mockups — `mockups/3d/<product-slug>/<look>.webp` + `models/<product-slug>.glb`

The 3D viewer is not built yet, but the folders exist so the assets can be uploaded once and not
migrated later:

- `models/<product-slug>.glb` — one garment model per product, Y-up, metres, origin at the centre
  of the chest print area, ≤ 5 MB, Draco-compressed. This is the file the viewer loads.
- `mockups/3d/<product-slug>/<look>.webp` — a rendered still per colour, same `<look>` keys as the
  catalogue, used as the poster frame before the model finishes loading and for cards.
- The model carries a `PRINT_AREA` empty (or a named node `print-area`) so the viewer can project
  the design onto the chest without guessing coordinates.

`mockupCandidates(slug, selection, { set: "3d" })` already builds the render URLs; nothing else in
the app reads them yet.

### 3.1c Older flat layout

Photos uploaded before the split live at `mockups/<product-slug>/<look>.webp`. The catalogue
still tries that path after `mockups/product/...`, so nothing breaks — move the files into
`mockups/product/` when convenient. The editor does not read the flat layout.

### 3.2 Designs — `designs/<design-slug>/design.svg` + `meta.json`

The folder form is the only form the catalogue lists (`Plan/PLAN.md` §12.2.12 item 5). A design
saved as one file directly under `designs/` (`designs/street-wave.svg`) is reported as an issue by
the rebuild, so it shows up in the admin issues panel until it is moved.

```
designs/
  street-wave/
    design.svg
    meta.json
```

`meta.json` carries at least a `slug` and a `name`; anything else it holds is passed through to the
catalogue unchanged.

```json
{ "slug": "street-wave", "name": "Street Wave", "files": ["designs/street-wave/design.svg"] }
```

- one SVG per design, artwork space 1000 × 1200 units
- each element must be its own `<g id="...">` so the editor can list it as a layer
- no external fonts or images: convert text to paths or embed the font

### 3.2b Fonts — `fonts/manifest.json` + `fonts/<font-slug>/<style>.woff2`

The editor's font picker is driven by this manifest, so a font is added or removed by uploading
files, not by a code change (`apps/web/src/lib/editor-fonts.ts` reads it, and
`lib/editor-font-library.ts` loads only the fonts a design uses).

```
fonts/
  manifest.json
  padauk/regular.woff2
  padauk/bold.woff2
  grotesk/regular.woff2
```

```json
{
  "version": 1,
  "fonts": [
    {
      "slug": "padauk",
      "name": "Padauk",
      "shelf": "burmese",
      "scripts": ["myanmar", "latin"],
      "licence": { "name": "SIL Open Font License 1.1", "url": "https://scripts.sil.org/OFL" },
      "files": [
        { "weight": 400, "style": "normal", "file": "fonts/padauk/regular.woff2" },
        { "weight": 700, "style": "normal", "file": "fonts/padauk/bold.woff2" }
      ],
      "enabled": true
    }
  ]
}
```

Rules the editor enforces (a bad entry is skipped and named, never fatal — the same rule as
`brushes.json`):

| Field | Rule |
| --- | --- |
| `slug` | lowercase words joined by `-`; unique; also the folder name |
| `name` | what the picker shows and what a layer stores; unique, ≤ 60 characters |
| `shelf` | `sans`, `serif`, `display`, `script` or `burmese`; the picker lists them in that order |
| `scripts` | `latin`, `myanmar`, or both; defaults to `latin`. The file is declared with a `unicode-range` per script, so a large Myanmar font is only downloaded for Myanmar text |
| `files[].file` | **bucket-relative** `.woff2` path. Absolute URLs, `..` and other formats are refused |
| `files[].weight` | 100–900, integer, default 400 |
| `files[].style` | `normal` or `italic`, default `normal` |
| `files[].outline` | optional bucket-relative `.ttf` or `.otf` beside the woff2 (decision D14). The bend (E19) reads it, because HarfBuzz cannot shape a woff2. A weight without it simply cannot be bent; the letters still display. An absolute URL, `..` or any other extension is dropped |
| `licence` | required: `name` plus a `url`. A font without a licence is not shipped |
| `enabled` | `false` hides the font from the picker; designs already using it fall back |

- **Check before you upload:** `npm run assets:check -- path/to/bucket-copy` checks a folder that mirrors the
  bucket (fonts, designs, elements, brushes, text styles, mockups) against every rule in this document and in Plan
  §12.2: the key shape, the file type, the size limit, a duplicate and the `meta.json` fields. It exits 1 while
  something is wrong, so it can gate the upload. It reads the file's bytes, not its name, so a PNG renamed `.svg` and
  a brush tip larger than 512 px are both refused, and it names anything the Worker would strip from an SVG (a script,
  an `on*` attribute, an external reference). `npm run fonts:check -- path/to/fonts` does the font-only pass.
- **Font-only detail:** `npm run fonts:check -- path/to/fonts` reads a local copy of the folder
  with the editor's own parser and prints the picker order, every entry the editor would drop and its
  reason, any listed file that is not in the folder, and any file over 1 MB. It exits 1 while something
  is wrong, so it can gate the upload.
- **woff2 only.** It is the smallest and every current browser reads it; convert a `.ttf`/`.otf`
  before uploading (`fonttools`: `pyftsubset Font.ttf --flavor=woff2 --output-file=regular.woff2`).
- **The bend needs the `.ttf`/`.otf` too.** Keep the original next to the woff2 and name it in
  `outline`; the editor loads the woff2 to display and the `.ttf`/`.otf` only when a layer uses the
  bend, so a design without one downloads nothing extra. `npm run fonts:check` prints which fonts
  can be bent and fails when a named outline file is not in the folder. The asset service reports a
  missing outline as an issue and still lists the font, so a lost file costs the bend, not the font.
- **Replacing a font:** add the version to the file name (`regular-2.woff2`) and update the
  manifest, so a browser never serves a stale cached copy.
- **Only fonts in use are loaded.** A design that uses none of the manifest's fonts downloads
  nothing.
- **Burmese:** Unicode only. Zawgyi text is not supported and is not converted (owner decision,
  2026-11-22). Check the shaping of stacked consonants and medial signs on the canvas, the mockup
  and the print sheet before switching a font on.
- **CORS:** the font files are fetched by the page, so the bucket needs the site origin in its CORS
  rule (§7). Without it the browser refuses the font and the editor falls back to a system font.
- **Licence:** confirm commercial print use for each font before `enabled: true`.
- **Print:** the customer's download embeds the used fonts as base64 `@font-face` rules inside the SVG
  (`designExportFontCss`), so the PNG and the SVG both paint the chosen font without a network. The press
  bundle still has to do the same, or convert the text to outlines — open in Part II of `Plan/PLAN.md`, E17.

### 3.3 Posts — `posts/<post-slug>.svg`

- the SVG the admin uploads on `/admin/posts`; today it is stored inline as a data URL in the
  browser, and moves here when the upload is wired
- ≤ 2 MB (`MAX_POST_SVG_BYTES`)

### 3.4 Orders — `orders/<order-id>/...`

> **Moved:** order files belong in the private bucket `mh-fashion-private` (`Plan/PLAN.md` §12.2), never in the public one. Nothing is written to `orders/` in `mh-fashion-assets`.

Optional server-side copy of the "Print files ZIP" contents, so a job survives a browser
reset: `<order-id>/<design-file>.svg`, `<design-file>-mockup.svg`, `manifest.json`.

### 3.5 Photos — `photos/<photo-slug>/photo.<ext>` + `thumb.webp` + `meta.json`

The editor's Photos section lists these; a photo appears only when the folder is complete.

| File | What it is | Limits |
|---|---|---|
| `photo.<webp\|png\|jpg>` | the picture that lands on the canvas | 8 MB, 4000 px on the long side; PNG or a WebP with transparency only for a cut-out |
| `thumb.webp` | the small picture in the grid | 40 KB, 512 px |
| `meta.json` | the description below | 20 KB |

```json
{
  "slug": "yangon-street",
  "name": "Yangon street",
  "nameMy": "ရန်ကုန်လမ်း",
  "width": 1600,
  "height": 1200,
  "transparent": false,
  "tags": ["city", "street"],
  "aliases": ["downtown"],
  "licence": {
    "name": "Unsplash+",
    "source": "https://unsplash.com/licence",
    "commercialPrintAllowed": true,
    "credit": "Daw Mya"
  }
}
```

- `width` and `height` are the photo's own pixel size, in pixels. The canvas uses them to fit the
  photo and to warn about a low-resolution print, so they must be the real numbers.
- `licence.commercialPrintAllowed` must be `true`. A photo without it is listed as an issue and
  **not offered**, because the shop would be printing it without the right to.
- The licence document itself goes in the **private** bucket: `licences/photos/<slug>/<file>.pdf`.
  The rebuild checks for it; without it the photo is an issue.
- `thumb.webp` is what the grid loads; the full picture is only fetched when the photo is added.

### 3.6 Patterns — `patterns/<pattern-slug>/pattern.svg` + `meta.json`

One SVG that already covers the **1000 × 1200** artwork space, plus its description.

```json
{ "slug": "terrazzo", "name": "Terrazzo", "nameMy": "တာရာဇို", "ink": "light", "tags": ["stone"] }
```

- `ink` is `dark`, `light` or `color`, and it decides the card behind the thumbnail, so a light
  pattern is not lost on a white card.
- The editor paints a pattern as a shape layer, so the SVG may use `path`, `rect`, `circle`,
  `ellipse`, `line`, `polygon` and `polyline`, with a solid `fill` or a `stroke`, inside `<g>`
  groups whose `transform` is `translate`, `scale` or `matrix`. A gradient or pattern fill, a
  filter, an embedded `<image>`, text or a rotation cannot be a shape: flatten it first.
  `npm run assets:check` names every element that has to be flattened before the upload.

### 3.7 A customer's own files (private bucket `mh-fashion-private`)

Nothing here is uploaded by hand; the site writes it. The prefixes are listed so a support call can
find a file, and so the 24-hour rule is visible.

```
mh-fashion-private/
├── catalog/<kind>.json                        ← the eight catalogue snapshots (with their issues)
├── tmp/<account-uuid>/<upload-id>.<ext>       ← a photo that no saved design keeps yet (24 hours)
├── tmp/<account-uuid>/quota.json              ← the hourly upload counter
├── users/<account-uuid>/uploads/<upload-id>.<ext>   ← kept once a design that uses it is saved
├── users/<account-uuid>/designs/<design-id>/thumbnail.webp
├── orders/<order-id>/...                      ← the frozen copy of what the press receives
└── licences/<fonts|photos>/<slug>/<file>.pdf  ← proof of the right to use a font or a photo
```

A customer reads only `tmp/<their-uuid>/` and `users/<their-uuid>/`; an admin reads everything and
each admin read of a customer's file writes one audit line. The Worker's hourly pass deletes every
`tmp/` file older than 24 hours (a file it cannot date is kept and reported, never deleted blind).

## 4. Uploading files

### Dashboard (a few files)

R2 → `mh-fashion-assets` → **Upload** → drag the folders in. Keep the folder names exact.

### CLI (single file)

```bash
npx wrangler r2 object put "mh-fashion-assets/mockups/product/chaos-theory/black.webp" \
  --file ./assets/mockups/product/chaos-theory/black.webp --content-type image/webp

npx wrangler r2 object put "mh-fashion-assets/mockups/editor/t-shirt/black-180-gsm.webp" \
  --file ./assets/mockups/editor/t-shirt/black-180-gsm.webp --content-type image/webp
```

### Bulk sync

```bash
# with rclone (configure an S3 remote for R2 first)
rclone sync ./assets r2:mh-fashion-assets --progress

# or with the AWS CLI
aws s3 sync ./assets s3://mh-fashion-assets \
  --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

`assets/` mirrors the layout above, so `assets/mockups/product/chaos-theory/black.webp` lands in
`mockups/product/chaos-theory/black.webp`.

## 5. Check it

```bash
curl -I https://assets.mhfashionmm.com/mockups/product/chaos-theory/black.webp
curl -I https://assets.mhfashionmm.com/mockups/editor/t-shirt/default.webp
# expect: HTTP/2 200, content-type: image/webp
```

Then open a product page: the mockup should switch with the colour, and a missing file should
fall back to `default` and finally to the catalogue image instead of showing a broken image.

## 6. Server-side uploads

The code is written (Plan §12.1, §12.2.5); what is missing is the buckets and the bindings.

```jsonc
// apps/web/wrangler.jsonc — the site's own Worker
"r2_buckets": [
  { "binding": "MH_FASHION_ASSETS", "bucket_name": "mh-fashion-assets" },
  { "binding": "MH_FASHION_PRIVATE", "bucket_name": "mh-fashion-private" }
]
```

The assets service is its own Worker, `Worker/assets.ts`, configured by `wrangler.assets.jsonc` at the
repository root (both bindings, the queue, the hourly cron). Once the buckets exist and the
`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets are set, `.github/workflows/deploy-assets-worker.yml`
deploys it on a change to `Worker/**` or the shared libraries. Its routes:

| Route | Who | What |
|---|---|---|
| `GET /api/assets/<kind>`, `GET /api/assets/mockups/<slug>` | anyone | the catalogue JSON, with the site's CORS header |
| `GET /api/admin/assets/issues` | admin | the skipped entries and their reasons |
| `PUT /api/admin/assets` | admin | upload a file and its fields; the key is built, the bytes are checked, the catalogue rebuilds |
| `GET /api/private/<key>` | the file's owner, or an admin | a private file's bytes, `private, no-store` |

The site itself serves `POST /api/uploads` (a customer's photo, twenty an hour, `tmp/<user>/`) and
`POST /api/uploads/promote` (a saved design keeps the photos it uses). Orders are written once, at Buy, by
`lib/order-assets.ts`. Only fall back to the S3 API with `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` if you
need a tool outside Cloudflare; `.github/workflows/backup-assets.yml` uses it for the weekly copy.

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
