import { SmoothCorners, type BorderConfig } from 'smooth-corners';
import { createCornerShadow, updateCornerShadow } from './cornerShadow';
import { syncPopoverShape } from './popoverShape';

const SMOOTHING = 0.6;

const THEME_CORNER_TARGETS = [
  '.mac-window-frame',
  '.mac-window-template-frame',
  '.mac-grouped-surface',
  '.mac-button',
  '.mac-icon-button-surface',
  '.mac-icon-button-border',
  '.mac-input-surface',
  '.mac-input-border',
  '.mac-switch',
  '.mac-switch-thumb',
  '.mac-popup',
  '.mac-floating-panel-surface',
  '.mac-floating-panel-border',
  '.mac-popup-backdrop',
  '.mac-popup-border',
  '.mac-menu-item',
  '.mac-checkbox-surface',
  '.mac-checkbox-border',
  '.mac-segmented-surface',
  '.mac-segmented-tab',
  '.mac-dialog-popup',
  '.mac-dialog-surface',
  '.mac-dialog-border',
  '.mac-tooltip-surface',
  '.mac-tooltip-border',
  '.mac-popover-surface',
  '.mac-popover-border',
];

interface InlineRadius {
  value: string;
  priority: string;
}

interface ManagedCorners {
  radius: number;
  border: BorderConfig | undefined;
  originalRadius: InlineRadius;
  originalBorderColor: InlineRadius;
  shadow?: SVGSVGElement;
}

function surfaceBorder(width: number, color: string): BorderConfig {
  return { width, color, followSurface: true };
}

function edgeLight(start: string, end: string, middle = 'rgba(255,255,255,0)', transition = 0.15, angle = 180): BorderConfig {
  return {
    ...surfaceBorder(1, middle), angle,
    gradient: [
      { offset: 0, color: start }, { offset: transition, color: middle },
      { offset: 1 - transition, color: middle }, { offset: 1, color: end },
    ],
  };
}

function borderFor(element: HTMLElement): BorderConfig | undefined {
  if (element.matches(':is(.mac-button, .mac-switch, .mac-segmented-tab, .mac-menu-item):focus-visible')) {
    return surfaceBorder(3, 'var(--mac-focus)');
  }
  if (element.matches('.mac-floating-panel-surface, .mac-popup-backdrop, .mac-popover-surface')) {
    return edgeLight('var(--mac-floating-panel-edge-top)', 'var(--mac-floating-panel-edge-bottom)', 'var(--mac-floating-panel-edge-middle)', 0.4, 90);
  }
  if (element.matches('.mac-input-surface')) return edgeLight('rgba(0,0,0,.025)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)');
  if (element.matches('.mac-dialog-surface')) {
    return edgeLight('var(--mac-dialog-edge-top)', 'var(--mac-dialog-edge-bottom)', 'var(--mac-dialog-edge-middle)', 0.4, 90);
  }
  if (element.matches('.mac-icon-button-border')) {
    if (element.parentElement?.matches(':focus-visible')) return surfaceBorder(3, 'var(--mac-focus)');
    return surfaceBorder(1, 'var(--mac-icon-outline, var(--mac-border))');
  }
  if (element.matches('.mac-input-border')) {
    // Keep the surface path fixed as focus changes the visible inner width.
    return surfaceBorder(element.matches('.mac-input-frame:focus-within > .mac-input-border') ? 2.5 : 1, 'var(--mac-input-outline)');
  }
  if (element.matches('.mac-checkbox-border')) {
    if (element.parentElement?.matches(':focus-visible')) return surfaceBorder(3, 'var(--mac-focus)');
    return surfaceBorder(1, 'var(--mac-checkbox-outline)');
  }
  if (element.matches('.mac-floating-panel-border, .mac-popup-border, .mac-popover-border')) {
    return surfaceBorder(0.5, 'var(--mac-floating-panel-outline)');
  }
  if (element.matches('.mac-dialog-border')) {
    return surfaceBorder(0.5, 'var(--mac-dialog-outline)');
  }
  if (element.matches('.mac-tooltip-border')) {
    return surfaceBorder(0.5, 'var(--mac-tooltip-outline)');
  }
  return undefined;
}

function nativeBorderFor(element: HTMLElement, original: InlineRadius): BorderConfig | undefined {
  const current = element.style.getPropertyValue('border-color');
  const priority = element.style.getPropertyPriority('border-color');
  element.style.setProperty('border-color', original.value, original.priority);
  try {
    const cs = getComputedStyle(element);
    const width = Number.parseFloat(cs.borderTopWidth);
    // Partial separators and borders with different sides keep their CSS.
    if (!(width > 0) || cs.borderTopStyle !== 'solid') return;
    if ([cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].some(w => Number.parseFloat(w) !== width)) return;
    if ([cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].some(c => c !== cs.borderTopColor)) return;
    if ([cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle].some(s => s !== 'solid')) return;
    return surfaceBorder(width, cs.borderTopColor);
  } finally {
    element.style.setProperty('border-color', current, priority);
  }
}

