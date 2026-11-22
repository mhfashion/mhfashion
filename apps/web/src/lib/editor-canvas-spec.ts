export const PRINT_CANVAS_SPEC = Object.freeze({
  widthPx: 4500,
  heightPx: 5400,
  resolutionDpi: 300,
  background: "transparent" as const,
  exportFormat: "png" as const,
  fixedSize: true,
  startsBlank: true,
});

/**
 * The on-screen print canvas is a layout box: the artwork paints in the SVG layers above it and
 * nothing is ever drawn into the bitmap. A real 4500 x 5400 backing store is 24.3 million pixels
 * (~97 MB) and older iOS refuses a canvas above 16.7 million pixels, so the element keeps the print
 * area's 5:6 shape at a size every phone can allocate. The print size stays in `PRINT_CANVAS_SPEC`
 * and in the element's `data-canvas-*` attributes.
 */
export const PRINT_CANVAS_BACKING_SPEC = Object.freeze({
  widthPx: 900,
  heightPx: 1080,
});
