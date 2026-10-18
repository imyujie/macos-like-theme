import { useRef, useState } from 'react';
import { Menu } from '@base-ui/react/menu';
import { LiquidGlassButton, LiquidGlassButtonGroup, LiquidGlassSearch, MacWindow, SfSymbol, mac, type GlassMaterialMode } from './theme';
import './windowDemo.css';

const favorites = [
  { name: 'Applications', icon: 'app.badge' },
  { name: 'Desktop', icon: 'menubar.dock.rectangle' },
  { name: 'Documents', icon: 'doc' },
  { name: 'Preview', icon: 'folder' },
  { name: 'Downloads', icon: 'arrow.down.circle' },
  { name: 'Develop', icon: 'folder' },
];
const locations = [
  { name: 'iCloud Drive', icon: 'icloud' },
  { name: 'liyujie', icon: 'house' },
  { name: 'AirDrop', icon: 'dot.radiowaves.left.and.right' },
  { name: 'Network', icon: 'network' },
  { name: 'Trash', icon: 'trash' },
];
const homeFolders = ['Applications', 'Desktop', 'Develop', 'Documents', 'Downloads', 'Movies', 'Music', 'Pictures', 'ai_completion', 'Obsidian', 'tmp', 'ui-agent', 'bin'];
const directoryFolders: Record<string, string[]> = {
  Applications: ['Design', 'Developer Tools', 'Utilities'],
  Desktop: ['Screenshots', 'Projects', 'Archive'],
  Documents: ['Work', 'Personal', 'Notes', 'Templates'],
  Preview: ['Images', 'PDFs', 'Exports'],
  Downloads: ['Images', 'Installers', 'Documents'],
  Develop: ['macos-like-theme', 'ai_completion', 'ui-agent', 'Experiments', 'Archive'],
  'iCloud Drive': ['Desktop', 'Documents', 'Shared'],
  AirDrop: [], Network: [], Trash: [],
};

