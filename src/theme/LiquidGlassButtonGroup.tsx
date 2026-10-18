import { createContext, forwardRef, useContext, type CSSProperties, type ReactNode } from 'react';
import { Button } from '@base-ui/react/button';
import { LiquidGlass } from '../liquid-glass/liquid-glass';
import {
  macLiquidGlassButtonEngine,
  macLiquidGlassButtonMaterial,
  type LiquidGlassButtonProps,
} from './LiquidGlassButton';
import { SfSymbol } from './symbols';

export interface LiquidGlassButtonGroupProps extends Pick<LiquidGlassButtonProps,
  'appearance' | 'materialMode' | 'material' | 'backdrop' | 'forceCssFallback' |
  'hdrHighlight' | 'hdrHighlightStrength' | 'pointerHighlight' | 'engine'> {
  children: ReactNode;
  /** Accessible name for the related actions. */
  ariaLabel: string;
  /** Shared height; icon buttons are square within the capsule. */
  size?: number;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export interface LiquidGlassButtonGroupButtonProps extends Omit<Button.Props, 'children' | 'className'> {
  children?: ReactNode;
  icon?: string;
  className?: string;
}

const GroupContext = createContext<{ size: number; disabled: boolean } | null>(null);

function LiquidGlassButtonGroupRoot({
  children, ariaLabel, size = 40, appearance = 'light', materialMode, material,
  backdrop = true, forceCssFallback = false, hdrHighlight = true,
  hdrHighlightStrength = 0.8, pointerHighlight = false, engine,
  disabled = false, className = '', style,
}: LiquidGlassButtonGroupProps) {
  const height = Math.max(24, size);
  return <GroupContext.Provider value={{ size: height, disabled }}>
    <LiquidGlass
      className={`mac-liquid-glass-button-group ${className}`.trim()}
      width="fit-content"
      height={height}
      borderRadius={height / 2}
      material={material ?? macLiquidGlassButtonMaterial('capsule', appearance)}
      materialMode={materialMode ?? appearance}
      backdrop={backdrop}
      forceCssFallback={forceCssFallback}
      hdrHighlight={hdrHighlight}
      hdrHighlightStrength={hdrHighlightStrength}
      pointerHighlight={pointerHighlight}
      engine={{ ...macLiquidGlassButtonEngine('capsule', appearance), ...engine }}
      style={{ '--mac-glass-button-group-size': `${height}px`, ...style } as CSSProperties}
    >
      <div className="mac-liquid-glass-button-group-controls" role="group" aria-label={ariaLabel} aria-disabled={disabled || undefined}>
        {children}
      </div>
    </LiquidGlass>
  </GroupContext.Provider>;
}

const LiquidGlassButtonGroupButton = forwardRef<HTMLButtonElement, LiquidGlassButtonGroupButtonProps>(function LiquidGlassButtonGroupButton({
  children, icon, disabled = false, className = '', ...props
}, ref) {
  const group = useContext(GroupContext);
  if (!group) throw new Error('LiquidGlassButtonGroup.Button must be inside LiquidGlassButtonGroup.Root');
  return <Button
    {...props}
    ref={ref}
    disabled={group.disabled || disabled}
    className={`mac-liquid-glass-button-group-button ${className}`.trim()}
    data-icon-only={children == null || undefined}
  >
    {icon && <SfSymbol name={icon} size={Math.max(15, Math.round(group.size / 2))} />}
    {children}
  </Button>;
});

/** Related actions share one glass capsule, with inset separators between buttons. */
export const LiquidGlassButtonGroup = {
  Root: LiquidGlassButtonGroupRoot,
  Button: LiquidGlassButtonGroupButton,
};
