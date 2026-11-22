/**
 * Shape Builder geometry: the boolean operations behind merge, subtract, intersect and exclude.
 *
 * Every path is flattened into closed rings of points, the rings are split where the two sides
 * cross, each piece is kept or dropped by the side it falls on, and the kept pieces are chained
 * back into rings. Curves are sampled at `FLATTEN_TOLERANCE` artwork units (about one print pixel
 * at 4.5 px per unit), so the result is one path that prints without visible faceting.
 */
export type PathBooleanOperation = "merge" | "subtract" | "intersect" | "exclude";

type Point = { x: number; y: number };
export type PathRing = Point[];
type Segment = { a: Point; b: Point };

const FLATTEN_TOLERANCE = 0.25;
const EPSILON = 1e-7;

const round = (value: number) => Math.round(value * 100) / 100;
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const midpoint = (segment: Segment): Point => ({ x: (segment.a.x + segment.b.x) / 2, y: (segment.a.y + segment.b.y) / 2 });

function cubicPoint(p0: Point, c1: Point, c2: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p1.x, y: a * p0.y + b * c1.y + c * c2.y + d * p1.y };
}

function flattenCubic(out: PathRing, p0: Point, c1: Point, c2: Point, p1: Point, tolerance = FLATTEN_TOLERANCE): void {
  const length = distance(p0, c1) + distance(c1, c2) + distance(c2, p1);
  const steps = Math.max(3, Math.min(96, Math.ceil(length / Math.max(0.05, tolerance * 4))));
  for (let step = 1; step <= steps; step += 1) out.push(cubicPoint(p0, c1, c2, p1, step / steps));
}

const reflect = (control: Point, around: Point): Point => ({ x: 2 * around.x - control.x, y: 2 * around.y - control.y });

/**
 * Walk an SVG path's commands into closed rings. Every subpath is treated as closed: a fill has
 * no other meaning, and a pen path that was left open is filled by its implicit closing line.
 * Arcs (`A`) are joined by a straight line to their endpoint; the editor never draws them.
 */
export function parsePathRings(d: string, tolerance = FLATTEN_TOLERANCE): PathRing[] {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  const rings: PathRing[] = [];
  let ring: PathRing | null = null;
  let cursor: Point = { x: 0, y: 0 };
  let subpathStart: Point = { x: 0, y: 0 };
  let command = "";
  let lastCubicControl: Point | null = null;
  let lastQuadControl: Point | null = null;
  let index = 0;

  const number = () => {
    if (index >= tokens.length) return Number.NaN;
    const value = Number(tokens[index]);
    index += 1;
    return value;
  };
  const point = (relative: boolean): Point => {
    const x = number();
    const y = number();
    return relative ? { x: cursor.x + x, y: cursor.y + y } : { x, y };
  };
  const push = (next: Point) => {
    if (ring) ring.push(next);
    cursor = next;
  };
  const closeRing = () => {
    if (ring && ring.length >= 3) rings.push(ring);
    ring = null;
  };

  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[a-zA-Z]$/.test(token)) {
      command = token;
      index += 1;
    } else if (!command) {
      break;
    }
    const relative = command === command.toLowerCase();
    const kind = command.toUpperCase();
    if (kind === "M") {
      closeRing();
      const start = point(relative);
      ring = [start];
      cursor = start;
      subpathStart = start;
      command = relative ? "l" : "L";
      lastCubicControl = null;
      lastQuadControl = null;
      continue;
    }
    if (kind === "Z") {
      closeRing();
      cursor = subpathStart;
      lastCubicControl = null;
      lastQuadControl = null;
      continue;
    }
    if (!ring) {
      if (!Number.isFinite(number())) break;
      ring = [{ x: 0, y: 0 }];
    }
    if (kind === "L") {
      push(point(relative));
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (kind === "H") {
      const x = number();
      if (!Number.isFinite(x)) break;
      push({ x: relative ? cursor.x + x : x, y: cursor.y });
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (kind === "V") {
      const y = number();
      if (!Number.isFinite(y)) break;
      push({ x: cursor.x, y: relative ? cursor.y + y : y });
      lastCubicControl = null;
      lastQuadControl = null;
    } else if (kind === "C" || kind === "S") {
      const first: Point = kind === "C" ? point(relative) : (lastCubicControl ? reflect(lastCubicControl, cursor) : cursor);
      const second = point(relative);
      const end = point(relative);
      if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) break;
      flattenCubic(ring, cursor, first, second, end, tolerance);
      cursor = end;
      lastCubicControl = second;
      lastQuadControl = null;
    } else if (kind === "Q" || kind === "T") {
      const control: Point = kind === "Q" ? point(relative) : (lastQuadControl ? reflect(lastQuadControl, cursor) : cursor);
      const end = point(relative);
      if (!Number.isFinite(end.x) || !Number.isFinite(end.y)) break;
      const c1 = { x: cursor.x + (2 / 3) * (control.x - cursor.x), y: cursor.y + (2 / 3) * (control.y - cursor.y) };
      const c2 = { x: end.x + (2 / 3) * (control.x - end.x), y: end.y + (2 / 3) * (control.y - end.y) };
      flattenCubic(ring, cursor, c1, c2, end, tolerance);
      cursor = end;
      lastQuadControl = control;
      lastCubicControl = null;
    } else if (kind === "A") {
      const rx = number();
      const ry = number();
      const rotation = number();
      const largeArc = number();
      const sweep = number();
      const end = point(relative);
      if (![rx, ry, rotation, largeArc, sweep, end.x, end.y].every(Number.isFinite)) break;
      push(end);
      lastCubicControl = null;
      lastQuadControl = null;
    } else {
      break;
    }
  }
  closeRing();
  return rings.filter((candidate) => candidate.length >= 3 && Math.abs(signedArea(candidate)) > EPSILON);
}

