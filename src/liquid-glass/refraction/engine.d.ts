import type { LensMapParams } from "./lens-map";
export type GlassEngineParams = {
    /** Minimum displacement-map long-edge resolution in pixels. */
    mapQuality: number;
    /**
     * Upper bound on the displacement map's own pixel count.
     *
     * Chromium re-samples every `feImage` source each time a backdrop filter is
     * re-evaluated, so one evaluation costs roughly in proportion to the map's
     * area rather than to the filter region. Measured on the hero stack (five
     * chained backdrops driven at refresh rate): a 360×408 map held ~30fps, a
     * 282×320 map ~45fps, and a 226×256 map a full 60fps, while a frozen
     * side-by-side put fewer than 0.1% of pixels more than 8/255 apart.
     *
     * Capping area rather than the long edge is what keeps that cheap: a wide,
     * short surface (a navigation bar) has a small area already and stays at
     * full resolution, so it never gets its short edge crushed. Only large
     * square-ish panels are downsampled, and those are exactly the ones whose
     * bevel occupies a small fraction of the bitmap.
     */
    mapMaxPixels: number;
    glowSpread: number;
    glowExponent: number;
    edgeWidth: number;
    rimBrightness: number;
    edgeShadowLitOpacity: number;
    edgeExponent: number;
    /** Inward bloom range behind the glare arcs, in px (inner-shadow style). */
    edgeGlowSpread: number;
    /** Inward bloom strength under the glare arcs. */
    edgeGlowStrength: number;
    chromaRedBoost: number;
    chromaGreenBoost: number;
    backdropBlurPadMultiplier: number;
    backdropBlurPadExtra: number;
    backdropSaturateSvg: number;
    backdropSaturateCssBlur: number;
    /**
     * Multiplier applied to material `blur` on the CSS `backdrop-filter: blur()`
     * fallback (Safari / Firefox). SVG displacement carries the look on Chromium;
     * without a boost, blur≈1 reads as a flat tint veil.
     */
    cssBlurFallbackMultiplier: number;
    specularMaskAlphaOffset: number;
    /** Brightness of the glare arc opposite the light, 0–1 (studio glare). */
    glareOppositeFactor: number;
    /**
     * Share of each glare arc spent fading out at its two ends, 0–1. Reverse the
     * `specularDecay` crush on a straight edge: the arc there is a flat plateau
     * that stops at the corners, and this dissolves its ends over a longer run.
     */
    glareEndFade: number;
    /**
     * How much of the highlight brightens the refracted background
     * (hue-preserving, screen-like) instead of adding flat white, 0–1.
     */
    specularColorPreserve: number;
};
/**
 * Encoded displacement mid is PNG byte 128 (`128/255`), but `feDisplacementMap`
 * treats the mid as exactly `0.5`. The residual `128/255 − 0.5 = 1/510` is a
 * uniform sub-pixel shift when all channels share one scale; with chromatic
 * scale differentials it becomes flat-field color fringing. Cancel it on the
 * *active* axis with `feFunc* type="linear" slope="1" intercept={this}`.
 * Unused axes are still forced with `slope="0" intercept="0.5"`.
 */
export declare const DISPLACEMENT_PNG_MID_BIAS: number;
/**
 * Shared liquid-glass engine constants (Aave technique).
 * Material tuning lives in `materials.json`.
 * Consumers may provide per-instance overrides through the primitive's
 * `engine` prop; the checked-in JSON remains the source-owned default.
 */
export declare const glassEngine: {
    mapQuality: number;
    mapMaxPixels: number;
    glowSpread: number;
    glowExponent: number;
    edgeWidth: number;
    edgeExponent: number;
    edgeGlowSpread: number;
    edgeGlowStrength: number;
    chromaRedBoost: number;
    chromaGreenBoost: number;
    backdropBlurPadMultiplier: number;
    backdropBlurPadExtra: number;
    backdropSaturateSvg: number;
    backdropSaturateCssBlur: number;
    cssBlurFallbackMultiplier: number;
    specularMaskAlphaOffset: number;
    glareOppositeFactor: number;
    glareEndFade: number;
    specularColorPreserve: number;
};
/** Shared pointer-light tuning for the LiquidGlass surface and SVG graph. */
export declare const glassPointerHighlight: {
    readonly radius: 84;
    readonly saturation: 1.16;
    readonly brightness: 1.08;
    readonly bloomOpacity: 0.16;
    readonly hoverStrength: 0.34;
    readonly pressedStrength: 0.58;
    readonly coreStop: 0.14;
    readonly shoulderStop: 0.42;
    readonly shoulderOpacity: 0.58;
    readonly outerStop: 0.64;
    readonly outerOpacity: 0.2;
    readonly endStop: 0.86;
};
export type GlassPointerHighlightParams = {
    [K in keyof typeof glassPointerHighlight]: number;
};
export declare function glassPointerHighlightSnapshot(): GlassPointerHighlightParams;
export declare function resolveGlassPointerHighlight(overrides?: Partial<GlassPointerHighlightParams> | false): GlassPointerHighlightParams | null;
export declare const glassPointerHighlightMaskUrl: string;
/** Build the SVG pointer mask per instance so every pointer control is live. */
export declare function glassPointerHighlightMaskUrlFor(params: GlassPointerHighlightParams): string;
export declare function glassEngineSnapshot(): GlassEngineParams;
export declare function resolveGlassEngine(overrides?: Partial<GlassEngineParams>): GlassEngineParams;
export type GlassLensMaterial = {
    depth: number;
    curvature: number;
    splay: number;
    glow: number;
    edgeHighlight: number;
    edgeShadow: number;
    specularAngle: number;
    specularDecay: number;
};
export declare function clampUnit(value: number): number;
export declare function clampChroma(chroma: number): number;
/** Force an even positive size (lens map mirrors each axis around its midpoint). */
export declare function evenMapSize(value: number): number;
/**
 * Resolve an aspect-correct displacement bitmap for an element.
 * `mapQuality` is the long-edge floor; larger elements and DPR can increase
 * it up to `maxQuality`. The short edge follows the same uniform scale, so
 * the SVG filter never has to non-uniformly stretch a square map.
 *
 * `dpr` bakes extra samples for high-density screens: `width`/`height` are
 * CSS px, but a map sized to CSS px alone gets stretched across `dpr`×as
 * many physical pixels on a Retina/mobile screen, softening exactly the rim
 * detail (corner bevel, specular arcs) this map exists to carry — most
 * visible the bigger the surface gets. Left at the default of 1 (no boost)
 * for any caller that bakes on every animation frame (e.g. a resizing
 * GlassSurface mid-spring); pass a real `dpr` only for one-shot/settled
 * bakes, where a few-KB-bigger canvas+PNG cost is a one-time expense rather
 * than a per-frame one.
 *
 * `maxPixels` is the area budget described on {@link GlassEngineParams.mapMaxPixels}.
 * It applies after the long-edge clamp and preserves aspect ratio, so it only
 * shrinks maps whose total area exceeds the budget.
 */
