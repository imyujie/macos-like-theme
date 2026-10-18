export type ComponentId =
  | 'window'
  | 'button'
  | 'icon-button'
  | 'liquid-glass-button'
  | 'liquid-glass-button-group'
  | 'liquid-glass-search'
  | 'input'
  | 'select'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'tabs'
  | 'liquid-glass-tabs'
  | 'slider'
  | 'menu'
  | 'floating-panel'
  | 'popover'
  | 'tooltip'
  | 'dialog';

export type ComponentGroup = '操作' | '输入与选择' | '导航' | '浮层' | '布局模板';

export interface ComponentProp {
  part: string;
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

export interface ComponentVariant {
  name: string;
  value: string;
  description: string;
}

export interface ComponentDoc {
  id: ComponentId;
  name: string;
  /** Shorter label for the sidebar when the full name is too long for one row. */
  shortName?: string;
  chineseName: string;
  group: ComponentGroup;
  icon: string;
  summary: string;
  importPath: string;
  anatomy: string[];
  variants: ComponentVariant[];
  states: string[];
  props: ComponentProp[];
}

const p = (part: string, name: string, type: string, defaultValue: string, description: string): ComponentProp => ({ part, name, type, defaultValue, description });
const v = (name: string, value: string, description: string): ComponentVariant => ({ name, value, description });

/** The table covers the props exercised by this theme, not every Base UI primitive prop. */
export const componentCatalog: ComponentDoc[] = [
  {
    id: 'button', name: 'Button', chineseName: '按钮', group: '操作', icon: 'rectangle.on.rectangle',
    summary: '执行主要、次要或低强调度的操作。蓝色主按钮与灰色次按钮均无描边和阴影。',
    importPath: '@base-ui/react/button', anatomy: ['Button'],
    variants: [v('Primary', 'primary', '蓝色填充，页面中的主要操作'), v('Secondary', 'secondary', '灰色填充，常规次要操作'), v('Quiet', 'quiet', '透明背景，低强调度操作'), v('Danger', 'danger', '危险操作的红色文字')],
    states: ['default', 'hover', 'pressed', 'focus-visible', 'disabled'],
    props: [p('Button', 'data-variant', "'primary' | 'secondary' | 'quiet' | 'danger'", "'secondary'", '主题提供的外观变体'), p('Button', 'disabled', 'boolean', 'false', '禁止交互并降低不透明度'), p('Button', 'type', "'button' | 'submit' | 'reset'", "'button'", '原生按钮类型'), p('Button', 'onClick', 'React.MouseEventHandler', '—', '点击后的回调'), p('Button', 'render', 'React.ReactElement | (props) => React.ReactElement', '—', 'Base UI 的自定义渲染入口')],
  },
  {
    id: 'icon-button', name: 'Icon Button', chineseName: '图标按钮', group: '操作', icon: 'square.grid.2x2',
    summary: '紧凑的工具栏操作，图标使用 SF Symbols。仅显示图标时必须有可访问名称。',
    importPath: '@base-ui/react/button', anatomy: ['Button', 'mac.iconButtonSurface', 'mac.iconButtonBorder', 'SfSymbol', 'Tooltip（可选）'],
    variants: [v('Default', 'default', '普通工具栏按钮'), v('Glass', 'glass', '半透明玻璃材质')],
    states: ['default', 'hover', 'pressed', 'focus-visible', 'disabled'],
    props: [p('Button', 'data-variant', "'glass' | undefined", 'undefined', '主题图标按钮的外观'), p('Button', 'aria-label', 'string', '必填', '图标按钮的可访问名称'), p('SfSymbol', 'name', 'string', '必填', '已导出的 SF Symbol 名称'), p('SfSymbol', 'size', 'number', '16', '图标尺寸，单位为 px'), p('Button', 'disabled', 'boolean', 'false', '禁止交互')],
  },
  {
    id: 'liquid-glass-button', name: 'Liquid Glass Button', shortName: 'Glass Button', chineseName: '玻璃按钮', group: '操作', icon: 'sparkles',
    summary: '折射背后内容的玻璃按钮。平滑圆角轮廓内侧为高光，外侧为暗边，默认关闭宽泛光；Safari 与 Firefox 回退为磨砂模糊。',
    importPath: './theme (LiquidGlassButton)', anatomy: ['LiquidGlass', 'mac.liquidGlassButton.selection', 'Button', 'SfSymbol'],
    variants: [v('Capsule', 'capsule', '胶囊形玻璃按钮，用于工具栏与表单操作'), v('Icon', 'icon', '圆形玻璃图标按钮，可并排组成工具栏'), v('Prominent', 'prominent', '强调色玻璃按钮，用于主要操作')],
    states: ['default', 'selected', 'focus-visible', 'disabled'],
    props: [p('LiquidGlassButton', 'variant', "'capsule' | 'icon' | 'prominent'", "'capsule'", '按钮外形与材质'), p('LiquidGlassButton', 'size', 'number', '28', '控件高度，圆角由它推导'), p('LiquidGlassButton', 'appearance', "'light' | 'dark'", "'light'", '材质明暗，跟随主题外观'), p('LiquidGlassButton', 'materialMode', "'light' | 'dark'", '跟随 appearance', '显式指定材质变换；dark 表示原样使用材质'), p('LiquidGlassButton', 'material', 'GlassMaterialInput', '主题预设', '材质预设或预设加覆盖参数'), p('LiquidGlassButton', 'engine', 'Partial<GlassEngineParams>', '—', '按实例覆盖引擎常量，调试用'), p('LiquidGlassButton', 'icon', 'string', '—', '已导出的 SF Symbol 名称'), p('LiquidGlassButton', 'selected', 'boolean', 'false', '在标签下显示选中色块'), p('LiquidGlassButton', 'backdrop', 'boolean', 'true', '采样背后页面内容；关闭只保留色调与高光'), p('LiquidGlassButton', 'forceCssFallback', 'boolean', 'false', '跳过 SVG 背景采样，使用 CSS backdrop-filter: blur(1.5px)'), p('LiquidGlassButton', 'hdrHighlight', 'boolean', 'true', '扩展亮度高光层，需要 HDR 显示器'), p('LiquidGlassButton', 'hdrHighlightStrength', 'number', '0.8', '高光覆盖强度 0–1'), p('LiquidGlassButton', 'pointerHighlight', 'Partial<GlassPointerHighlightParams> | false', 'false', '悬停跟随指针的高光，颜色跟随 fill；默认关闭'), p('Button', 'disabled', 'boolean', 'false', '禁止交互；仅按钮文本降到 40% 不透明度')],
  },
  {
    id: 'liquid-glass-button-group', name: 'Liquid Glass Button Group', shortName: 'Glass Button Group', chineseName: '玻璃按钮组', group: '操作', icon: 'chevron.left',
    summary: '多个独立操作共用一个液态玻璃胶囊，按钮之间使用内缩分隔线。适合前进后退、工具栏操作与相邻的文字按钮。',
    importPath: './theme (LiquidGlassButtonGroup)', anatomy: ['LiquidGlassButtonGroup.Root', 'LiquidGlass', 'LiquidGlassButtonGroup.Button', 'SfSymbol'],
    variants: [v('Navigation', 'navigation', '前进后退，共用玻璃外壳与中央分隔线'), v('Compact', 'compact', '32px 紧凑按钮组'), v('Large', 'large', '56px 大尺寸按钮组'), v('Labels', 'labels', '图标与文字操作')],
    states: ['default', 'hover', 'pressed', 'focus-visible', 'disabled', 'light / dark'],
    props: [p('Root', 'ariaLabel', 'string', '必填', '整组操作的可访问名称'), p('Root', 'size', 'number', '40', '共享高度，图标按钮宽度与高度相同'), p('Root', 'appearance', "'light' | 'dark'", "'light'", '沿用对应外观的非 prominent 按钮材质'), p('Root', 'disabled', 'boolean', 'false', '禁用整组操作'), p('Root', 'material / engine', 'GlassMaterialInput / Partial<GlassEngineParams>', '主题预设', '覆盖整组共享玻璃参数'), p('Root', 'forceCssFallback', 'boolean', 'false', '使用 CSS 背景模糊回退'), p('Button', 'icon', 'string', '—', '已导出的 SF Symbol 名称'), p('Button', 'children', 'ReactNode', '—', '按钮文字，不传时为等宽图标按钮'), p('Button', 'aria-label', 'string', '图标按钮必填', '单个操作的可访问名称'), p('Button', 'disabled', 'boolean', 'false', '仅禁用当前操作，图标与文字变淡'), p('Button', 'onClick / render', 'Button.Props', '—', 'Base UI 按钮事件与组合能力')],
  },
  {
    id: 'input', name: 'Input', chineseName: '输入框', group: '输入与选择', icon: 'doc.text',
    summary: '单行文本输入。支持占位文字、禁用状态与不同的原生 input 类型。',
    importPath: '@base-ui/react/input', anatomy: ['mac.inputFrame', 'mac.inputSurface', 'Input', 'mac.inputBorder'],
    variants: [v('Text', 'text', '普通单行文本'), v('Email', 'email', '邮箱地址'), v('Search', 'search', '搜索输入'), v('Password', 'password', '密码输入')],
    states: ['empty', 'filled', 'focus-visible', 'disabled'],
    props: [p('Input', 'type', "'text' | 'email' | 'search' | 'password'", "'text'", '浏览器输入类型'), p('Input', 'value', 'string', '—', '受控输入值'), p('Input', 'onChange', 'React.ChangeEventHandler<HTMLInputElement>', '—', '值改变时触发'), p('Input', 'placeholder', 'string', '—', '输入提示'), p('Input', 'disabled', 'boolean', 'false', '禁止编辑'), p('Input', 'aria-label', 'string', '—', '没有可见标签时使用')],
  },
  {
    id: 'liquid-glass-search', name: 'Liquid Glass Search', shortName: 'Glass Search', chineseName: '玻璃搜索框', group: '输入与选择', icon: 'magnifyingglass',
    summary: '胶囊形液态玻璃搜索框。柔和的背景模糊与边缘折射保持通透，文字和图标清晰显示，支持深浅色外观。',
    importPath: './theme (LiquidGlassSearch)', anatomy: ['LiquidGlass', 'SfSymbol', 'Input', 'Button（清除）'],
    variants: [v('Regular', 'regular', '40px 标准搜索框'), v('Compact', 'compact', '32px 紧凑搜索框'), v('Large', 'large', '48px 大号搜索框')],
    states: ['empty', 'filled', 'focus-visible', 'read-only', 'disabled'],
    props: [p('LiquidGlassSearch', 'value', 'string', '—', '受控搜索文字'), p('LiquidGlassSearch', 'defaultValue', 'string', "''", '非受控初始文字'), p('LiquidGlassSearch', 'onValueChange', '(value: string) => void', '—', '输入或清除时触发'), p('LiquidGlassSearch', 'onSearch', '(value: string) => void', '—', '按 Enter 搜索；输入法组合期间不触发'), p('LiquidGlassSearch', 'placeholder', 'string', "'Search'", '空值提示'), p('LiquidGlassSearch', 'size', 'number', '40', '高度，单位 px；圆角为高度的一半'), p('LiquidGlassSearch', 'appearance', "'light' | 'dark'", "'light'", '与应用主题同步材质外观'), p('LiquidGlassSearch', 'clearable', 'boolean', 'true', '显示清除按钮；Escape 清空搜索'), p('LiquidGlassSearch', 'clearLabel', 'string', "'清除搜索'", '清除按钮的可访问名称'), p('LiquidGlassSearch', 'disabled / readOnly', 'boolean', 'false', '禁用或只读，隐藏清除按钮'), p('LiquidGlassSearch', 'material', 'GlassMaterialInput', '搜索框预设', '覆盖玻璃材质'), p('LiquidGlassSearch', 'forceCssFallback', 'boolean', 'false', '使用 CSS 模糊回退'), p('LiquidGlassSearch', 'aria-label', 'string', "'搜索'", '可访问名称；也可使用 aria-labelledby'), p('LiquidGlassSearch', 'ref', 'React.Ref<HTMLInputElement>', '—', '访问原生输入框以聚焦或选择文字')],
  },
  {
    id: 'select', name: 'Select', chineseName: '选择器', group: '输入与选择', icon: 'chevron.up.chevron.down',
    summary: '使用 Base UI Select 组合。菜单有连续圆角、玻璃模糊材质、0.5px 描边与溢出滚动箭头。',
    importPath: '@base-ui/react/select', anatomy: ['Select.Root', 'Select.Label', 'Select.Trigger', 'Select.Value', 'Select.Icon', 'Select.Portal', 'Select.Positioner', 'Select.Popup', 'mac.floatingPanel.surface', 'mac.floatingPanel.border', 'Select.List', 'Select.Item'],
    variants: [v('Short list', 'short', '少量选项'), v('Long list', 'long', '溢出列表与上下滚动箭头')],
    states: ['closed', 'open', 'selected', 'highlighted', 'disabled'],
    props: [p('Select.Root', 'items', 'Array<{ label: ReactNode; value: string }>', '—', '为 Select.Value 提供显示文本'), p('Select.Root', 'value', 'string | null', '—', '当前选中的值'), p('Select.Root', 'onValueChange', '(value: string | null) => void', '—', '选择变化回调'), p('Select.Root', 'disabled', 'boolean', 'false', '禁止选择'), p('Select.Root', 'open', 'boolean', '—', '受控打开状态'), p('Select.Positioner', 'sideOffset', 'number', '0', '触发器与菜单的间距'), p('Select.Item', 'value', 'string', '必填', '选项值')],
  },
  {
    id: 'switch', name: 'Switch', chineseName: '开关', group: '输入与选择', icon: 'slider.horizontal.3',
    summary: '即时切换设置。开启时为系统蓝色，关闭时为灰色；滑块保持胶囊形状。',
    importPath: '@base-ui/react/switch', anatomy: ['Switch.Root', 'Switch.Thumb'],
    variants: [v('On', 'on', '开启'), v('Off', 'off', '关闭')],
    states: ['checked', 'unchecked', 'focus-visible', 'disabled'],
    props: [p('Switch.Root', 'checked', 'boolean', '—', '受控开关状态'), p('Switch.Root', 'onCheckedChange', '(checked: boolean) => void', '—', '状态变化回调'), p('Switch.Root', 'defaultChecked', 'boolean', 'false', '非受控初始状态'), p('Switch.Root', 'disabled', 'boolean', 'false', '禁止切换'), p('Switch.Root', 'aria-label', 'string', '—', '没有可见标签时使用')],
  },
  {
    id: 'checkbox', name: 'Checkbox', chineseName: '复选框', group: '输入与选择', icon: 'checkmark',
    summary: '独立的二元选择，也支持混合状态。',
    importPath: '@base-ui/react/checkbox', anatomy: ['Checkbox.Root', 'Checkbox.Indicator'],
    variants: [v('Checked', 'checked', '选中'), v('Unchecked', 'unchecked', '未选中'), v('Mixed', 'mixed', '部分选中')],
    states: ['checked', 'unchecked', 'indeterminate', 'focus-visible', 'disabled'],
    props: [p('Checkbox.Root', 'checked', 'boolean', '—', '受控选中状态'), p('Checkbox.Root', 'onCheckedChange', '(checked: boolean) => void', '—', '状态变化回调'), p('Checkbox.Root', 'indeterminate', 'boolean', 'false', '混合状态'), p('Checkbox.Root', 'disabled', 'boolean', 'false', '禁止切换'), p('Checkbox.Root', 'name', 'string', '—', '提交表单时的字段名')],
  },
  {
    id: 'radio', name: 'Radio Group', chineseName: '单选按钮', group: '输入与选择', icon: 'circle.grid.2x2',
    summary: '在一组互斥选项中选择一个。',
    importPath: '@base-ui/react/radio-group + @base-ui/react/radio', anatomy: ['RadioGroup', 'Radio.Root', 'Radio.Indicator'],
    variants: [v('Comfortable', 'comfortable', '舒适'), v('Compact', 'compact', '紧凑')],
    states: ['checked', 'unchecked', 'focus-visible', 'disabled'],
    props: [p('RadioGroup', 'value', 'string', '—', '当前选中值'), p('RadioGroup', 'onValueChange', '(value: string) => void', '—', '选中项变化回调'), p('RadioGroup', 'disabled', 'boolean', 'false', '禁用整组'), p('Radio.Root', 'value', 'string', '必填', '单个选项的值'), p('Radio.Root', 'disabled', 'boolean', 'false', '禁用单个选项')],
  },
  {
    id: 'tabs', name: 'Tabs', chineseName: '分段控制', group: '导航', icon: 'square.grid.2x2',
    summary: '在同一位置切换相关视图。灰色胶囊背景，选中项为白色胶囊，无描边和阴影。',
    importPath: '@base-ui/react/tabs', anatomy: ['Tabs.Root', 'Tabs.List', 'mac.tabs.surface', 'Tabs.Tab', 'Tabs.Panel'],
    variants: [v('Overview', 'overview', '概览面板'), v('Details', 'details', '详情面板'), v('Activity', 'activity', '活动面板')],
    states: ['active', 'inactive', 'focus-visible', 'disabled'],
    props: [p('Tabs.Root', 'value', 'string | number | null', '—', '当前激活的标签'), p('Tabs.Root', 'onValueChange', '(value) => void', '—', '激活标签变化回调'), p('Tabs.Root', 'orientation', "'horizontal' | 'vertical'", "'horizontal'", '布局方向；当前主题演示水平布局'), p('Tabs.Tab', 'value', 'string | number', '必填', '标签与面板匹配的值'), p('Tabs.Tab', 'disabled', 'boolean', 'false', '禁用单个标签')],
  },
  {
    id: 'liquid-glass-tabs', name: 'Liquid Glass Tabs', shortName: 'Glass Tabs', chineseName: '玻璃分段控制', group: '导航', icon: 'square.grid.2x2',
    summary: '液态玻璃胶囊分段控件。通透的外层包裹中性灰选中块，切换时平滑滑动，沿用 Tabs 的键盘导航与面板关联。',
    importPath: './theme (LiquidGlassTabs)', anatomy: ['LiquidGlassTabs.Root', 'LiquidGlassTabs.List', 'LiquidGlass', 'LiquidGlassTabs.Tab', 'Tabs.Indicator', 'LiquidGlassTabs.Panel'],
    variants: [v('Regular', 'regular', '40px 标准胶囊'), v('Compact', 'compact', '32px 紧凑胶囊'), v('Large', 'large', '48px 大号胶囊')],
    states: ['active', 'inactive', 'hover', 'focus-visible', 'disabled'],
    props: [p('Root', 'value / defaultValue', 'string | number | null', '—', '受控值或非受控初始值'), p('Root', 'onValueChange', '(value, eventDetails) => void', '—', '选中项变化，沿用 Base UI Tabs'), p('List', 'size', 'number', '40', '水平控件高度，圆角与字号随尺寸变化'), p('List', 'appearance', "'light' | 'dark'", "'light'", '与应用主题同步玻璃材质'), p('List', 'fullWidth', 'boolean', 'false', '填满容器，选项等宽分配'), p('List', 'activateOnFocus', 'boolean', 'true', '方向键移动焦点时同时切换；关闭后用 Enter 或 Space 确认'), p('List', 'loopFocus', 'boolean', 'true', '方向键在首尾循环'), p('List', 'aria-label', 'string', '—', '分段控件的可访问名称'), p('List', 'material / engine', 'GlassMaterialInput / Partial<GlassEngineParams>', '主题预设', '覆盖玻璃材质或折射参数'), p('List', 'forceCssFallback', 'boolean', 'false', '使用 CSS 模糊回退'), p('Tab', 'value', 'string | number', '必填', '与 Panel 匹配的值'), p('Tab', 'disabled', 'boolean', 'false', '禁止选中；按 Base UI 行为仍可由方向键聚焦'), p('Panel', 'value', 'string | number', '必填', '显示对应选项的内容，可按需组合')],
  },
  {
    id: 'slider', name: 'Slider', chineseName: '滑块', group: '输入与选择', icon: 'slider.horizontal.3',
    summary: '调整连续数值。圆角轨道配胶囊形滑块，支持键盘和拖动。',
    importPath: '@base-ui/react/slider', anatomy: ['Slider.Root', 'Slider.Label', 'Slider.Control', 'Slider.Track', 'Slider.Indicator', 'Slider.Thumb'],
    variants: [v('Volume', 'volume', '0–100 音量'), v('Fine', 'fine', '0–10 精细调整')],
    states: ['default', 'dragging', 'focus-visible', 'disabled'],
    props: [p('Slider.Root', 'value', 'number | readonly number[]', '—', '受控数值'), p('Slider.Root', 'onValueChange', '(value: number) => void', '—', '拖动时数值变化'), p('Slider.Root', 'min', 'number', '0', '最小值'), p('Slider.Root', 'max', 'number', '100', '最大值'), p('Slider.Root', 'step', 'number', '1', '数值步长'), p('Slider.Root', 'disabled', 'boolean', 'false', '禁止拖动')],
  },
  {
    id: 'menu', name: 'Menu', chineseName: '菜单', group: '浮层', icon: 'ellipsis',
    summary: '展示动作列表，支持带分隔线的操作和二级菜单。各级菜单共用连续圆角、细描边与模糊材质。',
    importPath: '@base-ui/react/menu', anatomy: ['Menu.Root', 'Menu.Trigger', 'Menu.Portal', 'Menu.Positioner', 'Menu.Popup', 'mac.floatingPanel.surface', 'mac.floatingPanel.border', 'Menu.Item', 'Menu.SubmenuRoot', 'Menu.SubmenuTrigger', 'mac.menu.submenuArrow'],
    variants: [v('Actions', 'actions', '普通动作列表'), v('With separator', 'separator', '带分隔线和危险操作'), v('Submenu', 'submenu', '悬停「导出为」展开二级菜单，也可用左右方向键进入和返回')],
    states: ['closed', 'open', 'highlighted', 'submenu open', 'disabled item'],
    props: [p('Menu.Root', 'open', 'boolean', '—', '受控打开状态'), p('Menu.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Menu.Root', 'disabled', 'boolean', 'false', '禁用整个菜单'), p('Menu.Positioner', 'sideOffset', 'number', '0', '触发器与菜单的间距'), p('Menu.Item', 'disabled', 'boolean', 'false', '禁用单个动作'), p('Menu.Item', 'onClick', 'React.MouseEventHandler', '—', '执行菜单动作'), p('Menu.SubmenuTrigger', 'openOnHover', 'boolean', 'true', '悬停展开二级菜单'), p('Menu.SubmenuTrigger', 'delay', 'number', '100', '悬停展开前的等待时间，单位 ms'), p('Menu.SubmenuRoot', 'closeParentOnEsc', 'boolean', 'false', '按 Escape 时是否同时关闭父菜单')],
  },
  {
    id: 'popover', name: 'Popover', chineseName: '弹出面板', group: '浮层', icon: 'tag',
    summary: '参照 Finder 标签面板：连续圆角、半透明模糊材质、细描边与指向触发器的尖角。',
    importPath: '@base-ui/react/popover', anatomy: ['Popover.Root', 'Popover.Trigger', 'Popover.Portal', 'Popover.Positioner', 'Popover.Popup', 'Popover.Arrow', 'Popover.Title', 'mac.floatingPanel.surface', 'mac.floatingPanel.border', 'mac.floatingPanel.content'],
    variants: [v('Below', 'below', '面板显示在触发器下方'), v('Above', 'above', '面板显示在触发器上方')],
    states: ['closed', 'open', 'searching', 'selected', 'focus-visible'],
    props: [p('Popover.Root', 'open', 'boolean', '—', '受控打开状态'), p('Popover.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Popover.Root', 'modal', "boolean | 'trap-focus'", 'false', '是否限制面板外的交互'), p('Popover.Trigger', 'disabled', 'boolean', 'false', '禁止打开面板'), p('Popover.Positioner', 'side', "'top' | 'bottom' | 'left' | 'right'", "'bottom'", '面板弹出的方向'), p('Popover.Positioner', 'sideOffset', 'number', '0', '触发器与面板的间距'), p('Popover.Positioner', 'align', "'start' | 'center' | 'end'", "'center'", '面板与触发器的对齐方式')],
  },
  {
    id: 'floating-panel', name: 'Floating Panel', chineseName: '浮层容器', group: '浮层', icon: 'rectangle.on.rectangle',
    summary: 'Menu、Select 选项菜单和 Popover 共用的容器样式。统一半透明材质、模糊、边缘高光、细描边与连续圆角阴影，也可独立组合内容。',
    importPath: './theme (mac.floatingPanel)', anatomy: ['mac.floatingPanel.root', 'mac.floatingPanel.surface', 'mac.floatingPanel.border', 'mac.floatingPanel.content'],
    variants: [v('Regular', 'regular', '浅色 20px、深色 22px 圆角，适合内容面板'), v('Compact', 'compact', '12px 圆角，与 Menu 和 Select 菜单一致')],
    states: ['light', 'dark', 'reduced-transparency'],
    props: [p('root', 'data-size', "'regular' | 'compact'", "'regular'", '容器圆角预设；宽度和内容间距由使用方设置'), p('CSS', '--mac-floating-panel-radius', '<length>', '20px / 22px', '连续圆角半径，Compact 固定为 12px'), p('CSS', '--mac-floating-panel-material', '<color>', '跟随外观', '半透明背景色'), p('CSS', '--mac-floating-panel-blur', '<length>', '8px', '背景模糊半径'), p('CSS', '--mac-floating-panel-saturation', '<number>', '1.45', '背景饱和度'), p('CSS', '--mac-floating-panel-outline', '<color>', '跟随外观', '0.5px 细描边颜色'), p('CSS', '--mac-floating-panel-shadow', '<box-shadow>', '跟随外观', '沿连续圆角路径绘制的外阴影')],
  },
  {
    id: 'tooltip', name: 'Tooltip', chineseName: '提示', group: '浮层', icon: 'info.circle',
    summary: '参照 Finder 工具栏提示：灰色半透明材质、细描边和柔和阴影，支持悬停与键盘聚焦。',
    importPath: '@base-ui/react/tooltip', anatomy: ['Tooltip.Provider', 'Tooltip.Root', 'Tooltip.Trigger', 'Tooltip.Portal', 'Tooltip.Positioner', 'Tooltip.Popup', 'mac.tooltip.surface', 'mac.tooltip.border'],
    variants: [v('Bottom', 'bottom', '显示在触发器下方'), v('Top', 'top', '显示在触发器上方')],
    states: ['closed', 'open', 'disabled'],
    props: [p('Tooltip.Provider', 'delay', 'number', '默认延迟', '显示前等待的毫秒数'), p('Tooltip.Root', 'open', 'boolean', '—', '受控打开状态'), p('Tooltip.Root', 'disabled', 'boolean', 'false', '禁用提示'), p('Tooltip.Positioner', 'side', "'top' | 'bottom' | 'left' | 'right'", "'top'", '弹出方向'), p('Tooltip.Positioner', 'sideOffset', 'number', '0', '触发器与提示的间距')],
  },
  {
    id: 'dialog', name: 'Dialog', chineseName: '对话框', group: '浮层', icon: 'rectangle.on.rectangle',
    summary: '需要用户确认的短流程。表面和描边使用 Squircle Kit，操作按钮使用蓝色与灰色。',
    importPath: '@base-ui/react/dialog', anatomy: ['Dialog.Root', 'Dialog.Trigger', 'Dialog.Portal', 'Dialog.Backdrop', 'Dialog.Viewport', 'Dialog.Popup', 'Dialog.Title', 'Dialog.Description', 'Dialog.Close'],
    variants: [v('Confirm', 'confirm', '确认操作对话框'), v('Destructive', 'destructive', '删除操作确认')],
    states: ['closed', 'open', 'focus-visible'],
    props: [p('Dialog.Root', 'open', 'boolean', '—', '受控打开状态'), p('Dialog.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Dialog.Root', 'modal', "boolean | 'trap-focus'", 'true', '是否限制对话框外的交互'), p('Dialog.Root', 'disablePointerDismissal', 'boolean', 'false', '阻止点击外部关闭'), p('Dialog.Close', 'data-variant', "'primary' | 'secondary'", "'secondary'", '主题中的操作按钮外观')],
  },
  {
    id: 'window', name: 'macOS Window', shortName: 'Window', chineseName: '窗口模板', group: '布局模板', icon: 'macwindow',
    summary: '带侧边栏与顶部工具栏的应用窗口。侧边栏使用背景模糊，顶部通过边缘淡出衔接滚动内容，工具栏复用 Liquid Glass 控件。',
    importPath: './theme (MacWindow)', anatomy: ['MacWindow', 'sidebar', 'navigation', 'toolbar', 'children', 'statusBar', 'LiquidGlassButton'],
    variants: [v('Finder', 'finder', '可操作的文件窗口：目录导航、网格与列表、搜索和窗口控制')],
    states: ['sidebar open / hidden', 'grid / list', 'search', 'selected', 'minimized', 'light / dark'],
    props: [p('MacWindow', 'title', 'ReactNode', '必填', '工具栏中的窗口标题'), p('MacWindow', 'sidebar', 'ReactNode', '—', '左侧导航内容，不传时为单栏窗口'), p('MacWindow', 'navigation', 'ReactNode', '—', '标题前的导航控件'), p('MacWindow', 'toolbar', 'ReactNode', '—', '右侧工具栏操作'), p('MacWindow', 'children', 'ReactNode', '—', '独立滚动的内容区域'), p('MacWindow', 'statusBar / sidebarFooter', 'ReactNode', '—', '底部状态栏与侧边栏底部插槽'), p('MacWindow', 'sidebarWidth', 'number', '220', '侧边栏宽度，窄容器中自适应'), p('MacWindow', 'sidebarOpen', 'boolean', 'true', '受控侧边栏展开状态'), p('MacWindow', 'onSidebarOpenChange', '(open: boolean) => void', '—', '显示工具栏中的侧边栏切换按钮'), p('MacWindow', 'fadingEdge', 'boolean', 'true', '滚动内容接近顶部时逐渐淡出'), p('MacWindow', 'onClose / onMinimize / onZoom', '() => void', '—', '窗口控制回调，未提供时对应按钮禁用')],
  },
];

export const componentGroups: ComponentGroup[] = ['操作', '输入与选择', '导航', '浮层', '布局模板'];

export function isComponentId(value: string): value is ComponentId {
  return componentCatalog.some((component) => component.id === value);
}
