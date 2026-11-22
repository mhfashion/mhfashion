import type { AlignBox } from "@/lib/editor-align";

export type SnapGuide = { axis: "x" | "y"; position: number };
export type SnapResult = { dx: number; dy: number; guides: SnapGuide[] };

/** How close, in artwork units, a moving edge has to come before it snaps. */
export const EDITOR_SNAP_DISTANCE = 8;

/** The three lines a box offers on one axis: both edges and the centre. */
export function snapLinesFor(box: AlignBox, axis: "x" | "y"): number[] {
  return axis === "x"
    ? [box.x, box.x + box.width / 2, box.x + box.width]
    : [box.y, box.y + box.height / 2, box.y + box.height];
}

/** The canvas edges and centre plus every other layer's edges and centre. */
export function snapTargetLines(boxes: AlignBox[], area: AlignBox): { x: number[]; y: number[] } {
  const x = new Set<number>(snapLinesFor(area, "x"));
  const y = new Set<number>(snapLinesFor(area, "y"));
  boxes.forEach((box) => {
    snapLinesFor(box, "x").forEach((line) => x.add(line));
    snapLinesFor(box, "y").forEach((line) => y.add(line));
  });
  return { x: [...x], y: [...y] };
}

function closestLine(moving: number[], targets: number[], distance: number): { delta: number; position: number } | null {
  let best: { delta: number; position: number } | null = null;
  for (const line of moving) {
    for (const target of targets) {
      const delta = target - line;
      if (Math.abs(delta) > distance) continue;
      if (!best || Math.abs(delta) < Math.abs(best.delta)) best = { delta, position: target };
    }
  }
  return best;
}

/**
 * Where the box has to move so one of its edges or its centre lands exactly on a target line.
 * The nearest match wins on each axis, so a drag never jumps to a line it is barely touching.
 */
export function snapBoxToLines(box: AlignBox, targets: { x: number[]; y: number[] }, distance = EDITOR_SNAP_DISTANCE): SnapResult {
  const guides: SnapGuide[] = [];
  const x = closestLine(snapLinesFor(box, "x"), targets.x, distance);
  const y = closestLine(snapLinesFor(box, "y"), targets.y, distance);
  if (x) guides.push({ axis: "x", position: x.position });
  if (y) guides.push({ axis: "y", position: y.position });
  return { dx: x?.delta ?? 0, dy: y?.delta ?? 0, guides };
}

/** The box a drag would produce, so snapping is measured on the drag's own geometry. */
export function offsetBox(box: AlignBox, dx: number, dy: number): AlignBox {
  return { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height };
}
