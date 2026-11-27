// Plan §12.2.12 item 6: a pattern in the bucket is one SVG that already covers the 1000 x 1200 artwork
// space. The editor paints a pattern as a shape layer, so the file is read into the same
// `EditorShapePath` list the nine built-in patterns build in code: basic shapes with a solid fill or a
// stroke, scaled into artwork units. A layer has to stay movable, scalable and rotatable, so anything a
// shape cannot carry (a gradient, a filter, an embedded image, text) is reported instead of painted.
import type { EditorShapePath } from "./editor-layers";

export const PATTERN_ARTWORK_WIDTH = 1000;
export const PATTERN_ARTWORK_HEIGHT = 1200;

/** `[a, b, c, d, e, f]`: x' = a x + c y + e, y' = b x + d y + f. */
type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export type SvgShapeIssue = { element: string; reason: string };

export type SvgShapeReading = {
  paths: EditorShapePath[];
  /** What could not be painted, with the element that carries it, so the shop can flatten it. */
  issues: SvgShapeIssue[];
};

const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function numbers(value: string): number[] {
  return (value.match(NUMBER) ?? []).map(Number);
}

function format(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

function multiply(left: Matrix, right: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = left;
  const [a2, b2, c2, d2, e2, f2] = right;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/** `translate`, `scale` and `matrix` compose; a rotation or a skew cannot be kept in a shape's `d`. */
function parseTransform(value: string): { matrix: Matrix } | { reason: string } {
  let matrix: Matrix = IDENTITY;
  const calls = value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g);
  for (const call of calls) {
    const name = call[1];
    const args = numbers(call[2]);
    if (name === "translate") {
      matrix = multiply(matrix, [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0]);
    } else if (name === "scale") {
      const sx = args[0] ?? 1;
      matrix = multiply(matrix, [sx, 0, 0, args[1] ?? sx, 0, 0]);
    } else if (name === "matrix" && args.length === 6) {
      matrix = multiply(matrix, args as Matrix);
    } else {
      return { reason: `transform "${name}()" cannot be kept in a shape; flatten it` };
    }
  }
  return { matrix };
}

/**
 * The same path with every coordinate put through the matrix. Commands are written back in absolute
 * form, so a relative command cannot be read against a moved origin.
 */
export function transformPathData(d: string, matrix: Matrix): string {
  const [a, b, c, d1, e, f] = matrix;
  const point = (x: number, y: number) => `${format(a * x + c * y + e)} ${format(b * x + d1 * y + f)}`;
  const scale = Math.sqrt(Math.abs(a * d1 - b * c));
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? [];
  const arity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  const out: string[] = [];
  let index = 0;
  let command = "";
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      index += 1;
      if (command.toUpperCase() === "Z") {
        out.push("Z");
        currentX = startX;
        currentY = startY;
      }
      continue;
    }
    const upper = command.toUpperCase();
    const relative = command !== upper;
    const count = arity[upper] ?? 2;
    const args = tokens.slice(index, index + count).map(Number);
    index += count;
    if (upper === "H") {
      const x = relative ? currentX + args[0] : args[0];
      out.push(`L ${point(x, currentY)}`);
      currentX = x;
      continue;
    }
    if (upper === "V") {
      const y = relative ? currentY + args[0] : args[0];
      out.push(`L ${point(currentX, y)}`);
      currentY = y;
      continue;
    }
    if (upper === "A") {
      const x = relative ? currentX + args[5] : args[5];
      const y = relative ? currentY + args[6] : args[6];
      out.push(`A ${format(args[0] * scale)} ${format(args[1] * scale)} ${format(args[2])} ${args[3]} ${args[4]} ${point(x, y)}`);
      currentX = x;
      currentY = y;
      continue;
    }
    const pairs: [number, number][] = [];
    for (let at = 0; at + 1 < args.length; at += 2) {
      const x = relative ? currentX + args[at] : args[at];
      const y = relative ? currentY + args[at + 1] : args[at + 1];
      pairs.push([x, y]);
      currentX = x;
      currentY = y;
    }
    if (upper === "M") {
      startX = pairs[0]?.[0] ?? currentX;
      startY = pairs[0]?.[1] ?? currentY;
      out.push(`M ${point(pairs[0][0], pairs[0][1])}`);
      for (const [x, y] of pairs.slice(1)) out.push(`L ${point(x, y)}`);
      // A repeated `M` group continues as `L`, exactly as the path grammar says.
      command = relative ? "l" : "L";
      continue;
    }
    if (!pairs.length) continue;
    out.push(`${upper} ${pairs.map(([x, y]) => point(x, y)).join(" ")}`);
  }
  return out.join(" ");
}

