# MH Fashion — Plan Update (2026-11-21)

> **Merged into [`Plan/PLAN.md`](./Plan/PLAN.md) on 2026-11-21.** The canonical plan now carries
> these decisions in §1, §4.1, §4.5/4.5.1, §4.6, §6, §7, §8/8.1, §10, §11, §12, §13, §14 and the
> new §16 remaining-work register, plus a Change Log line. This file stays as the dated source
> record; edit `Plan/PLAN.md`, not this one.

**Purpose:** consolidates the owner's plan-review decisions, the remaining-work register, and the new Pricing Management UI/UX spec. Merge each section into `Plan/PLAN.md` where indicated, then add the Change Log line at the bottom. Per owner directive 3, items marked **Proposed** are not approved scope until the owner confirms them here.

**Scope rule for this update:** the Editor is considered finished as built. Nothing below changes Editor design or behavior.

---

## 1. Owner decisions recorded

| # | Decision | Merge into |
|---|---|---|
| 1 | Editor design and behavior are final as currently built; no further Editor planning is needed. | §6, §14 |
| 2 | Product page gallery sizes stay as chosen by eye (current values). Do not re-specify them. | §4.6 |
| 3 | UI ships in **both English and Myanmar (EN/MM)**. | §1 |
| 4 | T-shirt attribute names stay: Print Method / Fabric Type / Knit Structure / MH Cuttings. | §4.1 |
| 5 | Customer notification channel is decided later (email provider stays provisional). | §11 |
| 6 | **Google Sheet pricing is removed.** Prices are entered in admin through a detailed pricing UI (section 4 below). | §4.5, Posts update |
| 7 | **Only admins upload SVGs to Cloudflare R2**, through the admin dashboard. The owner does not upload by hand. | §12 |
| 8 | Copyright policy as in section 5 below. | §8, Terms of Use |

## 2. Text corrections to make in the Plan

These are wording fixes so the Plan matches what is built and decided. None adds scope.

1. **§1 Language:** replace "Burmese support to be decided later" with "UI copy ships in English and Myanmar (EN/MM, switcher in header and drawer)."
2. **§4.5 and the 2026-11-21 Posts update:** delete the Google Sheet price-import paragraph (link field, server-side CSV fetch, sheet-defines-attributes rule). Price rules stay: one hand-entered price per full valid combination, no base price, no derived delta, unlisted combinations are not sold. Replace with a pointer to section 4 below.
3. **Posts attribute labels:** align the T-shirt post attribute labels with §4.1 names (Print Method, Fabric Type, Knit Structure, GSM, Color, MH Cuttings, Size). *Owner to confirm the Posts module's current labels (Material, Fit Type, Sleeve, Print) should change or map to these.*
4. **§12 R2 layout:** pick one mockup key pattern and use it everywhere. Today §12 says `mockups/{product_id}/{style_id}/{color_id}_front.png` while the Nov 21 product-page update says `mockups/<slug>/<look>.<ext>`. Since admins upload through a form, the form should generate the key; record the chosen pattern in §12.
5. **Fold the Nov 21 updates into their sections** (Admin modules → §10, Posts → §7/§10, Product page preview and Order print sheet → §7/§8, Orders detail → §10, status → §14) instead of leaving them only at the bottom.
6. **Deploy wording (Rule 5 vs §3):** Rule 5 says a push is not a deployment, but §3 says a push to `main` touching `apps/web/**` runs the deploy workflow. **Proposed:** once Cloudflare secrets are fixed, either (a) keep pushing to `main` and accept that it deploys, or (b) add a staging branch/preview deployment. Owner chooses; then reword Rule 5 accordingly.
7. **Status snapshot (§14/§15.6):** the last recorded production probe is 2026-11-12 and says commits after `9cb5e21` are not live because `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` were missing. Re-check and update this line.

## 3. Remaining-work register

Editor items are excluded (decision 1). Priority is a proposal.