function shadowFor(element: HTMLElement): { className: string; css: string } | undefined {
  if (element.matches('.mac-window-template-border')) return { className: 'mac-window-template-shadow', css: getComputedStyle(element).getPropertyValue('--mac-shadow').trim() };
  if (element.matches('.mac-dialog-border')) return { className: 'mac-dialog-shadow', css: getComputedStyle(element).getPropertyValue('--mac-dialog-shadow').trim() };
  if (element.matches('.mac-floating-panel-border, .mac-popup-border, .mac-popover-border')) return { className: 'mac-floating-panel-shadow', css: getComputedStyle(element).getPropertyValue('--mac-floating-panel-shadow').trim() };
  if (element.matches('.mac-tooltip-border')) return { className: 'mac-tooltip-shadow', css: '0 2px 6px rgba(0,0,0,.22)' };
  if (element.matches('.mac-switch-thumb')) return { className: 'mac-switch-thumb-shadow', css: '0 1px 2px rgba(0,0,0,.16)' };
  return undefined;
}

function eligibleRadius(element: HTMLElement, originalRadius?: InlineRadius): number | null {
  // These popups are stacking containers. Their surface and outline each own
  // the continuous path, so the outline cannot be clipped a second time.
  if (element.matches('.mac-floating-panel, .mac-select-popup, .mac-menu-popup, .mac-dialog-popup')) return null;

  const width = element.offsetWidth;
  const height = element.offsetHeight;
  const smoothCapsule = element.matches('.mac-switch, .mac-switch-thumb, .mac-segmented-surface, .mac-segmented-tab, .mac-input-frame[data-shape="capsule"] > :is(.mac-input-surface, .mac-input-border), .mac-dialog-actions .mac-button');
  const minSize = smoothCapsule ? 1 : 16;
  if (width < minSize || height < minSize) return null;

  // SmoothCorners zeros the inline radius while clipping (and writes it in
  // fallback mode). Temporarily restore the authored value so hover, selection,
  // and responsive CSS can still change the radius after mounting.
  const currentRadius = element.style.getPropertyValue('border-radius');
  const currentPriority = element.style.getPropertyPriority('border-radius');
  if (originalRadius) element.style.setProperty('border-radius', originalRadius.value, originalRadius.priority);
  try {
    const style = getComputedStyle(element);
    const radius = Number.parseFloat(style.borderTopLeftRadius);
    if (!Number.isFinite(radius) || radius <= 0) return null;

    // Keep the theme's symmetric rounded rectangles eligible for smoothing.
    for (const corner of [style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]) {
      if (Math.abs(Number.parseFloat(corner) - radius) > 0.5) return null;
    }

    // SmoothCorners keeps smoothing on a capsule's long edges while its short
    // edges remain semicircular. Opt in switches, tabs, capsule inputs, and dialog action buttons;
    // other capsules and circles retain their existing geometry.
    if (!smoothCapsule && radius >= Math.min(width, height) / 2 - 0.5) return null;

    return radius;
  } finally {
    if (originalRadius) element.style.setProperty('border-radius', currentRadius, currentPriority);
  }
}

