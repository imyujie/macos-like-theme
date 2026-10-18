import {
  bevelSlope,
  clampBevelDepth,
  clamp01,
  softKnee,
} from "./math";
import { createLensShape } from './shape';

/**
 * Liquid-glass lens displacement map.
 *
 * Shape uses the same squircle-kit contour as the painted surface. Refraction follows ybouane/liquidglass:
 * circular-bevel ("ripple") height field → slope × SDF normal × Snell factor.
 * Steepest at the rim, flat past zRadius — no upright→inverted edge sandwich.
 *
 * R/G encode X/Y bend, B carries specular (glow + edge), A is the lens mask.
 * Only the top-left quadrant is computed; the other three are mirrored.
 *
 * @see https://github.com/ybouane/liquidglass/blob/main/src/shaders.ts
 */

export type LensMapParams = {
  /** Output bitmap width in pixels (even). */
  width: number;
  /** Output bitmap height in pixels (even). */
  height: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
  /** Continuous corner smoothing, shared with the surface clip. Defaults to 0. */
  cornerSmoothing?: number;
  /** Bevel depth in px (ybouane `zRadius`). */
  depth: number;
  /**
   * Small-angle Snell factor `1 - 1/ior`.
   * Mapped from material `curvature` via {@link refrPowFromCurvature}.
   */
  refrPow: number;
  /**
   * Edge-direction splay, 0–1.
   * 0 follows the local silhouette normal; 1 follows the ray from the panel
   * center, so each straight edge fans toward its two adjacent corners.
   */
  splay: number;
  /** Fresnel rim strength (omnidirectional edge brightening). */
  glow: number;
  /** Fresnel falloff range as a fraction of min(halfWidth, halfHeight). */
  glowSpread: number;
  /** Fresnel falloff exponent. */
  glowExponent: number;
  /** Directional glare strength (the two arcs on the light axis). */
  edgeHighlight: number;
  /** Inner glare width in px, measured inward from the silhouette. */
  edgeWidth: number;
  /** Outer shadow width in px, measured outward from the silhouette. */
  edgeShadowWidth: number;
  /** Soft inward shadow reach, in CSS px. */
  edgeShadowInnerSpread: number;
  /** Soft inward shadow gain, relative to edgeShadow. */
  edgeShadowInnerStrength: number;
  /** Edge-shadow opacity on the lit side, 0–1. */
  edgeShadowLitOpacity: number;
  /** Glare convergence exponent — higher = tighter arcs. */
  edgeExponent: number;
  /** Outer rim and inward shadow strength, 0–1; shadow-facing arcs are darker. */
  edgeShadow: number;
  /** Inward bloom range behind the glare arcs, in px (inner-shadow style). */
  edgeGlowSpread: number;
  /** Inward bloom strength, added under the glare arcs. */
  edgeGlowStrength: number;
  /** Light direction in degrees: 0 = top, 90 = left, 180 = bottom. */
  specularAngle: number;
  /**
   * Fraction of each glare arc's half-length spent fading from full brightness
   * down to nothing at its ends, 0–1. 0 keeps the flat plateau the normal-based
   * terms produce on a straight edge; 1 makes the whole arc one smooth bell.
   */
  glareEndFade: number;
  /** Specular highlight falloff exponent; 1 preserves the base curve. */
  specularDecay: number;
  /** Brightness of the arc opposite the light, 0–1 (liquid-glass-studio). */
  glareOppositeFactor: number;
};

export type LensMapResult = {
  url: string;
  /** Max |channel − 0.5| in the map (for debug arrows). */
  maxDisplacement: number;
};

/** Encode a 0–1 highlight intensity into the B channel (128 = none). */
function encodeSpec(v: number) {
  return (127 * (v > 1 ? 1 : v) + 128 + 0.5) | 0;
}

/**
 * Below this the highlight is on the faint falloff that sets its footprint.
 *
 * Measured on the *pre-decay* highlight intensity (see {@link specularPeakShape}),
 * so the value means the same thing at every `specularDecay`. 0.15 keeps the
 * gain off the halo — the outermost pixels that read as "where the highlight
 * ends" sit near 0.02–0.08 and stay byte-identical — while covering the arc's
 * body rather than a hairline. A round 0.5 would leave only ~2% of a settled
 * bake's pixels eligible.
 */
const SPECULAR_PEAK_KNEE = 0.15;

/**
 * Core weighting for the extended-range highlight mask.
 *
 * The extended-range layer sources its light from a wide-gamut image, so its
 * mask only has to say *where* the extra light lands. Supporting the whole
 * falloff would blow out a wide band; scaling the shape — dividing the falloff
 * below the knee by `peak` while leaving the top of the arc alone — keeps the
 * added light on the arc's core. `peak` is a fixed engine-side constant here
 * (there is no user-facing control for it), and a caller that multiplies by
 * `peak` reproduces the plain highlight exactly below the knee.
 *
 * The knee is evaluated on `mask^(1/decay)` — the pre-decay highlight
 * intensity — rather than on the stored mask. `specularDecay` compresses the
 * mask by `v^decay`, so a knee in stored-mask space gets squeezed onto the very
 * top of the curve as the decay grows: at decay 10 the eligible pixels sit at
 * `v > 0.83`, i.e. exactly the hairline the background-brightening channel has
 * already pushed to pure white, and the control silently does nothing. In
 * pre-decay space the same knee always covers the arc's body. Nothing is lost
 * by the move: a large decay has already flattened the halo to zero, so the
 * compensation below the knee has no visible tail left to cancel.
 *
 * `peak === 1` returns the mask untouched.
 */