### P0 — foundation
1. **Real backend for Admin data.** Orders, products, per-size stock, posts, promotions, designs and settings live in browser `localStorage` (`mh-fashion-admin-demo-data-v1`). Define Supabase tables and a one-time migration path for: `orders`, `order_items` (spec snapshot, design layout, print position), `tshirt_posts`, `price_combinations`, `price_history`, `designs`, `promotions`, `stock`, `settings`.
2. **Supabase Auth + RLS + server-side role checks** replacing the demo session (§15.9). Per-admin module permissions must be enforced server-side, not only shown as checkboxes.
3. **Fix the Cloudflare deploy pipeline** (secrets) and settle the staging question (section 2, item 6).
4. **Checkout, payment, order creation.** Payment Provider interface, payment webhooks, idempotent order creation (no double charge), payment status → Order status mapping.

### P1 — before launch
5. **Delivery fee.** MH Delivery API contract, behavior when the API is down, per-product weight/package size, Myanmar address structure (region/township), DHL placeholder.
6. **Print file quality checks.** Low-resolution photo warning, DTF vs Sublimation file requirements (color, bleed), confirmation that the print-size export opens on phones.
7. **SVG handling.** Admin-only upload lowers risk; still strip scripts/event attributes when an SVG is rendered inline.
8. **Design takedown handling** per section 5 (admin action, record, effect on open orders).
9. **Rate limiting / abuse protection** for uploads, AI points and public forms.
10. **Testing.** Automated tests for checkout/pricing/orders, E2E smoke tests, real-device checks on phone.

### P2 — later
11. **Posts ↔ Product relationship** documented as a data model (how a T-shirt post relates to Product → Style → Color and to fixed-design products). Nyein brief still pending.
12. **Admin modules not yet built:** Attribute Management, Brush Management, Delivery Settlement Report, Loyalty rules, Jersey mapping setup.
13. **Order operations:** order QR/barcode on the print sheet, reprint flow, refund request flow (deferred).
14. **Operations:** error monitoring, Supabase backups, timestamps stored in UTC and displayed in UTC+6:30.
15. **Mobile app decision:** PWA first vs React Native; the editor cannot be ported to React Native directly.
16. **Customer notification channel** (decision 5).

**Assumption — Inventory:** the Inventory module (stock per product × size) is treated as **blank garment stock**. *Owner to confirm; if it means a sellable-quantity cap instead, the stock-decrement rules change.*

---

## 4. Pricing Management — UI/UX spec (Web and Phone)  **Proposed**

Replaces Google Sheet import. Per directive 1, Web/Desktop and Phone/Mobile are specified together.

### 4.1 Rules (unchanged from current pricing decisions)
- Price belongs to one **full valid combination**. No base price, no automatic delta or percentage rules.
- Only combinations allowed by the cascading rules exist as rows. Pricing cannot create an invalid combination (for example Sublimation with Combed Cotton).
- A valid combination with no price is **not sold** and is shown as "Unpriced" in admin.
- Prices are whole Ks amounts, stored as integers. Valid range: above 0 and under Ks 10,000,000.
- Typed input accepts `24000`, `24,000` and `Ks 24,000`.

### 4.2 Data (Supabase)
- `price_combinations`: scope (product or post), one value per attribute (Print Method, Fabric Type, Knit Structure, GSM, Color, MH Cuttings, Size), `price_ks`, `updated_by`, `updated_at`, version. Unique per scope + combination.
- `price_history`: combination, old price, new price, changed by, changed at.
- Edits use the row version so a stale save is rejected with a message instead of overwriting someone else's change.

### 4.3 Web / Desktop layout
- **Scope picker** at the top (Product or post), plus a summary line: total valid combinations, priced, unpriced.
- **Price table:** one row per valid combination, one column per attribute, last column Price (editable cell). Sticky header and first column; scrolls inside its own container.
- **Filters:** one dropdown per attribute (multi-select), a text search, and a "Unpriced only" toggle. Filtered row count is always visible.
- **Selection:** row checkboxes, "select all filtered", shift-click range.
- **Bulk bar** (appears when rows are selected): *Set exact price* (applies one value to all selected rows) and *Copy price from…* (pick a source combination). Both show "N rows will change" and require confirmation. No percentage or +/- tools in this version (keeps the "no derived delta" rule); add only if the owner asks.
- **Keyboard:** arrow keys move between cells, Enter edits, Esc cancels, Tab moves to the next row's price.
- **Save model:** edits are staged; a sticky bar shows "N unsaved changes — Save all / Discard".
- **Row history:** a history icon per row opens recent price changes.
- **Export / Import:** see 4.5.

