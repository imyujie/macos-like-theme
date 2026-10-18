import { type CSSProperties, type ReactNode } from "react";
import { type GlassEngineParams, type GlassPointerHighlightParams } from "./refraction/engine";
import { type GlassMaterialInput, type GlassMaterialMode } from "./materials/materials";
import "./liquid-glass.css";
export type { GlassMaterialInput, GlassMaterialKey, GlassMaterialMode, GlassMaterialName, GlassMaterialParams, GlassPhysicalMaterialName, GlassSemanticMaterialName, } from "./materials/materials";
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
    className?: string;
    style?: CSSProperties;
    /** Fires whenever the displacement map is regenerated (for dev tooling). */
    onDisplacementMapChange?: (mapUrl: string, info: {
        width: number;
        height: number;
        /** SVG feDisplacementMap scale in CSS px before chromatic channel boosts. */
        displacementScale: number;
        /** Largest decoded displacement represented by the current map. */
        maxDisplacement: number;
    }) => void;
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
     * Independent extended-range highlight layer. Paints the baked highlight as a
     * mask over a wide-gamut solid whose components exceed white — the only way
     * to ask a display for more than SDR white. Disabled falls back to the normal
     * SDR specular pass alone.
     */
    hdrHighlight?: boolean;
    /**
     * How much of the baked extended-range light to apply, 0–1. The headroom
     * lives in the asset (PQ 1600 nits, well above SDR white); this scales its
     * coverage, so the result runs from "no extra light" to the display's own
     * peak. On a display without HDR headroom the browser clamps the layer back to
     * white, where it still reads as a harder, core-weighted highlight.
     */
    hdrHighlightStrength?: number;
};
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
export declare function useHdrDisplayRange(): boolean;
export declare const LiquidGlass: ({ children, stateLayer, overlayLayer, width, height, borderRadius, material, materialMode, refractionProgress, backdrop, className, style, onDisplacementMapChange, engine, pointerHighlight, pointerHighlightPreview, hdrHighlight, hdrHighlightStrength, }: LiquidGlassProps) => import("react").JSX.Element;
export default LiquidGlass;
