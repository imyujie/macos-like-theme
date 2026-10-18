import type { CSSProperties } from 'react';

type SymbolStyle = CSSProperties & {
  '--sf-symbol-url': string;
  '--sf-symbol-size': string;
};

export interface SfSymbolProps {
  name: string;
  size?: number;
  weight?: 'medium' | 'bold';
  label?: string;
  className?: string;
  basePath?: string;
}

/** A monochrome SF Symbol mask. Export the requested names with `npm run symbols`. */
export function SfSymbol({
  name,
  size = 16,
  weight = 'medium',
  label,
  className = '',
  // Resolved against the bundler's base so a build served from a subpath
  // (GitHub Pages, a nested deploy) finds the sprite folder.
  basePath = `${import.meta.env.BASE_URL}sf-symbols`,
}: SfSymbolProps) {
  const filename = weight === 'bold' ? `${name}.bold` : name;
  const style: SymbolStyle = {
    '--sf-symbol-url': `url("${basePath.replace(/\/$/, '')}/${encodeURIComponent(filename)}.png")`,
    '--sf-symbol-size': `${size}px`,
  };

  return (
    <span
      className={`sf-symbol ${className}`.trim()}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
