import { useId, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { SfSymbol } from './symbols';
import { LiquidGlassButton } from './LiquidGlassButton';
import { macFloatingPanel } from './floatingPanel';
import type { GlassMaterialMode } from '../liquid-glass/liquid-glass';
import './macWindow.css';

export interface MacWindowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  appearance?: GlassMaterialMode;
  /** Sidebar navigation. Omit it to use a single-pane window. */
  sidebar?: ReactNode;
  sidebarFooter?: ReactNode;
  /** Leading controls, typically back/forward navigation. */
  navigation?: ReactNode;
  /** Trailing controls in a single scrolling row. Compose with LiquidGlassButton / LiquidGlassTabs. */
  toolbar?: ReactNode;
  statusBar?: ReactNode;
  sidebarWidth?: number;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  /** Fade scrolling content out as it reaches the toolbar and window controls. */
  fadingEdge?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onZoom?: () => void;
}

/** Application shell only: navigation, content, and window actions remain consumer-owned. */
export function MacWindow({
  title, appearance = 'light', sidebar, sidebarFooter, navigation, toolbar, statusBar,
  sidebarWidth = 220, sidebarOpen = true, onSidebarOpenChange,
  fadingEdge = true, onClose, onMinimize, onZoom,
  className = '', style, children, ...props
}: MacWindowProps) {
  const titleId = useId();
  const sidebarId = useId();
  const hasSidebar = sidebar != null;
  return <div
    {...props}
    className={`mac-window-template ${className}`.trim()}
    data-sidebar-open={hasSidebar && sidebarOpen || undefined}
    data-fading-edge={fadingEdge || undefined}
    style={{ '--mac-window-sidebar-width': `${Math.max(150, sidebarWidth)}px`, ...style } as CSSProperties}
    role={props.role ?? 'region'}
    aria-labelledby={props['aria-label'] ? undefined : props['aria-labelledby'] ?? titleId}
  >
    <div className="mac-window-template-frame">
      <div className="mac-window-traffic-lights" role="group" aria-label="窗口控制">
        <button type="button" className="mac-window-close" aria-label="关闭窗口" disabled={!onClose} onClick={onClose}><SfSymbol name="xmark" size={8} /></button>
        <button type="button" className="mac-window-minimize" aria-label="最小化窗口" disabled={!onMinimize} onClick={onMinimize}><SfSymbol name="minus" size={8} /></button>
        <button type="button" className="mac-window-zoom" aria-label="缩放窗口" disabled={!onZoom} onClick={onZoom}><SfSymbol name="arrow.up.left.and.arrow.down.right" size={8} /></button>
      </div>
      {hasSidebar && <aside id={sidebarId} className="mac-window-sidebar" aria-label="窗口侧边栏" hidden={!sidebarOpen}>
        <div className="mac-window-sidebar-scroll">{sidebar}</div>
        {sidebarFooter && <footer className="mac-window-sidebar-footer">{sidebarFooter}</footer>}
      </aside>}
      <div className="mac-window-workspace">
        <header className="mac-window-toolbar">
          <div className="mac-window-toolbar-controls">
            <div className="mac-window-toolbar-leading">
              {hasSidebar && onSidebarOpenChange && <LiquidGlassButton variant="icon" size={38} appearance={appearance} icon="sidebar.left" ariaLabel={sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'} render={<button aria-expanded={sidebarOpen} aria-controls={sidebarId} />} onClick={() => onSidebarOpenChange(!sidebarOpen)} />}
              {navigation}
              <h2 id={titleId} className="mac-window-title">{title}</h2>
            </div>
            {toolbar && <div className="mac-window-toolbar-actions" role="group" aria-label="窗口工具栏">{toolbar}</div>}
          </div>
        </header>
        <div className="mac-window-content" tabIndex={0} role="region" aria-label="窗口内容">{children}</div>
        {statusBar && <footer className="mac-window-status-bar">{statusBar}</footer>}
      </div>
    </div>
    <div className={`mac-window-template-edge ${macFloatingPanel.surface}`} aria-hidden="true" />
    <div className={`mac-window-template-border ${macFloatingPanel.border}`} aria-hidden="true" />
  </div>;
}
