type Rgb = readonly [number, number, number];

/** Colors are separate from light/shadow alpha, so fill never changes geometry. */
export function glassLightingPalette(fill: string, mode: "dark" | "light" = "light") {
  const hex = Number.parseInt(fill.slice(1), 16);
  const rgb: Rgb = [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];
  const peak = Math.max(...rgb);
  const saturation = peak > 0 ? (peak - Math.min(...rgb)) / peak : 0;
  // Normalize brightness before adding white: even a dark blue material has
  // visible blue light. Neutral fills retain the existing white/black lighting.
  const hue: Rgb = peak > 0 ? [rgb[0] / peak, rgb[1] / peak, rgb[2] / peak] : [1, 1, 1];
  const lighten = (white: number): Rgb => [
    white + (1 - white) * hue[0],
    white + (1 - white) * hue[1],
    white + (1 - white) * hue[2],
  ];
  return {
    highlight: lighten(0.1),
    glow: lighten(0.03),
    // Edge shading composites over the opaque lens body. Chromatic fills use
    // a darker version of their own color; neutral glass keeps a dark neutral
    // edge instead of fading toward the page background.
    shadow: [
      rgb[0] * 0.65 * Math.min(1, saturation / 0.2),
      rgb[1] * 0.65 * Math.min(1, saturation / 0.2),
      rgb[2] * 0.65 * Math.min(1, saturation / 0.2),
    ] as Rgb,
    // The opaque support behind the outer edge band must stay dark in dark
    // mode; using the material fill there produces a light-gray halo.
    shadowSupport: (mode === "dark"
      ? [rgb[0] * 0.3, rgb[1] * 0.3, rgb[2] * 0.3]
      : rgb) as Rgb,
  };
}

export function glassLightingCss(rgb: Rgb): string {
  return `rgb(${rgb.map(channel => Number((channel * 255).toFixed(3))).join(' ')})`;
}

/** Recolor an independent alpha mask without reading any displacement channel. */
export function glassLightingMaskMatrix(rgb: Rgb, alphaOffset = 0): string {
  return [
    0, 0, 0, 0, rgb[0],
    0, 0, 0, 0, rgb[1],
    0, 0, 0, 0, rgb[2],
    0, 0, 0, 1, alphaOffset,
  ].join(' ');
}