export function WindowDemo({ appearance, fadingEdge = true, onAction }: { appearance: GlassMaterialMode; fadingEdge?: boolean; onAction: (message: string) => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [history, setHistory] = useState(['liyujie']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<'original' | 'name'>('original');
  const [extraFolders, setExtraFolders] = useState<Record<string, string[]>>({});
  const [windowState, setWindowState] = useState<'open' | 'minimized' | 'closed'>('open');
  const [zoomed, setZoomed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = history[historyIndex];
  const folders = [...(current === 'liyujie' ? homeFolders : directoryFolders[current] ?? []), ...(extraFolders[current] ?? [])];
  const visible = folders.filter(name => name.toLowerCase().includes(query.toLowerCase()));
  if (sort === 'name') visible.sort((a, b) => a.localeCompare(b));
  const navigate = (name: string) => {
    if (name === current) return;
    setHistory([...history.slice(0, historyIndex + 1), name]);
    setHistoryIndex(historyIndex + 1);
    setSelected(''); setQuery('');
  };
  const stepHistory = (delta: number) => { setHistoryIndex(historyIndex + delta); setSelected(''); setQuery(''); };
  const addFolder = () => {
    const existing = new Set(folders);
    let name = 'Untitled Folder';
    let index = 2;
    while (existing.has(name)) name = `Untitled Folder ${index++}`;
    setExtraFolders({ ...extraFolders, [current]: [...(extraFolders[current] ?? []), name] });
    setQuery(''); setSelected(name);
  };
  const renderSidebarGroup = (title: string, items: typeof favorites, neutral = false) => <section className="mac-window-sidebar-group" aria-label={title}>
    <h3>{title}</h3>
    <nav aria-label={title}>{items.map(item => <button key={item.name} type="button" className="mac-window-sidebar-item" data-neutral={neutral || undefined} aria-current={current === item.name ? 'page' : undefined} onClick={() => navigate(item.name)}><SfSymbol name={item.icon} size={19} /><span>{item.name}</span></button>)}</nav>
  </section>;

  if (windowState !== 'open') return <div className="window-demo-restoration">
    <SfSymbol name="macwindow" size={42} /><p>{windowState === 'minimized' ? '窗口已最小化' : '窗口已关闭'}</p>
    <button type="button" className={mac.button} onClick={() => setWindowState('open')}>重新打开窗口</button>
  </div>;

  return <MacWindow className={`window-demo ${zoomed ? 'window-demo--zoomed' : ''}`} title={current} appearance={appearance}
    sidebar={<>{renderSidebarGroup('Favorites', favorites)}{renderSidebarGroup('Locations', locations, true)}</>}
    sidebarWidth={206} sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen}
    fadingEdge={fadingEdge}
    onClose={() => setWindowState('closed')} onMinimize={() => setWindowState('minimized')} onZoom={() => setZoomed(!zoomed)}
    navigation={<LiquidGlassButtonGroup.Root appearance={appearance} size={38} ariaLabel="目录历史">
      <LiquidGlassButtonGroup.Button icon="chevron.left" aria-label="后退" disabled={historyIndex === 0} onClick={() => stepHistory(-1)} />
      <LiquidGlassButtonGroup.Button icon="chevron.right" aria-label="前进" disabled={historyIndex === history.length - 1} onClick={() => stepHistory(1)} />
    </LiquidGlassButtonGroup.Root>}
    toolbar={<>
      <div className="window-demo-tool-group" role="group" aria-label="显示方式">
        <LiquidGlassButton appearance={appearance} variant="icon" size={38} icon="square.grid.2x2" ariaLabel="图标视图" ariaPressed={view === 'grid'} selected={view === 'grid'} onClick={() => setView('grid')} />
        <LiquidGlassButton appearance={appearance} variant="icon" size={38} icon="list.bullet" ariaLabel="列表视图" ariaPressed={view === 'list'} selected={view === 'list'} onClick={() => setView('list')} />
      </div>
      <Menu.Root>
        <LiquidGlassButton render={<Menu.Trigger />} appearance={appearance} variant="icon" size={38} icon="ellipsis" ariaLabel="更多操作" />
        <Menu.Portal><Menu.Positioner className={mac.menu.positioner} align="end" sideOffset={6}><Menu.Popup className={mac.menu.popup}>
          <div className={mac.menu.backdrop} aria-hidden="true" /><div className={mac.menu.border} aria-hidden="true" />
          <Menu.Item className={mac.menu.item} onClick={addFolder}><SfSymbol name="folder.badge.plus" size={16} />新建文件夹</Menu.Item>
          <Menu.Item className={mac.menu.item} onClick={() => setSort(sort === 'name' ? 'original' : 'name')}><SfSymbol name="list.bullet" size={16} />{sort === 'name' ? '恢复原始顺序' : '按名称排序'}</Menu.Item>
          <Menu.Separator className="mac-menu-separator" />
          <Menu.Item className={mac.menu.item} onClick={() => onAction(`${current} · ${folders.length} 个项目`)}><SfSymbol name="info.circle" size={16} />显示简介</Menu.Item>
        </Menu.Popup></Menu.Positioner></Menu.Portal>
      </Menu.Root>
      <LiquidGlassButton appearance={appearance} variant="icon" size={38} icon="magnifyingglass" ariaLabel="搜索文件夹" onClick={() => { setSearchOpen(!searchOpen); setQuery(''); if (!searchOpen) requestAnimationFrame(() => searchRef.current?.focus()); }} />
    </>}
    statusBar={<><span>{selected && visible.includes(selected) ? `已选择「${selected}」 · ` : ''}{query ? `${visible.length} / ${folders.length}` : folders.length} 个项目</span></>}
  >
    {searchOpen && <div className="window-demo-search"><LiquidGlassSearch ref={searchRef} size={34} appearance={appearance} value={query} onValueChange={value => { setQuery(value); setSelected(''); }} placeholder={`搜索 ${current}`} aria-label="搜索当前目录" /></div>}
    {view === 'list' && visible.length > 0 && <div className="window-demo-list-heading"><span>名称</span><span>种类</span></div>}
    {visible.length > 0 ? <div className={`window-demo-files window-demo-files--${view}`} role="group" aria-label={`${current} 中的文件夹`}>
      {visible.map(name => <button type="button" className="window-demo-file" key={name} aria-pressed={selected === name} onClick={() => setSelected(name)} onDoubleClick={() => navigate(name)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); navigate(name); } }}>
        <img className="window-demo-folder" src={`${import.meta.env.BASE_URL}macos-icons/folder.png`} width={80} height={80} alt="" draggable={false} />
        <span className="window-demo-file-name">{name}</span>{view === 'list' && <small>文件夹</small>}
      </button>)}
    </div> : <div className="window-demo-empty"><SfSymbol name={query ? 'magnifyingglass' : 'folder'} size={42} /><strong>{query ? '没有匹配的文件夹' : '此文件夹为空'}</strong><span>{query ? '试试其他名称，或清除搜索。' : '可以在工具栏的更多菜单中新建文件夹。'}</span>{query && <button type="button" className={mac.button} onClick={() => setQuery('')}>清除搜索</button>}</div>}
  </MacWindow>;
}
