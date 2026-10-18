/**
 * Viewport gating for live glass backdrops.
 *
 * Chromium re-evaluates `backdrop-filter: url(#svg)` whenever sampled content
 * changes (e.g. an animating page background). Off-screen instances still pay
 * that cost unless the filter is detached. Observe near-viewport visibility and
 * only keep the live backdrop active while the surface is close enough to see.
 */
export declare const GLASS_VIEWPORT_ROOT_MARGIN_PX = 200;
export declare const GLASS_VIEWPORT_ROOT_MARGIN = "200px";
export declare function isElementNearViewport(el: Element, marginPx?: number, viewport?: {
    width: number;
    height: number;
}): boolean;
export declare function observeNearViewport(el: Element, onChange: (near: boolean) => void, rootMargin?: string): () => void;
