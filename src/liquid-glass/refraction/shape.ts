import { computeCorners, smoothRoundRectPath } from 'smooth-corners';
import { roundedBoxNormalAbs, sdRoundedBox } from './math';

type Point = { x: number; y: number };
type Vertex = Point & { nx: number; ny: number };
type Segment = { a: Vertex; b: Vertex };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Branch = Bounds & { segments?: Segment[]; left?: Branch; right?: Branch };

export type LensShape = {
  path: string;
  /** Half-span of this symmetric contour projected onto an arbitrary axis. */
  projectedExtent: (x: number, y: number) => number;
  /** Distance and outward normal in the first quadrant, in CSS pixels. */
  sample: (ax: number, ay: number) => { distance: number; nx: number; ny: number };
};

const shapes = new Map<string, LensShape>();
const TOLERANCE = 0.002;

function bounds(segments: Segment[]): Bounds {
  return {
    minX: Math.min(...segments.map(s => Math.min(s.a.x, s.b.x))),
    minY: Math.min(...segments.map(s => Math.min(s.a.y, s.b.y))),
    maxX: Math.max(...segments.map(s => Math.max(s.a.x, s.b.x))),
    maxY: Math.max(...segments.map(s => Math.max(s.a.y, s.b.y))),
  };
}

function branch(segments: Segment[]): Branch {
  const box = bounds(segments);
  if (segments.length <= 4) return { ...box, segments };
  // Segments follow a monotone quarter of the contour, so contiguous halves
  // give tight bounds without sorting or changing the contour's order.
  const middle = segments.length >> 1;
  return { ...box, left: branch(segments.slice(0, middle)), right: branch(segments.slice(middle)) };
}

function boxDistance(box: Bounds, x: number, y: number) {
  const dx = Math.max(box.minX - x, 0, x - box.maxX);
  const dy = Math.max(box.minY - y, 0, y - box.maxY);
  return dx * dx + dy * dy;
}

/**
 * One source of geometry for clipping, refraction, glare and the shadow ring.
 * The curve comes from squircle-kit, including its per-edge capsule fallback.
 * Tessellation stays within 0.002 CSS px; interpolated analytic tangents keep
 * the highlight smooth instead of exposing the individual line segments.
 */
