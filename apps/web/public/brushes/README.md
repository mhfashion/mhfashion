# Brush pack drop folder

Drop brush files here and they show up in the editor's Brush box. Nothing else is
needed: the gallery is built from `brushes.json`.

```
apps/web/public/brushes/
  brushes.json          <- the list (see below)
  tips/soft-round.png   <- one file per brush tip
  tips/ink-dry.svg      <- vector tips are welcome too
```

## What to drop

| Format | When to use | Rules |
| --- | --- | --- |
| **PNG tip** (recommended) | anything photographic or grainy: chalk, sponge, splatter, fur | square, 512 / 1024 / 2048 px, transparent background, ink painted in **black** (the editor tints it to the brush colour), no colour, no drop shadow. 1024 px is the sweet spot; 2048 px only for fine grain that will be printed big. |
| **SVG tip** | hard shapes that must stay sharp at print size: stars, leaves, tape, halftone | square `viewBox` (e.g. `0 0 100 100`), one shape or group, `fill` black or `currentColor`, no `<image>`, no external fonts |
| **ABR** (Photoshop) | you already own Photoshop brushes | v6 / v10 only, and only the *sampled* brushes convert (a raster tip). Computed and dynamic brushes (round point with pressure jitter) have no raster tip, so they arrive as settings only. Ship the `.abr` as-is and it will be converted into `tips/*.png` + entries. |

Do **not** add `.brushset` (Procreate), `.tpl` (Krita) or `.psd` brush sheets: export them
first (Procreate: brush → Share → PNG; Photoshop: Preset Manager → Export Brushes).

## brushes.json

```json
{
  "version": 1,
  "brushes": [
    {
      "id": "chalk-01",
      "name": "Chalk 01",
      "group": "Dry media",
      "kind": "stamp",
      "tip": "tips/chalk-01.png",
      "size": 140,
      "spacing": 8,
      "flow": 60,
      "softness": 10,
      "scatter": 12,
      "angle": 0,
      "roundness": 100,
      "sizeJitter": 35,
      "opacityJitter": 40,
      "angleJitter": 60,
      "blend": "normal",
      "fadeOut": false
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id` | unique, lower case, dashes |
| `group` | shelf in the gallery — `Ink`, `Dry media`, `Airbrush`, `Splatter`, `Texture`, `Shape` |
| `kind` | `stamp` (PNG tip), `vector` (SVG tip) |
| `size` | default tip width in canvas units (the canvas is 4500 wide) |
| `spacing` | distance between stamps as **% of the tip size**, 1–200 (Photoshop's "Spacing") |
| `flow` | ink laid down per stamp, 1–100 |
| `softness` / `scatter` | 0–100 |
| `angle` / `roundness` | degrees, and 0–100 (100 = round) |
| `sizeJitter` / `opacityJitter` / `angleJitter` | 0–100, Photoshop's "Shape Dynamics" |
| `blend` | `normal`, `multiply`, `screen` |
| `fadeOut` | taper the stroke at the end |

`brushes.json` is validated when the editor loads it: an entry with a missing `tip` or an
out-of-range number is skipped, so one bad row cannot break the Brush box.
