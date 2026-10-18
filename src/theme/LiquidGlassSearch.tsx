import { forwardRef, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { Input } from '@base-ui/react/input';
import { Button } from '@base-ui/react/button';
import { LiquidGlass, type GlassMaterialInput, type GlassMaterialMode } from '../liquid-glass/liquid-glass';
import type { GlassEngineParams } from '../liquid-glass/refraction/engine';
import { macLiquidGlassButtonMaterial, macLiquidGlassButtonDarkEngine, macLiquidGlassButtonNonProminentEngine } from './LiquidGlassButton';
import { SfSymbol } from './symbols';

export interface LiquidGlassSearchProps extends Omit<Input.Props, 'type' | 'size' | 'value' | 'defaultValue' | 'onValueChange' | 'className' | 'style' | 'render' | 'ref'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Enter submits the current query, except during IME composition. */
  onSearch?: (value: string) => void;
  size?: number;
  appearance?: GlassMaterialMode;
  clearable?: boolean;
  clearLabel?: string;
  material?: GlassMaterialInput;
  engine?: Partial<GlassEngineParams>;
  forceCssFallback?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** A capsule search field with refracted glass behind sharp, editable content. */
export const LiquidGlassSearch = forwardRef<HTMLInputElement, LiquidGlassSearchProps>(function LiquidGlassSearch({
  value,
  defaultValue = '',
  onValueChange,
  onSearch,
  size = 40,
  appearance = 'light',
  clearable = true,
  clearLabel = '清除搜索',
  material,
  engine,
  forceCssFallback = false,
  className = '',
  style,
  placeholder = 'Search',
  disabled = false,
  readOnly = false,
  onKeyDown,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...inputProps
}, forwardedRef) {
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  const [localValue, setLocalValue] = useState(defaultValue);
  const query = value ?? localValue;
  const height = Math.max(28, size);
  const iconSize = Math.round(height * 0.45);
  const updateValue = (next: string) => {
    if (value === undefined) setLocalValue(next);
    onValueChange?.(next);
  };
  const clear = () => {
    updateValue('');
    inputRef.current?.focus();
  };
  const baseMaterial = macLiquidGlassButtonMaterial('capsule', appearance);
  const searchMaterial: GlassMaterialInput = {
    ...(typeof baseMaterial === 'string' ? { preset: baseMaterial } : baseMaterial),
    blur: 4,
    scale: 0.7,
    edgeShadow: 0.12,
    specular: appearance === 'dark' ? 1.1 : 1.7,
  };

  return <LiquidGlass
    className={`mac-liquid-glass-search ${className}`.trim()}
    width="100%"
    height={height}
    borderRadius={height / 2}
    material={material ?? searchMaterial}
    materialMode={appearance}
    pointerHighlight={false}
    forceCssFallback={forceCssFallback}
    engine={{ ...(appearance === 'dark' ? macLiquidGlassButtonDarkEngine : macLiquidGlassButtonNonProminentEngine), edgeGlowSpread: 2, ...engine }}
    style={{ ...style, '--mac-glass-search-font-size': `${Math.round(height * 0.375)}px`, '--mac-glass-search-padding': `${Math.round(height * 0.4)}px` } as CSSProperties}
  >
    <div className="mac-liquid-glass-search-control" data-disabled={disabled || undefined}>
      <SfSymbol name="magnifyingglass" size={iconSize} />
      <Input
        {...inputProps}
        ref={inputRef}
        className="mac-liquid-glass-search-input"
        type="search"
        value={query}
        onValueChange={updateValue}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : '搜索')}
        aria-labelledby={ariaLabelledBy}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') onSearch?.(query);
          if (event.key === 'Escape' && query && clearable && !readOnly) {
            event.preventDefault();
            clear();
          }
        }}
      />
      {clearable && <Button
        className="mac-liquid-glass-search-clear"
        type="button"
        aria-label={clearLabel}
        hidden={!query || disabled || readOnly}
        onMouseDown={(event) => event.preventDefault()}
        onClick={clear}
      ><SfSymbol name="xmark" size={Math.max(9, Math.round(iconSize * 0.55))} /></Button>}
    </div>
  </LiquidGlass>;
});
