/** Rounded tip and shoulders for a Base UI Popover.Arrow. */
const arrowContour = 'M 0 12 C 2.5 12 4 11 5.4 9.5 L 12.46 2.46 A 5 5 0 0 1 16 1 A 5 5 0 0 1 19.54 2.46 L 26.6 9.5 C 28 11 29.5 12 32 12';

export function MacPopoverArrowShape() {
  return (
    <svg viewBox="0 0 32 16" aria-hidden="true" focusable="false">
      <path className="mac-popover-arrow-fill" d={`${arrowContour} L 32 16 L 0 16 Z`} />
      <path className="mac-popover-arrow-stroke" d={arrowContour} />
    </svg>
  );
}
