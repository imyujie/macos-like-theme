# Vendored Squircle Kit

This is the supplied `squircle-kit` distribution, whose package name is
`smooth-corners` and version is `0.1.0`.

Local changes:

- Added the optional `border.followSurface` setting in the DOM layer and its
  types. It reuses the surface path with a double-width stroke; the element's
  existing clip removes the outside half. The theme enables it for every
  Squircle Kit outline so its outer boundary matches the surface exactly.
- Rebuilt `dist/` from the patched source. The corner geometry is unchanged.
- The package manifest omits upstream development dependencies and build/test
  scripts to keep installation local and avoid resolving upstream dev tools.

The original README is retained for API reference. Its comparisons to other
corner libraries do not represent runtime dependencies.
