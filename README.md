# macOS 27 theme for Base UI

基于 [Base UI](https://base-ui.com/) 的 React 主题实验。`src/theme` 是可复用的主题层。首页是独立的组件文档网页；邮件和系统设置作为场景预览保留。文档页固定使用 `rgb(52, 120, 246)` 作为强调色，并可切换浅色、深色外观。

## 运行

```bash
npm install
npm run dev
```

构建预览页：`npm run build`。单独构建主题 CSS、ES module 和类型声明：`npm run build:theme`，输出在 `dist-theme/`。

## 预览部署

`gh-pages` 分支存放组件文档站的构建产物，站点地址是 `https://imyujie.github.io/macos-like-theme/`。仓库 Settings → Pages 的 Source 已指向 `gh-pages` 分支根目录，推上去之后会自动构建，一般 30 秒左右生效。

```bash
npm run build:pages        # 构建到 dist/，并为 Pages 补 .nojekyll 与 404.html
git worktree add --orphan -b gh-pages /tmp/ghp   # 只在第一次需要
cp -R dist/. /tmp/ghp/ && cd /tmp/ghp
git add -A && git commit -m "Deploy docs preview" && git push origin gh-pages
git worktree remove /tmp/ghp
```

站点挂在子路径下，所以 `npm run build:pages` 会把 Vite 的 `base` 设成 `/macos-like-theme/`；图标和图片路径都通过 `import.meta.env.BASE_URL` 解析。换仓库名时改这一处的 `--base` 即可。

## 组件文档与调试

打开开发服务器根路径即可进入组件文档。左侧列出主题组件与公共容器样式；每项都有实时预览、可调属性、variants、常用属性类型、常见状态和部件结构。可用搜索框或 `⌘ K` 找到组件。组件页使用 `#components/button`、`#components/select` 等地址，共用浮层容器位于 `#components/floating-panel`，邮件与系统设置预览分别使用 `#preview/mail`、`#preview/settings`。

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

Menu 文档页的 `Submenu` 变体提供「导出为 → PDF 文档 / PNG 图片 / Markdown」二级菜单示例。使用 `Menu.SubmenuRoot`、`Menu.SubmenuTrigger` 和独立的 Portal / Positioner / Popup 组合，二级弹层沿用 `mac.menu.popup`、`mac.menu.backdrop` 和 `mac.menu.border`，与主菜单重叠 5px；入口使用 `mac.menu.submenuTrigger`，右侧箭头使用 `mac.menu.submenuArrow`。支持悬停展开、左右方向键进入与返回，选择子项后关闭整组菜单并显示操作反馈。

## macOS Window 模板

`MacWindow` 提供 16px 连续圆角的窗口外框、模糊侧边栏、顶部 fading edge 和独立滚动的内容区。预览地址为 `#components/window`；Finder 示例支持目录导航、前进后退、网格/列表切换、搜索、新建文件夹和收起侧边栏。示例数据只保存在页面内。`fadingEdge` 默认为 `true`，用 24px 透明度渐变让内容接近顶部时淡出；关闭后使用清晰的裁切边界。

```tsx
import { useState } from 'react';
import { MacWindow, LiquidGlassButton } from './theme';

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return (
    <MacWindow
      title="My Workspace"
      appearance="light"
      sidebar={<nav>{/* 应用导航 */}</nav>}
      sidebarOpen={sidebarOpen}
      onSidebarOpenChange={setSidebarOpen}
      toolbar={
        <LiquidGlassButton variant="icon" size={36} icon="plus"
          ariaLabel="新建" onClick={() => { /* 新建操作 */ }} />
      }
      statusBar="12 个项目"
    >
      {/* 应用内容 */}
    </MacWindow>
  );
}
```

工具栏复用 `LiquidGlassButton`，始终保持单行；标题随可用空间省略，控件放不下时横向滚动，工具栏高度保持 60px。需要组合 Base UI 菜单触发器时，传 `render={<Menu.Trigger />}`，无障碍属性、事件和定位 ref 会交给内部控制按钮。`sidebar`、`sidebarFooter`、`navigation`、`toolbar`、`children` 和 `statusBar` 都是内容插槽。窗口内容、亮边、描边和阴影独立分层，亮边与 0.5px SVG 描边复用 Floating Panel 样式，由 `installMacCorners` 管理同一条 16px 连续圆角轮廓。默认高度 560px，可用 `style` / `className` 覆盖；`onClose`、`onMinimize`、`onZoom` 交给应用实现，不传时对应窗口控制按钮禁用。图标导出使用 `npm run symbols`；Finder 预览中的原生文件夹图片可用 `SWIFT_MODULE_CACHE_PATH=/private/tmp CLANG_MODULE_CACHE_PATH=/private/tmp swift scripts/export-window-assets.swift` 重新导出。

## 共用浮层容器

Menu、Select 的选项菜单和 Popover 统一使用 `mac.floatingPanel` 的容器、材质和描边样式。`mac.menu`、`mac.select`、`mac.popover` 已组合这些公共类名，现有组件用法保持一致。`src/theme/floatingPanel.css` 负责分层与材质，`src/theme/floatingPanel.ts` 提供公共类名，连续圆角适配器统一处理亮边、0.5px 描边和外阴影。

也可以在其他浮层中单独使用这组样式，宽度、内边距与内容由使用方设置：

```tsx
import { mac } from './theme';

<div className={mac.floatingPanel.root} style={{ width: 260 }}>
  <div className={mac.floatingPanel.surface} aria-hidden="true" />
  <div className={mac.floatingPanel.border} aria-hidden="true" />
  <div className={mac.floatingPanel.content} style={{ padding: 16 }}>
    自定义浮层内容
  </div>
</div>
```

默认圆角为浅色 20px、深色 22px；在容器上设置 `data-size="compact"` 使用 12px 圆角，与 Menu 和 Select 一致。统一调整材质时覆盖 `--mac-floating-panel-material`、`--mac-floating-panel-blur`、`--mac-floating-panel-saturation`、`--mac-floating-panel-outline`、`--mac-floating-panel-edge-top/middle/bottom` 和 `--mac-floating-panel-shadow`，也可通过 `--mac-floating-panel-radius` 自定义圆角。材质层负责模糊，容器保持透明且不裁剪内容；Popover 的箭头轮廓继续与材质、描边和阴影同步。系统开启「减少透明度」时，三个组件和独立浮层都会在材质层回退为不透明背景。

## 液态玻璃分段控制

`LiquidGlassTabs` 将 Base UI Tabs 的交互与液态玻璃胶囊组合，使用方式与 Tabs 一致。外层直接使用胶囊玻璃按钮的 `thin` 主题材质、深浅色引擎与 HDR 高光，内部中性灰选中块以 220ms `ease-out` 滑动。预览地址为 `#components/liquid-glass-tabs`。

```tsx
import { LiquidGlassTabs } from './theme';

<LiquidGlassTabs.Root defaultValue="week">
  <LiquidGlassTabs.List appearance={appearance} aria-label="日历视图">
    <LiquidGlassTabs.Tab value="day">Day</LiquidGlassTabs.Tab>
    <LiquidGlassTabs.Tab value="week">Week</LiquidGlassTabs.Tab>
    <LiquidGlassTabs.Tab value="month">Month</LiquidGlassTabs.Tab>
    <LiquidGlassTabs.Tab value="year">Year</LiquidGlassTabs.Tab>
  </LiquidGlassTabs.List>
  <LiquidGlassTabs.Panel value="day">日视图</LiquidGlassTabs.Panel>
  <LiquidGlassTabs.Panel value="week">周视图</LiquidGlassTabs.Panel>
  <LiquidGlassTabs.Panel value="month">月视图</LiquidGlassTabs.Panel>
  <LiquidGlassTabs.Panel value="year">年视图</LiquidGlassTabs.Panel>
</LiquidGlassTabs.Root>
```

`List` 默认高度 40px，可用 `size` 自定义；`fullWidth` 让胶囊填满容器。`appearance` 随主题切换，`material`、`engine` 和 `forceCssFallback` 用于覆盖玻璃表现。组件采用水平布局；`Root`、`Tab`、`Panel` 沿用 Base UI 原语，支持受控或非受控状态、面板关联与单项禁用。方向键默认立即切换选中项，设置 `activateOnFocus={false}` 后用 Enter 或 Space 确认。减少动态效果模式下取消滑动。

## 液态玻璃搜索框

`LiquidGlassSearch` 使用现有 Liquid Glass 折射引擎和 Base UI Input，提供胶囊轮廓、柔和背景模糊（材质 `blur=4`）、细暗边和内侧高光。组件页为 `#components/liquid-glass-search`，预览中可以调整尺寸、文字、只读与禁用状态，并切换 CSS 模糊回退。

```tsx
import { LiquidGlassSearch } from './theme';

<LiquidGlassSearch
  appearance={appearance}
  value={query}
  onValueChange={setQuery}
  onSearch={search}
  aria-label="搜索文件"
  placeholder="Search"
/>
```

默认高度为 40px，`size` 可自定义高度；文档展示 32、40、48px 三种尺寸。宽度跟随容器，图标与字号跟随高度。`appearance` 与应用主题同步，图标和文字继承主题色。聚焦环紧贴玻璃外轮廓，以 220ms 从透明的 16px 收到主题色的 4px，失焦时以 160ms 淡出；减少动态效果模式下直接切换。输入后显示清除按钮，点击清除后仍聚焦输入框；Escape 清空，Enter 调用 `onSearch`，输入法组合期间不触发搜索。`clearable={false}` 关闭清除操作。只读或禁用时隐藏清除按钮。

支持 `value` / `onValueChange` 受控用法，也可用 `defaultValue` 设置非受控初始文字。原生输入属性（如 `name`、`autoComplete`、`aria-labelledby`）传给 Input，`ref` 指向原生输入框。`className` 和 `style` 作用于玻璃容器；`material` 与 `engine` 可按实例覆盖玻璃参数。和玻璃按钮一样，组件需在客户端渲染。

## 液态玻璃按钮

`LiquidGlassButton` 使用 `src/liquid-glass/` 中的折射引擎，源码来自 liquid-glass-lab，并接入项目的 Squircle Kit 平滑圆角。组件为每个实例烘焙位移贴图，采样背后页面的内容，边缘由内侧高光和完整外圈暗边组成；Chromium 走 SVG `backdrop-filter` 折射，Safari 和 Firefox 回退为磨砂模糊。这部分只在客户端运行，SSR 环境需要放在客户端边界内。

```tsx
import { LiquidGlassButton } from './theme';

<LiquidGlassButton variant="capsule" icon="plus" appearance={appearance} onClick={create}>新建</LiquidGlassButton>
<LiquidGlassButton variant="icon" icon="square.and.arrow.up" ariaLabel="共享" />
```


`variant` 决定外形与默认材质：`capsule` 是文字胶囊，`icon` 是圆形图标按钮，`prominent` 是强调色玻璃。`appearance` 跟随主题明暗，浅色使用白色镜片、深色使用深色镜片；传入 `material` 可以整体替换材质，取值是 `resolveGlassMaterial` 接受的预设名，或预设加 `scale`、`depth`、`tint`、`specular` 等覆盖参数。关闭 `backdrop` 只保留色调和高光。`hdrHighlight` 增加一层扩展亮度高光，`hdrHighlightStrength`（0–1，默认 0.7）控制它的覆盖强度；这一层只有在支持 HDR 的显示器上才能亮过纯白，否则受限于普通显示亮度，表现为更集中的高光核心。组件库页面的参数面板会显示当前显示器的 `dynamic-range` 判定结果。

`prominent` 的默认值为 `tint=0.8`、`scale=1.1`、`depth=7`、`specular=3.4`、`specularDecay=1.4`，并按实例使用 `edgeShadowWidth=0.5`、`edgeGlowStrength=0.76`、`edgeGlowSpread=9`、`edgeWidth=2`、`backdropContrast=0.3` 的引擎覆盖。

非 `prominent` 的 Capsule 和 Icon 在深色外观下统一使用 `fill=#9e9e9e`、`tint=0.3`、`specular=1.3`、`backdropContrast=0.54`。
所有非 `prominent` 材质无论明暗外观都使用 `scale=1.1`、`depth=7`。
非 `prominent` 的 `edgeShadow=0.2`；Prominent 保持 `edgeShadow=0.4`。
非 `prominent` 的 `glareEndFade=0.7`；Prominent 保持引擎默认值 `0.6`。
浅色且非 `prominent` 的按钮使用 `edgeWidth=1.3`、`edgeGlowStrength=0.04`、`edgeGlowSpread=4`、`edgeHighlight=0.65`。深色与 Prominent 沿用各自的材质和引擎参数。

玻璃按钮与按钮组的 `rimBrightness` 为浅色 `0.5`、深色 `0.18`（含 Prominent）。

玻璃按钮默认打开 `hdrHighlight`，`hdrHighlightStrength=0.8`。
按钮根节点在现有边缘阴影之外再叠加一层 `0 4px 10px rgba(0, 0, 0, .04)` 的柔和阴影，随按压缩放同步变化。

深色且非 `prominent` 的玻璃按钮默认使用 `edgeWidth=6`、`rimBrightness=0.18`、`edgeGlowStrength=0.09`、`glareOppositeFactor=0.7`。浅色模式仍使用 `edgeWidth=1.3`。`glareEndFade` 同时控制内侧亮边和外圈阴影受光段的纵向两端渐隐。

### 玻璃按钮组

`LiquidGlassButtonGroup` 让相关操作共用一个胶囊玻璃外壳，每个按钮独立交互，中央分隔线沿高度内缩。悬停时只在当前按钮内显示内缩圆形或胶囊底色，同时隐藏分隔线。预览地址为 `#components/liquid-glass-button-group`；Window 示例的前进后退也使用此组件。

```tsx
import { LiquidGlassButtonGroup } from './theme';

<LiquidGlassButtonGroup.Root ariaLabel="浏览历史" appearance={appearance} size={38}>
  <LiquidGlassButtonGroup.Button icon="chevron.left" aria-label="后退"
    disabled={!canGoBack} onClick={goBack} />
  <LiquidGlassButtonGroup.Button icon="chevron.right" aria-label="前进"
    disabled={!canGoForward} onClick={goForward} />
</LiquidGlassButtonGroup.Root>
```

`Root` 统一设置尺寸、明暗外观、`material`、`engine`、HDR 与 CSS 回退；浅色材质使用上面的非 Prominent 参数。`Button` 可传文字、图标和 Base UI 的 `render` 组合属性，支持原生 Tab、Enter、Space 和禁用状态。只禁用单个按钮时图标和文字变淡，玻璃外壳与分隔线保持完整；`Root disabled` 禁用整组操作。

引擎属性 `edgeShadowLitOpacity` 控制 `edgeShadow` 受光亮部的暗边强度，默认 `0.3`；设为 `0` 时受光侧完全透明、亮部最亮，设为 `1` 时与背光侧同样深，不改变背光侧和内弥散。

玻璃按钮文字使用 semibold。禁用时只把文字降到 40% 不透明度，玻璃本体、图标、边缘和阴影与启用态一致；Prominent 与非 Prominent 使用同一套禁用视觉。

所有玻璃按钮变体（包括 Prominent）按住时都以中心缩放至 `1.1`，缩放使用 `0.14s` 的缓动过渡，松开或移出后恢复。Hover 不改变 `backdropContrast`，只叠加一层 6% 的黑色半透明覆盖，避免在邮件 toolbar 这类均匀背景上出现难以察觉的滤镜变化。按压缩放同时有原生 `:active` 兜底。

传入 `forceCssFallback` 可以完全关闭 SVG filter：固定 `backdrop-filter: blur(1.5px)` 直接放在玻璃材质容器上，镜片和亮边/泛光改用 squircle `clip-path` 与烘焙 alpha mask。降级模式使用普通圆角和 70% 背景覆盖色，确保 Chromium 实际采样到并显示出模糊。这条路径用于不支持 SVG filter 的环境或降级演示。

镜片与边缘共用 Squircle Kit 平滑圆角轮廓：亮边位于内侧，`edgeWidth` 默认 1px；暗边位于外侧，`edgeShadowWidth` 默认 0.6px。外圈先铺一层支撑，再叠加从 `fill` 派生的同色系暗部，避免半透明着色与外圈页面背景混色。浅色模式使用 `fill` 作为不透明支撑；深色模式使用同色相、30% 亮度的暗色支撑，并让支撑透明度跟随 `edgeShadow`，因此不会在低阴影强度下形成固定黑圈。支撑层位于玻璃材质后方，并向轮廓内重叠一个纹素，重叠区域由材质和高光覆盖，因此能闭合亚像素底边缝隙，同时不会给非 Prominent 按钮增加额外亮边。暗边受光部分较淡、阴影部分较深，径向保持实边，仅边界抗锯齿；同一贴图只在光源切线方向的两侧向内柔和渐淡 20px，内侧强度为总阴影的 6%，可用 `edgeShadowInnerSpread`、`edgeShadowInnerStrength` 独立调整或设为 0 关闭。`specular`、`specularDecay` 和引擎级 `rimBrightness`（默认 1）控制窄亮边的强度、衰减与亮度；`rimBrightness` 同时缩放 HDR 亮边，不改变几何与泛光。定向泛光由 `edgeGlowStrength`、`edgeGlowSpread` 控制；整圈辉光由 `glow` 及其范围/指数控制。三种光照分别调节，面板按效果分组。亮边、定向泛光和整圈辉光从 `fill` 派生，外圈阴影在暗色支撑上着色，即使 `tint=0` 也会跟随。`mac.liquidGlassButton.selection` 是可选中的色块。`size` 同时决定高度和圆角。

`engine={{ backdropContrast: 0.25 }}` 可以降低玻璃内背景的对比度，减少背景文字对按钮的干扰。浅色模式的目标亮度跟随 `fill` 与 tint 颜色；深色模式则以 `0.25` 为最大目标亮度，并按 `fill` 色相缩放目标颜色，让黑色和深色背景收敛到暗部，同时保留一点层次。SVG 路径以线性收敛为基础，按亮度差做最多 15% 的温和调整：近处稍保留细节，远处稍增强压缩，保持明暗顺序。饱和度在收敛前处理，避免后置饱和度裁切颜色、破坏明暗关系。彩色着色时，背景色差同时向 `fill` 收敛，避免透出的中性灰降低按钮饱和度；亮度收敛曲线保持不变。CSS 模糊回退保留向同一颜色目标的线性收敛。默认值为 0.25，设为 1 恢复原样，0 完全收敛到目标亮度；按钮自己的文字、图标和外圈暗边不受影响。默认 SVG 背景饱和度为 3，浅色主题的 `tint=0`、`fill=#f5f5f5`。组件库参数面板可以实时调整这些值。

### 性能

每个实例挂载时按自身尺寸烘焙位移贴图（Canvas 绘制后编码成 PNG data URL），之后只在尺寸或材质参数变化时重新烘焙；相同尺寸和材质的实例共用缓存。渲染开销主要来自 `backdrop-filter` 的滤镜区域，随面积增长，因此整屏大量玻璃元素时建议减少实例数量或缩小尺寸。离屏实例不参与采样。

可以按需关闭的部分：`backdrop={false}` 去掉背景采样（只留色调和高光），`material` 里降低 `blur` 与 `scale` 会减少模糊与位移的计算量。悬停跟随指针的高光默认关闭；需要时传 `pointerHighlight={{ hoverStrength: 0.35 }}` 之类的参数打开，它会带来逐帧跟踪指针的开销。另外不要在玻璃下面再叠一层 `backdrop-filter`：两层背景模糊会让每个实例多一次全尺寸采样，实测会明显增加合成开销。

窗口、侧栏、工具栏和分组表面也有可复用类名：`mac.window`、`mac.sidebarSurface`、`mac.toolbarSurface`、`mac.groupedSurface`。侧栏项目使用 `mac.sidebarRow`，配合 `data-active` 和 `data-selection="neutral"` 或 `"accent"`，分别得到邮件列表中的中性选中态和系统设置中的强调色选中态。两个场景的排版细节位于 `src/scenes.css`，主题库构建仅包含通用类名。

直接引用 `src/theme` 时，入口会加载 CSS。使用 `dist-theme/` 构建产物时，还需在应用入口加载 `dist-theme/theme.css`。页面根节点建议设置 `isolation: isolate`；在 iOS Safari 中使用弹层时，让 `body` 保持 `position: relative`。

## 连续圆角

主题使用 Squircle Kit（包名 `smooth-corners`，版本 0.1.0）绘制连续曲线，项目内的副本位于 `vendor/squircle-kit/`。曲线沿用 Electron 的连续圆角几何，平滑度固定为 0.6。调用 `installMacCorners(root)` 后，按钮、输入框、开关轨道与滑块、复选框、分组表面、菜单、选择器弹层、对话框和窗口会自动应用曲线；新挂载的 Base UI Portal 也会被处理。函数返回清理方法，可在应用卸载时调用。预览页的额外卡片、导航项和场景元素通过第二个参数传入选择器。

Squircle Kit 的 `clip-path` 会裁掉元素自身的外阴影。窗口需要在外层使用 `mac.windowShadowHost`，对话框使用 `mac.dialog.shadowHost`；菜单、选择器、Tooltip、Popover 和开关滑块的阴影由适配器生成独立 SVG 层，沿用对应表面的路径。对话框的 `mac.dialog.surface` 与 `mac.dialog.border` 分别绘制连续圆角背景和内侧 SVG 描边，内容放在 `mac.dialog.content` 中。开关轨道、开关滑块、Tabs 和对话框内的胶囊按钮也使用 0.6 平滑度：短边保持半圆，长边保留平滑过渡。滑动条滑块、圆形图标和其他胶囊按钮保持原来的几何形状。浏览器不支持 `clip-path: path()` 时，现有 `border-radius` 提供回退。

Select 菜单整体使用 12px 连续圆角，选项使用 6px 连续圆角。菜单本体不裁剪：独立的 `mac.select.backdrop` 层负责连续圆角、背景模糊与上下白色高光，`mac.select.border` 层使用 Squircle Kit 的 `data-squircle-border` SVG 绘制 0.5px 灰色描边。主题中的图标按钮、输入框、复选框、Menu、Select、Dialog、Tooltip 和 Popover 的 SVG 描边统一复用背景外轮廓，画双倍线宽并裁掉外侧一半，避免缩小圆角生成描边带来的轮廓偏差。Select Positioner 不使用 `filter`，让背景模糊可以采样弹层后面的页面；阴影滤镜位于独立的 SVG 兄弟层。输入框聚焦时，可见描边加粗到 2.5px，外轮廓保持不变。不支持曲线裁剪时由普通 CSS 圆角和边框回退。

Menu、Select、Popover 的表面亮边和输入框的内侧暗边由渐变 SVG 描边绘制，键盘焦点环也沿用对应表面的路径。适配器还会将被管理元素的四边等宽纯色 CSS 边框转为 SVG，保留原边框宽度占据的布局空间；单边分隔线继续使用 CSS。尺寸变化、选中项变化、外观切换或浮层卸载时，描边和阴影会同步更新或清理。

Tabs 使用灰色胶囊背景和白色胶囊选中项，均不绘制装饰描边或阴影。`mac.tabs.surface` 承载底色；旧的 `mac.tabs.border` 类名保留兼容，但不显示。键盘操作时仍提供焦点提示。

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
