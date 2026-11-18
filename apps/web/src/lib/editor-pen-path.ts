export type EditorPenPoint = { x: number; y: number };
export type EditorPenAnchor = EditorPenPoint & {
  handleIn?: EditorPenPoint | null;
  handleOut?: EditorPenPoint | null;
};
export type EditorPenPath = { anchors: EditorPenAnchor[]; closed: boolean };

type SpacePoint = { x: number; y: number };
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 1200;

function toSpace(point: EditorPenPoint): SpacePoint {
  return { x: point.x * VIEW_WIDTH, y: point.y * VIEW_HEIGHT };
}

function fromSpace(point: SpacePoint): EditorPenPoint {
  return { x: point.x / VIEW_WIDTH, y: point.y / VIEW_HEIGHT };
}

function offsetToSpace(point: EditorPenPoint): SpacePoint {
  return { x: point.x * VIEW_WIDTH, y: point.y * VIEW_HEIGHT };
}

function format(value: number): string {
  return String(Number(value.toFixed(3)));
}

function pointText(point: SpacePoint): string {
  return `${format(point.x)} ${format(point.y)}`;
}

function add(left: SpacePoint, right: SpacePoint): SpacePoint {
  return { x: left.x + right.x, y: left.y + right.y };
}

function subtract(left: SpacePoint, right: SpacePoint): SpacePoint {
  return { x: left.x - right.x, y: left.y - right.y };
}

function lerp(left: SpacePoint, right: SpacePoint, t: number): SpacePoint {
  return { x: left.x + (right.x - left.x) * t, y: left.y + (right.y - left.y) * t };
}

function segmentControls(from: EditorPenAnchor, to: EditorPenAnchor) {
  const start = toSpace(from);
  const end = toSpace(to);
  return {
    start,
    control1: from.handleOut ? add(start, offsetToSpace(from.handleOut)) : start,
    control2: to.handleIn ? add(end, offsetToSpace(to.handleIn)) : end,
    end,
  };
}

function appendSegment(parts: string[], from: EditorPenAnchor, to: EditorPenAnchor) {
  const { control1, control2, end } = segmentControls(from, to);
  if (from.handleOut || to.handleIn) {
    parts.push(`C ${pointText(control1)} ${pointText(control2)} ${pointText(end)}`);
  } else {
    parts.push(`L ${pointText(end)}`);
  }
}

export function editorPenPathData(path: EditorPenPath, previewPoint?: EditorPenPoint | null): string {
  if (path.anchors.length === 0) return "";
  const anchors = previewPoint ? [...path.anchors, { ...previewPoint }] : path.anchors;
  const parts = [`M ${pointText(toSpace(anchors[0]))}`];
  for (let index = 1; index < anchors.length; index += 1) {
    appendSegment(parts, anchors[index - 1], anchors[index]);
  }
  if (path.closed && !previewPoint && anchors.length > 1) {
    appendSegment(parts, anchors[anchors.length - 1], anchors[0]);
    parts.push("Z");
  }
  return parts.join(" ");
}

/** Snap a new point to the nearest horizontal, vertical, or 45-degree segment. */
export function snapEditorPenPoint(point: EditorPenPoint, previous: EditorPenPoint): EditorPenPoint {
  const start = toSpace(previous);
  const end = toSpace(point);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return { ...point };
  const step = Math.PI / 4;
  const angle = Math.atan2(dy, dx);
  const snappedAngle = Math.round(angle / step) * step;
  return fromSpace({
    x: start.x + Math.cos(snappedAngle) * distance,
    y: start.y + Math.sin(snappedAngle) * distance,
  });
}

/** A click-drag creates matching Bézier handles on both sides of a smooth node. */
export function draggedEditorPenAnchor(point: EditorPenPoint, handleTip: EditorPenPoint): EditorPenAnchor {
  const handleOut = { x: handleTip.x - point.x, y: handleTip.y - point.y };
  return {
    ...point,
    handleOut,
    handleIn: { x: -handleOut.x, y: -handleOut.y },
  };
}

