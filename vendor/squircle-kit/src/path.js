// smooth-corners · geometry
// ---------------------------------------------------------------------------
// Faithful port of Electron's `shell/renderer/electron_smooth_round_rect.cc`
// (the code behind the `-electron-corner-smoothing` CSS property).
//
// Each corner = cubic bezier (edge -> arc) + circular arc + cubic bezier
// (arc -> edge). Edge length consumed by one corner = (1 + smoothness) * r.
// When two corners compete for the same edge, smoothness backs off on that
// edge only (keeping s1/s2 = r1/r2), so capsules degrade gracefully.
//
// The emitted path ALWAYS has the same command structure
//   M C A C  L C A C  L C A C  L C A C  Z
// even for zero radii, so CSS can interpolate `clip-path: path(...)` between
// any two states (transitions / keyframes just work).
// ---------------------------------------------------------------------------

const PI = Math.PI;

/** @typedef {{tl:number,tr:number,br:number,bl:number}} Radii */

const pt = (x, y) => ({ x, y });
const add = (a, b) => pt(a.x + b.x, a.y + b.y);

// n * 90° rotation, screen coordinates (y down) – same handedness as Skia.
function quarterRotate(p, q) {
  switch (((q % 4) + 4) % 4) {
    case 0: return pt(p.x, p.y);
    case 1: return pt(-p.y, p.x);
    case 2: return pt(-p.x, -p.y);
    default: return pt(p.y, -p.x);
  }
}

export const lengthForCornerSmoothness = (s, r) => (1 + s) * r;
export const smoothnessForCornerLength = (len, r) => len / r - 1;

/** Geometry of one half-corner, relative to the corner point. */
function curveGeometry(radius, smoothness) {
  const edgeConnecting = lengthForCornerSmoothness(smoothness, radius);
  const arcAngle = (PI / 4) * smoothness;
  const arcConnecting = pt(
    (1 - Math.sin(arcAngle)) * radius,
    (1 - Math.cos(arcAngle)) * radius
  );
  const arcCurve = (1 - Math.tan(arcAngle / 2)) * radius;
  const EDGE_CURVE_POINT_RATIO = 2 / 3;
  const edgeCurve = edgeConnecting - (edgeConnecting - arcCurve) * EDGE_CURVE_POINT_RATIO;
  return { edgeConnecting, arcConnecting, arcCurve, edgeCurve };
}

/**
 * Absolute control points of one corner.
 * rot: 0 = top-left, 1 = top-right, 2 = bottom-right, 3 = bottom-left
 * s1: smoothness on the edge arriving at the corner, s2: on the leaving edge.
 */
export function cornerPoints(radius, s1, s2, corner, rot) {
  const c1 = curveGeometry(radius, s1);
  const c2 = curveGeometry(radius, s2);
  const R = (v, q) => add(corner, quarterRotate(v, q));
  return {
    start: R(pt(c1.edgeConnecting, 0), rot + 1),
    // first cubic (edge -> arc)
    c1a: R(pt(c1.edgeCurve, 0), rot + 1),
    c1b: R(pt(c1.arcCurve, 0), rot + 1),
    arcStart: R(pt(c1.arcConnecting.y, c1.arcConnecting.x), rot),
    // circular arc
    arcEnd: R(c2.arcConnecting, rot),
    // second cubic (arc -> edge)
    c2a: R(pt(c2.arcCurve, 0), rot),
    c2b: R(pt(c2.edgeCurve, 0), rot),
    end: R(pt(c2.edgeConnecting, 0), rot),
    radius,
    s1,
    s2,
  };
}

/** Mirrors Electron's ConstrainSmoothness(): back off per edge. */
export function constrainSmoothness(size, smoothness, r1, r2) {
  if (r1 === 0 && r2 === 0) return [0, 0];
  const need = lengthForCornerSmoothness(smoothness, r1) + lengthForCornerSmoothness(smoothness, r2);
  if (need <= size) return [smoothness, smoothness];
  const ratio = r1 / (r1 + r2);
  const l1 = size * ratio;
  const l2 = size - l1;
  return [
    r1 === 0 ? 0 : Math.min(smoothness, Math.max(smoothnessForCornerLength(l1, r1), 0)),
    r2 === 0 ? 0 : Math.min(smoothness, Math.max(smoothnessForCornerLength(l2, r2), 0)),
  ];
}

