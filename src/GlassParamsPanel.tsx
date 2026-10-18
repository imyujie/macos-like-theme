import type { ReactNode } from 'react';
import {
  mac,
  resolveGlassEngine,
  resolveGlassMaterial,
  SfSymbol,
  useHdrDisplayRange,
  type GlassEngineParams,
  type GlassMaterialInput,
  type GlassMaterialMode,
  type GlassMaterialParams,
  type GlassPointerHighlightParams,
} from './theme';

/** Everything the LiquidGlass surface exposes, in one editable object. */
export type GlassTuning = {
  size: number;
  /** `auto` follows the docs appearance; `dark` hands the material through untouched. */
  materialMode: GlassMaterialMode | 'auto';
  material: Partial<GlassMaterialParams>;
  pointerEnabled: boolean;
  pointer: Partial<GlassPointerHighlightParams>;
  engine: Partial<GlassEngineParams>;
  hdrEnabled: boolean;
  /** `hdrHighlightStrength`, 0–1. */
  hdrStrength: number;
};

export const initialGlassTuning: GlassTuning = {
  size: 40,
  materialMode: 'auto',
  material: {},
  pointerEnabled: false,
  pointer: {},
  engine: {},
  hdrEnabled: true,
  hdrStrength: 0.8,
};

type RangeSpec = {
  key: string;
  min: number;
  max: number;
  step: number;
  hint: string;
};

/** Material keys in the order the engine consumes them. */
const MATERIAL_SPECS: RangeSpec[] = [
  { key: 'scale', min: 0, max: 6, step: 0.01, hint: '折射位移强度（px）' },
  { key: 'depth', min: 0, max: 40, step: 0.5, hint: '倒角深度（px）' },
  { key: 'curvature', min: 0, max: 1, step: 0.01, hint: '镜片曲率' },
  { key: 'splay', min: 0, max: 1, step: 0.01, hint: '边缘方向外扩' },
  { key: 'chroma', min: 0, max: 1, step: 0.01, hint: '色散；0 走单通道快路径' },
  { key: 'blur', min: 0, max: 20, step: 0.1, hint: '背景模糊（px）' },
  { key: 'glow', min: 0, max: 1, step: 0.01, hint: '整圈辉光强度，独立于 specular 和定向泛光' },
  { key: 'edgeHighlight', min: 0, max: 3, step: 0.01, hint: '亮边基础系数；日常调强度使用 specular' },
  { key: 'edgeShadow', min: 0, max: 1, step: 0.01, hint: '外圈与向内软阴影的总强度' },
  { key: 'highlightCompress', min: 0, max: 4, step: 0.05, hint: '高光压缩伽马，0 关闭' },
  { key: 'specularAngle', min: 0, max: 360, step: 1, hint: '光源角度（0° 上、90° 左、180° 下、270° 右）' },
  { key: 'specular', min: 0, max: 6, step: 0.01, hint: '仅放大窄亮边，不改变两种泛光' },
  { key: 'specularDecay', min: 0.1, max: 12, step: 0.1, hint: '仅控制窄亮边向内衰减，越大越集中' },
  { key: 'tint', min: 0, max: 1, step: 0.01, hint: '着色浓度' },
];

