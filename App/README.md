# MH Fashion — the app (iOS + Android)

The shop in your pocket, written once in Flutter and shipped to both stores. It reads the **same
Supabase project** as the web shop and asks the **same Worker** for delivery fees, so a product the
admin edits on the web appears in the app on the next refresh and a fee the courier quotes is the
fee both channels show. There is no second catalogue to keep in sync.

```
App/
  lib/
    main.dart                  wires the config, the repositories and the state
    app.dart                   MaterialApp + the four tabs
    core/                      config (dart-defines), money/date formatting, EN+MM strings, theme
    data/
      models/                  Product, DeliveryQuote, OrderLine, DeliveryAddress, PlacedOrder
      catalog_repository.dart  PostgREST reads of products + product_price_ranges
      delivery_repository.dart POST /api/delivery/quote, with the shop's own fee table as fallback
      storage.dart             shared_preferences behind a KeyValueStore interface
    state/app_state.dart       cart, wishlist, orders, language, currency (one ChangeNotifier)
    ui/                        home, shop, product, cart, checkout, account + shared widgets
  test/                        39 unit + widget tests, no network and no device needed
```

## Run it

```bash
cd App
flutter pub get

# Point the app at the shop. Both values are the public ones the web app already uses
# (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY); the anon key is safe in a client.
flutter run \
  --dart-define=SUPABASE_URL=https://<project>.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=<anon key> \
  --dart-define=SITE_BASE=https://mhfashion.mhfashionmm.workers.dev
```

`SITE_BASE` defaults to the production Worker. Use `http://10.0.2.2:3000` from an Android emulator or
`http://127.0.0.1:3000` from the iOS simulator to price delivery against a local `next start`.

Without `SUPABASE_URL` / `SUPABASE_ANON_KEY` the app still runs: the shop tab explains that the
catalogue is not connected instead of showing an empty shop, and delivery is priced from the shop's
own table.

## What it does

| Tab | What the customer gets |
| --- | --- |
| Home | New arrivals (`is_new`, newest first), a hero, the language switch |
| Shop | Search by name, filter by sub-brand, a two-column grid |
| Cart | Quantities, line totals, subtotal, a checkout button |
| Account | Language (EN / မြန်မာ), currency (Ks / $), the orders placed on this phone, the wishlist |
| Product | Photo, price range, sub-brand/type/print tags, add to cart, wishlist |
| Checkout | Address form, live delivery quote, subtotal + fee + total, place order |

Money follows the same rules as the site: kyat grouped with `Ks` (or `ကျပ်`), dollars at
`usd_rate_ks` (default 4500). Dates print in Yangon time. Delivery bills whole kilograms from the
first one, with the free-delivery threshold the site uses.

## Orders, honestly

The web shop has no order endpoint yet (checkout writes to the browser), so the app does not invent
one. It keeps the order on the phone, gives it the shop's `MH…` reference, and offers the order text
for copying so the customer can send it to the shop. When the Worker grows `POST /api/orders`, add a
repository beside `delivery_repository.dart` and call it from `AppState.placeOrder` — the model and
the screens already carry everything an endpoint needs.

## Tests

```bash
cd App
flutter test        # 39 tests
dart analyze        # no issues
```

The suite covers money and date formatting, product parsing (including rows with no id/name and
prices sent as strings), the PostgREST query shape and search escaping, the fee table, the
`/api/delivery/quote` call and its fallback, the cart, the order reference series, persistence across
a restart, and the four tabs driven as real widgets.

## Build for the stores

```bash
flutter build apk --release      # Android (needs the Android SDK + a JDK)
flutter build appbundle --release
flutter build ipa --release      # iOS (needs macOS + Xcode)
```

This machine has no Android SDK, JDK or Xcode, so the binaries are not built here; `flutter test`
and `dart analyze` are the verification that runs in this repository.

## Notes

- Flutter 3.50 moved Material out of the framework: the app imports `package:material_ui/material_ui.dart`
  (the template's own choice) and keeps `package:flutter/widgets.dart` for the rest.
- The app id is `mm.mhfashion.mh_fashion`; change `applicationId` in
  `android/app/build.gradle.kts` and the iOS bundle id before publishing.
