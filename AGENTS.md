# AGENTS.md

Repository memory for AI agents working on **mhfashion/mhfashion**.

## Where the editor docs live
- The editor plan is `Plan/EDITOR_PLAN.md`: what the code does, the contracts, the verified gaps, the
  next steps with acceptance, and the owner's decisions. It is written from the source.
- The behaviour documentation is `Doc/EDITOR.md`. These two files are the only editor plan and doc.
- `Plan/PLAN.md` §6 is a short summary with links — do not add editor detail there. Old anchors
  (`#unified-editor-vision`, `#editor-implementation-plan`, `#editor-plan-from-audit`) stay in
  `PLAN.md` as empty placeholders so existing links resolve.

## Stack
- Monorepo (`npm` workspaces). App lives in `apps/web`.
- Next.js 16 (App Router) + React 19, Fabric.js 7, Supabase, deployed as a Cloudflare Worker via OpenNext (`npm run cf:build --workspace=apps/web`).
- Node 22 (needed for the built-in `WebSocket` used by the CDP-based browser tests).

## Commands
- Build: `npm run build --workspace=apps/web`
- Type-check: `npx tsc -p apps/web/tsconfig.json --noEmit`
- Lint (run from the workspace, not the repo root): `cd apps/web && npx eslint <file>`
- Unit + spec tests: `node --test tests/*.test.cjs`
- Integration tests (`tests/guide-http.test.cjs`, `tests/editor-touch.cjs`) need a server first:
  `npm run start --workspace=apps/web -- --port 3000` then run the test file.
  `tests/editor-touch.cjs` reads `EDITOR_TEST_ORIGIN` (default `http://127.0.0.1:3000`).