const ENGINE_SPECS: RangeSpec[] = [
  { key: 'backdropContrast', min: 0, max: 1, step: 0.01, hint: '离目标亮度越远，收敛越强；深色模式目标亮度上限为 0.2；1 原样，0 完全收敛' },
  { key: 'mapQuality', min: 64, max: 512, step: 8, hint: '位移贴图长边下限' },
  { key: 'mapMaxPixels', min: 16384, max: 262144, step: 4096, hint: '贴图面积上限' },
  { key: 'glowSpread', min: 0, max: 1, step: 0.01, hint: '内侧辉光扩散' },
  { key: 'glowExponent', min: 0.5, max: 6, step: 0.1, hint: '内侧辉光指数' },
  { key: 'edgeWidth', min: 0.2, max: 6, step: 0.1, hint: '内圈高光宽度（px）' },
  { key: 'rimBrightness', min: 0, max: 3, step: 0.01, hint: '亮边亮度倍数，不改变宽度和泛光' },
  { key: 'edgeShadowWidth', min: 0.2, max: 6, step: 0.1, hint: '外圈实边宽度（px），不产生弥散' },
  { key: 'edgeShadowInnerSpread', min: 0, max: 20, step: 0.5, hint: '阴影向内渐淡的距离（px），0 关闭' },
  { key: 'edgeShadowInnerStrength', min: 0, max: 1, step: 0.01, hint: '向内阴影占 edgeShadow 的比例' },
  { key: 'edgeShadowLitOpacity', min: 0, max: 1, step: 0.01, hint: '受光侧暗边强度，越小亮部越亮；1 与暗侧相同' },
  { key: 'edgeExponent', min: 0.2, max: 6, step: 0.1, hint: '边缘高光指数' },
  { key: 'edgeGlowSpread', min: 0, max: 40, step: 0.5, hint: '定向泛光向内延伸距离（px）' },
  { key: 'edgeGlowStrength', min: 0, max: 1, step: 0.01, hint: '定向泛光强度，不受 specular/Decay 影响' },
  { key: 'chromaRedBoost', min: 0, max: 2, step: 0.01, hint: 'R 通道倍数' },
  { key: 'chromaGreenBoost', min: 0, max: 2, step: 0.01, hint: 'G 通道倍数' },
  { key: 'backdropBlurPadMultiplier', min: 0, max: 6, step: 0.1, hint: '模糊留白倍数' },
  { key: 'backdropBlurPadExtra', min: 0, max: 40, step: 1, hint: '模糊留白额外值' },
  { key: 'backdropSaturateSvg', min: 1, max: 3, step: 0.01, hint: 'SVG 路径饱和度' },
  { key: 'backdropSaturateCssBlur', min: 1, max: 3, step: 0.01, hint: '模糊回退饱和度' },
  { key: 'cssBlurFallbackMultiplier', min: 1, max: 8, step: 0.1, hint: '回退模糊倍数' },
  { key: 'specularMaskAlphaOffset', min: -1, max: 0, step: 0.001, hint: '仅窄亮边遮罩的 alpha 偏移' },
  { key: 'glareOppositeFactor', min: 0, max: 1, step: 0.01, hint: '对侧反光强度' },
  { key: 'glareEndFade', min: 0, max: 1, step: 0.01, hint: '反光两端渐隐' },
  { key: 'specularColorPreserve', min: 0, max: 1, step: 0.01, hint: '高光保留背景色比例' },
];

const LIGHT_GROUPS = [
  { title: '光源方向', note: '定向亮边、定向泛光和阴影共用光源；对侧反光影响背景朝向，两端渐隐同时作用于亮边与外圈阴影受光段。整圈辉光不随角度变化。', material: ['specularAngle'], engine: ['edgeExponent', 'glareOppositeFactor', 'glareEndFade'] },
  { title: '亮边', note: '窄亮边的强度、亮度、宽度和衰减。调这些参数不会改变泛光。', material: ['specular', 'specularDecay'], engine: ['rimBrightness', 'edgeWidth'] },
  { title: '定向泛光', note: '沿受光亮弧向内柔和扩散，固定为平方衰减。仅用强度和距离控制，独立于亮边增益与衰减；强度为 0 可关闭。', material: [], engine: ['edgeGlowStrength', 'edgeGlowSpread'] },
  { title: '整圈辉光', note: '均匀围绕轮廓的辉光。默认关闭，独立于定向亮边和泛光。', material: ['glow'], engine: ['glowSpread', 'glowExponent'] },
  { title: '边缘阴影', note: '外圈先铺不透明 fill 作为支撑，再叠加同色系暗部，避免半透明 fill 与外圈背景混色；仅边界抗锯齿。edgeShadowLitOpacity 单独控制受光亮部，内弥散只出现在光源切线方向的两侧。', material: ['edgeShadow'], engine: ['edgeShadowWidth', 'edgeShadowLitOpacity', 'edgeShadowInnerStrength', 'edgeShadowInnerSpread'] },
];

