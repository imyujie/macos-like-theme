import { Button } from '@base-ui/react/button';
import { useState } from 'react';
import {
  LiquidGlass,
  type GlassMaterialInput,
  type GlassMaterialMode,
  type GlassMaterialParams,
} from '../liquid-glass/liquid-glass';
import type { GlassPointerHighlightParams } from '../liquid-glass/refraction/engine';
import type { GlassEngineParams } from '../liquid-glass/refraction/engine';
import { SfSymbol } from './symbols';

export type LiquidGlassButtonVariant = 'capsule' | 'icon' | 'prominent';

export interface LiquidGlassButtonProps {
  /** Visible label. Omit it for the icon variant. */
  children?: string;
  /** Exported SF Symbol name shown before the label, or on its own for the icon variant. */
  icon?: string;
  variant?: LiquidGlassButtonVariant;
  /** Control height in CSS px; the radius follows it, so the ends stay fully round. */
  size?: number;
  /** Theme appearance. Drives the material's light/dark transform. */
  appearance?: GlassMaterialMode;
  /**
   * Overrides `appearance` for the material transform. `dark` means "use the
   * material values as given"; `light` applies the light transform (fill mixed
   * toward white, tint scaled, and so on).
   */
  materialMode?: GlassMaterialMode;
  /** Replaces the theme material. `resolveGlassMaterial` accepts a preset name or preset + overrides. */
  material?: GlassMaterialInput;
  /** Selected chip behind the label, as used by a segmented toolbar. */
  selected?: boolean;
  /** Sample the page behind the glass. Turn off for the frost-free flat look. */
  backdrop?: boolean;
  /** Force CSS blur(1.5px) fallback and skip SVG backdrop sampling. */
  forceCssFallback?: boolean;
  /** Extended-range highlight layer; only exceeds white on an HDR display. */
  hdrHighlight?: boolean;
  /** How much of the baked extended-range highlight to apply, 0–1. */
  hdrHighlightStrength?: number;
  /**
   * Pointer bloom. Off by default: the theme button keeps a steady surface, and
   * with the layer gone the component also stops tracking pointer movement.
   * Pass a partial params object to opt back in.
   */
  pointerHighlight?: Partial<GlassPointerHighlightParams> | false;
  /** Dev-only: override the shared engine constants for this instance. */
  engine?: Partial<GlassEngineParams>;
  disabled?: boolean;
  /** Required when the button shows an icon without a label. */
  ariaLabel?: string;
  ariaPressed?: boolean;
  /** Compose the inner control with a Base UI trigger while retaining the glass surface. */
  render?: Button.Props['render'];
  onClick?: () => void;
  className?: string;
}

/**
 * Thin lens: enough bevel to read as glass at toolbar sizes without smearing
 * the label. Values are material overrides on top of the `thin` preset.
 */
const MAC_GLASS_LENS: Partial<GlassMaterialParams> = {
  scale: 0.5,
  depth: 7.5,
  curvature: 1,
  splay: 0.7,
  chroma: 0,
  blur: 0.7,
  // One directional inner rim; no additional all-around Fresnel halo.
  glow: 0,
  edgeHighlight: 1.15,
  // One outer dark rim, following the same smooth contour as the inner light.
  edgeShadow: 0.4,
  highlightCompress: 0,
  specularAngle: 0,
  specular: 3,
  specularDecay: 3,
};

/** All button variants share the stronger lens and shallower bevel. */
const MAC_GLASS_VARIANT_LENS: Partial<GlassMaterialParams> = {
  ...MAC_GLASS_LENS,
  scale: 1.1,
  depth: 7,
};

/** Non-prominent variants keep the shared lens with a lighter edge shadow. */
const MAC_GLASS_NON_PROMINENT_LENS: Partial<GlassMaterialParams> = {
  ...MAC_GLASS_VARIANT_LENS,
  edgeShadow: 0.2,
};

/** Prominent glass gets a wider, softer highlight and a gentler edge profile. */
export const macLiquidGlassButtonProminentEngine: Partial<GlassEngineParams> = {
  rimBrightness: 0.5,
  edgeShadowWidth: 0.5,
  edgeGlowStrength: 0.76,
  edgeGlowSpread: 9,
  edgeWidth: 2,
  backdropContrast: 0.3,
};

/** Shared edge shaping for non-prominent glass in both appearances. */
export const macLiquidGlassButtonNonProminentEngine: Partial<GlassEngineParams> = {
  rimBrightness: 0.5,
  edgeWidth: 1.3,
  edgeGlowStrength: 0.09,
  glareEndFade: 0.7,
};

/** Light non-prominent controls use a narrower, quieter glow. */
export const macLiquidGlassButtonLightEngine: Partial<GlassEngineParams> = {
  ...macLiquidGlassButtonNonProminentEngine,
  edgeGlowStrength: 0.04,
  edgeGlowSpread: 4,
};

/** Non-prominent dark glass: wider rim, restrained bloom and a quieter far side. */
export const macLiquidGlassButtonDarkEngine: Partial<GlassEngineParams> = {
  ...macLiquidGlassButtonNonProminentEngine,
  edgeWidth: 6,
  rimBrightness: 0.18,
  backdropContrast: 0.54,
  glareOppositeFactor: 0.7,
};

