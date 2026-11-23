/**
 * How much room the scrolling editor viewport must reserve at the bottom so the floating tools bar
 * does not sit on top of the print canvas.
 *
 * The bar floats over the viewport (z-50) instead of taking layout space, which is right on a desktop
 * where the canvas is centred and clear of it. On a short phone the canvas runs under the bar, and the
 * workspace is centred with `my-auto`, so there was nothing to scroll: the bottom of the print area
 * could not be reached at all.
 */
export const TOOLS_BAR_CLEARANCE_GAP_PX = 20;

export type ToolsBarGeometry = {
  /** Bottom of the print canvas as it is drawn now. */
  canvasBottom: number;
  /** Top of the floating tools bar. */
  barTop: number;
  /** Top of the scrolling viewport, i.e. the box the bar floats over. */
  viewportTop: number;
  /** Height of that box. */
  viewportHeight: number;
};

/**
 * Zero when the canvas is already clear of the bar. Otherwise the scroll room the canvas needs: it
 * fills the viewport, so what it needs is the viewport height minus the strip the bar covers. Any less
 * leaves the last pixels under the bar with nothing to scroll. Reserve it with a spacer inside the
 * scroller, never as padding on the scroller itself: the scroller is absolutely positioned, so its
 * padding inflates its own box and pushes the editor under the bottom navigation.
 */
export function editorToolsBarClearance({ canvasBottom, barTop, viewportTop, viewportHeight }: ToolsBarGeometry): number {
  if (![canvasBottom, barTop, viewportTop, viewportHeight].every(Number.isFinite)) return 0;
  const hidden = canvasBottom + TOOLS_BAR_CLEARANCE_GAP_PX - barTop;
  if (hidden <= 0) return 0;
  const covered = Math.max(0, barTop - viewportTop);
  return Math.round(Math.max(hidden, viewportHeight - covered + TOOLS_BAR_CLEARANCE_GAP_PX));
}
