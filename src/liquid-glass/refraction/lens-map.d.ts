/**
 * Liquid-glass lens displacement map.
 *
 * Shape uses Quilez rounded-box SDF. Refraction follows ybouane/liquidglass:
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
    /** Glare geometric range in px from the silhouette. */
    edgeWidth: number;
    /** Glare convergence exponent — higher = tighter arcs. */
    edgeExponent: number;
    /** Dark shadow-arc strength, 0–1, filling the gaps between glare arcs. */
    edgeShadow: number;
    /** Inward bloom range behind the glare arcs, in px (inner-shadow style). */
    edgeGlowSpread: number;
    /** Inward bloom strength, added under the glare arcs. */
    edgeGlowStrength: number;
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
export declare function specularPeakShape(mask: number, peak: number, decay?: number): number;
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
 * Splits one combined lens bitmap into independent, fully opaque axis maps.
 *
 * Keeping inactive channels neutral in the encoded PNGs avoids depending on
 * the SVG filter graph to rewrite channels before `feDisplacementMap` reads
 * them. The X map also owns the source B channel because the specular filter
 * derives its highlight mask from that texture.
 */
export declare function splitAxisLensMapPixels(data: Uint8ClampedArray<ArrayBuffer>): AxisLensMapPixels;
/**
 * Computes the displacement map as raw RGBA pixels.
 */
export declare function computeLensMap(p: LensMapParams, includeEdgeOrder?: boolean): LensMapPixels;
/**
 * Paint the white-with-alpha specular term (Fresnel rim + glare arcs) into
 * `dest` using the same per-pixel math as the displacement map's B channel.
 *
 * MorphMenu on iOS presents this via a double-buffered `<canvas>` (not
 * `background-image` data-URLs) so per-frame size tracking does not strobe.
 */
export declare function writeSpecularOverlay(dest: HTMLCanvasElement, p: LensMapParams, k2: number,
/**
 * Optional core weighting for the resulting alpha ramp, for consumers that
 * want the light concentrated on the arc's core (the extended-range layer)
 * rather than the plain highlight (the WebKit carrier). 1 = no weighting.
 */
coreWeight?: number): {
    maxDisplacement: number;
};
/**
 * White-with-alpha PNG of just the specular term (Fresnel rim + glare arcs)
 * from the exact same per-pixel math as the displacement map's B channel.
 *
 * Exists for browsers whose SVG-filter pipeline rasterizes at CSS-px
 * resolution (WebKit): drawn as a plain `background-image` under
 * `mix-blend-mode: plus-lighter`, the browser's regular image pipeline
 * renders it at full device-pixel density, so the corner arcs stay sharp on
 * 2x/3x screens where the `feImage`-based filter output visibly pixelates.
 *
 * Brightness matches the filter path exactly: the filter's color matrix
 * derives mask alpha as `(B − 128)/255` (see `specularMaskColorMatrixValues`)
 * and `feComposite arithmetic` adds `k2 × mask` in premultiplied space;
 * `plus-lighter` also adds premultiplied values, so a white pixel with
 * `alpha = k2 × (B − 128)/255` contributes the identical light.
 */
export declare function generateSpecularOverlay(p: LensMapParams, k2: number, coreWeight?: number): LensMapResult;
export type ShadowOverlayResult = {
    url: string;
    /** Opaque fill support for the outer band, before edge shading. */
    fillUrl: string;
    /** Horizontal / vertical overhang of the shadow ring, in CSS px. */
    padX: number;
    padY: number;
};
/**
 * Black-with-alpha PNG of just the shadow arcs. Unlike the additive specular
 * overlay, this composites with plain source-over alpha blending, so one code
 * path covers Chromium, Safari/Firefox, and iOS alike.
 */
export declare function generateShadowOverlay(p: LensMapParams): ShadowOverlayResult;
/**
 * Encodes separate X-only and Y-only displacement textures plus the
 * top/bottom-vs-sides branch mask from one lens-map calculation. The mask is
 * not a displacement input; it only composites the two isolated-axis orders.
 */
export declare function generateAxisLensMaps(p: LensMapParams, canvas?: HTMLCanvasElement): AxisLensMapsResult;
/**
 * Renders the combined opaque RGBA lens map used by dev inspection and legacy
 * callers: R/G carry X/Y displacement and B carries the specular signal.
 * Production Chromium refraction uses {@link generateAxisLensMaps} instead.
 */
export declare function generateLensMap(p: LensMapParams, canvas?: HTMLCanvasElement): LensMapResult;
