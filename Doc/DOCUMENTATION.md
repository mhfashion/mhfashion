# MH Fashion — Project Documentation

**Canonical documentation file:** `Doc/DOCUMENTATION.md`
**Planning file:** [`Plan/PLAN.md`](../Plan/PLAN.md)

This file consolidates the website work log, code audit, Guide content maintenance instructions, and Admin Dashboard visual-reference notes that previously lived in separate `Doc/` and `docs/` files. The plan remains a separate, canonical file in `Plan/`.

## Contents

- [Website Work Log](#work-log)
- [Repository Code Audit](#code-audit)
- [Guide Content Operations](#guide-content-operations)
- [Admin Dashboard Visual Reference](#admin-dashboard-reference)

<a id="work-log"></a>
## Website Work Log

This log records completed website-related changes in the connected repository. Add an entry after each completed implementation or documentation task, with the date, scope, files, validation evidence, and known limitations. Code-review findings are detailed in [Code Audit section](#code-audit).

### 2026-11-14 — Add Editor Header Bar 2 placeholders

- Added a separate `EditorHeaderBar2` below the reused site Header and above the Editor workspace. The initial row contains exactly the requested `Product`, `GSM`, `Color`, `Size`, `Save`, and `Buy` items.
- These six controls are disabled placeholders only; no product selection, variant handling, saving, or buying behavior was assumed. The bar scrolls horizontally on narrow screens and is separated into its own component for the additional items the owner plans to specify later.
- Validation: all repository Node tests **26/26**, canvas-shell tests **10/10**, TypeScript, changed-file ESLint, Next.js production build, Chromium mobile/desktop interaction tests, and `git diff --check` passed. The browser check confirms all six disabled labels appear in order between the existing Header and the editor.

### 2026-11-14 — Reuse the existing web Header Bar in Editor

- Mounted the existing `Header` component above the `/create` editor workspace. Its current responsive behavior is reused as-is: mobile hamburger/logo bar on phones and the floating navigation/actions bar on desktop; no second editor-specific Header or redesign was added.
- Kept the editor inside the remaining viewport height below the Header and above the measured mobile bottom navigation. Updated canvas-shell assertions and the reusable Chromium check to verify the appropriate existing Header is visible and the editor starts below it at mobile and desktop sizes.
- Validation: canvas-shell tests **9/9**, all repository Node tests **25/25**, TypeScript, modified-file ESLint, Next.js production build, Chromium portrait/landscape mobile interactions and desktop mouse interactions, and `git diff --check` passed. The existing Header is visible above the editor at the phone and desktop browser sizes tested.
- Limitation: the existing mobile Header and bottom navigation together leave less vertical editor space on phone; this task intentionally preserves the site's current Header design and controls.

### 2026-11-14 — Phone/Mobile Editor ကို အတည်ပြုထားသော Desktop system နှင့်တူအောင် ပြင်ဆင်ခြင်း

- လက်ရှိ Desktop ဒီဇိုင်းနှင့် shared 3500/1500 px tier ကို မပြောင်းပါ။ Front/Back Artwork group တစ်ခုချင်းစီကို လက်ဖြင့် သီးခြားရွှေ့/resize ပြုလုပ်နိုင်ပြီး အကြီး tier ကို နှစ်ဖက်လုံး ပြောင်းသုံးနိုင်သည်။ Overlay ပြင်ဆင်မှုကြောင့် source strokes သို့မဟုတ် outer Mockup box မပြောင်းပါ။
- ဖုန်းတွင် blank Mockup swipe သည် workspace scroll ဖြစ်ပြီး၊ Mockup header သည် box drag surface ဖြစ်သည်။ Artwork bounds/handle နှင့် Canvas drawing surface တွင် touch gesture ကို browser scroll က ကြားဖြတ်မရအောင် သီးခြားထိန်းထားသည်။ Primary touch က gesture ကို ပိုင်ဆိုင်ပြီး secondary touch၊ cancel၊ lost capture နှင့် window blur တို့ကို ခွဲခြားပိတ်သိမ်းသည်။
- Finger-sized 44 CSS px controls နှင့် invisible move/resize hit targets ထည့်ထားသည်။ မူလ purple dots/resize circle ကို ထိန်းထားပြီး desktop ခလုတ်အရွယ် မပြောင်းပါ။ ဖုန်းအတွက် readable pixel-dimension badge နှင့် `Pan view`, Zoom `+`/`−`, `Reset view` controls ထည့်ထားသည်။ View controls သည် artwork transform မဟုတ်ဘဲ viewport state ကိုသာ ပြောင်းသည်။ Landscape တွင် desktop breakpoint ကျော်သော်လည်း touch controls/stacking ဆက်ရှိသည်။
- Zoom 25% တွင်လည်း controls နှင့် dimension badge မသေးသွားအောင် inverse-scale ဖြင့် screen size ကို ထိန်းထားသည်။ သေးငယ်သော Artwork ကို select လုပ်ပြီးနောက် move/resize hit areas မထပ်စေရန် ဖုန်း resize handle ကို သီးခြားနေရာတွင် connector ဖြင့်ပြသည်။
- Mobile bottom navigation ၏ တကယ့်အမြင့်နှင့် safe-area ကိုတိုင်းပြီး `/create` အမြင့်နှင့် root padding တွင် တစ်ကြိမ်တည်း ချန်ထားသည်။ Editor အောက်ပိုင်းကို navigation မဖုံးတော့ပါ။
- ပြောင်းလဲသည့် source: `KittlCanvas.tsx`, `MockupArtwork.tsx`, `MobileBottomNav.tsx`, `/create/page.tsx`, root layout။ `tests/canvas-shell.test.cjs` တွင် mobile regression assertions ထည့်ထားပြီး `tests/editor-touch.cjs` သည် Node 22 နှင့် local Chromium CDP endpoint ကိုသာ သုံးသည့် reusable touch integration check ဖြစ်သည်။ Dependency အသစ် မထည့်ပါ။
- Validation: Node tests **24/24**၊ TypeScript၊ changed-file ESLint၊ Next.js/OpenNext Cloudflare build နှင့် `git diff --check` အောင်မြင်သည်။ Chromium တွင် 390×844၊ 320×740 portrait touch၊ 740×390 နှင့် 844×390 landscape၊ tiny selected Artwork ကို ထပ်မံရွှေ့ခြင်း/resize၊ tier နှစ်ဖက်လုံး လွှဲပြောင်းခြင်း/release၊ pan/zoom၊ Zoom 25% screen-sized controls/readable badge၊ second-touch/cancel နှင့် desktop control-size/mouse drawing/Back resize regression တို့ကို စမ်းသပ်အောင်မြင်သည်။
- Limitation: physical Android/iPhone နှင့် iOS Safari ပေါ်တွင် မစမ်းရသေးပါ။ Artwork/state များသည် အရင်အတိုင်း page memory တွင်သာ ရှိသည်။ Native app၊ multi-touch pinch editor သို့မဟုတ် roadmap feature အသစ်များ မထည့်ပါ။
### 2026-11-14 — Phone interaction audit and copyright placement correction

- Audited the phone-visible navigation and Product Detail controls. The mobile
  header search icon now opens a real search form that submits to
  `/mh-fashion?q=...`; Product Detail Share now uses the Web Share API with a
  clipboard fallback; Size Guide and Review actions switch to their tabs; and
  Fit Type/Sleeve controls now keep their selected state.
- Replaced the no-op phone Sort button on `/mh-fashion` with the existing sort
  query link and changed the phone Filter button to a working category jump.
- Changed `CopyrightBar` to `hidden md:block`. On Phone, copyright is now shown
  only at the bottom of the mobile side drawer (`MobileNav`); the desktop
  copyright strip remains unchanged. The fixed bottom navigation still keeps
  its own safe-area/page clearance.
- Files changed: `apps/web/src/components/MobileNav.tsx`,
  `apps/web/src/components/CopyrightBar.tsx`,
  `apps/web/src/components/ProductDetailClient.tsx`, and
  `apps/web/src/app/mh-fashion/page.tsx`.
- Validation: `npm run lint --workspace=apps/web` completed with **0 errors / 25
  warnings** (the warnings are existing React effect and image warnings), the
  Next.js production build passed, and `git diff --check` passed.
- Remaining limitation: the mobile drawer still contains several future-help
  and app-download placeholder destinations; this audit did not invent those
  missing product/service pages.

### 2026-11-14 — GSM selector and quantity-aware price on product detail

- Replaced the Product Detail `Print Style` control with a compact `GSM`
  selector containing `160 GSM`, `180 GSM`, `200 GSM`, and `240 GSM` options.
- Added GSM to the current client-side variant price calculation. The displayed
  amount now multiplies by the selected quantity, whether the page is showing
  the initial catalog range or the single selected-variant amount.
- Buy Now and Add to Cart now add the selected quantity instead of always adding
  one item. The same controls work on narrow phone layouts, with the compact
  selector rows, price line, quantity control, and three action buttons kept
  within the available width.
- Updated the Specifications tab to show the selected GSM and removed the old
  Print field from that summary.
- Validation: Next.js production build, TypeScript, and `git diff --check`
  passed. This implementation is ready to be committed and pushed with the
  existing direct-to-`main` workflow.
- Limitation: variant amounts remain client-side prototype calculations because
  the catalog schema does not yet provide admin-managed per-GSM/per-attribute
  price records, and cart items still store the base product shape rather than
  a serialized variant selection.

### 2026-11-14 — Make the 3500 px artwork tier transferable

- Owner clarification: the 3500 px large tier is not permanently assigned to Front. Either Front or Back may claim it; while one side's longest artwork edge exceeds 1500 px, that side may use up to 3500 px and the other side is capped at 1500 px. If both sides remain at or below 1500 px, either may claim the large tier by resizing above 1500 px. The numeric values remain provisional, not final print specifications.
- When the large-tier owner is reduced to 1500 px or below, or its Mockup is removed, release the tier. If the tier transfers to the other side, clamp the former owner's artwork to 1500 px while preserving its center. Keep the currently displayed pixel dimensions visible while selected.
- This rule supersedes the fixed Front-3500/Back-1500 assignment in the earlier work-log entry below. Updated `Plan/PLAN.md` first, then implemented shared allocation in `KittlCanvas` and `MockupArtwork`, with a tested allocation helper.
- Validation: all 22 repository Node tests passed, including 6 canvas-shell tests and tier transfer/release cases; Next.js production build, TypeScript, modified-file ESLint, and `git diff --check` passed. A headless Chromium pointer test drew wide artwork, confirmed Front at **3500 px** and Back at **1500 px**, then resized Back past the threshold and confirmed Back changed to **3500 px** while Front changed to **1500 px**.
### 2026-11-14 — Product detail reference UI, compact sizing, and variant price display

- Reworked `apps/web/src/app/products/[slug]/page.tsx` to mount the new
  `ProductDetailClient` detail experience. The page now follows the supplied
  marketplace-style reference with a compact product gallery, thumbnails,
  rating/price area, option selectors, quantity, service benefits, details
  tabs, review summary, shipping copy, and related products.
- Preserved the three requested product actions: **Buy Now**, **Add to Cart**,
  and **Edit Design**. Buy Now adds the product and navigates to `/cart`; Add
  to Cart stays on the page and shows confirmation; Edit Design links to
  `/create?product=<slug>`.
- Reduced the main gallery progressively to a compact 280px cap on desktop and
  phone, centered it on narrow screens, removed outer wrapper boxes around the
  Size, Color, Material, Fit Type, Sleeve, and Print Style controls, and tuned
  mobile title, price, spacing, tabs, and three-button action layout to avoid
  clipping or horizontal overflow.
- Product cards still show the catalog range. The detail page keeps showing a
  quantity-adjusted range until all four required choices—Size, Color, Material,
  and GSM—are selected; only then does it display one exact-looking
  client-calculated price. The selected options are reflected in the active
  states and Specifications tab.
- Files changed: `apps/web/src/app/products/[slug]/page.tsx`,
  `apps/web/src/components/ProductDetailClient.tsx`, `Plan/PLAN.md`, and this
  documentation file.
- Validation: Next.js production build, TypeScript, and `git diff --check`
  passed during the implementation sequence. Application commits were pushed
  directly to `main`; the latest application commit is `fc42b82`.
- Limitations: the current catalog schema exposes one product image and a
  price range rather than real per-variant records, so extra thumbnails and
  option price changes are presentation/prototype states. Selected variant
  data and calculated price are not yet persisted in cart items; real
  admin-configured combination pricing remains open work.

### 2026-11-14 — Enforce provisional Front/Back artwork pixel caps

- Historical implementation before the owner's later clarification: Front was assigned the 3500 px tier and Back the 1500 px tier. This fixed side assignment is superseded; see the newer transferable-tier entry above. The output-pixel values and live-dimension behavior in this dated record describe that earlier implementation only.
- At that earlier implementation, the numeric caps were treated as provisional interim values. The later owner clarification changed the side allocation, not the provisional status of the numeric values; see the newer entry above.
- Updated the Plan after implementation to state both the one-large/one-small rule and that the numeric caps are provisional.
- Validation: canvas shell tests **5/5**, TypeScript, changed-file ESLint, `git diff --check`, and OpenNext Cloudflare Worker production build passed. Headless Chromium on the local production build drew a near-full-canvas stroke, confirmed live dimensions of **2935 × 3500 px** (Front) and **1258 × 1500 px** (Back), then dragged each resize handle well past its limit; both stayed at or under their respective caps.

### 2026-11-14 — Move and resize the whole artwork on each Mockup

- Added an interactive artwork overlay to each existing Front/Back Mockup. The full set of strokes is selected and moved as one group by dragging within its bounds; a visible lower-right handle resizes it from 0.25× to 3×. Arrow keys on the focused handle also adjust size. Front and Back transforms are independent; transforming a preview does not alter the source Canvas strokes or drag the outer Mockup box.
- Updated the Editor Plan after implementation to record this owner-requested interaction.
- Validation: canvas shell regression tests **5/5**, TypeScript, changed-file ESLint, `git diff --check`, Next.js production build, and OpenNext Cloudflare Worker build passed. A headless Chromium smoke test on the production build added Front/Back, drew on Canvas and confirmed strokes on both, then dragged and resized the Front overlay; both transforms changed as expected. OpenNext showed the existing compatibility-date advisory; no build errors.
- Deployment: commit `0572ce2` was pushed to `main`, but [Actions run #43485330098](https://github.com/mhfashion/mhfashion/actions/runs/43485330098) stopped at required-secret preflight because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are unavailable; production deployment did not run.
- Limitation: these transforms are session-only; removing and re-adding a Mockup resets its overlay position and scale.

### 2026-11-14 — Match Front and Back Mockup sizes per direct instruction

- Followed the owner's direct request rather than the previous Plan sizing language. Updated the existing mockup nodes in `KittlCanvas`: Front and Back now share the same responsive width (`min(18.25rem, 78vw)`, square box, and artwork scale (`0.82`). The older work-log entry below records the superseded larger-Front/smaller-Back behavior at that earlier commit.
- Updated the Editor Plan after implementation to record the requested same-size behavior and the instruction that direct owner directions define Editor scope.
- Validation: canvas shell **4/4**, canvas specification **1/1**, browser guards **1/1**, Guides **9/9**; TypeScript, changed-component ESLint, `git diff --check`, and the Next.js/OpenNext Cloudflare Worker production build passed. OpenNext emitted its existing compatibility-date advisory; no build failure occurred.
- Limitation: the mockups remain temporary placeholders with transient page-memory artwork; no R2 garment assets are part of this sizing request.

### 2026-11-14 — Live artwork on large Front and small Back previews

- Historical implementation: offset the Front Mockup's Back-add circle 1.25rem below the connector's centerline and added minimal black freehand drawing inside the fixed canvas. Its shared in-memory strokes render live on the canvas and every added mockup. At that earlier revision Front used a larger placeholder and Back a smaller one; later owner direction made the boxes equal-sized and the artwork tier transferable. The canvas can still be repositioned by dragging its border while the interior is used for drawing.
- Validation: canvas specification **1/1**, canvas shell **4/4**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, workspace ESLint **0 errors / 24 pre-existing warnings**, changed component ESLint clean, `git diff --check` clean. Browser pointer simulation drew a stroke and confirmed it immediately appeared on Canvas, Front, and Back at the different scales; both Back addition and its offset from the wire were visually checked.
- The stroke preview is transient for the current page only; there is no sticker library, object selection/editing, export integration, or persistence yet. A physical Phone/Mobile viewport was not available for browser verification.
- Pushed commit `540d5a8`; [Actions run #43476339108](https://github.com/mhfashion/mhfashion/actions/runs/43476339108) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. Production still shows the fixed canvas and prior connector layer, but not the new drawing synchronization or small Back preview.

### 2026-11-14 — Connect and move the canvas/mockup nodes

- Added a responsive SVG connector wire from the fixed print canvas to each added mockup. The wires attach to the nearest sides and update as the canvas or Front/Back Mockup moves, as zoom/pan changes, and when the workspace reflows. Canvas and each mockup can be dragged separately with pointer/touch input; menu and close buttons remain clickable. The existing Web/Desktop row and Phone/Mobile stack are preserved.
- Validation: canvas specification **1/1**, canvas shell **3/3**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser testing added Front and Back and confirmed two connector paths; controlled pointer drags moved the canvas and Front independently and changed the wire coordinates for both. A physical Phone/Mobile viewport could not be simulated in the available browser.
- Pushed commit `1823f35`; [Actions run #43473595690](https://github.com/mhfashion/mhfashion/actions/runs/43473595690) failed the Cloudflare secret check because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. The live page retains the fixed canvas but does not yet include the connection layer.

### 2026-11-13 — Move Back Mockup circle beside the mockup box

- Moved the circular Back Mockup control out of the title row and onto the left edge of Front Mockup, vertically centered in the gap between the canvas and box. It uses the same small filled-circle treatment as the canvas-edge control. On Phone/Mobile it stays at the side of the stacked Front Mockup box. The Front/Back close buttons remain in each box's title row.
- Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser preview confirmed the plus is beside (not above) Front Mockup and still adds Back Mockup. Phone-sized browser viewport was unavailable.
- Pushed commit `4638585`; [Actions run #43471566424](https://github.com/mhfashion/mhfashion/actions/runs/43471566424) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. The live page still has the fixed canvas but does not include the updated Front Mockup controls.

### 2026-11-13 — Correct mockup control placement and close actions

- Removed the `Front` and `Add Mockup` text row above the canvas. The canvas remains blank until **Add Mockup** is selected from the canvas-edge menu. The circular **Add Back Mockup** control is positioned at the vertical midpoint of the Front Mockup box's left side, between it and the canvas—not above the title. Clicking it adds **Back Mockup**. Each mockup box has its own `×` control and can be dismissed independently.
- Updated the responsive Plan and canvas-shell regression checks. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript and production/Cloudflare builds passed, ESLint **0 errors / 24 existing warnings**, `git diff --check` clean. Browser interaction confirmed: no initial top row, Front Mockup appears only after Add Mockup, the adjacent circle adds Back Mockup, and each close control removes only its own box.
- Mockups remain neutral temporary boxes; Cloudflare R2 assets and phone-size browser verification are still future work.
- Pushed commit `b9d997a`; [Actions run #43469933175](https://github.com/mhfashion/mhfashion/actions/runs/43469933175) failed its secret preflight because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. Production still serves the previous version: the live response has the 4500×5400 canvas but lacks the Front Mockup title and close controls.

### 2026-11-13 — Temporary Front/Back mockup boxes

- Reduced the canvas-edge circle to 14 px and moved it about 6 px away from the canvas. Selecting its **Add Mockup** option now adds a temporary **Front Mockup** box. The top **Front** row has a small circular Add Mockup control; selecting it adds a **Back Mockup** box. This interprets the requested “Font” as “Front” to pair with Back Mockup.
- Show Grid now overlays both the canvas and every added placeholder box. Placeholder boxes are side-by-side on Web/Desktop and stack in a vertically scrollable Phone/Mobile workspace. These are temporary neutral boxes only; Cloudflare R2 integration/assets are not connected yet.
- Updated the Plan and expanded `tests/canvas-shell.test.cjs`. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, `git diff --check` clean, ESLint **0 errors / 24 existing warnings**. In the browser, verified the grid stays within the canvas, Add Mockup creates Front Mockup, and the top control creates Back Mockup with grid lines also visible in both boxes. Responsive phone stacking/scroll behavior is implemented in the shared UI and covered by source regression checks; the browser session could not be resized to a phone viewport.
- Push commit `e060a54`; GitHub Actions run [#43468279642](https://github.com/mhfashion/mhfashion/actions/runs/43468279642) failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are still missing. The live `/create` response has the 4500×5400 canvas but not the new Front/Add Mockup controls; deployment did not occur.

### 2026-11-13 — Minimal canvas options and mockup removal

- Removed the always-visible mockup placeholder and the visible canvas size/DPI/format badges. The canvas remains blank and fixed; its technical metadata is retained in code, not shown as extra on-canvas copy.
- Attached the existing circular control to the canvas edge at its vertical midpoint. Its responsive menu offers **Show Grid** and **Add Mockup**. Show Grid toggles a 10-by-10 layout grid overlay on the canvas. There is no mockup on initial load; Add Mockup is shown but disabled until the owner provides the mockup behavior/details, so no mockup design was invented. The same placement/menu behavior adapts to desktop and phone layouts.
- Updated `Plan/PLAN.md`, added `tests/canvas-shell.test.cjs`, registered the test with npm and GitHub Actions. Validation: canvas specification **1/1**, canvas shell **2/2**, browser guards **1/1**, Guides **9/9**, TypeScript passed, production build and Cloudflare Worker build passed, and production `/create` HTTP smoke verified the 4500×5400 blank canvas without visible spec badges or a static mockup. `git diff --check` clean. ESLint reports **0 errors / 24 existing warnings**.
- A grid layer for mockup surfaces remains unverified because no mockup is displayed or addable yet; implement that alongside the mockup flow after the owner supplies its details. GitHub Actions run [#43465539254](https://github.com/mhfashion/mhfashion/actions/runs/43465539254) again failed its secret preflight: Actions reports both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing. The live `/create` response has the fixed canvas dimensions but still contains the old static mockup placeholder, so this latest UI change is not deployed.

### 2026-11-13 — Owner-specified blank print canvas

- Replaced the white placeholder with a native blank canvas bitmap fixed at **4500 × 5400 px**. The shared spec declares **300 DPI**, transparent PNG target, fixed size, and blank initial state. Removed the visible “T-Shirt” canvas label; the checkerboard is CSS-only and the spec badge sits outside the artwork.
- Kept the change limited to the existing shell; no editor tools, Fabric document/history model, or persistence were restored. This shell still has no PNG download/export, and 300-DPI metadata is a target declaration rather than embedded metadata in an exported file.
- Validation: `test:canvas-spec` **1/1**, browser guard **1/1**, Guide **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, ESLint **0 errors / 24 warnings**. A local production `/create` render confirmed the 4500×5400/300-DPI/transparent/PNG/fixed attributes and absence of the T-Shirt design label.
- Deployment: pushed to `main` as `311d722`; GitHub Actions run [#43462749455](https://github.com/mhfashion/mhfashion/actions/runs/43462749455) failed at the required-secret preflight because both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are absent from repository Actions secrets, so deployment was skipped. The live `/create` URL still serves the old white `T-Shirt design area` HTML and contains none of the new canvas spec values. Production remains unchanged until those secrets are configured and deployment succeeds.

### 2026-11-13 — Disable browser zoom shortcuts and page context menus

- Expanded `BrowserZoomGuard` across the website to block Ctrl/Cmd+wheel and Ctrl/Cmd `+`, `-`, and `0` browser-zoom shortcuts; page-level right-click/context menus are suppressed. Unrelated shortcuts such as Ctrl/Cmd+S and mobile touch pinch zoom remain available.
- Added `tests/browser-guards.test.cjs`, the `test:browser-guards` npm script, and a GitHub Actions test step. Updated the Plan's accessibility/safety requirements.
- Validation: browser-guard tests **1/1**, Guide tests **9/9**, TypeScript passed, production and Cloudflare Worker builds passed, ESLint **0 errors / 24 warnings**. Code is on `main` as `cdfda7d`. GitHub Actions runs [#43461041904](https://github.com/mhfashion/mhfashion/actions/runs/43461041904) and [#43461174394](https://github.com/mhfashion/mhfashion/actions/runs/43461174394) both stopped at the required-secret check: Actions still reports `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as missing, so this change has **not** deployed to production.

### 2026-11-13 — Owner-requested editor rollback

- Reverted the owner-identified editor commits `4ccc60a` and `a571080` to restore the `/create` application code to its pre-editor state at `007f286`. The responsive Fabric canvas/document/history implementation, phone editor dock/sheets, fixed-canvas settings, local editor draft migration, and editor-only tests were removed; the prior `/create` shell and app framing were restored.
- `Plan/PLAN.md` and this Doc are restored to the pre-editor planning/documentation content; the Plan continues to describe the editor as future work, not as an implemented feature.
- Validation after rollback: `npm run test:guide` **9/9 passed**; TypeScript passed; ESLint **0 errors and 24 warnings**; `npm run build` and `npm run cf:build --workspace=apps/web` passed. No production deployment or database change was performed.
- Follow-up live check: production `/create` still serves the prior deployed editor (HTTP 200; HTML contains old editor labels and `T-Shirt`), so the rollback is not yet visible on the website. GitHub Actions run [#43455369535](https://github.com/mhfashion/mhfashion/actions/runs/43455369535) failed before build/deploy because repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are missing. This environment has no Wrangler login, and GitHub CLI secret access returns HTTP 403; production remains unchanged until authorized deployment credentials are configured.

### 2026-11-13 — Plan consolidation and repository review

- Created `Plan/PLAN.md` as the single planning source by consolidating the former project plan, editor plan, unified editor vision, deployment/publishing notes, legacy architecture reference, and TODO register.
- Added the owner requirement that every UI/UX plan and acceptance pass cover both Web/Desktop and Phone/Mobile together.
- Replaced the former standalone planning and deployment-status files with pointers to the consolidated master plan and updated the Guide documentation's plan reference.
- The read-only code audit has since been completed; its findings and validation evidence are recorded in `Doc/DOCUMENTATION.md#code-audit`.


### Validation update — 2026-11-13

- `npm ci --no-audit --no-fund` completed successfully.
- `npm run test:guide`: **9/9 passed**.
- `npm run test:guide:http`: the initial attempt ran without a local server and returned `ECONNREFUSED`; after starting the local production server as the test expects, **5/5 passed**.
- `npm run lint`: **0 errors, 24 warnings**.
- `npm run build`: passed, including TypeScript and Next.js production build.
- `npm run cf:build --workspace=apps/web`: passed. No deployment was run.
- Production dependency audit (`npm audit --workspace=apps/web --omit=dev`): **0 advisories**. Full-tree audit: **14 advisories (4 high, 10 moderate)** in build/lint dependencies; suggested automatic fixes include incompatible major-version changes, so no fix was applied.
- `git diff --check`: passed.
- The read-only code audit across storefront, editor core, editor UI, admin/data, and delivery/tests is complete; its findings are recorded in `Doc/DOCUMENTATION.md#code-audit`.


### Code audit completed — 2026-11-13

The read-only review of the storefront, editor, admin/data, and deployment/test paths is complete. **13 actionable findings** are recorded with source locations and remediation suggestions in [Code Audit section](#code-audit): 1 high, 11 medium, and 1 low. The principal finding is that the current `/create` route is a shell with an empty design area, not the interactive Fabric.js editor described in older plan snapshots. Other findings cover broken/no-op storefront navigation and search, ignored category filters, cart variant/pricing and account-demo behavior, phone canvas pan/clipping, Supabase RLS gaps, price-query failure handling, and CI not smoke-testing the built Worker runtime.

`Plan/PLAN.md` was updated to reflect the audited `/create` state in both the project overview and detailed editor baseline, mark older feature descriptions as historical, require Web/Desktop and Phone/Mobile coverage together, and list the audit remediation areas. No application code was changed; no deployment or database mutation was performed.


### GitHub publishing preference — 2026-11-13

The owner requested that requested repository changes be committed and pushed directly to the repository default branch (`main`) immediately after writing and basic validation, without another confirmation request. Do not use a compare/pull-request workflow unless explicitly requested. A repository push does not authorize production deployment or production database changes.


### 2026-11-13 — Consolidate documentation into one Doc file

- Combined this Work Log, the Code Audit report, the Guide content operations runbook, and the Admin Dashboard reference notes into `Doc/DOCUMENTATION.md` with named section anchors.
- Removed the obsolete `docs/` files after confirming that no app, test, package, or workflow code imports or reads them. All unique runbook/reference content is preserved here; the full planning material remains in `Plan/PLAN.md`.
- Kept `docs/guide-content.md` instructions intact as documentation; it is not a runtime input. No app source, database, or deployment configuration was changed.

<a id="code-audit"></a>
## Repository Code Audit

- **Repository:** `mhfashion/mhfashion`
- **Reviewed baseline:** `main` at commit `90dc398` (2026-11-13); this is a historical audit baseline, not the current editor implementation.
- **Review type:** Read-only source review plus local build/test/dependency checks. No application code, database, or production deployment was changed. Later editor changes and current behavior are recorded in the dated work-log entries above and the current baseline in `Plan/PLAN.md`.

### Executive summary

The review covered five independent areas: storefront routes/shared UI, editor canvas/document model, editor panels and mobile interactions, admin/Supabase/data flows, and deployment configuration/tests. It confirmed **13 actionable issues: 1 high, 11 medium, and 1 low**. The highest-impact issue is that `/create` is currently a placeholder workspace, not an operational design editor. The detailed editor capabilities in older project notes describe historical/planned behavior and do not match the audited source at this commit.

The local unit tests, corrected production-server HTTP tests, Next.js build, and Cloudflare Worker build pass. Production dependencies have no reported advisories, but the full development/build dependency tree has 14 advisories. No production deployment, Supabase migration, or live account operation was performed.

### Findings

#### High

##### 1. `/create` is a placeholder, not an editable or persistable design editor

**Evidence:** `apps/web/src/app/create/page.tsx:3-8` mounts only `KittlCanvas`. In `apps/web/src/components/KittlCanvas.tsx:129-136`, the design area is an empty `div`; component state covers only mockup visibility, zoom, pan, and gesture handling. The adjacent mockup is explicitly a placeholder (`KittlCanvas.tsx:154-179`). There is no editor document model, artwork operation, history, serializer, or persistence call wired to the route. Although `supabase/migrations/0001_initial_schema.sql:89-95` defines `user_designs.canvas_state`, this route does not use it.

**Recommendation:** Build and mount a typed document model, editing operations, selection/history, layer and property controls, validation/serialization, and persistence before presenting `/create` as an operational design editor. Treat the detailed editor plan as forward-looking until each capability is implemented and tested.

#### Medium

##### 2. Storefront navigation points to missing routes

**Evidence:** `apps/web/src/app/page.tsx:37-40` links to `/products`, `/products?new=true`, and `/categories/t-shirts`. `apps/web/src/components/CategoryRow.tsx:28-30,49-51` links to `/categories` and `/categories/{slug}`. `apps/web/src/components/Footer.tsx:26-29` links to `/products` and `/best-sellers`. The audited route tree has no products index, categories route, or best-sellers route; available product pages use `/products/[slug]`, with `/new` and `/popular` as separate pages.

**Recommendation:** Point navigation at implemented destinations or add the intended index/category pages, including handling for their query parameters.

##### 3. Header search controls do not perform a search

**Evidence:** `apps/web/src/components/HeaderActions.tsx:47-74` renders desktop and responsive text inputs without a form submission handler, search state, or results navigation. Typing a query has no observable search effect.

**Recommendation:** Connect both inputs to one shared search action and implemented results route, or remove/disable the affordance until search is available.

##### 4. Collection category links are ignored

**Evidence:** `apps/web/src/components/Header.tsx:8-14` navigates to `/collections?category=...`, but `apps/web/src/app/collections/page.tsx:19-21` always loads the same collection products and does not read `searchParams`. Collection cards also point to the same `#collection-products` anchor.

**Recommendation:** Validate and apply the category query parameter to the catalog, or route those links to real category-specific destinations.

##### 5. Product option selections are discarded and cart prices use only the minimum

**Evidence:** `apps/web/src/components/ProductOptions.tsx:14-17,22-31` stores size/color/product-type choices locally. Those choices are not passed to `ProductDetailActions.tsx:13-14`; `addItem` receives the unchanged product. `apps/web/src/components/CartPageClient.tsx:12,18-20` computes cart display and subtotal from `priceMinKs`, so the selected variant and applicable price are not represented.

**Recommendation:** Lift selected options into the add-to-cart operation, persist the selected variant and unit price in each cart item, and calculate line totals/subtotal from that selected price.

##### 6. “Best Sellers” is not ranked by sales or popularity

**Evidence:** `apps/web/src/lib/products.ts:83-101` notes that sales-count data is unavailable, filters to `is_new=false`, and sorts by `created_at` ascending. `apps/web/src/app/popular/page.tsx:10-14` presents the result as best sellers/popular products.

**Recommendation:** Use a verified popularity metric, or label the listing as a placeholder/curated selection until that data exists.

##### 7. Account page presents shared hard-coded sample data as an account

**Evidence:** `apps/web/src/app/account/page.tsx:42-46,179-208` includes a fixed profile/contact identity, orders, point totals, balance, designs, and wishlist. It does not load signed-in user data, and the Save control has no handler.

**Recommendation:** Connect the page to authenticated, user-scoped data and persist profile edits. Until then, clearly label all data as a demo and avoid presenting sample identity/contact information as a real account.

##### 8. Short phone viewports can clip the stacked editor workspace

**Evidence:** `apps/web/src/components/KittlCanvas.tsx:105-120,124-160` uses `overflow-hidden`; below `md` the canvas/mockup stack vertically but retains width-derived heights and a 48px separator. The page uses an `h-dvh` container (`apps/web/src/app/create/page.tsx:5-8`), so on short phone viewports the lower content can extend beyond the available height without a scroll path.

**Recommendation:** Add vertical scrolling or a viewport-fit mode, then verify short phone heights and landscape layouts as part of the required Web/Desktop + Phone acceptance checks.

##### 9. Touch pointers cannot pan the canvas on phones

**Evidence:** `KittlCanvas.tsx:68-71` accepts only middle-button drag or Space+left-button drag. A touchscreen primary pointer does not meet either condition, and the viewport is `overflow-hidden` (`KittlCanvas.tsx:115`), leaving no touch pan route.

**Recommendation:** Add a deliberate touch pan gesture (and pinch zoom if supported), with appropriate touch-action/pointer handling and accessible alternatives. Test on phone and preserve interactions for controls.

##### 10. Users can update their own reward-point balances

**Evidence:** `supabase/migrations/0001_initial_schema.sql:17-18` defines `daily_points` and `purchase_points`. The `profiles` policy at lines 139-141 grants `FOR ALL` when `auth.uid() = id`; row-level filtering does not constrain which columns the user may update.

**Recommendation:** Replace the broad write policy with column-limited updates or a trusted database function. Reward balances should be writable only through controlled server-side logic.

##### 11. `platform_settings` lacks row-level security or API-role restrictions

**Evidence:** `supabase/migrations/0001_initial_schema.sql:81-87` creates settings including saved-design limits and the exchange rate. The migration enables RLS on several user tables at lines 134-137 but not on `platform_settings`; no later migration in the reviewed set enables RLS or revokes API-role access. If the Supabase API roles have table grants, the settings may be directly accessible or modifiable.

**Recommendation:** Enable RLS, revoke direct `anon`/`authenticated` access, and expose only narrowly scoped reads or administrative changes through trusted server-side operations.

##### 12. CI HTTP smoke tests do not exercise the Cloudflare Worker artifact

**Evidence:** `.github/workflows/deploy-cloudflare.yml:70-111` starts `npm run start --workspace=apps/web` and runs the HTTP tests against the Next.js Node server (around line 101), then builds the OpenNext Worker and runs Wrangler dry-run (around lines 107-111). It does not start the built Worker/OpenNext preview and send HTTP requests to that runtime.

**Recommendation:** After `cf:build`, run the Worker locally through Wrangler/OpenNext preview and execute smoke tests against that target before deploy. Keep Next.js smoke tests only if they are intended to validate a separate runtime.

#### Low

##### 13. Price-range lookup failures can make products appear free

**Evidence:** `apps/web/src/lib/products.ts:42-45,59-60` returns an empty price-range map when the query fails; `toProduct` then assigns `priceMinKs` and `priceMaxKs` as `0` when no range is found.

**Recommendation:** Represent price-data lookup failure explicitly and show an unavailable-price state unless zero is a verified price.

### Dependency and lint observations

- `npm audit --workspace=apps/web --omit=dev`: **0 vulnerabilities/advisories** in production dependencies at audit time.
- Full `npm audit`: **14 findings (4 high, 10 moderate)**, in build/lint dependencies including OpenNext/minifier/glob and ESLint/TypeScript-ESLint dependency chains. npm's suggested fixes include incompatible major changes (for example OpenNext Cloudflare `0.3.0`, `eslint-config-next` `15.5.29`, or ESLint `9.39.5`), so no automatic fix was applied.
- `npm run lint` completed with **0 errors and 24 warnings**. Warnings include unused imports/values, internal navigation anchors, raw `<img>` usage, and synchronous state-setting effects.
- The Cloudflare build emitted a non-blocking warning that `workerd compatibility_date` is `2025-04-01`.

### Validation performed

| Check | Result |
|---|---|
| `npm ci --no-audit --no-fund` | Passed |
| `npm run test:guide` | 9/9 passed |
| `npm run test:guide:http` | 5/5 passed against a locally running production server. The first invocation without a server failed with `ECONNREFUSED`; it was rerun correctly. |
| `npm run lint` | Passed, 0 errors / 24 warnings |
| `npm run build` | Passed; Next.js production build and TypeScript checks completed |
| `npm run cf:build --workspace=apps/web` | Passed |
| Production dependency audit | 0 advisories |
| Full dependency audit | 14 findings: 4 high, 10 moderate |
| `git diff --check` | Passed |

### Scope limitations

This was a source review and local validation, not a production deployment or live service audit. No production URL, authenticated account, Supabase project, RLS behavior against a live database, or Cloudflare Worker preview was exercised. These findings describe the reviewed source at `90dc398`; confirm against the target commit before remediation.

<a id="guide-content-operations"></a>
## Guide Content Operations

The guide catalog is intentionally ready for public reads before the future Post Admin module exists. The content model is split into `public.guide_categories` and `public.guide_posts`; posts store structured JSON sections rather than HTML.

### Apply the migration

The owner should run [`supabase/migrations/0005_guide_content.sql`](../supabase/migrations/0005_guide_content.sql) manually in the Supabase SQL Editor after migrations `0001` through `0004`. This task does not apply database changes. The migration is safe to re-run for its seed rows: category and post inserts use stable slugs with `ON CONFLICT (slug) DO NOTHING`, so existing owner edits are not overwritten.

The migration creates the tables, publication checks, timestamps, indexes, safe-section validation, and RLS. It grants `SELECT` only to `anon` and `authenticated`. Their policies expose a category or post only when it is `published` and its `published_at` is not in the future; a post also requires a published category. There are no public insert, update, delete, or truncate grants. Until admin authentication and the Post Admin module arrive, use the Supabase SQL Editor or a server-side service-role process for content management.

### Content shape

Each post's `sections` value is a JSON array of objects with this shape:

```json
[
  {
    "heading": "A plain-text heading",
    "paragraphs": ["A plain-text paragraph."],
    "bullets": ["An optional plain-text bullet."]
  }
]
```

Sections, paragraphs, and bullets are bounded and must contain plain text. The database validation rejects HTML-looking angle brackets, empty values, malformed arrays, and unexpected section keys. Keep content factual and grounded in `../Plan/PLAN.md#project-plan`; in particular, describe payment, editor, and delivery behaviors as planned until those integrations are actually live. Do not add invented delivery SLAs, size measurements, payment amounts, or gateway details.

### Safely edit a draft

Use the SQL Editor with the exact slug and keep a draft unpublished while editing. Replace the JSON with a valid JSON array and cast it to `jsonb`:

```sql
update public.guide_posts
set
  title = 'Revised title',
  excerpt = 'A concise plain-text summary.',
  sections = '[
    {
      "heading": "A section heading",
      "paragraphs": ["A factual paragraph."],
      "bullets": ["An optional bullet."]
    }
  ]'::jsonb,
  seo_title = 'Revised SEO title',
  seo_description = 'A concise plain-text search description.',
  status = 'draft',
  published_at = null,
  updated_at = now()
where slug = 'the-planned-editor-flow';
```

Category names and descriptions can be edited in `public.guide_categories` by slug. Keep category and post slugs lowercase, hyphen-separated, and stable after a URL is public. The database constraints enforce the slug format and title/excerpt/SEO limits.

### Publish a draft

Review the text and JSON in the SQL Editor, then publish the category and its posts explicitly. A future `published_at` keeps the row hidden until that time; using `now()` publishes immediately:

```sql
update public.guide_categories
set status = 'published', published_at = now(), updated_at = now()
where slug = 'design-guide';

update public.guide_posts
set status = 'published', published_at = now(), updated_at = now()
where slug = 'the-planned-editor-flow';
```

Public reads never return drafts, posts scheduled for the future, or posts whose category is not currently published. To unpublish, set `status = 'draft'` and `published_at = null`.

### Runtime fallback behavior

`apps/web/src/lib/guides.ts` validates every live category, post, and JSON section before returning it. If Supabase environment variables are missing, or PostgREST reports that the guide tables are missing, the loader returns the starter catalog from `apps/web/src/lib/guide-starter.ts` with `source: 'starter'`. A successful live query with zero published rows stays `source: 'supabase'` and returns empty arrays; starter posts are not resurrected over an intentionally empty catalog. Other backend failures return `source: 'unavailable'` with empty arrays. Requests use a bounded fetch timeout and React request memoization without a cross-request stale cache.

Guide page metadata can optionally use `NEXT_PUBLIC_SITE_URL` from the web app environment to create absolute canonical and Open Graph URLs. Set it only to the public HTTPS origin, without a path, credentials, query string, or fragment. If it is absent, canonical and `og:url` tags are omitted rather than guessed; titles, descriptions, and other sharing metadata remain available.

### Future Post Admin

The admin workflow is deliberately not included here. The project plan assigns Guide posts, categories, SEO fields, and publish/draft controls to Post Admin, but no admin authentication or role module exists yet. A future module should use a privileged server-side path, preserve the same JSON contract and publication rules, and keep service-role credentials out of browser code.

### Validation commands

From the repository root, `npm run test:guide` runs the guide loader/search/metadata unit suite and `npx tsc -p apps/web/tsconfig.json --noEmit --incremental false` checks TypeScript. `npm run build` validates the Next.js production build. To run the HTTP suite, start the built web app on port 3000 and run `npm run test:guide:http`; these HTTP assertions intentionally expect the starter catalog, so use a local environment without Supabase variables, not a production content database. `GUIDE_TEST_ORIGIN` can override the local origin.

The migration was also tested in isolated embedded PostgreSQL: applying/rerunning it, matching all seed content, malformed section rejection, draft/future/category publication filtering, and denial of public writes. No production Supabase data was accessed or changed during validation. Managed editor diagnostics were unavailable because this GitHub-only task has no Manus web-project binding; the TypeScript compiler and production build supplied the source diagnostics instead.

<a id="admin-dashboard-reference"></a>
## Admin Dashboard Visual Reference

Sources supplied by the project owner on 2026-11-10:

1. [MH Fashion Admin Dashboard-1.png](https://drive.google.com/file/d/1Og7IC_9dvk7RPOzSgkl3f7BaHID0JEkU/view?usp=sharing)
2. [MH Fashion Admin Dashboard-2.png](https://drive.google.com/file/d/1FICZRT6_wGceafle7t4pne8urS6l0vxy/view?usp=sharing)

### Visual cues observed

- Dark charcoal left navigation rail with MH Fashion branding and a bright lime active state.
- Light, near-white dashboard workspace with a top search bar, notification/profile controls, soft borders, rounded cards, and restrained shadows.
- Four summary metrics near the top, followed by sales and order-status visualizations.
- Operational content includes top-selling products, recent orders, and an activity feed; one reference also promotes the design editor.
- Use a responsive layout that stacks cards on narrow screens.

The current `/admin` page follows these cues but uses clearly labeled local preview data. The linked references are visual guidance only; they do not define live metrics or authorization behavior.