export function signedArea(ring: PathRing): number {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function pointInRing(point: Point, ring: PathRing): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function pointInRings(point: Point, rings: PathRing[]): boolean {
  return rings.reduce((inside, ring) => (pointInRing(point, ring) ? !inside : inside), false);
}

function ringSegments(rings: PathRing[]): Segment[] {
  return rings.flatMap((ring) => ring.map((point, index) => ({ a: point, b: ring[(index + 1) % ring.length] })));
}

/** Where two segments cross, as a parameter along each. Collinear overlaps are ignored. */
function segmentCrossing(one: Segment, other: Segment): { t: number; u: number } | null {
  const rx = one.b.x - one.a.x;
  const ry = one.b.y - one.a.y;
  const sx = other.b.x - other.a.x;
  const sy = other.b.y - other.a.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < 1e-9) return null;
  const dx = other.a.x - one.a.x;
  const dy = other.a.y - one.a.y;
  const t = (dx * sy - dy * sx) / denominator;
  const u = (dx * ry - dy * rx) / denominator;
  if (t <= EPSILON || t >= 1 - EPSILON || u <= EPSILON || u >= 1 - EPSILON) return null;
  return { t, u };
}

function splitSegments(segments: Segment[], cuts: number[][]): Segment[] {
  return segments.flatMap((segment, index) => {
    const stops = [0, ...cuts[index].sort((a, b) => a - b), 1];
    const pieces: Segment[] = [];
    for (let stop = 1; stop < stops.length; stop += 1) {
      const from = stops[stop - 1];
      const to = stops[stop];
      if (to - from <= EPSILON) continue;
      pieces.push({
        a: { x: segment.a.x + (segment.b.x - segment.a.x) * from, y: segment.a.y + (segment.b.y - segment.a.y) * from },
        b: { x: segment.a.x + (segment.b.x - segment.a.x) * to, y: segment.a.y + (segment.b.y - segment.a.y) * to },
      });
    }
    return pieces;
  });
}

/**
 * Merge endpoints that landed within a hundredth of a unit of each other into one shared point.
 * The crossing of edge A and edge B is computed twice, once from each edge, and the two results
 * differ in the last bits; without this the chain walk cannot join them and the ring is lost.
 */
function canonicalPoints(segments: Segment[]): Segment[] {
  const cell = 0.01;
  const grid = new Map<string, Point[]>();
  const canonical = (point: Point): Point => {
    const column = Math.floor(point.x / cell);
    const row = Math.floor(point.y / cell);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const candidate of grid.get(`${column + dx}:${row + dy}`) ?? []) {
          if (Math.hypot(candidate.x - point.x, candidate.y - point.y) <= cell) return candidate;
        }
      }
    }
    const created = { x: point.x, y: point.y };
    const key = `${column}:${row}`;
    const bucket = grid.get(key);
    if (bucket) bucket.push(created);
    else grid.set(key, [created]);
    return created;
  };
  return segments.map((segment) => ({ a: canonical(segment.a), b: canonical(segment.b) }));
}