/** Light glass: no tint overlay; fill sets the backdrop contrast target and light/shadow colors. */
export const macLiquidGlassButtonLightMaterial: GlassMaterialInput = {
  preset: 'thin',
  ...MAC_GLASS_NON_PROMINENT_LENS,
  edgeHighlight: 0.65,
  tint: 0,
  fill: '#f5f5f5',
};

/** Dark glass: a neutral lens body shared by capsule and icon variants. */
export const macLiquidGlassButtonDarkMaterial: GlassMaterialInput = {
  preset: 'thin',
  ...MAC_GLASS_NON_PROMINENT_LENS,
  tint: 0.3,
  fill: '#9e9e9e',
  specular: 1.3,
};

/** Dark capsule: a lighter neutral lens with a quieter tint than the icon button. */
export const macLiquidGlassButtonCapsuleDarkMaterial: GlassMaterialInput = {
  preset: 'thin',
  ...MAC_GLASS_NON_PROMINENT_LENS,
  tint: 0.3,
  fill: '#9e9e9e',
  specular: 1.3,
};

/**
 * Accent-tinted glass. Stays on the dark material transform so the accent
 * survives; the light transform mixes 88% white into the fill and would wash the blue out.
 */
export const macLiquidGlassButtonProminentMaterial: GlassMaterialInput = {
  preset: 'thin',
  ...MAC_GLASS_VARIANT_LENS,
  edgeHighlight: 1,
  tint: 0.8,
  fill: '#3478f6',
  specular: 3.4,
  specularDecay: 1.4,
};

/** Resolves the default material for a variant in the requested appearance. */
export function macLiquidGlassButtonMaterial(variant: LiquidGlassButtonVariant, appearance: GlassMaterialMode): GlassMaterialInput {
  if (variant === 'prominent') return macLiquidGlassButtonProminentMaterial;
  if (appearance === 'dark') {
    return variant === 'capsule'
      ? macLiquidGlassButtonCapsuleDarkMaterial
      : macLiquidGlassButtonDarkMaterial;
  }
  return macLiquidGlassButtonLightMaterial;
}

/** Resolve the appearance-specific edge defaults for every button composition. */
export function macLiquidGlassButtonEngine(variant: LiquidGlassButtonVariant, appearance: GlassMaterialMode): Partial<GlassEngineParams> {
  if (variant === 'prominent') {
    return appearance === 'dark'
      ? { ...macLiquidGlassButtonProminentEngine, rimBrightness: macLiquidGlassButtonDarkEngine.rimBrightness }
      : macLiquidGlassButtonProminentEngine;
  }
  return appearance === 'dark' ? macLiquidGlassButtonDarkEngine : macLiquidGlassButtonLightEngine;
}

export function LiquidGlassButton({
  children,
  icon,
  variant = 'capsule',
  size = 28,
  appearance = 'light',
  materialMode,
  material,
  selected = false,
  backdrop = true,
  forceCssFallback = false,
  hdrHighlight = true,
  hdrHighlightStrength = 0.8,
  pointerHighlight = false,
  engine,
  disabled = false,
  ariaLabel,
  ariaPressed,
  render,
  onClick,
  className = '',
}: LiquidGlassButtonProps) {
  const prominent = variant === 'prominent';
  const iconOnly = variant === 'icon';
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const iconSize = iconOnly ? Math.max(15, Math.round(size / 2)) : size <= 24 ? 15 : 16;
  const resolvedMaterial = material ?? macLiquidGlassButtonMaterial(variant, appearance);
  const resolvedEngine = {
    ...macLiquidGlassButtonEngine(variant, appearance),
    ...engine,
  };
  const buttonClassName = [
    'mac-liquid-glass-button',
    `mac-liquid-glass-button--${variant}`,
    hovered ? 'mac-liquid-glass-button--hovered' : '',
    pressed ? 'mac-liquid-glass-button--pressed' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <LiquidGlass
      className={buttonClassName}
      width={iconOnly ? size : 'fit-content'}
      height={size}
      borderRadius={size / 2}
      material={resolvedMaterial}
      materialMode={prominent ? 'dark' : materialMode ?? appearance}
      backdrop={backdrop}
      forceCssFallback={forceCssFallback}
      hdrHighlight={hdrHighlight}
      hdrHighlightStrength={hdrHighlightStrength}
      pointerHighlight={pointerHighlight}
      engine={resolvedEngine}
      stateLayer={<>
        <span className="mac-liquid-glass-button-hover" aria-hidden="true" />
        {selected ? <span className="mac-liquid-glass-button-selection" aria-hidden="true" /> : null}
      </>}
    >
      <Button
        render={render}
        className="mac-liquid-glass-button-control"
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        disabled={disabled}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => { setHovered(false); setPressed(false); }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        onClick={onClick}
      >
        {icon ? <SfSymbol name={icon} size={iconSize} /> : null}
        {children ? <span className="mac-liquid-glass-button-label">{children}</span> : null}
      </Button>
    </LiquidGlass>
  );
}
