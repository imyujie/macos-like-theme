"use client";

/**
 * Extended-range light source for the optional HDR highlight layer.
 *
 * PQ / BT.2020 tagged (so Blink hands it to the compositor with headroom
 * instead of clamping it to SDR white the way it does for out-of-range CSS
 * colors) and uniform on purpose: the highlight's own falloff rides in as a CSS
 * mask, so the asset only has to be "HDR white". Encoded at 1600 nits, which is
 * the peak of the XDR panels this targets; displays with less headroom tone-map
 * it down rather than clipping.
 *
 * Regenerate with ffmpeg (SVT-AV1 10-bit) plus a patch to the `colr` box — the
 * encoder leaves primaries/transfer as "unspecified" if you only pass the
 * `-color_primaries` / `-color_trc` flags.
 */
import hdrWhiteUrl from "./assets/hdr-white-pq.avif";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  glassBrowserSupport,
  supportsBackdropSvgFilter,
} from "./browser-support";
import {
  generateAxisLensMaps,
  generateLensMap,
  generateShadowOverlay,
  generateSpecularOverlay,
} from "./refraction/lens-map";
import { createLensShape } from './refraction/shape';
import { glassLightingCss, glassLightingMaskMatrix, glassLightingPalette } from './refraction/lighting';
import {
  AXIS_PASSES_PER_CHANNEL,
  backdropContrastTransfer,
  backdropContrastTableValues,
  BACKDROP_TO_LUMA_CHROMA,
  BACKDROP_FROM_LUMA_CHROMA,
  backdropFilterPadding,
  buildLensMapParams,
  chromaticChannelScales,
  cssBackdropBlurPx,
  DISPLACEMENT_PNG_MID_BIAS,
  glassPointerHighlight,
  glassPointerHighlightMaskUrlFor,
  glassSurfaceCssVars,
  refractionBackdropScale,
  resolveGlassEngine,
  resolveGlassPointerHighlight,
  specularCompositeCoefficients,
  type GlassEngineParams,
  type GlassPointerHighlightParams,
} from "./refraction/engine";
import {
  resolveGlassMaterial,
  type GlassMaterialInput,
  type GlassMaterialMode,
} from "./materials/materials";
import { observeNearViewport } from "./viewport-visibility";
import "./liquid-glass.css";

export type {
  GlassMaterialInput,
  GlassMaterialKey,
  GlassMaterialMode,
  GlassMaterialName,
  GlassMaterialParams,
  GlassPhysicalMaterialName,
  GlassSemanticMaterialName,
} from "./materials/materials";
export { resolveGlassMaterial } from "./materials/materials";

type AnimatedGlassProgress = {
  get: () => number;
  on: (event: "change", callback: (value: number) => void) => () => void;
};

export type PointerHighlightPreview = {
  /** Horizontal preview position normalized to the surface, 0–1. */
  x: number;
  /** Vertical preview position normalized to the surface, 0–1. */
  y: number;
  /** Optional fixed highlight strength; defaults to the configured hover strength. */
  strength?: number;
};

export type LiquidGlassProps = {
  children?: ReactNode;
  /** Chips / selection chrome between refracted material and sharp content. */
  stateLayer?: ReactNode;
  /** Interactive glass above sharp content, used when a control covers its label while pressed. */
  overlayLayer?: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  /** Continuous corner smoothing, 0–1. Uses squircle-kit's macOS value by default. */
  cornerSmoothing?: number;
  /** Physical preset, semantic recipe, or preset plus local parameter overrides. */
  material?: GlassMaterialInput;
  /** Explicit material appearance; never reads or mutates the app's global theme. */
  materialMode?: GlassMaterialMode;
  /**
   * Optional live 0–1 multiplier for the SVG backdrop displacement. The map
   * dimensions stay fixed while its actual refraction strength animates.
   */
  refractionProgress?: AnimatedGlassProgress;
  /**
   * Sample the live page behind the glass.
   * Chromium: displacement map via `backdrop-filter: url(#svg)`.
   * Safari/Firefox: frosted `backdrop-filter: blur(...)`.
   */
  backdrop?: boolean;
  /**
   * Force the CSS `backdrop-filter` fallback instead of sampling through the
   * SVG displacement graph. The fixed fallback blur is 4px.
   */
  forceCssFallback?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Fires whenever the displacement map is regenerated (for dev tooling). */
  onDisplacementMapChange?: (
    mapUrl: string,
    info: {
      width: number;
      height: number;
      /** SVG feDisplacementMap scale in CSS px before chromatic channel boosts. */
      displacementScale: number;
      /** Largest decoded displacement represented by the current map. */
      maxDisplacement: number;
    },
  ) => void;
  /** Dev-only: override shared engine constants for live preview. */
  engine?: Partial<GlassEngineParams>;
  /**
   * Per-instance pointer bloom. Pass `false` to disable; partial values merge
   * with the shared defaults. Other surfaces on the page are unaffected.
   */
  pointerHighlight?: Partial<GlassPointerHighlightParams> | false;
  /** Force the pointer-highlight pipeline on at a driven position for demos and stories. When set, live pointer events are ignored so the highlight can track a lagged virtual cursor. */
  pointerHighlightPreview?: PointerHighlightPreview;
  /**
   * Independent extended-range highlight layer. Masks an HDR image tinted by
   * the fill-derived highlight color. Disabled uses the normal SDR pass alone.
   */
  hdrHighlight?: boolean;
  /**
   * How much of the baked extended-range light to apply, 0–1. The headroom
   * lives in the asset (PQ 1600 nits, well above SDR white); this scales its
   * coverage, so the result runs from "no extra light" to the display's own
   * peak. Without HDR headroom it stays within SDR brightness, while retaining
   * the fill-derived color and core-weighted shape.
   */
  hdrHighlightStrength?: number;
};

type LensState = {
  epoch: number;
  shapePath: string;
  shapeUrl: string;
  /** Gain-baked specular alpha mask for the iOS color carrier. */
  mapUrl: string;
  /** Gain-baked specular alpha mask for the forced CSS-content fallback. */
  cssFallbackSpecularMaskUrl: string;
  /** Independent white/alpha glare mask; never extracted from displacement RGB. */
  specularMaskUrl: string;
  /** Broad directional bloom + all-around glow, with independent unit gain. */
  softLightMaskUrl: string;
  xMapUrl: string;
  yMapUrl: string;
  edgeOrderMapUrl: string;
  /**
   * Black-with-alpha outer ring and soft inward tail, independent of light.
   */
  shadowUrl: string;
  /** Opaque fill support for the outer shadow band. */
  shadowFillUrl: string;
  /** Shadow ring overhang beyond the container's own bounds, CSS px. */
  shadowPadX: number;
  shadowPadY: number;
  maxDisplacement: number;
  /** Pixel scales for the Chromium backdrop-filter (userSpaceOnUse). */
  backdropRedScale: number;
  backdropGreenScale: number;
  backdropBlueScale: number;
  /** Backdrop frost blur in CSS px (userSpaceOnUse). */
  backdropBlurPx: number;
  /** Optional white-with-alpha specular texture used by the extended highlight layer. */
  hdrUrl?: string;
  specular: number;
  width: number;
  height: number;
};

