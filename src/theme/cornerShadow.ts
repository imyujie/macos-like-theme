const SVG_NS = 'http://www.w3.org/2000/svg';
let shadowId = 0;
const recipes = new WeakMap<SVGSVGElement, string>();

function splitCss(value: string, separator: ',' | ' '): string[] {
  let depth = 0;
  let start = 0;
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (!depth && (separator === ',' ? value[i] === ',' : /\s/.test(value[i]))) {
      if (i > start) parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (start < value.length) parts.push(value.slice(start).trim());
  return parts;
}

function shadowLayers(css: string) {
  return splitCss(css, ',').filter(value => value && value !== 'none').map(value => {
    const tokens = splitCss(value, ' ');
    const lengths = tokens.filter(token => /^-?[\d.]+(?:px)?$/.test(token)).map(Number.parseFloat);
    if (tokens.includes('inset') || lengths.length < 2) throw new Error(`Unsupported outer shadow: ${value}`);
    return {
      x: lengths[0], y: lengths[1], blur: (lengths[2] || 0) / 2, spread: lengths[3] || 0,
      color: tokens.find(token => !/^-?[\d.]+(?:px)?$/.test(token)) || 'black',
    };
  });
}

function node(name: string, attributes: Record<string, string | number>) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

/** Render only the shadow, as a sibling, so backdrop sampling stays intact. */
export function createCornerShadow(element: HTMLElement, className: string): SVGSVGElement {
  const svg = node('svg', { 'aria-hidden': 'true', focusable: 'false' }) as SVGSVGElement;
  svg.classList.add('mac-corner-shadow', className);
  const id = `mac-corner-shadow-${++shadowId}`;
  const defs = node('defs', {});
  defs.append(node('filter', { id, filterUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }));
  svg.append(defs, node('path', { fill: 'black', filter: `url(#${id})` }));
  element.before(svg);
  return svg;
}

export function updateCornerShadow(svg: SVGSVGElement, path: string, width: number, height: number, css: string) {
  const layers = shadowLayers(css);
  const filter = svg.querySelector('filter')!;
  const pad = Math.ceil(Math.max(...layers.map(s => s.blur * 3 + Math.max(Math.abs(s.x), Math.abs(s.y)) + Math.abs(s.spread)), 0)) + 2;
  filter.setAttribute('x', String(-pad));
  filter.setAttribute('y', String(-pad));
  filter.setAttribute('width', String(width + pad * 2));
  filter.setAttribute('height', String(height + pad * 2));
  if (recipes.get(svg) !== css) {
    filter.replaceChildren();
    layers.forEach((s, i) => {
      if (s.spread) filter.append(node('feMorphology', { in: 'SourceAlpha', operator: s.spread > 0 ? 'dilate' : 'erode', radius: Math.abs(s.spread), result: `spread-${i}` }));
      filter.append(
        node('feGaussianBlur', { in: s.spread ? `spread-${i}` : 'SourceAlpha', stdDeviation: s.blur, result: `blur-${i}` }),
        node('feOffset', { in: `blur-${i}`, dx: s.x, dy: s.y, result: `offset-${i}` }),
        node('feFlood', { 'flood-color': s.color }),
        node('feComposite', { in2: `offset-${i}`, operator: 'in', result: `shadow-${i}` }),
      );
    });
    const merge = node('feMerge', { result: 'shadows' });
    // CSS paints the first listed shadow on top of subsequent shadows.
    for (let i = layers.length - 1; i >= 0; i--) merge.append(node('feMergeNode', { in: `shadow-${i}` }));
    filter.append(merge, node('feComposite', { in: 'shadows', in2: 'SourceAlpha', operator: 'out' }));
    recipes.set(svg, css);
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.lastElementChild!.setAttribute('d', path);
}