function rectPath(attrs: Map<string, string>): string | null {
  const x = Number(attrs.get("x") ?? 0);
  const y = Number(attrs.get("y") ?? 0);
  const width = Number(attrs.get("width") ?? 0);
  const height = Number(attrs.get("height") ?? 0);
  if (!(width > 0 && height > 0)) return null;
  const radius = Math.min(Number(attrs.get("rx") ?? attrs.get("ry") ?? 0), width / 2, height / 2);
  if (!(radius > 0)) return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
  const k = radius * 0.5523;
  return [
    `M ${x + radius} ${y}`,
    `H ${x + width - radius}`,
    `C ${x + width - radius + k} ${y} ${x + width} ${y + radius - k} ${x + width} ${y + radius}`,
    `V ${y + height - radius}`,
    `C ${x + width} ${y + height - radius + k} ${x + width - radius + k} ${y + height} ${x + width - radius} ${y + height}`,
    `H ${x + radius}`,
    `C ${x + radius - k} ${y + height} ${x} ${y + height - radius + k} ${x} ${y + height - radius}`,
    `V ${y + radius}`,
    `C ${x} ${y + radius - k} ${x + radius - k} ${y} ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

/** An ellipse as four cubic segments: no arcs, so every later transform stays exact. */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string | null {
  if (!(rx > 0 && ry > 0)) return null;
  const kx = rx * 0.5523;
  const ky = ry * 0.5523;
  return [
    `M ${cx - rx} ${cy}`,
    `C ${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry}`,
    `C ${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy}`,
    `C ${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry}`,
    `C ${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy}`,
    "Z",
  ].join(" ");
}

function elementPath(tag: string, attrs: Map<string, string>): string | null {
  if (tag === "path") return attrs.get("d")?.trim() || null;
  if (tag === "rect") return rectPath(attrs);
  if (tag === "circle") {
    const r = Number(attrs.get("r") ?? 0);
    return ellipsePath(Number(attrs.get("cx") ?? 0), Number(attrs.get("cy") ?? 0), r, r);
  }
  if (tag === "ellipse") {
    return ellipsePath(
      Number(attrs.get("cx") ?? 0),
      Number(attrs.get("cy") ?? 0),
      Number(attrs.get("rx") ?? 0),
      Number(attrs.get("ry") ?? 0),
    );
  }
  if (tag === "line") {
    const points = numbers(`${attrs.get("x1") ?? 0} ${attrs.get("y1") ?? 0} ${attrs.get("x2") ?? 0} ${attrs.get("y2") ?? 0}`);
    return `M ${points[0]} ${points[1]} L ${points[2]} ${points[3]}`;
  }
  if (tag === "polygon" || tag === "polyline") {
    const points = numbers(attrs.get("points") ?? "");
    if (points.length < 4) return null;
    const pairs: string[] = [];
    for (let at = 0; at + 1 < points.length; at += 2) pairs.push(`${points[at]} ${points[at + 1]}`);
    return `M ${pairs.join(" L ")}${tag === "polygon" ? " Z" : ""}`;
  }
  return null;
}

const DRAWING_TAGS = new Set(["path", "rect", "circle", "ellipse", "line", "polygon", "polyline"]);
/** Elements that paint something a shape layer cannot carry. */
const UNSUPPORTED_TAGS = new Set(["image", "text", "tspan", "use", "foreignObject"]);
/** Elements that never paint on their own; skipping them silently is correct. */
const IGNORED_TAGS = new Set([
  "svg", "g", "defs", "title", "desc", "metadata", "style", "clipPath", "mask", "filter", "symbol",
  "linearGradient", "radialGradient", "pattern", "stop", "marker", "switch",
]);

const PAINT_ATTRIBUTES = ["fill", "stroke", "stroke-width", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity"] as const;

function readAttributes(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  for (const match of raw.matchAll(/([a-zA-Z_:][-\w:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    attrs.set(match[1], match[2] ?? match[3] ?? "");
  }
  const style = attrs.get("style");
  if (style) {
    for (const declaration of style.split(";")) {
      const [name, ...rest] = declaration.split(":");
      if (!name || !rest.length) continue;
      attrs.set(name.trim(), rest.join(":").trim());
    }
  }
  return attrs;
}

/**
 * The shapes of one pattern SVG, in artwork units. The root `viewBox` is scaled onto the 1000 x 1200
 * artwork space; every child transform composes with it.
 */
export function svgShapePaths(
  svg: string,
  options: { width?: number; height?: number } = {},
): SvgShapeReading {
  const width = options.width ?? PATTERN_ARTWORK_WIDTH;
  const height = options.height ?? PATTERN_ARTWORK_HEIGHT;
  const paths: EditorShapePath[] = [];
  const issues: SvgShapeIssue[] = [];
  const source = svg.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?[\s\S]*?\?>/g, "");

  const root = /<svg\b([^>]*)>/i.exec(source);
  const rootAttrs = readAttributes(root?.[1] ?? "");
  const viewBox = numbers(rootAttrs.get("viewBox") ?? "");
  const base: Matrix = viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0
    ? [width / viewBox[2], 0, 0, height / viewBox[3], -viewBox[0] * (width / viewBox[2]), -viewBox[1] * (height / viewBox[3])]
    : IDENTITY;

  const stack: { tag: string; attrs: Map<string, string>; matrix: Matrix }[] = [
    { tag: "svg", attrs: rootAttrs, matrix: base },
  ];

  for (const match of source.matchAll(/<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g)) {
    const closing = match[1] === "/";
    const tag = match[2];
    const selfClosing = match[4] === "/";
    if (closing) {
      for (let at = stack.length - 1; at > 0; at -= 1) {
        if (stack[at].tag === tag) {
          stack.length = at;
          break;
        }
      }
      continue;
    }
    const own = readAttributes(match[3]);
    const parent = stack[stack.length - 1];
    const transform = own.get("transform");
    let matrix = parent.matrix;
    if (transform) {
      const parsed = parseTransform(transform);
      if ("reason" in parsed) {
        issues.push({ element: tag, reason: parsed.reason });
        if (!selfClosing && !IGNORED_TAGS.has(tag)) stack.push({ tag, attrs: new Map(), matrix });
        continue;
      }
      matrix = multiply(parent.matrix, parsed.matrix);
    }
    const attrs = new Map<string, string>();
    for (const name of PAINT_ATTRIBUTES) {
      const inherited = parent.attrs.get(name) ?? own.get(name);
      if (inherited !== undefined) attrs.set(name, inherited);
    }

    if (tag === "g" || tag === "svg") {
      if (!selfClosing) stack.push({ tag, attrs, matrix });
      continue;
    }
    if (UNSUPPORTED_TAGS.has(tag)) {
      issues.push({ element: tag, reason: `<${tag}> cannot be a shape; flatten it into paths` });
      continue;
    }
    if (IGNORED_TAGS.has(tag)) continue;
    if (!DRAWING_TAGS.has(tag)) {
      issues.push({ element: tag, reason: `<${tag}> is not a shape the editor paints` });
      continue;
    }

    const raw = elementPath(tag, own);
    if (!raw) continue;
    const fill = attrs.get("fill") ?? "#000000";
    const stroke = attrs.get("stroke");
    if (fill.startsWith("url(") || stroke?.startsWith("url(")) {
      issues.push({ element: tag, reason: "a gradient or pattern fill cannot be a shape; use a solid colour" });
      continue;
    }
    if (fill === "none" && (!stroke || stroke === "none")) continue;
    const shape: EditorShapePath = { d: transformPathData(raw, matrix) };
    if (fill !== "none") shape.fill = fill;
    if (stroke && stroke !== "none") {
      shape.stroke = stroke;
      // A stroke is painted in user units, so the matrix scale has to reach it too.
      const scale = Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])) || 1;
      const strokeWidth = Number(attrs.get("stroke-width") ?? 1);
      shape.strokeWidth = Number.isFinite(strokeWidth) && strokeWidth > 0 ? strokeWidth * scale : scale;
    }
    const dash = attrs.get("stroke-dasharray");
    if (dash && dash !== "none") shape.dash = dash;
    if (shape.d) paths.push(shape);
  }

  return { paths, issues };
}