## Testing notes
- `node --test tests/*.test.cjs` reports 460 tests, all passing when a server is running on port 3000. The `guide-http` tests fail with `ECONNREFUSED 127.0.0.1:3000` when no server is running — that is environmental, not a code failure. Start the server (above) and they pass.
- The upload section feeds a `DataTransfer` file straight into the hidden
  `input[aria-label="Upload an image to the canvas"]`: a renamed non-image must name itself in the
  notice (`compressImageUpload` catches the decode `DOMException`, which otherwise only reads "The
  source image could not be decoded."), and a real PNG must add an image layer.
- The last section types a 130-code-point Burmese word and reads the painted `tspan`s (one `<text>` per
  renderer, one `tspan` per painted line), so it fails if a line ever starts with a combining mark.
- `tests/editor-touch.cjs` runs to the end and passes on a server built from current `main`; the phone **Edit sidebar** section used to throw on a `null` `getBoundingClientRect` and no longer does.
- Production-UI checks can be driven headlessly with Chromium + CDP:
  `chromium --headless=new --no-sandbox --remote-debugging-port=9222 about:blank`,
  then connect to `http://127.0.0.1:9222/json` over the Node 22 `WebSocket`.
  Note `Emulation.setTouchEmulationEnabled` requires `maxTouchPoints` between 1 and 16.
- Text-layer geometry: the Free Transform box comes from `editorTextCanvasBounds` in `editor-layers.ts`. It must hug the painted **glyph ink**, not the font line box: `editorTextLineMetrics` measures the ink box (`actualBoundingBoxAscent`/`Descent`) alongside the font line box, and `editorTextMetrics` unions each line's ink box around its own baseline (ignoring blank lines, including a trailing one). Using `fontBoundingBoxAscent`/`Descent` instead makes the box ~44 units taller than the capitals at the 110px default. A reported ink descent of exactly `0` is a real measurement (caps have no descender), so only fall back to the 0.2em estimate when the browser reports no font line box at all. `layerCanvasBounds` adds an 18-unit grab margin to strokes/shapes/images but **0 for a pure text layer**, so the text outline lands on the ink. Verify by comparing the `[data-transform-outline]` rect to `[data-editor-text-content]`'s `getBoundingClientRect()`; measured padding is 1-4px (outline stroke plus handle), and pixel scans of a screenshot agree.
- Transform handle hit areas: `handleHitRadiusPx = Math.min(15, Math.max(5, shortestSide * 0.3))`. A fixed 15px radius swallowed a ~24px one-line text box entirely, so dragging the text resized it instead of moving it. The rotate handle sits `rotateOffset = Math.max(58, (handleHitRadiusPx + rotateHitRadiusPx + 10) / unitScale)` below the box; a fixed 58-unit drop put its circle on top of the bottom-centre resize handle on short boxes.
- Typing past the viewport edge: `keepTextCaretVisible` pans the workspace by the caret's own line (`editorTop + caretLine * lineHeight`), not by the textarea box. The textarea grows taller than the viewport after ~12 lines, so following its box made the pan oscillate and left the caret off-screen. Calls are coalesced through `caretPanFrameRef`, otherwise the value effect and the caret listeners each shift in the same frame and the pan overshoots by a full line. Verified on desktop/laptop/phone at 26 lines: the caret line stays inside the viewport.
- Re-entering an existing text layer must place the caret at the end (the overlay's `textAreaRef` effect); otherwise Enter inserts a line above the text and typing overwrites the start.
- Pushing to GitHub from this environment is blocked: the injected `GITHUB_TOKEN` authenticates as the `mhfashion` user and can read the repo, but every write path (`git push`, `POST /git/refs`, `gh api`) returns `403 Resource not accessible by integration`. The commits are prepared locally on the branch; a human or a token with `contents: write` must push them.

## Posts module (`/admin/posts`)
- Posting is three tabs: `data-post-tab="guide" | "tshirt" | "nyein"`. Guide lists the starter catalog read-only; Nyein is a placeholder until its brief lands; T-shirt posts are the working module (`components/admin/AdminPosts.tsx`).
- **Price depends on the full attribute combination, not the size.** A post carries `attributes` (ticked from `TSHIRT_POST_ATTRIBUTES`: size, material, fit, color, sleeve, gsm, cutting, print, each with the options the drop sells) and `prices`, where every row is one complete combination plus its own hand-typed `priceKs`. Two XL rows are normal and expected to differ. Never reintroduce a base price, a size ladder or a colour surcharge; `tshirtPostFromPriceKs` only *reports* the cheapest row for the list.
- Combinations without a row are not sold. `reconcileTshirtPriceRows` runs on every attribute/option change so a row never keeps a value that is no longer offered (it falls back to the attribute's first option).
- `validateTshirtPostDraft` rejects a row missing an attribute value, a zero price, a repeated combination, more than 40 rows and anything over Ks 10,000,000. Combination identity is `tshirtCombinationKey` (palette order, `key=value` pairs), so reordering selects must not create duplicates.
- A new draft starts with size/material/fit/color enabled and the other four off; `emptyTshirtPriceRow` pre-fills every active attribute so only the price needs typing.
- SVG files are read by `lib/post-assets.ts` and kept as a `data:image/svg+xml;utf8,` URL because Cloudflare R2 is not provisioned yet. That function is the only place to swap for the R2 upload; keep the `{ url, fileName, sizeBytes }` shape so the form, store and tests stay unchanged.
- `normalizeTshirtPost` converts posts saved by the earlier per-size module (sizes × colours with a colour surcharge) into combinations on read; a store without posts is backfilled with `createSeedTshirtPosts(...)`.
- Tests: `tests/admin-posts.test.cjs` covers the combination helpers, validation, migration and the screen wiring; `tests/guide-http.test.cjs` asserts the exact `manus-routes.json` order, so a new admin route must be added to that expected list too.

## Product preview (`components/ProductMockupPreview.tsx`)
- The product page preview is driven by the customer's selection, not a photo carousel. The old fake "1 / 4" counter and the `View 2/3/4` thumbnails were placeholders; they are gone.
- Mockups come from R2: `NEXT_PUBLIC_R2_PUBLIC_URL` is the public bucket origin and objects live at `mockups/<product-slug>/<look>.<ext>`. **This env var is inlined at build time**, so it must be set for the Cloudflare/Worker build as well, or the storefront only ever shows the catalog image.
- A *look* is colour + fit + sleeve. Size is deliberately excluded: the photo of a black oversized tee is the same for M and XL, so a bucket only needs the photos that actually differ. `mockupKeys` walks `black-oversized-short-sleeve` → `black-oversized` → `black-short-sleeve` → `black` → `default`, and `mockupCandidates` expands each key across `webp`, `png`, `jpg` before falling back to `product.imageUrl`.
- The fallback chain runs through `<img onError>` **and** a mount check for `complete && naturalWidth === 0`. Without the mount check a 404 that lands before hydration leaves the preview stuck on a broken image, because the error fires before React attaches its handler.
- The design overlay sits in `PRODUCT_PRINT_AREA` (fractions of the image box, currently 30% / 22% / 40% / 46%). Tune that constant when real mockup photos arrive; it is the only geometry the preview owns.
- Design source, highest priority first: `?design=` (URL or data URL), `product.designSvgUrl`, then the editor draft. `lib/design-draft.ts` keeps the open editor artwork in `localStorage` (`mh-fashion-design-draft-v1`), written by `EditorCanvas` on a 400 ms debounce; an empty draft paints nothing.
- Draft layers are rendered with the same `EditorArtworkLayers` as the editor, inside a `1000 x 1200` viewBox, so the preview matches the canvas without a second renderer.
- Tests: `tests/product-mockup.test.cjs`.

## Admin orders (`components/admin/AdminOrders.tsx`)
- Every order is listed; the screen adds a **Today** card, date presets (`Today` / `Last 7 days` / `Last 30 days` / `All`), a hand-typed `From`/`To` range, a sort select, and an "Orders by day" strip where clicking a day narrows the range to that day.
- Stage chips, the CSV export and the summary line all read the **date-filtered** list (`inRange`), not `data.orders`, so the counts always match the rows on screen.
- Orders are filed by the admin's **local** day (`adminDayKey`), not the UTC day. `revenueByDay` used `toISOString().slice(0,10)`, which in UTC+6:30 keyed each local-midnight bucket to the previous day, so the dashboard chart showed every order one day late. Both sides now use `adminDayKey`.
- `adminTodayKey()` wraps `Date.now()` so the screen can read "today" without calling an impure function during render (the `react-hooks/purity` lint rule rejects `Date.now()` in a component body).
- A range bound may be empty: `""` means open-ended, so `{ from: "2026-11-01", to: "" }` means "from that day on".
- Tests: `tests/admin-orders.test.cjs`.

## Apparel attribute chain (`apps/web/src/lib/editor-attributes.ts`)
- One module owns the §4.1 chain: `PRINT_METHOD_OPTIONS` (DTF, Sublimation), `FABRIC_TYPE_OPTIONS` (Combed Cotton, Compact Combed Cotton, Polyester), `KNIT_STRUCTURE_OPTIONS` (Single Jersey, Interlock, Air Layer), `MH_CUTTINGS_OPTIONS` (Crew Neck, V-Neck, Polo Neck, Round Neck).
- `fabricTypeOptions(printMethod)` collapses to Polyester under Sublimation; `knitStructureOptions(fabricType)` gives Interlock/Air Layer for Polyester and Single Jersey/Interlock for cotton. `narrowEditorAttributes` re-applies both after any change, so a value the cascade drops falls back to the first option still offered instead of staying on screen.
- The Posts module uses the same names: `TSHIRT_POST_ATTRIBUTES` keys are unchanged (`material`, `knit`, `cutting`, `print`) but the labels are Fabric Type / Knit Structure / MH Cuttings / Print Method, and the option values match the chain.
- `normalizeTshirtPostOptions` maps a stored post's old words (Cotton, Premium Cotton, Blend, Standard, Raw Edge, Raglan, Screen Print) onto the chain and returns the **same object** when nothing changed — keep that identity, the store hands the post back on every read.

## Editor Header Bar 2 layout
- Eight field boxes on one 1440 row (Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM, Color, Size) plus price, Save and Buy. The field label is stacked **above** its pill (`flex-col`), not inline: inline labels made each field ~154px and pushed Save/Buy off-screen.
- `FIELD_BOX_SHAPE` is `w-[7rem] h-7` (`h-11` on coarse pointers) with `pl-1.5 pr-5` on the trigger so "Combed Cotton" clears the absolutely-positioned chevron. Measured at 1440: bar scrollWidth == clientWidth (no scroll), all values fully readable.
- The bar hides its scrollbar (`[scrollbar-width:none]`) and the price/Save/Buy group is `sm:sticky right-0` with `bg-bg`, so it stays reachable when the bar does scroll on tablets. Below `sm` the group is in flow — pinning it on a 390px viewport left only ~105px for the fields.
- Verify with CDP by reading `[data-editor-box]` labels/values and comparing `scrollWidth`/`clientWidth`; the cascade check is Print Method → Sublimation, which must turn Fabric Type into "Polyester" and Knit Structure into "Interlock".

## Google Sheet price import is deleted
- Prices are hand-entered only. `lib/sheet-prices.ts`, `app/api/admin/tshirt-prices/route.ts`, the "Google Sheet prices" panel in `AdminPosts.tsx` and `mergeSheetPriceRows` are gone; do not reintroduce a sheet link, a CSV fetch, or "the sheet defines the attributes".
- The post editor copy now says "price each combination by hand".

## Pricing Management (`apps/web/src/lib/pricing-combinations.ts`, `lib/admin-pricing.ts`, `components/admin/AdminPricing.tsx`)
- One price belongs to one **full valid combination** (Plan §4.5.1). `combinationsFor` builds the cartesian product of the scope's attributes and drops anything `isValidCombination` rejects, so the grid can never create Sublimation + Combed Cotton or Polyester + Single Jersey.
- Do **not** sort the combination rows by key: an alphabetical sort puts `2XL` first and breaks the chain order. Generation order (attribute order, last attribute fastest) is the intended reading order.
- Post scope reads/writes `post.prices` (shared with the Posts editor); product scope reads/writes `productPrices` (one row per stocked size). `scopeRows` / `scopePrices` / `scopeVersions` must agree on `rowKey(options, attributeKeys)` — a mismatch shows every row as unpriced.
- Prices parse `24000`, `24,000`, `Ks 24,000`; 0, negatives, `10,000,000`+ and non-numeric text are rejected with a message. Rows carry `version`, so a save built from a stale grid is rejected (`conflicts`) instead of overwriting; every applied change appends to `priceHistory`.
- CSV export is UTF-8 with a BOM (Excel needs it for Myanmar text). An unpriced row exports an empty Price cell and re-imports as "same" — that is what makes export → import a no-op. Import only previews; `importChanges` writes new/changed rows only.
- The price cell needs `bg-white`: the admin theme's global input styling otherwise paints it dark and the number becomes unreadable.
- Phone layout: below `sm` the table is replaced by grouped cards (`data-pricing-phone`), grouped by
  two selects (default `["print","material"]` → "Print Method → Fabric Type"). `groupRows` keeps
  first-appearance order, so sections follow the chain — never sort them. Filters and bulk live in
  `BottomSheet`s, and the staged-save bar is a sibling of the card (not inside it) so it survives
  the phone branch.
- Native checkboxes render as dark squares because the site sets a dark `color-scheme`; give them
  `[color-scheme:light] accent-[#4cae22]`.
- A phone search field inside the admin header needs `min-w-0` on its flex wrapper, otherwise its
  intrinsic width forces ~370 px of page at a 320 px viewport.
- Tests: `tests/admin-pricing.test.cjs`.

## Attribute Management (`apps/web/src/lib/admin-attributes.ts`, `components/admin/AdminAttributes.tsx`)
- `data.attributeChain` is the canonical §4.1 vocabulary (order, label, options, enabled). It is **not** the editor's chain: `lib/editor-attributes.ts` stays static until the editor is reopened (owner directive 1), and the screen says so.
- The chain drives the pricing grid's labels and column order (`scopeAttributes` ranks by chain position), and `tshirtPostDraftFrom(post, chainAsPostAttributes(data))` seeds a new post from the enabled attributes. Stored posts keep their own options — do not "normalise" them against the chain, or an admin edit would silently rewrite published posts.
- `applyChainPatch` refuses to remove an option that still prices rows, to switch off an attribute that prices rows, and to take an empty/duplicate label. It returns the untouched data plus `issues`; the UI renders those and writes nothing.
- Tests: `tests/admin-attributes.test.cjs`.

## Payments (`lib/payments.ts`, `lib/payment-webhook.ts`, `app/api/payments/*`)
- `applyPaymentEvent(order, event)` is the **only** place an order changes stage because of money. Paid → Confirmed, failed → Cancelled, refunded → Refunded. A replay changes nothing; a paid event never confirms a non-pending order; an amount that does not match `orderAmountKs` never confirms.
- The webhook verifies HMAC-SHA256 over `` `${timestamp}.${body}` `` from the **raw** request text (`request.text()`), rejects a timestamp outside 300 s, and records each provider event id once. Do not parse JSON before verifying — the signature covers the bytes.
- `POST /api/payments/intent` falls back to the demo provider when a provider's keys are missing and says so in `warning`; with `PAYMENTS_ALLOW_MOCK=0` it returns 501 with the missing variable names instead. Keys: `PAYMENT_WEBHOOK_SECRET`, `KBZPAY_APP_ID`/`KBZPAY_SECRET`, `WAVEPAY_MERCHANT_ID`/`WAVEPAY_SECRET`, `AYAPAY_MERCHANT_ID`/`AYAPAY_SECRET`, `CARD_ACQUIRER_KEY`.
- `POST /api/payments/simulate` is the demo provider's side: it signs a callback and feeds it through `handlePaymentWebhook`, so the demo exercises signature, replay and idempotency. It refuses a non-mock intent.
- Intents live in an in-memory map (`lib/payment-store.ts`), so a restart forgets open intents. That is fine while nothing is charged; it becomes a Supabase table with P0 item 1.
- Tests: `tests/payments.test.cjs` (Web Crypto is global in Node 22, so no Node-only crypto import).

## SEO structured data (`lib/structured-data.ts`, `components/JsonLd.tsx`)
- `serializeJsonLd` escapes `<`, `>`, `&` and U+2028/2029. Never inline `JSON.stringify` into the script: a product name containing `</script>` closes the element.
- `lib/site.ts` owns the origin policy (`getSiteOrigin`): https only, no credentials, no path, no localhost. With no configured origin, absolute URLs are simply omitted — never guessed, so a preview host cannot leak into a canonical. `guide-metadata.ts` re-exports it as `getGuideSiteOrigin` (a **relative** import, because the test loader only resolves `.`-relative specifiers).
- Product uses `AggregateOffer` with `priceCurrency: "MMK"` and numeric `lowPrice`/`highPrice`: the catalog carries a range, and a reversed range is repaired rather than emitted.
- The FAQ node is built from `INFO_PAGES.faq.sections` (heading = question), so the markup cannot drift from the copy; a section with no answer is dropped.
- Pages: Organization + WebSite in `layout.tsx`, Product + BreadcrumbList on `/products/[slug]`, FAQPage on `/faq`, Article + BreadcrumbList on `/guide/[slug]`. `/search` stays `noindex`.
- `NEXT_PUBLIC_SITE_URL` is inlined at build time. Until the deploy workflow passes it (a repository variable plus an `env:` on the "Build OpenNext Worker" step), canonical links and JSON-LD `url` stay off — that is correct behaviour, not a failure. A PAT without the `workflow` scope cannot push a change to `.github/workflows/`, so that edit needs the owner.

## Account orders (`lib/my-orders.ts`, `app/account/page.tsx`)
- Orders live in the same browser store as the admin demo data (`mh-fashion-admin-demo-data-v1`), read through `useAdminDemoData()` (`useSyncExternalStore`).
- **Filter on `checkoutKey`.** The seed contains ~26 demo orders for the admin preview; only an order the checkout created has `checkoutKey`, so `myOrders()` is what the customer sees. Showing `data.orders` directly puts fake orders in a customer's history.
- `myOrders()` copies before sorting; `readAdminDemoData` caches the object, so sorting in place would reorder the admin's list too.
- `formatOrderDate` builds the month name from a fixed table: en-GB renders September as "Sept" in some ICU builds, and the server and the browser must print the same text.
- The card header is two rows below `sm` (`basis-full` on the identity block, then badge + total). A plain `flex-1` identity block shrinks to one word per line on a phone.

## Wishlist (`lib/wishlist.ts`, `lib/wishlist-context.tsx`, `app/wishlist/page.tsx`)
- The list is a **snapshot** of the saved products in `localStorage` (`mh-fashion-wishlist`), not a live catalog query: `/wishlist` must render with no server and no Supabase credentials. The page says the price shown is the saved one.
- `wishlist.toggle(product)` is a toggle, never an append. `normalizeWishlist` drops an entry without id/slug/name, collapses duplicates and caps at `WISHLIST_LIMIT` (100); a non-numeric price becomes 0 so `toLocaleString` cannot print `NaN`.
- The provider must not write before it reads (`if (!loaded) return;`), or the first render's empty array overwrites a saved list.
- `ProductCard` reads `useWishlist()`; never reintroduce a private `useState` heart — the saved page would not see the tap. The button carries `data-wishlist-toggle={id}`, `data-wishlisted` and `aria-pressed`.
- Header heart is a link to `/wishlist` with `data-wishlist-count`; `MobileNav` links the same route.

## Catalog search (`lib/products.ts`, `app/search/page.tsx`)
- `normalizeSearchQuery` keeps `\p{L}`, `\p{M}`, `\p{N}`, spaces and `'&.+-`. The `\p{M}` matters: without it a Myanmar term loses its combining marks (`အင်္ကျီ` → `အင က`). Commas, brackets, `%` and `_` are stripped because they are PostgREST `or()` syntax.
- `searchProducts` sends one request: `or=(name.ilike.%t%,sub_brand.ilike.%t%,product_type.ilike.%t%)`, and refuses a term shorter than two characters.
- Three entry points must keep working: `[data-header-search="desktop"]` (lg+, React `router.push`), `"compact"` (md–lg dropdown, same handler), and `"mobile"` in `MobileNav` (a native GET form). The phone form must not carry an `onSubmit` that closes the dropdown — React unmounts the form mid-submit and the browser cancels the navigation, so Enter does nothing.
- `/search` is `noindex, follow`; the empty state offers collection links and "Popular right now".
- To see real results locally without credentials, point `NEXT_PUBLIC_SUPABASE_URL` at a stub PostgREST server and restart `next start`. Remember to restart without it afterwards: the guide tests read the same client, so a stub that only answers `products` makes three `guide-http` tests fail with "no posts".

## Storefront information pages (`lib/storefront-info.ts`, `components/InfoPage.tsx`)
- All copy lives in `INFO_PAGES`; the eight routes (`/about`, `/faq`, `/shipping`, `/returns`, `/size-guide`, `/terms`, `/privacy`, `/cookie-policy`) are three-line wrappers around `InfoPage`. Edit the content module, not the pages.
- `draft` on a page renders the amber "draft for legal review" banner. Terms, Privacy and Cookie Policy carry it until a lawyer signs them off; do not remove it without the owner's word.
- `/best-sellers` redirects to `/popular` — one ranked list, no duplicate page.
- `/contact` is the §8.1 claim channel: `ContactForm` composes a `mailto:` (topic, order number, design, message) and never claims to have sent anything. The address is `NEXT_PUBLIC_CONTACT_EMAIL`, falling back to a placeholder the owner must replace.
- `tests/storefront-info.test.cjs` fails when a footer link has no route, when the legal pages lose their draft banner, or when the payment/delivery/takedown facts drift from the plan.

## Checkout (`lib/checkout.ts`, `components/CheckoutClient.tsx`)
- `placeOrder(data, draft)` is the only writer of a storefront order. The draft carries `idempotencyKey`; the order stores it as `checkoutKey`, and a repeat submit with the same key returns the **first** order (`created: false`) instead of adding a second one. The page keeps the key in `sessionStorage` (`mh-fashion-checkout-key`) so a refresh reuses it.
- A new order starts at **Pending Payment**; `confirmPayment` is the demo stand-in for the provider webhook and refuses anything that is not pending. Do not create orders at `Confirmed`.
- The delivery fee is **not** invented: the summary says it is quoted by MH Delivery, because that API is not connected. Do not add a flat fee to make the total look complete.
- `AdminPaymentMethod` now includes `Visa`; `CHECKOUT_PAYMENTS` deliberately has no cash on delivery (Plan §8).
- The cart's Checkout button is a link to `/checkout` (`data-cart-checkout`); it used to be a dead button.
- Tests: `tests/checkout.test.cjs`.

## Jersey mapping (`lib/admin-jersey.ts`, `components/admin/AdminJersey.tsx`)
- `data.jerseyStyles` holds one worn photo path plus a quad per panel (Plan §4.4). Corners are **percentages of the photo**, ordered top-left, top-right, bottom-right, bottom-left; `panelPath` turns them into the preview path.
- `panel.view` is derived from the key: only `back` belongs to the back photo. `panelIssues` refuses a corner outside 0-100, a quad under `MIN_PANEL_AREA` (25 %², shoelace) and a panel on the wrong view.
- `JERSEY_REQUIRED_PANELS` is `front-left`, `front-right`, `back`; `completePanels` fills the rest so a new style validates immediately.
- Corner edits save on every valid change (the preview and the export must never disagree); an invalid quad is refused and the reason is shown, so the stored zones stay printable.
- `removeStyle` keeps the last style. `duplicateStyle` rewrites the photo path to the copy's id, matching `jersey-mockups/<id>/worn_photo.png`.
- Tests: `tests/admin-jersey.test.cjs`.

## Loyalty (`lib/admin-loyalty.ts`, `components/admin/AdminLoyalty.tsx`)
- `data.loyalty` = `{ rules, tiers, milestones }` (Plan §9). `createSeedLoyalty()` is both the seed and the reset target; `readAdminDemoData` falls back to it when a stored blob predates the field, so an old `localStorage` entry does not lose the module.
- `spendPoints` spends **daily first, then the kept purchase points**, and returns the shortfall instead of clamping silently. `expireDailyPoints` clears only the daily bucket.
- `tierFor` sorts by `minSpendKs` before matching (admins may leave rows shuffled) and the boundary is inclusive; validation requires the cheapest tier to start at Ks 0 or a new shopper has no tier.
- `removeTier` refuses a tier that demo customers sit in (`tierUsage` over `aggregateCustomers`), naming them; `saveTier`/`saveMilestone` run `validateLoyalty` first and return the untouched data plus issues.
- Seeded tier thresholds (100k / 200k) are chosen so the demo customers actually land in Silver and Gold — a threshold above the top demo spend leaves every usage column at 0 and the guard untestable.
- Tests: `tests/admin-loyalty.test.cjs`.

## Delivery Settlement Report (`lib/admin-settlements.ts`, `components/admin/AdminSettlements.tsx`)
- `data.deliveries` seeds one row per order in `Handed to Delivery` / `Out for Delivery` / `Delivered` / `Refunded`; `feeKs` is what the shopper paid, `costKs` what the courier is owed.
- `markDeliveriesSettled` is idempotent and keeps the **first** stamp, so a re-run cannot rewrite history; `unsettleDeliveries` clears it. Both return new data, never mutate the input.
- Returns keep their cost, which is why a returned parcel shows a negative margin — do not clamp it.
- `buildSettlementCsv` writes a BOM, one line per delivery, a `Total` line and one `Subtotal <courier>` per courier.
- Tests: `tests/admin-settlements.test.cjs`.

## Design takedown (`recordDesignTakedown`)
- Designs → Takedown records claimant + note, sets the design to `Hidden` and appends to `designTakedowns`; the row shows a `Claim` badge.
- Owner rule (2026-11-21): a takedown never touches `orders` — a paid order is still produced and delivered. `recordDesignTakedown` returns `{ ...setDesignStatus(...), designTakedowns: [...] }` and nothing else; `tests/admin-takedown.test.cjs` asserts the orders are byte-identical afterwards.
- Tests: `tests/admin-takedown.test.cjs`.

## Product page preview (`components/ProductMockupPreview.tsx`)
- The media column is `minmax(0,640px)` on `lg`. The photo box is **landscape**, never square: `h-[170px]` on phones, `sm:aspect-[16/10]` above, so the media block costs one photo's height and nothing more. The box is white while a photo is showing (mockups ship on white) and `bg-bg` for the placeholder.
- The thumbnails are a **rail on the left**, not a strip underneath: `data-product-thumbs` is `absolute inset-y-0 left-0` inside the box's wrapper, the photo gets `ml-12 sm:ml-16`, and the rail scrolls internally with `[scrollbar-width:none]`. Tiles are fixed `h-11 w-11 sm:h-14 sm:w-14` — sizing them with `w-full`/`aspect-square` let a classic scrollbar narrow the rail and squash them to 41px.
- One tile per colour, `data-product-thumb="<Colour>"`. A tile shows that colour's mockup photo when the bucket has one and its swatch (`data-thumb-swatch`) otherwise, so the rail never collapses to nothing. Clicking a tile selects the colour (`onSelectColour`), which also updates price and the swatch row — it is not a separate "gallery" state.
- The `NEW` badge sits top-**right** (`right-3`); at `left-3` it landed on the thumbnail rail.
- Tiles must not fall back to the `default` look: `mockupCandidates(..., { includeDefault: false })` keeps every colour from showing the same generic photo. The main image keeps the full chain plus the catalog image.
- Zoom: hovering with a mouse scales the zoom layer to `ZOOM_SCALE` (2.4) around the pointer (`data-product-zoom-layer`, transform-origin in %); leaving resets it. A click or a touch tap opens the lightbox (`data-product-lightbox`, `role="dialog"`), closed by the X, the backdrop or Escape. The design overlay lives inside the same transformed layer, so it zooms with the shirt.
- When nothing resolves (no catalog image, no R2 mockup — the current production state for most products) the box shows the selected colour's swatch and "Mockup photo coming soon" instead of an empty rectangle.
- Tests: `tests/product-mockup.test.cjs` (candidate order, default-look exclusion, preview wiring).

## Guide page density (`app/guide/page.tsx`, `components/guide/GuideCard.tsx`)
- Phones get a **row** card, not a cover image: a 72px thumbnail plus title/meta, `h` ≈ 90px. A full-width `aspect-[1.7/1]` cover made every card taller than the phone screen (368px).
- The card's category badge and read-time chip are `hidden sm:inline-flex` because the phone thumbnail is too small to hold them; the phone row prints the category as an inline pill instead.
- The phone category row scrolls horizontally (`overflow-x-auto`, `[scrollbar-width:none]`, fixed `w-[74px]` items). With `flex-1` items the seven labels overlapped and were clipped by `overflow-hidden`.
- Desktop cards use `sm:aspect-[1.9/1]` covers and `p-3`; the hero is `min-h-[124px]` on phones.

## Order print sheet (`lib/order-print.ts`, `components/admin/AdminOrders.tsx`)
- Opening an order shows a **Print sheet** block (`data-order-print-sheet`): per line the colour, size, material, GSM, fit, sleeve, print method, placement, print size in cm, design name, plus the artwork thumbnail (`data-order-design-preview`, a `data:image/svg+xml` URL) and an SVG download button.
- `AdminOrderItem` carries the spec (`material`, `gsm`, `fit`, `sleeve`, `printMethod`, `design`); `AdminOrder.shipTo` carries the address. The fields are optional so orders stored before the sheet existed still load — `backfillOrderPrintSpec` fills them from the product catalogue and seed designs when the store is read, so no order opens with blanks.
- Designs are stored **as SVG sized in centimetres** (`buildDesignSvg`: `width="28cm" height="35cm"` + a `viewBox` in artwork units) and are drawn from the stored layer boxes, so the file the press opens is exactly the layout on the order. Never hand-write artwork next to the layers — they would drift.
- `AdminOrderDesign` carries `ink`, `unitsPerCm` and `layers` (`name`, `kind`, `x`, `y`, `width`, `height`, `rotation`, `scale`). `designLayerSize` converts a layer to centimetres (0.1 cm steps); the drawer (`data-order-design-layout`), the print sheet and the CSV all read it.
- Text layers shrink their font to fit the layer box (`width / (label.length * 0.56)`), otherwise the artwork paints wider than the box the layout table reports.
- `design.mockup` records where the print area sits on the garment: mockup name, flat garment size in cm and the print-area origin (`printAreaXCm`/`printAreaYCm` from the top-left). `designMockupPlacement` derives it from the size table (`GARMENT_SIZES_CM`) and the placement; `buildMockupDiagramSvg` draws the garment with the print area and every layer box. The drawer (`data-order-design-placement`), the A4 sheet and the CSV all show it — a design without it cannot be lined up on the press.
- `orderArchiveEntries` is what the "Print files ZIP" button downloads: `print-sheet-<id>.html`, `print-spec-<id>.csv`, `manifest.json` and `designs/<file>.svg` plus `designs/<file>-mockup.svg` per design. `lib/zip.ts` is a dependency-free stored (uncompressed) ZIP writer — keep it that way rather than adding a library to the admin bundle; `tests/order-archive.test.cjs` reads the archive back with its own central-directory parser and checks every CRC.
- `manifest.json` is the machine-readable order: customer, ship-to, totals, per-item spec and, per design, the print area, mockup origin and every layer with both artwork units and centimetres.
- `orderPrintRows` is the single column list for both the drawer's "Print spec CSV" and the sheet; do not re-add a second, thinner `productionRows`.
- `buildOrderPrintSheetHtml(order)` returns a standalone A4 document (spec tables, ship-to, artwork, design-file list, totals) with `@page { size: A4 }`; `openOrderPrintSheet` writes it into a new window and calls `print()`. Headless Chromium blocks the popup, so verify the sheet by rendering the HTML string from Node (see `tests/admin-order-print.test.cjs`).
- Design artwork is inline SVG (`orderDesignArtwork`), so preview and download work without a bucket. Escape every interpolated value with `escapeHtml` — a design or customer name must not be able to inject markup.

## Product page trust row (removed)
- The product page used to carry five static promises (Free Delivery, Secure Payment, Easy Returns, 24/7 Support, Seol Support). They are gone: delivery is being handed to the **MH Delivery API**, so the site must not advertise a shipping rule it does not control. `tests/product-trust-row.test.cjs` fails if the copy or its icons come back.
- The Shipping & Returns tab still carries the written policy text; change it only when the MH Delivery terms replace it.
- The admin **Free delivery from (Ks)** setting is gone as well: delivery pricing belongs to the MH Delivery API, so `AdminSettings` no longer has `freeDeliveryThresholdKs`.

## Ready-made products and the Nyein brand
- `is_customizable` is the switch: `none` means the piece is sold as shown. `isDesignEditable()` in `apps/web/src/lib/product-editing.ts` is the only reader, and `ProductDetailClient` uses it to (a) hide the **Edit Design** link so the row drops to two buttons, (b) skip the editor draft so no draft artwork is painted on a ready-made product, and (c) show the `data-ready-made` note.
- A ready-made product is still fully buyable: size, colour, material, GSM, Buy Now and Add to Cart stay.
- `/nyein` lists the `Nyein` catalogue line through `getProductsBySubBrand("Nyein")` (`sub_brand` column, case-insensitive). The page is no longer a placeholder; it shows the count, a card grid, and an empty state that points at `/new`.
- `Product` gained `subBrand`; every product select must list `product_type, sub_brand, is_customizable` or the cards lose the flags.

## R2 storage (`Doc/R2-STORAGE.md`)
- Bucket `mh-fashion-assets`, public origin in `NEXT_PUBLIC_R2_PUBLIC_URL`.
- Layout: `mockups/product/<product-slug>/<look>.<webp|png|jpg>`, `mockups/editor/<garment-slug>/<look>.<webp|png|jpg>`, `mockups/3d/<product-slug>/<look>.<webp|png|jpg>` + `models/<product-slug>.glb` (reserved for the 3D viewer), `designs/<design-slug>.svg`, `posts/<post-slug>.svg`, `orders/<order-id>/...`.
- **Two mockup sets, never mixed.** The catalogue (`ProductMockupPreview`, pinned with `set: "product"`) uses `color[-fit][-sleeve]`, 4:5 portrait, print area at 30% left / 22% top / 40% wide / 46% tall. The editor uses `editorMockupCandidates()` with `color[-gsm]` under `mockups/editor/<garment-slug>/` (`t-shirt`, `phone`), 1:1 square and flat.
- The pre-split flat layout `mockups/<slug>/<look>.<ext>` is still tried **after** `mockups/product/...` (catalogue only); the editor never falls back to it, because a 4:5 photo does not fit a square panel.
- Size never enters a look key; extensions are tried in the order `webp, png, jpg`.

## Planning decisions (2026-11-21, `Plan/PLAN.md`)
- **The editor is final as built.** Do not change editor design or behaviour, and do not add editor work to the plan. `Plan/PLAN.md` §6 says so; §16's register deliberately has no editor items.
- Prices are hand-entered in the **Pricing Management** UI (`Plan/PLAN.md` §4.5.1, Web + Phone). The Google Sheet price import is removed — do not reintroduce a sheet link, a CSV fetch, or "the sheet defines the attributes".
- **Only admins upload to R2**, through the admin dashboard; the form generates the key. One key pattern only (`Plan/PLAN.md` §12, `Doc/R2-STORAGE.md`).
- Canonical attribute names: Print Method / Fabric Type / Knit Structure / MH Cuttings.
- UI copy ships in EN and MM; the switcher is in the header pill and the mobile drawer.
- Copyright/takedown policy lives in `Plan/PLAN.md` §8.1 (MH Fashion sells the design, does not own it; claims lead to a takedown; Designs → Hide/Delete with a record).

## Print bundle and delivery (`lib/order-print.ts`, `lib/delivery.ts`)
- `print-files.zip` carries `README.txt`, `print-sheet-<id>.html` (press), `invoice-<id>.html` (customer receipt, A5), `print-spec-<id>.csv` (one row per line), `measurements-<id>.csv` (one row per design layer, cm), `manifest.json`, `delivery-<id>.json` and `designs/*.svg` + `designs/*-mockup.svg`. `Doc/PRINT-BUNDLE.md` lists every column. Adding an entry means updating the exact-list assertion in `tests/order-archive.test.cjs`.
- `orderMeasurementRows()` is the single source of the layer measurements: print area, units/cm, layer X/Y/width/height in cm, rotation and scale. The sheet, the CSV and the manifest all read the same `designLayerSize()` numbers, so they cannot drift.
- The receipt and the print sheet are self-contained HTML: they print through the browser's own dialog (Ctrl+P → save as PDF), so there is no PDF library and no font to ship.
- The receipt never invents a delivery fee — the line reads "Quoted by MH Delivery" until MH Delivery returns a price.
- `buildDeliveryQuoteRequest(order)` is the JSON MH Delivery prices from: consignee name / phone / email / address line / township / city, per-item size + colour + quantity + weight, parcel totals and the COD amount. `deliveryQuoteJson` / `downloadDeliveryJson` are the file, and `Doc/MH-DELIVERY.md` is the contract. Weights come from `UNIT_WEIGHT_GRAMS`; change them when the courier publishes real ones.
- `NEXT_PUBLIC_MH_DELIVERY_URL` is read into `MH_DELIVERY_QUOTE_ENDPOINT`, which is empty until MH Delivery supplies the URL, so no request is sent yet.

## Cart lines (`lib/cart-items.ts`, `lib/cart-context.tsx`)
- A cart line is keyed by `cartItemKey(productId, variant)` — product id **plus** size, colour, material, GSM, fit and sleeve. Two adds with any different value are separate lines; only an identical combination increments. Merging by product id alone collapsed different variants into one line and lost the variant entirely.
- `CartItem` carries `key`, `variant` and an optional `unitPriceKs` (the variant price the product page computed). `cartLineTotal`/`cartSubtotal` prefer `unitPriceKs` and fall back to `priceMinKs`.
- Both cart surfaces (`CartBox`, `CartPageClient`) render `[data-cart-line]` with `[data-cart-variant]` and call `updateQuantity`/`removeItem` with `item.key`. Never key by `item.id`.
- The product page requires size and colour before adding (`data-add-to-cart`), and shows `[data-variant-warning]` otherwise, so no line reaches the print desk without a size or colour.
- `normalizeCartItems` gives pre-variant carts a key per stored line instead of collapsing them.

## Deployment (important)
- Production deploys run through `.github/workflows/deploy-cloudflare.yml` on push to `main`.
- The job's **first step** verifies the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. If either is missing it exits 1 and every later step is skipped, so **the Cloudflare Worker is never deployed**.
- As of 2026-11-18 the repository has **no Actions secrets configured**, so every `main` deploy has failed at that step. A merged change does not reach production until those two secrets are added in GitHub → Settings → Secrets and variables → Actions.

## CI notes
- The `Workers Builds: mhfashion` check fails on **every** branch, including `main` (`f0b20ab`) and every PR branch. It is a Cloudflare-side build, not the GitHub workflow above, and it fails identically on unmodified commits. Do not treat it as a regression from your change.
- `npm run cf:build --workspace=apps/web` succeeds locally, so the failure is in the Cloudflare build environment (secrets/account), not in the source.
- `Validate and deploy MH Fashion` on `main` also fails for the missing-secrets reason described above.
- The session `GITHUB_TOKEN` is **read-only** on this repo (`Resource not accessible by integration`): push, PR edits, and comments all return 403. Ask the owner for a PAT with `contents: write` when a push is required; it works for `git push` but not for PR body edits or comments unless it also has `pull_requests: write`.

## The print canvas element
- `<canvas aria-label="Blank print canvas">` is a **layout box**, not a bitmap: the artwork paints in the SVG layers above it and nothing calls `getContext`. Its backing store is `PRINT_CANVAS_BACKING_SPEC` (900x1080 = 972k px) because a real 4500x5400 store is 24.3 M px (~97 MB) and older iOS refuses a canvas above 16.7 M px. The print size lives in `PRINT_CANVAS_SPEC` and the `data-canvas-*` attributes, so keep those when changing the display size. Verified: backing 900x1080, attributes 4500/5400/300, on-screen box unchanged.

## Text Free Transform box (`apps/web/src/lib/editor-layers.ts`)
- `editorTextBounds` / `editorTextCanvasBounds` must contain everything the layer paints, not just the glyph ink. `editorTextPaintPadding(text)` returns how far each painted effect (outline stroke, shadow/echo offset, glow, extrusion) and the strike-through/cut/oblique decoration reaches past the ink; the bounds grow by it on all four sides.
- `editorTextEffects(text)` resolves the painted effect list (explicit `effects`, else the legacy `textEffect` preset) for both the renderer and the bounds — keep them sharing it, or the box and the paint drift apart again.
- `editorTextDecoration(text)` is the same contract for decorations: it returns the painted line/rect geometry in absolute layer units and **both** `EditorLayerPreview` and the padding read it. Never re-derive a decoration's extent from a `fontSize` multiple — a decoration is laid out from the anchor, not the ink edge, so a guessed multiple overshot the real rule by ~50 px a side.
- Verified by frame differencing (hide the text group, diff the two screenshots) in real Chromium at 1440x900 and 390x844 touch: plain, multi-line, arch/wave/circle presets, all five effects, line/cut/oblique decorations, scaled, rotated, and dragged-outside-canvas states all leave ≤1.1 px of ink outside the box (sub-pixel antialiasing).

## Text typing downward
- Typing goes into a `foreignObject` textarea whose line box is aligned to the drawn SVG baseline; its height is `lines * lineHeight + 4` so it grows with every line instead of scrolling the caret out of view. Verified to 42 lines.
- Re-entering an existing text layer with the Text tool focuses the textarea with the caret at the **end** (`selectionStart === value.length`), so Enter appends a line below the last glyph. `commitEditingText` switches the tool back to `move`, so re-entry needs the Text tool picked again.
- Typing is verified end to end with CDP: `Input.insertText` for text and `Input.dispatchKeyEvent` with `text: "\r"` for Enter (a keyDown without `text` does not insert a newline).
- Beware pixel probes that scan for "dark" or "lime" pixels: the docked sidebars (uniform `#0c0c0c`) and the t-shirt mockup both produce large false positives. Hide `[data-dock-side]` elements, or diff a frame with the layer hidden.

## Header Bar 2 vocabulary (`apps/web/src/lib/editor-attributes.ts`)
- That module is the single source for every list the editor header offers: print method, fabric, knit,
  MH cuttings, GSM, size and colours (`{ value, label, hex }`, `COLOR_LABELS` for the price book).
  `TSHIRT_POST_ATTRIBUTES` in `lib/admin-demo-data.ts` is built from it, so the header and the admin pricing
  table cannot drift apart. Do not add a private `SIZE_OPTIONS` / `COLOR_OPTIONS` / `GSM_OPTIONS` copy in
  `EditorHeaderBar2.tsx`; `tests/canvas-shell.test.cjs` fails on one.
- The price tables (`EDITOR_SIZE_PRICE_KS`, `EDITOR_GSM_PRICE_KS`) must key exactly the offered options —
  `tests/editor-attributes.test.cjs` asserts both directions.
- `tests/helpers/load-ts-module.cjs` resolves `@/lib/...` imports and loads sibling TS files recursively, so
  a lib that imports another lib (admin-demo-data → editor-attributes, editor-path-boolean → editor-layers)
  loads in tests without extra wiring.

## Download my design (`lib/design-export.ts`, `EditorDesignExport.tsx`)
- The export is cut from the editor's own renderer: `EditorDesignExport` mounts a hidden `<svg>` with
  `EditorArtworkLayers` inside `[data-editor-export-artwork]`, and `serializeArtworkSvg` copies that group.
  Do not build a second string renderer — the transform box, guides and handles must never reach the file.
- Sizes come from `PRINT_CANVAS_SPEC` (4500 × 5400 px at 300 dpi), so the SVG is `38.1cm × 45.72cm` with
  `viewBox="0 0 1000 1200"` and the PNG is rasterised at `exportPixelSize()` = 4500 × 5400.
  `pixelsToCentimetres()` is the reverse the press sheet relies on; keep them in one module.
- PNG text rasterises with **system** fonts (an SVG inside `<img>` cannot use the page's webfonts). The app
  loads no webfont today, so this is exact; if one is added, inline it into the export or the PNG text falls
  back to Arial/DejaVu.
- Verified with CDP + `Browser.setDownloadBehavior`: parse the PNG IHDR for 4500 × 5400, and scan the alpha
  channel to confirm the ink bbox matches where the layer sits on the canvas (a blank PNG would pass a
  size-only check).

## One shop clock: `Asia/Yangon`
- Timestamps are stored as UTC ISO strings and **displayed in Myanmar time**. `adminDayKey`,
  `formatAdminDate`, `formatAdminDateTime`, `adminDayLabel` and `revenueByDay` in
  `lib/admin-demo-data.ts` all pin `YANGON_TIME_ZONE`; never re-derive a day from
  `getFullYear()/getMonth()/getDate()` or a bare `toLocaleDateString` — that files an order by the
  device's day, which differs from the server render and from a phone that travelled.
- Date **inputs** work in Yangon days too: `adDraftFrom`/`adFromDraft` (`lib/admin-ads.ts`) and
  `promotionDraftFrom`/`promotionFromDraft` (`lib/admin-demo-data.ts`) write `${day}T00:00:00+06:30`
  and read back with `adminDayKey`. A stored instant shown through `.slice(0, 10)` reads the UTC day
  and is wrong for anything after 18:00 UTC.
- `tests/admin-orders.test.cjs` re-runs the formatters with `process.env.TZ` set to UTC, Los Angeles
  and Tokyo; keep that guard when touching the date helpers.

## Reprint record (`lib/order-print.ts`, `AdminOrders.tsx`)
- `AdminOrder.reprints` holds one entry per run of the press sheet (`{ at, by }`, last
  `MAX_ORDER_REPRINTS` = 20). `recordOrderReprint` is pure; the drawer records the run **before**
  opening the sheet, so the sheet prints the run it belongs to ("First print" / "Reprint 2 · … by X").
- The drawer's print button switches to "Reprint sheet" once a run exists and shows
  `Press sheet: 2× · 21 Nov, 14:30`.

## Printable documents on a phone
- `buildOrderPrintSheetHtml` / `buildOrderInvoiceHtml` carry `<meta name="viewport" ...>` plus a
  `@media (max-width: 640px)` block that stacks `.grid`, `.line` and the receipt header; without the
  meta a phone lays the sheet out at 980 px and the tables are unreadable. Keep `@media print` hiding
  `.printbar`.
- `openOrderPrintSheet` / `openOrderInvoice` return `"opened" | "downloaded"`: when `window.open`
  returns null (iOS blocks a popup that is not the first thing a tap does) the HTML is saved as a
  file instead of the click doing nothing. Verified at 390 × 844 touch with CDP
  (`scrollWidth === innerWidth`) and with `window.open = () => null` to force the download.

## Rate limiting (`lib/rate-limit.ts`)
- Module memory is the default store and is per isolate. `useRateLimitStore(kvRateLimitStore(kv))`
  switches to a Cloudflare KV counter that survives an isolate replacement; `enforceRateLimit` is
  async, so every route must `await` it before it reads the body.

## Checkout form (`apps/web/src/components/CheckoutClient.tsx`)
- `submit()` validates the whole draft (`validateCheckout`) **before** the terms gate, so an empty form
  lists every missing field plus "Accept the terms to place the order." in one pass. Short-circuiting on
  the terms checkbox made the customer tick it only to discover the name, phone and address were blank.
- `tests/storefront-e2e.cjs` asserts the six issues on an empty form before it fills the form, then
  keeps the full cart -> order -> account path.

## Asset service core (`apps/web/src/lib/asset-store.ts`, `asset-catalogue.ts`)
- The browser never lists R2 itself: a Worker reads the bucket through `AssetStore` and serves one JSON
  snapshot per kind. `createMemoryAssetStore` is the test implementation (it takes `pageSize`, so a
  listing that forgets to follow `cursor` fails in tests).
- `isSafeAssetKey` is the single gate: allow-listed prefix, no scheme, no leading slash, no `..` segment,
  no backslash, no `//`, no trailing slash, at most 512 characters. The memory store asserts it on
  `get`/`put`/`delete`, and the builders report an unsafe key in `issues` instead of using it.
- Fonts go through `parseEditorFontManifest`, so the bucket, the picker and the check script share one
  definition of a usable font. Every other kind uses `meta.json` with `slug`, `name` and optional `files`.
- A folder with files but no `meta.json` is reported once as `"meta.json is missing"`; a key that is
  already unsafe does not also mark its folder incomplete.
- `writeAssetCatalogue` compares everything except `generatedAt`, so a quiet folder is not rewritten
  (and the object's cache is not churned).

## Asset routes (`apps/web/src/lib/asset-routes.ts`, `asset-store-r2.ts`)
- `catalogueResponse` / `mockupResponse` return `{ status, headers, body }`, so the Next route stays a
  thin adapter and the cache contract is tested without a server.
- `Cache-Control: public, max-age=60, stale-while-revalidate=600` and an FNV-1a `ETag` over the body;
  `If-None-Match` accepts a weak (`W/`) value, a list and `*`. A 304 carries the same headers and no body.
- Fonts answer `{ fonts, skipped }` (what `parseEditorFontManifest` takes); other kinds answer the
  catalogue itself; `mockups/<slug>` answers `{ slug, files }`, `404 no_mockups`, `400 invalid_slug`.
- `resolveAssetStore()` reads the `MH_FASHION_ASSETS` binding via `getCloudflareContext({ async: true })`
  and returns `null` outside Workers. A null store answers 200 with an empty catalogue whose issue says
  the bucket is not bound — never a 5xx, so the editor falls back to its system fonts.
- The editor still reads the public manifest URL. Do not point it at `/api/assets/fonts` until
  `wrangler.jsonc` has the binding, or production loses the fonts it loads today.

## Asset rebuild and the font check script
- `rebuildAssetCatalogues(store, now, log)` (`lib/asset-catalogue-rebuild.ts`) is the one pass a cron
  trigger, an admin rescan and a test share; it writes only changed snapshots and logs one line per kind.
- `scripts/check-font-manifest.cjs` now loads `asset-store`/`asset-catalogue` through
  `tests/helpers/load-ts-module.cjs` and builds the same catalogue the Worker would, so a local check and
  production agree. It keeps two modes: `fonts/<slug>/meta.json` (builder rules, strict file existence)
  and the legacy single `manifest.json` (old audit, plus a note that the service wants `meta.json`).
- The script exits 1 on any issue and 0 otherwise; large files stay a warning, as before.

## Brush management (`apps/web/src/components/admin/AdminBrushes.tsx`, `lib/admin-brushes.ts`)
- A brush id is its bucket folder (`brushes/<id>/texture.png`) and cannot change after creation, so the
  drawer disables the id field while editing. `validateBrushDraft` reports every problem in one pass.
- `normalizeBrushes` in `admin-demo-data.ts` (not in `admin-brushes.ts`, which imports the types) repairs a
  saved list on read: a bad id, an empty name or a duplicate is dropped, and out-of-range numbers clamp.
- Button labels use the brush **name** (`Remove Ink · round`), not the id — a CDP probe that clicks
  `Remove ink-round` silently does nothing.

## Print method rules (`apps/web/src/lib/print-quality.ts`)
- `checkDesignQuality(design, method)` takes the order line's `printMethod` through `printMethodOf`;
  without a method it runs only the plain checks, so old orders and unknown methods never gain warnings.
- `PRINT_METHOD_RULES` is the one place the tolerances live: DTF 0.1 cm edge margin and white ink yes,
  Sublimation 0.3 cm and white ink no. They are starting defaults, not measured press limits.
- A layer inside the print area but inside the margin is `edge-too-tight` (warning); a layer past the
  edge stays `outside-print-area` (error) and never reports both.
- Layer positions are artwork units: at `unitsPerCm = 10`, `x: 2` is 2 mm from the edge, not 2 cm.

## CSV export (`apps/web/src/lib/admin-csv.ts`)
- Every text cell is neutralised against spreadsheet formula injection (`=`, `+`, `-`, `@`, tab, CR get
  a leading apostrophe), because the orders export carries customer-typed names, emails and item names.
  A plain number (`-5`) and a phone number (`+95 9 …`) are left readable on purpose.
- Cells containing `"`, `,`, CR/LF or `'` are quoted and inner quotes doubled. `downloadCsv` writes a
  UTF-8 BOM first (Excel needs it for Myanmar text); `Blob.text()` strips that BOM, so a test must check
  the bytes, not the string.

## Contact inbox (`apps/web/src/lib/contact-messages.ts`, `components/admin/AdminMessages.tsx`)
- `/contact` records a message in `AdminDemoData.contactMessages`; the form shows the reference and says it
  is with the shop. The mailto button is still there, but it is no longer the only path.
- Validation lives in `contactDraftIssues` and the form and the store both use it: a refused message writes
  nothing (`submitContactMessage` returns the same object). A **claim** without a design reference is
  refused, because the takedown cannot be actioned without it.
- References come from the highest existing `#MSG-n`, so a deleted message never lets a number be reused.
- `setContactStatus` only moves forward: opening marks read, answered is final, and an answered message
  never falls back to new.
- Admin → Messages (`messages` module id) shows unread/claims/answered counts and a reply mailto with the
  reference in the subject. A claim points at Designs → take down.
- This is a browser-local record, not delivery. Real email needs §12.1.

## Size charts (`apps/web/src/lib/size-chart.ts`, `components/ProductSizeChart.tsx`)
- Stored in **centimetres**, keyed by the product's own size label, snapped to 0.5 cm; inches are derived
  for display. A blank cell clears that measure and an emptied size disappears, so "no chart" and "0 cm"
  never look alike.
- Nothing is seeded. `sizeChartIsEmpty` drives the "not published yet" panel — do not fill in a
  placeholder chart, a wrong chest measurement is a returned garment.
- The admin drawer always renders all four measure columns; only the public table drops columns
  (`sizeChartMeasures`). Collapsing the editor columns mid-typing makes the next input vanish.
- `/size-guide` renders `SizeChartLibrary` (works today, reads the admin store). The product page's Size
  tab reads the chart by **product id**, but storefront ids come from Supabase while the chart lives in the
  browser-local admin store, so that panel says "not published" until P0-1 gives both the same ids.

## Stock and sales (`apps/web/src/lib/stock-movement.ts`)
- The owner's decision (2026-11-21) is that Inventory is **blank-garment stock** and does not cap sales, so
  a sale leaves it alone. `settings.deductStockOnSale` ships **false** and `syncStockWithStage` returns the
  data untouched when it is off — do not "fix" that by defaulting it on.
- When it is on, `consumeStock` stamps `stockConsumedAt` + `stockTaken` on the order and `restoreStock` clears
  the stamp, so a replayed payment cannot take twice and a re-payment after a refund takes again. Stock is
  clamped at 0 and the gap is recorded in `stockShortfall` ("restock before printing"), never hidden.
- `applyPaymentStatus` (checkout), the admin drawer's advance/cancel and the approved-refund path all call
  `syncStockWithStage`, so no path can move the stage without the rule seeing it.
- Seeded orders do not consume stock (they were seeded, not sold), so a fresh demo store keeps the seed
  quantities even with the switch on.

## Customer points (`apps/web/src/lib/loyalty-ledger.ts`)
- `data.loyalty` is the **economy** (daily grant, expiry, per-piece rate, tiers, milestones); `data.loyaltyLedger`
  is the shopper's events. Never store a running total — expiry, refunds and corrections need the entries.
- The daily grant is keyed to the **Yangon** day (`loyaltyDayKey`), not UTC, or a shopper in Yangon gets it twice.
- `awardPurchase` is idempotent per `orderId`; `applyPaymentStatus` in `lib/checkout.ts` awards on a paid
  status and reverses on a refunded one, so checkout, webhook and the admin refund cannot disagree.
- The account page reads the clock in an effect (`now` state) so the server render and the first client
  render agree; the ledger is empty on both, so the points read 0 until the browser has the store. Use an
  epoch fallback for `pointsBalance`, never `new Date()` during render.
- The section button is labelled from i18n: the points tab is **"AI Points"** (badge shows the balance), and
  orders is **"Order History"**.

## Refund requests (`apps/web/src/lib/order-refunds.ts`)
- The customer asks from Account → **Order History** (the tab label comes from i18n `account.orders`, so a
  probe must match "Order History", not "My Orders"), on the order card itself; the admin answers in the
  order drawer (`data-order-refunds`).
- `REFUND_REASONS` must stay equal to what `/returns` publishes — misprint, wrong colour/size we sent,
  damaged, never arrived — and must never gain "change of mind".
- `refundBlocker` gates the ask: unpaid, cancelled and refunded orders explain why, and one open request at
  a time. `decideRefund` requires a reply to decline and sets `stage: "Refunded"` on approval, which is the
  stage every revenue figure already excludes.
- Requests live on `AdminOrder.refundRequests` and are repaired on read by `normalizeRefundRequests`.

## Attribute cascade (`apps/web/src/lib/attribute-rules.ts`)
- Rules are `{ target, source, value, allowed }`, stored in `data.attributeCascade`, seeded with the four
  documented §4.1 rules. `cascadeAllows`/`cascadeOptions` narrow a list; `isValidCombination` and
  `combinationsFor` take the rules, so the pricing grid cannot disagree with Attribute Management.
- The chain's column order does **not** decide what narrows what — the rules do. Validation only checks
  that both keys exist, the values are real options, and `allowed` is non-empty.
- An empty rule list is a deliberate "nothing is narrowed"; only a **missing** field means an old draft
  and reads as the defaults (`cascadeRules` uses `??`, not `?.length`).
- `setCascadeAllowed` refuses a change that hides every value or orphans a price row, and removes the rule
  entirely when every value is offered again, so the stored list stays minimal.
- The seeded chain order is `size, material, knit, fit, color, …` with `print` **disabled**, so a UI that
  walked adjacent chain entries would show no print → material rule. Build the matrices from the rules'
  own (source, target) pairs.

## Flip lives in the Adjustments panel (`EditorAdjustmentsPanel.tsx`)
- Owner decision 2026-11-22: Flip is not in the Tools bar. The two buttons sit at the top of the panel's
  **Appearance** section and keep the `Flip horizontal` / `Flip vertical` labels the tests find them by;
  they are disabled while the layer is locked, matching the guard in `flipSelectedLayers`.
- `EditorCanvas` passes `onFlip={flipSelectedLayers}` to the panel, not to the tools bar; the bar no longer
  has `canFlip`/`onFlip` props.
- To reach the buttons in a browser probe: "Expand Layers panel" → "Open Adjustments panel" → the
  "Appearance" section header. Clicking Flip sets the tools-bar status line ("Flipped horizontally"), which
  is the cheapest end-to-end proof; an empty layer returns early, so the status stays empty.

## Asset issues route (`app/api/assets/issues/route.ts`)
- The static `issues` segment wins over `[kind]`, so `/api/assets/issues` is not read as a kind; a kind
  named "issues" would be shadowed (no such kind exists).
- The report is built only from the snapshots the rebuild wrote — never from the bucket directly — and
  carries no timestamp of its own so an unchanged bucket can answer 304.
- `tests/asset-routes.test.cjs` covers the report, the "no snapshot" and "no bucket" wording, and the
  304/changed-etag pair.

## Admin forms and the hydration snapshot (`apps/web/src/lib/admin-demo-store.ts`)
- `useAdminDemoData` is `useSyncExternalStore(subscribe, readAdminDemoData, readSeedSnapshot)`, so the
  first client render (hydration) sees `createAdminDemoData()`, not this browser's saved data. A
  `useState(data.settings)` seeded from that render pins the **seed** values forever, and the next Save
  writes them back over what was stored. `AdminSettings` now keeps a `draft` that starts `null`
  (`const form = draft ?? data.settings`) and clears on save/reset. Verified in Chromium: save ->
  reload shows the saved name and rate, a second save of another field no longer reverts them, and
  "Reset demo data" returns the seed values.
- Any other admin form that needs to show stored values must derive them from `data`, not seed state
  from it on mount.

## Press sheet on a phone (`apps/web/src/lib/order-print.ts`)
- `openPrintableDocument` uses `window.open("", "_blank")` + `document.write`; a blocked popup falls back
  to downloading the HTML. Measured in Chromium at 390x844: a real click opens the tab and the sheet has
  no sideways scroll (390/390, widest element 378 px) thanks to the viewport meta, the
  `@media (max-width: 640px)` stack and the in-page "Print this sheet" button (hidden under `@media print`).
- A `Runtime.evaluate` click has no user activation, so `window.open` returns null there and you get the
  download fallback. Drive the button with `Input.dispatchMouseEvent` when testing the popup path.

## Header switchers (`apps/web/src/components/HeaderActions.tsx`, `MobileNav.tsx`, `SwitcherIcons.tsx`)
- **Owner request 2026-11-21: icon-only.** The `EN / MM` and `Ks / $` text pills are gone on purpose and
  `tests/canvas-shell.test.cjs` fails if they come back.
- Header: two 22px circle buttons. The language button shows the **active** flag (Union Jack for `en`,
  Myanmar tricolour for `my`, both hand-drawn in `SwitcherIcons.tsx`); the currency button shows a
  `Banknote` for `Ks` and a `CircleDollarSign` for `USD`. Tapping toggles.
- Drawer: two flag buttons with `aria-pressed` and an accent ring on the active one, and a currency row
  whose icon carries the state.
- The earlier "never use an icon" rule was about a *single* icon that looked identical in both states —
  that reads as decoration. The current icons change with the state, and each control still carries
  `aria-label` + `title` naming the current value and `data-header-language` / `data-header-currency`.
  Keep all three or the state becomes invisible again.

## Editor draft restore (`apps/web/src/lib/design-draft.ts`, `EditorCanvas.tsx`)
- The draft payload is `{ layers, placement }`; `placement[id] = { offset, scale, rotation }`. `readDesignDraftSnapshot()` reads it, `saveDesignDraft(layers, placement)` writes it.
- The editor restores the draft in a **post-mount effect**, not a state initialiser: the server render and the first client render must stay identical or hydration mismatches. That is why the effect carries `// eslint-disable-next-line react-hooks/set-state-in-effect`.
- `designLayersHaveArtwork()` gates the restore, so a draft holding only blank layers still opens on one blank layer. A refused write shows the storage notice once (`draftWarningShownRef`).
- `tests/editor-touch.cjs` clears `local_storage` for the origin at the start of every `load()`: with the restore in place, sections would otherwise inherit the previous section's layers and `[aria-label="Select Layer 1"]` would not exist.
- `tests/product-mockup.test.cjs` asserts the draft call site by regex; changing the debounce body means updating that test too.

## Font library (`apps/web/src/lib/editor-fonts.ts`, `editor-font-library.ts`)
- The picker's fonts come from `<NEXT_PUBLIC_R2_PUBLIC_URL>/fonts/manifest.json`. No bucket address, a missing manifest or a broken one all end as an empty list, and `EDITOR_SYSTEM_FONTS` (the original eight) is shown instead — so nothing on screen changes until fonts are uploaded.
- A layer stores the family **name** (`text.fontFamily`), and a manifest font loads as `@font-face` with `font-family: '<name>'`. Do not rewrite stored designs to a new family string.
- `parseEditorFontManifest` skips an entry (naming it in `skipped`) when the slug is not lowercase-dashed, the name is missing or duplicated, the shelf is unknown, no file is a bucket-relative `.woff2`, or there is no licence.
- Only fonts used by a text layer are fetched: `fontsInUse()` matches the first family of the CSS stack, ignores disabled fonts (their layers fall back to the stack) and `applyEditorFontFaces` never injects the same slug twice.
- `unicode-range` splits Latin and Myanmar, so a large Myanmar file downloads only for Myanmar text.
- The download embeds the used fonts: `designExportFontCss()` fetches each used woff2 and `designExportDocument({ fontCss })` puts the rules in `<defs><style><![CDATA[...]]></style></defs>` before the artwork. The PNG is rasterised through an `<img>`, which cannot fetch a font, so without this the customer's file would paint a fallback. A file that fails to download is skipped, never fatal.
- An open Font section loads one file per font so each row paints in its own face (`previewFontFile` → `applyEditorFontPreviews`, keyed `<slug>#preview` so the full load later still adds the other weights). Nothing is fetched while the section is closed and the artwork uses no hosted font.
- Before an upload, `npm run fonts:check -- path/to/fonts` runs the same parser over a local copy of the folder and reports dropped entries, listed-but-absent files and files over 1 MB; it exits 1 so it can gate the upload. Pass either the bucket root or the `fonts/` folder — both resolve.
- Still open: the R2 upload + CORS rule, licence checks, embedding (or outlining) in the press bundle SVG, and the admin-driven list.

## E4 / E6 helpers are groundwork only (plan decision)
- `apps/web/src/lib/editor-align.ts` and `editor-snap.ts` are pure and unit-tested, but **nothing calls them yet**. The owner decided (2026-11-21) that align and snap target the per-mockup design areas, and both items wait for that discussion. Do not wire them to `ARTWORK_PRINT_AREA` or any panel control before that decision; it was wired once and reverted for exactly this reason.

## Pushing from this workspace (important)
- The ambient `GITHUB_TOKEN` and the git credential helper token are the **same GitHub App
  installation token** (`x-oauth-client-id: Iv23lizrrwLGm04hszl7`), and it has **read-only
  Contents**. `git push` fails with `403 ... denied to mhfashion`, and the REST write
  endpoints (`POST /git/refs`) also return `403 Resource not accessible by integration`.
- `git fetch` and the read APIs work fine, so local branches can be kept current with
  `origin/main`, but a push needs a token with `Contents: write` (or a human pushing).
- A PAT pasted into chat on 2026-11-21 (`github_pat_11CNAE4QQ…`) was rejected by
  `GET https://api.github.com/user` with `401 Bad credentials`, and `git push` with it returned
  `Invalid username or token` / `403`. Treat a pasted token as unusable until the API accepts it.
- To push without persisting the credential, pass a write-capable token inline and leave
  `origin` alone, so the read-only URL in `.git/config` is never overwritten:
  `git push "https://x-access-token:$TOKEN@github.com/mhfashion/mhfashion.git" HEAD:main`
- The owner supplied a fine-grained PAT with `Contents: write`. It lives **outside the repo** at
  `~/.mh_push_token` (mode 600) and is used through `~/push-mhfashion.sh`, which pushes
  `HEAD:main` with the token inline. Never copy the token into a tracked file, and do not print it.
  PATs expire: if the push returns `401 Bad credentials`, ask the owner for a fresh one.
- `GET /repos/mhfashion/mhfashion` reports `permissions: {admin, maintain, push, ...}: true` for the
  ambient token, but every write still fails (`git push` → `403 denied to mhfashion`,
  `POST /git/refs` → `403 Resource not accessible by integration`). Do not trust that field; test a
  write before promising a push. `-c credential.helper=` does not help, so it is not the helper.
- A **fine-grained PAT with `Contents: Read and write`** does work for `git push` when passed inline
  (`https://x-access-token:$PAT@github.com/...`). It does **not** allow `POST /pulls` — that needs
  `Pull requests: Read and write` as its own fine-grained permission, and without it the API answers
  `403 Resource not accessible by personal access token`. `create_pr` uses the ambient read-only token
  and fails the same way. So open the PR *before* fast-forwarding `main`, or ask for the extra scope.
- Never `git reset --hard origin/main` without a `git fetch` first: the tracking ref lags, and the
  reset silently drops local commits that were already pushed (recover them from the pushed branch).

## Editor Header Bar 2 (`apps/web/src/components/EditorHeaderBar2.tsx`)
- Shared geometry constants keep the Product / GSM / Color / Size / Save / Buy boxes uniform: `FIELD_BOX`, `TRIGGER_BOX`, `ACTION_BOX`, `MENU_BOX`, `MENU_OPTION`, `COLOR_SWATCH`.
- `BoxDropdown` renders its panel through `createPortal` (so the scrollable bar cannot clip it) and sizes the panel to the trigger box width, clamped to the viewport.
- The chevron is absolutely positioned at `right-1.5` and vertically centred so it sits in the same place on every box.
- The Color swatch is a 20x20px rounded square (`rounded-md`), used in both the trigger and the dropdown options.
- Selecting an option updates the price immediately (`data-editor-price`).

## Editor layers and tools outside the print canvas
- Move/resize/rotate on the print canvas use `toCanvasPointUnclamped` in `EditorCanvas.tsx`; the drawing tools use `toCanvasPoint`, which is unclamped too, so a stroke can be painted on the pasteboard around the print area.
- The pasteboard (`[data-editor-pasteboard]`) is measured from the visible viewport and applied as a percentage rect of the canvas box (`PasteboardRect`), so a brush/pencil/pen/shape/gradient/eraser/text gesture can start anywhere the user can see. It used to be a fixed `-inset-24` ring, which silently dropped strokes started further out.
- It is re-measured on `resize`, viewport `scroll`, a `ResizeObserver` on the viewport, and the effect deps (`activeTool`, `zoom`, `pan`, `nodePositions`, `menuOpen`, `visibleMockups`), so zooming, panning, adding a mockup, or opening the menu cannot leave the surface behind.
- On a coarse pointer the surface stops at `PASTEBOARD_TOUCH_RING_PX` (96 local px) around the canvas: a viewport-wide `touch-none` element would swallow the scroll gesture that reaches the mockups. Verified at 390x844 — the pasteboard rect is exactly canvas ± 96.
- The mockup `<section>`s are later siblings at the same z-index, so they still paint above the pasteboard and keep their own input; a Brush press on a mockup creates no stroke.
- A transparent `<rect aria-label="Move selected layer">` overlays the selection outline so a layer parked off-canvas is still grabbable (the artwork itself renders `pointerEvents="none"`).
- `CANVAS_LAYER_TRAVEL_LIMIT` (2400 artwork units) bounds how far a layer can be dragged, so it stays reachable; the pasteboard is clamped to the same limit.
- `MockupArtwork` now receives `layerOffsets`/`layerScales`/`layerOrigins`/`layerRotations` and mirrors the canvas, then clips the artwork to the print area with a `clipPath` in overlay coordinates (`printScale = BASE_ARTWORK_SCALE * safeTransform.scale`). A layer dragged off-canvas therefore disappears from the mockup exactly as it would print.

## Phone and touch checks (`tests/editor-touch.cjs`, 16 sections)
- `EDITOR_CDP_URL` (default `http://127.0.0.1:9222`) must point at the Chromium started with `--remote-debugging-port`; the suite needs a server on port 3000.
- `denseDesign()` covers 25 layers, the 30-step undo floor, a second finger placed mid-stroke, and a portrait→landscape rotation.
- Every pointer handler guards `!event.isPrimary`, so a second touch cannot take over; the check asserts one stroke and ink no taller than the pencil width.
- In landscape the canvas is legitimately **below** the fold: the editor viewport scrolls internally, so assert reachability with `canvasRect.bottom - viewRect.top <= view.scrollHeight`, not against `innerHeight`.
- Tool button labels are `Move`, `Hand tool`, `Pencil tool`, `Pen tool`, `Text tool`, `Brush`, `Eraser tool`, `Shape tools`, `Gradient tool` — `Brush` has no "tool" suffix.
- The run ends with a console guard: `Runtime.enable` is on, every `Runtime.exceptionThrown` and every `console.error`/`console.assert` is collected, and the last section asserts the list is empty. A production React build reports a caught render error through `console.error`, so this is what catches a broken panel. Proved by throwing `Error("guard probe: uncaught")` and calling `console.error("guard probe: logged")` in the page: both are captured.
- Network noise is deliberately not collected (`Log.entryAdded` is off), so an optional asset that 404s does not fail the run.
- `Save` and `Buy` are `disabled` until accounts and payment exist (E1), so a sweep must not treat their dead state as a defect.

## Testing pitfalls
- `next start` keeps the port after a rebuild: a stale `next-server` will serve an old build. Kill the process holding port 3000 (`/proc/*/cmdline` contains `next-server`) before restarting, or your CDP probes test stale code.
- `next dev` blocks cross-origin `/_next/*` resources requested from `127.0.0.1` (it logs `Blocked cross-origin request to Next.js dev resource /_next/hmr`). The page then renders the server HTML but never hydrates, so clicks, effects, and `useState` do nothing — which looks exactly like a broken feature. Drive CDP probes at `http://localhost:3000` (or add `allowedDevOrigins`).
- When measuring on-screen glyph ink against the transform box, hide `[data-editor-transform-controls="true"]` first; the resize-handle squares otherwise pollute the dark-pixel bbox.
- In CDP drag tests, check the target point is not covered by another panel (e.g. the mockup panel on the right of the canvas). Use `document.elementFromPoint` to confirm.
- `getBoundingClientRect()` on `[aria-label="Move selected layer"]` returns the **axis-aligned** box of a *rotated* rect, so it is legitimately larger than the ink's own AABB. On a rotated layer assert containment only; tightness is only meaningful at rotation 0.
- A phone screenshot is in device pixels when `deviceScaleFactor: 2`, so multiply the CSS rects by `screenshotWidth / window.innerWidth` before comparing them with pixel scans.
- Hide `[data-editor-transform-controls]` in **both** shots of a frame difference, and toggle only the glyph `<text>` elements. Toggling the whole layer group also repaints the Layers-panel thumbnail, and rotating a layer promotes a compositing layer whose anti-aliasing shifts across the entire canvas, either of which swamps the glyph diff.
- Resize handle names are `top-left` / `top-center` / `top-right` / `middle-left` / `middle-right` / `bottom-left` / `bottom-center` / `bottom-right` on `[data-resize-handle]`; there is no `right-center`.
- On a phone the Layers dock is closed, so there are no `aria-pressed` rows to read. Identify the selection from the `[aria-label="Move selected layer"]` box geometry instead.

## Undo snapshots
- `rememberLayerSnapshot()` must be called by every **discrete** layer mutation, or a mis-tap cannot be undone and `Ctrl+Z` silently reverts an older paint instead. The layer-housekeeping paths (add, delete, duplicate, rename, reorder, group, mask add/remove, visibility/lock) each call it; continuous controls (opacity/fill/blend sliders, move/resize/rotate) deliberately do not.
- The stack keeps 30 snapshots (`slice(-29)` plus the new one). Verified in `tests/editor-touch.cjs`: 35 pencil strokes then 40 `Ctrl+Z` presses leave exactly 5 strokes.
- A pencil stroke paints **two** `[data-editor-artwork-stroke="true"]` elements, so count strokes as `elements / 2` when asserting.

## The stored draft is untrusted input
- `readDesignDraftSnapshot` runs every layer through `sanitizeDesignDraftLayers` (`lib/design-draft.ts`).
  Before that, three corrupt drafts white-screened `/create` with "This page couldn't load" until storage
  was cleared: a `null` layer, `strokes: [{ points: "nope" }]`, and `shape.paths: [null]`.
- Rules: a layer needs a non-empty string `id`; a `text` layer needs `text.value` string and a positive
  `fontSize`; a `shape` layer needs at least one path with two usable points; an `image` layer needs
  `image`. Strokes and paths keep only points that are finite **numbers** (`JSON.stringify` turns `NaN`
  into `null`, so `Number(null) === 0` must not sneak a point through). An unknown `kind` from an older
  build is treated as `artwork`, and a layer that paints nothing is kept as the editor's blank layer.
- `designLayersHaveArtwork` also tolerates a `null` entry, because the product page feeds it the draft.

## Drawing with no layer
- `startArtworkStroke` used to `return` silently when no layer was selected or the layer was locked, so a
  design whose layers had all been deleted looked like a broken canvas. It now sets the tools-bar notice
  (`[data-testid="editor-tools-bar"] [role="status"]`): `Add a layer before drawing.` when `layers.length === 0`,
  else `Select an unlocked layer before drawing.` — the wording the Pen tool already used. The notice has no
  auto-clear timer, so a test can read it after the stroke.
- `deleteEditorLayer` has no floor, so the last layer can be deleted; `tests/editor-touch.cjs` covers that
  path (collapse the Layers panel first, or the drag lands on the panel).

## Layer picking (canvas and pasteboard)
- A press picks the layer under the pointer, then drags it: `hitTestLayerAt` maps the point back through each layer's own move/scale/rotate (top-first, visible only), and `pickLayerAt` selects then calls `beginLayerDrag`.
- The transform box is a **solid** `rect` over the selected layer's whole area, so it also intercepts presses. `startSelectionBoxPress` hit-tests on that press too: a hit on a layer that is not already selected re-picks it, anything else drags the current selection. Without this, any layer sitting under the box could only be selected from the Layers panel.
- Both paths must keep working together. A press on the selection itself has to still drag it, so the box handler only re-picks when `!selectedLayerIds.includes(hitId)`.

## Text layers: downward writing, wrapping, and the ink-hugging box
- `editorTextLines(text)` in `apps/web/src/lib/editor-layers.ts` is the single source of painted lines: it splits on `\n` and then soft-wraps each line to `text.wrapWidth`, breaking at spaces and falling back to `editorTextGraphemes(word)` for a word wider than the limit. Fit is measured on `advance` (not ink `width`) so artwork line breaks match the browser's textarea wrapping.
- The fallback must break between **grapheme clusters**, never per code point. In Myanmar script the vowel signs, medials and the asat attach to the character before them, so `"မြန်မာနိုင်ငံ"` split per code point painted lines that began with `"ာ"` and `"်"` — marks hanging off nothing. `editorTextGraphemes` segments with `Intl.Segmenter` and then merges a cluster that opens with a combining mark back into the previous one, because UAX #29 puts a Myanmar spacing mark such as `"ာ"` (Mc) in its own cluster. Joined emoji (`👨‍👩‍👧‍👦`) also stay whole.
- Verified in Chromium: a 130-code-point Burmese word at the default 110px/880 wrap paints 10 lines of one word each, the lines rejoin to the original string, and no line starts with a combining mark, in all three renderers (canvas, mockup, preview).
- Every renderer must use it: `EditorLayerPreview.tsx` and the inline editor in `EditorCanvas.tsx` both do. Do **not** reintroduce `text.value.split("\n")` — that paints a long line as one unbroken run straight off the canvas.
- New text gets `wrapWidth: DEFAULT_TEXT_WRAP_WIDTH` (880) from `addCanvasTextLayer`. Older layers have no `wrapWidth` and stay unwrapped, so existing artwork is not reflowed.
- The inline editor's `foreignObject` height uses the wrapped line count and its width uses `wrapWidth ?? TEXT_EDIT_BOX_WIDTH`. Sizing from the newline count clipped soft-wrapped lines below the box, which read as "typing stopped working".
- The inline editor is wrapped in `<g transform={editingTextLayerTransform}>` because it is a sibling of the artwork layers and must carry the same move/scale/rotate.
- `editorTextCanvasBounds` composes wrapping with effects (`editorTextPaintPadding`) and decorations (`editorTextDecoration`), so shadows/outlines stay inside the transform box.

## Testing notes (headless CDP pixel checks)
- Measure ink against the **white print canvas only**: the page around it is near-black, so any padding in the screenshot clip is read as ink and inflates the box.
- Load a fresh page per measured layer; leftover layers from an earlier step join the measured ink.
- The editor has no tap-empty-space-to-deselect gesture (it never did), so do not assert it.

## Text ink extents (why italic used to overflow the box)
- `editorTextLineMetrics` reports two horizontal boxes per line: `width`/`advance` (the layout
  box used for wrapping and `text-anchor`) and `inkLeft`/`inkRight` (the paint, relative to the
  line's origin). The Free Transform outline uses the **ink** pair.
- Italic glyphs slant past the layout box, so Chrome reports a positive `actualBoundingBoxLeft`
  and the paint starts left of the anchor. Measuring the advance width alone cut the outline
  through the first glyph. Same for a trailing `letter-spacing`, which adds advance but no ink.
- `editorTextMetrics` unions each line's ink around that line's own origin
  (`-advance`, `-advance/2` or `0` depending on alignment) before taking the min/max. Do not
  substitute `width` for `inkRight` there; that reintroduces the right-hand gap.
- `editorTextPaintPadding` consumes `inkLeft`/`inkWidth`, so effects and decorations keep
  building off the same ink box. Keep it that way or shadows drift off the glyphs.
- Both extents fall back to the advance box when the canvas metrics API is unavailable
  (Node, SSR), and the test stubs deliberately omit `actualBoundingBoxLeft/Right` to cover it.

## Super Admin workspace (`apps/web/src/components/admin`, `apps/web/src/lib/admin-demo-*`)
- `/admin` is a preview workspace, not a security boundary. The plan keeps public registration
  closed (`/admin/register` does not exist), but `/admin/login` sets up the single browser-local
  demo account when none exists (`needsSetup` in `AdminAuthPanel.tsx`). Without that first-run
  form a fresh browser could never reach `/admin`, because the session gate redirects there.
- Modules: `/admin` (dashboard), `/admin/orders`, `/admin/products`, `/admin/inventory`,
  `/admin/customers`, `/admin/designs`, `/admin/promotions`, `/admin/reports`, `/admin/settings`.
  Every page is a thin server file rendering a `"use client"` component; add new routes to
  `apps/web/public/manus-routes.json` and to the expected list in `tests/guide-http.test.cjs`.
- One store drives them all: `lib/admin-demo-data.ts` (types, seed, pure helpers, localStorage)
  plus `lib/admin-demo-store.ts` (`useAdminDemoData()` over `useSyncExternalStore`,
  `updateAdminData(fn)`). Key: `mh-fashion-admin-demo-data-v1`. Do not give a module its own
  copy of orders or stock — the dashboard, reports and inventory must agree.
- `admin-demo-data.ts` must stay import-free so `tests/admin-demo-data.test.cjs` can transpile it
  and run it under `new Function` (React lives in `admin-demo-store.ts` for that reason).
- Customers are derived from orders (`aggregateCustomers`) rather than stored; there is no
  separate customer record yet, and cancelled/refunded orders count as orders but add no revenue
  (`isSettledOrder`).
- `AdminShell.tsx` owns the sidebar, header and session gate. Its `title` accepts a string or
  `(admin) => string`; the page component itself cannot read a context provided inside the shell,
  so pass a function instead of calling a hook in the page for the admin's name.
- `AdminUi.tsx` holds the shared atoms (`AdminCard`, `AdminButton`, `AdminBadge`, `AdminField`,
  `AdminDrawer`, ...). `AdminInput` is `w-full`, so wrap it in a fixed-width div for compact
  numeric cells instead of adding `w-20` (Tailwind resolves the conflict by stylesheet order).
- Destructive actions are two-step inline (`confirmId` state), not `window.confirm`, so the
  headless CDP probes can drive them.
- Verify with `npm run test:admin-data` (13 tests) and the full `node --test tests/*.test.cjs`
  suite (135 tests, needs a server on port 3000 for `guide-http`). A browser pass means:
  first-run setup on `/admin/login`, advance an order, create a product, `+10` a stock row,
  create a promotion, save settings, add a team member, then reload to confirm persistence.

## Rate limiting (`apps/web/src/lib/rate-limit.ts`)
- `enforceRateLimit(request, bucket, rule)` returns a `429` (`Retry-After`, `{"error":"rate_limited"}`)
  or `null`. Call it at the top of a route handler, **before** reading the body; `clientKey` reads
  `cf-connecting-ip`, then `x-forwarded-for`'s first hop, then `x-real-ip`.
- Budgets in `RATE_LIMITS`: intent 10/min, simulate 20/min, status 120/min, webhook 60/min. The
  expensive create is tightest; the provider callback must tolerate retries, so it is loosest.
- The counter is per worker instance (module memory, swept past 5,000 buckets). A durable limit
  needs KV or a Durable Object; do not describe this one as global.
- `tests/rate-limit.test.cjs` also greps each route to prove the guard sits before the body read.

## Print-sheet QR and the admin deep link
- `orderQrPayload(id)` is `<origin>/admin/orders?order=<encoded id>`, or `MH Fashion order <id>` when
  `NEXT_PUBLIC_SITE_URL` is unset. `qrSvg` draws the modules as one `<path>` with
  `shape-rendering="crispEdges"`; `order-print.ts` renders it as `figure.qr` in the sheet header.
- The `qrcode` package is only reachable from the admin bundle (`order-print.ts` → `AdminOrders`).
- `AdminOrders` opens the drawer from `?order=` in a mount effect (a `useState` initializer would
  disagree with the server render). `AdminShell` forwards the requested URL to
  `/admin/login?next=…`, and `AdminAuthPanel.safeAdminNext()` only accepts `/admin…` paths.
- A drawer only opens for an id that exists in the store; an unknown id leaves the board closed.
- Verified by decoding the generated sheet with jsQR in Chromium (not by eyeballing it).

## Store snapshots and hydration
- `useAdminDemoData` must pass a *separate* cached server snapshot (`readSeedSnapshot`), not
  `readAdminDemoData`: the browser snapshot contains saved orders, so using it for hydration made
  React discard the server HTML and re-render, which appended a second copy of the root layout's
  JSON-LD scripts on `/account`. Symptom to watch for: `document.querySelectorAll('script[type="application/ld+json"]')`
  returning double the server count.

## Storefront E2E (`tests/storefront-e2e.cjs`)
- Needs the production server on 3000 and Chromium with `--remote-debugging-port=9222`; run
  `node tests/storefront-e2e.cjs` (or `node --test`). It clears the browser store first, so the
  order counts are exact and reruns match.
- Seed the cart from a page that is *not* `/checkout` (navigating to the URL already open does not
  remount the cart provider), and clear `sessionStorage["mh-fashion-checkout-key"]` between orders
  or the page shows the previous confirmation instead of the form.
- Test module loaders for `order-print.ts` must resolve `@/…` and pass bare specifiers to `require`,
  and compile with `esModuleInterop: true` (the `qrcode` default import needs it).

## Print quality checks (`apps/web/src/lib/print-quality.ts`)
- `checkDesignQuality` reads a saved `AdminOrderDesign`, so the press sheet, `manifest.json` and the
  archive README all report the same list; `orderQualityIssues` de-duplicates by file name because one
  design can sit on several lines.
- Two checks: a layer whose **rotated** corner box leaves the print area is an `error`, and artwork under
  3 mm on a side or 0.2 cm² in total is a `warning`. Do not raise the tiny threshold back to 5 mm — a
  5 mm wordmark prints fine and the demo orders flagged it as a false positive.
- The box is computed the way `designLayerSvg` draws it: `x/y` is the top-left of the unrotated box and
  rotation happens about the box centre, so a rotated layer can reach past its unrotated box.
- A low-resolution photo warning is **not** possible yet: `AdminDesignLayer` stores no pixel size, so the
  editor's save path would have to carry it (that touches `/create` and needs owner approval).

## Guide page (`apps/web/src/components/guide/GuideCard.tsx`, `app/guide/page.tsx`)
- A guide card is a **square product tile**: `aspect-square`, `rounded-xl border border-border
  bg-bg-surface p-1.5 sm:p-2.5`, cover with the category pill and read time, a two-line title, one meta
  row. The grid is the product grid (`grid-cols-2 sm:grid-cols-3 xl:grid-cols-4`). The old
  `aspect-[1.9/1]` cover band plus excerpt made every card twice the height of a product card; do not
  bring either back. `tests/guide-card.test.cjs` fails if you do.
- Guide copy must describe the code that works. The editor's Save and Buy boxes are **disabled**
  (`EditorHeaderBar2`), so the editor article says the draft saves in the browser and the order is placed
  from the product page. Do not write "planned" articles: `editor-guide` replaced
  `the-planned-editor-flow` for that reason, and the article banner now reads "Where a feature is still
  being built, this article says so".
- The Editor Guide is linked from the guide menu box (desktop nav row) and the phone shortcut row as its
  second chip, both marked `data-guide-editor`. Because that link is on every guide page, the HTTP test
  strips those anchors before counting article links; a new always-visible `/guide/...` link needs the
  same treatment or the category-filter assertions break.
- The guide hero is deliberately short (`min-h-[96px] sm:min-h-[124px] lg:min-h-[132px]`). Do not raise it
  back to the old 196px/`text-5xl` banner; `tests/guide-card.test.cjs` fails if you do.

## Checkout address memory (`apps/web/src/lib/delivery-address.ts`)
- There are still no server-side customer accounts (`lib/my-orders.ts` says so), so the delivery address
  is remembered per device in `mh-fashion-delivery-address-v1`. `CheckoutClient.tsx` hydrates from
  `readSavedAddress()`, else from `lastOrderAddress(data.orders)`, and re-saves after a successful order.
- When an address is on file the five fields are replaced by `[data-checkout-saved-address]`; the
  `Change` button (`[data-checkout-address-change]`) opens them prefilled and
  `[data-checkout-address-cancel]` restores the card.
- `tests/storefront-e2e.cjs` must keep clicking `[data-checkout-address-change]` inside `fillCheckout`,
  and its `resetBrowser` must clear the address key, or the second checkout in a run has no fields to fill.

## `/mh-fashion` category row
- The category strip is icon-only on purpose (owner request 2026-11-21): six 44px round buttons, active one
  filled with `bg-accent`. Do not bring back the labels or the old 48/22/9/7/6/4 counts — they were static
  and disagreed with the product count on the page. Each link keeps `aria-label`, `title` and
  `data-category`; `tests/storefront-e2e.cjs` fails if the row renders text.

## Admin: Ads module and the Jersey tab
- An ad is **media only**: `AdminAd` has `mediaType` ("image" | "video"), `mediaUrl`, `posterUrl`, `alt`,
  optional `href` and the run window — no headline/body/button (owner, 2026-11-21). The model and
  `createSeedAds()` (empty) live in `admin-demo-data.ts`, which stays import-free so tests can load it alone;
  older headline-based ads are filtered out on read.
- `lib/admin-ads.ts` holds the rules (`adStatus`, `activeAdFor`, `adDraftFrom`, `validateAdDraft`,
  `adFromDraft`, `upsertAd` / `toggleAd` / `removeAd`, `readImageFile`). `activeAdFor(ads, slot)` is the single
  "what shows now" answer — the storefront must never re-implement it.
- `AdminAds.tsx` writes through `updateAdminData`. Photos may be a `/path`, an `https://` URL or a picked file
  (≤ 900 KB → data URL); videos must be a URL (a data URL would blow up localStorage), with an optional poster.
- Storefront: `lib/storefront-ads.ts` reads only `ads` from `mh-fashion-admin-demo-data-v1` (it never seeds the
  demo store) and `components/AdSlotBanner.tsx` renders `<img>` or `<video autoplay muted loop playsinline>`,
  wrapping in a link only when `href` is set. `app/page.tsx` wraps the green hero in
  `<AdSlotBanner slot="home-hero" variant="hero">` as the fallback and mounts `<AdSlotBanner slot="home-strip" />`
  under the category row. Both banners use `object-cover`, so artwork must keep its subject centred.
- Jersey mapping is a **Posts tab**, not a sidebar entry: `AdminJersey.tsx` exports `AdminJerseyPanel`
  (body only) and `AdminPosts.tsx` renders it for `tab === "jersey"`, reading `?tab=` via `useSearchParams`
  (`app/admin/posts/page.tsx` wraps `AdminPosts` in `Suspense`). `/admin/jersey` only redirects.
- `tests/admin-ads.test.cjs` and `tests/admin-jersey.test.cjs` guard both contracts (including that the sidebar
  has no `id: "jersey"` entry); `tests/storefront-e2e.cjs` seeds a live hero ad and checks replace + restore.
- Short animations ride on the photo path: an animated GIF/WebP loops natively in `<img>`, so no video or R2 is
  needed (a 6-frame 1600x600 banner GIF is ~19 KB). `looksAnimatedMedia` / `adMediaKind` in `lib/admin-ads.ts`
  are the only label logic ("GIF" in the table, "animated photo" in the preview) — the storefront never
  special-cases animation, and `validateAdDraft` still refuses a `data:` URL for `mediaType: "video"`.
- `AdminAd.fit` ("cover" | "contain") decides cropping. `cover` fills the slot box (`object-cover`, fixed
  min-height/aspect); `contain` renders the media at its own aspect (`block h-auto w-full`) and the banner drops
  the fixed box entirely, so no crop and no letterbox bands. Use `contain` for ready-made leaderboards
  (728x90) and `cover` for artwork drawn at the slot size. The banner exposes `data-ad-fit` for tests.
- Banner places are a registry, not a hard-coded union: `AD_SLOTS` in `lib/admin-demo-data.ts` (import-free)
  holds `{ id, label, page, where, size }` and `AdSlotId = (typeof AD_SLOTS)[number]["id"]`. Add a place by
  adding an entry **and** mounting `<AdSlotBanner slot="<id>" />` on the page; the admin board is generated from
  the array, so it needs no change. Current places: `home-hero`, `home-strip`, `home-lower` (`/`), `new-top`
  (`/new`), `products-top` (`/products`), `guide-top` (`/guide`).
- `/admin/ads` is a slot board (`data-ad-slot-row={slot.id}`), one row per place, with Change/Pause/Clear in
  place and Add banner on empty rows. It edits `adForSlot()` (live → next scheduled → newest); the storefront
  must keep using `activeAdFor()` so a scheduled banner cannot leak.
- A place holds many banners. `adsForSlot()` = everything filed there (the board edits this, so paused and
  scheduled banners stay reachable); `liveAdsFor()` = enabled and inside its dates, oldest first; `adForMoment()`
  picks the one on screen. With several live banners the turn index is `floor(now / period) % live.length`, a
  function of the clock only — do not replace it with a client-side counter, or a reload restarts the cycle and
  two visitors disagree.
- The turn length is `data.adsRotationSeconds` (default 8, clamped 2-120), set from the Ads screen. The storefront
  hook re-reads the store on `storage` and sleeps until the next turn boundary, so a place with one banner does
  no periodic work.
- Editor Adjustments additions (2026-11-21): `Arrange` aligns the **painted** box, not the raw bounds —
  `placedLayerBounds` composes offset/scale/rotation and `arrangeLayerOffset` returns a new canvas offset.
  Alignment must stay offset-only: writing it into the layer's own geometry moves the artwork inside its
  transform. `Text styles` are effect stacks only (`EDITOR_TEXT_STYLES` + `textStyleEffects`), so the text
  stays editable. The photo `Frame` (corner radius + border) is drawn *inside* the image box on purpose —
  a centred stroke would paint outside the transform outline.

## Tool Options boxes (`apps/web/src/components/EditorAdjustmentsPanel.tsx`)
- Every tool has a box in the Adjustments panel (`Tool Options · <tool>`): brush/pencil settings, eraser
  settings + nib presets, pen width/cap, Text tool defaults, Shape preset grid, Move nudge pad, Gradient
  shape/preset/reverse. Hand and Remove BG still show a hint only.
- `EditorToolOptions` carries `text` (`EditorTextToolSettings`); `addCanvasTextLayer` writes those defaults
  into a new text layer (size, family, weight, alignment, letter spacing, colour, where `color: null` means
  "follow the toolbar foreground"). Existing text layers keep their own font and colour.
- `updateToolOptions` merges **each** tool group (`{ ...current.text, ...patch.text }`). The panel sends one
  field per change, so omitting the group from the merge silently resets every other field to the default —
  that is exactly how the Text box lost the size/colour that had just been picked.
- `EDITOR_ERASER_PRESETS` (Soft/Hard/Block/Fine) are patches of eraser settings, and `EDITOR_TOOL_OPTIONS_DEFAULT`
  is the reset target for the brush/pencil reset button.
- `EditorGradientToolSettings.reverse` flips the preset stops (`100 - offset`) in `editorGradientFromToolSettings`;
  the stops are re-sorted by `normalizeEditorGradient`, so the ramp is mirrored, not reordered by hand.
- `OptionGroup` wraps (`flex-wrap`) and grows to `min-h-11` under `pointer:coarse`; the preset chips, nudge
  step chips and the Toolbar colour button do the same. Verified at 390x844 touch: panel 256 px, no horizontal
  overflow, no sub-44 px target except the shared 28 px colour swatches and the pre-existing "Clear erasures"
  button.
- The Move box's nudge writes `canvasLayerTransforms` only (`nudgeSelectedLayer`), so it moves the layer on the
  canvas without touching the artwork inside its own transform; measured 50 units = 15 px on a 300 px canvas.

## Text effects and style previews (`EditorLayerPreview.tsx`, `EditorAdjustmentsPanel.tsx`)
- `EditorTextArtwork({ text, idPrefix })` is the single text renderer: `EditorLayerPreview` and the
  Adjustments style tiles both call it. A tile that re-draws an effect by hand (CSS `text-shadow` and the
  like) drifts from the canvas — that is why the old "Aa" swatch showed a shadow the canvas never painted.
- `EditorTextEffectKind` now includes `blur` (a soft copy behind the glyphs) and `gradient` (a two-colour
  fill, `color` → `color2`, painted **after** the base text so it is visible). The gradient copies are
  emitted next to the stripe copies, after `drawText("base-text")`; move them before it and the fill hides.
- `editorTextPaintPadding` must mirror that: a `blur` grows the box by `blur * 3` on all sides, a `gradient`
  grows it by nothing (it paints the ink, not past it). Forgetting the blur crops the transform box through
  the halo; adding spread for the gradient leaves a gap around the glyphs.
- `EDITOR_TEXT_STYLES` is 16 presets. `tests/editor-arrange.test.cjs` pins the exact id list and the known
  kinds, so adding a preset means updating that assertion (and a gradient preset needs a `color2`).
- The panel tracks `appliedStyle` for the pressed tile; `replaceEffectStack(effects, keepStyle)` clears it
  unless the caller is `applyTextStyle`, so editing any field un-highlights the preset.
- `NibPreview` draws a row of six dabs from size/tip/angle/roundness/softness/opacity/scatter. Preset chips
  floor the opacity at 0.5, or the airbrush (30%) chip reads as empty. Shape presets use
  `createEditorShapePaths` in a 100-unit viewBox, so the icon is the path the tool draws.
- Only one Adjustments section is open at a time (`openSection`), so a scripted check has to click the
  "Tool Options · <tool>" header before looking for the box's groups.

## Effects gallery and the removed Arrange box (`EditorAdjustmentsPanel.tsx`)
- The Adjustments panel has **no Arrange section** (removed at the owner's request; Kittl places layers with
  the canvas handles). `arrangeSelectedLayer`, `onArrange` and `arrangeLayerOffset` are gone from
  `EditorCanvas.tsx`; `arrangeLayerOffset`/`EDITOR_ARRANGE_*` still exist in `editor-layers.ts` for the
  library tests. `tests/editor-arrange.test.cjs` asserts the panel has no Arrange box, so re-adding one
  fails a test on purpose.
- Effects are listed as pictures: `EffectTile` paints `EditorTextArtwork` with a one-effect sample, and each
  stack row carries its own thumbnail. A new kind needs a default in `effectSample`/`EffectTile` or its tile
  renders as plain text.
- Two more kinds exist: `pattern` (dots/grid/checker, motif in `color`, backdrop in `color2`, `distance` is
  the tile size, `width` the grid line) and `hollow` (the base glyphs paint as an outline instead of a fill,
  so `EditorTextArtwork` swaps the base text's `fill`/`stroke` when a hollow effect is enabled).
- `editorTextPaintPadding` follows them: a `pattern` paints the ink and adds nothing; a `hollow` strokes
  `width / 2` outside the ink, so the box grows or the outline is cropped.
- The stack row is 198 px wide: a 24 px thumbnail, a name and three 24 px buttons only just fit. Growing the
  buttons back to 32 px truncates the name to "Patt…". The coarse-pointer rule still restores 40 px targets.
- Warp tiles (`TextTransformTile`) render `EditorTextArtwork` with `textTransform`, so Plain/Arch/Wave show
  the real matrix. `circle` was dropped from the UI because `editorTextPresetMatrix` returns identity for it
  — the old tile drew a CSS ring around text the canvas never bent.

## 3D text materials (`EditorLayerPreview.tsx`, `editor-layers.ts`)
- A 3D look is a stack, not a kind: a shaded `extrude` for the side, a `bevel` for the lit/shaded edges, a
  `gradient` for the face and often a `gloss` on top. `Gold`, `Chrome 3D`, `Ice`, `Lava`, `Balloon`, `Jelly`,
  `Wood`, `Marble`, `LED`, `Comic 3D` and `Isometric` (shelf `3D`) are built that way; the owner pointed at
  Vecteezy's 3D text PSD catalogue as the reference.
- `extrude` takes `color` (near the face) and `color2` (far end); `mixEditorColors` ramps the copies so the
  side shades instead of staying one flat slab. Do not paint every copy in `color` again — that was the
  "stacked paper" look.
- `bevel` paints a lit copy at `(-w, -w)` in `color2` and a shaded copy at `(+w, +w)` in `color`; its padding
  must `grow()` on **both** diagonals, or the lit edge is cropped.
- `gloss` is a `<rect>` filled with a top-down white ramp and clipped to a `<clipPath>` built from the same
  text, so it can only paint inside the glyphs. It adds no padding.
- Style presets carry `group` (`Classic` / `Fill` / `3D`) and the gallery renders one shelf per group; the ids
  must stay unique — the older layered-metal `chrome` and the new `chrome-3d` material are different looks.

## Flip, hover linking, and drawing-tool hit targets (`EditorCanvas.tsx`)
- `flipLayerPlacement(placement, axis, centre)` in `lib/editor-transform.ts` mirrors a layer about a line
  through the selection centre. A negative scale alone would flip each layer about its **own** centre, so a
  multi-layer selection flipped in place instead of as one picture: the offset is reflected too, and the
  rotation is negated so a turned layer's ink mirrors rather than spins. The toolbar buttons
  (`Flip horizontal` / `Flip vertical`) drive it and it renders as `scale(-1 1)` / `scale(1 -1)` on the
  layer group.
- Hovering the canvas draws `[data-editor-hover-outline]` (dashed) for the layer under the pointer and the
  matching Layers row gets `data-layer-hovered="true"` plus a 1px inset ring. Hover never changes the
  selection: `hoveredLayerId` is separate state from `selectedLayerIds`.
- Resize and rotate handles take presses only when the Move tool is active
  (`pointerEvents={moveEnabled ? "auto" : "none"}`). They used to sit above the pasteboard for every tool, so
  a pencil stroke that started inside a handle's hit circle resized the layer instead of painting.

## Test harness notes (`tests/editor-touch.cjs`, `tests/canvas-shell.test.cjs`)
- The Edit sidebar is `#editor-edit-sidebar`, its `aria-label` is `<Section> editor sidebar`, and on a phone
  it opens in two steps: `Expand Edit sidebar` shows the rail (`aside[aria-label="Edit sidebar rail"]`,
  buttons labelled `Open <Section> in Edit sidebar`), then a rail button opens the panel. The panel is
  `min(17rem, 86vw)` wide, so 272px at 390 — not the old 224px cap.
- Editor Header Bar 2 has ten boxes: Product, Print Method, Fabric Type, Knit Structure, MH Cuttings, GSM,
  Color, Size, Save, Buy. Phone: 112x44; desktop: 112x28 capsules with radius 9999. Only the Color box has no
  accent fill (`rgba(0,0,0,0)` + accent text), so look up its index by name instead of assuming index 2.
- Freehand strokes render as `<g data-editor-artwork-stroke="true">` (round brush dabs are circles), not
  `<path>`. Query `[data-editor-artwork-stroke="true"]`, and read the mockup's move transform from
  `svg[role="group"] g g` — the outer `<g>` is the print-area clip and never carries a transform.
- The default tool is `pen`, which only drops anchors; tests that need a stroke must click `Pencil tool`
  first. A desktop mouse stroke also needs it.
- Under CDP touch emulation a mostly **vertical** finger drag on the print canvas is claimed as a viewport pan
  (`touch-pan-y` on `[aria-label="Editor viewport"]`), which cancels the stroke: the same drag with mouse
  events paints fine. Tests stroke mostly horizontally (`strokeCanvas()`).
- Current price table: T-Shirt + 160 GSM + XL = 28,000 Ks; GSM 240 = 31,500; GSM 240 + 3XL = 33,500.

## Keyboard undo/redo and image print quality
- `lib/editor-shortcuts.ts` owns the key matrix: `Ctrl/Cmd+Z` undo, `Ctrl+Shift+Z`, `Cmd+Shift+Z` and
  `Ctrl+Y` redo, `Cmd+Y` untouched. A focused text field (input, textarea, select, contenteditable,
  `role="textbox"`) returns `null`, so typing keeps the browser's own undo. A key that is not a Latin
  letter falls back to `event.code` (`KeyZ`), which is what makes a Myanmar layout work.
- `EditorCanvas` binds it through `historyKeyHandlerRef`, rebuilt every render, so the handler always sees
  the current undo/redo stacks without re-adding a listener on every layer change.
- `lib/editor-image-ppi.ts`: ppi = 300 × the photo's own pixels ÷ (box units × 4.5), lower axis wins.
  `EditorImageContent.sourceWidth/sourceHeight` are written by the upload path; a layer without them
  reports `null` and shows no badge rather than a guess.
- CDP resize probes must click `button[aria-label="Move"]` first: with a drawing tool active the transform
  handles carry `pointerEvents="none"`, so a press at a handle paints instead of resizing. The tool button
  label is "Move", not "Move tool".

## Shape Builder geometry (`apps/web/src/lib/editor-path-boolean.ts`)
- The builder flattens every path into closed rings, splits both sides where they cross, keeps each piece
  by the side it falls on, then chains the kept pieces back into rings. `applyEditorShapeBuilderOperation`
  folds all paths on the layer (first path is the base for subtract) into one path.
- Endpoints are merged to a canonical point (0.01 unit) **before** chaining: a crossing is computed once
  from each edge and the two results differ in the last bits, so an exact-key chain walk silently drops
  the ring and the operation looks like a no-op with fractional canvas coordinates.
- Rings are oriented by nesting depth (even depth one way, odd the other) so holes cut correctly under the
  nonzero fill rule. An empty result is reported as `""` and the caller keeps the original artwork.
- Test loaders now go through `tests/helpers/load-ts-module.cjs`, which evaluates sibling `.ts` imports, so
  a lib may import another lib. Do not go back to a bare `new Function("module", "exports", ...)` loader.
- A CDP check of the builder must draw the second shape starting **outside** the first shape's transform
  box: a press inside the box drags the selection instead of starting a new shape. The Shape Builder
  section of the Adjustment box is collapsed until its header is clicked.
