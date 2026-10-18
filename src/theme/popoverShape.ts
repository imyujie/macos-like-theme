import { computeCorners } from 'smooth-corners';

const PAD = 12;
type Point = { x: number; y: number };
const point = ({ x, y }: Point) => `${Math.round(x * 1000) / 1000},${Math.round(y * 1000) / 1000}`;

/** One silhouette keeps translucent material, blur and strokes out of the join. */
export function syncPopoverShape(element: HTMLElement, radius: number, smoothing: number) {
  if (!element.matches('.mac-popover-surface, .mac-popover-border')) return;
  const popup = element.parentElement;
  const arrow = popup?.querySelector<HTMLElement>(':scope > .mac-popover-arrow');
  if (!popup || !arrow) return;

  popup.dataset.macPopoverUnified = '';
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const bodyWidth = width - PAD * 2;
  const bodyHeight = height - PAD * 2;
  const corners = computeCorners(PAD, PAD, bodyWidth, bodyHeight, smoothing, radius);
  const side = arrow.dataset.side;
  // Clockwise edges: top, right, bottom, left. Base UI owns arrow positioning.
  const edge = side === 'bottom' ? 0 : side === 'left' ? 1 : side === 'top' ? 2 : 3;
  const horizontal = edge % 2 === 0;
  const center = horizontal ? arrow.offsetLeft + arrow.offsetWidth / 2 : arrow.offsetTop + arrow.offsetHeight / 2;
  const cornerStart = corners[edge].end as Point;
  const cornerEnd = corners[(edge + 1) % 4].start as Point;
  const axis = horizontal ? 'x' : 'y';
  const position = Math.max(Math.min(cornerStart[axis], cornerEnd[axis]) + 16,
    Math.min(PAD + center, Math.max(cornerStart[axis], cornerEnd[axis]) - 16));
  const transform = (x: number, y: number): Point => {
    if (edge === 0) return { x: position - 16 + x, y: y };
    if (edge === 1) return { x: PAD + bodyWidth + 12 - y, y: position - 16 + x };
    if (edge === 2) return { x: position + 16 - x, y: PAD + bodyHeight + 12 - y };
    return { x: y, y: position + 16 - x };
  };
  const p = (x: number, y: number) => point(transform(x, y));
  const arrowPath = `L${p(0, 12)}C${p(2.5, 12)} ${p(4, 11)} ${p(5.4, 9.5)}` +
    `L${p(12.46, 2.46)}A5,5 0 0 1 ${p(16, 1)}A5,5 0 0 1 ${p(19.54, 2.46)}` +
    `L${p(26.6, 9.5)}C${p(28, 11)} ${p(29.5, 12)} ${p(32, 12)}`;
  let path = '';
  corners.forEach((c, i) => {
    path += `${i ? 'L' : 'M'}${point(c.start)}C${point(c.c1a)} ${point(c.c1b)} ${point(c.arcStart)}` +
      `A${c.radius},${c.radius} 0 0 1 ${point(c.arcEnd)}C${point(c.c2a)} ${point(c.c2b)} ${point(c.end)}`;
    if (i === edge) path += arrowPath;
  });
  path += 'Z';
  element.style.clipPath = `path('${path}')`;
  element.style.setProperty('-webkit-clip-path', `path('${path}')`);
  const overlay = element.querySelector<SVGSVGElement>(':scope > [data-squircle-border]');
  if (overlay) {
    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
    overlay.setAttribute('viewBox', `0 0 ${width} ${height}`);
    overlay.lastElementChild?.setAttribute('d', path);
  }
  return { path, size: { width, height } };
}
