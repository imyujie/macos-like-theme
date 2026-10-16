import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@base-ui/react/button';
import { Checkbox } from '@base-ui/react/checkbox';
import { Dialog } from '@base-ui/react/dialog';
import { Input } from '@base-ui/react/input';
import { Menu } from '@base-ui/react/menu';
import { Popover } from '@base-ui/react/popover';
import { Radio } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import { Select } from '@base-ui/react/select';
import { Slider } from '@base-ui/react/slider';
import { Switch } from '@base-ui/react/switch';
import { Tabs } from '@base-ui/react/tabs';
import { Tooltip } from '@base-ui/react/tooltip';
import { componentCatalog, componentGroups, type ComponentDoc, type ComponentId } from './componentCatalog';
import { mac, MacPopoverArrowShape, SfSymbol } from './theme';
import './componentDocs.css';

type Appearance = 'light' | 'dark';
type Props = {
  selectedId: ComponentId;
  appearance: Appearance;
  onAppearanceChange: (appearance: Appearance) => void;
  onAction: (message: string) => void;
};

const shortOptions = [
  { label: '最近使用', value: 'recent' },
  { label: '名称', value: 'name' },
  { label: '创建日期', value: 'created' },
];

const longOptions = [
  'Use System Language', 'Arabic', 'Assamese', 'Bangla', 'Bodo', 'Bulgarian',
  'Cantonese', 'Catalan', 'Croatian', 'Czech', 'Danish', 'Dogri', 'Dutch',
  'English', 'Finnish', 'French', 'German', 'Japanese', 'Spanish',
].map((label, index) => ({ label, value: index === 0 ? 'system' : label.toLowerCase() }));

const tagOptions = [
  { label: '蓝色', color: '#3478f6' },
  { label: '紫色', color: '#af52de' },
  { label: 'Red', color: '#ff453a' },
  { label: '黄色', color: '#ffcc00' },
  { label: 'Gray', color: '#989ba1' },
  { label: '工作', color: null },
  { label: '橙色', color: '#ff9f0a' },
  { label: 'Home', color: null },
];

function InputFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`${mac.inputFrame} ${className}`.trim()}>
    <span className={mac.inputSurface} aria-hidden="true" />
    {children}
    <span className={mac.inputBorder} aria-hidden="true" />
  </span>;
}

function IconButtonLayers() {
  return <>
    <span className={mac.iconButtonSurface} aria-hidden="true" />
    <span className={mac.iconButtonBorder} aria-hidden="true" />
  </>;
}

function TooltipBody({ children }: { children: ReactNode }) {
  return <>
    <span className={mac.tooltip.surface} aria-hidden="true" />
    <span className={mac.tooltip.border} aria-hidden="true" />
    <span className={mac.tooltip.content}>{children}</span>
  </>;
}

function ToggleControl({ label, checked, onCheckedChange, description }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void; description?: string }) {
  return (
    <div className="docs-control-row">
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <Switch.Root className={mac.switch.root} checked={checked} onCheckedChange={onCheckedChange} aria-label={label}>
        <Switch.Thumb className={mac.switch.thumb} />
      </Switch.Root>
    </div>
  );
}

function TextControl({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="docs-control-input">
      <span>{label}</span>
      <InputFrame><Input className={mac.input} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></InputFrame>
    </label>
  );
}

