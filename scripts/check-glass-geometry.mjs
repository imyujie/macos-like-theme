import assert from 'node:assert/strict';
import { computeCorners, smoothRoundRectPath } from 'smooth-corners';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { createLensShape } = await server.ssrLoadModule('/src/liquid-glass/refraction/shape.ts');
  const { computeLensMap, computeShadowPixels } = await server.ssrLoadModule('/src/liquid-glass/refraction/lens-map.ts');
  const { glassLightingPalette, glassLightingMaskMatrix } = await server.ssrLoadModule('/src/liquid-glass/refraction/lighting.ts');
  const { buildLensMapParams, glassEngine, backdropContrastTransfer, backdropContrastRetention, backdropContrastTableValues, glassSurfaceCssVars, specularCompositeCoefficients, BACKDROP_TO_LUMA_CHROMA, BACKDROP_FROM_LUMA_CHROMA, BACKDROP_CHROMA_CENTER } = await server.ssrLoadModule('/src/liquid-glass/refraction/engine.ts');
  const matrix = (values, rgba) => values.split(' ').map(Number).reduce((output, _, i, entries) => {
    if (i % 5 === 0) output.push(entries.slice(i, i + 4).reduce((sum, value, channel) => sum + value * rgba[channel], entries[i + 4]));
    return output;
  }, []);
  const baseSpecular = specularCompositeCoefficients(2, { ...glassEngine, rimBrightness: 1 });
  const halfSpecular = specularCompositeCoefficients(2, { ...glassEngine, rimBrightness: 0.5 });
  assert.ok(Math.abs(halfSpecular.k1 - baseSpecular.k1 * 0.5) < 1e-12,
    'rimBrightness must scale the backdrop rim independently');
  assert.ok(Math.abs(halfSpecular.k2 - baseSpecular.k2 * 0.5) < 1e-12,
    'rimBrightness must scale the additive rim independently');
  for (const fill of ['#000000', '#808080', '#f5f5f5', '#ffffff']) {
    const palette = glassLightingPalette(fill);
    const base = [1, 3, 5].map(i => Number.parseInt(fill.slice(i, i + 2), 16) / 255);
    assert.deepEqual(palette.highlight, [1, 1, 1], 'Neutral fills must keep white rim lighting');
    assert.deepEqual(palette.glow, [1, 1, 1], 'Neutral fills must keep white glow');
    assert.deepEqual(palette.shadow, [0, 0, 0], 'Neutral fills must keep a dark edge');
    assert.deepEqual(palette.shadowSupport, base, 'Light mode must keep fill support behind the edge');
    const darkPalette = glassLightingPalette(fill, 'dark');
    assert.ok(darkPalette.shadowSupport.every((channel, i) => Math.abs(channel - base[i] * 0.3) < 1e-12),
      'Dark mode must use a dark hue-preserving edge support');
  }
  for (const fill of ['#3478f6', '#ff0000', '#00ff00', '#0000ff', '#ba35d8', '#ffa82e', '#143725']) {
    const base = [1, 3, 5].map(i => Number.parseInt(fill.slice(i, i + 2), 16) / 255);
    const palette = glassLightingPalette(fill);
    const luminance = rgb => rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    assert.ok(luminance(palette.highlight) > luminance(base), 'Fill-derived rim must brighten the base');
    assert.ok(luminance(palette.glow) > luminance(base), 'Fill-derived glow must brighten the base');
    assert.ok(luminance(palette.shadow) < luminance(base), 'The edge shade must darken the opaque fill');
    const saturation = rgb => (Math.max(...rgb) - Math.min(...rgb)) / Math.max(...rgb);
    assert.ok(saturation(palette.highlight) >= saturation(base) * 0.85,
      'Rim lighting must not wash a colored fill into a pastel');
    assert.ok(saturation(palette.glow) >= saturation(base) * 0.95,
      'Soft lighting must retain the fill saturation');
    for (const color of Object.values(palette)) {
      assert.ok(color.every(channel => channel >= 0 && channel <= 1), 'Lighting colors must stay in gamut');
      assert.ok(Math.abs((color[0] - color[1]) * (base[1] - base[2]) - (color[1] - color[2]) * (base[0] - base[1])) < 1e-12,
        'Highlights, glow and shadow must retain the fill hue');
      for (const alpha of [0, .01, .2, 1]) {
        const output = matrix(glassLightingMaskMatrix(color), [1, 1, 1, alpha]);
        assert.equal(output[3], alpha, 'Recoloring must preserve the mask alpha/falloff exactly');
      }
    }
  }
  for (const [fill, target] of [['#ffffff', 1], ['#000000', 0], ['#808080', 128 / 255], ['#ff0000', 0.2126], ['#00ff00', 0.7152], ['#0000ff', 0.0722]]) {
    for (const contrast of [0, 0.01, 0.1, 0.25, 0.6, 1]) {
      const engine = { ...glassEngine, backdropContrast: contrast };
      const transfer = backdropContrastTransfer(engine, fill);
      const css = glassSurfaceCssVars(0.28, fill, engine, null);
      const wash = css['--glass-backdrop-pivot-rgb'].split(' ').map(Number);
      const opacity = Number(css['--glass-backdrop-contrast-opacity']);
      const table = backdropContrastTableValues(contrast, transfer.brightness).split(' ').map(Number);
      assert.equal(table.length, 1025, 'Luminance must use a smooth interpolated LUT');
      let previousOutput = -1;
      for (let i = 0; i <= 8192; i++) {
        const input = i / 8192;
        const position = input * (table.length - 1);
        const lo = Math.floor(position), hi = Math.min(lo + 1, table.length - 1);
        const output = table[lo] + (table[hi] - table[lo]) * (position - lo);
        const exact = target + (input - target) * backdropContrastRetention(input, contrast, transfer.brightness);
        assert.ok(output >= previousOutput - 1e-8, 'The interpolated curve must preserve tone order without reversal');
        assert.ok(Math.abs(output - exact) < 1 / 255, 'LUT interpolation error must stay below one displayed shade');
        previousOutput = output;
      }
      for (const input of [0, 0.2, target, 0.8, 1]) {
        const retention = backdropContrastRetention(input, contrast, transfer.brightness);
        const output = target + (input - target) * retention;
        assert.ok(output >= Math.min(input, target) - 1e-12 && output <= Math.max(input, target) + 1e-12, 'Background must move toward tint brightness without overshooting');
        assert.ok(Math.abs(output - target) <= Math.abs(input - target) + 1e-12, 'Tint brightness must remain the fixed point');
        if (contrast === 0) assert.ok(Math.abs(output - target) < 1e-12, 'Zero contrast must resolve to tint brightness');
        if (contrast === 1) assert.ok(Math.abs(output - input) < 1e-12, 'Full contrast must preserve the background');
        assert.ok(Math.abs((wash[0] * .2126 + wash[1] * .7152 + wash[2] * .0722) / 255 - target) < 1e-12,
          'CSS fallback must share the SVG brightness target while retaining tint chroma');
        assert.equal(opacity, 1 - contrast, 'CSS blur must retain its linear contrast fallback');
      }
      if (contrast > 0 && contrast < 1) {
        const reach = target > 0.5 ? -target : 1 - target;
        const near = backdropContrastRetention(target + reach * 0.02, contrast, target);
        const far = backdropContrastRetention(target + reach * 0.8, contrast, target);
        assert.ok(near > far, 'Nearby tones must keep more detail than distant tones');
        assert.ok(far < contrast, 'Distant tones must converge more than the linear transfer');
        assert.ok(near <= contrast * 1.15 && far >= contrast * 0.85, 'Distance weighting must stay gentle instead of flattening distant tones');
      }
      for (const rgb of [[0.9, 0.4, 0.1], [0.1, 0.7, 0.9]]) {
        const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        const retention = backdropContrastRetention(luminance, contrast, target);
        const mappedLuminance = target + (luminance - target) * retention;
        const encoded = matrix(BACKDROP_TO_LUMA_CHROMA, [...rgb, 0.6]);
        const output = matrix(BACKDROP_FROM_LUMA_CHROMA, [mappedLuminance,
          BACKDROP_CHROMA_CENTER + (encoded[1] - BACKDROP_CHROMA_CENTER) * contrast,
          BACKDROP_CHROMA_CENTER + (encoded[2] - BACKDROP_CHROMA_CENTER) * contrast, encoded[3]]);
        assert.equal(output[3], 0.6, 'The luminance pipeline must preserve original alpha');
        assert.ok(Math.abs(output[0] * 0.2126 + output[1] * 0.7152 + output[2] * 0.0722 - mappedLuminance) < 1e-12, 'Chroma reconstruction must retain the mapped luminance');
        assert.ok(Math.abs((output[0] - output[1]) * (rgb[1] - rgb[2]) - (output[1] - output[2]) * (rgb[0] - rgb[1])) < 1e-12, 'Chroma reconstruction must preserve hue');
      }
    }
  }
  // A colored contrast pivot keeps the same luminance and carries the lens
  // chroma. Check the SVG reconstruction and CSS fallback against each other.
  for (const fill of ['#007aff', '#b54edb', '#ed922f', '#808080']) {
    const base = [1, 3, 5].map(i => Number.parseInt(fill.slice(i, i + 2), 16) / 255);
    for (const tint of [0, .3, .9, 1]) {
      const transfer = backdropContrastTransfer(glassEngine, fill, tint);
      const reconstructed = matrix(BACKDROP_FROM_LUMA_CHROMA,
        [transfer.brightness, transfer.redChroma, transfer.blueChroma, 1]);
      const wash = glassSurfaceCssVars(tint, fill, glassEngine, null)['--glass-backdrop-pivot-rgb'].split(' ').map(Number);
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(reconstructed[i] - transfer.pivot[i]) < 1e-12, 'SVG chroma must reconstruct the intended fill pivot');
        assert.ok(Math.abs(wash[i] / 255 - reconstructed[i]) < 1e-12, 'CSS and SVG must use the same colored pivot');
        if (tint === 0) assert.ok(Math.abs(reconstructed[i] - transfer.brightness) < 1e-12, 'Untinted glass keeps its neutral pivot');
        if (tint === 1) assert.ok(Math.abs(reconstructed[i] - base[i]) < 1e-12, 'Full tint must converge to fill without a gray wash');
      }
    }
  }
  // Dark glass converges toward a dark, hue-preserving target; light glass
  // keeps the original fill-luminance target.
  {
    const engine = { ...glassEngine, backdropContrast: 0.54 };
    const fill = '#9e9e9e';
    const lightTransfer = backdropContrastTransfer(engine, fill, 0.2, 'light');
    const darkTransfer = backdropContrastTransfer(engine, fill, 0.2, 'dark');
    const luma = rgb => rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    assert.ok(Math.abs(lightTransfer.brightness - 158 / 255) < 1e-12, 'Light mode target must remain fill luminance');
    assert.ok(Math.abs(darkTransfer.brightness - 0.25) < 1e-12, 'Dark mode target luminance must be 0.25');
    assert.ok(Math.abs(luma(darkTransfer.pivot) - 0.25) < 1e-12, 'Dark mode pivot must preserve hue at the dark target luminance');
    const blackOut = 0.25 + (0 - 0.25) * backdropContrastRetention(0, 0.54, 0.25);
    assert.ok(blackOut < 0.15, 'Black backdrops must remain genuinely dark after dark-mode contrast');
    const css = glassSurfaceCssVars(0.2, fill, engine, null, 'dark');
    const wash = css['--glass-backdrop-pivot-rgb'].split(' ').map(Number);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(wash[i] / 255 - darkTransfer.pivot[i]) < 1e-12, 'CSS fallback must use the same dark pivot');
    }
  }
  let checked = 0;

  for (const [width, height, radius] of [[40, 40, 20], [54, 40, 20], [160, 40, 20], [160, 80, 16], [44, 40, 20]]) {
    for (const smoothing of [0, 0.6, 1]) {
      const shape = createLensShape(width / 2, height / 2, radius, smoothing);
      assert.equal(shape.path, smoothRoundRectPath(0, 0, width, height, smoothing, radius, { precision: 5 }));
      const c = computeCorners(0, 0, width, height, smoothing, radius)[1];
      const checkPoint = (p, tangent) => {
        const x = p.x - width / 2, y = height / 2 - p.y;
        const length = Math.hypot(tangent.x, tangent.y);
        if (length < 1e-9) return;
        const nx = tangent.y / length, ny = tangent.x / length;
        const sample = shape.sample(x, y);
        assert.ok(Math.abs(sample.distance) < 0.003, `Contour mismatch at ${width}×${height}, smoothing ${smoothing}: ${sample.distance}`);
        assert.ok(sample.nx * nx + sample.ny * ny > 0.999, 'Highlight normal must follow the smooth contour');
        for (const offset of [-0.5, 0.5]) {
          const shifted = shape.sample(x + offset * nx, y + offset * ny);
          assert.ok(Math.abs(shifted.distance - offset) < 0.004, 'Signed distance must remain aligned inside and outside the contour');
        }
        checked++;
      };
      const cubic = (a, b, c, d) => {
        for (let i = 1; i < 32; i++) {
          const t = i / 32, u = 1 - t;
          checkPoint({ x: u ** 3 * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t ** 3 * d.x,
            y: u ** 3 * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t ** 3 * d.y },
          { x: u * u * (b.x - a.x) + 2 * u * t * (c.x - b.x) + t * t * (d.x - c.x),
            y: u * u * (b.y - a.y) + 2 * u * t * (c.y - b.y) + t * t * (d.y - c.y) });
        }
      };
      cubic(c.start, c.c1a, c.c1b, c.arcStart);
      cubic(c.arcEnd, c.c2a, c.c2b, c.end);
      const center = { x: width - radius, y: radius };
      const start = Math.atan2(c.arcStart.y - center.y, c.arcStart.x - center.x);
      const end = Math.atan2(c.arcEnd.y - center.y, c.arcEnd.x - center.x);
      for (let i = 1; i < 32; i++) {
        const angle = start + (end - start) * i / 32;
        checkPoint({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) },
          { x: -Math.sin(angle), y: Math.cos(angle) });
      }
    }
  }

  const material = { depth: 10, curvature: 1, splay: 0.7, glow: 0.04, edgeHighlight: 1.15, edgeShadow: 0.2, specularAngle: 0, specularDecay: 1 };
  const bake = (halfWidth, cornerSmoothing) => computeLensMap(buildLensMapParams({ halfWidth, halfHeight: 20, radius: 20, cornerSmoothing, material })).data;
  assert.deepEqual(bake(20, 0), bake(20, 0.6), 'Circle maps must remain identical');
  const rounded = bake(80, 0), smooth = bake(80, 0.6);
  assert.ok(smooth.some((value, i) => i % 4 === 2 && value !== rounded[i]), 'The specular texture must change with the smooth contour');
  assert.ok(smooth.every((value, i) => i % 4 !== 3 || value === 255), 'Displacement maps must remain opaque');

  let ringChecks = 0;
  for (const [halfWidth, halfHeight, radius] of [[20, 20, 20], [80, 20, 20], [80, 40, 16]]) {
    for (const edgeWidth of [0.6, 2, 6]) {
      const params = buildLensMapParams({ halfWidth, halfHeight, radius, cornerSmoothing: 0.6,
        material: { ...material, glow: 0, edgeHighlight: 3, edgeShadow: 1 } }, { ...glassEngine, edgeWidth, edgeShadowWidth: edgeWidth, edgeGlowStrength: 0, edgeShadowInnerStrength: 0 }, 2);
      const shape = createLensShape(halfWidth, halfHeight, radius, 0.6);
      const shadow = computeShadowPixels(params);
      const stepX = 2 * halfWidth / params.width, stepY = 2 * halfHeight / params.height;
      const aa = Math.max(stepX, stepY);
      let shadowMass = 0, shadowMoment = 0;
      for (let y = 0; y < shadow.height; y++) {
        for (let x = 0; x < shadow.width; x++) {
          const alpha = shadow.data[(y * shadow.width + x) * 4 + 3];
          const distance = shape.sample(Math.abs((x + 0.5) * stepX - shadow.padX - halfWidth),
            Math.abs((y + 0.5) * stepY - shadow.padY - halfHeight)).distance;
          if (distance > edgeWidth * 0.25 && distance < edgeWidth * 0.75) {
            assert.ok(alpha > 0, 'The outer rim must remain continuous, including the fully lit side');
            const fillAlpha = shadow.fillData[(y * shadow.width + x) * 4 + 3];
            assert.ok(fillAlpha >= 200 && fillAlpha >= alpha,
              'The outer band must receive an opaque fill support before shading');
          }
          if (!alpha) continue;
          assert.ok(distance > -aa / 2 && distance < edgeWidth + aa / 2, 'Shadow must stay outside, with at most half a texel of AA');
          shadowMass += alpha;
          shadowMoment += distance * alpha;
        }
      }
      assert.ok(shadow.fillData.some((value, i) => {
        if (i % 4 !== 3 || !value) return false;
        const texel = Math.floor(i / 4);
        const x = texel % shadow.width, y = Math.floor(texel / shadow.width);
        const distance = shape.sample(Math.abs((x + 0.5) * stepX - shadow.padX - halfWidth),
          Math.abs((y + 0.5) * stepY - shadow.padY - halfHeight)).distance;
        return distance < 0 && distance > -aa - 0.05;
      }), 'The opaque fill support must overlap inside the silhouette to close the subpixel seam');
      assert.ok(shadowMass > 0, 'Subpixel outer shadow must remain visible');
      assert.deepEqual(computeShadowPixels({ ...params, edgeHighlight: 0 }).data, shadow.data, 'Inner highlight gain must not change the outer rim');
      assert.deepEqual(computeShadowPixels({ ...params, edgeWidth: edgeWidth + 1 }).data, shadow.data, 'Inner highlight width must not change the outer rim');
      assert.ok(Math.abs(shadowMoment / shadowMass - edgeWidth / 2) < edgeWidth * 0.15, 'Shadow must occupy the outside edge band');
      const lens = computeLensMap(params).data;
      assert.deepEqual(computeLensMap({ ...params, edgeShadowWidth: edgeWidth + 1 }).data, lens, 'Outer shadow width must not change refraction or highlights');
      const widerHighlight = computeLensMap({ ...params, edgeWidth: edgeWidth + 1 }).data;
      assert.ok(widerHighlight.some((value, i) => i % 4 === 2 && value > lens[i]), 'Wider inner highlights must extend farther into the surface');
      assert.ok(widerHighlight.every((value, i) => i % 4 === 2 || value === lens[i]), 'Inner highlight width must preserve displacement and alpha');
      let highlightMass = 0, highlightMoment = 0;
      for (let y = 0; y < params.height; y++) {
        for (let x = 0; x < params.width; x++) {
          const distance = shape.sample(Math.abs((x + 0.5) * stepX - halfWidth), Math.abs((y + 0.5) * stepY - halfHeight)).distance;
          // The final surface vector mask clips the B-channel highlight here.
          if (distance >= 0) continue;
          const intensity = lens[(y * params.width + x) * 4 + 2] - 128;
          highlightMass += intensity;
          highlightMoment += distance * intensity;
        }
      }
      assert.ok(highlightMass > 0 && highlightMoment / highlightMass < 0, 'Visible glare must remain on the inner ring');
      assert.deepEqual(computeLensMap({ ...params, edgeShadow: 0 }).data, lens, 'Moving shadow must not change refraction or highlights');
      assert.ok(computeShadowPixels({ ...params, edgeShadow: 0 }).data.every(value => value === 0), 'Shadow can be disabled independently');
      ringChecks++;
    }
  }
  // Use a visible 3px tail to check its falloff independently of theme tuning.
  const circleParams = buildLensMapParams({ halfWidth: 20, halfHeight: 20, radius: 20,
    material: { ...material, edgeShadow: 1 } },
    { ...glassEngine, edgeWidth: 2, edgeShadowWidth: 2, edgeShadowInnerSpread: 3, edgeShadowInnerStrength: 0.15 }, 2);
  const rimAlpha = (pixels, x, y) => {
    const col = Math.round((x + 20 + pixels.padX) * circleParams.width / 40 - 0.5);
    const row = Math.round((y + 20 + pixels.padY) * circleParams.height / 40 - 0.5);
    return pixels.data[(row * pixels.width + col) * 4 + 3];
  };
  const verticalLight = computeShadowPixels(circleParams);
  const horizontalLight = computeShadowPixels({ ...circleParams, specularAngle: 90 });
  assert.ok(rimAlpha(verticalLight, 0, -21) > 0 && rimAlpha(verticalLight, 0, -21) < rimAlpha(verticalLight, -21, 0), 'Lit rim must be visible but fainter than shadow');
  const brightLit = computeShadowPixels({ ...circleParams, edgeShadowLitOpacity: 0 });
  assert.equal(rimAlpha(brightLit, 0, -21), 0, 'Zero lit-side opacity must make the lit edge shadow transparent');
  assert.equal(rimAlpha(brightLit, -21, 0), rimAlpha(verticalLight, -21, 0), 'Lit-side brightness must not change the dark side');
  assert.ok(rimAlpha(horizontalLight, 0, -21) > rimAlpha(horizontalLight, -21, 0), 'Rim shading must rotate with the light');
  assert.ok(rimAlpha(verticalLight, -18, 0) > 0, 'Shadow must softly reach inward');
  assert.ok(rimAlpha(verticalLight, -18, 0) < rimAlpha(verticalLight, -19, 0), 'Inner shadow must fade toward the center');
  assert.equal(rimAlpha(verticalLight, 0, -19), 0, 'Top facing the light must have no inward shadow diffusion');
  assert.equal(rimAlpha(verticalLight, 0, 19), 0, 'Bottom opposite the light must have no inward shadow diffusion');
  assert.equal(rimAlpha(verticalLight, -16, 0), 0, 'Inner shadow must end within its own spread');
  assert.ok(rimAlpha(horizontalLight, 0, -19) > rimAlpha(horizontalLight, -19, 0), 'Soft inward shadow must rotate with the same light');
  const noInner = computeShadowPixels({ ...circleParams, edgeShadowInnerStrength: 0 });
  const noInnerSpread = computeShadowPixels({ ...circleParams, edgeShadowInnerSpread: 0 });
  assert.equal(rimAlpha(noInner, -19, 0), 0, 'Inner shadow strength zero must leave the interior clear');
  assert.deepEqual(noInner.data, noInnerSpread.data, 'Zero inner spread or gain must disable only the soft tail');
  assert.equal(rimAlpha(verticalLight, -21, 0), rimAlpha(noInner, -21, 0), 'Adding the inward tail must preserve the outer band');
  assert.deepEqual(computeShadowPixels({ ...circleParams, edgeHighlight: 0, glow: 0, specularDecay: 12 }).data, verticalLight.data,
    'All shadow terms must be independent of highlight gain and decay');
  const noEndFade = computeShadowPixels({ ...circleParams, glareEndFade: 0 });
  const fullEndFade = computeShadowPixels({ ...circleParams, glareEndFade: 1 });
  assert.ok(fullEndFade.data.some((value, i) => i % 4 === 3 && value !== noEndFade.data[i]),
    'glareEndFade must shape the lit portion of the outer edge shadow');
  assert.deepEqual(fullEndFade.fillData, noEndFade.fillData,
    'Longitudinal shading must not change the opaque fill support');
  const wideBand = computeShadowPixels({ ...circleParams, edgeShadowWidth: 6, edgeShadowInnerStrength: 0 });
  const bandAlpha = [-20.5, -21, -23, -25.5].map(x => rimAlpha(wideBand, x, 0));
  assert.ok(bandAlpha.every(alpha => alpha === bandAlpha[0] && alpha > 0),
    'Widening edgeShadowWidth must expose a constant-opacity band, never a radial blur');
  assert.equal(rimAlpha(wideBand, -26.25, 0), 0, 'A wide outer band must end sharply with only boundary antialiasing');

  const isolated = buildLensMapParams({ halfWidth: 80, halfHeight: 20, radius: 20, cornerSmoothing: 0.6,
    material: { ...material, glow: 0.1, specularDecay: 3 } }, glassEngine, 2);
  const soft = params => computeLensMap(params, false, 'soft').data;
  const rim = params => computeLensMap(params, false, 'rim').data;
  const softBase = soft(isolated), rimBase = rim(isolated);
  assert.deepEqual(soft({ ...isolated, specularDecay: 12, edgeHighlight: 0, edgeWidth: 6 }), softBase,
    'Rim gain, decay and width must not alter either soft-light term');
  assert.deepEqual(rim({ ...isolated, glow: 1, glowSpread: 1, glowExponent: 5, edgeGlowStrength: 1, edgeGlowSpread: 40 }), rimBase,
    'Glow and bloom tuning must not alter the narrow rim mask');
  assert.ok(rim({ ...isolated, specularDecay: 12 }).some((v, i) => i % 4 === 2 && v < rimBase[i]), 'Rim decay must still shape the narrow rim');
  const bloomParams = { ...isolated, glow: 0, edgeHighlight: 0 };
  const bloom = soft(bloomParams);
  const sampleLight = (pixels, x, y) => {
    const col = Math.round((x + 80) * isolated.width / 160 - 0.5);
    const row = Math.round((y + 20) * isolated.height / 40 - 0.5);
    return pixels[(row * isolated.width + col) * 4 + 2] - 128;
  };
  assert.ok(sampleLight(bloom, 0, -15) > 0, '10px bloom must remain visible 5px inside, with decay=3 and no rim');
  assert.ok(sampleLight(bloom, 0, -18) > sampleLight(bloom, 0, -15), 'Bloom must fade smoothly inward');
  assert.equal(sampleLight(bloom, 0, -9), 0, 'Bloom must end at its own spread');
  assert.deepEqual(soft({ ...bloomParams, edgeGlowStrength: 0 }), soft({ ...bloomParams, edgeGlowSpread: 0 }),
    'Zero bloom spread or strength must disable bloom without introducing uniform fill');
  const glowOnly = { ...isolated, edgeGlowStrength: 0 };
  assert.deepEqual(soft({ ...glowOnly, edgeGlowSpread: 40, specularDecay: 12 }), soft(glowOnly), 'Omnidirectional glow must have independent falloff');
  assert.deepEqual(computeLensMap({ ...isolated, edgeShadowInnerSpread: 10, edgeShadowInnerStrength: 1 }).data,
    computeLensMap(isolated).data, 'Inner shadow settings must not change refraction or light');
  // Independent rotation/reflection checks catch mismatched quadrant signs,
  // near/far lighting and positional fades that cardinal angles alone miss.
  let angleChecks = 0;
  for (const [halfWidth, halfHeight, radius] of [[20, 20, 20], [80, 20, 20], [80, 40, 16]]) {
    const params = buildLensMapParams({ halfWidth, halfHeight, radius, cornerSmoothing: 0.6,
      material: { ...material, glow: 0, edgeHighlight: 1, edgeShadow: 1 } },
    { ...glassEngine, edgeWidth: 2, edgeShadowWidth: 2, glareOppositeFactor: 0.25 }, 2);
    for (const angle of [0, 17, 45, 73, 90, 135, 180, 225, 270, 315]) {
      const original = computeLensMap({ ...params, specularAngle: angle }).data;
      const mirrored = computeLensMap({ ...params, specularAngle: -angle }).data;
      for (let y = 0; y < params.height; y++) {
        for (let x = 0; x < params.width; x++) {
          const i = (y * params.width + x) * 4;
          const mirror = (y * params.width + params.width - 1 - x) * 4;
          assert.ok(Math.abs(original[i + 2] - mirrored[mirror + 2]) <= 1,
            `Highlight must mirror with light angle: ${halfWidth * 2}×${halfHeight * 2}, ${angle}°`);
        }
      }
      if (halfWidth === halfHeight) {
        const rotated = computeLensMap({ ...params, specularAngle: angle + 90 }).data;
        const shadow = computeShadowPixels({ ...params, specularAngle: angle });
        const rotatedShadow = computeShadowPixels({ ...params, specularAngle: angle + 90 });
        for (let y = 0; y < params.height; y++) {
          for (let x = 0; x < params.width; x++) {
            const i = (y * params.width + x) * 4 + 2;
            const turn = ((params.width - 1 - x) * params.width + y) * 4 + 2;
            assert.ok(Math.abs(original[i] - rotated[turn]) <= 1, `Circular glare must rotate rigidly at ${angle}°`);
          }
        }
        for (let y = 0; y < shadow.height; y++) {
          for (let x = 0; x < shadow.width; x++) {
            const i = (y * shadow.width + x) * 4 + 3;
            const turn = ((shadow.width - 1 - x) * shadow.width + y) * 4 + 3;
            assert.ok(Math.abs(shadow.data[i] - rotatedShadow.data[turn]) <= 1, `Outer rim must share the glare's angle at ${angle}°`);
          }
        }
        let dx = 0, dy = 0;
        for (let y = 0; y < params.height; y++) {
          for (let x = 0; x < params.width; x++) {
            const intensity = original[(y * params.width + x) * 4 + 2] - 128;
            dx += (x + 0.5 - params.width / 2) * intensity;
            dy += (y + 0.5 - params.height / 2) * intensity;
          }
        }
        const measured = Math.atan2(-dx, -dy) * 180 / Math.PI;
        const error = Math.abs(((measured - angle + 540) % 360) - 180);
        assert.ok(error < 1, `Primary glare must face ${angle}°, measured ${measured}°`);
      }
      angleChecks++;
    }
    const at = angle => computeLensMap({ ...params, specularAngle: angle }).data;
    const zero = at(0), fullTurn = at(360), before = at(359.999), after = at(0.001);
    assert.deepEqual(fullTurn, zero, 'A full turn must return to the same highlight');
    assert.ok(before.every((value, i) => Math.abs(value - after[i]) <= 1), 'Angle wrap must not jump between near/far sides');
  }
  console.log(`Glass checks passed: fill-derived lighting saturation and unchanged mask alpha; colored backdrop pivots; neutral lighting stability; nonlinear luminance contrast for 6 tint colors; ${checked} reference points; circle stability; ${ringChecks} outer edge cases with opaque fill support; independent rim, bloom and glow masks; crisp wide outer bands; glare end fade on edge shadow; side-only inward shadow falloff/disable/rotation; ${angleChecks} light-angle rotation/reflection cases and continuous angle wrapping.`);
} finally {
  await server.close();
}
