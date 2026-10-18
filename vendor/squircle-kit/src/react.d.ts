import type { ComponentPropsWithRef, ElementType, ReactElement, RefCallback } from 'react';
import type { BorderConfig, Radius, Smoothing } from './index';

export interface SquircleOwnProps<E extends ElementType = 'div'> {
  as?: E;
  radius?: Radius;
  smoothing?: Smoothing;
  border?: BorderConfig | number | null;
  precision?: number;
}

export type SquircleProps<E extends ElementType = 'div'> = SquircleOwnProps<E> &
  Omit<ComponentPropsWithRef<E>, keyof SquircleOwnProps>;

export declare function Squircle<E extends ElementType = 'div'>(props: SquircleProps<E>): ReactElement | null;
export default Squircle;

export declare function useSquircle<T extends Element = HTMLElement>(config?: {
  radius?: Radius;
  smoothing?: Smoothing;
  border?: BorderConfig | number | null;
  precision?: number;
}): RefCallback<T>;
