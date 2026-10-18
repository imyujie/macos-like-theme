// Type definitions for smooth-corners

export type Radius =
  | number
  | 'css'
  | [number]
  | [number, number]
  | [number, number, number]
  | [number, number, number, number]
  | { tl?: number; tr?: number; br?: number; bl?: number };

/** 0..1, '0%'..'100%', 'system-ui' (0.6 on macOS, 0 elsewhere), 'none'. */
export type Smoothing = number | `${number}%` | 'system-ui' | 'none';

export interface BorderConfig {
  width: number;
  /** Reuse the surface path and clip a double-width stroke to its inside. */
  followSurface?: boolean;
  /** Any CSS color. Defaults to `var(--squircle-border-color, currentColor)`. */
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
  gradient?: Array<{ offset: number; color: string }>;
  /** Gradient angle in degrees, CSS convention. Default 135. */
  angle?: number;
}

export interface SmoothCornersConfig {
  /** Corner radius. `'css'` (default) reads the element's own `border-radius`. */
  radius: Radius;
  /** Default 0.6 (Electron `system-ui` on macOS). */
  smoothing: Smoothing;
  border: BorderConfig | number | null;
  /** Decimal places in generated path data. Default 2. */
  precision: number;
}

export interface CornerInfo {
  corner: 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left';
  radius: number;
  smoothingIn: number;
  smoothingOut: number;
}

export interface InspectResult {
  config: SmoothCornersConfig;
  smoothing: number;
  size: { width: number; height: number };
  radii: { tl: number; tr: number; br: number; bl: number };
  corners: CornerInfo[];
  path: string;
  mode: 'clip-path' | 'border-radius-fallback';
}

type Target = string | Element | ArrayLike<Element>;

export declare class SmoothCorners {
  constructor(defaults?: Partial<SmoothCornersConfig>);
  apply(target: Target, config?: Partial<SmoothCornersConfig>): this;
  applyAll(target: Target, config?: Partial<SmoothCornersConfig>): this;
  auto(opts?: { root?: ParentNode; observe?: boolean }): number;
  update(target: Target, config: Partial<SmoothCornersConfig>): this;
  remove(target: Target): this;
  inspect(el: Element): InspectResult | null;
  has(el: Element): boolean;
  destroy(): void;
}
export default SmoothCorners;

export declare function squircle(target: Target, config?: Partial<SmoothCornersConfig>): SmoothCorners;
export declare function getSharedInstance(): SmoothCorners;
export declare function parseSmoothing(v: Smoothing | string | undefined): number | undefined;
export declare function systemSmoothing(): number;
export declare function supportsClipPath(): boolean;

export declare function smoothRoundRectPath(
  x: number, y: number, width: number, height: number,
  smoothness: number, radius: Radius, opts?: { precision?: number }
): string;
export declare function smoothRoundRectSVG(
  width: number, height: number, smoothness: number, radius: Radius,
  opts?: { fill?: string; stroke?: string; strokeWidth?: number }
): string;
export declare function constrainRadii(w: number, h: number, r: { tl: number; tr: number; br: number; bl: number }): { tl: number; tr: number; br: number; bl: number };
export declare function constrainSmoothness(size: number, s: number, r1: number, r2: number): [number, number];
export declare function normalizeRadii(r: Radius): { tl: number; tr: number; br: number; bl: number };
export declare function computeCorners(x: number, y: number, w: number, h: number, s: number, r: Radius): Array<Record<string, any>>;