export declare function mapDimensionsForElement(width: number, height: number, baseQuality: number, maxQuality?: number, dpr?: number, maxPixels?: number): {
    width: number;
    height: number;
};
/**
 * Caps the boost from {@link mapDimensionsForElement}'s `dpr` param at 3x: real
 * device pixel ratios don't exceed that on any current phone, and capping
 * lower than the device's actual ratio (this used to cap at 2, which still
 * under-bakes a 3x-DPR iPhone) defeats the point of matching device pixels
 * in the first place — the corner/rim detail this map carries needs to be
 * sampled at least as densely as the screen it's stretched across, or the
 * curved edge visibly facets.
 */
export declare function mapBakeDpr(): number;
export declare function chromaticChannelScales(baseScale: number, chroma: number, engine?: GlassEngineParams): {
    red: number;
    green: number;
    blue: number;
};
/**
 * feDisplacementMap pixel scale from material `scale`, relative to the lens's
 * short edge. Using the diagonal here makes a capsule's vertical refraction
 * grow with its width, so equal-height pills appear to have different glass
 * thicknesses. The short edge keeps the local bevel response invariant across
 * aspect ratios while preserving the existing square/circle scale exactly.
 * `refrPow` is divided out while encoding R/G so the bitmap uses its full
 * 8-bit range; multiply it back here to keep the final pixel displacement
 * unchanged. Keeping it required prevents callers from updating only one side
 * of that invariant.
 * Fold safety comes from the normalized bevel-slope map, not from capping here.
 */
export declare function refractionBackdropScale(strength: number, width: number, height: number, refrPow: number): number;
/**
 * Each color channel has two isolated-axis branches: Y→X for the horizontal
 * edges and X→Y for the vertical edges. This keeps the edge's tangential axis
 * last without ever putting X and Y into the same displacement primitive.
 */
export declare const AXIS_PASSES_PER_CHANNEL = 4;
export declare function backdropFilterPadding(blurPx: number, engine?: GlassEngineParams): number;
/**
 * CSS `backdrop-filter: blur()` fallback strength. Material `blur` is tuned for
 * the SVG displacement path (~1px frost before displace); Safari/Firefox need
 * a much stronger blur to read as glass instead of a flat tint veil.
 */
export declare function cssBackdropBlurPx(blur: number, engine?: GlassEngineParams): number;
export declare function buildLensMapParams(args: {
    halfWidth: number;
    halfHeight: number;
    radius: number;
    material: GlassLensMaterial;
}, engine?: GlassEngineParams,
/** See {@link mapDimensionsForElement}'s `dpr` param — defaults to no boost. */
dpr?: number,
/** See {@link mapDimensionsForElement}'s `maxQuality` param. */
maxQuality?: number,
/**
 * See {@link mapDimensionsForElement}'s `maxPixels` param. Defaults to the
 * engine's area budget; pass `Infinity` for one-shot bakes that want the
 * full resolution regardless of what a per-frame surface could afford.
 */
maxPixels?: number): LensMapParams;
/**
 * Splits the specular energy between two passes:
 * k1 — applied INSIDE the backdrop filter (`k1·mask·refractedBg + bg`), so
 * the highlight brightens the refracted background and keeps its hue
 * (liquid-glass-studio boosts LCH lightness the same way). ×2 compensates
 * the term reading at half strength on a mid-gray backdrop.
 * k2 — flat additive white in the content filter (whose input is only the
 * tint layer, so it cannot see the background). CSS-blur fallbacks have no
 * SVG backdrop pass and should use the full `specular` as k2 instead.
 */
export declare function specularCompositeCoefficients(specular: number, engine?: GlassEngineParams): {
    k1: number;
    k2: number;
};
export declare function specularMaskColorMatrixValues(engine?: GlassEngineParams): string;
export declare function glassSurfaceCssVars(tint: number, fill?: string, engine?: GlassEngineParams, pointerHighlight?: GlassPointerHighlightParams | null, mode?: "dark" | "light"): {
    "--glass-tint": string;
    "--glass-fill": string;
    "--glass-backdrop-saturate-svg": string;
    "--glass-backdrop-saturate-blur": string;
};
