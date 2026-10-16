import CornerKit from '@cornerkit/core';

const SMOOTHING = 0.6;

const THEME_CORNER_TARGETS = [
  '.mac-window-frame',
  '.mac-grouped-surface',
  '.mac-button',
  '.mac-icon-button-surface',
  '.mac-icon-button-border',
  '.mac-input-surface',
  '.mac-input-border',
  '.mac-popup',
  '.mac-popup-backdrop',
  '.mac-popup-border',
  '.mac-menu-item',
  '.mac-checkbox-surface',
  '.mac-checkbox-border',
  '.mac-segmented-surface',
  '.mac-segmented-border',
  '.mac-segmented-tab',
  '.mac-dialog-popup',
  '.mac-dialog-surface',
  '.mac-dialog-border',
  '.mac-tooltip-surface',
  '.mac-tooltip-border',
  '.mac-popover-surface',
  '.mac-popover-border',
];

function borderFor(element: HTMLElement) {
  if (element.matches('.mac-icon-button-border')) {
    return { width: 1, color: 'var(--mac-icon-outline, var(--mac-border))' };
  }
  if (element.matches('.mac-input-border, .mac-segmented-border, .mac-checkbox-border')) {
    return { width: 1, color: element.matches('.mac-input-border') ? 'var(--mac-input-outline)' : element.matches('.mac-checkbox-border') ? 'var(--mac-checkbox-outline)' : 'var(--mac-border)' };
  }
  if (element.matches('.mac-popup-border')) {
    return { width: 0.5, color: 'var(--mac-popup-outline)' };
  }
  if (element.matches('.mac-dialog-border')) {
    return { width: 1, color: 'var(--mac-dialog-outline)' };
  }
  if (element.matches('.mac-tooltip-border')) {
    return { width: 0.5, color: 'var(--mac-tooltip-outline)' };
  }
  if (element.matches('.mac-popover-border')) {
    return { width: 0.5, color: 'var(--mac-popover-outline)' };
  }
  return undefined;
}

function eligibleRadius(element: HTMLElement): number | null {
  // These popups are stacking containers. Their surface and outline each own
  // the continuous path, so the outline cannot be clipped a second time.
  if (element.matches('.mac-select-popup, .mac-menu-popup, .mac-dialog-popup')) return null;

  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (width < 16 || height < 16) return null;

  // Read the CSS radius without our active clip-path override. This also lets
  // hover, selection, and responsive rules change the radius after mounting.
  const clipped = element.dataset.macCorners === 'clippath';
  if (clipped) delete element.dataset.macCorners;
  try {
    const style = getComputedStyle(element);
    const radius = Number.parseFloat(style.borderTopLeftRadius);
    if (!Number.isFinite(radius) || radius <= 0) return null;

    // CornerKit currently draws one radius on all four corners.
    for (const corner of [style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius]) {
      if (Math.abs(Number.parseFloat(corner) - radius) > 0.5) return null;
    }

    // Capsules and circles need their existing geometry, including the switch
    // and slider thumbs. Their radius reaches half the shorter side.
    if (radius >= Math.min(width, height) / 2 - 0.5) return null;

    return radius;
  } finally {
    if (clipped) element.dataset.macCorners = 'clippath';
  }
}

/** Apply continuous corners to eligible theme elements, including new portals. */
export function installMacCorners(root: HTMLElement = document.body, additionalTargets: readonly string[] = []): () => void {
  const cornerKit = new CornerKit({ smoothing: SMOOTHING });
  const selector = [...THEME_CORNER_TARGETS, ...additionalTargets].join(', ');
  const managed = new Map<HTMLElement, number>();
  let frame = 0;
  let disposed = false;

  const remove = (element: HTMLElement) => {
    if (!managed.has(element)) return;
    delete element.dataset.macCorners;
    cornerKit.remove(element);
    managed.delete(element);
  };

  const sync = () => {
    frame = 0;
    const candidates = new Set(root.querySelectorAll<HTMLElement>(selector));
    if (root.matches(selector)) candidates.add(root);

    for (const element of managed.keys()) {
      if (!root.contains(element) || !candidates.has(element)) remove(element);
    }

    for (const element of candidates) {
      const radius = eligibleRadius(element);
      if (radius === null) {
        remove(element);
      } else if (!managed.has(element)) {
        // CornerKit paints borders with an SVG path. The popup surface and
        // outline live on separate layers so the latter is never clipped.
        cornerKit.apply(element, { radius, smoothing: SMOOTHING, border: borderFor(element) });
        if (cornerKit.inspect(element)?.tier === 'clippath') element.dataset.macCorners = 'clippath';
        managed.set(element, radius);
      } else if (managed.get(element) !== radius) {
        cornerKit.update(element, { radius });
        managed.set(element, radius);
      }
    }
  };

  const scheduleSync = () => {
    if (!disposed && !frame) frame = requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(scheduleSync);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'data-active', 'data-selected'],
  });
  window.addEventListener('resize', scheduleSync);
  root.addEventListener('pointerover', scheduleSync);
  root.addEventListener('pointerout', scheduleSync);
  scheduleSync();

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    window.removeEventListener('resize', scheduleSync);
    root.removeEventListener('pointerover', scheduleSync);
    root.removeEventListener('pointerout', scheduleSync);
    if (frame) cancelAnimationFrame(frame);
    for (const element of managed.keys()) delete element.dataset.macCorners;
    cornerKit.destroy();
    managed.clear();
  };
}
