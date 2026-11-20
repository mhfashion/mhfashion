# Kittl Canvas behavior research

Sources reviewed on 2026-11-19:

- https://help.kittl.com/editing-and-design/artboard-handling — Kittl artboards define design/export boundaries; content can be clipped or left unclipped; content outside an artboard is not included in exports when clipping is enabled.
- https://help.kittl.com/editing-and-design/using-layers — only elements nested inside an artboard layer are exported/downloaded; a layer dragged out remains visible on the canvas but is excluded from the artboard export.
- https://help.kittl.com/editing-and-design/mockup-generator — mockups are linked to an artboard, update from that artboard design, and are edited on the same canvas rather than a separate mode.
- https://www.kittl.com/features/infinite-canvas — Kittl presents an expandable workspace for arranging artboards, mockups, and assets together while zooming around the project.

Implementation implication for MH Fashion: keep workspace coordinates unclamped so off-artboard layers remain editable; use artboard intersection to decide what enters mockup rendering; keep the sidebar preview surface theme-aware rather than using a dark hard-coded card background.
