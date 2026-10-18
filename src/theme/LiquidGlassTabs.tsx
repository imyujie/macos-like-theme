import { forwardRef, type CSSProperties } from 'react';
import { Tabs } from '@base-ui/react/tabs';
import { LiquidGlass, type GlassMaterialInput, type GlassMaterialMode } from '../liquid-glass/liquid-glass';
import type { GlassEngineParams } from '../liquid-glass/refraction/engine';
import { macLiquidGlassButtonMaterial, macLiquidGlassButtonDarkEngine, macLiquidGlassButtonNonProminentEngine } from './LiquidGlassButton';

export interface LiquidGlassTabsListProps extends Omit<Tabs.List.Props, 'className' | 'style'> {
  /** Height of the horizontal segmented control, in CSS pixels. */
  size?: number;
  appearance?: GlassMaterialMode;
  fullWidth?: boolean;
  material?: GlassMaterialInput;
  engine?: Partial<GlassEngineParams>;
  forceCssFallback?: boolean;
  /** Classes and styles apply to the tab list inside the glass. */
  className?: string;
  style?: CSSProperties;
}

const LiquidGlassTabsList = forwardRef<HTMLDivElement, LiquidGlassTabsListProps>(function LiquidGlassTabsList({
  size = 40,
  appearance = 'light',
  fullWidth = false,
  material,
  engine,
  forceCssFallback = false,
  className = '',
  style,
  children,
  activateOnFocus = true,
  ...listProps
}, ref) {
  const height = Math.max(28, size);
  return <LiquidGlass
    className="mac-liquid-glass-tabs"
    width={fullWidth ? '100%' : 'fit-content'}
    height={height}
    borderRadius={height / 2}
    material={material ?? macLiquidGlassButtonMaterial('capsule', appearance)}
    materialMode={appearance}
    pointerHighlight={false}
    hdrHighlight
    hdrHighlightStrength={0.8}
    forceCssFallback={forceCssFallback}
    engine={{ ...(appearance === 'dark' ? macLiquidGlassButtonDarkEngine : macLiquidGlassButtonNonProminentEngine), edgeGlowSpread: 2, ...engine }}
    style={{
      maxWidth: '100%',
      '--mac-glass-tabs-size': `${height}px`,
      '--mac-glass-tabs-inset': `${Math.round(height * 0.11)}px`,
      '--mac-glass-tabs-font-size': `${Math.round(height * 0.375)}px`,
    } as CSSProperties}
  >
    <Tabs.List
      {...listProps}
      ref={ref}
      className={`mac-liquid-glass-tabs-list ${className}`.trim()}
      style={style}
      activateOnFocus={activateOnFocus}
    >
      {children}
      <Tabs.Indicator className="mac-liquid-glass-tabs-indicator" />
    </Tabs.List>
  </LiquidGlass>;
});

/** Base UI tabs with a refracted capsule and a sliding, neutral selection pill. */
export const LiquidGlassTabs = {
  Root: Tabs.Root,
  List: LiquidGlassTabsList,
  Tab: Tabs.Tab,
  Panel: Tabs.Panel,
};