function SelectDemo({ options, label, value, onValueChange, disabled }: { options: typeof shortOptions; label: string; value: string; onValueChange: (value: string) => void; disabled: boolean }) {
  return (
    <Select.Root items={options} value={value} onValueChange={(next) => { if (next) onValueChange(next); }} disabled={disabled}>
      <Select.Label className="docs-select-label">{label}</Select.Label>
      <Select.Trigger className={mac.select.trigger}>
        <Select.Value />
        <Select.Icon className={mac.select.icon}><SfSymbol name="chevron.up.chevron.down" size={13} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className={mac.select.positioner} sideOffset={5}>
          <Select.Popup className={mac.select.popup}>
            <div className={mac.select.backdrop} aria-hidden="true" />
            <div className={mac.select.border} aria-hidden="true" />
            <Select.ScrollUpArrow keepMounted className={mac.select.scrollArrow}><SfSymbol name="chevron.down" size={10} /></Select.ScrollUpArrow>
            <Select.List className={mac.select.list}>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className={mac.select.item}>
                  <Select.ItemIndicator className={mac.select.itemIndicator}><SfSymbol name="checkmark" size={12} /></Select.ItemIndicator>
                  <Select.ItemText className={mac.select.itemText}>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
            <Select.ScrollDownArrow keepMounted className={mac.select.scrollArrow}><SfSymbol name="chevron.down" size={10} /></Select.ScrollDownArrow>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

function Playground({ doc, onAction }: { doc: ComponentDoc; onAction: (message: string) => void }) {
  const [variant, setVariant] = useState(doc.variants[0].value);
  const [disabled, setDisabled] = useState(false);
  const [label, setLabel] = useState('继续');
  const [inputValue, setInputValue] = useState('');
  const [placeholder, setPlaceholder] = useState('输入内容…');
  const [checked, setChecked] = useState(true);
  const [selectValue, setSelectValue] = useState('recent');
  const [radioValue, setRadioValue] = useState('comfortable');
  const [tabValue, setTabValue] = useState('overview');
  const [sliderValue, setSliderValue] = useState(72);
  const [open, setOpen] = useState(false);
  const [tooltipText, setTooltipText] = useState('Show items as icons, in a list, in columns, or in a gallery');
  const [popoverTitle, setPopoverTitle] = useState('Assign tags to “Shadowrocket”');
  const [tagQuery, setTagQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [secondTabDisabled, setSecondTabDisabled] = useState(false);
  const [modal, setModal] = useState(doc.id === 'dialog');
  const [dismissOnOutside, setDismissOnOutside] = useState(true);
  const selectedVariant = doc.variants.find((item) => item.value === variant) ?? doc.variants[0];
  const isLongSelect = doc.id === 'select' && variant === 'long';
  const sliderMax = variant === 'fine' ? 10 : 100;
  const visibleTags = tagOptions.filter((tag) => tag.label.toLocaleLowerCase().includes(tagQuery.trim().toLocaleLowerCase()));

  function chooseVariant(next: string) {
    setVariant(next);
    if (doc.id === 'select') setSelectValue(next === 'long' ? 'system' : 'recent');
    if (doc.id === 'switch') setChecked(next === 'on');
    if (doc.id === 'checkbox') setChecked(next === 'checked');
    if (doc.id === 'radio') setRadioValue(next);
    if (doc.id === 'tabs') setTabValue(next);
    if (doc.id === 'slider') setSliderValue(next === 'fine' ? 7 : 72);
    if (doc.id === 'menu' || doc.id === 'popover' || doc.id === 'tooltip') setOpen(false);
  }

  function renderPreview() {
    switch (doc.id) {
      case 'button':
        return <Button className={mac.button} data-variant={variant} disabled={disabled} onClick={() => onAction(`点击了 ${selectedVariant.name} 按钮`)}>{label || '按钮'}</Button>;
      case 'icon-button':
        return (
          <Tooltip.Root>
            <Tooltip.Trigger render={<Button className={mac.iconButton} data-variant={variant === 'glass' ? 'glass' : undefined} aria-label="分享" disabled={disabled} onClick={() => onAction('点击了图标按钮')} />}>
              <IconButtonLayers /><SfSymbol name="square.and.arrow.up" size={17} />
            </Tooltip.Trigger>
            <Tooltip.Portal><Tooltip.Positioner className={mac.tooltip.positioner} sideOffset={8}><Tooltip.Popup className={mac.tooltip.popup}><TooltipBody>分享</TooltipBody></Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal>
          </Tooltip.Root>
        );
      case 'input':
        return <label className="docs-input-demo"><span>显示名称</span><InputFrame><Input className={mac.input} type={variant} value={inputValue} onChange={(event) => setInputValue(event.target.value)} placeholder={placeholder} disabled={disabled} /></InputFrame></label>;
      case 'select':
        return <div className="docs-select-demo"><SelectDemo options={isLongSelect ? longOptions : shortOptions} label={isLongSelect ? '系统语音语言' : '排序方式'} value={selectValue} onValueChange={setSelectValue} disabled={disabled} /></div>;
      case 'switch':
        return <label className="docs-inline-demo"><span>自动保存</span><Switch.Root className={mac.switch.root} checked={checked} onCheckedChange={(next) => { setChecked(next); setVariant(next ? 'on' : 'off'); }} disabled={disabled}><Switch.Thumb className={mac.switch.thumb} /></Switch.Root></label>;
      case 'checkbox':
        return <label className="docs-inline-demo"><Checkbox.Root className={mac.checkbox.root} checked={checked} indeterminate={variant === 'mixed'} onCheckedChange={(next) => { setChecked(next); setVariant(next ? 'checked' : 'unchecked'); }} disabled={disabled}><span className={mac.checkbox.surface} aria-hidden="true" /><span className={mac.checkbox.border} aria-hidden="true" /><Checkbox.Indicator className={mac.checkbox.indicator}><SfSymbol name="checkmark" size={13} weight="bold" /></Checkbox.Indicator></Checkbox.Root><span>显示文件扩展名</span></label>;
      case 'radio':
        return <RadioGroup className="docs-radio-demo" value={radioValue} onValueChange={(next) => { setRadioValue(next); setVariant(next); }} disabled={disabled} aria-label="列表密度">
          {[['comfortable', '舒适'], ['compact', '紧凑']].map(([value, text]) => <label key={value} className="docs-inline-demo"><Radio.Root className={mac.radio.root} value={value}><Radio.Indicator className={mac.radio.indicator} /></Radio.Root>{text}</label>)}
        </RadioGroup>;
      case 'tabs':
        return <Tabs.Root value={tabValue} onValueChange={(next) => { setTabValue(String(next)); setVariant(String(next)); }}>
          <Tabs.List className={mac.tabs.list} aria-label="内容视图">
            <span className={mac.tabs.surface} aria-hidden="true" />
            <span className={mac.tabs.border} aria-hidden="true" />
            <Tabs.Tab className={mac.tabs.tab} value="overview">概览</Tabs.Tab>
            <Tabs.Tab className={mac.tabs.tab} value="details" disabled={secondTabDisabled}>详情</Tabs.Tab>
            <Tabs.Tab className={mac.tabs.tab} value="activity">活动</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel className="docs-tab-panel" value="overview">概览面板的内容</Tabs.Panel>
          <Tabs.Panel className="docs-tab-panel" value="details">详情面板的内容</Tabs.Panel>
          <Tabs.Panel className="docs-tab-panel" value="activity">活动面板的内容</Tabs.Panel>
        </Tabs.Root>;
      case 'slider':
        return <div className="docs-slider-demo"><SfSymbol name="speaker.fill" size={16} /><Slider.Root className="docs-slider-root" value={sliderValue} onValueChange={setSliderValue} min={0} max={sliderMax} step={1} disabled={disabled}>
          <Slider.Label className="sr-only">提示音音量</Slider.Label>
          <Slider.Control className={mac.slider.control}><Slider.Track className={mac.slider.track}><Slider.Indicator className={mac.slider.indicator} /><span className={mac.slider.ticks} aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</span><Slider.Thumb className={mac.slider.thumb} /></Slider.Track></Slider.Control>
        </Slider.Root><SfSymbol name="speaker.wave.3.fill" size={19} /><output>{sliderValue}</output></div>;
      case 'menu':
        return <Menu.Root open={open} onOpenChange={setOpen} disabled={disabled}>
          <Menu.Trigger className={mac.button}>操作菜单 <SfSymbol name="chevron.down" size={11} /></Menu.Trigger>
          <Menu.Portal><Menu.Positioner className={mac.menu.positioner} sideOffset={6}><Menu.Popup className={mac.menu.popup}>
            <div className={mac.menu.backdrop} aria-hidden="true" /><div className={mac.menu.border} aria-hidden="true" />
            <Menu.Item className={mac.menu.item} onClick={() => onAction('已复制链接')}><SfSymbol name="square.and.arrow.up" size={15} />复制链接</Menu.Item>
            <Menu.Item className={mac.menu.item} onClick={() => onAction('已刷新预览')}><SfSymbol name="arrow.clockwise" size={15} />刷新预览</Menu.Item>
            {variant === 'separator' && <><Menu.Separator className="mac-menu-separator" /><Menu.Item className={mac.menu.item} onClick={() => onAction('已选择移到废纸篓')}><SfSymbol name="trash" size={15} />移到废纸篓</Menu.Item></>}
          </Menu.Popup></Menu.Positioner></Menu.Portal>
        </Menu.Root>;
      case 'popover':
        return <div className="docs-popover-demo">
          <Popover.Root open={open} onOpenChange={setOpen} modal={modal}>
            <Popover.Trigger className="docs-popover-file" disabled={disabled} aria-label="为 Shadowrocket 分配标签">
              <SfSymbol name="folder.fill" size={62} />
              <span className="docs-popover-file-badge"><SfSymbol name="tag" size={14} /></span>
              <span className="docs-popover-file-name">Shadowrocket</span>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner className={mac.popover.positioner} side={variant === 'above' ? 'top' : 'bottom'} sideOffset={12} align="center">
                <Popover.Popup className={mac.popover.popup} initialFocus={false}>
                  <span className={mac.popover.surface} aria-hidden="true" />
                  <span className={mac.popover.border} aria-hidden="true" />
                  <Popover.Arrow className={mac.popover.arrow}><MacPopoverArrowShape /></Popover.Arrow>
                  <div className={mac.popover.content}>
                    <Popover.Title className={mac.popover.title}>{popoverTitle || 'Assign tags'}</Popover.Title>
                    <InputFrame className={mac.popover.search}><Input className={mac.input} aria-label="搜索标签" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} /></InputFrame>
                    <div className={mac.popover.tags} aria-label="可用标签">
                      {visibleTags.map((tag) => <button className={mac.popover.tag} key={tag.label} type="button" data-selected={selectedTag === tag.label || undefined} aria-pressed={selectedTag === tag.label} onClick={() => setSelectedTag(selectedTag === tag.label ? '' : tag.label)}>
                        <span className="mac-popover-tag-dot" data-empty={!tag.color || undefined} style={tag.color ? { backgroundColor: tag.color, borderColor: tag.color } : undefined} aria-hidden="true" />
                        {tag.label}
                      </button>)}
                      {!tagQuery && <button className={`${mac.popover.tag} mac-popover-tag-all`} type="button" onClick={() => onAction('显示全部标签')}><SfSymbol name="circle.grid.2x2" size={14} />Show All...</button>}
                      {visibleTags.length === 0 && <span className="mac-popover-empty">没有匹配标签</span>}
                    </div>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>;
      case 'tooltip':
        return <Tooltip.Root open={open} onOpenChange={setOpen} triggerId="docs-tooltip-trigger" disabled={disabled}>
          <Tooltip.Trigger id="docs-tooltip-trigger" render={<Button className={mac.iconButton} aria-label="信息" />}><IconButtonLayers /><SfSymbol name="info.circle" size={17} /></Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Positioner className={mac.tooltip.positioner} side={variant === 'bottom' ? 'bottom' : 'top'} sideOffset={8}><Tooltip.Popup className={mac.tooltip.popup}><TooltipBody>{tooltipText || '提示内容'}</TooltipBody></Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal>
        </Tooltip.Root>;
      case 'dialog':
        return <Dialog.Root open={open} onOpenChange={setOpen} modal={modal} disablePointerDismissal={!dismissOnOutside}>
          <Dialog.Trigger className={mac.button} data-variant="primary">打开对话框</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Backdrop className={mac.dialog.backdrop} />
            <Dialog.Viewport className={mac.dialog.viewport}><div className={mac.dialog.shadowHost}><Dialog.Popup className={mac.dialog.popup}>
              <div className={mac.dialog.surface} aria-hidden="true" /><div className={mac.dialog.border} aria-hidden="true" />
              <div className={mac.dialog.content}>
                {variant === 'destructive' ? <img className={mac.dialog.icon} src="/macos-icons/full-trash.png" alt="" /> : <div className="docs-dialog-icon"><SfSymbol name="doc.text" size={35} /></div>}
                <Dialog.Title className={mac.dialog.title}>{variant === 'destructive' ? '确定要永久删除这些项目吗？' : '保存当前更改？'}</Dialog.Title>
                <Dialog.Description className={mac.dialog.description}>{variant === 'destructive' ? '此操作无法撤销。' : '保存后，其他设备也会看到最新内容。'}</Dialog.Description>
                <div className={mac.dialog.actions}><Dialog.Close className={mac.button}>取消</Dialog.Close><Dialog.Close className={mac.button} data-variant="primary" onClick={() => onAction(variant === 'destructive' ? '已删除项目' : '已保存更改')}>{variant === 'destructive' ? '删除' : '保存'}</Dialog.Close></div>
              </div>
            </Dialog.Popup></div></Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>;
    }
  }

  const currentState = (() => {
    switch (doc.id) {
      case 'button': return { variant, disabled, children: label || '按钮' };
      case 'icon-button': return { variant, disabled, symbol: 'square.and.arrow.up' };
      case 'input': return { type: variant, value: inputValue, placeholder, disabled };
      case 'select': return { list: variant, value: selectValue, disabled };
      case 'switch': return { checked, disabled };
      case 'checkbox': return { checked, indeterminate: variant === 'mixed', disabled };
      case 'radio': return { value: radioValue, disabled };
      case 'tabs': return { value: tabValue, secondTabDisabled };
      case 'slider': return { value: sliderValue, min: 0, max: sliderMax, step: 1, disabled };
      case 'menu': return { open, variant, disabled };
      case 'popover': return { open, side: variant === 'above' ? 'top' : 'bottom', modal, selectedTag, query: tagQuery, disabled };
      case 'tooltip': return { open, side: variant, disabled };
      case 'dialog': return { open, variant, modal, disablePointerDismissal: !dismissOnOutside };
    }
  })();

  return (
    <div className="docs-workbench">
      <section className="docs-preview-panel docs-panel" aria-labelledby="preview-heading">
        <div className="docs-panel-heading"><div><h2 id="preview-heading">实时预览</h2><p>直接操作控件，观察点击、键盘、焦点和浮层状态。</p></div><span className="docs-live-badge"><span /> LIVE</span></div>
        <div className="docs-preview-surface"><div className="docs-preview-content">{renderPreview()}</div></div>
        <div className="docs-state-line"><span>当前状态</span><code>{JSON.stringify(currentState)}</code></div>
      </section>

      <section className="docs-inspector docs-panel" aria-labelledby="inspector-heading">
        <div className="docs-panel-heading"><div><h2 id="inspector-heading">调试属性</h2><p>修改参数，预览会立即更新。</p></div><SfSymbol name="slider.horizontal.3" size={16} /></div>
        <div className="docs-inspector-body">
          <div className="docs-control-block"><span className="docs-control-title">Variant</span><div className="docs-variant-options" role="group" aria-label="选择外观变体">{doc.variants.map((item) => <button key={item.value} type="button" className="docs-choice-button" data-active={variant === item.value || undefined} aria-pressed={variant === item.value} onClick={() => chooseVariant(item.value)}>{item.name}</button>)}</div></div>
          {doc.id === 'button' && <TextControl label="children" value={label} onChange={setLabel} />}
          {doc.id === 'input' && <><TextControl label="value" value={inputValue} onChange={setInputValue} placeholder="在这里输入" /><TextControl label="placeholder" value={placeholder} onChange={setPlaceholder} /></>}
          {doc.id === 'slider' && <label className="docs-control-input"><span>value · 0–{sliderMax}</span><InputFrame><Input className={mac.input} type="number" min={0} max={sliderMax} value={sliderValue} onChange={(event) => setSliderValue(Math.max(0, Math.min(sliderMax, Number(event.target.value) || 0)))} /></InputFrame></label>}
          {doc.id === 'tooltip' && <TextControl label="content" value={tooltipText} onChange={setTooltipText} />}
          {doc.id === 'popover' && <><TextControl label="title" value={popoverTitle} onChange={setPopoverTitle} /><ToggleControl label="modal" checked={modal} onCheckedChange={setModal} description="限制面板外的交互" /></>}
          {doc.id === 'tabs' && <ToggleControl label="禁用「详情」标签" checked={secondTabDisabled} onCheckedChange={(next) => { setSecondTabDisabled(next); if (next && tabValue === 'details') { setTabValue('overview'); setVariant('overview'); } }} />}
          {doc.id === 'dialog' && <><ToggleControl label="modal" checked={modal} onCheckedChange={setModal} description="限制对话框外的交互" /><ToggleControl label="点击外部关闭" checked={dismissOnOutside} onCheckedChange={setDismissOnOutside} /></>}
          {(doc.id === 'menu' || doc.id === 'popover' || doc.id === 'tooltip' || doc.id === 'dialog') && <ToggleControl label="open" checked={open} onCheckedChange={setOpen} description="受控打开状态" />}
          {doc.id === 'switch' && <ToggleControl label="checked" checked={checked} onCheckedChange={(next) => { setChecked(next); setVariant(next ? 'on' : 'off'); }} />}
          {doc.id === 'checkbox' && <ToggleControl label="checked" checked={checked} onCheckedChange={(next) => { setChecked(next); setVariant(next ? 'checked' : 'unchecked'); }} />}
          {['button', 'icon-button', 'input', 'select', 'switch', 'checkbox', 'radio', 'slider', 'menu', 'popover', 'tooltip'].includes(doc.id) && <ToggleControl label="disabled" checked={disabled} onCheckedChange={(next) => { setDisabled(next); if (next) setOpen(false); }} />}
        </div>
      </section>
    </div>
  );
}

export function ComponentDocs({ selectedId, appearance, onAppearanceChange, onAction }: Props) {
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const doc = componentCatalog.find((component) => component.id === selectedId) ?? componentCatalog[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = componentCatalog.filter((component) => [component.name, component.chineseName, component.summary, component.group].some((text) => text.toLocaleLowerCase().includes(normalizedQuery)));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="docs-site">
      <header className="docs-site-header">
        <a className="docs-brand" href="#components/button"><span className="docs-brand-mark"><SfSymbol name="square.grid.2x2" size={19} /></span><span><strong>macOS 27</strong><small>Base UI Theme</small></span></a>
        <nav className="docs-top-nav" aria-label="站点导航"><a className="active" aria-current="page" href="#components/button">组件库</a><a href="#preview/mail">邮件预览</a><a href="#preview/settings">系统设置预览</a></nav>
        <button className="docs-appearance-button" type="button" aria-label={appearance === 'light' ? '切换到深色外观' : '切换到浅色外观'} onClick={() => onAppearanceChange(appearance === 'light' ? 'dark' : 'light')}><SfSymbol name={appearance === 'light' ? 'moon' : 'sun.max'} size={16} /><span>{appearance === 'light' ? '浅色' : '深色'}</span></button>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar" aria-label="组件目录">
          <div className="docs-sidebar-inner">
            <label className="docs-search"><SfSymbol name="magnifyingglass" size={15} /><Input ref={searchRef} aria-label="搜索组件" placeholder="搜索组件…" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></label>
            <div className="docs-sidebar-meta"><span>组件</span><span>{componentCatalog.length}</span></div>
            {componentGroups.map((group) => {
              const items = filtered.filter((item) => item.group === group);
              if (!items.length) return null;
              return <div className="docs-nav-group" key={group}><div className="docs-nav-caption">{group}</div><nav aria-label={`${group}组件`}>{items.map((item) => <a key={item.id} className="docs-component-link" href={`#components/${item.id}`} data-active={selectedId === item.id || undefined} aria-current={selectedId === item.id ? 'page' : undefined}><SfSymbol name={item.icon} size={15} /><span>{item.name}</span><small>{item.chineseName}</small></a>)}</nav></div>;
            })}
            {filtered.length === 0 && <p className="docs-search-empty">没有匹配的组件</p>}
            <div className="docs-sidebar-footer"><span className="docs-accent-swatch" /> Accent · rgb(52, 120, 246)</div>
          </div>
        </aside>

        <main className="docs-main" id="main-content">
          <div className="docs-breadcrumb">组件库 <SfSymbol name="chevron.right" size={10} /> {doc.group} <SfSymbol name="chevron.right" size={10} /> <strong>{doc.name}</strong></div>
          <div className="docs-hero"><div><div className="docs-eyebrow">COMPONENT / {String(componentCatalog.findIndex((item) => item.id === doc.id) + 1).padStart(2, '0')}</div><h1>{doc.name} <span>{doc.chineseName}</span></h1><p>{doc.summary}</p></div><a className="docs-source-link" href={`https://base-ui.com/react/components/${doc.id === 'icon-button' ? 'button' : doc.id === 'radio' ? 'radio-group' : doc.id}`} target="_blank" rel="noreferrer">Base UI API <SfSymbol name="arrow.up.right" size={12} /></a></div>

          <Playground key={doc.id} doc={doc} onAction={onAction} />

          <section className="docs-section" aria-labelledby="variants-heading"><div className="docs-section-heading"><div><h2 id="variants-heading">Variants</h2><p>这个主题在该组件上的预设外观或演示配置。</p></div><span>{doc.variants.length} 种</span></div><div className="docs-variant-list">{doc.variants.map((item) => <div className="docs-variant-card" key={item.value}><code>{item.value}</code><strong>{item.name}</strong><p>{item.description}</p></div>)}</div></section>

          <section className="docs-section" aria-labelledby="props-heading"><div className="docs-section-heading"><div><h2 id="props-heading">常用属性</h2><p>类型按本站的 string / number 示例具体化；主题扩展属性在表中标明。</p></div><span>{doc.props.length} 项</span></div><div className="docs-table-wrap"><table className="docs-props-table"><thead><tr><th>部件 / 属性</th><th>Type</th><th>默认值</th><th>说明</th></tr></thead><tbody>{doc.props.map((prop) => <tr key={`${prop.part}.${prop.name}`}><td><small>{prop.part}</small><code>{prop.name}</code></td><td><code>{prop.type}</code></td><td><code>{prop.defaultValue}</code></td><td>{prop.description}</td></tr>)}</tbody></table></div></section>

          <section className="docs-section docs-anatomy-section" aria-labelledby="anatomy-heading"><div className="docs-section-heading"><div><h2 id="anatomy-heading">结构与状态</h2><p>组合时使用的 Base UI 部件，以及可在预览中观察的状态。</p></div></div><div className="docs-anatomy-grid"><div className="docs-panel"><h3>部件</h3><div className="docs-token-list">{doc.anatomy.map((part) => <code key={part}>{part}</code>)}</div></div><div className="docs-panel"><h3>状态</h3><div className="docs-token-list">{doc.states.map((state) => <code key={state}>{state}</code>)}</div></div></div></section>

          <footer className="docs-footer"><span>Base UI primitives · SF Symbols · CornerKit</span><span>macOS 27 Theme</span></footer>
        </main>
      </div>
    </div>
  );
}
