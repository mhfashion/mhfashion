# MH Delivery — quote request

MH Delivery prices a job from the parcel, not from our shop, so every quote starts with the
customer's own details. `apps/web/src/lib/delivery.ts` turns an order into that payload.

## Where it is produced

- **Orders → open an order → Delivery JSON** downloads `delivery-<order>.json`.
- The same file is inside the print bundle (`print-files.zip`) as `delivery-<order>.json`, next
  to the sheet, the receipt, the CSV and the design SVGs, so the desk sends one bundle onward.

## Request body

`buildDeliveryQuoteRequest(order)` returns exactly this, and the file is the same JSON with two
spaces of indentation:

```json
{
  "reference": "#MH1086",
  "requestedAt": "2026-11-21T10:14:03.668Z",
  "merchant": { "name": "MH Fashion", "phone": "+95 9 000 112 233", "address": "Yangon, Myanmar" },
  "consignee": {
    "name": "Kyaw Min",
    "phone": "+95 9 449 330 127",
    "email": "kyaw.min@example.com",
    "address": {
      "line1": "No. 45/A, Thiri Mingalar 4th Street",
      "township": "Mingalar Taung Nyunt",
      "city": "Yangon"
    }
  },
  "parcels": [
    {
      "items": [
        {
          "product": "Classic T-shirt",
          "productId": "product-classic-tee",
          "size": "2XL",
          "colour": "White",
          "quantity": 3,
          "weightGrams": 900
        }
      ],
      "units": 3,
      "weightGrams": 900,
      "longestSideCm": 30
    }
  ],
  "totals": { "units": 3, "weightGrams": 900, "codAmountKs": 63000, "cod": true },
  "payment": "Cash on Delivery",
  "notes": ""
}
```

| Field | Why the courier needs it |
|---|---|
| `reference` | our order id, quoted back on the fee response |
| `consignee.name` / `.phone` | the driver calls before delivery |
| `consignee.address.line1` / `.township` / `.city` | township is what the fee is actually priced on |
| `parcels[].items[]` | what is in the box, per size and colour, so a partial return can be traced |
| `parcels[].weightGrams` | billed weight; per-piece estimates below |
| `parcels[].longestSideCm` | bulky parcels are priced differently |
| `totals.cod` / `codAmountKs` | the driver collects this amount on a cash order, `0` otherwise |
| `payment` / `notes` | shown on the waybill |

Weight estimates (`UNIT_WEIGHT_GRAMS` in `delivery.ts`): T-shirt 250 g, hoodie 550 g, bag 300 g,
cup 400 g, cap 150 g, phone cover 120 g, anything else 300 g. Adjust them once MH Delivery gives
real per-item weights.

## Sending it

`POST /api/delivery/quote` sends this payload to MH Delivery and answers with the fee. Set the two
variables on the site's Worker (Cloudflare → Workers → mhfashion → Settings → Variables):

| Variable | What it is |
|---|---|
| `MH_DELIVERY_URL` | the base address; the route posts to `<url>/quote` (falls back to `NEXT_PUBLIC_MH_DELIVERY_URL`) |
| `MH_DELIVERY_TOKEN` | the bearer token MH Delivery issued |

The body is `{ "request": <the JSON above>, "subtotalKs": 63000 }`; `subtotalKs` is optional and is
what the shop's own free-delivery threshold is measured against.

The answer (`lib/delivery-quote.ts`, `quoteDelivery`) is always a fee:

```json
{ "feeKs": 3200, "service": "MH Express", "etaDays": "1", "source": "courier", "weightGrams": 3000 }
```

When the courier is not configured, too slow (8 s), answers a bad status or a body without `feeKs`,
the answer comes from the shop's own table with `"source": "table"` and a `note` that names the
reason, so checkout never blocks on the courier:

```json
{ "feeKs": 2500, "service": "MH Delivery · standard", "etaDays": "1-2", "source": "table",
  "weightGrams": 1000, "note": "the courier did not answer (not_configured), so the shop's own table priced this" }
```

`DELIVERY_FEE_TABLE` is the shop's starting default: Yangon 2,500 Ks for the first kilogram and
1,000 Ks for each started one (1–2 days), Mandalay and Nay Pyi Taw 3,500 Ks + 1,200 Ks (2–3 days),
everywhere else 4,500 Ks + 1,500 Ks (3–5 days), free from 150,000 Ks. Change the table once MH
Delivery confirms its rates.

The route is rate limited to 30 calls a minute per address (`RATE_LIMITS.deliveryQuote`).

```bash
curl -X POST "$SITE/api/delivery/quote" \
  -H "Content-Type: application/json" \
  --data '{"request": '"$(cat delivery-mh1086.json)"', "subtotalKs": 63000}'
```

## Still to confirm with MH Delivery

1. The quote URL and auth scheme, so the fee can be fetched at checkout instead of after the order.
2. The response shape (`feeKs`, `service`, `etaDays`), so the cart can show the fee before payment.
3. Whether they want township as a code rather than a name — the payload carries the name today.