/** Alt-drag while placing breaks the smooth node into a corner: only the outgoing handle stays. */
export function cornerEditorPenAnchor(point: EditorPenPoint, handleTip: EditorPenPoint): EditorPenAnchor {
  return {
    ...point,
    handleOut: { x: handleTip.x - point.x, y: handleTip.y - point.y },
    handleIn: null,
  };
}

function cubicPoint(start: SpacePoint, control1: SpacePoint, control2: SpacePoint, end: SpacePoint, t: number): SpacePoint {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * start.x + b * control1.x + c * control2.x + d * end.x,
    y: a * start.y + b * control1.y + c * control2.y + d * end.y,
  };
}

function squaredDistance(left: SpacePoint, right: SpacePoint): number {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}

/** Insert a node at the nearest point on a path, preserving a cubic segment exactly. */
export function insertEditorPenAnchor(path: EditorPenPath, point: EditorPenPoint, maxDistance = 32): EditorPenPath | null {
  const { anchors, closed } = path;
  const segmentCount = closed ? anchors.length : anchors.length - 1;
  if (segmentCount < 1) return null;
  const query = toSpace(point);
  let best = { segmentIndex: -1, t: 0, distance: Infinity };

  for (let index = 0; index < segmentCount; index += 1) {
    const from = anchors[index];
    const to = anchors[(index + 1) % anchors.length];
    const controls = segmentControls(from, to);
    for (let step = 0; step <= 80; step += 1) {
      const t = step / 80;
      const candidate = from.handleOut || to.handleIn
        ? cubicPoint(controls.start, controls.control1, controls.control2, controls.end, t)
        : lerp(controls.start, controls.end, t);
      const distance = squaredDistance(candidate, query);
      if (distance < best.distance) best = { segmentIndex: index, t, distance };
    }
  }

  if (best.segmentIndex < 0 || best.distance > maxDistance * maxDistance || best.t <= 0.02 || best.t >= 0.98) return null;
  const from = anchors[best.segmentIndex];
  const nextIndex = (best.segmentIndex + 1) % anchors.length;
  const to = anchors[nextIndex];
  const controls = segmentControls(from, to);
  const isCurve = Boolean(from.handleOut || to.handleIn);
  const insertedPoint = isCurve
    ? cubicPoint(controls.start, controls.control1, controls.control2, controls.end, best.t)
    : lerp(controls.start, controls.end, best.t);
  const nextAnchors: EditorPenAnchor[] = anchors.map((anchor) => ({
    ...anchor,
    handleIn: anchor.handleIn ? { ...anchor.handleIn } : anchor.handleIn,
    handleOut: anchor.handleOut ? { ...anchor.handleOut } : anchor.handleOut,
  }));

  if (isCurve) {
    const q0 = lerp(controls.start, controls.control1, best.t);
    const q1 = lerp(controls.control1, controls.control2, best.t);
    const q2 = lerp(controls.control2, controls.end, best.t);
    const r0 = lerp(q0, q1, best.t);
    const r1 = lerp(q1, q2, best.t);
    const split = lerp(r0, r1, best.t);
    nextAnchors[best.segmentIndex] = {
      ...nextAnchors[best.segmentIndex],
      handleOut: fromSpace(subtract(q0, controls.start)),
    };
    nextAnchors[nextIndex] = {
      ...nextAnchors[nextIndex],
      handleIn: fromSpace(subtract(q2, controls.end)),
    };
    const inserted: EditorPenAnchor = {
      ...fromSpace(split),
      handleIn: fromSpace(subtract(r0, split)),
      handleOut: fromSpace(subtract(r1, split)),
    };
    nextAnchors.splice(best.segmentIndex + 1, 0, inserted);
  } else {
    nextAnchors.splice(best.segmentIndex + 1, 0, fromSpace(insertedPoint));
  }
  return { anchors: nextAnchors, closed };
}

export function removeEditorPenAnchor(path: EditorPenPath, index: number): EditorPenPath | null {
  const minimum = path.closed ? 3 : 2;
  if (path.anchors.length <= minimum || index < 0 || index >= path.anchors.length) return null;
  return { ...path, anchors: path.anchors.filter((_, anchorIndex) => anchorIndex !== index) };
}
