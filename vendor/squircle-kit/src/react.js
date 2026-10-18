// smooth-corners/react
// ---------------------------------------------------------------------------
//   <Squircle radius={24} smoothing={0.6}>…</Squircle>
//   <Squircle as="button" radius={12} border={{ width: 1, color: '#ddd' }} />
//   const ref = useSquircle({ radius: 20, smoothing: 'system-ui' });
// ---------------------------------------------------------------------------

import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { getSharedInstance } from './core.js';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// stable key so object/array literals in props don't re-apply every render
const keyOf = (v) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/**
 * Ref hook. Works with any element; returns a callback ref.
 * @param {{radius?:any, smoothing?:any, border?:any, precision?:number}} [config]
 */
export function useSquircle(config = {}) {
  const elRef = useRef(null);
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const key = keyOf(config.radius) + '|' + keyOf(config.smoothing) + '|' + keyOf(config.border) + '|' + keyOf(config.precision);

  const ref = useCallback((node) => {
    const kit = getSharedInstance();
    if (elRef.current && elRef.current !== node) kit.remove(elRef.current);
    elRef.current = node;
    if (node) kit.apply(node, withNulls(cfgRef.current));
  }, []);

  useIsoLayoutEffect(() => {
    if (elRef.current) getSharedInstance().update(elRef.current, withNulls(cfgRef.current));
  }, [key]);

  useEffect(() => () => {
    if (elRef.current) getSharedInstance().remove(elRef.current);
  }, []);

  return ref;
}

// explicitly pass `border: null` so removing the prop removes the overlay
function withNulls(c) {
  return { ...c, border: c.border ?? null };
}

function assignRef(ref, value) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

/**
 * Polymorphic component.
 * @type {import('react').ForwardRefExoticComponent<any>}
 */
export const Squircle = forwardRef(function Squircle(
  { as = 'div', radius, smoothing, border, precision, children, ...rest },
  forwarded
) {
  const sqRef = useSquircle({ radius, smoothing, border, precision });
  const ref = useCallback(
    (node) => {
      sqRef(node);
      assignRef(forwarded, node);
    },
    [sqRef, forwarded]
  );
  return createElement(as, { ...rest, ref, 'data-squircle-react': '' }, children);
});

export default Squircle;