const LIGHT_MATERIAL_KEYS = new Set(LIGHT_GROUPS.flatMap(group => group.material));
const LIGHT_ENGINE_KEYS = new Set(LIGHT_GROUPS.flatMap(group => group.engine));

type Props = {
  /** The material the button actually renders: theme default or the chosen preset. */
  base: GlassMaterialInput;
  /** The mode the button resolves that material with. */
  mode: GlassMaterialMode;
  /** Variant-level engine defaults, before per-instance overrides. */
  engineBase?: Partial<GlassEngineParams>;
  tuning: GlassTuning;
  onChange: (next: GlassTuning) => void;
};

function format(value: number, step: number) {
  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : 3;
  return Number(value.toFixed(decimals));
}

function ResetButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" className="docs-param-reset" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      <SfSymbol name="arrow.clockwise" size={11} />
    </button>
  );
}

function RangeRow({
  spec,
  value,
  overridden,
  onChange,
  onReset,
}: {
  spec: RangeSpec;
  value: number;
  overridden: boolean;
  onChange: (value: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="docs-param-row" data-overridden={overridden || undefined}>
      <span className="docs-param-name">
        <code>{spec.key}</code>
        <small>{spec.hint}</small>
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-label={spec.key}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        type="number"
        className="docs-param-number"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={format(value, spec.step)}
        aria-label={`${spec.key} 数值`}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(Math.min(spec.max, Math.max(spec.min, next)));
        }}
      />
      <ResetButton label={`${spec.key} 复位`} disabled={!overridden} onClick={onReset} />
    </div>
  );
}

function Group({
  title,
  note,
  changed,
  onReset,
  children,
}: {
  title: string;
  note: string;
  changed: number;
  onReset: () => void;
  children: ReactNode;
}) {
  return (
    <section className="docs-panel docs-param-group">
      <header>
        <h3>{title}</h3>
        <span>{changed > 0 ? `已改 ${changed} 项` : '默认值'}</span>
        <button type="button" className="docs-choice-button" onClick={onReset} disabled={changed === 0}>复位</button>
      </header>
      <p className="docs-param-note">{note}</p>
      <div className="docs-param-list">{children}</div>
    </section>
  );
}

