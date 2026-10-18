/** Fast error-function approximation (legacy rim falloff / tests). */
export declare function erf(x: number): number;
export declare function clamp01(value: number): number;
/**
 * Soft knee: identity below `limit`, then asymptotically approaches without a hard clip.
 */
export declare function softKnee(value: number, limit?: number): number;
/**
 * Quilez rounded-box SDF (https://iquilezles.org/articles/distfunctions2d/).
 * `p` is centered; `half` is half-extents; `radius` is corner radius.
 * Negative inside, positive outside.
 */
export declare function sdRoundedBox(px: number, py: number, halfW: number, halfH: number, radius: number): number;
/**
 * Outward unit normal of a rounded box in the first quadrant (ax, ay ≥ 0).
 * Analytic ∇ of `sdRoundedBox`.
 */
export declare function roundedBoxNormalAbs(ax: number, ay: number, halfW: number, halfH: number, radius: number): {
    nx: number;
    ny: number;
};
/**
 * Ybouane liquidglass circular-bevel height field (pill / "ripple" cross-section).
 * `d` = distance inside from the silhouette (−sdf); `zR` = bevel depth (zRadius).
 *
 * @see https://github.com/ybouane/liquidglass/blob/main/src/shaders.ts
 */
export declare function bevelHeight(d: number, zR: number): number;
/**
 * Analytic slope dh/dd of {@link bevelHeight}.
 * Floors `d` to ~1px so the rim asymptote stays finite (matches ybouane's e≈2 FD bound).
 * Zero on the flat plateau (`d ≥ zR`) and outside.
 */
export declare function bevelSlope(d: number, zR: number): number;
/**
 * Cap bevel depth (zRadius) to the element inradius so opposite edges keep a
 * flat plateau. Without this, depth ≫ min(halfW, halfH) makes the circular
 * bevel fill the whole pill and paints a hard medial seam.
 */
export declare function clampBevelDepth(depth: number, halfWidth: number, halfHeight: number): number;
/**
 * Small-angle Snell factor `1 - 1/ior` from material curvature → IOR.
 * curvature 0→1 maps to ior ≈ 1.15→2.5 (same range as former refFactor).
 */
export declare function refrPowFromCurvature(curvature: number): number;
/** @deprecated Use {@link refrPowFromCurvature}; kept for call-site compatibility. */
export declare function refFactorFromCurvature(curvature: number): number;
export type DomeConstants = {
    Rx: number;
    Ry: number;
    scaleX: number;
    scaleY: number;
};
/** Sphere radii + normalization for a dome of `depth` px over the lens. */
export declare function computeDomeConstants(depth: number, halfWidth: number, halfHeight: number): DomeConstants;
/** Surface gradient of the dome at offset `x` from the lens center. */
export declare function domeGradient(x: number, R: number, scale: number): number;
