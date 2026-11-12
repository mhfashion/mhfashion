export type PathCommand = Array<string | number>;
export type PathPoint = { x: number; y: number };
export type PathSample = PathPoint & { distance: number; angle: number };
export type TextPathAlignment = "left" | "center" | "right";

export type TextPathLayoutOptions = {
  text: string;
  font: string;
  startOffset?: number;
  baselineOffset?: number;
  charSpacing?: number;
  alignment?: TextPathAlignment;
  reverse?: boolean;
  keepUpright?: boolean;
};

export type TextPathGlyph = {
  text: string;
  x: number;
  y: number;
  angle: number;
  width: number;
  distance: number;
};

function distance(a: PathPoint, b: PathPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function angle(a: PathPoint, b: PathPoint) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

/**
 * Convert the currently supported Fabric path commands into a polyline.
 * Curves are sampled rather than approximated by object bounds, so the same
 * geometry can be reused by the canvas renderer and the production exporter.
 */
export function flattenPath(commands: PathCommand[], curveSteps = 24): PathPoint[] {
  const points: PathPoint[] = [];
  let current: PathPoint = { x: 0, y: 0 };
  let start: PathPoint | null = null;
  let previousControl: PathPoint | null = null;

  const add = (point: PathPoint) => {
    if (!points.length || distance(points[points.length - 1], point) > 0.01) points.push(point);
    current = point;
  };
  const cubic = (p0: PathPoint, p1: PathPoint, p2: PathPoint, p3: PathPoint, t: number): PathPoint => {
    const u = 1 - t;
    return {
      x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
      y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
    };
  };
  const quadratic = (p0: PathPoint, p1: PathPoint, p2: PathPoint, t: number): PathPoint => {
    const u = 1 - t;
    return { x: u ** 2 * p0.x + 2 * u * t * p1.x + t ** 2 * p2.x, y: u ** 2 * p0.y + 2 * u * t * p1.y + t ** 2 * p2.y };
  };

  for (const command of commands) {
    const [name, ...raw] = command;
    const values = raw.map(Number);
    if (name === "M") {
      current = { x: values[0] ?? 0, y: values[1] ?? 0 };
      start = current;
      add(current);
      previousControl = null;
    } else if (name === "L") {
      add({ x: values[0] ?? current.x, y: values[1] ?? current.y });
      previousControl = null;
    } else if (name === "C") {
      const p0 = current;
      const p1 = { x: values[0] ?? current.x, y: values[1] ?? current.y };
      const p2 = { x: values[2] ?? p1.x, y: values[3] ?? p1.y };
      const p3 = { x: values[4] ?? p2.x, y: values[5] ?? p2.y };
      for (let index = 1; index <= curveSteps; index += 1) add(cubic(p0, p1, p2, p3, index / curveSteps));
      previousControl = p2;
    } else if (name === "Q") {
      const p0 = current;
      const p1 = { x: values[0] ?? current.x, y: values[1] ?? current.y };
      const p2 = { x: values[2] ?? p1.x, y: values[3] ?? p1.y };
      for (let index = 1; index <= curveSteps; index += 1) add(quadratic(p0, p1, p2, index / curveSteps));
      previousControl = p1;
    } else if (name === "S" && previousControl) {
      const reflected: PathPoint = { x: current.x * 2 - previousControl.x, y: current.y * 2 - previousControl.y };
      const p2: PathPoint = { x: values[0] ?? reflected.x, y: values[1] ?? reflected.y };
      const p3 = { x: values[2] ?? p2.x, y: values[3] ?? p2.y };
      for (let index = 1; index <= curveSteps; index += 1) add(cubic(current, reflected, p2, p3, index / curveSteps));
      previousControl = p2;
    } else if (name === "Z" && start) {
      add(start);
      previousControl = null;
    }
  }
  return points;
}

export function buildPathSamples(points: PathPoint[]): PathSample[] {
  if (!points.length) return [];
  const samples: PathSample[] = [{ ...points[0], distance: 0, angle: points.length > 1 ? angle(points[0], points[1]) : 0 }];
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
    samples.push({ ...points[index], distance: total, angle: angle(points[index - 1], points[index]) });
  }
  return samples;
}

export function sampleAtDistance(samples: PathSample[], requested: number): PathSample {
  if (!samples.length) return { x: 0, y: 0, distance: 0, angle: 0 };
  const target = Math.max(0, Math.min(samples[samples.length - 1].distance, requested));
  for (let index = 1; index < samples.length; index += 1) {
    const next = samples[index];
    const previous = samples[index - 1];
    if (target > next.distance) continue;
    const span = Math.max(0.0001, next.distance - previous.distance);
    const ratio = (target - previous.distance) / span;
    return {
      x: previous.x + (next.x - previous.x) * ratio,
      y: previous.y + (next.y - previous.y) * ratio,
      distance: target,
      angle: previous.angle + (next.angle - previous.angle) * ratio,
    };
  }
  return samples[samples.length - 1];
}

function graphemes(value: string): string[] {
  const Segmenter = (Intl as typeof Intl & { Segmenter?: new (locales?: string[], options?: { granularity: "grapheme" }) => { segment(value: string): Iterable<{ segment: string }> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(value), (part) => part.segment);
  return Array.from(value);
}

export function layoutTextOnPath(
  samples: PathSample[],
  options: TextPathLayoutOptions,
  measure: (grapheme: string, font: string) => number,
): TextPathGlyph[] {
  if (!samples.length || !options.text) return [];
  const chars = graphemes(options.text);
  const spacing = options.charSpacing ?? 0;
  const widths = chars.map((char) => Math.max(0, measure(char, options.font)));
  const total = widths.reduce((sum, width) => sum + width, 0) + Math.max(0, chars.length - 1) * spacing;
  const pathLength = samples[samples.length - 1].distance;
  const start = options.startOffset ?? 0;
  const alignment = options.alignment ?? "left";
  const alignedStart = alignment === "center" ? start - total / 2 : alignment === "right" ? start - total : start;
  const baseline = options.baselineOffset ?? 0;
  const reverse = Boolean(options.reverse);
  const result: TextPathGlyph[] = [];
  let cursor = alignedStart;

  for (let index = 0; index < chars.length; index += 1) {
    const width = widths[index];
    const midpoint = cursor + width / 2;
    if (midpoint > pathLength || midpoint < 0) {
      cursor += width + spacing;
      continue;
    }
    const sample = sampleAtDistance(samples, midpoint);
    let glyphAngle = sample.angle + (reverse ? Math.PI : 0);
    if (options.keepUpright && Math.cos(glyphAngle) < 0) glyphAngle += Math.PI;
    const normalX = -Math.sin(sample.angle);
    const normalY = Math.cos(sample.angle);
    result.push({ text: chars[index], x: sample.x + normalX * baseline, y: sample.y + normalY * baseline, angle: glyphAngle, width, distance: midpoint });
    cursor += width + spacing;
  }
  return result;
}