export function GlassParamsPanel({ base, mode, engineBase, tuning, onChange }: Props) {
  // Resolve with the same mode the component uses, so a slider always shows the
  // value that is actually on screen — including the light transform's effect.
  const baseInput = typeof base === 'string' ? { preset: base } : base;
  const resolvedMaterial = resolveGlassMaterial({ ...baseInput, ...tuning.material }, mode);
  const resolvedEngine = resolveGlassEngine({ ...engineBase, ...tuning.engine });
  const hdrRange = useHdrDisplayRange();

  const geometryChanged = (tuning.size !== initialGlassTuning.size ? 1 : 0) + (tuning.materialMode !== 'auto' ? 1 : 0);
  const hdrChanged = (tuning.hdrEnabled ? 1 : 0) + (tuning.hdrStrength !== initialGlassTuning.hdrStrength ? 1 : 0);
  const changedTotal = geometryChanged + Object.keys(tuning.material).length + Object.keys(tuning.engine).length + hdrChanged;

  const setMaterial = (key: keyof GlassMaterialParams, value: number | string | undefined) => {
    const material = { ...tuning.material };
    if (value === undefined) delete material[key];
    else (material as Record<string, number | string>)[key] = value;
    onChange({ ...tuning, material });
  };

  const setEngine = (key: keyof GlassEngineParams, value: number | undefined) => {
    const engine = { ...tuning.engine };
    if (value === undefined) delete engine[key];
    else engine[key] = value;
    onChange({ ...tuning, engine });
  };

  const materialRow = (spec: RangeSpec) => <RangeRow key={spec.key} spec={spec}
    value={resolvedMaterial[spec.key as keyof GlassMaterialParams] as number}
    overridden={spec.key in tuning.material}
    onChange={(value) => setMaterial(spec.key as keyof GlassMaterialParams, value)}
    onReset={() => setMaterial(spec.key as keyof GlassMaterialParams, undefined)} />;
  const engineRow = (spec: RangeSpec) => <RangeRow key={spec.key} spec={spec}
    value={resolvedEngine[spec.key as keyof GlassEngineParams]}
    overridden={spec.key in tuning.engine}
    onChange={(value) => setEngine(spec.key as keyof GlassEngineParams, value)}
    onReset={() => setEngine(spec.key as keyof GlassEngineParams, undefined)} />;

  return (
    <section className="docs-section docs-params" aria-labelledby="params-heading">
      <div className="docs-section-heading">
        <div>
          <h2 id="params-heading">Liquid Glass 参数</h2>
          <p>调整玻璃材质与引擎参数，四组预览实时同步；改动过的项标蓝，可单项或整组复位。</p>
        </div>
        <span>{changedTotal > 0 ? `已改动 ${changedTotal} 项` : '当前为预设默认值'}</span>
      </div>

      <div className="docs-param-groups">
        <Group
          title="几何与外观"
          note="size 同时决定高度和圆角。「跟随外观」时浅色外观会给预设值套一层变换；你手动改过的项按原值生效，不再套变换。"
          changed={geometryChanged}
          onReset={() => onChange({ ...tuning, size: initialGlassTuning.size, materialMode: 'auto' })}
        >
          <RangeRow
            spec={{ key: 'size', min: 16, max: 64, step: 1, hint: `高度 ${tuning.size}px，圆角 ${tuning.size / 2}px` }}
            value={tuning.size}
            overridden={tuning.size !== initialGlassTuning.size}
            onChange={(value) => onChange({ ...tuning, size: value })}
            onReset={() => onChange({ ...tuning, size: initialGlassTuning.size })}
          />
          <div className="docs-param-row">
            <span className="docs-param-name"><code>materialMode</code><small>材质变换</small></span>
            <select
              className="docs-param-select"
              value={tuning.materialMode}
              aria-label="materialMode"
              onChange={(event) => onChange({ ...tuning, materialMode: event.target.value as GlassMaterialMode | 'auto' })}
            >
              <option value="auto">跟随外观</option>
              <option value="dark">原样（跳过变换）</option>
              <option value="light">强制浅色变换</option>
            </select>
          </div>
        </Group>

        {LIGHT_GROUPS.map(group => <Group key={group.title} title={group.title} note={group.note}
          changed={group.material.filter(key => key in tuning.material).length + group.engine.filter(key => key in tuning.engine).length}
          onReset={() => {
            const material = { ...tuning.material }, engine = { ...tuning.engine };
            for (const key of group.material) delete material[key as keyof GlassMaterialParams];
            for (const key of group.engine) delete engine[key as keyof GlassEngineParams];
            onChange({ ...tuning, material, engine });
          }}>
          {group.material.map(key => materialRow(MATERIAL_SPECS.find(spec => spec.key === key)!))}
          {group.engine.map(key => engineRow(ENGINE_SPECS.find(spec => spec.key === key)!))}
        </Group>)}

        <Group
          title="材质 material"
          note="折射、背景模糊与着色。未改动项取预设值，手动改动按原值覆盖；edgeHighlight 是亮边的基础系数，日常强度调整使用上方 specular。"
          changed={Object.keys(tuning.material).filter(key => !LIGHT_MATERIAL_KEYS.has(key)).length}
          onReset={() => onChange({ ...tuning, material: Object.fromEntries(Object.entries(tuning.material).filter(([key]) => LIGHT_MATERIAL_KEYS.has(key))) })}
        >
          {MATERIAL_SPECS.filter(spec => !LIGHT_MATERIAL_KEYS.has(spec.key)).map(materialRow)}
          <div className="docs-param-row" data-overridden={('fill' in tuning.material) || undefined}>
            <span className="docs-param-name"><code>fill</code><small>材质与光照基色</small></span>
            <input
              type="color"
              className="docs-param-color"
              value={resolvedMaterial.fill}
              aria-label="fill"
              onChange={(event) => setMaterial('fill', event.target.value)}
            />
            <input
              type="text"
              className="docs-param-number docs-param-hex"
              value={resolvedMaterial.fill}
              aria-label="fill 十六进制"
              onChange={(event) => setMaterial('fill', event.target.value)}
            />
            <ResetButton label="fill 复位" disabled={!('fill' in tuning.material)} onClick={() => setMaterial('fill', undefined)} />
          </div>
        </Group>

        <Group
          title="高光层 hdrHighlight"
          note={hdrRange
            ? '当前显示器有 HDR 余量，这一层可以亮过纯白。强度按实例缩放高光的覆盖范围。'
            : '当前显示器没有 HDR 余量，这一层受限于普通显示亮度，表现为更集中的高光核心；颜色仍跟随 fill。'}
          changed={hdrChanged}
          onReset={() => onChange({ ...tuning, hdrEnabled: false, hdrStrength: initialGlassTuning.hdrStrength })}
        >
          <div className="docs-param-row" data-overridden={tuning.hdrEnabled || undefined}>
            <span className="docs-param-name"><code>hdrHighlight</code><small>扩展亮度高光层</small></span>
            <input
              type="checkbox"
              className="docs-param-check"
              checked={tuning.hdrEnabled}
              aria-label="启用 hdrHighlight"
              onChange={(event) => onChange({ ...tuning, hdrEnabled: event.target.checked })}
            />
          </div>
          <RangeRow
            spec={{ key: 'hdrHighlightStrength', min: 0, max: 1, step: 0.01, hint: '高光覆盖强度 0–1' }}
            value={tuning.hdrStrength}
            overridden={tuning.hdrStrength !== initialGlassTuning.hdrStrength}
            onChange={(value) => onChange({ ...tuning, hdrStrength: value })}
            onReset={() => onChange({ ...tuning, hdrStrength: initialGlassTuning.hdrStrength })}
          />
          <div className="docs-param-row">
            <span className="docs-param-name"><code>dynamic-range</code><small>显示器能力（只读）</small></span>
            <span className="docs-param-readout">{hdrRange ? 'high' : 'standard'}</span>
          </div>
        </Group>

        <Group
          title="引擎 engine"
          note="共享常量，按实例覆盖。backdropContrast 在线性收敛附近按亮度差温和调整：近处稍保留细节、远处稍加强，保持明暗顺序；饱和度在收敛前处理。CSS 模糊回退保留线性收敛。对比度、饱和度直接更新滤镜，贴图尺寸与边缘形状参数会重新烘焙。"
          changed={Object.keys(tuning.engine).filter(key => !LIGHT_ENGINE_KEYS.has(key)).length}
          onReset={() => onChange({ ...tuning, engine: Object.fromEntries(Object.entries(tuning.engine).filter(([key]) => LIGHT_ENGINE_KEYS.has(key))) })}
        >
          {ENGINE_SPECS.filter(spec => !LIGHT_ENGINE_KEYS.has(spec.key)).map(engineRow)}
        </Group>
      </div>

      <p className="docs-param-footnote">
        引擎默认值来自 <code>src/liquid-glass/refraction/engine.json</code>，材质预设来自 <code>src/liquid-glass/materials/materials.json</code>；
        这里的改动会同步作用于各个背景中的 <code>{mac.liquidGlassButton.root}</code> 预览实例。
      </p>
    </section>
  );
}