/** Mirrors Blink's FloatRoundedRect::ConstrainRadii(): one uniform factor. */
export function constrainRadii(width, height, radii) {
  const { tl, tr, br, bl } = radii;
  let f = 1;
  for (const [a, b, max] of [[tl, tr, width], [bl, br, width], [tl, bl, height], [tr, br, height]]) {
    if (a + b > 0) f = Math.min(f, max / (a + b));
  }
  const k = (v) => Math.max(0, (v || 0) * f);
  return { tl: k(tl), tr: k(tr), br: k(br), bl: k(bl) };
}

/** Normalises number | [tl,tr,br,bl] | {tl,tr,br,bl} into Radii. */
export function normalizeRadii(radius) {
  if (radius == null) return { tl: 0, tr: 0, br: 0, bl: 0 };
  if (typeof radius === 'number') return { tl: radius, tr: radius, br: radius, bl: radius };
  if (Array.isArray(radius)) {
    // CSS shorthand semantics: 1, 2, 3 or 4 values
    const [a, b = a, c = a, d = b] = radius;
    return { tl: +a || 0, tr: +b || 0, br: +c || 0, bl: +d || 0 };
  }
  return { tl: +radius.tl || 0, tr: +radius.tr || 0, br: +radius.br || 0, bl: +radius.bl || 0 };
}

/**
 * Resolves all per-corner geometry for a box. Useful for debugging /
 * visualisation; `smoothRoundRectPath` is built on top of it.
 */
export function computeCorners(x, y, width, height, smoothness, radius) {
  const s = Math.min(Math.max(+smoothness || 0, 0), 1);
  const { tl, tr, br, bl } = constrainRadii(width, height, normalizeRadii(radius));
  const [topL, topR] = constrainSmoothness(width, s, tl, tr);
  const [rightT, rightB] = constrainSmoothness(height, s, tr, br);
  const [botL, botR] = constrainSmoothness(width, s, bl, br);
  const [leftT, leftB] = constrainSmoothness(height, s, tl, bl);
  return [
    cornerPoints(tl, leftT, topL, pt(x, y), 0),
    cornerPoints(tr, topR, rightT, pt(x + width, y), 1),
    cornerPoints(br, rightB, botR, pt(x + width, y + height), 2),
    cornerPoints(bl, botL, leftB, pt(x, y + height), 3),
  ];
}

const n = (v, p) => {
  const k = 10 ** p;
  const r = Math.round(v * k) / k;
  return Object.is(r, -0) ? 0 : r;
};

/**
 * SVG path data for a smooth rounded rectangle.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @param {number} smoothness 0..1  (CSS 0%..100%)
 * @param {number|number[]|Radii} radius
 * @param {{precision?:number}} [opts]
 */
export function smoothRoundRectPath(x, y, width, height, smoothness, radius, opts = {}) {
  if (!(width > 0) || !(height > 0)) return '';
  const p = opts.precision ?? 3;
  const P = (q) => `${n(q.x, p)},${n(q.y, p)}`;
  const out = [];
  computeCorners(x, y, width, height, smoothness, radius).forEach((c, i) => {
    const r = n(c.radius, p);
    out.push(
      `${i === 0 ? 'M' : 'L'}${P(c.start)}`,
      `C${P(c.c1a)} ${P(c.c1b)} ${P(c.arcStart)}`,
      `A${r},${r} 0 0 1 ${P(c.arcEnd)}`,
      `C${P(c.c2a)} ${P(c.c2b)} ${P(c.end)}`
    );
  });
  out.push('Z');
  return out.join('');
}

/** Standalone SVG markup (handy for icons / static export). */
export function smoothRoundRectSVG(width, height, smoothness, radius, { fill = 'currentColor', stroke, strokeWidth = 1 } = {}) {
  const d = smoothRoundRectPath(0, 0, width, height, smoothness, radius);
  const s = stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="${fill}"${s}/></svg>`;
}
