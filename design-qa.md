# macOS Window template QA

final result: passed

## Target and evidence

- Source visual truth: `/var/folders/wm/7wjg11ld0dgcs_xhgfhvtrnr0000gn/T/codex-clipboard-b360f015-5b02-4b81-a0f0-94c3a5f73d1a.png` (2224 × 1256 pixels).
- Implementation: `http://127.0.0.1:5173/#components/window`.
- Desktop screenshot: `/tmp/mac-window-border-light-desktop.png` (1440 × 1000 pixels, 1440 × 1000 CSS viewport, density 1).
- Dark screenshot: `/tmp/mac-window-border-dark-desktop.png` (same desktop viewport).
- Combined visual comparison, opened and inspected: `/tmp/mac-window-border-comparison.jpg`.
- Source window crop: (191, 192)–(2034, 1066), downsampled proportionally to 975px wide. Implementation window crop: (355, 415)–(1331, 963), approximately 975 × 548 CSS pixels. The reference is shorter; neither image was stretched to match the other’s aspect ratio.
- State: light appearance, sidebar expanded, home directory, icon view, menus closed. Dark, collapsed sidebar, list, populated search, empty search, and minimized states were also inspected.
- Scope: reusable window template based on the supplied reference. Subsequent user refinements are reflected in the final state: 16px smooth corners, 38px Glass Buttons, a shared Glass Button Group for navigation, a compact sidebar, and fading edges in place of progressive blur.
- Latest light screenshot: `/tmp/mac-window-fading-edge-final.png` (592 × 707 CSS viewport, content scrolled 85px). Latest dark screenshot: `/tmp/mac-window-fading-edge-dark.png`. Both were opened and inspected; the desktop screenshots above document the earlier outline and responsive checks.

## Findings and comparison history

1. [P2, fixed] Toolbar controls were initially regular buttons inside a separate glass container. Replaced all toolbar controls, including history, sidebar toggle, view selection, menu trigger, and search, with the existing `LiquidGlassButton`. Added its `render` composition hook and verified the Base UI menu opens from the actual internal button.
2. [P2, fixed] Window radius was initially 20px. The window already used the smooth-corner adapter; changed the authored radius to 16px and inspected the rendered `data-mac-corners="clippath"` and path containing `A 16 16`.
3. [P2, fixed] The initial progressive-blur layer included white tint, visibly whitening the sidebar titlebar. It was first adjusted to gray, then removed entirely at the user's request. The final implementation uses a 24px alpha mask on scrolling content and keeps the sidebar's uniform background blur.
4. [P2, fixed] The window originally put the outline inside the content clip. Split out Floating Panel's shared edge-light and 0.5px outline layers above the clipped panes, plus a separate SVG shadow sibling. Inspected identical 16px paths on all three layers; the parent stays unclipped and has no filter that would prevent backdrop sampling.
5. [P2, fixed] Responsive rules wrapped the toolbar onto two or three rows. Removed wrapping, truncated the title, and made overflowing controls scroll horizontally. The final toolbar is 60px tall with 38px controls. The one-row layout and keyboard access to overflowing controls were checked at 500px, 592px and 1440px viewport widths before the final size refinement; all seven final controls were verified at 38px in the default viewport.
6. [P2, fixed] Navigation now uses one shared Glass Button Group capsule. Hovering an enabled segment shows an inset circular/pill fill and hides the separator, matching the supplied follow-up screenshot. Enabled hover, keyboard navigation, disabled groups, text segments, and the CSS fallback were checked.
7. [P2, fixed] Glass Button material parameters now use light non-prominent edgeGlowStrength 0.04, edgeGlowSpread 4, and edgeHighlight 0.65. Rim brightness is 0.5 in light mode and 0.18 in dark mode, including prominent buttons and groups.

The combined source/implementation comparison was refreshed after the outline and toolbar fixes. No remaining actionable P0/P1/P2 findings were found within the requested template scope.

## Fidelity surfaces

- Typography: system UI font stack, compact sidebar labels, muted section captions, and a stronger toolbar title retain the reference’s hierarchy. Long titles truncate and folder names wrap. The demo uses 12–15px labels appropriate to its CSS size; the reference is a scaled system screenshot.
- Spacing and layout: full-height sidebar occupies approximately one fifth of the desktop window. The workspace owns the toolbar and scrolling content; traffic lights stay over the sidebar. The toolbar always stays on one row, using horizontal scrolling when necessary. Temporary viewport overrides were reset after responsive checks.
- Tokens: neutral sidebar selection, system blue icons, light content surface, transparent fading edges, soft window shadow, and 16px continuous corners. Dark mode uses the existing theme and the updated Glass Button materials.
- Assets: real AppKit folder artwork exported to `public/macos-icons/folder.png`; navigation and toolbar use exported SF Symbols. No generated illustration or placeholder artwork is needed for this template. AirDrop uses the closest available radio-wave SF Symbol.
- Content: the sidebar follows the reference’s Favorites and Locations structure and the home title. Additional folders, a bottom count, empty states, and two functional view modes are demo content. Extra Finder toolbar actions and special folder emblems are outside the requested shell scope.
- Full-view evidence is large enough to inspect toolbar, typography, sidebar, and folder grid together, so a separate focused crop was not needed. The continuous-corner radius was additionally verified from the rendered path.

## Interaction checks

- Sidebar navigation changes title and directory content; Back returns to the prior directory.
- Grid/list switch changes the rendered file layout.
- Search filters to one matching folder, shows a zero-result state, and clears with Escape.
- More menu opens through the composed Glass Button; New Folder adds and selects a session-only folder and updates the count.
- Sidebar toggle removes the sidebar and reflows the workspace while preserving window controls.
- Minimize shows a restoration action; reopening restores the window.
- `fadingEdge` defaults to true. Computed masks fade the content from 48–72px and the sidebar from 36–60px; disabling the switch produces a hard clipping boundary. No progressive-blur overlay nodes remain. Scrolled content was visually inspected in light and dark mode; the compact sidebar did not overflow in the final viewport, so its mask was checked through computed CSS.
- Browser console checked after reload: no errors.
- `npm run build` passed; `npm run build:theme` passed. Existing chunk-size and library `use client` bundling warnings remain.

## Follow-up polish / test limits

- The supplied screenshot is a wider Finder window. This template intentionally adapts its folder grid and toolbar to the current container and includes a status bar.
- Safari/Firefox-specific rendering and HDR display output were not verified in this browser session. Existing Liquid Glass fallback behavior is reused.

## Implementation checklist

- [x] Export reusable `MacWindow` and prop types.
- [x] Supply sidebar, navigation, toolbar, content, sidebar-footer, and status-bar slots.
- [x] Reuse Liquid Glass buttons and existing smooth-corner adapter.
- [x] Add component documentation, working Finder example, and usage documentation.
- [x] Inspect revised light/dark and narrow-container rendering and reset the viewport override.