type PointerHighlightState = {
  x: number | null;
  y: number | null;
  targetX: number;
  targetY: number;
  frame: number | null;
  active: boolean;
};

const { isIOS: IS_IOS } = glassBrowserSupport;

/**
 * Whether this display/host actually exposes high dynamic range.
 *
 * The media query is the only reliable signal, and it is the *display* that
 * decides — not the CSS. Extended-range colors, HDR images and HDR video all
 * clamp back to SDR white when this is false, which is the usual reason a
 * working HDR layer looks like it does nothing. Watched live so plugging in an
 * HDR display (or switching the one you have into HDR mode) updates the
 * component without a reload.
 */
export function useHdrDisplayRange(): boolean {
  const [high, setHigh] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(dynamic-range: high)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHigh(query.matches);
    const onChange = (event: MediaQueryListEvent) => setHigh(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return high;
}

/**
 * Composite coefficient that maps a fully lit texel (highlight mask 1) to a
 * fully opaque texel (alpha 255), so a baked highlight can be used directly as
 * a 1:1 CSS mask whose alpha carries the falloff without clipping it.
 */
const HDR_MASK_COEFFICIENT = 255 / 127;

/**
 * Core weighting for the extended-range layer's mask: it compresses the faint
 * falloff and leaves the core, so the added light lands on the hottest part of
 * the arc instead of blowing out a wide band. Internal on purpose — a
 * user-facing knob for it read as "more highlight", which the material's own
 * `edgeHighlight` / `specular` already cover.
 */
const HDR_HIGHLIGHT_CORE_WEIGHT = 3;

export const LiquidGlass = ({
  children,
  stateLayer,
  overlayLayer,
  width = 200,
  height = 80,
  borderRadius = 20,
  cornerSmoothing = 0.6,
  material = "regular",
  materialMode = "dark",
  refractionProgress,
  backdrop = true,
  forceCssFallback = false,
  className = "",
  style = {},
  onDisplacementMapChange,
  engine,
  pointerHighlight,
  pointerHighlightPreview,
  hdrHighlight = false,
  hdrHighlightStrength = 0.7,
}: LiquidGlassProps) => {
  const hdrStrength = Number.isFinite(hdrHighlightStrength)
    ? Math.min(1, Math.max(0, hdrHighlightStrength))
    : 0.7;
  const hdrRange = useHdrDisplayRange();
  const resolvedMaterial = useMemo(
    () => resolveGlassMaterial(material, materialMode),
    [material, materialMode],
  );
  const {
    scale,
    depth,
    curvature,
    splay,
    chroma,
    blur,
    glow,
    edgeHighlight,
    edgeShadow,
    highlightCompress,
    specularAngle,
    specular,
    specularDecay,
    tint,
    fill,
  } = resolvedMaterial;
  const resolvedEngine = useMemo(() => resolveGlassEngine(engine), [engine]);
  const lighting = useMemo(() => glassLightingPalette(fill, materialMode), [fill, materialMode]);
  const highlightColor = glassLightingCss(lighting.highlight);
  const glowColor = glassLightingCss(lighting.glow);
  const shadowColor = glassLightingCss(lighting.shadow);
  const shadowSupportColor = glassLightingCss(lighting.shadowSupport);
  const resolvedPointerHighlight = useMemo(
    () => resolveGlassPointerHighlight(pointerHighlight),
    [pointerHighlight],
  );
  const pointerMaskUrl = useMemo(
    () => resolvedPointerHighlight
      ? glassPointerHighlightMaskUrlFor(resolvedPointerHighlight)
      : "",
    [resolvedPointerHighlight],
  );
  const baseId = useId().replace(/:/g, "-");
  const [lens, setLens] = useState<LensState | null>(null);
  const [backdropSvg, setBackdropSvg] = useState(false);
  // Optimistic true avoids a first-paint frost flash for above-the-fold glass;
  // layout effect + IntersectionObserver immediately corrects off-screen ones.
  const [inView, setInView] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const epochRef = useRef(0);
  const lastSizeRef = useRef({ w: 0, h: 0 });
  const inViewRef = useRef(true);
  const needsRebuildRef = useRef(false);
  const rebuildRef = useRef<() => void>(() => {});
  const pointerHighlightRef = useRef<PointerHighlightState>({
    x: null,
    y: null,
    targetX: 0,
    targetY: 0,
    frame: null,
    active: false,
  });
  const pointerMaskRef = useRef<SVGFEImageElement>(null);
  const backdropDisplacementRefs = useRef<Array<SVGFEDisplacementMapElement | null>>([]);
  const backdropSpecularRef = useRef<SVGFECompositeElement>(null);
  const backdropSoftLightRef = useRef<SVGFECompositeElement>(null);
  const onMapChangeRef = useRef(onDisplacementMapChange);

  useEffect(() => {
    onMapChangeRef.current = onDisplacementMapChange;
  }, [onDisplacementMapChange]);

  const filterId = `glass-filter-${baseId}-${lens?.epoch ?? 0}`;
  const backdropFilterId = `glass-backdrop-${baseId}-${lens?.epoch ?? 0}`;
  // Live backdrop sampling is the expensive Chromium path. Keep maps cached
  // off-screen, but detach `backdrop-filter` so animating page content cannot
  // force every hidden SVG graph to re-evaluate each frame.
  const liveBackdrop = backdrop && inView;
  const useBackdropSvg = liveBackdrop && backdropSvg && !forceCssFallback;
  const backdropContrast = backdropContrastTransfer(resolvedEngine, fill, tint, materialMode);
  const backdropContrastTable = useMemo(
    () => backdropContrastTableValues(backdropContrast.contrast, backdropContrast.brightness),
    [backdropContrast.contrast, backdropContrast.brightness],
  );
  const specularK = specularCompositeCoefficients(
    lens?.specular ?? 0,
    resolvedEngine,
  );
  const backdropSpecularK1 = specularK.k1;
  const softLightK = specularCompositeCoefficients(1, resolvedEngine);
  const backdropSoftLightK1 = softLightK.k1;
  const contentSoftLightK2 = useBackdropSvg ? softLightK.k2 : 1;
  const contentSpecularK2 = useBackdropSvg
    ? specularK.k2
    : Math.max(0, lens?.specular ?? 0) * Math.max(0, resolvedEngine.rimBrightness);
  // The PNG already stores (B - 128)/255 as alpha. Preserve the public mask
  // bias as an alpha-only adjustment; do not extract it from displacement RGB
  // in SVG, where Chromium can leak a fixed X-directed bright lobe.
  const specularAlphaBias = resolvedEngine.specularMaskAlphaOffset + 128 / 255;

  useEffect(() => {
    if (!refractionProgress) return;
    const scales = lens
      ? [lens.backdropRedScale, lens.backdropGreenScale, lens.backdropBlueScale]
      : null;
    const updateDisplacement = (value: number) => {
      const progress = Math.max(0, Math.min(1, value));
      if (scales) {
        backdropDisplacementRefs.current.forEach((node, index) => {
          node?.setAttribute(
            "scale",
            String(
              scales[Math.floor(index / AXIS_PASSES_PER_CHANNEL)] * progress,
            ),
          );
        });
        backdropSpecularRef.current?.setAttribute("k1", String(backdropSpecularK1 * progress));
        backdropSoftLightRef.current?.setAttribute("k1", String(backdropSoftLightK1 * progress));
      }
    };

    updateDisplacement(refractionProgress.get());
    return refractionProgress.on("change", updateDisplacement);
  }, [backdropSpecularK1, backdropSoftLightK1, lens, refractionProgress]);

  const rebuild = () => {
    const el = containerRef.current;
    if (!el) return;
    // Measure the LAYOUT box (offsetWidth/Height), not getBoundingClientRect:
    // the latter returns the visually transformed size, so any ancestor CSS
    // scale (e.g. the squish/stretch capsule, or morph animations) would size
    // the map + userSpaceOnUse backdrop-filter to the scaled box — the
    // refraction would then not fill the shape and misalign with the tint.
    const w = Math.max(1, el.offsetWidth);
    const h = Math.max(1, el.offsetHeight);
    // Percentage sizes often start at 0 — wait for a real box.
    if (el.offsetWidth < 2 || el.offsetHeight < 2) return;

    const hw = w / 2;
    const hh = h / 2;
    const radius = Math.min(borderRadius, hw, hh);
    const safeCurvature = Math.max(0, Math.min(1, curvature));

    const lensParams = buildLensMapParams(
      {
        halfWidth: hw,
        halfHeight: hh,
        radius,
        cornerSmoothing,
        material: {
          depth,
          curvature: safeCurvature,
          splay,
          glow,
          edgeHighlight,
          edgeShadow,
          specularAngle,
          specularDecay,
        },
      },
      resolvedEngine,
      // Rim features (shadow ring, glare arcs) can be subpixel wide — without
      // a DPR boost they fall below one map texel on wide surfaces and smear.
      // Sizes here are settled (rebuild fires on resize), so the bake stays
      // one-shot; mapMaxPixels still caps the area.
      Math.min(window.devicePixelRatio || 1, 2),
    );
    // iOS's backdrop uses CSS blur, so it only needs the specular overlay,
    // not the full R/G displacement bake. iOS rasterizes a `filter: url(#svg)` at
    // CSS-px resolution regardless of the source bitmap's own resolution,
    // pixelating the corner arcs on 2x/3x screens; the plain background-image
    // overlay rendered below goes through the ordinary image pipeline
    // instead and renders at full device-pixel density.
    // The iOS carrier bakes in its gain; the normal SVG paths use the same
    // white/alpha mask at unit gain and apply strength during compositing.
    const whiteSpecularK2 = Math.max(0, specular) * Math.max(0, resolvedEngine.rimBrightness);
    const cssFallbackSpecularMaskUrl = forceCssFallback
      ? generateSpecularOverlay(lensParams, whiteSpecularK2, 1, 'rim').url
      : "";
    let mapUrl: string;
    let xMapUrl: string;
    let yMapUrl: string;
    let edgeOrderMapUrl: string;
    let maxDisplacement: number;
    if (IS_IOS) {
      const map = generateSpecularOverlay(lensParams, whiteSpecularK2, 1, 'rim');
      if (!map.url) return;
      mapUrl = xMapUrl = yMapUrl = edgeOrderMapUrl = map.url;
      maxDisplacement = map.maxDisplacement;
    } else {
      const maps = generateAxisLensMaps(lensParams);
      if (!maps.xUrl || !maps.yUrl || !maps.edgeOrderUrl) return;
      mapUrl = xMapUrl = maps.xUrl;
      yMapUrl = maps.yUrl;
      edgeOrderMapUrl = maps.edgeOrderUrl;
      maxDisplacement = maps.maxDisplacement;
    }

    const strength = Math.max(0, scale);
    // Backdrop filter uses userSpaceOnUse — scale is real CSS pixels.
    const backdropPx = refractionBackdropScale(strength, w, h, lensParams.refrPow);
    const blurPx = Math.max(0, blur);
    const backdropScales = chromaticChannelScales(backdropPx, chroma, resolvedEngine);
    // Shadow wraps the silhouette with an outer ring and a gentle inward tail.
    // It composites as a plain alpha-blended layer, so one bake covers every
    // platform (Chromium, Safari/Firefox, iOS).
    const shadow = generateShadowOverlay(lensParams);
    // The extended-range layer is painted as a masked solid rather than as an
    // image, so its bake only has to carry the highlight's *shape*: alpha 255
    // at a fully lit texel, proportional below. Brightness lives in the layer's
    // color (see the render below), which is the only place a value can exceed
    // white — a white bitmap cannot express it at any filter setting.
    const hdrUrl = hdrHighlight
      ? generateSpecularOverlay(
          lensParams,
          HDR_MASK_COEFFICIENT,
          HDR_HIGHLIGHT_CORE_WEIGHT,
          'rim',
        ).url
      : "";

    lastSizeRef.current = { w, h };
    epochRef.current += 1;
    const { path: shapePath } = createLensShape(hw, hh, radius, cornerSmoothing);
    const shapeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><path d="${shapePath}" fill="white"/></svg>`;
    const next: LensState = {
      epoch: epochRef.current,
      shapePath,
      shapeUrl: `data:image/svg+xml,${encodeURIComponent(shapeSvg)}`,
      mapUrl,
      cssFallbackSpecularMaskUrl,
      specularMaskUrl: generateSpecularOverlay(lensParams, 1, 1, 'rim').url,
      softLightMaskUrl: glow > 0 || (resolvedEngine.edgeGlowStrength > 0 && resolvedEngine.edgeGlowSpread > 0)
        ? generateSpecularOverlay(lensParams, 1, 1, 'soft').url : '',
      xMapUrl,
      yMapUrl,
      edgeOrderMapUrl,
      shadowUrl: shadow.url,
      shadowFillUrl: shadow.fillUrl,
      hdrUrl,
      shadowPadX: shadow.padX,
      shadowPadY: shadow.padY,
      maxDisplacement,
      backdropRedScale: backdropScales.red,
      backdropGreenScale: backdropScales.green,
      backdropBlueScale: backdropScales.blue,
      backdropBlurPx: blurPx,
      specular: Math.max(0, specular),
      width: w,
      height: h,
    };
    setLens(next);

    if (onMapChangeRef.current) {
      // WebKit renders a specular-only image in the actual surface, but dev
      // tooling still needs the real R/G displacement map for inspection.
      const debugMap = generateLensMap(lensParams);
      onMapChangeRef.current(debugMap.url, {
        width: w,
        height: h,
        displacementScale: backdropPx,
        maxDisplacement: debugMap.maxDisplacement * backdropPx,
      });
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBackdropSvg(supportsBackdropSvgFilter());
  }, []);

  // Observers live for the whole mount, but their callbacks must bake the
  // latest material/angle rather than the values captured on the first render.
  useLayoutEffect(() => {
    rebuildRef.current = rebuild;
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    return observeNearViewport(el, (near) => {
      inViewRef.current = near;
      setInView(near);
      if (near && needsRebuildRef.current) {
        needsRebuildRef.current = false;
        rebuildRef.current();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!inViewRef.current) {
      needsRebuildRef.current = true;
      return;
    }
    rebuild();
    // Only engine values used by the baked maps/scales belong here. Contrast,
    // saturation and other live filter controls must not re-bake the maps or
    // replace the SVG graph while tuning the backdrop. Tint/fill/backdrop also
    // update independently through CSS and the backdrop layer's visibility.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    width,
    height,
    borderRadius,
    cornerSmoothing,
    scale,
    depth,
    curvature,
    splay,
    chroma,
    blur,
    glow,
    edgeHighlight,
    edgeShadow,
    specularAngle,
    specular,
    specularDecay,
    hdrHighlight,
    forceCssFallback,
    resolvedEngine.mapQuality,
    resolvedEngine.mapMaxPixels,
    resolvedEngine.glowSpread,
    resolvedEngine.glowExponent,
    resolvedEngine.edgeWidth,
    resolvedEngine.rimBrightness,
    resolvedEngine.edgeShadowWidth,
    resolvedEngine.edgeShadowInnerSpread,
    resolvedEngine.edgeShadowInnerStrength,
    resolvedEngine.edgeExponent,
    resolvedEngine.edgeGlowSpread,
    resolvedEngine.edgeGlowStrength,
    resolvedEngine.chromaRedBoost,
    resolvedEngine.chromaGreenBoost,
    resolvedEngine.glareOppositeFactor,
    resolvedEngine.glareEndFade,
  ]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let pending: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width: rw, height: rh } = entry.contentRect;
      const w = Math.round(rw);
      const h = Math.round(rh);
      if (w < 2 || h < 2) return;
      if (w === lastSizeRef.current.w && h === lastSizeRef.current.h) return;
      if (!inViewRef.current) {
        needsRebuildRef.current = true;
        return;
      }
      clearTimeout(pending);
      pending = setTimeout(() => rebuildRef.current(), 0);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearTimeout(pending);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const containerStyle: CSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    ["--glass-clip-path" as string]: lens ? `path("${lens.shapePath}")` : undefined,
    ...glassSurfaceCssVars(tint, fill, resolvedEngine, resolvedPointerHighlight, materialMode),
    ...(forceCssFallback ? { ["--glass-backdrop-saturate-blur" as string]: "1" } : null),
    ["--glass-blur" as string]: `${
      useBackdropSvg
        ? Math.max(0, blur)
        : forceCssFallback ? 1.5 : cssBackdropBlurPx(blur, resolvedEngine)
    }px`,
    ["--backdrop-filter-id" as string]: lens ? `url(#${backdropFilterId})` : undefined,
  };

  /**
   * With no pointer bloom the saturate → brightness → mask → composite chain
   * below is an identity: its `feImage` mask stays 0×0, so the masked boost is
   * empty and compositing it over `SourceGraphic` returns `SourceGraphic`.
   * Chromium still rasterizes those primitives over the whole filter region on
   * every re-evaluation, so skip the chain outright and read the source
   * directly instead.
   */
  const pointerBackdropResult = resolvedPointerHighlight
    ? "pointerBackdrop"
    : "SourceGraphic";
  const backdropInput =
    lens && lens.backdropBlurPx > 0 ? "blurredBackdrop" : pointerBackdropResult;
  const refractionProgressValue = refractionProgress
    ? Math.max(0, Math.min(1, refractionProgress.get()))
    : 1;
  /**
   * chroma = 0 leaves every channel with the same displacement scale, so one
   * X/Y pass pair replaces the three chromatic branches and their channel
   * split/merge — roughly half the full-region GPU passes per repaint.
   */
  const monochromaticBackdrop =
    lens !== null &&
    lens.backdropRedScale === lens.backdropGreenScale &&
    lens.backdropGreenScale === lens.backdropBlueScale;
  const lensFilterUrl = lens ? `url(#${filterId})` : undefined;
  const useCssLens = IS_IOS || forceCssFallback;
  const cssSpecularMaskUrl = IS_IOS
    ? lens?.mapUrl ?? ""
    : forceCssFallback ? lens?.cssFallbackSpecularMaskUrl ?? "" : "";
  const mapW = IS_IOS && lens ? lens.width : 1;
  const mapH = IS_IOS && lens ? lens.height : 1;
  const backdropPad = lens
    ? backdropFilterPadding(lens.backdropBlurPx, resolvedEngine)
    : backdropFilterPadding(0, resolvedEngine);

  const syncPointerMask = (x: number, y: number, active: boolean) => {
    const mask = pointerMaskRef.current;
    if (!mask) return;
    if (!active) {
      mask.setAttribute("width", "0");
      mask.setAttribute("height", "0");
      return;
    }
    const { radius } = resolvedPointerHighlight ?? glassPointerHighlight;
    mask.setAttribute("x", String(x - radius));
    mask.setAttribute("y", String(y - radius));
    mask.setAttribute("width", String(radius * 2));
    mask.setAttribute("height", String(radius * 2));
  };

  const updatePointerHighlight = (event: ReactPointerEvent<HTMLDivElement>, strength: number) => {
    if (!resolvedPointerHighlight) return;
    const surface = containerRef.current;
    if (!surface) return;

    const rect = surface.getBoundingClientRect();
    const pointer = pointerHighlightRef.current;
    pointer.active = true;
    pointer.targetX = event.clientX - rect.left;
    pointer.targetY = event.clientY - rect.top;

    if (pointer.x === null || pointer.y === null) {
      pointer.x = pointer.targetX;
      pointer.y = pointer.targetY;
      surface.style.setProperty("--glass-pointer-x", `${pointer.x}px`);
      surface.style.setProperty("--glass-pointer-y", `${pointer.y}px`);
      syncPointerMask(pointer.x, pointer.y, true);
    }

    if (pointer.frame === null) {
      const followPointer = () => {
        const current = pointerHighlightRef.current;
        const target = containerRef.current;
        if (!target || current.x === null || current.y === null) {
          current.frame = null;
          return;
        }

        current.x += (current.targetX - current.x) * 0.2;
        current.y += (current.targetY - current.y) * 0.2;
        target.style.setProperty("--glass-pointer-x", `${current.x}px`);
        target.style.setProperty("--glass-pointer-y", `${current.y}px`);
        syncPointerMask(current.x, current.y, true);

        if (Math.hypot(current.targetX - current.x, current.targetY - current.y) < 0.25) {
          current.x = current.targetX;
          current.y = current.targetY;
          current.frame = null;
          return;
        }

        current.frame = window.requestAnimationFrame(followPointer);
      };
      pointer.frame = window.requestAnimationFrame(followPointer);
    }

    surface.style.setProperty("--glass-highlight-strength", String(strength));
  };

  const clearPointerHighlight = () => {
    const surface = containerRef.current;
    if (!surface) return;
    const pointer = pointerHighlightRef.current;
    if (pointer.frame !== null) window.cancelAnimationFrame(pointer.frame);
    pointer.frame = null;
    surface.removeAttribute("data-glass-pressed");
    if (pointerHighlightPreview && resolvedPointerHighlight) {
      const x = Math.max(0, Math.min(1, pointerHighlightPreview.x)) * surface.offsetWidth;
      const y = Math.max(0, Math.min(1, pointerHighlightPreview.y)) * surface.offsetHeight;
      pointer.x = pointer.targetX = x;
      pointer.y = pointer.targetY = y;
      pointer.active = true;
      surface.style.setProperty("--glass-pointer-x", `${x}px`);
      surface.style.setProperty("--glass-pointer-y", `${y}px`);
      surface.style.setProperty(
        "--glass-highlight-strength",
        String(pointerHighlightPreview.strength ?? resolvedPointerHighlight.hoverStrength),
      );
      syncPointerMask(x, y, true);
      return;
    }
    pointer.x = null;
    pointer.y = null;
    pointer.active = false;
    syncPointerMask(0, 0, false);
    surface.style.setProperty("--glass-highlight-strength", "0");
  };

  useLayoutEffect(() => {
    if (!pointerHighlightPreview || !resolvedPointerHighlight) return;
    const surface = containerRef.current;
    if (!surface) return;
    const pointer = pointerHighlightRef.current;
    const x = Math.max(0, Math.min(1, pointerHighlightPreview.x)) * surface.offsetWidth;
    const y = Math.max(0, Math.min(1, pointerHighlightPreview.y)) * surface.offsetHeight;
    pointer.x = pointer.targetX = x;
    pointer.y = pointer.targetY = y;
    pointer.active = true;
    surface.style.setProperty("--glass-pointer-x", `${x}px`);
    surface.style.setProperty("--glass-pointer-y", `${y}px`);
    surface.style.setProperty(
      "--glass-highlight-strength",
      String(pointerHighlightPreview.strength ?? resolvedPointerHighlight.hoverStrength),
    );
    syncPointerMask(x, y, true);

    return () => {
      syncPointerMask(0, 0, false);
      surface.style.setProperty("--glass-highlight-strength", "0");
    };
  }, [lens, pointerHighlightPreview, resolvedPointerHighlight]);

  // Preview mode owns the highlight entirely (demos / mock cursors). Live
  // pointer handlers would clear on real-mouse leave while a lagged virtual
  // cursor is still over the glass.
  const livePointerHighlight = pointerHighlightPreview
    ? null
    : resolvedPointerHighlight;

  const surface = (
    <div
      ref={containerRef}
      data-glass-shape={lens ? 'smooth' : undefined}
      data-force-css-fallback={forceCssFallback || undefined}
      className={[
        "glass-surface",
        liveBackdrop
          ? useBackdropSvg
            ? "glass-surface--backdrop-svg"
            : "glass-surface--backdrop-blur"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-hdr-range={hdrRange ? "high" : "standard"}
      style={containerStyle}
      onPointerEnter={
        livePointerHighlight
          ? (event) => {
              if (event.pointerType === "mouse") {
                updatePointerHighlight(event, livePointerHighlight.hoverStrength);
              }
            }
          : undefined
      }
      onPointerMove={
        livePointerHighlight
          ? (event) => {
              if (event.pointerType === "mouse") {
                updatePointerHighlight(event, livePointerHighlight.hoverStrength);
              }
            }
          : undefined
      }
      onPointerLeave={livePointerHighlight ? clearPointerHighlight : undefined}
      onPointerDown={
        livePointerHighlight
          ? (event) => {
              updatePointerHighlight(event, livePointerHighlight.pressedStrength);
              containerRef.current?.setAttribute("data-glass-pressed", "true");
            }
          : undefined
      }
      onPointerUp={
        livePointerHighlight
          ? (event) => {
              if (event.pointerType === "mouse") {
                updatePointerHighlight(event, livePointerHighlight.hoverStrength);
              }
              containerRef.current?.removeAttribute("data-glass-pressed");
            }
          : undefined
      }
      onPointerCancel={livePointerHighlight ? clearPointerHighlight : undefined}
    >
      {lens && !forceCssFallback ? (
        <svg className="glass-surface__defs" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            {/*
              Content filter — tint only.
              Do NOT feDisplacementMap this layer: warping an opaque fill always
              leaves a transparent gap (reads as tint shifted bottom-right).
              The opaque displacement map is not a silhouette mask. Apply the
              shared vector contour after compositing tint and specular instead.
            */}
            <filter
              id={filterId}
              filterUnits={IS_IOS ? "userSpaceOnUse" : "objectBoundingBox"}
              primitiveUnits={IS_IOS ? "userSpaceOnUse" : "objectBoundingBox"}
              colorInterpolationFilters="sRGB"
              x="0"
              y="0"
              width={mapW}
              height={mapH}
            >
              <feImage
                href={lens.specularMaskUrl}
                x="0"
                y="0"
                width={mapW}
                height={mapH}
                preserveAspectRatio="none"
                result="rawSpecMask"
              />
              <feColorMatrix in="rawSpecMask" type="matrix" values={glassLightingMaskMatrix(lighting.highlight, specularAlphaBias)} result="specMask" />
              {/* Fill-colored additive light; the background-modulated share
                  lives in the backdrop filter. CSS-blur fallbacks use full gain. */}
              <feComposite
                in="specMask"
                in2="SourceGraphic"
                operator="arithmetic"
                k1="0"
                k2={contentSpecularK2}
                k3="1"
                k4="0"
                result={lens.softLightMaskUrl ? 'rimLensOut' : 'lensOut'}
              />
              {lens.softLightMaskUrl ? <>
                <feImage href={lens.softLightMaskUrl} x="0" y="0" width={mapW} height={mapH} preserveAspectRatio="none" result="rawSoftLightMask" />
                <feColorMatrix in="rawSoftLightMask" type="matrix" values={glassLightingMaskMatrix(lighting.glow)} result="softLightMask" />
                <feComposite in="softLightMask" in2="rimLensOut" operator="arithmetic" k1="0" k2={contentSoftLightK2} k3="1" k4="0" result="lensOut" />
              </> : null}
              <feImage href={lens.shapeUrl} x="0" y="0" width={mapW} height={mapH} preserveAspectRatio="none" result="lensShape" />
              <feComposite in="lensOut" in2="lensShape" operator="in" />
            </filter>

            {/*
              Backdrop filter — per-instance userSpaceOnUse so each pill gets
              its own pixel-accurate map (no shared objectBoundingBox scale bug).
            */}
            <filter
              id={backdropFilterId}
              filterUnits="userSpaceOnUse"
              primitiveUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
              x={-backdropPad}
              y={-backdropPad}
              width={lens.width + backdropPad * 2}
              height={lens.height + backdropPad * 2}
            >
              <feImage
                href={lens.xMapUrl}
                x="0"
                y="0"
                width={lens.width}
                height={lens.height}
                preserveAspectRatio="none"
                result="rawXDisplacementMap"
              />
              <feComponentTransfer in="rawXDisplacementMap" result="xDisplacementMap">
                {/* Active R: cancel PNG 128≠0.5 mid bias so flat field stays
                    undisplaced; unused G forced to exact 0.5. */}
                <feFuncR type="linear" slope="1" intercept={DISPLACEMENT_PNG_MID_BIAS} />
                <feFuncG type="linear" slope="0" intercept="0.5" />
              </feComponentTransfer>
              <feImage
                href={lens.yMapUrl}
                x="0"
                y="0"
                width={lens.width}
                height={lens.height}
                preserveAspectRatio="none"
                result="rawYDisplacementMap"
              />
              <feComponentTransfer in="rawYDisplacementMap" result="yDisplacementMap">
                <feFuncR type="linear" slope="0" intercept="0.5" />
                <feFuncG type="linear" slope="1" intercept={DISPLACEMENT_PNG_MID_BIAS} />
              </feComponentTransfer>
              <feImage
                href={lens.edgeOrderMapUrl}
                x="0"
                y="0"
                width={lens.width}
                height={lens.height}
                preserveAspectRatio="none"
                result="edgeOrderMask"
              />
              <feComponentTransfer in="edgeOrderMask" result="sideOrderMask">
                <feFuncA type="table" tableValues="1 0" />
              </feComponentTransfer>
              {/* Chromium regression guard: keep X and Y in separate passes.
                  A single R/X + G/Y feDisplacementMap causes a GPU-pipeline
                  shear (top pulls left, bottom pulls right) on affected Chrome
                  builds. X and Y start from independently baked textures and
                  the unused axis is forced to exactly 0.5 in each pass.
                  Top/bottom and side branches use opposite pass orders so
                  each region's tangential axis is applied last;
                  see docs/glass-refraction.md before changing this structure. */}
              {resolvedPointerHighlight ? (
                <>
                  <feColorMatrix
                    in="SourceGraphic"
                    type="saturate"
                    values={String(resolvedPointerHighlight.saturation)}
                    result="pointerSaturated"
                  />
                  <feComponentTransfer in="pointerSaturated" result="pointerBright">
                    <feFuncR type="linear" slope={resolvedPointerHighlight.brightness} />
                    <feFuncG type="linear" slope={resolvedPointerHighlight.brightness} />
                    <feFuncB type="linear" slope={resolvedPointerHighlight.brightness} />
                  </feComponentTransfer>
                  <feImage
                    ref={pointerMaskRef}
                    href={pointerMaskUrl}
                    x="0"
                    y="0"
                    width="0"
                    height="0"
                    preserveAspectRatio="none"
                    result="pointerMask"
                  />
                  <feComposite in="pointerBright" in2="pointerMask" operator="in" result="pointerBoost" />
                  <feComposite in="pointerBoost" in2="SourceGraphic" operator="over" result="pointerBackdrop" />
                </>
              ) : null}
              <feGaussianBlur
                in={pointerBackdropResult}
                stdDeviation={lens.backdropBlurPx}
                result="blurredBackdrop"
              />
              {monochromaticBackdrop ? (
                <>
                  {/* Top/bottom uses Y→X so its tangential X is last; sides
                      use X→Y so tangential Y is last. The CPU orientation mask
                      blends both axis-isolated orders through rounded corners. */}
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[0] = node;
                    }}
                    in={backdropInput}
                    in2="yDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispTopBottomY"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[1] = node;
                    }}
                    in="dispTopBottomY"
                    in2="xDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispTopBottom"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[2] = node;
                    }}
                    in={backdropInput}
                    in2="xDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispSidesX"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[3] = node;
                    }}
                    in="dispSidesX"
                    in2="yDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispSides"
                  />
                  <feComposite
                    in="dispTopBottom"
                    in2="edgeOrderMask"
                    operator="in"
                    result="dispTopBottomMasked"
                  />
                  <feComposite
                    in="dispSides"
                    in2="sideOrderMask"
                    operator="in"
                    result="dispSidesMasked"
                  />
                  <feComposite
                    in="dispTopBottomMasked"
                    in2="dispSidesMasked"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="refracted"
                  />
                </>
              ) : (
                <>
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[0] = node;
                    }}
                    in={backdropInput}
                    in2="yDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispRTBY"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[1] = node;
                    }}
                    in="dispRTBY"
                    in2="xDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispRTB"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[2] = node;
                    }}
                    in={backdropInput}
                    in2="xDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispRSideX"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[3] = node;
                    }}
                    in="dispRSideX"
                    in2="yDisplacementMap"
                    scale={lens.backdropRedScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispRSide"
                  />
                  <feComposite
                    in="dispRTB"
                    in2="edgeOrderMask"
                    operator="in"
                    result="dispRTBMasked"
                  />
                  <feComposite
                    in="dispRSide"
                    in2="sideOrderMask"
                    operator="in"
                    result="dispRSideMasked"
                  />
                  <feComposite
                    in="dispRTBMasked"
                    in2="dispRSideMasked"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="dispR"
                  />
                  <feColorMatrix
                    in="dispR"
                    type="matrix"
                    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="red"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[4] = node;
                    }}
                    in={backdropInput}
                    in2="yDisplacementMap"
                    scale={lens.backdropGreenScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispGTBY"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[5] = node;
                    }}
                    in="dispGTBY"
                    in2="xDisplacementMap"
                    scale={lens.backdropGreenScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispGTB"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[6] = node;
                    }}
                    in={backdropInput}
                    in2="xDisplacementMap"
                    scale={lens.backdropGreenScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispGSideX"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[7] = node;
                    }}
                    in="dispGSideX"
                    in2="yDisplacementMap"
                    scale={lens.backdropGreenScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispGSide"
                  />
                  <feComposite
                    in="dispGTB"
                    in2="edgeOrderMask"
                    operator="in"
                    result="dispGTBMasked"
                  />
                  <feComposite
                    in="dispGSide"
                    in2="sideOrderMask"
                    operator="in"
                    result="dispGSideMasked"
                  />
                  <feComposite
                    in="dispGTBMasked"
                    in2="dispGSideMasked"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="dispG"
                  />
                  <feColorMatrix
                    in="dispG"
                    type="matrix"
                    values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
                    result="green"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[8] = node;
                    }}
                    in={backdropInput}
                    in2="yDisplacementMap"
                    scale={lens.backdropBlueScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispBTBY"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[9] = node;
                    }}
                    in="dispBTBY"
                    in2="xDisplacementMap"
                    scale={lens.backdropBlueScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispBTB"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[10] = node;
                    }}
                    in={backdropInput}
                    in2="xDisplacementMap"
                    scale={lens.backdropBlueScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispBSideX"
                  />
                  <feDisplacementMap
                    ref={(node) => {
                      backdropDisplacementRefs.current[11] = node;
                    }}
                    in="dispBSideX"
                    in2="yDisplacementMap"
                    scale={lens.backdropBlueScale * refractionProgressValue}
                    xChannelSelector="R"
                    yChannelSelector="G"
                    result="dispBSide"
                  />
                  <feComposite
                    in="dispBTB"
                    in2="edgeOrderMask"
                    operator="in"
                    result="dispBTBMasked"
                  />
                  <feComposite
                    in="dispBSide"
                    in2="sideOrderMask"
                    operator="in"
                    result="dispBSideMasked"
                  />
                  <feComposite
                    in="dispBTBMasked"
                    in2="dispBSideMasked"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="dispB"
                  />
                  <feColorMatrix
                    in="dispB"
                    type="matrix"
                    values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
                    result="blue"
                  />
                  <feComposite
                    in="red"
                    in2="green"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="rg"
                  />
                  <feComposite
                    in="rg"
                    in2="blue"
                    operator="arithmetic"
                    k1="0"
                    k2="1"
                    k3="1"
                    k4="0"
                    result="refracted"
                  />
                </>
              )}
              {/* Compress sampled backdrop contrast before adding rim light.
                  No filter on the material/content group: labels stay sharp,
                  the silhouette stays aligned, and page capture stays live. */}
              {/* Saturate before compression: a later saturation pass can
                  clip channels and undo the final brightness ordering. */}
              <feColorMatrix in="refracted" type="saturate" values={String(resolvedEngine.backdropSaturateSvg)} result={backdropContrast.contrast === 1 ? "quietBackdrop" : "saturatedBackdrop"} />
              {backdropContrast.contrast > 0 && backdropContrast.contrast < 1 ? <>
                {/* Map brightness directly, leaving alpha untouched. Encoding
                    chroma separately avoids per-channel nonlinear hue shifts
                    and alpha-mask rounding that can reverse adjacent tones. */}
                <feColorMatrix in="saturatedBackdrop" type="matrix" values={BACKDROP_TO_LUMA_CHROMA} result="backdropLumaChroma" />
                <feComponentTransfer in="backdropLumaChroma" result="quietLumaChroma">
                  <feFuncR type="table" tableValues={backdropContrastTable} />
                  <feFuncG type="linear" slope={backdropContrast.contrast} intercept={backdropContrast.redChroma * (1 - backdropContrast.contrast)} />
                  <feFuncB type="linear" slope={backdropContrast.contrast} intercept={backdropContrast.blueChroma * (1 - backdropContrast.contrast)} />
                </feComponentTransfer>
                <feColorMatrix in="quietLumaChroma" type="matrix" values={BACKDROP_FROM_LUMA_CHROMA} result="quietBackdrop" />
              </> : backdropContrast.contrast === 0 ? <feColorMatrix
                in="saturatedBackdrop"
                type="matrix"
                values={`0 0 0 0 ${backdropContrast.pivot[0]}  0 0 0 0 ${backdropContrast.pivot[1]}  0 0 0 0 ${backdropContrast.pivot[2]}  0 0 0 1 0`}
                result="quietBackdrop"
              /> : null}
              {/* Fill-colored specular also modulates the refracted background.
                  It uses the same derived hue as the content lighting pass. */}
              <feImage
                href={lens.specularMaskUrl}
                x="0"
                y="0"
                width={lens.width}
                height={lens.height}
                preserveAspectRatio="none"
                result="rawBackdropSpecMask"
              />
              <feColorMatrix in="rawBackdropSpecMask" type="matrix" values={glassLightingMaskMatrix(lighting.highlight, specularAlphaBias)} result="backdropSpecMask" />
              <feComposite
                ref={backdropSpecularRef}
                in="backdropSpecMask"
                in2="quietBackdrop"
                operator="arithmetic"
                k1={
                  backdropSpecularK1 *
                  (refractionProgress
                    ? Math.max(0, Math.min(1, refractionProgress.get()))
                    : 1)
                }
                k2="0"
                k3="1"
                k4="0"
                result={lens.softLightMaskUrl ? 'rimSpecularOut' : 'specularOut'}
              />
              {lens.softLightMaskUrl ? <>
                <feImage href={lens.softLightMaskUrl} x="0" y="0" width={lens.width} height={lens.height} preserveAspectRatio="none" result="rawBackdropSoftLightMask" />
                <feColorMatrix in="rawBackdropSoftLightMask" type="matrix" values={glassLightingMaskMatrix(lighting.glow)} result="backdropSoftLightMask" />
                {/* Both contributions read the ORIGINAL quiet backdrop.
                    Feeding one into the other would multiply their gains. */}
                <feComposite ref={backdropSoftLightRef} in="backdropSoftLightMask" in2="quietBackdrop" operator="arithmetic" k1={backdropSoftLightK1 * refractionProgressValue} k2="0" k3="0" k4="0" result="softLightContribution" />
                <feComposite in="rimSpecularOut" in2="softLightContribution" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="specularOut" />
              </> : null}
              {/* Highlight compression (material highlightCompress) without a
                  saturation shift: per-channel gamma would bend R/G/B by
                  different ratios and pump saturation. Instead gamma the
                  luminance and scale every channel by the same factor —
                  rgb × L^(e−1) gives luminance L^e, hue untouched. */}
              {highlightCompress > 0 ? (
                <>
                  <feColorMatrix
                    in="specularOut"
                    type="matrix"
                    values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 0 1"
                    result="luma"
                  />
                  <feComponentTransfer in="luma" result="lumaGamma">
                    <feFuncR type="gamma" exponent={highlightCompress} />
                    <feFuncG type="gamma" exponent={highlightCompress} />
                    <feFuncB type="gamma" exponent={highlightCompress} />
                  </feComponentTransfer>
                  <feComposite
                    in="specularOut"
                    in2="lumaGamma"
                    operator="arithmetic"
                    k1="1"
                    k2="0"
                    k3="0"
                    k4="0"
                    result="compressedSpecular"
                  />
                </>
              ) : null}
              {/* Keep clipping inside the existing SVG pass. CSS clip-path on
                  the backdrop (or an ancestor) breaks Chromium's page capture. */}
              <feImage href={lens.shapeUrl} x="0" y="0" width={lens.width} height={lens.height} preserveAspectRatio="none" result="backdropShape" />
              <feComposite in={highlightCompress > 0 ? 'compressedSpecular' : 'specularOut'} in2="backdropShape" operator="in" />
            </filter>
          </defs>
        </svg>
      ) : null}

      {/* Opaque support for the outside shadow band sits behind the lens.
          Its one-texel inward overlap is therefore covered by the material's
          own rim instead of painting over the inner highlight. */}
      {lens?.shadowFillUrl ? (
        <div
          className="glass-surface__shadow-fill"
          style={{
            position: "absolute",
            inset: `${-lens.shadowPadY}px ${-lens.shadowPadX}px`,
            zIndex: 0,
            pointerEvents: "none",
            backgroundColor: shadowSupportColor,
            opacity: materialMode === "dark" ? Math.max(0, Math.min(1, edgeShadow)) : 1,
            maskImage: `url("${lens.shadowFillUrl}")`,
            WebkitMaskImage: `url("${lens.shadowFillUrl}")`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
          aria-hidden
        />
      ) : null}

      <div
        className="glass-surface__material"
        style={forceCssFallback ? {
          borderRadius: `${borderRadius}px`,
          overflow: 'visible',
          backdropFilter: 'blur(1.5px)',
          WebkitBackdropFilter: 'blur(1.5px)',
          background: 'rgb(var(--glass-backdrop-pivot-rgb) / 0.7)',
        } : lens ? { borderRadius: 0, overflow: 'visible' } : undefined}
      >
        {resolvedPointerHighlight ? (
          <div className="glass-surface__pointer-highlight" aria-hidden />
        ) : null}
        {liveBackdrop && !forceCssFallback ? <div
          className="glass-surface__backdrop"
          aria-hidden
        /> : null}

        {/* Selection chrome between frost and specular — so rim light stays on the shell, not the chip. */}
        {stateLayer ? <div className="glass-surface__state">{stateLayer}</div> : null}

        {/* Lens body only — text/icons are NOT in here. */}
        <div
          className="glass-surface__lens"
          style={useCssLens && lens
            ? { clipPath: `path("${lens.shapePath}")` }
            : lensFilterUrl ? { filter: lensFilterUrl } : undefined}
        >
          <div className="glass-surface__tint" aria-hidden />
        </div>
        {/* CSS specular carrier for iOS and forceCssFallback. It avoids SVG
            filter rasterization by using a baked color + alpha mask.
            plus-lighter reproduces the filter path's additive feComposite
            math; iOS < 16.4 falls back to normal alpha blending (slightly
            milkier, never broken). Styled inline rather than relying on a
            build-time utility:
            this project's CSS build pipeline has silently dropped rules
            before, and losing background-size: 100% 100% here would paint
            the raw bitmap at its baked pixel size. */}
        {useCssLens && cssSpecularMaskUrl ? (
          <div
            className="glass-surface__ios-specular"
            style={{
              zIndex: 2,
              borderRadius: "inherit",
              backgroundColor: highlightColor,
              maskImage: `url("${cssSpecularMaskUrl}")`,
              WebkitMaskImage: `url("${cssSpecularMaskUrl}")`,
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              mixBlendMode: "plus-lighter",
            }}
            aria-hidden
          />
        ) : null}
        {useCssLens && lens?.softLightMaskUrl ? (
          <div className="glass-surface__ios-specular" style={{
            zIndex: 2,
            backgroundColor: glowColor,
            maskImage: `url("${lens.softLightMaskUrl}")`,
            WebkitMaskImage: `url("${lens.softLightMaskUrl}")`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            mixBlendMode: 'plus-lighter',
          }} aria-hidden />
        ) : null}
        {hdrHighlight && lens?.hdrUrl ? (
          <div
            className="glass-surface__hdr-highlight"
            aria-hidden
            style={{
              zIndex: 2,
              borderRadius: "inherit",
              opacity: Math.min(1, hdrStrength * Math.max(0, resolvedEngine.rimBrightness)),
              backgroundImage: `url("${hdrWhiteUrl}")`,
              backgroundColor: highlightColor,
              backgroundBlendMode: 'multiply',
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
              // The light is an HDR *image* (see the import): Blink decodes a
              // PQ/BT.2020 asset into an extended-range buffer, while an
              // out-of-range CSS color gets clamped to SDR white on the way to
              // the compositor — which is why a `color(display-p3 5 5 5)`
              // background here did nothing at all.
              //
              // The highlight's own falloff rides in as a mask (its alpha),
              // which multiplies coverage without touching the color space.
              // `mask-mode` is left at its `match-source` default: for an image
              // source that is the alpha channel, which is exactly the
              // highlight falloff.
              maskImage: `url("${lens.hdrUrl}")`,
              WebkitMaskImage: `url("${lens.hdrUrl}")`,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              // Only the element's own HDR background is multiplied by its
              // fill-derived color; background-blend-mode does not blend the
              // element against its siblings. Avoid `mix-blend-mode` and CSS
              // filters: either can force the material into a blend-back surface,
              // Chromium stops sampling the page for the sibling
              // `backdrop-filter` inside one — the frost and refraction vanish.
              // Source-over still lands the added light on the same pixels
              // because this layer *is* the highlight's own shape.
            }}
          />
        ) : null}
      </div>

      {/* Shade the outside band after the material so its directional edge
          remains above the lens while the opaque support stays behind it. */}
      {lens?.shadowUrl ? (
        <div
          className="glass-surface__shadow"
          style={{
            position: "absolute",
            inset: `${-lens.shadowPadY}px ${-lens.shadowPadX}px`,
            zIndex: 2,
            pointerEvents: "none",
            backgroundColor: shadowColor,
            maskImage: `url("${lens.shadowUrl}")`,
            WebkitMaskImage: `url("${lens.shadowUrl}")`,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
          }}
          aria-hidden
        />
      ) : null}

      <div className="glass-surface__content">{children}</div>
      {overlayLayer ? <div className="glass-surface__overlay">{overlayLayer}</div> : null}
    </div>
  );

  return surface;
};

export default LiquidGlass;
