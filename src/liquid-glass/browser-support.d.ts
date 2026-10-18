export type BrowserIdentity = {
    userAgent: string;
    platform: string;
    maxTouchPoints: number;
};
export type GlassBrowserSupport = {
    isIOS: boolean;
    isSafari: boolean;
    isFirefox: boolean;
};
export declare function detectGlassBrowserSupport(identity: BrowserIdentity): GlassBrowserSupport;
export declare const glassBrowserSupport: GlassBrowserSupport;
/**
 * Chromium-only capability gate for SVG reference filters on backdrops.
 * Safari and Firefox deliberately stay on the honest CSS blur fallback.
 */
export declare function supportsBackdropSvgFilter(): boolean;
