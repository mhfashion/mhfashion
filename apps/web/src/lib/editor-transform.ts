export type TransformPoint = { x: number; y: number };
export type TransformBounds = { x: number; y: number; width: number; height: number };
export type TransformHandle = "top-left" | "top-center" | "top-right" | "middle-left" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right";

export function rotateTransformPoint(point: TransformPoint, center: TransformPoint, degrees: number): TransformPoint {
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const x = point.x - center.x;
  const y = point.y - center.y;
  return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos };
}

const HANDLE_AXIS: Record<TransformHandle, { x: -1 | 0 | 1; y: -1 | 0 | 1 }> = {
  "top-left": { x: -1, y: -1 },
  "top-center": { x: 0, y: -1 },
  "top-right": { x: 1, y: -1 },
  "middle-left": { x: -1, y: 0 },
  "middle-right": { x: 1, y: 0 },
  "bottom-left": { x: -1, y: 1 },
  "bottom-center": { x: 0, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

function positiveScale(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0.05, Math.min(20, value));
}

export function getFreeTransformResizeAnchor(input: {
  bounds: TransformBounds;
  handle: TransformHandle;
  rotation: number;
  centered: boolean;
}): TransformPoint {
  const { bounds, handle, rotation, centered } = input;
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  if (centered) return center;
  const axis = HANDLE_AXIS[handle];
  const opposite = {
    x: center.x - axis.x * bounds.width / 2,
    y: center.y - axis.y * bounds.height / 2,
  };
  return rotateTransformPoint(opposite, center, rotation);
}

/**
 * Compute Free Transform resize factors in the selection's rotated coordinate space.
 * Corners remain proportional by default; Shift toggles to independent X/Y scaling.
 * Side handles scale only their corresponding axis. Alt/Option moves the scale anchor
 * to the selection center. Pointer grab offset is preserved to prevent an initial jump.
 */
export function getFreeTransformResizeFactors(input: {
  bounds: TransformBounds;
  handle: TransformHandle;
  rotation: number;
  pointerStart: TransformPoint;
  pointerCurrent: TransformPoint;
  centered: boolean;
  freeScale: boolean;
}): TransformPoint {
  const { bounds, handle, rotation, pointerStart, pointerCurrent, centered, freeScale } = input;
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  const startLocal = rotateTransformPoint(pointerStart, center, -rotation);
  const currentLocal = rotateTransformPoint(pointerCurrent, center, -rotation);
  const dragDelta = { x: currentLocal.x - startLocal.x, y: currentLocal.y - startLocal.y };
  const axis = HANDLE_AXIS[handle];
  const handlePoint = {
    x: center.x + axis.x * bounds.width / 2,
    y: center.y + axis.y * bounds.height / 2,
  };
  const target = { x: handlePoint.x + dragDelta.x, y: handlePoint.y + dragDelta.y };
  const anchor = centered
    ? center
    : { x: center.x - axis.x * bounds.width / 2, y: center.y - axis.y * bounds.height / 2 };
  const startVector = { x: handlePoint.x - anchor.x, y: handlePoint.y - anchor.y };
  const currentVector = { x: target.x - anchor.x, y: target.y - anchor.y };
  const canScaleX = axis.x !== 0;
  const canScaleY = axis.y !== 0;

  if (canScaleX && canScaleY && !freeScale) {
    const startDistance = Math.hypot(startVector.x, startVector.y);
    const currentDistance = Math.hypot(currentVector.x, currentVector.y);
    const factor = positiveScale(currentDistance / Math.max(startDistance, 0.001));
    return { x: factor, y: factor };
  }

  return {
    x: canScaleX ? positiveScale(currentVector.x / (startVector.x || 1)) : 1,
    y: canScaleY ? positiveScale(currentVector.y / (startVector.y || 1)) : 1,
  };
}

export function snapEditorRotationDelta(delta: number, enabled: boolean, increment = 15): number {
  if (!enabled || !Number.isFinite(delta) || increment <= 0) return delta;
  return Math.round(delta / increment) * increment;
}
