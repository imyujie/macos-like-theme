export type ComponentId =
  | 'button'
  | 'icon-button'
  | 'input'
  | 'select'
  | 'switch'
  | 'checkbox'
  | 'radio'
  | 'tabs'
  | 'slider'
  | 'menu'
  | 'popover'
  | 'tooltip'
  | 'dialog';

export type ComponentGroup = '操作' | '输入与选择' | '导航' | '浮层';

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
    id: 'input', name: 'Input', chineseName: '输入框', group: '输入与选择', icon: 'doc.text',
    summary: '单行文本输入。支持占位文字、禁用状态与不同的原生 input 类型。',
    importPath: '@base-ui/react/input', anatomy: ['mac.inputFrame', 'mac.inputSurface', 'Input', 'mac.inputBorder'],
    variants: [v('Text', 'text', '普通单行文本'), v('Email', 'email', '邮箱地址'), v('Search', 'search', '搜索输入'), v('Password', 'password', '密码输入')],
    states: ['empty', 'filled', 'focus-visible', 'disabled'],
    props: [p('Input', 'type', "'text' | 'email' | 'search' | 'password'", "'text'", '浏览器输入类型'), p('Input', 'value', 'string', '—', '受控输入值'), p('Input', 'onChange', 'React.ChangeEventHandler<HTMLInputElement>', '—', '值改变时触发'), p('Input', 'placeholder', 'string', '—', '输入提示'), p('Input', 'disabled', 'boolean', 'false', '禁止编辑'), p('Input', 'aria-label', 'string', '—', '没有可见标签时使用')],
  },
  {
    id: 'select', name: 'Select', chineseName: '选择器', group: '输入与选择', icon: 'chevron.up.chevron.down',
    summary: '使用 Base UI Select 组合。菜单有连续圆角、玻璃模糊材质、0.5px 描边与溢出滚动箭头。',
    importPath: '@base-ui/react/select', anatomy: ['Select.Root', 'Select.Label', 'Select.Trigger', 'Select.Value', 'Select.Icon', 'Select.Portal', 'Select.Positioner', 'Select.Popup', 'Select.List', 'Select.Item'],
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
    summary: '在同一位置切换相关视图；主题样式为水平分段控制。',
    importPath: '@base-ui/react/tabs', anatomy: ['Tabs.Root', 'Tabs.List', 'mac.tabs.surface', 'mac.tabs.border', 'Tabs.Tab', 'Tabs.Panel'],
    variants: [v('Overview', 'overview', '概览面板'), v('Details', 'details', '详情面板'), v('Activity', 'activity', '活动面板')],
    states: ['active', 'inactive', 'focus-visible', 'disabled'],
    props: [p('Tabs.Root', 'value', 'string | number | null', '—', '当前激活的标签'), p('Tabs.Root', 'onValueChange', '(value) => void', '—', '激活标签变化回调'), p('Tabs.Root', 'orientation', "'horizontal' | 'vertical'", "'horizontal'", '布局方向；当前主题演示水平布局'), p('Tabs.Tab', 'value', 'string | number', '必填', '标签与面板匹配的值'), p('Tabs.Tab', 'disabled', 'boolean', 'false', '禁用单个标签')],
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
    summary: '展示动作列表。菜单使用 CornerKit 连续圆角描边和模糊背景。',
    importPath: '@base-ui/react/menu', anatomy: ['Menu.Root', 'Menu.Trigger', 'Menu.Portal', 'Menu.Positioner', 'Menu.Popup', 'Menu.Item'],
    variants: [v('Actions', 'actions', '普通动作列表'), v('With separator', 'separator', '带分隔线和危险操作')],
    states: ['closed', 'open', 'highlighted', 'disabled item'],
    props: [p('Menu.Root', 'open', 'boolean', '—', '受控打开状态'), p('Menu.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Menu.Root', 'disabled', 'boolean', 'false', '禁用整个菜单'), p('Menu.Positioner', 'sideOffset', 'number', '0', '触发器与菜单的间距'), p('Menu.Item', 'disabled', 'boolean', 'false', '禁用单个动作'), p('Menu.Item', 'onClick', 'React.MouseEventHandler', '—', '执行菜单动作')],
  },
  {
    id: 'popover', name: 'Popover', chineseName: '弹出面板', group: '浮层', icon: 'tag',
    summary: '参照 Finder 标签面板：连续圆角、半透明模糊材质、细描边与指向触发器的尖角。',
    importPath: '@base-ui/react/popover', anatomy: ['Popover.Root', 'Popover.Trigger', 'Popover.Portal', 'Popover.Positioner', 'Popover.Popup', 'Popover.Arrow', 'Popover.Title', 'mac.popover.surface', 'mac.popover.border'],
    variants: [v('Below', 'below', '面板显示在触发器下方'), v('Above', 'above', '面板显示在触发器上方')],
    states: ['closed', 'open', 'searching', 'selected', 'focus-visible'],
    props: [p('Popover.Root', 'open', 'boolean', '—', '受控打开状态'), p('Popover.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Popover.Root', 'modal', "boolean | 'trap-focus'", 'false', '是否限制面板外的交互'), p('Popover.Trigger', 'disabled', 'boolean', 'false', '禁止打开面板'), p('Popover.Positioner', 'side', "'top' | 'bottom' | 'left' | 'right'", "'bottom'", '面板弹出的方向'), p('Popover.Positioner', 'sideOffset', 'number', '0', '触发器与面板的间距'), p('Popover.Positioner', 'align', "'start' | 'center' | 'end'", "'center'", '面板与触发器的对齐方式')],
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
    summary: '需要用户确认的短流程。表面和描边使用 CornerKit，操作按钮使用蓝色与灰色。',
    importPath: '@base-ui/react/dialog', anatomy: ['Dialog.Root', 'Dialog.Trigger', 'Dialog.Portal', 'Dialog.Backdrop', 'Dialog.Viewport', 'Dialog.Popup', 'Dialog.Title', 'Dialog.Description', 'Dialog.Close'],
    variants: [v('Confirm', 'confirm', '确认操作对话框'), v('Destructive', 'destructive', '删除操作确认')],
    states: ['closed', 'open', 'focus-visible'],
    props: [p('Dialog.Root', 'open', 'boolean', '—', '受控打开状态'), p('Dialog.Root', 'onOpenChange', '(open: boolean) => void', '—', '开合回调'), p('Dialog.Root', 'modal', "boolean | 'trap-focus'", 'true', '是否限制对话框外的交互'), p('Dialog.Root', 'disablePointerDismissal', 'boolean', 'false', '阻止点击外部关闭'), p('Dialog.Close', 'data-variant', "'primary' | 'secondary'", "'secondary'", '主题中的操作按钮外观')],
  },
];

export const componentGroups: ComponentGroup[] = ['操作', '输入与选择', '导航', '浮层'];

export function isComponentId(value: string): value is ComponentId {
  return componentCatalog.some((component) => component.id === value);
}
