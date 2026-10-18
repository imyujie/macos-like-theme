import { useId } from 'react';

/** Rounded tip and shoulders for a Base UI Popover.Arrow. */
const arrowContour = 'M 0 12 C 2.5 12 4 11 5.4 9.5 L 12.46 2.46 A 5 5 0 0 1 16 1 A 5 5 0 0 1 19.54 2.46 L 26.6 9.5 C 28 11 29.5 12 32 12';
const arrowSurface = `${arrowContour} L 32 16 L 0 16 Z`;

export function MacPopoverArrowShape() {
  const clipId = useId();

  return (
    <svg viewBox="0 0 32 16" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={clipId}><path d={arrowSurface} /></clipPath>
      </defs>
      <path className="mac-popover-arrow-shadow" d={arrowContour} />
      <path className="mac-popover-arrow-fill" d={arrowSurface} />
      {/* Match the surface and outline layers: double strokes clipped inside. */}
      <g clipPath={`url(#${clipId})`}>
        <path className="mac-popover-arrow-edge" d={arrowContour} />
        <path className="mac-popover-arrow-stroke" d={arrowContour} />
      </g>
    </svg>
  );
}
