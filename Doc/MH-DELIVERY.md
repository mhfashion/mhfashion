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

The endpoint is read from `NEXT_PUBLIC_MH_DELIVERY_URL` (`MH_DELIVERY_QUOTE_ENDPOINT` in
`delivery.ts`). It is empty until MH Delivery hands over the URL and a token, so nothing is sent
today — the file is downloaded and forwarded instead.

```bash
curl -X POST "$MH_DELIVERY_URL/quote" \
  -H "Authorization: Bearer $MH_DELIVERY_TOKEN" \
  -H "Content-Type: application/json" \
  --data @delivery-mh1086.json
```

## Still to confirm with MH Delivery

1. The quote URL and auth scheme, so the fee can be fetched at checkout instead of after the order.
2. The response shape (`feeKs`, `service`, `etaDays`), so the cart can show the fee before payment.
3. Whether they want township as a code rather than a name — the payload carries the name today.
