import { ARTWORK_VIEWBOX } from "@/lib/design-export";

export type AlignBox = { x: number; y: number; width: number; height: number };
export type AlignEdge = "left" | "centre" | "right" | "top" | "middle" | "bottom";
export type TidyAxis = "x" | "y";

/** The area artwork prints in, in artwork units. The mockup design areas will replace it as the
 * target once the shop defines them; every helper here takes the target as an argument for that. */
export const ARTWORK_PRINT_AREA: AlignBox = {
  x: 0,
  y: 0,
  width: ARTWORK_VIEWBOX.width,
  height: ARTWORK_VIEWBOX.height,
};

export const ALIGN_EDGES: readonly AlignEdge[] = ["left", "centre", "right", "top", "middle", "bottom"];

export const ALIGN_EDGE_LABELS: Record<AlignEdge, string> = {
  left: "Align left",
  centre: "Align centre",
  right: "Align right",
  top: "Align top",
  middle: "Align middle",
  bottom: "Align bottom",
};

/** The box that holds every given box, so a multi-selection aligns as one unit. */
export function unionBox(boxes: AlignBox[]): AlignBox | null {
  if (boxes.length === 0) return null;
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.width));
  const bottom = Math.max(...boxes.map((box) => box.y + box.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** How far to move a box to line it up with the target. Movement only — nothing is resized. */
export function alignOffset(box: AlignBox, target: AlignBox, edge: AlignEdge): { dx: number; dy: number } {
  switch (edge) {
    case "left":
      return { dx: target.x - box.x, dy: 0 };
    case "centre":
      return { dx: target.x + target.width / 2 - (box.x + box.width / 2), dy: 0 };
    case "right":
      return { dx: target.x + target.width - (box.x + box.width), dy: 0 };
    case "top":
      return { dx: 0, dy: target.y - box.y };
    case "middle":
      return { dx: 0, dy: target.y + target.height / 2 - (box.y + box.height / 2) };
    case "bottom":
      return { dx: 0, dy: target.y + target.height - (box.y + box.height) };
  }
}

/**
 * Equal spacing between three or more boxes on one axis. The two outermost boxes stay where they
 * are and the ones between them move, so tidying never shifts the group as a whole.
 */
export function tidyDeltas(boxes: AlignBox[], axis: TidyAxis): number[] {
  const deltas = boxes.map(() => 0);
  if (boxes.length < 3) return deltas;
  const start = (box: AlignBox) => (axis === "x" ? box.x : box.y);
  const size = (box: AlignBox) => (axis === "x" ? box.width : box.height);
  const order = boxes.map((box, index) => ({ box, index })).sort((a, b) => start(a.box) - start(b.box));
  const first = order[0].box;
  const last = order[order.length - 1].box;
  const span = start(last) + size(last) - start(first);
  const painted = order.reduce((total, item) => total + size(item.box), 0);
  const gap = (span - painted) / (order.length - 1);
  let cursor = start(first) + size(first) + gap;
  for (let i = 1; i < order.length - 1; i += 1) {
    const { box, index } = order[i];
    deltas[index] = cursor - start(box);
    cursor += size(box) + gap;
  }
  return deltas;
}
