import './theme.css';
import { macFloatingPanel } from './floatingPanel';

export { SfSymbol } from './symbols';
export { MacWindow } from './MacWindow';
export type { MacWindowProps } from './MacWindow';
export type { SfSymbolProps } from './symbols';
export { MacPopoverArrowShape } from './PopoverArrowShape';
export { LiquidGlassSearch } from './LiquidGlassSearch';
export type { LiquidGlassSearchProps } from './LiquidGlassSearch';
export { LiquidGlassTabs } from './LiquidGlassTabs';
export type { LiquidGlassTabsListProps } from './LiquidGlassTabs';
export { LiquidGlassButtonGroup } from './LiquidGlassButtonGroup';
export type { LiquidGlassButtonGroupProps, LiquidGlassButtonGroupButtonProps } from './LiquidGlassButtonGroup';
export { installMacCorners } from './corners';
export {
  LiquidGlassButton,
  macLiquidGlassButtonMaterial,
  macLiquidGlassButtonEngine,
  macLiquidGlassButtonLightMaterial,
  macLiquidGlassButtonLightEngine,
  macLiquidGlassButtonDarkMaterial,
  macLiquidGlassButtonCapsuleDarkMaterial,
  macLiquidGlassButtonDarkEngine,
  macLiquidGlassButtonNonProminentEngine,
  macLiquidGlassButtonProminentMaterial,
  macLiquidGlassButtonProminentEngine,
} from './LiquidGlassButton';
export type { LiquidGlassButtonProps, LiquidGlassButtonVariant } from './LiquidGlassButton';
export { LiquidGlass, resolveGlassMaterial, useHdrDisplayRange } from '../liquid-glass/liquid-glass';
export type { GlassMaterialInput, GlassMaterialMode, GlassMaterialParams, GlassMaterialName } from '../liquid-glass/liquid-glass';
export { glassEngine, glassPointerHighlight, resolveGlassEngine, resolveGlassPointerHighlight } from '../liquid-glass/refraction/engine';
export type { GlassEngineParams, GlassPointerHighlightParams } from '../liquid-glass/refraction/engine';

/** Class names used on Base UI primitives. Theme styles are in `theme.css`. */
export const mac = {
  window: 'mac-window-frame',
  windowShadowHost: 'mac-window-shadow-host',
  sidebarSurface: 'mac-sidebar-surface',
  toolbarSurface: 'mac-toolbar-surface',
  groupedSurface: 'mac-grouped-surface',
  sidebarRow: 'mac-sidebar-row',
  button: 'mac-button',
  iconButton: 'mac-icon-button',
  iconButtonSurface: 'mac-icon-button-surface',
  iconButtonBorder: 'mac-icon-button-border',
  liquidGlassButton: {
    root: 'mac-liquid-glass-button',
    control: 'mac-liquid-glass-button-control',
    label: 'mac-liquid-glass-button-label',
    selection: 'mac-liquid-glass-button-selection',
  },
  input: 'mac-input',
  inputFrame: 'mac-input-frame',
  inputSurface: 'mac-input-surface',
  inputBorder: 'mac-input-border',
  floatingPanel: macFloatingPanel,
  select: {
    trigger: 'mac-select-trigger',
    icon: 'mac-select-icon',
    positioner: 'mac-positioner mac-select-positioner',
    popup: `${macFloatingPanel.root} mac-popup mac-select-popup`,
    backdrop: `${macFloatingPanel.surface} mac-popup-backdrop`,
    border: `${macFloatingPanel.border} mac-popup-border`,
    scrollArrow: 'mac-select-scroll-arrow',
    list: 'mac-select-list',
    item: 'mac-menu-item mac-select-item',
    itemIndicator: 'mac-select-item-indicator',
    itemText: 'mac-select-item-text',
  },
  switch: { root: 'mac-switch', thumb: 'mac-switch-thumb' },
  checkbox: { root: 'mac-checkbox', surface: 'mac-checkbox-surface', border: 'mac-checkbox-border', indicator: 'mac-checkbox-indicator' },
  radio: { root: 'mac-radio', indicator: 'mac-radio-indicator' },
  tabs: { list: 'mac-segmented', surface: 'mac-segmented-surface', border: 'mac-segmented-border', tab: 'mac-segmented-tab', panel: 'mac-tab-panel' },
  slider: {
    control: 'mac-slider-control',
    track: 'mac-slider-track',
    indicator: 'mac-slider-indicator',
    ticks: 'mac-slider-ticks',
    thumb: 'mac-slider-thumb',
  },
  menu: {
    positioner: 'mac-positioner mac-menu-positioner',
    popup: `${macFloatingPanel.root} mac-popup mac-menu-popup`,
    backdrop: `${macFloatingPanel.surface} mac-popup-backdrop`,
    border: `${macFloatingPanel.border} mac-popup-border`,
    item: 'mac-menu-item',
    submenuTrigger: 'mac-menu-item mac-menu-submenu-trigger',
    submenuArrow: 'mac-menu-submenu-arrow',
  },
  popover: {
    positioner: 'mac-positioner mac-popover-positioner',
    popup: `${macFloatingPanel.root} mac-popover-popup`,
    surface: `${macFloatingPanel.surface} mac-popover-surface`,
    border: `${macFloatingPanel.border} mac-popover-border`,
    arrow: 'mac-popover-arrow',
    content: `${macFloatingPanel.content} mac-popover-content`,
    title: 'mac-popover-title',
    search: 'mac-popover-search',
    tags: 'mac-popover-tags',
    tag: 'mac-popover-tag',
  },
  dialog: {
    backdrop: 'mac-dialog-backdrop',
    viewport: 'mac-dialog-viewport',
    shadowHost: 'mac-dialog-shadow-host',
    popup: 'mac-dialog-popup',
    surface: 'mac-dialog-surface',
    border: 'mac-dialog-border',
    content: 'mac-dialog-content',
    icon: 'mac-dialog-icon',
    title: 'mac-dialog-title',
    description: 'mac-dialog-description',
    actions: 'mac-dialog-actions',
  },
  tooltip: {
    positioner: 'mac-positioner mac-tooltip-positioner',
    popup: 'mac-tooltip-popup',
    surface: 'mac-tooltip-surface',
    border: 'mac-tooltip-border',
    content: 'mac-tooltip-content',
  },
} as const;
