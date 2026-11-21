# Print bundle — what is inside `print-files.zip`

Orders → open an order → **Print files ZIP** downloads `<order>-print-files.zip`. One bundle per
order, so the press, the front desk and the courier all get the same files.

```
mh1086-print-files.zip
├── README.txt                  index of the bundle
├── print-sheet-mh1086.html     press sheet — spec + artwork + layer layout (A4)
├── invoice-mh1086.html         customer receipt (A5, print to PDF)
├── print-spec-mh1086.csv       one row per order line
├── measurements-mh1086.csv     one row per design layer, in cm
├── manifest.json               the whole order as JSON, with file paths
├── delivery-mh1086.json        MH Delivery quote request
└── designs/
    ├── golden-peacock-white.svg          artwork at print size
    └── golden-peacock-white-mockup.svg   where it sits on the garment
```

## `measurements-mh1086.csv`

One row per design layer. Blank measurement cells mean that line has no design file.

| Column | Meaning |
|---|---|
| `Line` | line number on the order |
| `Product`, `Colour`, `Size`, `Quantity` | what the row belongs to |
| `Design`, `Design file` | design name and the SVG in `designs/` |
| `Placement` | chest, sleeve, back… |
| `Print area (cm)` | the printable window on the garment |
| `Units/cm` | artwork units per centimetre (the SVG's own scale) |
| `Print size (cm)` | the artwork as it prints |
| `Mockup garment (cm)` | flat garment size the layout was made on |
| `Print area at (cm)` | top-left corner of the print area on that garment |
| `Layer`, `Type` | layer name and kind (text, shape, image, stroke) |
| `X (cm)`, `Y (cm)` | layer position inside the print area |
| `Width (cm)`, `Height (cm)` | layer size after scale |
| `Rotation (deg)`, `Scale` | the transform applied to the layer |

## The SVGs

- Each design SVG is sized in centimetres (`width="7cm"`), so a RIP prints it at the measured size
  with no scaling.
- The `-mockup.svg` next to it draws the same artwork on a garment outline with the print area
  marked, so a press operator can see where it lands.
- Text stays as text. Convert to outlines if the RIP does not have the font.

## What is deliberately not in the bundle

- **No delivery fee.** The fee is priced by MH Delivery from `delivery-<order>.json`; see
  [MH-DELIVERY.md](./MH-DELIVERY.md).
- **No raster mockups.** Product photos live in R2 (`mockups/product/…`), not in the ZIP, because
  they are not print files.
