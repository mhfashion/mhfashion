# The MH Fashion app (`App/`)

The customer app for iOS and Android, written in Flutter. It is not a second shop: it reads the same
Supabase project and asks the same Worker as `apps/web`, so the catalogue, the prices and the delivery
fee are the ones the web shop already shows.

## Why a separate folder

`apps/web` is the Next.js site. The app cannot live inside it (different toolchain, different build
target), and it must not hold its own copy of the products. `App/` is a plain Flutter project with no
dependency on `apps/web` except the two public Supabase values and the Worker URL, both passed at build
time with `--dart-define`.

## What shares what

| Data | Where it comes from | Same as the web shop? |
| --- | --- | --- |
| Products, price ranges | `GET {SUPABASE_URL}/rest/v1/products` and `product_price_ranges` | yes — the same columns and the same two-query merge as `apps/web/src/lib/products.ts` |
| Delivery fee | `POST {SITE_BASE}/api/delivery/quote` | yes — the same route, and the same fee table when the courier cannot be reached |
| Money formatting | `lib/core/format.dart` | the same rules: grouped kyat, dollars at `usd_rate_ks` |
| Language | `lib/core/strings.dart` | EN and မြန်မာ, the same two the site offers |

Because nothing is copied, an admin change on the web appears in the app on its next refresh. There is
no sync job and no second database.

## Screens

| File | Screen |
| --- | --- |
| `lib/ui/screens/home_screen.dart` | hero, new arrivals, language switch |
| `lib/ui/screens/catalog_screen.dart` | search, sub-brand chips, two-column grid |
| `lib/ui/screens/product_screen.dart` | photo, price range, tags, add to cart, wishlist |
| `lib/ui/screens/cart_screen.dart` | quantities, line totals, subtotal |
| `lib/ui/screens/checkout_screen.dart` | address form, live quote, total, place order |
| `lib/ui/screens/account_screen.dart` | language, currency, orders, wishlist |

## State

`lib/state/app_state.dart` holds one `ChangeNotifier` with the cart, the wishlist, the orders placed on
this phone, and the two preferences. Everything is written through `KeyValueStore`, which is
`SharedPreferences` on a device and `MemoryStore` in tests, so a cart survives a restart and a test
never touches a device.

## Orders

The web shop has no order endpoint (its checkout writes to the browser), so the app does not invent
one. It keeps the order on the phone with the shop's `MH…` reference and offers the order text for
copying. `PlacedOrder`, `DeliveryAddress` and `OrderLine` already carry what an endpoint would need;
when the Worker grows `POST /api/orders`, add a repository next to `delivery_repository.dart` and call
it from `AppState.placeOrder`.

## Verification

```bash
cd App
flutter test      # 39 tests: formatting, parsing, PostgREST shape, fee table, cart, orders, tabs
dart analyze      # no issues
```

`flutter test` compiles the whole app and drives the real widgets, so a broken screen fails the suite.
The Android and iOS binaries need the Android SDK / Xcode, which this machine does not have:
`flutter build apk --release` and `flutter build ipa --release` are the owner's step (or CI's).

## Publishing checklist

1. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY` and (optionally) `SITE_BASE` to the build command.
2. Change `applicationId` in `android/app/build.gradle.kts` and the iOS bundle id from
   `mm.mhfashion.mh_fashion` if the store listing needs another id.
3. Add the app icons and a splash screen (`flutter_launcher_icons`, `flutter_native_splash`).
4. Decide the order path: the Worker endpoint above, or a share sheet to the shop's Telegram.
