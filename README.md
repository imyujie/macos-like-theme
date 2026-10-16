# macOS 27 theme for Base UI

基于 [Base UI](https://base-ui.com/) 的 React 主题实验。`src/theme` 是可复用的主题层。首页是独立的组件文档网页；邮件和系统设置作为场景预览保留。文档页固定使用 `rgb(52, 120, 246)` 作为强调色，并可切换浅色、深色外观。

## 运行

```bash
npm install
npm run dev
```

构建预览页：`npm run build`。单独构建主题 CSS、ES module 和类型声明：`npm run build:theme`，输出在 `dist-theme/`。

## 组件文档与调试

打开开发服务器根路径即可进入组件文档。左侧列出 12 个常用组件；每个组件都有实时预览、可调属性、variants、TypeScript 属性类型、常见状态和 Base UI 部件结构。可用搜索框或 `⌘ K` 找到组件。组件页使用 `#components/button`、`#components/select` 等地址，邮件与系统设置预览分别使用 `#preview/mail`、`#preview/settings`。

文档内容位于 `src/componentCatalog.ts`，交互预览位于 `src/ComponentDocs.tsx`。属性表覆盖主题示例中常用的 Base UI 属性；每页的 “Base UI API” 链接可查看对应组件的完整接口。调试控件里的 variants 包含主题外观变体和用于观察状态的演示配置，两者在说明中区分。

## 使用主题

在应用根节点（通常是 `body`）添加 `macos-theme` 类。弹层默认通过 Base UI Portal 挂载在 `body`，所以根节点需要覆盖这些弹层。可选 `data-appearance="light"` 或 `data-appearance="dark"`；不设置时跟随系统。

```tsx
import { Button } from '@base-ui/react/button';
import { installMacCorners, mac, SfSymbol } from './theme';

const removeCorners = installMacCorners(document.body);

<Button className={mac.button} data-variant="primary">
  <SfSymbol name="plus" size={14} />
  新建
</Button>
```

`mac` 提供 Base UI 各组成部分的类名。直接组合 Base UI 原语可以继续使用其键盘、焦点和无障碍行为。主题变量都以 `--mac-` 为前缀，可在 `.macos-theme` 上覆盖，例如 `--mac-accent`。

`mac.button` 默认采用灰色 secondary 外观；主要操作设置 `data-variant="primary"`，无底色操作设置 `data-variant="quiet"`。组件库中的选择器由 `@base-ui/react/select` 的 `Select.Root`、`Select.Label`、`Select.Trigger`、`Select.Icon`、`Select.Popup`、`Select.List` 和 `Select.Item` 组成，使用 `mac.select` 中的类名；在 `Select.Popup` 内依次放置 `<div className={mac.select.backdrop} aria-hidden="true" />` 和 `<div className={mac.select.border} aria-hidden="true" />`，分别承载模糊材质和描边。弹层采用 Base UI 的选中项对齐方式，长列表使用 `Select.ScrollUpArrow` 和 `Select.ScrollDownArrow`，两个箭头都传 `keepMounted`，让列表在滚动到两端时保持稳定。箭头本身不画材质，选项在箭头范围内通过 `mask-image` 渐隐，所以上下边缘都不会出现横向接缝。

滑块使用 Base UI Slider 的控制、轨道、进度与滑块原语。音量示例额外放置 `mac.slider.ticks` 刻度容器；刻度仅负责视觉呈现，不改变滑块的连续取值。

窗口、侧栏、工具栏和分组表面也有可复用类名：`mac.window`、`mac.sidebarSurface`、`mac.toolbarSurface`、`mac.groupedSurface`。侧栏项目使用 `mac.sidebarRow`，配合 `data-active` 和 `data-selection="neutral"` 或 `"accent"`，分别得到邮件列表中的中性选中态和系统设置中的强调色选中态。两个场景的排版细节位于 `src/scenes.css`，主题库构建仅包含通用类名。

直接引用 `src/theme` 时，入口会加载 CSS。使用 `dist-theme/` 构建产物时，还需在应用入口加载 `dist-theme/theme.css`。页面根节点建议设置 `isolation: isolate`；在 iOS Safari 中使用弹层时，让 `body` 保持 `position: relative`。

## 连续圆角

主题使用 [CornerKit](https://bejarcode.github.io/cornerKit/) 1.2.0 绘制连续曲线，项目内的 MIT 许可副本位于 `vendor/cornerkit-core/`。调用 `installMacCorners(root)` 后，按钮、输入框、复选框、分组表面、菜单、选择器弹层、对话框和窗口会自动应用曲线；新挂载的 Base UI Portal 也会被处理。函数返回清理方法，可在应用卸载时调用。预览页的额外卡片、导航项和场景元素通过第二个参数传入选择器。

CornerKit 的裁剪会裁掉元素自身的外阴影。窗口需要在外层使用 `mac.windowShadowHost`，对话框使用 `mac.dialog.shadowHost`；菜单和选择器的阴影放在 Popup 上，以保留背景模糊；提示的 Positioner 承载阴影。对话框的 `mac.dialog.surface` 与 `mac.dialog.border` 分别绘制连续圆角背景和 CornerKit SVG 描边，内容放在 `mac.dialog.content` 中。开关、滑块、圆形图标与胶囊按钮保持原来的几何形状。浏览器不支持 CornerKit 的曲线裁剪时，现有 `border-radius` 提供回退。

Select 菜单整体使用 12px 连续圆角，选项使用 6px 连续圆角。CornerKit 的边框渲染会用 SVG 画描边，同时关闭目标元素的 `clip-path`。菜单本体不裁剪：独立的 `mac.select.backdrop` 层负责连续圆角、背景模糊与上下白色高光，`mac.select.border` 层负责 0.5px 灰色描边。Select Positioner 不使用 `filter`，让背景模糊可以采样弹层后面的页面；外阴影放在菜单本体上。项目内的 CornerKit 副本将原本 1px 的最小边框宽度调整为 0.5px，并将 SVG 清理范围限制在目标元素的直接子级。不支持曲线裁剪时由普通 CSS 圆角和边框回退。

## SF Symbols

预览图标由 macOS 系统的 `NSImage(systemSymbolName:)` 生成，位于 `public/sf-symbols/`。它们作为单色遮罩渲染，会继承文本颜色。添加图标时，在 `scripts/export-sf-symbols.swift` 的 `symbolNames` 中加入官方符号名称，然后在 macOS 上运行 `npm run symbols`。Checkbox 的勾号使用单独导出的粗体 `checkmark.bold.png`，通过 `<SfSymbol name="checkmark" weight="bold" />` 调用。`SfSymbol` 的 `basePath` 属性可指向部署后的资源目录。

确认对话框示例使用单独的 macOS 废纸篓图标，位于 `public/macos-icons/full-trash.png`；主题控件中的线性图标仍使用 SF Symbols。

构建主题库时会输出 CSS 和组件入口；图标 PNG 是独立静态资源，集成到其他应用时需要把所用图标复制到该应用的公开资源目录。项目没有打包或再分发 San Francisco 字体与完整 SF Symbols 字体。

## 设计依据

- [Apple macOS 27 UI Kit](https://developer.apple.com/design/resources/#macos-apps)
- [Apple Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：macOS 正文 13pt，最小 10pt；主题以系统字体栈为主。
- [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：通透材质用于导航和控件层，分组内容使用稳定的标准表面。
- [Apple Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)：侧边栏使用熟悉的符号、简短标签和可隐藏行为。
- [Apple SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)：符号随文本颜色变化，选用常见的线性变体。
- [Base UI Styling](https://base-ui.com/react/handbook/styling)：通过组件 `className` 和状态属性实现样式。

这是 Web 上对 macOS 27 视觉语言的实现，浏览器的模糊材质与原生系统渲染会存在差异。