function chainSegments(segments: Segment[]): PathRing[] {
  const buckets = new Map<Point, number[]>();
  segments.forEach((segment, index) => {
    for (const point of [segment.a, segment.b]) {
      const bucket = buckets.get(point);
      if (bucket) bucket.push(index);
      else buckets.set(point, [index]);
    }
  });
  const used = new Set<number>();
  const rings: PathRing[] = [];
  for (let index = 0; index < segments.length; index += 1) {
    if (used.has(index)) continue;
    used.add(index);
    const start = segments[index].a;
    const ring: PathRing = [start, segments[index].b];
    let end = segments[index].b;
    let closed = false;
    while (!closed) {
      if (end === start) {
        closed = true;
        break;
      }
      const next = (buckets.get(end) ?? []).find((candidate) => !used.has(candidate));
      if (next === undefined) break;
      used.add(next);
      const segment = segments[next];
      end = segment.a === end ? segment.b : segment.a;
      ring.push(end);
    }
    if (closed && ring.length >= 4) rings.push(ring.slice(0, -1));
  }
  return rings;
}

/**
 * Nonzero fill needs an outer ring and its holes to run opposite ways, so each ring is oriented
 * by how many other rings contain it.
 */
function orientRings(rings: PathRing[]): PathRing[] {
  return rings.map((ring, index) => {
    const centroid = ring.reduce((total, point) => ({ x: total.x + point.x / ring.length, y: total.y + point.y / ring.length }), { x: 0, y: 0 });
    const probe = { x: ring[0].x + (centroid.x - ring[0].x) * 0.01, y: ring[0].y + (centroid.y - ring[0].y) * 0.01 };
    const depth = rings.reduce((count, other, otherIndex) => (otherIndex === index ? count : count + (pointInRing(probe, other) ? 1 : 0)), 0);
    const counterClockwise = signedArea(ring) > 0;
    return counterClockwise === (depth % 2 === 0) ? ring : [...ring].reverse();
  });
}

export function booleanRings(a: PathRing[], b: PathRing[], operation: PathBooleanOperation): PathRing[] {
  if (!a.length || !b.length) return operation === "merge" || operation === "exclude" ? [...a, ...b] : [...a];
  if (operation === "exclude") {
    return orientRings([...booleanRings(a, b, "subtract"), ...booleanRings(b, a, "subtract")]);
  }
  const aSegments = ringSegments(a);
  const bSegments = ringSegments(b);
  const aCuts = aSegments.map(() => [] as number[]);
  const bCuts = bSegments.map(() => [] as number[]);
  aSegments.forEach((one, i) => {
    bSegments.forEach((other, j) => {
      const crossing = segmentCrossing(one, other);
      if (!crossing) return;
      aCuts[i].push(crossing.t);
      bCuts[j].push(crossing.u);
    });
  });
  const kept: Segment[] = [];
  const keepOutside = operation !== "intersect";
  for (const piece of splitSegments(aSegments, aCuts)) {
    if (pointInRings(midpoint(piece), b) === !keepOutside) kept.push(piece);
  }
  const keepInsideB = operation === "intersect" || operation === "subtract";
  for (const piece of splitSegments(bSegments, bCuts)) {
    if (pointInRings(midpoint(piece), a) === keepInsideB) kept.push(piece);
  }
  return orientRings(chainSegments(canonicalPoints(kept)));
}

export function ringsToPathData(rings: PathRing[]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map((ring) => `M ${round(ring[0].x)} ${round(ring[0].y)} ${ring.slice(1).map((point) => `L ${round(point.x)} ${round(point.y)}`).join(" ")} Z`)
    .join(" ");
}

/**
 * Fold the paths of one shape into a single path. The first path is the base, so subtract cuts
 * everything after it out of it. Returns an empty string when nothing is left.
 */
export function booleanPathData(paths: string[], operation: PathBooleanOperation): string {
  const rings = paths.map((d) => parsePathRings(d)).filter((candidate) => candidate.length > 0);
  if (!rings.length) return "";
  let result = rings[0];
  for (let index = 1; index < rings.length; index += 1) result = booleanRings(result, rings[index], operation);
  return ringsToPathData(result);
}
