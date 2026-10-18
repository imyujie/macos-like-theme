# Liquid Glass（内置副本）

这个目录是按原样并入的 liquid-glass-lab 源码，用来实现主题里的 `LiquidGlassButton`。

- `liquid-glass.tsx` — 组件、公开类型与实例级位移贴图烘焙
- `liquid-glass.css` — 组件样式，由 `liquid-glass.tsx` 自己引入
- `refraction/` — Canvas/SVG 镜片贴图生成与引擎参数
- `materials/` — 材质预设与明暗变换
- `browser-support.ts`、`viewport-visibility.ts` — 浏览器回退与离屏实例的采样开关
- `assets/hdr-white-pq.avif` — 扩展亮度高光层用的 PQ/BT.2020 光源

## 本地改动

- 文件位置：源码放在 `src/liquid-glass/` 下，示例页（`App.tsx`、`demo-controls.tsx`、`demo.css`）和示例背景图没有并入。
- `liquid-glass.tsx` 的重烘焙依赖列表去掉了 `tint`、`fill` 和 `backdrop`。这三项只影响颜色合成、CSS 变量和背景层是否渲染，不参与位移贴图计算；保留在列表里会让每次切换明暗或关闭 `backdrop` 都重烘焙全部贴图，并因为烘焙状态携带滤镜序号而重建整张 SVG 滤镜图。24 个实例实测切换外观的耗时从 206ms 降到 135ms。
- 表面、折射、高光和阴影共用 squircle-kit 的平滑圆角轮廓。`edgeHighlight` 从轮廓向内衰减，宽度由 `edgeWidth` 控制，默认 1px；`edgeShadow` 的外侧暗环宽度由 `edgeShadowWidth` 控制，默认 0.6px，宽度内的径向透明度恒定，只有内外边界按纹素面积计算抗锯齿覆盖率。外圈先由独立遮罩铺一层支撑，再把阴影遮罩叠在它上面，因此扩展区不会透出页面背景或被半透明填充染成浅色光晕。浅色模式使用 `fill` 作为不透明支撑；深色模式使用同色相、30% 亮度的暗色支撑，并让支撑透明度跟随 `edgeShadow`，避免固定黑圈。支撑层位于玻璃材质后方，并向轮廓内额外重叠一个纹素：重叠区域被材质和高光覆盖，既能闭合底边亚像素缝隙，也不会压出一条额外的亮边。同一张阴影贴图仅在与光源方向相切的两侧包含向内平方衰减的柔和阴影：`edgeShadowInnerSpread=20px`、`edgeShadowInnerStrength=0.06`（相对于 `edgeShadow`，主题默认最大约 2.4% 不透明度）；任一内阴影参数设为 0 可恢复只有外圈的效果，不增加额外描边或模糊图层。
- 三种光照职责分开：`specular` 只给窄亮边施加增益，`specularDecay` 只控制这条亮边的向内衰减，引擎级 `rimBrightness`（默认 1）再单独缩放窄亮边与 HDR 亮边的亮度；`edgeGlowStrength=0.05`、`edgeGlowSpread=10px` 控制定向泛光强度和范围，固定平方衰减，不再叠加 `specularDecay`；`glow` 控制整圈辉光，自己的范围和衰减分别为 `glowSpread`、`glowExponent`，主题默认关闭。定向泛光在 `specular=0` 或 `edgeHighlight=0` 时仍可独立显示。`edgeExponent=1`、`specularAngle` 和两端渐隐仍表示共用光源的方向与角分布。调参面板按效果分组并提供独立复位。
- 窄亮边和柔和光照分别烘焙为白色/alpha 遮罩，在 tint、SVG backdrop 和 iOS 回退中分别施加增益，避免全局 `specular` 又放大泛光。backdrop 两个光照项都读取原来的 `quietBackdrop`，分别计算贡献再相加，避免串联放大。可选 HDR 只使用窄亮边遮罩。
- `refraction/lighting.ts` 从最终 `fill` 派生光照颜色：窄亮边仅混入 10% 白色，泛光仅混入 3% 白色，保留基色饱和度；外圈阴影先在不透明 `fill` 上叠加同色系暗部，彩色材质的暗部保留基色色相。遮罩只存几何与透明度，SVG、iOS 回退、HDR 和指针高光在合成时着色；`tint=0` 时光照颜色也生效。HDR 只在元素自身的背景图内混色，不给材质祖先添加 CSS filter 或 mix-blend-mode。
- `edgeShadow` 在同一张贴图内绘制完整的实心暗边和两侧向内软阴影，受光处保留 30% 暗边，阴影处加深至完整强度；明暗方向跟随 `specularAngle`，其受光段的纵向两端与内侧亮边共用 `glareEndFade`，不受高光增益、泛光或衰减参数影响。
- `edgeShadowLitOpacity` 默认 0.3，单独控制外圈阴影受光亮部的不透明度：0 时受光侧完全透明、亮部最亮，1 时与背光侧同样深；不会改变背光侧强度、阴影宽度或两侧内弥散。
- `specularAngle` 统一采用屏幕光源方向（0° 上、90° 左、180° 下、270° 右），内圈高光与外圈阴影都用同一个有符号法线点积判断受光面。两端渐隐分别计算各镜像象限的切向投影，并用真实平滑轮廓的投影跨度归一化；`specular` 只改变增益。尺寸或可见性变化时通过最新材质重新烘焙，避免观察器闭包读回初始角度。
- SVG 的 tint 和 backdrop 两条高光合成都使用独立的白色/alpha 贴图，alpha 与原来 `(B−128)/255` 的强度一致。避免在滤镜里从 X 位移贴图的 B 通道提取遮罩；该路径在 Chromium 实测出现固定朝左的亮斑，高增益时尤其明显，光照贴图正确旋转也无法消除。`specularMaskAlphaOffset` 保留为窄亮边遮罩的独立 alpha 偏移，不作用于柔和光照，RGB 在合成时取 `fill` 派生的高光颜色，既不混入位移通道也不重新烘焙贴图。
- `backdropContrast` 默认 0.25，按背景与目标颜色的亮度差温和地非线性收敛。浅色模式的目标 `T` 取最终 `fill` 的 sRGB 加权值（0.2126R + 0.7152G + 0.0722B）；深色模式把目标亮度封顶到 `0.25`，并将 `fill` 的色相按该亮度缩放，避免中性深色材质把黑色背景抬到中灰。背景亮度为 `L`，同侧最大距离为 `R`（暗侧 T，亮侧 1−T），归一化距离 `d=|L−T|/R`，保留系数 `w=c×[1+0.15(1−c)(1−2d²)]`，输出亮度为 `T+(L−T)w`。相对线性收敛的调整幅度最多 15%，近处稍保留细节、远处稍增强压缩，不再把远端保留量平方。输出亮度导数至少为 `0.25c`，避免远端成为平台；1025 点亮度 LUT 插值也检查严格单调。SVG 饱和度在收敛之前处理，避免后置饱和度裁切颜色、破坏最终的明暗关系。亮度与色差分离：亮度直接映射、色差按 c 向由 `fill` 和 `tint` 决定的色差目标收敛，再还原 RGB，保留原 alpha，避免中间 alpha 遮罩混合的量化误差。色差目标保留目标亮度：浅色模式 `tint=0` 时仍为同亮度中性灰，`tint=1` 时为完整 `fill`；深色模式保留缩放后的色相。色差以字节 128 编码零点，避免中性灰偏色；用真实组件的黑到白灰阶检查显示效果（允许浏览器一个色阶的抖动，空间平均灰阶保持单调）。只处理背景采样，前景文字、图标与外圈不受影响；1 恢复原样，0 完全收敛。Chromium 在 SVG 折射之后、高光之前处理；Safari/Firefox 的 CSS 模糊回退保留向同一颜色目标的线性覆盖。修改对比度或 tint 颜色时不重新烘焙位移贴图。

平滑圆角使用项目内置的 squircle-kit。原始目录没有附带许可文件，如需对外分发请先确认授权。

主题侧的使用方式见根目录 README 的「液态玻璃按钮」一节，包装组件位于 `src/theme/LiquidGlassButton.tsx`。

`forceCssFallback` 会完全跳过 SVG filter：固定 `backdrop-filter: blur(1.5px)` 直接放在玻璃材质容器上，镜片 tint、亮边和泛光改用 squircle `clip-path` 与烘焙 alpha mask 的 CSS 图层。blur 位于材质容器而不是单独的子采样层，Chromium 在这种结构中才能实际采到页面背板；降级模式同时使用普通 `border-radius` 和 70% 背景覆盖色。降级路径不会生成或引用任何 SVG `filter` 节点。