### 4.4 Phone / Mobile layout
- Same data and rules, different presentation:
  - **Grouped cards instead of a wide table.** Group by a chosen attribute (default Print Method → Fabric Type); each group is a collapsible section; each row is a card showing the remaining attributes as chips and one large price field.
  - **Filters and bulk actions open in bottom sheets.** A sticky "Filters (n)" button and an "Unpriced only" toggle sit above the list.
  - **Selection mode:** long-press or a "Select" button reveals checkboxes; the bulk actions appear in a bottom sheet.
  - **Price field:** numeric keypad (`inputmode="numeric"`), thousands separators while typing, 44 px minimum touch targets.
  - **Sticky save bar** at the bottom, clear of the phone navigation, showing the unsaved count.
  - No horizontal page scroll at 320 px and 390 px widths.

### 4.5 CSV export / import (file upload, not a live link)
- Export: all rows or the current filter, UTF-8 with BOM so Excel opens Myanmar text correctly. Columns: one per attribute plus `Price`.
- Import: the admin uploads a file; the app shows a preview (will change / unchanged / invalid rows with the reason) and writes nothing until the admin confirms. Rows that do not match a valid combination are reported, never silently dropped. Prices are matched by attribute names/values.
- Row limit and file size limit are set in settings (proposal: 5,000 rows, 2 MB).
- Import is available on Web and Phone.

### 4.6 States
Loading, empty (no valid combinations for this scope — link to Attribute Management), unpriced, invalid price, unsaved changes, saving, saved, version conflict, and permission denied (admin without the Pricing module).

### 4.7 Permissions and audit
Requires the **Pricing** module permission. Every price change is recorded in `price_history`.

### 4.8 Acceptance checks (both form factors)
1. Every valid combination appears exactly once; no invalid combination can be created.
2. An unpriced valid combination is flagged and is not purchasable on the storefront.
3. Typing `24,000`, `Ks 24000` and `24000` all save as 24000; 0, negative, over-limit and non-numeric values are rejected with a message.
4. Bulk set and copy affect only the selected rows and show the count before saving.
5. Unsaved changes survive a filter change and warn before leaving the page.
6. A stale save is rejected without overwriting the newer value.
7. Export then import of an unchanged file produces zero changes.
8. Web: keyboard-only entry works. Phone: no horizontal overflow at 320 and 390 px, keypad appears, targets are at least 44 px, save bar is not covered by navigation.
9. A change made on Web is visible on Phone after reload, and the reverse.

---

## 5. Copyright and takedown policy

- **Ownership:** MH Fashion holds only the right to advertise and sell a design; it does not claim ownership of user-submitted designs.
- **Claims:** if someone says a design is theirs, MH Fashion accepts the claim and takes the design down (hides or deletes it) if needed.
- **Terms of Use (wording for legal review — not legal advice):** the user grants MH Fashion the right to advertise and sell the design; the user is responsible for having the rights to what they submit; MH Fashion may remove a design after a claim.
- **Claim channel:** one contact email or form listed in Terms and in the Guide.
- **Admin action:** Designs module → Hide / Delete, with a short record (design, who claimed, date, admin).
- **Open orders:** **Proposed** — an order already paid for a design that is later taken down is held for owner review before printing. *Owner to confirm the rule.*

---

## 6. Open questions for the owner

1. Posts attribute labels: rename to the §4.1 names, or map them? (section 2, item 3)
2. Deploy: keep pushes to `main` deploying, or add staging? (section 2, item 6)
3. Inventory: blank garment stock, as assumed? (section 3)
4. Open-order rule after a takedown. (section 5)
5. Pricing UI: approve section 4 as written, and which form factor to design first (Web grid or Phone cards)?

---

## Change Log entry (add to the Plan's Change Log)

- 2026-11-21: Recorded owner plan-review decisions (Editor final as built, EN/MM, R2 uploads by admins only, copyright policy, notification channel deferred). Removed Google Sheet pricing in favor of a Pricing Management UI/UX spec (Web + Phone, proposed). Added remaining-work register and listed text corrections. Pending owner confirmation: Posts labels, staging, Inventory meaning, takedown rule for open orders.