export function specularPeakShape(mask: number, peak: number, decay = 1): number {
  const m = clamp01(mask);
  const gain = Number.isFinite(peak) ? Math.max(0, peak) : 1;
  if (gain === 1) return m;
  if (gain === 0) return 0;
  const d = Number.isFinite(decay) ? Math.max(0.1, decay) : 1;
  const v = d === 1 ? m : Math.pow(m, 1 / d);
  let t = 0;
  if (v > SPECULAR_PEAK_KNEE) {
    const u = (v - SPECULAR_PEAK_KNEE) / (1 - SPECULAR_PEAK_KNEE);
    t = u * u * (3 - 2 * u);
  }
  const floor = 1 / gain;
  return clamp01(m * (floor + (1 - floor) * t));
}

export type LensMapPixels = {
  data: Uint8ClampedArray<ArrayBuffer>;
  /**
   * White alpha mask: 1 selects the Y→X top/bottom branch, 0 selects the
   * X→Y left/right branch. Only allocated for production axis-map encoding.
   */
  edgeOrderData: Uint8ClampedArray<ArrayBuffer> | null;
  /** Max |R/G channel − 0.5| in the map (for debug arrows). */
  maxDisplacement: number;
};

/** Independent light masks: only the narrow rim receives specular gain/decay. */
export type SpecularPart = 'all' | 'rim' | 'soft';

export type AxisLensMapPixels = {
  /** R carries X displacement, G is neutral, B retains specular. */
  xData: Uint8ClampedArray<ArrayBuffer>;
  /** G carries Y displacement; R/B are neutral. */
  yData: Uint8ClampedArray<ArrayBuffer>;
};

export type AxisLensMapsResult = {
  xUrl: string;
  yUrl: string;
  edgeOrderUrl: string;
  /** Max |R/G channel − 0.5| in the source map. */
  maxDisplacement: number;
};

/**
 * Interpolates from the rounded-box silhouette normal to a center-radial
 * direction. The latter restores the tangential component that makes each
 * straight edge fan toward its adjacent corners: e.g. the upper half of the
 * left edge bends upward-left and its lower half bends downward-left.
 *
 * Keep the radial components independently normalized by the panel half
 * extents rather than normalizing the vector. This matches the original Aave
 * map: both channels can reach full strength near a corner while the midpoint
 * of a straight edge stays aligned with its silhouette normal.
 */
function splayedDirection(
  nx: number,
  ny: number,
  radialX: number,
  radialY: number,
  splay: number,
): { nx: number; ny: number } {
  const mix = clamp01(splay);
  return {
    nx: nx + (radialX - nx) * mix,
    ny: ny + (radialY - ny) * mix,
  };
}

/**
 * Splits one combined lens bitmap into independent, fully opaque axis maps.
 *
 * Keeping inactive channels neutral in the encoded PNGs avoids depending on
 * the SVG filter graph to rewrite channels before `feDisplacementMap` reads
 * them. The X map retains B for inspection; rendered highlights use a separate
 * white/alpha texture so displacement channels cannot enter their composite.
 */
export function splitAxisLensMapPixels(
  data: Uint8ClampedArray<ArrayBuffer>,
): AxisLensMapPixels {
  const xData = new Uint8ClampedArray(data.length);
  const yData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    xData[i] = data[i];
    xData[i + 1] = 128;
    xData[i + 2] = data[i + 2];
    xData[i + 3] = 255;

    yData[i] = 128;
    yData[i + 1] = data[i + 1];
    yData[i + 2] = 128;
    yData[i + 3] = 255;
  }

  return { xData, yData };
}

/**
 * Computes the displacement map as raw RGBA pixels.
 */
