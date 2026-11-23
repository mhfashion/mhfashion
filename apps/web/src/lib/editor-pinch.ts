/**
 * Two-finger pinch maths for the editor viewport, kept out of the component so it can be tested.
 *
 * The workspace is drawn with `translate(pan) scale(zoom)` about a transform origin that is the top
 * centre on a phone and the centre of the box on a desktop. A local point L therefore lands on screen
 * at `E + O + pan + (L - O) * zoom`, and `rect` below is the workspace's measured box at the start of
 * the gesture, which already carries that frame's pan and zoom.
 */
export const EDITOR_ZOOM_MIN = 0.25;
export const EDITOR_ZOOM_MAX = 3;

export type PinchFrame = {
  /** Distance between the two fingers when the gesture began, in CSS pixels. */
  distance: number;
  /** The workspace's measured left/top at that moment. */
  rectLeft: number;
  rectTop: number;
  /** Transform origin in the workspace's own pixels. */
  originX: number;
  originY: number;
  /** Where the fingers' midpoint was when the gesture began. */
  midpointX: number;
  midpointY: number;
  zoom: number;
  panX: number;
  panY: number;
};

export type PinchFingers = { distance: number; midpointX: number; midpointY: number };

export type PinchView = { zoom: number; panX: number; panY: number };

/**
 * Where the view goes while the fingers are at `fingers`. The artwork that was under the midpoint when
 * the gesture began follows the midpoint as the fingers spread and move, so a pinch zooms about the
 * point the user is holding and a two-finger drag pans the view.
 */
export function pinchView(start: PinchFrame, fingers: PinchFingers): PinchView {
  const unchanged = { zoom: start.zoom, panX: start.panX, panY: start.panY };
  if (!(start.distance > 0) || !(fingers.distance >= 0)) return unchanged;
  const zoom = Math.max(EDITOR_ZOOM_MIN, Math.min(EDITOR_ZOOM_MAX, (start.zoom * fingers.distance) / start.distance));
  // The start midpoint's screen offset from the box: the local point to keep under the fingers.
  const anchorX = start.midpointX - start.rectLeft;
  const anchorY = start.midpointY - start.rectTop;
  const shrink = 1 - zoom / start.zoom;
  const growth = zoom - start.zoom;
  return {
    zoom,
    panX: start.panX + (fingers.midpointX - start.midpointX) + anchorX * shrink + start.originX * growth,
    panY: start.panY + (fingers.midpointY - start.midpointY) + anchorY * shrink + start.originY * growth,
  };
}

/** The pinch frame for a gesture that starts now, from the live view and the measured box. */
export function pinchFrameFrom(
  view: { zoom: number; panX: number; panY: number },
  rect: { left: number; top: number },
  origin: { x: number; y: number },
  fingers: PinchFingers,
): PinchFrame {
  return {
    distance: fingers.distance,
    rectLeft: rect.left,
    rectTop: rect.top,
    originX: origin.x,
    originY: origin.y,
    midpointX: fingers.midpointX,
    midpointY: fingers.midpointY,
    ...view,
  };
}
