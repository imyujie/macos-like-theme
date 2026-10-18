import {
  getSharedInstance
} from "./chunks/chunk-CT3GKJ7E.js";
import "./chunks/chunk-TL7JX42L.js";

// src/react.js
import { createElement, forwardRef, useCallback, useEffect, useLayoutEffect, useRef } from "react";
var useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
var keyOf = (v) => v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
function useSquircle(config = {}) {
  const elRef = useRef(null);
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const key = keyOf(config.radius) + "|" + keyOf(config.smoothing) + "|" + keyOf(config.border) + "|" + keyOf(config.precision);
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
function withNulls(c) {
  return { ...c, border: c.border ?? null };
}
function assignRef(ref, value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}
var Squircle = forwardRef(function Squircle2({ as = "div", radius, smoothing, border, precision, children, ...rest }, forwarded) {
  const sqRef = useSquircle({ radius, smoothing, border, precision });
  const ref = useCallback(
    (node) => {
      sqRef(node);
      assignRef(forwarded, node);
    },
    [sqRef, forwarded]
  );
  return createElement(as, { ...rest, ref, "data-squircle-react": "" }, children);
});
var react_default = Squircle;
export {
  Squircle,
  react_default as default,
  useSquircle
};