export function computeLensMap(
  p: LensMapParams,
  includeEdgeOrder = false,
  part: SpecularPart = 'all',
): LensMapPixels {
  const width = p.width;
  const height = p.height;
  const halfWidth = width >> 1;
  const halfHeight = height >> 1;
  const data = new Uint8ClampedArray(width * height * 4);
  const edgeOrderData = includeEdgeOrder
    ? new Uint8ClampedArray(width * height * 4)
    : null;

  const hw = p.halfWidth;
  const hh = p.halfHeight;

  const contour = createLensShape(hw, hh, p.radius, p.cornerSmoothing);
  // Defence in depth: callers should already clamp via buildLensMapParams.
  const zR = clampBevelDepth(p.depth, hw, hh);
  const refrPow = Math.max(0, p.refrPow);
  // R/G should use the full 8-bit displacement range. `refrPow` is the
  // theoretical peak of the optical field (slope/slopeRef and each direction
  // component are both <= 1), so divide it out here and multiply it back into
  // the SVG scale. This preserves the physical displacement while reducing
  // each encoded displacement step by `refrPow`.
  const displacementEncodeNorm = refrPow > 0 ? 1 / refrPow : 1;
  // Normalize so peak rim slope maps near full channel range; feDisplacementMap
  // `scale` then supplies pixel strength (ybouane multiplies by ~refract·30).
  const slopeRef = zR > 0 ? Math.max(bevelSlope(1, zR), 1e-3) : 1;

  const rimEnabled = part !== 'soft' && p.edgeHighlight > 0;
  const softEnabled = part !== 'rim';
  const bloomEnabled = softEnabled && p.edgeGlowStrength > 0 && p.edgeGlowSpread > 0;
  const hasSpecular = rimEnabled || (softEnabled && p.glow > 0) || bloomEnabled;
  const theta = (p.specularAngle * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  // Screen-space light axis L = (-sin θ, -cos θ), tangent T = (cos θ, -sin θ).
  // Squared N·L gives the two opposing glare arcs. Use the SAME signed dot
  // product for far-side dimming; swapping sin/cos there rotates the near/far
  // boundary away from the glare and introduces quadrant seams.
  const opp = clamp01(p.glareOppositeFactor);
  const glareInv = p.edgeWidth > 0 ? 1 / p.edgeWidth : 0;
  // Longitudinal end fade (see `glareEndFade`). The normal-angle terms decide
  // *which* edge is lit, but on a straight edge the normal is constant, so they
  // cannot shape the arc along its length — that needs the rim's position
  // projected onto the axis perpendicular to the light.
  const fadeSpan = clamp01(p.glareEndFade);
  const fadeStart = 1 - fadeSpan;
  const fadeInv = fadeSpan > 0.001 ? 1 / fadeSpan : 0;
  // Use the contour's actual projected extent. A bounding-box maximum
  // underestimates diagonal spans and makes the fade change as a circle turns.
  const arcHalfLen = contour.projectedExtent(cosT, -sinT);
  const arcHalfLenInv = arcHalfLen > 0.001 ? 1 / arcHalfLen : 0;
  const endFade = (projection: number) => {
    const t = clamp01((Math.abs(projection) * arcHalfLenInv - fadeStart) * fadeInv);
    return 1 - t * t * (3 - 2 * t);
  };
  const glowInnerInv = p.edgeGlowSpread > 0 ? 1 / p.edgeGlowSpread : 0;
  const fresRangePx = p.glowSpread * Math.min(hw, hh);
  const fresInv = fresRangePx > 0.001 ? 1 / fresRangePx : 0;
  const specularDecay = Number.isFinite(p.specularDecay)
    ? Math.max(0.1, p.specularDecay)
    : 1;
  // Applied to the strength-free *shape* of each highlight term rather than
  // to the finished intensity: the B channel clamps at 128 + 127, so a
  // post-strength gamma would be erased wherever the rim saturates (any
  // preset with `specular` ≳ 1) and only ever nibble at the outer fringe.
  // decay === 1 reproduces the unshaped terms exactly.
  const shape = (value: number) =>
    specularDecay === 1 ? value : Math.pow(clamp01(value), specularDecay);

  const stepX = (2 * hw) / width;
  const stepY = (2 * hh) / height;
  // Soft coverage across ~2 map texels so the rim does not staircase.
  const aa = Math.max(stepX, stepY);

  // Max |R/G − 127.5| in 0–255 units, tracked while writing (debug arrows).
  let maxChan = 0;

  for (let row = 0; row < halfHeight; row++) {
    const mirrorRow = height - 1 - row;
    const ay = -((row + 0.5) * stepY - hh);

    for (let col = 0; col < halfWidth; col++) {
      const mirrorCol = width - 1 - col;
      const ax = -((col + 0.5) * stepX - hw);

      // First-quadrant sample of the exact painted contour (ax,ay ≥ 0).
      const { distance: sdf, nx, ny } = contour.sample(ax, ay);

      const iTL = (row * width + col) * 4;
      const iTR = (row * width + mirrorCol) * 4;
      const iBL = (mirrorRow * width + col) * 4;
      const iBR = (mirrorRow * width + mirrorCol) * 4;

      // Coverage shapes the encoded displacement/specular values, but the
      // displacement texture itself stays fully opaque. That avoids relying
      // on an SVG-filter implementation to preserve neutral RGB underneath a
      // zero/partial alpha value; R/G=128 outside the lens remains neutral
      // even if the GPU pipeline otherwise samples premultiplied filter data.
      let coverage = 1;
      if (sdf >= aa) {
        data[iTL] = data[iTL + 1] = data[iTL + 2] = 128;
        data[iTR] = data[iTR + 1] = data[iTR + 2] = 128;
        data[iBL] = data[iBL + 1] = data[iBL + 2] = 128;
        data[iBR] = data[iBR + 1] = data[iBR + 2] = 128;
        data[iTL + 3] = data[iTR + 3] = data[iBL + 3] = data[iBR + 3] = 255;
        if (edgeOrderData) {
          for (const index of [iTL, iTR, iBL, iBR]) {
            edgeOrderData[index] = 255;
            edgeOrderData[index + 1] = 255;
            edgeOrderData[index + 2] = 255;
            edgeOrderData[index + 3] = 0;
          }
        }
        if (maxChan < 0.5) maxChan = 0.5;
        continue;
      }
      if (sdf > -aa) {
        const t = (sdf + aa) / (2 * aa);
        // Smoothstep: 1 at sdf=-aa → 0 at sdf=+aa
        coverage = 1 - t * t * (3 - 2 * t);
      }

      if (edgeOrderData) {
        // Squaring the unit-normal component gives a smooth orientation blend:
        // horizontal rims (|ny|=1) select Y→X, vertical rims (ny=0) select
        // X→Y, and rounded corners interpolate without a diagonal seam.
        const topBottomAlpha = Math.round(255 * ny * ny * coverage);
        for (const index of [iTL, iTR, iBL, iBR]) {
          edgeOrderData[index] = 255;
          edgeOrderData[index + 1] = 255;
          edgeOrderData[index + 2] = 255;
          edgeOrderData[index + 3] = topBottomAlpha;
        }
      }
      const direction = splayedDirection(
        nx,
        ny,
        hw > 0 ? ax / hw : 0,
        hh > 0 ? ay / hh : 0,
        p.splay,
      );

      // Ybouane: slope of circular bevel; 0 outside and on the flat plateau.
      const inside = sdf < 0 ? -sdf : 0;
      const slope = sdf < 0 ? bevelSlope(inside, zR) : 0;
      const opticalMag = softKnee((slope * refrPow) / slopeRef, 1) * coverage;
      const displacementMag = opticalMag * displacementEncodeNorm;

      const hx = 0.5 * direction.nx * displacementMag;
      const hy = 0.5 * direction.ny * displacementMag;
      const rPlus = ((0.5 + hx) * 255 + 0.5) | 0;
      const rMinus = ((0.5 - hx) * 255 + 0.5) | 0;
      const gPlus = ((0.5 + hy) * 255 + 0.5) | 0;
      const gMinus = ((0.5 - hy) * 255 + 0.5) | 0;

      let d = rPlus > 127.5 ? rPlus - 127.5 : 127.5 - rPlus;
      if (d > maxChan) maxChan = d;
      d = rMinus > 127.5 ? rMinus - 127.5 : 127.5 - rMinus;
      if (d > maxChan) maxChan = d;
      d = gPlus > 127.5 ? gPlus - 127.5 : 127.5 - gPlus;
      if (d > maxChan) maxChan = d;
      d = gMinus > 127.5 ? gMinus - 127.5 : 127.5 - gMinus;
      if (d > maxChan) maxChan = d;

      let bTL = 128;
      let bTR = 128;
      let bBL = 128;
      let bBR = 128;
      if (hasSpecular) {
        // Stronger where the bevel actually bends (slope-weighted).
        // Keep specular/Fresnel on the original optical magnitude. Only the
        // displacement channels are range-normalized.
        const m = opticalMag > 0 ? Math.min(1, opticalMag) : 0;

        if (
          m > 0.001 ||
          inside < fresRangePx ||
          inside < Math.max(p.edgeWidth, p.edgeGlowSpread)
        ) {
          // Fresnel rim — omnidirectional, hue-agnostic brightening that hugs
          // the silhouette (studio's refFresnel).
          let fres = 0;
          if (softEnabled && p.glow > 0) {
            const tF = clamp01(1 + sdf * fresInv);
            fres = p.glow * Math.pow(tF, p.glowExponent) * Math.max(m, tF);
          }

          if (rimEnabled || bloomEnabled) {
            const dLx = nx * sinT;
            const dLy = ny * cosT;
            const dotTL = dLx + dLy;
            const dotTR = dLy - dLx;
            const gSum = clamp01(dotTL * dotTL);
            const gDiff = clamp01(dotTR * dotTR);

            // Inner rim: glare falls off toward the body over edgeWidth px.
            // Shadow has its own band on the other side of the silhouette.
            const tGeo = clamp01(1 + sdf * glareInv);
            const geo = rimEnabled ? shape(tGeo * Math.max(m, tGeo)) * p.edgeHighlight : 0;

            // Inward bloom behind the arcs, inner-shadow style: same angular
            // distribution, but a soft quadratic falloff reaching
            // edgeGlowSpread px into the body (not slope-weighted — the glow
            // bleeds across the flat interior).
            const tIn = clamp01(1 + sdf * glowInnerInv);
            // Deliberately independent of specularDecay and edgeHighlight.
            // Running the broad quadratic through decay=3 made it sixth-power
            // and quantized almost the entire 10px tail to zero.
            const bloom = bloomEnabled ? p.edgeGlowStrength * tIn * tIn : 0;

            // The along-the-rim distribution is NOT run through `shape`.
            // `gSum`/`gDiff` already fall off smoothly from alignment with the
            // light to zero at a perpendicular normal. Compressing that curve
            // with the specular decay turned
            // each arc into a narrow pulse whose ends dropped from full
            // brightness to nothing within a couple of texels — a hard-ended
            // segment. Specular decay shapes only the narrow rim (`geo`);
            // the soft terms keep their own falloff. Angular focus is
            // `edgeExponent`'s job.
            const arcSum = Math.pow(gSum, p.edgeExponent);
            const arcDiff = Math.pow(gDiff, p.edgeExponent);

            // Far-side dimming: quadrants whose normal faces away from the
            // light get glareOppositeFactor (studio's glareFarside).
            const sumNear = dotTL >= 0;
            const diffNear = dotTR >= 0;

            // Fade the highlight through the same AA band as alpha so the
            // brightest rim texel never sits on the hard silhouette. Without
            // this a sub-texel bright line lands on the anti-aliased edge and
            // twinkles under sub-pixel motion. coverage is 1 for every interior
            // pixel, so only the outermost ~2 texels are tapered.
            // Dissolve both ends of the arc (see `glareEndFade`). Applied to the
            // glare alone: the Fresnel rim stays uniform, so the ends fade into
            // the plain rim rather than into the outer shadow ring.
            // Mirroring changes the tangent projection's sign combination:
            // TL/BR use |ax cos θ − ay sin θ|; TR/BL use |ax cos θ + ay sin θ|.
            const fadeSum = endFade(ax * cosT - ay * sinT);
            const fadeDiff = endFade(ax * cosT + ay * sinT);
            const litTL = arcSum * (sumNear ? 1 : opp) * fadeSum;
            const litBR = arcSum * (sumNear ? opp : 1) * fadeSum;
            const litTR = arcDiff * (diffNear ? 1 : opp) * fadeDiff;
            const litBL = arcDiff * (diffNear ? opp : 1) * fadeDiff;
            bTL = encodeSpec((litTL * (geo + bloom) + fres) * coverage);
            bBR = encodeSpec((litBR * (geo + bloom) + fres) * coverage);
            bTR = encodeSpec((litTR * (geo + bloom) + fres) * coverage);
            bBL = encodeSpec((litBL * (geo + bloom) + fres) * coverage);
          } else if (fres > 0) {
            bTL = bTR = bBL = bBR = encodeSpec(fres * coverage);
          }
        }
      }

      data[iTL] = rPlus;
      data[iTL + 1] = gPlus;
      data[iTL + 2] = bTL;
      data[iTL + 3] = 255;
      data[iTR] = rMinus;
      data[iTR + 1] = gPlus;
      data[iTR + 2] = bTR;
      data[iTR + 3] = 255;
      data[iBL] = rPlus;
      data[iBL + 1] = gMinus;
      data[iBL + 2] = bBL;
      data[iBL + 3] = 255;
      data[iBR] = rMinus;
      data[iBR + 1] = gMinus;
      data[iBR + 2] = bBR;
      data[iBR + 3] = 255;
    }
  }

  return { data, edgeOrderData, maxDisplacement: maxChan / 255 };
}

// PNG encoding (`toDataURL`) is the expensive synchronous step, and many
// surfaces share identical params (icon pills, remounts on navigation) —
// memoize results. Params are all numbers, so a joined key is exact.
const MAP_CACHE_MAX = 192;
const mapCache = new Map<string, LensMapResult>();
const axisMapCache = new Map<string, AxisLensMapsResult>();
/** Shared encode target — maps are drawn and encoded synchronously. */
let scratchCanvas: HTMLCanvasElement | null = null;

function lensMapCacheKey(p: LensMapParams): string {
  return `${p.width},${p.height},${p.halfWidth},${p.halfHeight},${p.radius},${p.cornerSmoothing ?? 0},${p.depth},${p.refrPow},${p.splay},${p.glow},${p.glowSpread},${p.glowExponent},${p.edgeHighlight},${p.edgeWidth},${p.edgeShadowWidth},${p.edgeShadowInnerSpread},${p.edgeShadowInnerStrength},${p.edgeShadowLitOpacity},${p.edgeExponent},${p.edgeShadow},${p.edgeGlowSpread},${p.edgeGlowStrength},${p.specularAngle},${p.glareEndFade},${p.specularDecay},${p.glareOppositeFactor}`;
}

const specularOverlayCache = new Map<string, LensMapResult>();

/**
 * Paint the white-with-alpha specular term (Fresnel rim + glare arcs) into
 * `dest` using the same per-pixel math as the displacement map's B channel.
 *
 * MorphMenu on iOS presents this via a double-buffered `<canvas>` (not
 * `background-image` data-URLs) so per-frame size tracking does not strobe.
 */
export function writeSpecularOverlay(
  dest: HTMLCanvasElement,
  p: LensMapParams,
  k2: number,
  /**
   * Optional core weighting for the resulting alpha ramp, for consumers that
   * want the light concentrated on the arc's core (the extended-range layer)
   * rather than the plain highlight (the WebKit carrier). 1 = no weighting.
   */
  coreWeight = 1,
  part: SpecularPart = 'all',
): { maxDisplacement: number } {
  if (dest.width !== p.width || dest.height !== p.height) {
    dest.width = p.width;
    dest.height = p.height;
  }
  const ctx = dest.getContext("2d");
  if (!ctx) return { maxDisplacement: 0 };

  const { data, maxDisplacement } = computeLensMap(p, false, part);
  for (let i = 0; i < data.length; i += 4) {
    const spec = data[i + 2] - 128; // B channel: 128 = no highlight
    // Optional peak shaping is reserved for the extended-range layer.
    // coreWeight === 1 keeps the original k2 * spec byte for byte, matching
    // the mask consumed by both normal SVG highlight composites.
    const shaped =
      spec > 0
        ? specularPeakShape(spec / 127, coreWeight, p.specularDecay)
        : 0;
    const a = shaped > 0 ? Math.min(255, (k2 * 127 * shaped + 0.5) | 0) : 0;
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = a;
  }
  ctx.putImageData(new ImageData(data, p.width, p.height), 0, 0);
  return { maxDisplacement };
}

/**
 * White-with-alpha PNG of just the specular term (Fresnel rim + glare arcs)
 * from the exact same per-pixel math as the displacement map's B channel.
 *
 * With k2 = 1 this is the independent mask for the SVG tint/backdrop passes.
 * WebKit also uses a gain-baked version because its SVG pipeline rasterizes
 * at CSS-px resolution: drawn as a plain `background-image` under
 * `mix-blend-mode: plus-lighter`, the browser's regular image pipeline
 * renders it at full device-pixel density, so the corner arcs stay sharp on
 * 2x/3x screens where the `feImage`-based filter output visibly pixelates.
 *
 * Brightness matches the original B-channel extraction: mask alpha is
 * `(B − 128)/255`, and `feComposite arithmetic` adds `k2 × mask` in premultiplied space;
 * `plus-lighter` also adds premultiplied values, so a white pixel with
 * `alpha = k2 × (B − 128)/255` contributes the identical light.
 */
export function generateSpecularOverlay(
  p: LensMapParams,
  k2: number,
  coreWeight = 1,
  part: SpecularPart = 'all',
): LensMapResult {
  const key = `${lensMapCacheKey(p)}|k2:${k2}|core:${coreWeight}|part:${part}`;
  const cached = specularOverlayCache.get(key);
  if (cached) {
    specularOverlayCache.delete(key);
    specularOverlayCache.set(key, cached);
    return cached;
  }

  const target = scratchCanvas ??= document.createElement("canvas");
  if (!target.getContext("2d")) return { url: "", maxDisplacement: 0 };
  const { maxDisplacement } = writeSpecularOverlay(target, p, k2, coreWeight, part);
  const url = target.toDataURL("image/png");

  const result: LensMapResult = { url, maxDisplacement };
  specularOverlayCache.set(key, result);
  if (specularOverlayCache.size > MAP_CACHE_MAX) {
    const oldest = specularOverlayCache.keys().next().value;
    if (oldest !== undefined) specularOverlayCache.delete(oldest);
  }
  return result;
}

/**
 * Crisp outer band plus soft inward shading on the two flanks tangent to the
 * light. Both use the same contour. The outer band needs padding by
 * edgeShadowWidth + half an AA texel so it can spill past the container's
 * bounds; `padX`/`padY` return that padding in CSS px. Only the TL quadrant of
 * the padded grid is computed, the other three are mirrored.
 */
export function computeShadowPixels(p: LensMapParams): {
  data: Uint8ClampedArray<ArrayBuffer>;
  fillData: Uint8ClampedArray<ArrayBuffer>;
  width: number;
  height: number;
  padX: number;
  padY: number;
} {
  const hw = p.halfWidth;
  const hh = p.halfHeight;
  const contour = createLensShape(hw, hh, p.radius, p.cornerSmoothing);

  const stepX = (2 * hw) / p.width;
  const stepY = (2 * hh) / p.height;
  // Keep the entire geometric band outside: sdf ∈ [0, edgeShadowWidth].
  // Integrate its coverage over each texel, so even a subpixel rim remains
  // smooth. Only the half-texel AA footprint can cross the silhouette.
  const aa = Math.max(stepX, stepY);
  const bandWidth = Math.max(0, p.edgeShadowWidth);
  const innerSpread = Math.max(0, p.edgeShadowInnerSpread);
  const innerStrength = clamp01(p.edgeShadowInnerStrength);
  // The material silhouette and this support mask each anti-alias their own
  // boundary. Overlap the support inward by one map texel so their fractional
  // coverage cannot leave a subpixel page-colored seam at the bottom edge.
  const fillOverlap = Math.max(0.5, aa);
  const reach = bandWidth + aa * 0.5;
  const padXTex = Math.ceil(reach / stepX) + 1;
  const padYTex = Math.ceil(reach / stepY) + 1;
  const padX = padXTex * stepX;
  const padY = padYTex * stepY;
  const width = p.width + padXTex * 2;
  const height = p.height + padYTex * 2;
  const halfWidth = width >> 1;
  const halfHeight = height >> 1;
  const data = new Uint8ClampedArray(width * height * 4);
  // Opaque fill support for the outer band. The shaded mask above can then
  // composite over fill instead of directly over the page background.
  const fillData = new Uint8ClampedArray(width * height * 4);

  const theta = (p.specularAngle * Math.PI) / 180;
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const opp = clamp01(p.glareOppositeFactor);
  const strength = clamp01(p.edgeShadow);
  // Use the same longitudinal end fade as the inner glare. N·L selects the
  // lit side; this projected tangent coordinate dissolves that side's bright
  // portion toward the arc ends without changing the dark opposite side.
  const fadeSpan = clamp01(p.glareEndFade);
  const fadeStart = 1 - fadeSpan;
  const fadeInv = fadeSpan > 0.001 ? 1 / fadeSpan : 0;
  const arcHalfLen = contour.projectedExtent(cosT, -sinT);
  const arcHalfLenInv = arcHalfLen > 0.001 ? 1 / arcHalfLen : 0;
  const endFade = (projection: number) => {
    const t = clamp01((Math.abs(projection) * arcHalfLenInv - fadeStart) * fadeInv);
    return 1 - t * t * (3 - 2 * t);
  };
  // Keep a faint outline around the whole shape within this same band.
  // edgeShadow controls its overall opacity; the light direction adds depth.
  const litSideOpacity = clamp01(p.edgeShadowLitOpacity);
  // Integral of a constant-width, constant-opacity band. Width must never
  // become a radial fade: only the two boundaries receive texel coverage AA.
  const bandIntegral = (distance: number) => Math.max(0, Math.min(bandWidth, distance));
  const fillBandIntegral = (distance: number) => Math.max(
    0,
    Math.min(bandWidth + fillOverlap, distance + fillOverlap),
  );
  // Integral of a quadratic inward tail. Area integration anti-aliases its
  // boundary just like the outer band; no second contour, blur or inset ring.
  const innerIntegral = (distance: number) => {
    if (innerSpread <= 0) return 0;
    const t = clamp01(1 + distance / innerSpread);
    return innerSpread * t * t * t / 3;
  };

  for (let row = 0; row < halfHeight; row++) {
    const mirrorRow = height - 1 - row;
    const ay = -((row + 0.5 - padYTex) * stepY - hh);

    for (let col = 0; col < halfWidth; col++) {
      const mirrorCol = width - 1 - col;
      const ax = -((col + 0.5 - padXTex) * stepX - hw);

      const { distance: sdf, nx, ny } = contour.sample(ax, ay);
      if (sdf <= -innerSpread - aa * 0.5 || sdf >= reach) continue;
      const outerCoverage = clamp01(
        (bandIntegral(sdf + aa * 0.5) - bandIntegral(sdf - aa * 0.5)) / aa,
      );
      const innerCoverage = innerStrength * clamp01(
        (innerIntegral(sdf + aa * 0.5) - innerIntegral(sdf - aa * 0.5)) / aa,
      );
      const fillCoverage = clamp01(
        (fillBandIntegral(sdf + aa * 0.5) - fillBandIntegral(sdf - aa * 0.5)) / aa,
      );
      if (outerCoverage <= 0 && innerCoverage <= 0 && fillCoverage <= 0) continue;

      // Match the inner glare's signed screen-space N·L exactly.
      const dotTL = nx * sinT + ny * cosT;
      const dotTR = ny * cosT - nx * sinT;
      const gSum = clamp01(dotTL * dotTL);
      const gDiff = clamp01(dotTR * dotTR);
      const sumNear = dotTL >= 0;
      const diffNear = dotTR >= 0;

      // Use the angular light distribution without the inner highlight gain:
      // turning edgeHighlight up or off must not erase or darken the full rim.
      const arcSum = Math.pow(gSum, p.edgeExponent * 1.25);
      const arcDiff = Math.pow(gDiff, p.edgeExponent * 1.25);
      const fadeSum = endFade(ax * cosT - ay * sinT);
      const fadeDiff = endFade(ax * cosT + ay * sinT);
      const litTL = clamp01(arcSum * (sumNear ? 1 : opp) * fadeSum);
      const litBR = clamp01(arcSum * (sumNear ? opp : 1) * fadeSum);
      const litTR = clamp01(arcDiff * (diffNear ? 1 : opp) * fadeDiff);
      const litBL = clamp01(arcDiff * (diffNear ? opp : 1) * fadeDiff);

      const shadowAlpha = (light: number, dot: number) => {
        // Soft shading belongs only to the two side flanks, not the entire
        // perimeter. N·L=±1 (front/back) gets no inward spread; N·L=0 gets all.
        // Rotate this distribution with the common light, independently of
        // the crisp outer band's width and radial opacity.
        const flank = Math.pow(clamp01(1 - dot * dot), 2);
        const coverage = 1 - (1 - outerCoverage) * (1 - innerCoverage * flank);
        return Math.round(clamp01((1 - (1 - litSideOpacity) * light) * coverage * strength) * 255);
      };
      const iTL = (row * width + col) * 4;
      const iTR = (row * width + mirrorCol) * 4;
      const iBL = (mirrorRow * width + col) * 4;
      const iBR = (mirrorRow * width + mirrorCol) * 4;

      // RGB stays 0; alpha carries geometry only. Runtime applies fill color.
      data[iTL + 3] = shadowAlpha(litTL, dotTL);
      data[iTR + 3] = shadowAlpha(litTR, dotTR);
      data[iBL + 3] = shadowAlpha(litBL, dotTR);
      data[iBR + 3] = shadowAlpha(litBR, dotTL);
      const fillAlpha = Math.round(fillCoverage * 255);
      fillData[iTL + 3] = fillAlpha;
      fillData[iTR + 3] = fillAlpha;
      fillData[iBL + 3] = fillAlpha;
      fillData[iBR + 3] = fillAlpha;
    }
  }

  return { data, fillData, width, height, padX, padY };
}

export type ShadowOverlayResult = {
  url: string;
  /** Opaque fill support for the outer band, before edge shading. */
  fillUrl: string;
  /** Horizontal / vertical overhang of the shadow ring, in CSS px. */
  padX: number;
  padY: number;
};

const shadowOverlayCache = new Map<string, ShadowOverlayResult>();

/**
 * Black-with-alpha PNG of the outer ring and soft inward tail. Unlike specular
 * overlay, this composites with plain source-over alpha blending, so one code
 * path covers Chromium, Safari/Firefox, and iOS alike.
 */
export function generateShadowOverlay(p: LensMapParams): ShadowOverlayResult {
  if (p.edgeShadow <= 0) return { url: "", fillUrl: "", padX: 0, padY: 0 };
  const key = lensMapCacheKey(p);
  const cached = shadowOverlayCache.get(key);
  if (cached !== undefined) {
    shadowOverlayCache.delete(key);
    shadowOverlayCache.set(key, cached);
    return cached;
  }

  const { data, fillData, width, height, padX, padY } = computeShadowPixels(p);
  const target = scratchCanvas ??= document.createElement("canvas");
  target.width = width;
  target.height = height;
  const ctx = target.getContext("2d");
  if (!ctx) return { url: "", fillUrl: "", padX: 0, padY: 0 };
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  const url = target.toDataURL("image/png");
  ctx.putImageData(new ImageData(fillData, width, height), 0, 0);
  const fillUrl = target.toDataURL("image/png");

  const result: ShadowOverlayResult = { url, fillUrl, padX, padY };
  rememberMap(shadowOverlayCache, key, result);
  return result;
}

function rememberMap<T>(
  cache: Map<string, T>,
  key: string,
  result: T,
) {
  cache.set(key, result);
  if (cache.size > MAP_CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

/**
 * Encodes separate X-only and Y-only displacement textures plus the
 * top/bottom-vs-sides branch mask from one lens-map calculation. The mask is
 * not a displacement input; it only composites the two isolated-axis orders.
 */
export function generateAxisLensMaps(
  p: LensMapParams,
  canvas?: HTMLCanvasElement,
): AxisLensMapsResult {
  const key = lensMapCacheKey(p);
  const cached = axisMapCache.get(key);
  if (cached) {
    axisMapCache.delete(key);
    axisMapCache.set(key, cached);
    return cached;
  }

  const target = canvas ?? (scratchCanvas ??= document.createElement("canvas"));
  target.width = p.width;
  target.height = p.height;
  const ctx = target.getContext("2d");
  if (!ctx) {
    return { xUrl: "", yUrl: "", edgeOrderUrl: "", maxDisplacement: 0 };
  }

  const { data, edgeOrderData, maxDisplacement } = computeLensMap(p, true);
  const { xData, yData } = splitAxisLensMapPixels(data);

  ctx.putImageData(new ImageData(xData, p.width, p.height), 0, 0);
  const xUrl = target.toDataURL("image/png");
  ctx.putImageData(new ImageData(yData, p.width, p.height), 0, 0);
  const yUrl = target.toDataURL("image/png");
  if (!edgeOrderData) {
    return { xUrl: "", yUrl: "", edgeOrderUrl: "", maxDisplacement: 0 };
  }
  ctx.putImageData(new ImageData(edgeOrderData, p.width, p.height), 0, 0);
  const edgeOrderUrl = target.toDataURL("image/png");

  const result: AxisLensMapsResult = {
    xUrl,
    yUrl,
    edgeOrderUrl,
    maxDisplacement,
  };
  rememberMap(axisMapCache, key, result);
  return result;
}

/**
 * Renders the combined opaque RGBA lens map used by dev inspection and legacy
 * callers: R/G carry X/Y displacement and B carries the specular signal.
 * Production Chromium refraction uses {@link generateAxisLensMaps} instead.
 */
export function generateLensMap(
  p: LensMapParams,
  canvas?: HTMLCanvasElement,
): LensMapResult {
  const key = lensMapCacheKey(p);
  const cached = mapCache.get(key);
  if (cached) {
    // Refresh LRU position.
    mapCache.delete(key);
    mapCache.set(key, cached);
    return cached;
  }

  const target = canvas ?? (scratchCanvas ??= document.createElement("canvas"));
  target.width = p.width;
  target.height = p.height;
  const ctx = target.getContext("2d");
  if (!ctx) {
    return { url: "", maxDisplacement: 0 };
  }

  const { data, maxDisplacement } = computeLensMap(p);
  ctx.putImageData(new ImageData(data, p.width, p.height), 0, 0);
  const url = target.toDataURL("image/png");

  const result: LensMapResult = {
    url,
    maxDisplacement,
  };
  rememberMap(mapCache, key, result);
  return result;
}