/** Apply continuous corners to eligible theme elements, including new portals. */
export function installMacCorners(root: HTMLElement = document.body, additionalTargets: readonly string[] = []): () => void {
  const corners = new SmoothCorners({ smoothing: SMOOTHING });
  const selector = [...THEME_CORNER_TARGETS, ...additionalTargets].join(', ');
  const managed = new Map<HTMLElement, ManagedCorners>();
  const observedArrows = new Set<HTMLElement>();
  let frame = 0;
  let disposed = false;

  const remove = (element: HTMLElement) => {
    const previous = managed.get(element);
    if (!previous) return;
    previous.shadow?.remove();
    element.style.setProperty('border-color', previous.originalBorderColor.value, previous.originalBorderColor.priority);
    shadowResizeObserver?.unobserve(element);
    delete element.dataset.macCorners;
    corners.remove(element);
    managed.delete(element);
  };

  const sync = () => {
    frame = 0;
    const candidates = new Set(root.querySelectorAll<HTMLElement>(selector));
    if (root.matches(selector)) candidates.add(root);

    for (const element of managed.keys()) {
      if (!root.contains(element) || !candidates.has(element)) remove(element);
    }
    for (const arrow of observedArrows) {
      if (!root.contains(arrow)) {
        observedArrows.delete(arrow);
        arrowObserver.disconnect();
        for (const current of observedArrows) arrowObserver.observe(current, { attributes: true, attributeFilter: ['style', 'data-side'] });
      }
    }
    for (const arrow of root.querySelectorAll<HTMLElement>('.mac-popover-arrow')) {
      if (!observedArrows.has(arrow)) {
        observedArrows.add(arrow);
        arrowObserver.observe(arrow, { attributes: true, attributeFilter: ['style', 'data-side'] });
      }
    }

    for (const element of candidates) {
      const previous = managed.get(element);
      const radius = eligibleRadius(element, previous?.originalRadius);
      const originalBorderColor = previous?.originalBorderColor ?? {
        value: element.style.getPropertyValue('border-color'),
        priority: element.style.getPropertyPriority('border-color'),
      };
      const explicitBorder = borderFor(element);
      const nativeBorder = !explicitBorder && radius !== null ? nativeBorderFor(element, originalBorderColor) : undefined;
      const border = explicitBorder ?? nativeBorder;
      if (radius === null) {
        remove(element);
      } else if (!previous) {
        const originalRadius = {
          value: element.style.getPropertyValue('border-radius'),
          priority: element.style.getPropertyPriority('border-radius'),
        };
        // Keep material and outline on separate layers to preserve backdrop
        // blur. The SVG stroke shares the surface path; clipping its outer
        // half leaves the requested border width inside that silhouette.
        corners.apply(element, { radius, border });
        const supported = corners.inspect(element)?.mode === 'clip-path';
        if (supported) element.dataset.macCorners = 'clippath';
        managed.set(element, { radius, border, originalRadius, originalBorderColor });
      } else if (previous.radius !== radius || JSON.stringify(previous.border) !== JSON.stringify(border)) {
        corners.update(element, { radius, border: border ?? null });
        managed.set(element, { ...previous, radius, border });
      }
      const state = managed.get(element);
      if (!state) continue;
      const supported = element.dataset.macCorners === 'clippath';
      element.style.setProperty('border-color', supported && nativeBorder ? 'transparent' : originalBorderColor.value, originalBorderColor.priority);
      const effect = supported ? shadowFor(element) : undefined;
      if (effect && !state.shadow) {
        state.shadow = createCornerShadow(element, effect.className);
        shadowResizeObserver?.observe(element, { box: 'border-box' });
      } else if (!effect && state.shadow) {
        state.shadow.remove();
        state.shadow = undefined;
        shadowResizeObserver?.unobserve(element);
      }
      const shape = supported ? syncPopoverShape(element, state.radius, SMOOTHING) : undefined;
      const info = shape ?? (state.shadow && corners.inspect(element));
      if (state.shadow && info && effect) {
        updateCornerShadow(state.shadow, info.path, info.size.width, info.size.height, effect.css);
        state.shadow.style.left = `${element.offsetLeft}px`;
        state.shadow.style.top = `${element.offsetTop}px`;
        state.shadow.style.width = `${info.size.width}px`;
        state.shadow.style.height = `${info.size.height}px`;
      }
    }
  };

  const scheduleSync = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(sync);
  };

  const arrowObserver = new MutationObserver(scheduleSync);

  // The library updates its path on resize; copy that path on the next frame.
  const shadowResizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleSync) : null;
  const observer = new MutationObserver(scheduleSync);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-active', 'data-selected', 'data-appearance', 'data-size'],
  });
  window.addEventListener('resize', scheduleSync);
  root.addEventListener('pointerover', scheduleSync);
  root.addEventListener('pointerout', scheduleSync);
  root.addEventListener('focusin', scheduleSync);
  root.addEventListener('focusout', scheduleSync);
  root.addEventListener('keydown', scheduleSync);
  root.addEventListener('pointerdown', scheduleSync);
  scheduleSync();

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    arrowObserver.disconnect();
    shadowResizeObserver?.disconnect();
    window.removeEventListener('resize', scheduleSync);
    root.removeEventListener('pointerover', scheduleSync);
    root.removeEventListener('pointerout', scheduleSync);
    root.removeEventListener('focusin', scheduleSync);
    root.removeEventListener('focusout', scheduleSync);
    root.removeEventListener('keydown', scheduleSync);
    root.removeEventListener('pointerdown', scheduleSync);
    if (frame) cancelAnimationFrame(frame);
    for (const [element, state] of managed) {
      if (element.matches('.mac-popover-surface')) delete element.parentElement?.dataset.macPopoverUnified;
      delete element.dataset.macCorners;
      state.shadow?.remove();
      element.style.setProperty('border-color', state.originalBorderColor.value, state.originalBorderColor.priority);
    }
    corners.destroy();
    managed.clear();
  };
}