export function createLensShape(hw: number, hh: number, radius: number, smoothing = 0): LensShape {
  const r = Math.max(0, Math.min(radius, hw, hh));
  const smooth = Math.max(0, Math.min(1, smoothing));
  const key = `${hw},${hh},${r},${smooth}`;
  const cached = shapes.get(key);
  if (cached) return cached;
  const path = smoothRoundRectPath(0, 0, hw * 2, hh * 2, smooth, r, { precision: 5 });
  let shape: LensShape;

  if (smooth === 0 || r === 0 || (r === hw && r === hh)) {
    // Circles and unsmoothed rectangles retain the exact analytic fast path.
    shape = { path,
      projectedExtent: (x, y) => (hw - r) * Math.abs(x) + (hh - r) * Math.abs(y) + r * Math.hypot(x, y),
      sample: (ax, ay) => ({
      distance: sdRoundedBox(ax, ay, hw, hh, r),
      ...roundedBoxNormalAbs(ax, ay, hw, hh, r),
    }) };
  } else {
    const corner = computeCorners(0, 0, hw * 2, hh * 2, smooth, r)[1];
    const vertices: Vertex[] = [];
    const add = (p: Point, tangent: Point) => {
      const length = Math.hypot(tangent.x, tangent.y) || 1;
      vertices.push({ x: p.x - hw, y: hh - p.y, nx: tangent.y / length, ny: tangent.x / length });
    };
    const cubic = (a: Point, b: Point, c: Point, d: Point) => {
      const point = (t: number): Point => {
        const u = 1 - t;
        return { x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
          y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y };
      };
      const tangent = (t: number): Point => {
        const u = 1 - t;
        return { x: u * u * (b.x - a.x) + 2 * u * t * (c.x - b.x) + t * t * (d.x - c.x),
          y: u * u * (b.y - a.y) + 2 * u * t * (c.y - b.y) + t * t * (d.y - c.y) };
      };
      const subdivide = (t0: number, t1: number, depth: number) => {
        const start = point(t0), end = point(t1);
        const dx = end.x - start.x, dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const flat = [0.25, 0.5, 0.75].every(f => {
          const p = point(t0 + (t1 - t0) * f);
          return Math.abs((p.x - start.x) * dy - (p.y - start.y) * dx) / length <= TOLERANCE;
        });
        if (flat || depth >= 12) { add(end, tangent(t1)); return; }
        const mid = (t0 + t1) / 2;
        subdivide(t0, mid, depth + 1);
        subdivide(mid, t1, depth + 1);
      };
      subdivide(0, 1, 0);
    };

    add({ x: hw, y: 0 }, { x: 1, y: 0 });
    add(corner.start, { x: 1, y: 0 });
    cubic(corner.start, corner.c1a, corner.c1b, corner.arcStart);
    const center = { x: hw * 2 - r, y: r };
    const startAngle = Math.atan2(corner.arcStart.y - center.y, corner.arcStart.x - center.x);
    const endAngle = Math.atan2(corner.arcEnd.y - center.y, corner.arcEnd.x - center.x);
    const steps = Math.max(1, Math.ceil((endAngle - startAngle) / Math.sqrt(8 * TOLERANCE / r)));
    for (let i = 1; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * i / steps;
      add({ x: center.x + r * Math.cos(angle), y: center.y + r * Math.sin(angle) },
        { x: -Math.sin(angle), y: Math.cos(angle) });
    }
    cubic(corner.arcEnd, corner.c2a, corner.c2b, corner.end);
    add({ x: hw * 2, y: hh }, { x: 0, y: 1 });
    const segments = vertices.slice(1).map((b, i) => ({ a: vertices[i], b }))
      .filter(({ a, b }) => Math.hypot(b.x - a.x, b.y - a.y) > 1e-9);
    const tree = branch(segments);

    shape = { path,
      projectedExtent: (x, y) => {
        const ax = Math.abs(x), ay = Math.abs(y);
        return Math.max(...vertices.map(p => p.x * ax + p.y * ay));
      },
      sample: (ax, ay) => {
      let best = Infinity, closestX = 0, closestY = 0, nx = 0, ny = 1;
      const visit = (node: Branch) => {
        if (boxDistance(node, ax, ay) > best) return;
        if (node.segments) {
          for (const { a, b } of node.segments) {
            const dx = b.x - a.x, dy = b.y - a.y;
            const t = Math.max(0, Math.min(1, ((ax - a.x) * dx + (ay - a.y) * dy) / (dx * dx + dy * dy)));
            const x = a.x + t * dx, y = a.y + t * dy;
            const distance = (ax - x) ** 2 + (ay - y) ** 2;
            if (distance >= best) continue;
            best = distance; closestX = x; closestY = y;
            nx = a.nx + t * (b.nx - a.nx); ny = a.ny + t * (b.ny - a.ny);
          }
        } else {
          const left = node.left!, right = node.right!;
          if (boxDistance(left, ax, ay) < boxDistance(right, ax, ay)) { visit(left); visit(right); }
          else { visit(right); visit(left); }
        }
      };
      visit(tree);
      const length = Math.hypot(nx, ny) || 1;
      const sign = (ax - closestX) * nx + (ay - closestY) * ny >= 0 ? 1 : -1;
      return { distance: Math.sqrt(best) * sign, nx: nx / length, ny: ny / length };
    } };
  }
  shapes.set(key, shape);
  if (shapes.size > 64) shapes.delete(shapes.keys().next().value!);
  return shape;
}
